---
status: accepted
date: 2026-08-27
decision-makers: zui
consulted: Claude
informed:
---

# 索引の命名は接尾辞形式とし一意なら uidx を使う

## 背景と課題 (Context and Problem Statement)

索引名は**スキーマ内で一意**でなければならない。そのためテーブル名を含めるところまでは
どの流儀でも共通だが、種別 (索引なのか、一意なのか) をどこに置くかで流派が分かれる。

- **接頭辞派** — `idx_t_user_email` / `uq_t_user_email`
- **接尾辞派** — `t_user_email_idx` / `t_user_email_uidx`

これまで索引は 1 本しか無く (`t_user_mail_address_lower_unique`)、規約として
意識していなかった。ADR-02 で列名を `email` へ改名した際にこの索引も改名する
必要が生じ、そこで初めて「どちらの形にするか」を決める場面になった。

さらに **better-auth の配線が控えている**。あれを入れると `session` / `account` /
`verification` の索引が同じ DB に並ぶ。**向こうが自動で名前を組み立てる**ため、
こちらの規約が食い違っていると DB を眺めたときに不揃いになる。

## 決定要因 (Decision Drivers)

- **Postgres 自身の自動生成と揃うこと**。名前を省略した `CREATE INDEX` が
  1 つでも混ざったときに不揃いにならない
- **better-auth が生成する名前と揃うこと**。あちらの索引を全部明示的に
  命名し直すのは現実的でない
- **一意かどうかが名前から読めること**
- **索引と制約が名前で区別できること**。Postgres では UNIQUE 制約と
  一意索引は別物であり、混同すると探す場所を間違える

## 検討した選択肢 (Considered Options)

- 接尾辞形式で `_idx` / `_uidx`
- 接頭辞形式で `idx_` / `uq_`
- 接尾辞形式だが一意は `_unique` (改名前に使っていた形)

## 決定 (Decision Outcome)

**「接尾辞形式で `_idx` / `_uidx`」を採用する。**

Postgres の自動生成と better-auth の生成規則が**どちらも接尾辞形式**であり、
自分たちだけ接頭辞にする理由が無いため。

```txt
<テーブル名>_<列名...>_idx     通常の索引
<テーブル名>_<列名...>_uidx    一意索引
```

式インデックスは、列名の位置に**式を表す語**を置く。

```txt
t_user_email_lower_uidx    lower(email) に対する一意索引
```

### 結果 (Consequences)

- Good, because 名前を省略した `CREATE INDEX` が混ざっても形が揃う
- Good, because better-auth が作る索引と並べても不揃いにならない
- Good, because `uidx` により一意性が名前から読める
- Good, because Postgres が UNIQUE 制約に付ける `_key` と区別がつく。
  `_idx` / `_uidx` を見れば「制約ではなく索引」だと分かる
- Bad, because 接頭辞派に慣れた人には馴染まない。
  名前順に並べても索引がまとまらず、テーブル名順に散る
- Neutral, because `uidx` は Postgres 自身が使う語ではない。
  Postgres は一意索引にも `_idx` を付けるため、そこだけは better-auth 由来の拡張になる

### 確認方法 (Confirmation)

**機械的な検査は用意していない。** 索引名は drizzle スキーマの `uniqueIndex()` /
`index()` の第 1 引数に文字列で書くため、lint で形を検査することはできる余地が
あるものの、現状は規約として守る。索引を足すときにこの ADR を参照すること。

なお**索引名をアプリ側が文字列で持つ場合は追随を忘れないこと**。
`user-repository.ts` の `EMAIL_UNIQUE_INDEX` は DB が返す一意制約違反の名前と
突き合わせており、ここがズレると 409 が 500 に化ける (経緯は ADR-02)。
型検査もテストも通ってしまうため、改名時は grep で確かめる。

## 各選択肢の評価 (Pros and Cons of the Options)

### 接尾辞形式で `_idx` / `_uidx`

- Good, because **Postgres の自動生成と同じ形**。公式ドキュメントが
  `CREATE INDEX ON films ((lower(title)));` に対して `films_lower_idx` を
  例示しており、式インデックスの扱いまで一致する
- Good, because **better-auth の生成規則と一致する**。あちらは
  `` `${tableName}_${fields.join("_")}_${indexKind}` `` で組み立てる
- Good, because Postgres の制約が使う `_pkey` / `_key` / `_fkey` / `_check` と
  同じ「末尾に種別」の形であり、DB 全体で語彙が揃う
- Neutral, because 名前順に並べると索引がテーブル名順に散る。
  ただしテーブルごとにまとまるとも言え、欠点とは限らない
- Bad, because `uidx` だけは Postgres の語彙ではない

### 接頭辞形式で `idx_` / `uq_`

- Good, because 名前順に並べると種別ごとにまとまる
- Good, because SQL Server / MySQL 文化圏では一般的で、その出身者には読みやすい
- Bad, because **Postgres の自動生成と食い違う。** 名前を省略した索引が
  1 つでも混ざった瞬間に規約が崩れ、しかもそれを機械的に防げない
- Bad, because **better-auth が作る索引と食い違う。** 揃えるには向こうの索引を
  すべて明示的に命名し直す必要があり、プラグインを足すたびに追随が要る
- Bad, because Postgres の制約 (`_pkey` / `_key`) だけ接尾辞のまま残るため、
  DB 内で 2 つの流儀が混在する

### 接尾辞形式だが一意は `_unique`

改名前に使っていた `t_user_mail_address_lower_unique` の形。

- Good, because 「一意」であることが省略のない英単語で明示される
- Neutral, because 接尾辞である点は採用案と同じ
- Bad, because **語彙の水準が揃わない。** `_idx` は「索引という種別」を指すが
  `_unique` は「一意という性質」を指しており、並べたときに対称にならない
- Bad, because better-auth の `_uidx` と食い違う。同じ DB に
  `t_user_email_lower_unique` と `account_issuer_accountId_uidx` が並ぶことになる

## 補足情報 (More Information)

### Postgres の自動生成

`CREATE INDEX` で名前を省略したときの挙動は公式ドキュメントに記載がある。

> If the name is omitted, PostgreSQL chooses a suitable name based on the
> parent table's name and the indexed column name(s).

式インデックスの例も載っている。

> `CREATE INDEX ON films ((lower(title)));`
>
> (In this example we have chosen to omit the index name, so the system will
> choose a name, typically `films_lower_idx`.)

**式の場合は関数名が列名の位置に入る**。つまり `lower(email)` に対する索引を
Postgres に任せると `t_user_lower_idx` になる。採用した
`t_user_email_lower_uidx` は列名も残しているため完全一致ではないが、
どの列に対する索引かを名前から読めるほうが有用と判断した。

### 制約側の接尾辞

制約の自動命名は**公式ドキュメントには明記が無い**。「システムが名前を選ぶ」と
書かれているだけで、規則は示されていない。以下は実装挙動として広く知られている
もので、ドキュメント上の保証ではない点に注意する。

| 種別              | 接尾辞   | 例                     |
| ----------------- | -------- | ---------------------- |
| PRIMARY KEY       | `_pkey`  | `t_user_pkey`          |
| UNIQUE 制約       | `_key`   | `t_user_email_key`     |
| FOREIGN KEY       | `_fkey`  | `session_user_id_fkey` |
| CHECK             | `_check` | `t_user_name_check`    |
| EXCLUDE           | `_excl`  | `t_room_period_excl`   |
| 索引 (制約でない) | `_idx`   | `t_user_email_idx`     |

**`_key` と `_idx` の違いが重要**である。UNIQUE 制約 (`_key`) は裏で一意索引を
作るが、制約として `pg_constraint` に載る。一方 `CREATE UNIQUE INDEX` は索引で
しかなく、`pg_constraint` には載らない。関数インデックスは制約にできない
(制約は列にしか張れない) ため、`lower(email)` の一意性は必然的に索引側で担う。

### better-auth の生成規則

`@better-auth/core` が索引名を組み立てる箇所。

```js
const indexKind = index.unique ? "uidx" : "idx";
const generatedName = `${tableName}_${index.fields.join("_")}_${indexKind}`;
```

名前が長すぎる場合はハッシュを挟んで切り詰めるが、種別を末尾に置く形は変わらない。
`index.name` を明示すれば上書きできるものの、`[A-Za-z_][A-Za-z0-9_]*` の形式と
バイト長の検査が入る。

better-auth を配線すると、既定ではこうした名前が並ぶことになる。

```txt
session_userId_idx
account_userId_idx
account_issuer_accountId_uidx
verification_identifier_idx
```

### 命名の対象範囲

この ADR が扱うのは**索引の名前**のみである。テーブル名 (`t_` 接頭辞) や
列名の規約は別途決めたものであり、ここでは変更しない。
