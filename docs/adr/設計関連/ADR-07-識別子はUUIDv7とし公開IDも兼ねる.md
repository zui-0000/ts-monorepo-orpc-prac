---
status: accepted
date: 2026-08-29
scope: all
decision-makers: zui
consulted: Claude
informed:
---

# 識別子は UUIDv7 とし、公開 ID も兼ねる

## 背景と課題 (Context and Problem Statement)

このアプリの認証要件は **「メールアドレス + パスワード」と「Google アカウント」の
2 つだけ**である。better-auth を採用したため、
識別子の採番方式は **better-auth の設定で決まる**ことになった。

better-auth が採番するのは `t_user` / `t_session` / `t_account` / `t_verification`
の 4 つの主キーだが、**外部に出るのは `t_user.id` だけ**である。

| テーブル         | 外部に出るか | 経路                                 |
| ---------------- | ------------ | ------------------------------------ |
| `t_user`         | **出る**     | `GET /users/:id` の URL と応答       |
| `t_session`      | 出ない       | Cookie に乗るのは `token` の列       |
| `t_account`      | 出ない       | —                                    |
| `t_verification` | 出ない       | メールのリンクに乗るのは別のトークン |

出発点は **「連番 (bigserial) を公開したくない」**だった。`/users/1`,
`/users/2` と辿れてしまい、さらに「12345 が存在する = 最低 12345 人いる」が
確定してしまうためである。

一方、既存コードは `Bun.randomUUIDv7()` で v7 を採番していた。ここで
**「v7 は先頭 48 ビットに作成時刻 (ミリ秒) を埋め込む」**という性質が問題になる。
連番を避けるために選んだ形式が、別の情報を漏らしていないかを確かめる必要が生じた。

## 決定要因 (Decision Drivers)

- **列挙されないこと**。ID を 1 つ知っても隣が当てられない
- **総件数が漏れないこと**。事業規模が ID から逆算できない
- **主キーとして速いこと**。B-Tree の索引局所性を壊さない
- **better-auth が選べる範囲に収まること**
- 漏れる情報がある場合、**その損害が要件に照らして定義できること**

## 検討した選択肢 (Considered Options)

- UUIDv7 一本 (主キーと公開 ID を兼ねる)
- UUIDv7 + TypeID (境界で base32 に符号化し型接頭辞を付ける)
- UUIDv4 一本
- better-auth の既定 (32 文字のランダム文字列)
- bigserial (連番)
- 内部連番 + 外部不透明 ID の 2 本立て (Stripe 方式)

## 決定 (Decision Outcome)

**「UUIDv7 一本」を採用する。** 主キーと公開 ID を同じ列で兼ねる。

```ts
advanced: {
  database: {
    // better-auth の既定は 32 文字のランダム文字列。uuid 列に入らないうえ
    // 索引局所性が悪いため、UUIDv7 に差し替える。
    generateId: () => Bun.randomUUIDv7(),
  },
},
```

**「作成時刻と登録順が漏れることを引き受ける代わりに、列挙耐性と索引性能の
両方をコスト無しで得る」**という取引として選んだ。

### 前提: 自然キーではなく生成キーを選んでいる

> **自然キー (natural key)** — 業務データそのもの (通貨コード、ISBN、メールアドレス等)
> を識別子に使うもの。値に業務上の意味がある。
> **生成キー / 代理キー (surrogate key)** — 識別のためだけに採番する、業務上の意味を
> 持たない値。連番や UUID がこれにあたる。

キー設計は **「安定して検証可能な自然キーがあるか」** から始める。無ければ生成キーへ
進み、**自然な一意性は必ず別の一意性制約として宣言する**。生成キーが担うのは
行の区別だけで、**二重登録の防止は担わない**ためである。

4 テーブルすべてで自然キーを検討したが、**主キーに足るものは無かった。**

| テーブル         | 自然キーの候補         | 主キーにしない理由                                                      | 自然な一意性の宣言先                           |
| ---------------- | ---------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| `t_user`         | `email`                | **安定しない。** 変更機能があり、値の所有者も better-auth である        | `t_user_email_key` UNIQUE 制約                 |
| `t_session`      | `token`                | **秘密そのもの。** 主キーにすると外部キーとして他テーブルへ複製される   | `t_session_token_key` UNIQUE 制約              |
| `t_account`      | `(issuer, account_id)` | **こちらで検証できない。** Google 側が決める値であり、複合 2 列でもある | `t_account_issuer_account_id_key` UNIQUE 制約  |
| `t_verification` | なし                   | 同じ `identifier` の行が時系列で複数できる (再送・再発行)               | 一意制約なし (`t_verification_identifier_idx`) |

**「一意であること」と「安定して検証可能であること」は別**である。`email` は一意だが
安定せず、`(issuer, account_id)` は安定しているがこちらで検証できない。
どちらも自然キーの条件を満たさない。

この結論は **`check-email-duplication` (ドメインサービスによる重複検査) を廃止する
判断とセット**である。アプリ側の検査は SELECT と INSERT の間に競合が入るため
**一意性を守れない**。一意性は制約として宣言し、違反を捕まえてドメインのエラーへ
翻訳する形にする (`user-repository.ts` の `handleEmailDuplicationError`)。

`t_verification` にだけ一意制約が無いのは**意図的**である。better-auth は検証メールの
再送などで同じ `identifier` の行を複数作るため、一意にすると再送が失敗する。

### 前提: 識別子は秘密ではない

判断の土台として、まず **ID を推測困難性の防壁にしない**ことを確認した。
RFC 9562 §8 (Security Considerations) が明言している。

> Implementations SHOULD NOT assume that UUIDs are hard to guess.
> For example, they MUST NOT be used as security capabilities

better-auth もこれを守っており、**秘密は行の `id` とは完全に別経路で生成される。**

| 秘密                       | 生成元                    | 保存先                               |
| -------------------------- | ------------------------- | ------------------------------------ |
| セッショントークン         | `generateId(32)` (CSPRNG) | `t_session.token`                    |
| パスワードリセットトークン | `generateId(24)` (CSPRNG) | `t_verification.identifier` の接尾辞 |
| パスワード                 | scrypt ハッシュ           | `t_account.password`                 |

```ts
// @better-auth/core/utils/id.ts
export const generateId = (size?: number) =>
  createRandomStringGenerator("a-z", "A-Z", "0-9")(size || 32);
```

**したがって `generateId` に何を指定しても認証の強度は 1 ビットも変わらない。**
判断すべきは「**漏れる情報**」と「**主キーとしての性能**」の 2 点だけに絞られる。

なお認可はこのリポジトリでは `checkUserIsSelf` が担っており、ID の推測困難性には
依存していない。ここが崩れると ID の形式に関わらず IDOR になる。

### 何が漏れて、何が漏れないか

| 方式               | 列挙     | 順序   | 作成時刻 | **総件数** |
| ------------------ | -------- | ------ | -------- | ---------- |
| `bigserial` (連番) | **可能** | 漏れる | —        | **漏れる** |
| Snowflake          | **可能** | 漏れる | 漏れる   | 推定可     |
| **UUIDv7 / ULID**  | 不可     | 漏れる | 漏れる   | 漏れない   |
| UUIDv4             | 不可     | —      | —        | 漏れない   |
| nanoid / 2 本立て  | 不可     | —      | —        | 漏れない   |

**連番の最大の問題は列挙ではなく「総件数が漏れること」**である。ID を 1 つ
観測するだけで事業規模の下限が確定する (ドイツ戦車問題)。UUIDv7 はこれを漏らさない。

漏らすのは **作成時刻 (ミリ秒) と登録順**の 2 つ。今回の要件は
「メール + パスワード」と「Google」の 2 つだけであり、**この 2 つが漏れて発生する
損害を定義できなかった**。これが採用の決め手である。

### 結果 (Consequences)

- Good, because **列挙が不可能。** ランダム部は実測 62 ビット (`2^62 ≈ 4.6 × 10^18`)。
  生成ミリ秒を正確に知っていても隣の ID は当てられない
- Good, because **総件数が漏れない。** 連番を避けた目的をそのまま満たす
- Good, because **主キーとして bigint と同等の速度。** 先頭が時刻なので
  B-Tree の末尾ページにだけ追記され、ページ分割が散らない
- Good, because **better-auth の既定より速く、小さい。** 既定は 32 byte の
  ランダム `text` で、v4 と同じく索引局所性が悪い。v7 は 16 byte の `uuid`
- Good, because 既存の `UuidSchema` (v7 限定・小文字のみ) がそのまま使える。
  `UserIdSchema` も `checkUserIsSelf` の `===` 比較も変更不要
- Bad, because **アカウントの作成日時がミリ秒精度で漏れる**
- Bad, because **登録の順序が漏れる。** 招待制やベータ運用を始めると
  early adopter の特定が意味を持ちうる
- Bad, because ID を複数集めると**登録ペースが推定できる**。B2B では競合情報になる
- Neutral, because 16 byte で `bigint` の倍。外部キーを持つテーブルが増えると
  効いてくるが、`t_session` / `t_account` / `t_verification` の 3 本では無視できる
- Neutral, because v7 のランダム部 62 ビットは v4 の 122 ビットより少ない。
  ただし列挙耐性としてはどちらも桁違いに足りており、差は現れない

### 確認方法 (Confirmation)

**Bun の `randomUUIDv7()` が `rand_a` をどう使うか**を実測した。RFC 9562 は
`rand_a` (12 ビット) を「疑似乱数またはカウンタ」と定めており、実装により異なる。

```zsh
$ bun v7.ts
同一プロセスで連続生成:
  01a048e9-3b08-7485-80ef-eee6318b09fe  ts=2026-08-28T15:07:19.688Z  rand_a=0x485
  01a048e9-3b0a-7303-b866-23a98597f875  ts=2026-08-28T15:07:19.690Z  rand_a=0x303
  01a048e9-3b0a-7304-b072-c9064fe8342e  ts=2026-08-28T15:07:19.690Z  rand_a=0x304
  01a048e9-3b0a-7305-938a-4aac27f080f8  ts=2026-08-28T15:07:19.690Z  rand_a=0x305
  01a048e9-3b0a-7306-811f-487dbd2c6ef5  ts=2026-08-28T15:07:19.690Z  rand_a=0x306
  01a048e9-3b0a-7307-92b0-1662409081fd  ts=2026-08-28T15:07:19.690Z  rand_a=0x307
```

**同一ミリ秒内では `rand_a` がカウンタとして連番になる** (単調性の担保)。
したがって実効エントロピーは RFC 上限の 74 ビットではなく、`rand_b` の **62 ビット**。
それでも列挙は不可能である。

**この実測を残す理由**は、「UUIDv7 のランダム部は 74 ビット」という一般論を
そのまま信じると 12 ビット過大評価になるためである。ランタイムを替えたら
測り直すこと。

## 各選択肢の評価 (Pros and Cons of the Options)

### UUIDv7 一本 (採用)

- Good, because 列挙不可・総件数が漏れない・索引局所性が良い、を同時に満たす
- Good, because **追加の列も変換レイヤーも要らない。** better-auth の API
  (`signUpEmail` / `getSession`) は内部 ID で動くため、公開 ID を分けると
  境界に変換が必要になるが、兼ねるなら不要
- Good, because RFC 9562 で標準化済み。ULID より新規採用の根拠が強い
- Bad, because 作成時刻と登録順が漏れる
- Neutral, because Postgres 18 はネイティブの `uuidv7()` を持つが、
  採番はアプリ側 (`UuidGenerator` / better-auth) に統一しているため使わない

### UUIDv7 + TypeID (境界で符号化)

TypeID は「型接頭辞 + UUIDv7 を base32 で 26 文字に符号化」する仕様。
**保存する値は UUIDv7 のままで、符号化は境界でのみ行う。**

```txt
DB に保存する値: 01a048e9-3b0a-7303-b866-23a98597f875   (uuid 列 / 16 byte)
API が返す値:    user_01h455vb4pex5vsknk084sn02q        (接頭辞 + 26 文字)
```

- Good, because **DB のスキーマを一切変えない。** 列も一意索引も増えず、
  v7 の索引局所性がそのまま残る
- Good, because 接頭辞で型が読める。Stripe 方式の運用上の利点
  (ログやサポート現場での取り違え防止) を、列を増やさずに得られる
- Good, because base32 の設計が実用的。大小を区別せず、曖昧な文字
  (`0`/`O`、`1`/`l`) を避け、ダブルクリックで全選択でき、hex より短い
  (26 文字 vs 36 文字)
- Bad, because **秘匿は何も解決しない。** 中身は UUIDv7 のままなので、
  base32 を復号すれば作成時刻が出てくる
- Bad, because 契約 (`UuidSchema`) と URL の形が変わる。OpenAPI 仕様と
  フロントエンドにも波及する
- Neutral, because **後から入れられる。** 保存形式が変わらないため、
  移行は境界の符号化・復号を足すだけで済む

**却下の理由は「今解くべき問題が無いから」**である。ID を人間が読む場面
(サポート対応、ログ調査) がまだ発生していない。

### UUIDv4 一本

- Good, because **何も漏らさない。** 時刻も順序も件数も出ない
- Good, because ランダム部 122 ビットで列挙耐性が最も高い
- Bad, because **B-Tree を壊す。** 挿入位置が毎回散るためページ分割が多発し、
  索引が膨張して WAL も増える。他者ベンチでは 100 万行の INSERT が
  v7 の 290 秒に対して **375 秒 (約 29% 遅い)**、索引のリーフページは約 40% 膨張
- Bad, because 既存の `UuidSchema` が v7 限定のため書き換えが要る
- Neutral, because better-auth は `generateId: "uuid"` で選べるため導入自体は容易

### better-auth の既定 (32 文字のランダム文字列)

`createRandomStringGenerator("a-z", "A-Z", "0-9")(32)` が生成する不透明 ID。

- Good, because 設定不要。**何も漏らさない**のは v4 と同じ
- Bad, because **v4 の性能問題をそのまま背負う。** ランダム値を主キーにするため
  索引局所性が悪い
- Bad, because **`text` 32 byte で `uuid` 16 byte の倍。** 外部キーを持つ
  テーブルすべてで効く
- Bad, because 形式の検証規則が無い。`UuidSchema` のような不変条件を
  自分で定義し直すことになる

### bigserial (連番)

- Good, because 8 byte で最小。生成も最速
- Good, because 人間が読める。障害調査で口頭・チャットに乗せやすい
- Bad, because **総件数が漏れる。** 出発点で却下した理由そのもの
- Bad, because **列挙が可能。** 認可の実装漏れが 1 箇所でもあると全件走査される。
  認可で守るのが本筋とはいえ、防壁が 1 枚減る
- Bad, because 分散採番ができない。将来 DB を分けると破綻する
- Neutral, because better-auth は `generateId: "serial"` で対応している

### 内部連番 + 外部不透明 ID の 2 本立て (通称 Stripe 方式)

主キーは `bigint`、公開用に `public_id` (nanoid など) を別列で持つ。

**「Stripe 方式」は通称であり、Stripe の内部実装ではない**点に注意する。
Stripe が公開しているのは ID の見た目 (`{接頭辞}_{生成部}`) だけで、内部の主キーが
どうなっているかは公表されていない。そもそも生成部は純粋なランダムではなく
シャーディング情報を含む (後述)。**この節が評価しているのは「内部用と外部用を
別の列に分ける」という構造**であって、Stripe の実装ではない。

nanoid(21) は 64 文字のアルファベット (`A-Za-z0-9_-`) を 21 文字並べて
**126 ビット** (UUIDv4 の 122 ビットより多い)。`text` 列で 22 byte
(21 文字 + varlena の 1 byte ヘッダ) を占め、`uuid` の 16 byte より大きい。

- Good, because **すべての要求を満たす。** 内部は最速、外部は何も漏らさない
- Good, because 公開 ID に接頭辞を付けられる (`usr_...`)。ログやサポート現場で
  型が読め、誤用が減る
- Bad, because **列と一意索引が 1 本増える**
- Bad, because **公開 ID 側の索引局所性は悪い。** nanoid は完全ランダムなので、
  一意索引への挿入は v4 と同じくページ分割が散る。主キーではないため影響は
  その 1 索引に閉じるが、ゼロではない
- Bad, because **境界に変換レイヤーが常に必要。** better-auth の API は内部 ID で
  動くため、`GET /users/:public_id` の解決もセッションからの引き当ても自前クエリになる。
  **今回の要件に無い複雑さ**であり、これが却下の主因
- Neutral, because 後から移行できる。`public_id` を足して外向きだけ差し替えれば
  内部 ID は触らずに済む

## 補足情報 (More Information)

### 世の中のサービスの調査

同じ性質の ID を、規模の大きいサービスがどう扱っているかを調べた。

| サービス | 方式                                        | 構造                                   | 時刻     | 列挙       |
| -------- | ------------------------------------------- | -------------------------------------- | -------- | ---------- |
| Twitter  | Snowflake                                   | 41bit 時刻 + 10bit ノード + 12bit 連番 | 漏れる   | **可能**   |
| Discord  | Snowflake                                   | 同上                                   | 漏れる   | **可能**   |
| Shopify  | GID                                         | `gid://shopify/Product/123` (連番)     | —        | **可能**   |
| GitHub   | REST は連番 / GraphQL は base64 の不透明 ID | —                                      | —        | 経路による |
| Stripe   | 接頭辞 + 生成部 (シャード情報を含む)        | `cus_NffrFeUfNV2Hib`                   | 漏れない | 不可       |

**Snowflake にはランダム部が無い。** 41 ビットの時刻・ノード ID・12 ビットの連番で
64 ビットを使い切っており、**列挙可能で時刻も丸見え**である。それを Twitter と
Discord が公開 ID として使っている。しかも Discord は**アカウント作成日を
プロフィールの機能として表示している** — 隠すコストを払う理由が無いと判断したわけである。

これは RFC 9562 §8 の「ID を security capability にするな」の実践例と読める。
**守っているのは ID の推測困難性ではなく認可**である。

**対極が Stripe。** `{接頭辞}_{生成部}` の形を 2012 年から使っている
(それ以前は素の UUID だった)。時刻も順序も漏らさない。
接頭辞を持つ理由は運用上の実利が大きいと考えられる。ID はログ・メール・
サポートチャットに散らばるため、`cus_` を見た瞬間に型が分かるほうが事故が減る。
実際、Stripe の Discord では AutoMod が `sk_live_` を正規表現で検出して
鍵の誤投稿を止めている。

ただし **Stripe の公開 ID は「純粋なランダム文字列」ではない。** Stripe の
エンジニアによれば、生成部には **DB のシャーディングに使うデータが埋まっている**。
また ID の長さはリソース種別ごとに異なり、大量に作られるものほど長い
(衝突確率を種別ごとに調整している)。

**つまり Stripe も何かを漏らしている。** 漏らしているのが「作成時刻」ではなく
**「その行がどのシャードにあるか」**という違いにすぎない。
**「何も漏らさない公開 ID」は存在しない**と考えたほうが実態に近い。

**したがって「時刻が漏れる ID を公開してよいか」は技術ではなく事業の問題**である。
今回の要件 (メール + パスワード / Google) では、Discord 側に寄せて問題ないと判断した。

### 性能の実測値 (他者ベンチ)

Postgres における主キー型の比較。数値は引用であり、このリポジトリで測ったものではない。

| 型        | サイズ  | 100 万行 INSERT | 索引のリーフページ |
| --------- | ------- | --------------- | ------------------ |
| `bigint`  | 8 byte  | 290 秒          | 基準               |
| `uuid` v7 | 16 byte | **290 秒**      | ほぼ基準           |
| `uuid` v4 | 16 byte | 375 秒          | 約 40% 膨張        |

**「UUID は遅い」は v4 の話であって v7 には当てはまらない。** 遅さの原因は
128 ビットという幅ではなく、値がランダムであることによる B-Tree のページ分割である。

### better-auth が選べる範囲

`advanced.database.generateId` の型は次のとおり (`@better-auth/core`)。

```ts
generateId?: GenerateIdFn | false | "serial" | "uuid";
```

| 設定          | 入る値                    | 列の型   |
| ------------- | ------------------------- | -------- |
| 未指定 (既定) | `generateId(32)` の文字列 | `text`   |
| `"uuid"`      | v4 (`gen_random_uuid()`)  | `uuid`   |
| `"serial"`    | 連番                      | `bigint` |
| 関数          | 任意                      | 任意     |

UUIDv7 は選択肢に無いため**関数で渡す**。`generateId` は
`({ model }) => string` の形で全モデル共通に呼ばれるため、
`t_session` / `t_account` / `t_verification` の主キーも v7 になる。
**これらは外部に出ないため、時刻の漏洩は問題にならない。**

### 不透明 ID を主キーにしない理由 (nanoid の位置づけ)

nanoid は **「公開 ID の道具」であって「主キーの道具」ではない。**
主キーに使うと UUIDv4 の欠点をすべて引き継いだうえでサイズが増える。

| 方式                  | 型     | 保存サイズ  | 索引局所性 | 比較              |
| --------------------- | ------ | ----------- | ---------- | ----------------- |
| UUIDv7                | `uuid` | **16 byte** | **良い**   | 16 byte の memcmp |
| UUIDv4                | `uuid` | 16 byte     | 悪い       | 16 byte の memcmp |
| nanoid(21)            | `text` | 22 byte     | 悪い       | 文字列比較        |
| better-auth 既定 (32) | `text` | 33 byte     | 悪い       | 文字列比較        |

**「UUIDv4 を選ばない」と決めた時点で、nanoid も主キーからは落ちる。**
v4 のほうが小さく、比較も速いためである。

なお **better-auth の既定は実質 nanoid** である
(62 文字のアルファベット × 32 文字 ≈ 190 ビット)。「不透明な文字列 ID がほしい」
だけであれば `generateId` を指定しなければよく、ライブラリを足す必要はない。

### 反対意見: 「k-sortable = insecure」

採用した v7 には**正面からの反論が存在する**。cuid2 の設計方針である。

> The worst part of k-sortable ids is their impact on security.
> **k-sortable = insecure.**

cuid2 は Web Crypto + タイムスタンプ + カウンタ + ホストのフィンガープリント +
ハッシュを混ぜ、**あえてソート不可能にする**。「10 年前は k-sortable が重要だったが、
もう気にするな」という立場である。

**主張の前半 (時刻が漏れる) は正しい。** 本 ADR はそれを認めたうえで、
今回の要件では損害が定義できないと判断した。後半 (Web Crypto の乱数を
信用しすぎ) は過剰と考える。また cuid2 自身が「高性能なタイトループには
向かない。そこは ULID か NanoID を使え」と認めており、ハッシュを噛ませる
コストを払っている。

**要件が変わって時刻の秘匿が必要になった時点で、この反対意見が正しくなる。**

### この判断が変わりうる場面

以下のいずれかが起きたら見直す。**引き金によって移行先とコストが違う。**

| 引き金                                          | 移行先                | 移行コスト                            |
| ----------------------------------------------- | --------------------- | ------------------------------------- |
| 登録ペースが競合情報になった (B2B SaaS、金融)   | 内部 v7 + 外部 nanoid | 列 + 一意索引 + 境界の変換層          |
| 招待制・順番待ちを始めた (early adopter の特定) | 同上                  | 同上                                  |
| ID がサポート現場で人間に読まれるようになった   | **TypeID**            | **境界の符号化のみ** (保存形式は不変) |

**「読みやすさ」と「秘匿」は別の問題であり、道具も違う。** 前の 2 つは秘匿の話なので
公開 ID を別に持つしかないが、3 つ目は表示形式の話なので TypeID で足りる。
混ぜて 2 本立てを導入すると、要らないコストを払うことになる。

秘匿側へ移行する場合も、`t_user` に `public_id` を足して外向きだけ差し替えれば、
内部 ID は触らずに済む。

逆に、**認可の実装が ID の推測困難性に依存し始めたら、それは形式の問題ではなく
設計の誤り**である。ID を変えるのではなく認可を直すこと。

### 参考にした設計指針

本 ADR の判断の順序は、farstep 氏 (@farstep\_) による X Article
「データベースのキー設計と主キーの選び方」のまとめに沿っている。以下は引用である。

> キー設計は、次の順で判断すると迷いにくくなります。
>
> 1. **安定して検証可能な自然キーがあれば、それを主キーにすることを検討する**
>    標準コード (通貨コード、国コードなど) を持つ参照テーブルが典型例です。
> 2. **なければ生成キーを主キーにし、自然な一意性は必ず別の一意性制約で宣言する**
>    生成キーは行の区別のためであり、二重登録の防止は担いません。
> 3. **生成キーの種類は要件で選ぶ**
>    単一 DB で完結し識別子を外部に露出しないなら連番の整数、分散生成やグローバルな
>    一意性が必要なら UUID です。
> 4. **UUID を使うなら、索引効率のためにランダムな UUIDv4 ではなく時刻順の UUIDv7 を
>    検討する**
>    ただし作成時刻の露出が問題になる用途では、外部公開用の識別子を分けてください。
>
> いずれの場合も、キーは物理的な格納位置ではなく、行が表す対象を識別する論理的な値で
> あるという原則を出発点にすると、選択を誤りにくくなります。

各ステップが本 ADR のどこに対応するかは次のとおり。

| ステップ                                         | 本 ADR の該当箇所                              |
| ------------------------------------------------ | ---------------------------------------------- |
| ① 安定して検証可能な自然キーがあるか             | 「前提: 自然キーではなく生成キーを選んでいる」 |
| ② 自然な一意性を別の一意性制約で宣言する         | 同節の表の「自然な一意性の宣言先」列           |
| ③ 生成キーの種類を要件で選ぶ                     | 「各選択肢の評価」の bigserial / UUID 各節     |
| ④ v4 ではなく v7。時刻露出が問題なら識別子を分離 | 「結果」および「この判断が変わりうる場面」     |

**最後の原則は本 ADR に対する戒めでもある。** 本文の多くを索引局所性や WAL といった
**物理の話**に割いているが、それは①で「自然キーは無い」と決めた**後**の話である。

```txt
① 論理で決める → 安定して検証可能な自然キーはあるか。無ければ生成キー
② 物理で決める → 生成キーのうちどれか (ここで初めて索引局所性が出てくる)
```

順序を逆にして、**物理の都合から論理的に誤ったキーを選ばないこと。**

### 参考資料

- [RFC 9562: Universally Unique IDentifiers (UUIDs)](https://www.rfc-editor.org/rfc/rfc9562.html) — §5.7 が v7 のビット配置、§8 がセキュリティ考慮事項
- [UUIDs vs Serial for Primary Keys — pganalyze](https://pganalyze.com/blog/5mins-postgres-uuid-vs-serial-primary-keys)
- [PostgreSQL UUID Performance: Benchmarking Random (v4) and Time-based (v7) UUIDs](https://dev.to/umangsinha12/postgresql-uuid-performance-benchmarking-random-v4-and-time-based-v7-uuids-n9b)
- [Avoid UUID Version 4 Primary Keys (for Postgres) — Andy Atkinson](https://andyatkinson.com/avoid-uuid-version-4-primary-keys)
- [Building Stripe-like Public IDs in Postgres with Nano ID](https://www.localcan.com/blog/stripe-like-ids-postgres-nanoid)
- [Distributed System IDs — Matt Layman](https://www.mattlayman.com/blog/2022/distributed-system-ids/)
- [データベースのキー設計と主キーの選び方 — farstep (@farstep\_)](https://x.com/farstep_/status/2091329194521399322) — 上記「参考にした設計指針」の出典
- [ai/nanoid](https://github.com/ai/nanoid) — 既定 21 文字 / 126 ビット、modulo bias の排除
- [jetify-com/typeid — 仕様](https://github.com/jetify-com/typeid/tree/main/spec) — 接頭辞 + UUIDv7 の base32 符号化
- [paralleldrive/cuid2](https://github.com/paralleldrive/cuid2) — 「k-sortable = insecure」の出典
- [Stripe keys and IDs (gist)](https://gist.github.com/fnky/76f533366f75cf75802c8052b577e2a5) — 接頭辞の一覧と、生成部にシャード情報が含まれる旨
- [Generating sortable Stripe-like IDs with Segment's KSUIDs — Clerk](https://clerk.com/blog/generating-sortable-stripe-like-ids-with-segment-ksuids)
