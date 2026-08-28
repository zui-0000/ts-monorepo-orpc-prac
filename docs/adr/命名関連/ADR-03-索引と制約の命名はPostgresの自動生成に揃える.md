---
status: accepted
date: 2026-08-29
decision-makers: zui
consulted: Claude
informed:
---

# 索引と制約の命名は Postgres の自動生成に揃える

## 背景と課題 (Context and Problem Statement)

索引名は**スキーマ内で一意**でなければならない。そのためテーブル名を含めるところまでは
どの流儀でも共通だが、**種別 (索引なのか、制約なのか、一意なのか) をどこに、どう置くか**で
流派が分かれる。

これまで索引は 1 本しか無く (`t_user_mail_address_lower_unique`)、規約として
意識していなかった。ADR-02 で列名を `email` へ改名した際にこの索引も改名する
必要が生じ、そこで初めて「どの形にするか」を決める場面になった。

### 当初の決定 (2026-08-27) と、それが覆った理由

最初は **「接尾辞形式で `_idx` / `_uidx`」**を採用した。主たる根拠は
**「better-auth が索引名を自動で組み立てるため、揃えないと DB が不揃いになる」**
だった。しかしその後、**前提が 2 つとも崩れた。**

**① better-auth はこの構成では索引を 1 本も作らない。**

索引名を生成する `getDatabaseIndexName` の利用箇所を全部洗ったところ、呼び出し元は
3 つだけだった。

| 呼び出し元                                      | いつ動くか                           |
| ----------------------------------------------- | ------------------------------------ |
| `@better-auth/drizzle-adapter` のスキーマ生成器 | `@better-auth/cli generate` の実行時 |
| `better-auth/dist/db/get-migration.mjs`         | 内蔵の Kysely マイグレータ           |
| `better-auth/dist/db/get-schema.mjs`            | スキーマ出力                         |

**すべて「スキーマを better-auth に作らせる」経路**であり、ランタイムの
`drizzleAdapter` は索引名を一切参照しない (実測: 該当語の grep が 0 件)。
**drizzle スキーマを手書きし drizzle-kit でマイグレーションする本構成では、
better-auth は索引を作らず、名前も付けない。命名するのは常にこちらである。**

**② `lower(email)` の関数索引を廃止した。**

better-auth はメールを小文字で保存し素の `=` で引くため、関数索引は効かない。
素の列に張り替えた結果、**「関数索引は制約にできないので索引側で担うしかない」**
という当初の制約が消え、**UNIQUE 制約が選べるようになった。**

### さらに、当初の決定には内部矛盾があった

当初の ADR は `_unique` 案をこう却下していた。

> `_idx` は「索引という種別」を指すが `_unique` は「一意という性質」を指しており、
> 並べたときに対称にならない

**`_uidx` も同じ構造である。** `idx` は種別、`u` は性質であり、却下の論理が
そのまま採用案に当たっていた。

## 決定要因 (Decision Drivers)

- **Postgres 自身の自動生成と揃うこと**。名前を省略した `CREATE INDEX` や制約が
  1 つでも混ざったときに不揃いにならない
- **接尾辞が同じ軸を指すこと**。種別と性質を混ぜない
- **名前以外から読める情報を、名前に重複して書かないこと**
- **識別子の長さに収まること** (Postgres は 63 バイトで**黙って切り詰める**)
- アプリが索引名を文字列で持つ経路が壊れないこと

## 検討した選択肢 (Considered Options)

- Postgres の種別接尾辞をそのまま使う (`_pkey` / `_key` / `_fkey` / `_check` / `_excl` / `_idx`)
- 接尾辞形式だが一意索引に `_uidx` を使う (当初の決定)
- 接尾辞形式だが一意は `_unique`
- 接頭辞形式 (`pk_` / `uq_` / `fk_` / `idx_`)
- フレームワーク流 (`index_<table>_on_<cols>`)

## 決定 (Decision Outcome)

**「Postgres の種別接尾辞をそのまま使う」を採用する。**

```txt
<テーブル名>_pkey                 PRIMARY KEY 制約
<テーブル名>_<列名...>_key        UNIQUE 制約
<テーブル名>_<列名...>_fkey       FOREIGN KEY 制約
<テーブル名>_<列名...>_check      CHECK 制約
<テーブル名>_<列名...>_excl       EXCLUDE 制約
<テーブル名>_<列名...>_idx        索引 (制約でないもの)
```

**接尾辞は「オブジェクトの種別」だけを表す。「一意かどうか」という性質は書かない。**
これは Postgres 自身の設計であり、`_idx` の意味は「一意でない」ではなく
**「制約ではなく索引」**である。したがって一意索引にも `_idx` が付く。

式索引は、列名の位置に**式を表す語**を置く。

```txt
t_user_lower_idx    lower(email) に対する索引 (Postgres の自動生成に準じる)
```

### 一意性は原則として制約で宣言する

列に対する一意性は `CREATE UNIQUE INDEX` ではなく **UNIQUE 制約**で宣言する。

- 名前が `_key` になり、Postgres の自動生成と一致する
- `pg_constraint` に載り、**「実装手段」ではなく「業務ルール」として宣言される**
- ADR-07 の「生成キーを主キーにするなら、自然な一意性は別の一意性制約で宣言する」と揃う

**式索引・部分索引は制約にできない**ため、そこだけ `CREATE UNIQUE INDEX` を使い、
名前は `_idx` とする。名前から一意性は読めないが、`\d` にもエラーメッセージにも
`UNIQUE` と出るため実害は無い (後述)。

### 本スキーマに適用した結果

better-auth の 4 テーブルに当てはめると次のようになる。
**11 個すべてが、Postgres に名前を任せた場合と同じ名前になる。**

```txt
t_user
  t_user_pkey                       PRIMARY KEY (id)
  t_user_email_key                  UNIQUE 制約 (email)

t_session
  t_session_pkey                    PRIMARY KEY (id)
  t_session_token_key               UNIQUE 制約 (token)
  t_session_user_id_idx             索引 (user_id)
  t_session_user_id_fkey            FOREIGN KEY (user_id) → t_user(id)

t_account
  t_account_pkey                    PRIMARY KEY (id)
  t_account_issuer_account_id_key   UNIQUE 制約 (issuer, account_id)
  t_account_user_id_idx             索引 (user_id)
  t_account_user_id_fkey            FOREIGN KEY (user_id) → t_user(id)

t_verification
  t_verification_pkey               PRIMARY KEY (id)
  t_verification_identifier_idx     索引 (identifier)
```

### 結果 (Consequences)

- Good, because **規約が「Postgres に任せたのと同じ結果」と一致する。** 名前を省略した
  `CREATE INDEX` や制約が混ざっても、形が崩れない
- Good, because **接尾辞が種別だけを指すため、語彙の水準が揃う。** `_pkey` / `_key` /
  `_fkey` / `_check` / `_excl` / `_idx` がすべて同じ軸にある
- Good, because 一意性が `pg_constraint` に載る。`information_schema` からも見え、
  移行ツールの差分にも乗る
- Good, because **名前以外から一意性が読めるため、名前が短く済む。** 63 バイト上限に
  対する余裕が増える
- Good, because エラーメッセージの名前突き合わせは一意索引・UNIQUE 制約のどちらでも
  同じ形で動く (実測)
- Bad, because **better-auth の CLI 生成器が吐く `_uidx` とは食い違う。**
  `@better-auth/cli generate` を検算に使うと、索引名だけ差分が出る
- Bad, because **名前だけを見て一意かどうかは分からない。** 索引名の一覧を
  名前だけで眺める場面 (監視ダッシュボード等) では情報が減る
- Neutral, because 接頭辞派に慣れた人には馴染まない。名前順に並べても種別ごとには
  まとまらず、テーブル名順に散る

### 確認方法 (Confirmation)

**機械的な検査は用意していない。** 名前は drizzle スキーマの `uniqueIndex()` /
`unique()` / `index()` に文字列で書くため、lint で形を検査する余地はあるが、
現状は規約として守る。索引や制約を足すときに本 ADR を参照すること。

Postgres が実際に何を見せるかを実測した (PostgreSQL 18.4)。

```zsh
$ psql -c '\d demo'
 Column | Type | Collation | Nullable | Default
--------+------+-----------+----------+---------
 c      | text |           |          |            ← UNIQUE 制約があるが列行には出ない
Indexes:
    "demo_pkey" PRIMARY KEY, btree (id)
    "demo_a_idx" btree (a)
    "demo_b_idx" UNIQUE, btree (b)                 ← 一意「索引」
    "demo_c_key" UNIQUE CONSTRAINT, btree (c)      ← 一意「制約」
```

**`\d` は「一意かどうか」と「制約か索引か」の両方を、名前とは無関係に表示する。**
名前がその情報を担う必要はない。

一意違反のエラーも両者で同じ形になる。

```zsh
$ psql -c "INSERT ..."
ERROR:  duplicate key value violates unique constraint "demo_b_idx"    ← 一意索引
ERROR:  duplicate key value violates unique constraint "demo_c_key"    ← UNIQUE 制約
```

Postgres は一意索引のことも "unique constraint" と呼び、**名前は同じ位置で返る**。
アプリ側の名前突き合わせはどちらでも動く。

なお **索引名をアプリ側が文字列で持つ場合は追随を忘れないこと**。
`user-repository.ts` の `EMAIL_UNIQUE_INDEX` は DB が返す一意制約違反の名前と
突き合わせており、ここがズレると 409 が 500 に化ける (経緯は ADR-02)。
型検査もテストも通ってしまうため、改名時は grep で確かめる。

## 各選択肢の評価 (Pros and Cons of the Options)

### Postgres の種別接尾辞をそのまま使う (採用)

- Good, because **Postgres の自動生成と完全一致する。** 公式ドキュメントが
  `CREATE INDEX ON films ((lower(title)));` に対して `films_lower_idx` を例示しており、
  式索引の扱いまで一致する
- Good, because 接尾辞がすべて「種別」を指し、語彙の水準が揃う
- Good, because **Prisma が全 DB 共通の既定として採用している形と同じ。** MySQL や
  SQL Server もサポートする ORM が「決定的だから」という理由で Postgres 規約を選んでいる
- Bad, because 名前だけでは一意性が読めない
- Bad, because better-auth の CLI 生成器と食い違う

### 接尾辞形式だが一意索引に `_uidx` を使う (当初の決定・却下)

- Good, because **名前だけで一意性が読める。** 索引名の一覧を名前だけ眺める場面で有利
- Good, because better-auth の CLI 生成器が吐く名前と一致する
- Bad, because **`uidx` は Postgres の語彙ではない。** Postgres は一意索引にも `_idx` を
  付けるため、名前を省略した索引が 1 つ混ざった時点で規約が崩れる
- Bad, because **種別と性質を混ぜている。** `_unique` 案を却下した論理が
  そのまま当てはまる
- Bad, because **採用の主たる根拠が成り立たなかった。** 「better-auth が自動命名する」は
  CLI 生成器と内蔵マイグレータを使う場合の話であり、スキーマ手書きの本構成では発火しない
- Neutral, because 情報量では優れる。ただし `\d` もエラーメッセージも一意性を表示するため、
  名前が担う必要は薄い

### 接尾辞形式だが一意は `_unique`

改名前に使っていた `t_user_mail_address_lower_unique` の形。

- Good, because 「一意」であることが省略のない英単語で明示される
- Neutral, because 接尾辞である点は採用案と同じ
- Bad, because 語彙の水準が揃わない (`_idx` は種別、`_unique` は性質)
- Bad, because Postgres の自動生成と食い違う
- Neutral, because **Laravel はこの形を既定にしている** (`<table>_<cols>_index` /
  `_unique` / `_foreign`)。孤立した案ではない

### 接頭辞形式 (`pk_` / `uq_` / `fk_` / `idx_`)

- Good, because 名前順に並べると種別ごとにまとまる
- Good, because SQL Server / MySQL / Oracle 文化圏では一般的で、その出身者には読みやすい
- Good, because **63 バイト上限で切り詰められたとき、種別が残る。** 接尾辞形式では
  溢れると種別が消える
- Good, because **GitLab が採用している** (`pk_projects` / `fk_projects_group_id_groups` /
  `index_repositories_on_group_id`)。Postgres を使う大規模実例が存在する
- Bad, because **Postgres の自動生成と食い違う。** 名前を省略した索引が 1 つでも
  混ざった瞬間に規約が崩れ、しかもそれを機械的に防げない
- Bad, because Postgres の制約が使う `_pkey` / `_key` は接尾辞のまま残るため、
  すべてを明示的に命名し直さない限り DB 内で 2 つの流儀が混在する

### フレームワーク流 (`index_<table>_on_<cols>`)

Rails の既定であり、GitLab が索引にだけ採用している形。

- Good, because 英語の語順として読み下せる
- Bad, because **索引だけ接頭辞で、制約は接尾辞という混在**になりやすい。
  実際 GitLab の規約は `pk_` / `fk_` / `unique_` / `index_` と、種別ごとに語形が揃っていない
- Bad, because Postgres の自動生成と食い違う

## 補足情報 (More Information)

### なぜ MySQL に接頭辞文化が生まれ、Postgres には無いのか

**両者の「名前を省略したときの挙動」が決定的に違う。**

MySQL 8.4 リファレンスマニュアル (`CREATE TABLE`):

> In MySQL, the name of a `PRIMARY KEY` is `PRIMARY`. For other indexes,
> **if you do not assign a name, the index is assigned the same name as the
> first indexed column**, with an optional suffix (`_2`, `_3`, ...) to make it unique.

PostgreSQL ドキュメント (`CREATE INDEX`):

> If the name is omitted, PostgreSQL chooses a suitable name **based on the
> parent table's name and the indexed column name(s)**.

| DB             | 名前を省略すると                                        | 実用に耐えるか                    |
| -------------- | ------------------------------------------------------- | --------------------------------- |
| **MySQL**      | `email` / `email_2` / `email_3`                         | **無理。** 種別もテーブル名も無い |
| **PostgreSQL** | `t_user_email_idx` / `t_user_pkey` / `t_user_email_key` | **そのまま使える**                |

**MySQL は自動命名が使い物にならないため、コミュニティが `idx_` 規約を発明する
必要があった。** SQL Server (`IX_`) も Oracle (`IDX_`) も同じ事情である。

**Postgres は最初から実用的な名前を付けるため、規約を発明する必要がなかった。**
「Postgres の流儀」とは「Postgres 自身の自動命名」のことである。

### 界隈の実態

| 派                               | 形                                                 | 誰が                                                                  |
| -------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| **① Postgres 自動命名 (接尾辞)** | `<table>_<cols>_idx` / `_key` / `_pkey` / `_fkey`  | **Postgres 自身**、**Prisma**、Django、主要な Postgres スタイルガイド |
| ② 接頭辞                         | `IX_` / `idx_` / `pk_` / `fk_`                     | SQL Server、MySQL コミュニティ、Oracle、**GitLab**                    |
| ③ フレームワーク独自             | `index_<table>_on_<cols>` / `<table>_<cols>_index` | **Rails**、**Laravel**                                                |

**①で特筆すべきは Prisma。** ドキュメントに理由まで明記されている。

| 対象     | Prisma の既定         |
| -------- | --------------------- |
| 主キー   | `{table}_pkey`        |
| 一意制約 | `{table}_{cols}_key`  |
| 索引     | `{table}_{cols}_idx`  |
| 外部キー | `{table}_{cols}_fkey` |

> Prisma ORM naming convention was chosen to **align with PostgreSQL since it is
> deterministic**.

**MySQL も SQL Server も SQLite もサポートする ORM が、全 DB 共通の既定として
Postgres の規約を選んでいる。**

**②で特筆すべきは GitLab。** Postgres を使いながら接頭辞を選び、理由も明記している。

> **prefixes are preferred over suffixes** because they facilitate quick
> identification and alphabetical grouping.

却下した案が実在し、大規模に運用されていることの証拠である。

### better-auth の索引名はいつ使われるか

`@better-auth/core` は索引名をこう組み立てる。

```js
const indexKind = index.unique ? "uidx" : "idx";
const generatedName = `${tableName}_${index.fields.join("_")}_${indexKind}`;
```

63 バイトを超える場合は FNV-1a ハッシュを挟んで切り詰める。`index.name` を明示すれば
上書きできるが、`[A-Za-z_][A-Za-z0-9_]*` の形式検査とバイト長検査が入る。

**ただしこの関数が呼ばれるのは、CLI のスキーマ生成器・内蔵マイグレータ・スキーマ出力の
3 経路だけである。** ランタイムの `drizzleAdapter` は索引名を参照しない。
**スキーマを手書きする本構成では、この名前は一切生成されない。**

CLI 生成器を使った場合に吐かれるのは次の形。

```ts
uniqueIndex("t_account_issuer_account_id_uidx").on(table.issuer, table.accountId),
```

**`@better-auth/cli generate` を「手書きスキーマの検算」に使う場合、索引名だけは
差分として出る。** それは想定内として無視すること。

### 識別子は 63 バイトで黙って切り詰められる

Postgres の識別子上限は 63 バイト (`NAMEDATALEN - 1`) で、**超過分は警告なく切られる。**
接尾辞形式では**溢れたときに種別が消える**という弱点がある (接頭辞形式ならテーブル名側が削れる)。

本スキーマの最長は `t_account_issuer_account_id_key` の 31 文字であり、当面問題にならない。
**長い複合索引を足すときは長さを確認すること。** 溢れそうなら列名を省略するのではなく、
明示的に短い名前を付ける。

なお better-auth はハッシュで切り詰め、GitLab も「63 文字以内に収めよ」と明記している。
**どの流儀もこの上限を意識している。**

### 制約側の接尾辞の出どころ

制約の自動命名は**公式ドキュメントには明記が無い**。「システムが名前を選ぶ」と
書かれているだけで、規則は示されていない。以下は実装挙動として広く知られているもので、
ドキュメント上の保証ではない点に注意する (`\d` の実測で確認済み)。

| 種別              | 接尾辞   | 例                       |
| ----------------- | -------- | ------------------------ |
| PRIMARY KEY       | `_pkey`  | `t_user_pkey`            |
| UNIQUE 制約       | `_key`   | `t_user_email_key`       |
| FOREIGN KEY       | `_fkey`  | `t_session_user_id_fkey` |
| CHECK             | `_check` | `t_user_name_check`      |
| EXCLUDE           | `_excl`  | `t_room_period_excl`     |
| 索引 (制約でない) | `_idx`   | `t_session_user_id_idx`  |

**`_key` と `_idx` の違いが重要**である。UNIQUE 制約 (`_key`) は裏で一意索引を作るが、
制約として `pg_constraint` に載る。一方 `CREATE UNIQUE INDEX` は索引でしかなく、
`pg_constraint` には載らない。**採用案が「一意性は制約で宣言する」としたのは、
この違いを名前と実体の両方で揃えるためである。**

### この判断が変わりうる場面

- **索引名の一覧を名前だけで眺める運用が始まったとき** (監視ダッシュボード等)。
  `_uidx` の情報量が効いてくる。ただし `pg_indexes.indexdef` や `pg_index.indisunique` を
  併せて出せば済むため、まずそちらを検討する
- **`@better-auth/cli generate` の出力をそのまま採用する方針に変えたとき。**
  その場合は better-auth の `_uidx` に合わせるほうが差分が減る
- **接尾辞が 63 バイト上限で頻繁に切り詰められるようになったとき。**
  接頭辞形式なら種別が残るという利点が効いてくる

### 命名の対象範囲

この ADR が扱うのは**索引と制約の名前**のみである。
テーブル名の接頭辞と drizzle の変数名は ADR-04、ファイル名は ADR-01 が扱う。

### 参考資料

- [PostgreSQL: CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html) — 名前を省略したときの自動生成
- [MySQL 8.4 Reference Manual: CREATE TABLE](https://dev.mysql.com/doc/refman/8.4/en/create-table.html) — 名前を省略すると最初の列名になる
- [Database mapping | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/database-mapping) — Postgres 規約を全 DB 共通の既定に選んだ理由
- [Constraints naming conventions | GitLab Docs](https://docs.gitlab.com/development/database/constraint_naming_convention/) — 接頭辞派の大規模実例
- [How I Write SQL, Part 1: Naming Conventions — Launch by Lunch](https://launchbylunch.com/posts/2014/Feb/16/sql-naming-conventions/)
- [Postgres Constraint Naming Convention — Cybertec TIL](https://til.cybertec-postgresql.com/post/2019-09-02-Postgres-Constraint-Naming-Convention/)
