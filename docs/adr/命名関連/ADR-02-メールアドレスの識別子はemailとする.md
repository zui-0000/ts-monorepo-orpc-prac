---
status: accepted
date: 2026-08-27
decision-makers: zui
consulted: Claude
informed:
---

# メールアドレスの識別子は email とする

## 背景と課題 (Context and Problem Statement)

リポジトリ全体でメールアドレスを `mailAddress` / `mail_address` / `MailAddress`
と呼んでいた。契約・ドメインの値オブジェクト・DB 列・エラーコードまで一貫していた
ため、規約としては破綻していない。

これを見直す契機は 2 つある。

**1 つ目は better-auth の導入**である。認証をメール+パスワードと Google の 2 方式で
実装するにあたり、better-auth の JS API は `user.email` / `signUpEmail({ email })` の
ように **`email` で固定されており、こちらの都合では変えられない**。DB のカラム名は
`fields` のマッピングで寄せられるが、TypeScript のプロパティ名は動かせない。

**2 つ目は英語としての正しさ**である。`mailAddress` が電子メールを指す語として
適切かを確かめたところ、そうではなかった (根拠は「補足情報」)。

つまり「外部ライブラリとの語彙の距離」と「そもそも命名が正しいか」という、
性質の違う 2 つの問題が同時に出てきた状態だった。

## 決定要因 (Decision Drivers)

- **英語として曖昧でないこと**。`mail` は郵便が第一義で、`mailing address` は
  郵送先の住所を指す
- **契約 (OpenAPI) は外から読まれる**。一般的な語のほうが説明が要らない
- **better-auth の語彙との変換点を増やさない**こと
- **直すなら早いほうが安い**。認証を載せた後だとマイグレーションの難度が上がり、
  クライアントへの影響も広がる

## 検討した選択肢 (Considered Options)

- `mailAddress` を維持し、better-auth との境界で変換する
- `email` へ全面的に統一する
- DB 列だけ `email` に寄せ、契約とドメインは `mailAddress` のまま残す

## 決定 (Decision Outcome)

**「`email` へ全面的に統一する」を採用する。**

`mailAddress` が英語として曖昧である以上、変換で覆い隠す対象ではなく
命名そのものの誤りだと判断した。better-auth との語彙が揃うのは副次的な利得であり、
仮に better-auth を採用しなかったとしても同じ結論になる。

置換した識別子は以下のとおり。

| 変更前                           | 変更後                    |
| -------------------------------- | ------------------------- |
| `mailAddress`                    | `email`                   |
| `MailAddress`                    | `Email`                   |
| `MailAddressSchema`              | `EmailSchema`             |
| `MAIL_ADDRESS_PATTERN`           | `EMAIL_PATTERN`           |
| `MailAddressDuplicationError`    | `EmailDuplicationError`   |
| `MAIL_ADDRESS_DUPLICATION_ERROR` | `EMAIL_DUPLICATION_ERROR` |
| `mail_address` (DB 列)           | `email`                   |

ファイル名も 6 本を追随させた (`mail-address.ts` → `email.ts` など)。

### 結果 (Consequences)

- Good, because 電子メールを指す語として曖昧さが無くなった
- Good, because better-auth の JS API と語彙が一致し、境界での変換が要らない
- Good, because OpenAPI を読む側にとって `email` のほうが一般的で説明が要らない
- Bad, because **API の破壊変更が 2 つ入る。** リクエスト / レスポンスの
  `mailAddress` → `email` と、エラーコード `MAIL_ADDRESS_DUPLICATION_ERROR` →
  `EMAIL_DUPLICATION_ERROR`。どちらも OpenAPI に出る
- Bad, because 約 103 箇所 / 25 ファイルの置換とマイグレーション 1 本を要した
- Neutral, because 日本語のコメント・メッセージ内の「メールアドレス」は変えていない。
  日本語としてはこれが正しい語であり、識別子の話とは別

### 確認方法 (Confirmation)

置換漏れは grep で検査する。以下が 0 件であること。

```zsh
$ grep -rn "MAIL_ADDRESS\|mail_address\|mailAddress\|MailAddress\|mail-address" \
    --include="*.ts" --include="*.tsx" apps packages \
    --exclude-dir=node_modules --exclude-dir=dist
```

ただし `apps/backend/db/migrations/` は**除外しない**。過去のマイグレーション SQL は
履歴であり、`mail_address` を含んだまま残すのが正しい。

そのうえで `pnpm check:type` / `check:lint` / `format:check` / `test` を通し、
`pnpm build` で OpenAPI を再生成して `mailAddress` が消えたことを確かめる。

## 各選択肢の評価 (Pros and Cons of the Options)

### `mailAddress` を維持し、better-auth との境界で変換する

better-auth の `fields` マッピングは **drizzle の TS プロパティ名**を指すため、
`fields: { email: "mailAddress" }` と書けば drizzle 側は `mailAddress` のまま保てる。
SQL のカラム名は drizzle が握るので `mail_address` も維持できる。

- Good, because **リネームのコストがゼロ**。設定 1 行で済む
- Good, because 契約が無傷なので、フロントエンドにも影響が出ない
- Good, because 外部ライブラリの語彙を自分の層に漏らさない設計は、
  変換層を持つアーキテクチャとして正常な形であり、妥協ではない
- Bad, because **命名の誤りが残る。** better-auth との距離は設定で埋められるが、
  `mailAddress` が英語として曖昧である事実は変わらない
- Bad, because better-auth の API を触る箇所だけ `user.email` になり、
  「コードでは email、こちらでは mailAddress」という二重の名前が恒久的に残る

### `email` へ全面的に統一する

- Good, because 命名が英語として正確になる
- Good, because better-auth との変換が要らない
- Bad, because 破壊変更を伴う
- Bad, because 置換範囲が広く、機械的な置換だけでは漏れる箇所がある
  (実際に漏れた例は「補足情報」)

### DB 列だけ `email` に寄せ、契約とドメインは `mailAddress` のまま残す

- Good, because マイグレーションだけで済み、契約が無傷
- Neutral, because drizzle は TS プロパティ名と SQL カラム名を分けられるため、
  技術的には成立する
- Bad, because **層ごとに名前が変わる。** DB は `email`、ドメインは `MailAddress`、
  契約は `mailAddress` となり、追跡のたびに読み替えが要る
- Bad, because 命名の誤りを直したいのか、better-auth に寄せたいのか、
  どちらの目的も中途半端にしか達成できない

## 補足情報 (More Information)

### なぜ `mailAddress` が曖昧なのか

英語の `mail` は**郵便**が第一義である。

| 語                | 指すもの             |
| ----------------- | -------------------- |
| `mailing address` | 郵送先の住所         |
| `mailbox`         | 郵便受け             |
| `mail address`    | **どちらとも読める** |
| `email address`   | 電子メールアドレス   |

電子メールを指すには `e-` が要る。日本語の「メールアドレス」は電子メールを指す語として
定着しているが、それをそのまま英語へ写した `mailAddress` は和製英語寄りの命名になる。

なお RFC 5322 が定義するのは `address` および `mailbox` であり、`mail address` という
語は使われない。実務上も better-auth をはじめ広く `email` が使われている。

### better-auth の `fieldName` は SQL のカラム名ではない

「維持する」案を検討する過程で確かめた事実であり、今後 better-auth を配線するときにも
効いてくる。`@better-auth/drizzle-adapter` はスキーマを**オブジェクトのプロパティ名**で
引いている。

```js
const schemaModel = schema[model];
if (!schemaModel) throw new BetterAuthError(...);

const field = getFieldName({ ... });
if (!schemaModel[field]) throw new BetterAuthError(
  `The field "${w.field}" does not exist in the schema for the model "${model}".`
);
```

つまり `modelName` / `fieldName` が指すのは drizzle の TS 側の名前であり、
SQL のカラム名は drizzle (`varchar("...")`) が自由に決められる。名前の軸は独立している。

| 軸                       | 決める主体  | 制約                   |
| ------------------------ | ----------- | ---------------------- |
| better-auth の JS API    | better-auth | `email` 固定・変更不可 |
| drizzle の TS プロパティ | こちら      | `fieldName` と一致必須 |
| SQL のカラム名           | こちら      | 自由                   |
| 契約 / ドメインの語彙    | こちら      | 自由                   |

### 機械的な置換で漏れた箇所

`mailAddress` / `mail_address` の置換だけでは、**大文字の定数名が残った**。

```ts
const MAIL_ADDRESS_UNIQUE_CONSTRAINT = "t_user_email_lower_unique";
```

これは DB が返す一意制約違反の名前と突き合わせて 409 を返す箇所である。索引名を
`t_user_email_lower_uidx` へ変えたにもかかわらず、この文字列だけが追随していなかった。
放置していれば**メールアドレスの重複が 409 ではなく 500 になる**。型検査もテストも
通ってしまう種類の不整合であり、grep での残存確認が必要な理由がここにある。

定数名は `EMAIL_UNIQUE_INDEX` とした。`CREATE UNIQUE INDEX` で作っているため
「制約」ではなく「索引」である (Postgres の UNIQUE 制約なら `_key` が付く)。

一方で読み取り側 `postgres-error-reader.ts` の `constraint` は変えていない。
Postgres は一意制約違反のとき**索引名を `constraint` フィールドに入れて返す**ため、
向こうのエラーフィールド名をそのまま写しているのが正しい。

### 索引名の変更

列名の変更に伴い、索引も改名した。

```txt
t_user_mail_address_lower_unique  →  t_user_email_lower_uidx
```

`unique` を `uidx` に畳んだのは、Postgres が名前を省略した `CREATE INDEX` に対して
`<table>_<column>_idx` を自動生成することと、better-auth が索引名を同じ形で組み立てる
ことに揃えたため。

```js
const indexKind = index.unique ? "uidx" : "idx";
const generatedName = `${tableName}_${index.fields.join("_")}_${indexKind}`;
```

better-auth を配線すると `session` や `account` の索引が同じ DB に並ぶため、
先に揃えておく判断をした。規約そのものは ADR-03 に切り出している。

なお索引の**中身**は `lower(email)` のまま残している。better-auth はメールを小文字化して
保存し素の `=` で引くため、関数索引は最終的に素の UNIQUE へ張り替えることになるが、
それは「小文字化を受け入れる」という設計判断とセットであり、このリネームとは分けた。

### マイグレーションの作り方

`drizzle-kit generate` は列のリネームを削除+追加と区別できず、対話で確認してくる。
TTY が無い環境では次のように落ちる。

```txt
Error: Interactive prompts require a TTY terminal
    at promptColumnsConflicts (...)
```

そのため SQL と `meta` スナップショットは手書きした。

```sql
ALTER TABLE "t_user" RENAME COLUMN "mail_address" TO "email";--> statement-breakpoint
ALTER INDEX "t_user_mail_address_lower_unique" RENAME TO "t_user_email_lower_uidx";
```

`DROP INDEX` + `CREATE INDEX` ではなく `ALTER INDEX ... RENAME` としたのは、索引を
作り直さずに済むため。Postgres は `RENAME COLUMN` の時点で索引の定義式を自動で
追随させるが (`lower(mail_address)` → `lower(email)`)、**索引名は変わらない**ので
改名が別途必要になる。

手書きしたスナップショットの正しさは、もう一度 `db:generate` を回して確かめられる。

```zsh
$ pnpm db:generate
1 tables
t_user 6 columns 1 indexes 0 fks

No schema changes, nothing to migrate 😴
```

スキーマとスナップショットが一致していれば差分が出ない。**drizzle-kit 自身に検算させる**
方法として使える。
