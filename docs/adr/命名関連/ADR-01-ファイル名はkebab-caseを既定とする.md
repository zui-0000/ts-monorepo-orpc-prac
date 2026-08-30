---
status: accepted
date: 2026-08-23
scope: all
decision-makers: zui
consulted: Claude
informed:
---

# ファイル名は kebab-case を既定とする

## 背景と課題 (Context and Problem Statement)

このリポジトリは契約 (`packages/contract`)、backend、frontend が同居する
モノレポである。ファイル名の付け方が場所によって変わると、import パスの
見た目が揃わず、どこに何があるかを辿るときに余計な負荷がかかる。

TypeScript には統一された慣習が無い。実際に使われている流儀は 3 つある。

- **PascalCase** — ファイル名を型名と揃える (`UserId.ts`)
- **camelCase** — 変数名と揃える (`userId.ts`)
- **kebab-case** — Node / npm の慣習に合わせる (`user-id.ts`)

さらに React はコンポーネントのファイル名を型名に揃えるのが慣習で
(`App.tsx`)、`create-vite` などの生成物もその形で出てくる。
**エコシステム側の期待と、リポジトリ内の統一が衝突する**点をどう扱うかを
決める必要がある。

## 決定要因 (Decision Drivers)

- macOS と Windows のファイルシステムは**大文字小文字を区別しない**。
  大小が混ざる命名は git と噛み合わず、リネームが失敗する
- 契約のファイルは**1 ファイルが複数の名前を export する**ため、
  「ファイル名 = 型名」が成立しない
- React コンポーネントは 1 ファイル 1 コンポーネントで、型名と一致する
- **人の心がけではなく lint で機械的に担保できる**こと

## 検討した選択肢 (Considered Options)

- すべて kebab-case
- すべて PascalCase
- 型を 1 つだけ export するファイルは PascalCase、それ以外は kebab-case
- kebab-case を既定とし、frontend のコンポーネントだけ PascalCase も許可

## 決定 (Decision Outcome)

**「kebab-case を既定とし、frontend のコンポーネントだけ PascalCase も許可」を採用する。**

既定を 1 つに保ちながら、React の慣習との衝突を frontend の中だけに
閉じ込められるため。契約と backend は例外を持たない。

設定は各パッケージの `.oxlintrc.jsonc` に置く。

```jsonc
// 契約 / backend
"unicorn/filename-case": ["error", { "case": "kebabCase" }],

// frontend
"unicorn/filename-case": [
  "error",
  { "cases": { "kebabCase": true, "pascalCase": true } },
],
```

### 結果 (Consequences)

- Good, because 大小の混在による git の事故が起きない
- Good, because import パスの見た目がリポジトリ全体で揃う
- Good, because lint で機械的に検査されるため、レビューで指摘する必要がない
- Good, because frontend でも `snake_case` は弾かれる。許可したのは 2 つだけ
- Bad, because frontend だけ設定が異なり、ルールが 1 つでなくなる
- Bad, because 「なぜ frontend だけ違うのか」を都度説明する必要がある
  （この ADR がその説明を担う）

### 確認方法 (Confirmation)

`pnpm check:lint` が `unicorn/filename-case` を検査する。pre-commit でも
変更のあったパッケージに対して走るため、規約から外れたファイル名は
コミット前に弾かれる。

## 各選択肢の評価 (Pros and Cons of the Options)

### すべて kebab-case

- Good, because ルールが 1 つで、判断に迷う場面が無い
- Good, because 大小の事故が起きない
- Good, because Node / npm の慣習と揃う（パッケージ名も kebab-case）
- Bad, because React コンポーネントの慣習と衝突する。
  エコシステムの生成物が PascalCase で出てくるたびにリネームが要る

### すべて PascalCase

- Good, because 型名とファイル名が一致し、型から辿りやすい
- Bad, because **契約の構造と噛み合わない。** ほぼ全ファイルが 2〜3 個を
  export しており、ファイル名が対応しきらない

  ```
  user-id.ts           → UserIdSchema, UserId
  bad-request-error.ts → BadRequestErrorSchema, BadRequestErrorData, BadRequestError
  contract.ts          → createUser, getUser, updateUser, deleteUser, userContract
  ```

- Bad, because 定数や関数だけのファイル (`http-status.ts` / `openapi.ts`) に
  PascalCase を当てる理由が無い
- Bad, because 大小が混ざるため git の事故を招く

### 型を 1 つだけ export するファイルは PascalCase、それ以外は kebab-case

- Good, because 理屈としては筋が通る
- Bad, because **lint で機械的に担保できない。** 「1 つだけ export しているか」を
  人が判断することになり、規約が心がけに依存する
- Bad, because export を 1 つ足した瞬間にリネームが必要になる。
  ファイル名が中身の増減に引きずられるのは安定しない

### kebab-case を既定とし、frontend のコンポーネントだけ PascalCase も許可

- Good, because 既定は 1 つのまま、慣習との衝突を frontend に局所化できる
- Good, because 契約と backend は例外を持たないので、共有物の側は揺れない
- Neutral, because frontend の設定だけ 2 ケースを許す
- Bad, because パッケージごとに設定が違うことを知っておく必要がある

## 補足情報 (More Information)

### 実際に踏んだ事故

frontend の `App.tsx` を kebab-case に揃えようとしたとき、`git mv` が失敗した。

```zsh
$ git mv apps/frontend/src/app.tsx apps/frontend/src/App.tsx
fatal: not under version control, source=apps/frontend/src/app.tsx
```

macOS のファイルシステムが大小を区別しないため、`App.tsx` と `app.tsx` が
同一ファイルとして扱われ、git の追跡状態と実ファイルが食い違った。
**全部小文字で統一していれば起きない問題**であり、これが kebab-case を
既定に据えた直接の動機になっている。

### frontend で許可されるのは 2 ケースだけ

`cases` に 2 つ指定しても、規約が失われるわけではない。`snake_case` を
置いて確かめた結果、正しく弾かれた。

```txt
src/bad_name.tsx:1:1: error unicorn(filename-case):
  Filename should be in kebab-case, or PascalCase
  help: Rename the file to 'bad-name.tsx', or 'BadName.tsx'
```

現在の `apps/frontend/src` は、コンポーネントだけが PascalCase になっている。

```txt
App.tsx          ← コンポーネント
api-client.ts
main.tsx
user-form.tsx
```

`user-form.tsx` もコンポーネントだが kebab-case のままである。
**PascalCase は「許可」であって「強制」ではない**ため、どちらでも通る。

### ディレクトリ名

ディレクトリも kebab-case とする (`shared/errors/`, `contexts/user/model/`)。
`packages/typescript-config` のようにパッケージ名と揃える場合も同様。
