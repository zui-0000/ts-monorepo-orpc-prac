---
status: accepted
date: 2026-08-29
scope: backend
decision-makers: zui
consulted: Claude
informed:
---

# パスワードハッシュは argon2id を使う

## 背景と課題 (Context and Problem Statement)

認証要件のひとつが「メールアドレス + パスワード」であり、パスワードの保管方法を
決める必要がある。better-auth は既定のハッシュ実装を持っているため、
**そのまま使うか差し替えるか**が判断の対象になる。

既定の実装を読んだところ、**そのまま使えない事情が 2 つ**見つかった。

### ① パラメータが OWASP の最低ラインを下回る

`@better-auth/utils` の scrypt 設定は次のとおり。

```js
const config = { N: 16384, r: 16, p: 1, dkLen: 64 };
```

OWASP Password Storage Cheat Sheet は、argon2id が使えない場合の scrypt について
**「CPU/メモリコスト `N` は最低 2^17、ブロックサイズ `r` は最低 8、並列度 `p` は 1」**
を求めている。

|                    | `N`           | `r` | 作業量 (`N × r`) | メモリ (`128 × N × r`) |
| ------------------ | ------------- | --- | ---------------- | ---------------------- |
| OWASP の最低ライン | 131072 (2^17) | 8   | 1,048,576        | **128 MiB**            |
| better-auth 既定   | 16384 (2^14)  | 16  | 262,144          | **32 MiB**             |

`r` が倍でも `N` が 8 分の 1 のため、**総量で 4 倍下回る。**

### ② 出力にパラメータが含まれない

```js
return `${salt}:${key.toString("hex")}`;   // → "aa659342...:339e2895..."
```

`salt:key` の hex 連結であり、**どのパラメータで計算したかがハッシュに残らない。**
将来コストを上げたくなっても、**既存の行が古い設定か新しい設定かを判別できない**ため、
「次回ログイン時に再ハッシュする」形の段階移行ができない。全件を一斉に無効化して
パスワード再設定を強いるしか手がなくなる。

## 決定要因 (Decision Drivers)

- **OWASP の推奨を満たすこと**
- **将来コストを上げられること。** ハードウェアは速くなり続ける
- 依存を増やさないこと
- サインイン 1 回あたりの待ち時間が実用的であること
- better-auth の差し替え口に収まること

## 検討した選択肢 (Considered Options)

- argon2id (`Bun.password`)
- argon2id (外部ライブラリ)
- better-auth 既定の scrypt をそのまま使う
- scrypt のパラメータだけ OWASP 準拠まで引き上げる
- bcrypt

## 決定 (Decision Outcome)

**「argon2id を `Bun.password` で使う」を採用する。**

```ts
emailAndPassword: {
  password: {
    hash: (password) => Bun.password.hash(password),
    verify: ({ hash, password }) => Bun.password.verify(password, hash),
  },
},
```

`Bun.password.hash()` の既定アルゴリズムが argon2id であり、**外部ライブラリを
足さずに OWASP の推奨を満たせる。**

### 実測した差

|                    | better-auth 既定 (scrypt) | **Bun.password (argon2id)** |
| ------------------ | ------------------------- | --------------------------- |
| パラメータ         | `N=16384, r=16, p=1`      | `m=65536, t=2, p=1`         |
| メモリ             | 32 MiB                    | **64 MiB**                  |
| OWASP の最低ライン | 128 MiB → **下回る**      | 19 MiB → **上回る**         |
| 出力形式           | `salt:key` (hex)          | **PHC 文字列**              |
| パラメータの記録   | **無し**                  | **ハッシュに埋まる**        |
| 長さ               | 161 文字                  | 118 文字                    |
| hash               | 62 ms                     | 86 ms                       |
| verify             | 55 ms                     | 81 ms                       |

```txt
$argon2id$v=19$m=65536,t=2,p=1$5/yTLq++TeKbbASs+aa...$LmuX+aes/4kKeJ9GxyLCPam...
         ^^^^^^ ^^^^^^^^^^^^^^^^^^^^ パラメータがここに残る
```

### 差し替えは haveIBeenPwned と共存する

`create-context.mjs` が次のように組むため、指定した関数がそのまま `ctx.password.hash`
になる。

```js
hash: options.emailAndPassword?.password?.hash || hashPassword,
```

`haveIBeenPwned()` プラグインは `init(ctx)` で `ctx.password.hash` を退避してから
包む作りなので、**「漏洩チェック → argon2id でハッシュ」の順で合成される。**
どちらかを諦める必要は無い。

### 結果 (Consequences)

- Good, because **OWASP の推奨を満たす。** 既定のままでは満たさない
- Good, because **将来コストを上げられる。** PHC 文字列にパラメータが残るため、
  検証時に古い設定を見分けて再ハッシュする段階移行ができる
- Good, because **依存が増えない。** Bun 組み込みであり、`package.json` は変わらない
- Good, because メモリハード性が argon2id のほうが高く、GPU / ASIC による総当たりに強い
- Good, because 保存する文字列が短い (161 → 118 文字)
- Bad, because **1 回あたり 24 ms ほど遅くなる** (62 → 86 ms)。サインインとサインアップの
  経路にのみ効く
- Bad, because **Bun ランタイムに依存する。** Node へ移す場合は `@node-rs/argon2` 等への
  差し替えが要る。PHC 形式は共通なので**ハッシュ自体は移行できる**
- Neutral, because 移行対象のデータは無い。`t_account.password_hash` はまだ 1 行も無い

### 確認方法 (Confirmation)

`@better-auth/utils` の既定実装と `Bun.password` を同一条件で計測した。

```zsh
$ bun cmp.ts
=== better-auth 既定 (scrypt N=16384 r=16 p=1) ===
出力  : aa659342d9350b3e255117a62decb045:339e289556ae3ab96...
長さ  : 161 文字
速度  : hash 62ms / verify 55ms
メモリ: 32 MiB

=== Bun.password 既定 (argon2id m=65536 t=2 p=1) ===
出力  : $argon2id$v=19$m=65536,t=2,p=1$5/yTLq++TeKbbASs+aa...
長さ  : 118 文字
速度  : hash 86ms / verify 81ms
メモリ: 64 MiB
```

**配線後は `t_account.password_hash` の中身が `$argon2id$` で始まることを確認すること。**
`salt:key` の形が入っていたら差し替えが効いていない。

## 各選択肢の評価 (Pros and Cons of the Options)

### argon2id (`Bun.password`) — 採用

- Good, because 既定パラメータが OWASP の推奨を上回る
- Good, because 依存ゼロ。Bun 組み込み
- Good, because PHC 形式でパラメータが残り、段階移行できる
- Bad, because Bun への依存が 1 つ増える
- Neutral, because パラメータを細かく調整したい場合は `Bun.password.hash(pw, {...})` で
  指定できる。現時点では既定で足りる

### argon2id (外部ライブラリ)

`@node-rs/argon2` など。

- Good, because ランタイムを問わない。Node へ移しても動く
- Good, because パラメータの調整幅は同じ
- Bad, because **ネイティブモジュールの依存が増える。** インストールがプラットフォーム
  依存になり、CI とデプロイの手間が増える
- Bad, because Bun 組み込みで足りている状況で足す理由が無い

### better-auth 既定の scrypt をそのまま使う

- Good, because 設定が要らない。何も書かなくてよい
- Good, because ランタイムを問わない (Node / Bun / Deno は `node:crypto`、
  それ以外は `@noble/hashes` にフォールバックする)
- Bad, because **OWASP の scrypt 最低ラインを 4 倍下回る**
- Bad, because **出力にパラメータが残らない。** 将来の段階移行ができない
- Neutral, because 弱いパラメータを選んだのは、純 JS フォールバックでも現実的な速度に
  収めるためと推測される。ランタイムを絞れる側は付き合う必要が無い

### scrypt のパラメータだけ OWASP 準拠まで引き上げる

`emailAndPassword.password.hash` を自前の scrypt (`N=2^17, r=8`) にする案。

- Good, because OWASP の推奨を満たせる
- Good, because ランタイムを問わない (`node:crypto` の scrypt)
- Bad, because **出力形式を自分で設計することになる。** パラメータを埋めるなら
  PHC 相当を自作する必要があり、argon2id を使えば無料で付いてくるものを
  手で書き直すことになる
- Bad, because OWASP は argon2id が使えるなら argon2id を推している。
  使える環境で 2 番手を選ぶ理由が無い

### bcrypt

- Good, because 実績が長く、実装が広く存在する
- Good, because `Bun.password.hash(pw, { algorithm: "bcrypt" })` で使える
- Bad, because **メモリハードでない。** GPU / ASIC による総当たりに argon2id ほど強くない
- Bad, because **パスワードが 72 バイトで切られる。** 長いパスフレーズの後半が無視される
- Neutral, because OWASP は「レガシー環境なら work factor 10 以上で使ってよい」と
  している。新規で選ぶものではない

## 補足情報 (More Information)

### OWASP の推奨値

Password Storage Cheat Sheet の要点。

| アルゴリズム | 推奨                                                           |
| ------------ | -------------------------------------------------------------- |
| **argon2id** | `m=19456 (19 MiB), t=2, p=1` 以上。または `m=46 MiB, t=1, p=1` |
| scrypt       | argon2id が使えない場合。`N≥2^17, r≥8, p=1`                    |
| bcrypt       | レガシー環境のみ。work factor 10 以上、72 バイト制限に注意     |

`Bun.password` の既定 `m=65536 (64 MiB), t=2, p=1` は、argon2id の推奨を
メモリで 3 倍以上上回る。**引き上げる必要は当面無い。**

### パスワード長との関係

`emailAndPassword.minPasswordLength` は **15** にする。better-auth の既定は 8 だが、
これは MFA を前提とした値である。NIST SP 800-63B-4 は MFA 無しの場合に
15 文字以上を求めている。**ハッシュを強くしても短いパスワードは守れない**ため、
両方を揃える。

### 漏洩済みパスワードの検査は自前で持つ

better-auth には `haveIBeenPwned()` プラグインがあるが、**使っていない。**
`transaction: true` と両立しないためである。

```txt
transaction=true  + プラグイン → HTTP 経由で 500 (No auth context found)
transaction=true  + 自前       → 200
transaction=false + プラグイン → 200
```

プラグインの `hash` は `getCurrentAuthEndpointContext()` を呼び、**パスを見て検査の
要否を決める**。トランザクションの `als.run` がストアを差し替えるため endpoint context を
辿れず落ちる (Bun 上で HTTP 経由のときのみ再現。直接 API を呼ぶ経路では起きない)。

**自前の実装は無条件に検査するので endpoint context が要らない。** 無条件でよいのは、
`password.hash` が動くのがサインアップ / パスワードリセット / パスワード変更 /
管理者によるパスワード設定 に限られ、**どれも「新しいパスワードを決める場面」**で
検査したくない経路が存在しないためである。

送るのは SHA-1 の先頭 5 文字だけで、パスワード自体はネットワークに出ない
(k-anonymity)。**HIBP に到達できないときは通さない (fail closed)。** 検査を素通り
させると、障害中に登録された漏洩済みパスワードが気付かれずに残り続けるため、
可用性より弱いパスワードの恒久的な居座りを重く見た。

`transaction` を切れる状況になればプラグインへ戻してよい。その場合は
`assert-password-not-compromised.ts` を削り、`plugins: [haveIBeenPwned()]` に戻す。

### 将来コストを上げるときの手順

PHC 文字列にパラメータが残るため、次の形で段階移行できる。

1. `hash` の設定値を上げる (新規と再設定はこれ以降強くなる)
2. `verify` の中で古いパラメータを検出したら、検証成功後にその場で再ハッシュして書き戻す
3. 全件が新しい設定になったら検出処理を外す

**利用者にパスワード再設定を強いる必要が無い。** これが scrypt の既定実装では
できなかったことである。

### 参考資料

- [Password Storage Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [RFC 9106: Argon2 Memory-Hard Function](https://www.rfc-editor.org/rfc/rfc9106.html)
- `@better-auth/utils/dist/password.node.mjs` — 既定の scrypt 設定と出力形式
- `better-auth/dist/context/create-context.mjs` — `hash` / `verify` の差し替え口
