---
status: accepted
date: 2026-08-29
scope: backend
decision-makers: zui
consulted: Claude
informed:
---

# 認証は better-auth が所有し、ドメインの属性は別テーブルに置く

## 背景と課題 (Context and Problem Statement)

ADR-07 で「利用者の行の所有権を better-auth に渡す」と決め、配線まで済ませた。
その後、**利用者のプロフィール情報を持つ場所が必要になった**。

当初は「`familyName` を足したい」という形で出てきたが、本質は列を 1 つ増やす話ではなく
**「ドメインの属性をどこに置くか」という境界の話**である。プロフィール項目は今後も
増えるため、置き場所を先に決めないと `t_user` が際限なく太る。

### `t_user` の列は動かせない

まず「`name` と `email` を移せるか」を実測した。drizzle の定義から外して
`signUpEmail` を呼ぶ。

```txt
baseline    → 成功
name なし   → 失敗: Failed to create user
email なし  → 失敗: The field "email" does not exist in the schema for the model "user"
```

- **`email` はログイン識別子そのもの。** better-auth は `WHERE email = ?` で引くため、
  別テーブルにあると認証が成立しない
- **`name` は `required: true`。** サインアップ時の INSERT に必ず含まれるため、
  drizzle 側に対応するプロパティが無いと落ちる

**`t_user` は better-auth が要求する列で固定されている。** 増やすこと自体は
`additionalFields` でできるが、それは**認証ライブラリの設定に業務の語彙を積む**ことになる。

### 所有者が名前から読めない

`t_user` は「利用者」を指す名前としては正しい。しかし**それが better-auth の所有物で
あることを語らない**。現状はファイル冒頭のコメントと ADR-07 だけが担保している。

### 境界が壊れていた実例

`PUT /users/{id}` が `t_user` の `name` と `email` を**直接書いていた**。実測。

```txt
① サインアップ                         victim@example.com
② PUT で "Victim@Example.com" へ更新   → 204 成功
③ DB の中身                            Victim@Example.com
④ victim@example.com でログイン        → 401
⑤ Victim@Example.com でログイン        → 401
```

**どちらの表記でもログインできない。永久ロックアウト。**
better-auth は「メールは小文字で保存されている」前提で、入力を小文字化してから素の
`=` で引く。大文字混じりの行は**誰からも引けなくなる**。

原因は列名でも検証でもなく、**自前のコマンドが better-auth の不変条件を壊せる構造に
なっていたこと**である。

## 決定要因 (Decision Drivers)

- **better-auth の不変条件を壊せないこと。** 壊せる口があれば、いつか壊れる
- プロフィール項目が増えても `t_user` が太らないこと
- **所有者が読めること**
- 命名の軸を混ぜないこと (ADR-03 / 命名関連/ADR-04)

## 検討した選択肢 (Considered Options)

- スキーマ名前空間で分ける (`auth` / `public`)
- 接頭辞で所有者を表す (`t_auth_user`)
- 名前は据え置き、ファイル境界とコメントで担保する
- プロフィールを `additionalFields` で `t_user` に足す

## 決定 (Decision Outcome)

**「スキーマ名前空間で分け、ドメインの属性は別テーブルに置き、自前のコマンドは
`t_user` を一切書かない」を採用する。**

### ① better-auth の 4 テーブルは `auth` スキーマへ

```txt
auth.t_user             better-auth の所有物。これ以上増えない
auth.t_session
auth.t_account
auth.t_verification
public.t_user_profile   ドメインの属性。ここだけが自前で書いてよい
```

**所有者を名前ではなく構造で表す。** 名前空間を見れば「触ってよいか」が決まる。

### ② ドメインの属性は `public.t_user_profile` に置く

```sql
CREATE TABLE public.t_user_profile (
  user_id     uuid PRIMARY KEY REFERENCES auth.t_user(id) ON DELETE CASCADE,
  family_name text,
  given_name  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

主キー兼外部キーの 1:1。**プロフィール項目が増えてもここだけが太る。**

### ③ 自前のコマンドは `t_user` を書かない

| 何を変更        | 経由する場所                                | なぜ                                         |
| --------------- | ------------------------------------------- | -------------------------------------------- |
| メールアドレス  | better-auth `/change-email`                 | 新アドレスへ検証メールを送ってから切り替える |
| 表示名 (`name`) | better-auth `/update-user`                  | あちらの所有物                               |
| プロフィール    | 自前の `PUT /users/{id}` → `t_user_profile` | ここがドメインの領分                         |

**上記のロックアウトは、この決定によって構造的に起きなくなる。**
自前の経路から `t_user` を書く手段が無くなるためである。

### ④ プロフィール行は遅延作成する

サインアップ時には作らない。**利用者がプロフィールを入力したとき初めて INSERT する。**

`databaseHooks.user.create.after` で作る案は採らない。あのフックは
`queueAfterTransactionHook` に積まれ、**コミット後に走る**ためである
(better-auth 自身のコメントに `Reporting cannot roll back committed work` とある)。
つまり「利用者は作られたがプロフィールが作られなかった」窓を塞げない。

**遅延作成なら、その窓が構造的に存在しない。** プロフィールは本来「任意で後から
埋めるもの」であり、実態にも合う。

### 結果 (Consequences)

- Good, because **所有者が構造として表れる。** `auth.` を見れば触ってはいけないと分かる
- Good, because **better-auth の不変条件を壊す口が塞がる。** ロックアウトが再発しない
- Good, because プロフィール項目が増えても `t_user` は固定のまま
- Good, because **2 段書き込みの整合性問題が発生しない** (遅延作成のため)
- Good, because ドメインが自分のテーブルと集約を持つ。読み書きが自前の語彙で完結する
- Good, because 権限を名前空間で分ける道が開く (`auth` スキーマを別ロールに限る等)
- Bad, because **`CREATE SCHEMA auth` の手当てが要る。** drizzle-kit は
  `"auth"."t_user"` は吐くが `CREATE SCHEMA` は出さない (実測)
- Bad, because psql で `\dt` するとき `\dt auth.*` が要る。`search_path` を意識する場面が増える
- Bad, because **`PUT /users/{id}` の契約が変わる。** `name` / `email` を受け取らなくなる
- Neutral, because 表示名 (`auth.t_user.name`) と氏名 (`family_name` / `given_name`) が
  別々に存在する。**別の情報として定義するため重複ではない** (後述)

### 確認方法 (Confirmation)

移行後、次の 3 点を確認すること。

1. **`PUT /users/{id}` に `email` を渡す口が無いこと。** 契約から消えているか
2. **サインアップ → プロフィール未入力の状態で `GET /users/{id}` が通ること。**
   遅延作成なので `t_user_profile` に行が無い状態が正常
3. **`auth` スキーマに 4 テーブル、`public` に `t_user_profile` があること**

```zsh
$ psql -c '\dt auth.*'
$ psql -c '\dt public.*'
```

## 各選択肢の評価 (Pros and Cons of the Options)

### スキーマ名前空間で分ける (採用)

- Good, because 所有者が構造として表れ、名前の付け方に依存しない
- Good, because **Supabase の `auth.users` + `public.profiles` と同じ形。** 実務の主流
- Good, because 将来 `auth` スキーマの権限を絞れる
- Bad, because `CREATE SCHEMA` の手当てと `search_path` の意識が要る

### 接頭辞で所有者を表す (`t_auth_user`)

- Good, because 所有者が名前で読める。スキーマの機構が要らない
- Bad, because **命名の軸が混ざる。** 命名関連/ADR-04 の接頭辞は「種別」
  (`t_` / `m_` / `c_`) を表すもので、そこに所有者を足すと 2 つの軸が 1 つの接頭辞に同居する。
  **ADR-03 が `_uidx` を却下した論理がそのまま当てはまる**
- Bad, because `t_user_profile.user_id → t_auth_user.id` という外部キーは、
  **「利用者の本体はどちらか」が読めなくなる**
- Bad, because 4 テーブルすべての改名になる

### 名前は据え置き、ファイル境界とコメントで担保する

- Good, because 変更が要らない。`drizzle-schema.ts` が既に「better-auth の 4 テーブル」
  というまとまりになっている
- Good, because Supabase も認証テーブルの名前は `users` のままにしている
- Bad, because **所有者がコメントでしか表現されない。** コメントは移動もコピーもされる
- Bad, because **今回の出発点 (所有者が名前から読めない) を解決しない**

### プロフィールを `additionalFields` で `t_user` に足す

- Good, because テーブルが増えない。JOIN が要らない
- Good, because better-auth の API が返す `user` にそのまま乗る
- Bad, because **認証ライブラリの設定に業務の語彙を積むことになる。**
  住所や生年月日が `betterAuth({ user: { additionalFields: ... } })` に並ぶ
- Bad, because **better-auth のバージョンアップが直撃する。** 1.7.1 → 1.7.2 で
  `account.issuer` が増えた実績があり、`user` の形が変わるとドメインが揺れる
- Bad, because better-auth が `user` を返すたびに業務の属性が付いてくる

## 補足情報 (More Information)

### 表示名と氏名は別の情報として定義する

`auth.t_user.name` は `required: true` で消せない。氏名を分解して持つと、一見
重複するように見える。

|                                                    | 意味                              | 誰が書くか                                             |
| -------------------------------------------------- | --------------------------------- | ------------------------------------------------------ |
| `auth.t_user.name`                                 | **表示名。** 画面に出す短い呼び名 | better-auth (サインアップ入力 / Google の displayName) |
| `public.t_user_profile.family_name` / `given_name` | **氏名。** 姓と名に分解したもの   | ドメイン                                               |

**別の情報として定義すれば重複ではない。** GitHub / Slack / Google なども表示名と
氏名を別物として扱っている。連結して同期する案は、二重管理になるため採らない。

### `create.after` がコミット後に走る根拠

`with-hooks.mjs` は `after` フックを `queueAfterTransactionHook` に積む。

```js
if (toRun) await queueAfterTransactionHook(async () => { ... toRun(created, context) ... });
```

`@better-auth/core` 側の実装とコメント。

```txt
Queue a hook to be executed after the current transaction commits.
If not in a transaction, the hook will execute immediately.
...
Reporting cannot roll back committed work or suppress later hooks.
```

**トランザクションの内側には置けない。** 即時作成を採らなかったのはこのためである。

### Supabase の前例

Supabase は `auth.users` を認証基盤が所有し、アプリは `public.profiles` を別に持つ。
**認証テーブルの名前は `users` のままで、所有者はスキーマ名前空間が表している。**
本 ADR はこの形をそのまま採っている。

### 移行時の手当て

- **`CREATE SCHEMA auth` は drizzle-kit が出さない** (実測)。migration に手で足すか、
  `db/migrate.ts` で先に実行する
- 索引名・制約名は名前空間ごとに独立するため、`t_user_email_key` などはそのまま使える
- `drizzle.config.ts` の `schema` glob は変更不要

### この判断が変わりうる場面

- **`t_user_profile` の項目がゼロのまま増えないと分かったとき。** その場合は
  テーブルごと不要になる。ただし所有者を名前空間で分ける決定は残る
- **better-auth を外すとき。** `auth` スキーマの中身を自前に置き換えることになるが、
  `public` 側は無傷で済む。**これが分離の最大の見返り**である
