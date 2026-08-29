---
status: accepted
date: 2026-08-29
decision-makers: zui
consulted: Claude
informed:
---

# DB スキーマの定義は共有基盤に集約する

## 背景と課題 (Context and Problem Statement)

当初は **「テーブル定義は所有するコンテキストの infrastructure に置く」** としていた
(`drizzle.config.ts` のコメント)。集約と所有者を揃えるという考え方である。

テーブルが 1 本のうちは問題にならなかった。しかし better-auth の 4 テーブルと
`t_user_profile` が加わり、**所有者が「better-auth」と「ドメイン」に分かれた**
(設計関連/ADR-09) 時点で、2 つの問題が同時に出た。

### ① DB 全体の形が 1 箇所で読めない

テーブル定義がコンテキストごとに散るため、**「この DB に何があるか」を知るのに
複数のファイルを開く**ことになる。テーブルが増えるほど悪化する。

`pnpm db:studio` や `psql` や `db/migrations/` を見れば全体は分かるが、
**ソースとして読める 1 箇所が無い。**

### ② コンテキストを分割できない

`contexts/auth` (認証) と `contexts/user` (利用者の CRUD) に割ろうとすると、
`cross-context-public-only` が 2 箇所で止める。

```txt
profile-drizzle-schema.ts   import { tUser }   ← 外部キーの .references() に必要
get-user-query-service.ts   import { tUser }   ← name / email を JOIN で読むのに必要
```

このルールが許すのは相手コンテキストの `public/` と
`domain/model/value-objects/` だけである。**スキーマ定義がコンテキストの中にある限り、
分割すると外部キーと JOIN が書けなくなる。**

回避策は「外部キーを手書きの migration で張る」だが、それは
**drizzle スキーマと実 DB がズレる余地**を残す。

## 決定要因 (Decision Drivers)

- **DB 全体の形が 1 箇所で読めること**
- **コンテキストの分割を妨げないこと**
- 「誰が書いてよいか」の境界が保たれること
- 外部キーと JOIN が drizzle の型の上で書けること

## 検討した選択肢 (Considered Options)

- 共有基盤に集約する
- 所有するコンテキストに置く (現状維持)
- 所有するコンテキストに置き、外部キーは手書きの migration で張る
- better-auth のテーブルだけ共有基盤へ移す

## 決定 (Decision Outcome)

**「DB スキーマの定義は `shared/infrastructure/db/schema/` に集約する」を採用する。**

```txt
src/shared/infrastructure/db/schema/
  auth.ts          t_user / t_session / t_account / t_verification
  user-profile.ts  t_user_profile
  index.ts         全テーブルの再エクスポート
```

**`index.ts` を開けば DB に何があるかが一望できる。** テーブルが増えても
ファイルが 1 つ増えるだけで、読む場所は変わらない。

### 置き場所と書き込み権限は別の軸である

これが決定の中心である。

```txt
スキーマの置き場所    物理的な定義をどこに書くか
書き込み権限の境界    誰がその行を書いてよいか
```

**この 2 つは別の軸であり、揃える必要がない。** 後者は次の 3 つが守る。

| 手段                                 | 何を表すか                           |
| ------------------------------------ | ------------------------------------ |
| DB の名前空間 (`auth` / `public`)    | 触ってよい範囲 (設計関連/ADR-09)     |
| コンテキストの公開ポート (`public/`) | 書き込みを通す唯一の窓口             |
| コードのルール                       | 自前のコマンドは `t_user` を書かない |

**ファイルの置き場所は、この境界を守る手段ではない。** 同じディレクトリに定義が
並んでいても、書いてよいかどうかは上の 3 つが決める。

### drizzle のスキーマはドメインモデルではない

DDD の「集約が永続化を所有する」は、**リポジトリと集約**の話である。
DDL のリテラルがどのファイルにあるかの話ではない。

集約 (`domain/model/`)、ポート (`domain/*-repository.ts`)、実装
(`infrastructure/*-repository.ts`) は**引き続きコンテキストの中に置く。**
移すのは物理的なテーブル定義だけである。

### 依存の向き

`shared` は `contexts` を参照しない (`shared-not-to-contexts`)。スキーマ定義は
何もインポートしないため、この向きは崩れない。逆に `contexts` から `shared` を
参照するのは許可されているため、**どのコンテキストからも外部キーと JOIN が書ける。**

### 結果 (Consequences)

- Good, because **DB 全体の形が `index.ts` 1 箇所で読める**
- Good, because **コンテキストの分割が妨げられなくなる。** `contexts/auth` と
  `contexts/user` に割っても外部キーと JOIN が書ける
- Good, because 外部キーが drizzle の管理下に残る。手書きの migration に落とさずに済む
- Good, because 読み取りの JOIN が 1 クエリで書ける
- Good, because テーブルどうしの関係 (外部キー) が同じ場所で読める
- Bad, because **「テーブル定義は所有するコンテキストに置く」という当初の方針を覆す。**
  コンテキストを見ても、そこが持つテーブルが一目では分からなくなる
- Bad, because **書き込み権限の境界が「置き場所」から読めなくなる。**
  ルールと ADR に依存する度合いが上がる
- Neutral, because `drizzle.config.ts` の glob は 1 箇所を指すだけになり、単純になる

### 確認方法 (Confirmation)

**機械的な検査は用意していない。** 次の 2 点を守ること。

1. **新しいテーブルは `shared/infrastructure/db/schema/` に置き、`index.ts` から
   再エクスポートする**
2. **書き込みは所有者のコンテキスト経由で行う。** スキーマが共有されていることは
   「誰でも書いてよい」を意味しない

全体像を見る手段は複数ある。用途で使い分ける。

```zsh
$ pnpm db:studio                    # ブラウザで全テーブルを見る
$ psql -c '\dt auth.*'              # 名前空間ごとの一覧
$ cat db/migrations/*.sql           # DDL の全量
```

## 各選択肢の評価 (Pros and Cons of the Options)

### 共有基盤に集約する (採用)

- Good, because DB 全体の形が 1 箇所で読める
- Good, because コンテキストの分割を妨げない
- Good, because 外部キーと JOIN が drizzle の型の上で書ける
- Bad, because 当初の方針 (所有者と揃える) を覆す
- Bad, because コンテキストから「自分が持つテーブル」が一目で分からなくなる

### 所有するコンテキストに置く (現状維持)

- Good, because 集約とテーブルの所有者が揃う。**コンテキストを見れば持ち物が分かる**
- Good, because 変更が要らない
- Bad, because **DB 全体の形が読めない。** テーブルが増えるほど悪化する
- Bad, because **コンテキストの分割ができない。** 外部キーと JOIN が
  `cross-context-public-only` に止められる

### 所有するコンテキストに置き、外部キーは手書きの migration で張る

- Good, because 所有者と揃えたままコンテキストを分割できる
- Bad, because **外部キーが drizzle の管理から外れる。** スキーマには現れず、
  `db:generate` の差分にも乗らないため、**定義と実 DB がズレる余地が残る**
- Bad, because 読み取りの JOIN が書けず、2 クエリに分かれる

### better-auth のテーブルだけ共有基盤へ移す

- Good, because 「外部システムの資産だから共有基盤」という説明が付く
- Good, because 分割の障害は取り除ける
- Bad, because **一貫しない。** 自前のテーブルは点在したままなので、
  「DB 全体が読めない」は解決しない
- Bad, because 「どちらに置くか」の判断が毎回必要になる

## 補足情報 (More Information)

### 何が動いて、何が動かないか

|                                                     | 置き場所                                      |
| --------------------------------------------------- | --------------------------------------------- |
| **テーブル定義 (drizzle スキーマ)**                 | **`shared/infrastructure/db/schema/`** ← 移す |
| 集約 (`domain/model/`)                              | コンテキスト                                  |
| リポジトリのポート (`domain/*-repository.ts`)       | コンテキスト                                  |
| リポジトリの実装 (`infrastructure/*-repository.ts`) | コンテキスト                                  |
| クエリサービス                                      | コンテキスト                                  |

**移すのは物理的な定義だけ。** ドメインの構造は変わらない。

### この決定が可能にすること

本 ADR は `contexts/auth` と `contexts/user` の分割を**決めるものではない**が、
**その障害を取り除く**。分割そのものは ADR-11 で決めた。

### この判断が変わりうる場面

- **テーブル数が増えて `index.ts` が実質的な目次にならなくなったとき。**
  その場合は名前空間や業務領域ごとにディレクトリを切る
- **コンテキストが独立したサービスに分かれるとき。** DB を共有しなくなるため、
  スキーマを共有する前提そのものが消える
