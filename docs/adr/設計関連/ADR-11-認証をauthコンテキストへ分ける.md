---
status: accepted
date: 2026-08-30
decision-makers: zui
consulted: Claude
informed:
---

# 認証を auth コンテキストへ分ける

## 背景と課題 (Context and Problem Statement)

better-auth を導入するにあたり、当初は **「`contexts/user` を Identity & Access
コンテキストとして定義し直す」**と決め、認証も利用者の取得・更新も同じコンテキストに
置いた。認証を別コンテキストへ割ると、**外部キーと JOIN が
`cross-context-public-only` に止められる**ためである。

その後、責務が構造から読めないことが問題になった。`contexts/user` の中に、
better-auth のインスタンス・漏洩パスワードの検査・署名鍵の読み取りと、
プロフィールの取得・更新が同居している。**名前は「利用者」だが、中身の半分は「認証」**
という状態だった。

### 分割を止めていたものが消えた

設計関連/ADR-10 でスキーマ定義を共有基盤へ移した結果、止めていた 2 箇所が消えた。

```txt
以前  profile のスキーマ → tUser を import (外部キーの .references() に必要)
      クエリサービス     → tUser を import (JOIN に必要)
      → auth と user に割ると、どちらも cross-context-public-only に止められる

現在  どちらも shared/infrastructure/db/schema を参照するだけ
      → コンテキスト間の import が 1 本も無い
```

ADR-10 は「分割を決めるものではないが、その障害を取り除く」と書いた。**本 ADR が
その先を決める。**

## 決定要因 (Decision Drivers)

- **責務が構造から読めること**
- **コンテキスト間の import を作らないこと**
- 認証の実装を差し替えるとき、触る範囲が閉じていること
- 層を形式のために空で作らないこと

## 検討した選択肢 (Considered Options)

- `contexts/auth` と `contexts/user` に分ける
- 1 コンテキストのまま (現状維持)
- 分けたうえで、`contexts/auth` に公開ポートを置いて `contexts/user` から呼ばせる

## 決定 (Decision Outcome)

**「`contexts/auth` と `contexts/user` に分ける」を採用する。**

```txt
contexts/auth/infrastructure/   auth.ts / assert-password-not-compromised.ts / auth-env.ts
contexts/user/                  domain / application / infrastructure / presentation
shared/infrastructure/db/schema/ 両者が参照する定義 (設計関連/ADR-10)
```

### auth コンテキストは infrastructure 層しか持たない

**認証は支援サブドメインであり、第三者の実装がそのまま責務を満たす。** 自前の
ドメインモデルが無いため、`domain/` も `application/` も作らない。
**層は形式のために置かない。**

### コンテキスト間の import は作らない

`contexts/user` が認証のテーブルを読むのは、**共有基盤のスキーマ定義を経由する**
形に限る。読み取りが他所のテーブルを引くのは射影として認めた形で (設計関連/ADR-09,
ADR-10)、書き込みの境界は名前空間とルールが守る。

公開ポート (`contexts/auth/public/`) は**今は置かない。** `contexts/user` から
認証を呼ぶ必要がまだ無いためである。メールアドレスの変更や表示名の変更を自前の
ユースケースから行うことになった時点で用意する。

### HTTP のマウントは合成ルートに残す

`/api/auth/*` の登録は `app.ts` の 1 行のまま。**何をどこに載せるかは合成ルートの
判断**であり、oRPC ではなく Hono のハンドラなので `user-routes.ts` とは形が違う。

### 結果 (Consequences)

- Good, because **責務が構造から読める。** ディレクトリ名がそのまま担当を表す
- Good, because **認証を差し替えるとき触る範囲が閉じる。** `contexts/auth` と
  共有スキーマの `auth.ts` だけを見ればよい
- Good, because **コンテキスト間の import がゼロ。** 依存の検査で 0 件を確認した
- Good, because `contexts/user` が本来のドメイン (プロフィール) だけになった
- Bad, because **auth コンテキストの形が他と揃わない。** 層が 1 つしか無く、
  「コンテキストとはこういう構造」という期待から外れる
- Bad, because **「認証」と「利用者」が別の言葉に見える。** ユビキタス言語としては
  ひと続きで、`contexts/user` の読み取りは認証側のテーブルを引いている
- Neutral, because DB の名前空間 (`auth` / `public`) とコンテキストが結果的に
  対応しているが、**揃える必要があったわけではない** (ADR-10 のとおり別の軸)

### 確認方法 (Confirmation)

```zsh
$ pnpm check:deps
✔ no dependency violations found (68 modules, 151 dependencies cruised)
```

**コンテキスト間の import が無いことは `cross-context-public-only` が見張る。**
`contexts/user` から `contexts/auth/infrastructure/` を参照した時点で落ちる。

## 各選択肢の評価 (Pros and Cons of the Options)

### `contexts/auth` と `contexts/user` に分ける (採用)

- Good, because 責務が構造から読め、認証の差し替え範囲が閉じる
- Good, because コンテキスト間の import が無く、依存の検査で担保できる
- Bad, because auth コンテキストの層が 1 つしか無い
- Bad, because ユビキタス言語としては 1 つのものを 2 つに割っている

### 1 コンテキストのまま (現状維持)

- Good, because ユビキタス言語と一致する。「利用者」で 1 つ
- Good, because [Account Boundary Context](https://github.com/PeppyDays/things/wiki/Account-Boundary-Context)
  が User 集約と Identity 集約を 1 コンテキストに置いた前例と同じ
- Good, because 変更が要らない
- Bad, because **責務が構造から読めない。** 名前は「利用者」だが中身の半分は認証
- Bad, because 認証を差し替えるとき、どこを触るかがファイル名頼りになる

### 分けたうえで公開ポートを置く

- Good, because `contexts/user` が認証を呼べるようになる (メール変更など)
- Bad, because **呼ぶ必要がまだ無い。** 使われないポートを先に用意することになる
- Neutral, because 必要になった時点で足せる。今決めなくてよい

## 補足情報 (More Information)

### 初日に「分割しない」と判断した経緯

better-auth の導入時、外部キーと JOIN が止められることを理由に 1 コンテキストへ
まとめた。**その判断は当時の制約の下では正しかった。** 回避策は「外部キーを手書きの
migration で張る」しかなく、drizzle スキーマと実 DB がズレる余地を残すためである。

ADR-10 がスキーマの置き場所を変えて制約を外したので、結論が変わった。
**前提が動いたときに結論を見直した記録**として残す。

### なぜ auth に domain を作らないか

**空の層は嘘をつく。** `domain/` があれば「ここに業務ルールがある」と読まれるが、
認証の規則 (パスワードの長さ、漏洩の検査、セッションの寿命) は better-auth の設定と
その周辺にあり、集約として表現されていない。

多要素認証の要否をこちらで決める、といった**自前の判断が生まれた時点で** `domain/` を
作る。それまでは infrastructure だけで正直である。

### この判断が変わりうる場面

- **auth コンテキストに自前のドメインが生まれたとき。** 層が増えて形が揃う
- **`contexts/user` から認証を呼ぶ必要が出たとき。** `contexts/auth/public/` に
  ポートを用意する (メールアドレスの変更、表示名の変更)
- **better-auth を外すとき。** `contexts/auth` と共有スキーマの `auth.ts` を
  置き換えることになるが、`contexts/user` は無傷で済む。**分離の最大の見返り**である
