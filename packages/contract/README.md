# @orpc-prac/contract

oRPC の **API 契約**を定義するパッケージ。実装を持たず、入出力の形とエラーだけを宣言する。

## どう使われるか

契約を先に決め、サーバとクライアントがそれぞれ参照する（Contract First）。

```text
packages/contract  ← ここ（契約 = 単一の真実）
      ├──────────────┐
      ↓              ↓
apps/backend    apps/frontend
implement()     createORPCClient()
```

**backend** — `implement()` に渡すと、契約どおりの実装を型で強制される。

```ts
import { contract } from '@orpc-prac/contract'
import { implement } from '@orpc/server'

const os = implement(contract)

export const router = os.router({
  user: {
    get: os.user.get.handler(({ input, errors }) => {
      // input.id は UserId として検証済み
      // 契約に無いエラーは投げられない（型エラーになる）
      throw errors.NOT_FOUND_ERROR({ data: { status: 404, code: '4040', title: '...' } })
    }),
    // 契約の 5 操作をすべて実装しないと型が通らない
  },
})
```

**frontend** — 同じ契約からクライアントの型が導かれる。スキーマは入力検証にも使う。

契約を変えると**両側が同時に型エラーになる**。これが Contract First の目的で、
片側だけ直して気づかない状況を作らない。

## 構成

```text
src/
├── index.ts                    contract のルート（これを import する）
├── contexts/
│   └── user/
│       ├── contract.ts         5 操作の組み立て（route + input + output + errors）
│       ├── create-user-request.ts    リクエスト本文
│       ├── create-user-response.ts   レスポンス本文
│       ├── get-user-response.ts
│       ├── update-user-request.ts
│       ├── change-password-request.ts
│       └── model/              user 固有の値（UserId / UserName / Password）
└── shared/
    ├── constants/              HttpMethod / HttpStatus
    ├── errors/                 1 エラー 1 ファイル
    └── model/                  文脈をまたぐ値（Uuid / MailAddress / RequestId / …）
```

**`contract.ts` は組み立てだけ**を行う。スキーマの中身は各ファイルが持つ。

```ts
export const getUser = oc
  .route({ method: HttpMethod.GET, path: '/users/{id}', successStatus: HttpStatus.OK })
  .input(UserIdParamSchema)          // path パラメータ
  .output(GetUserResponseSchema)     // レスポンス本文
  .errors({ NOT_FOUND_ERROR: ResourceNotFoundError, /* … */ })
```

**エラーは 3 つを 1 ファイルに揃えて持つ。** status・code・message・スキーマが
散らばると、409 なのに message が 400 用、といったズレが起きる。

```ts
// shared/errors/bad-request-error.ts
export const BadRequestErrorSchema = v.object({ status: …, code: v.literal('4000'), … })
export type BadRequestErrorData = v.InferOutput<typeof BadRequestErrorSchema>
export const BadRequestError = { status: …, message: '…', data: BadRequestErrorSchema } as const
```

エラーコードは `<HTTP ステータス><連番>` の 4 桁で、**リテラル型で持つ**。
同じ 401 でも `4010`（認証情報が不正）と `4011`（現在のパスワードが違う）が
型で区別でき、取り違えるとコンパイルエラーになる。

**path パラメータと本文は分けて定義する。** oRPC は既定（`inputStructure: 'compact'`）で
両者を 1 つの input に統合するが、本文スキーマ側に `id` を含めない。
フロントのフォーム型として本文だけを使えるようにするため。

```ts
.input(v.object({ ...UpdateUserRequestSchema.entries, ...UserIdParamSchema.entries }))
```

## 相対 import に `.js` が必要な理由

このパッケージは `module: "nodenext"` でビルドする（`@orpc-prac/tsconfig/node.json`）。
そのため**相対 import には拡張子が必須**で、しかも `.ts` ではなく `.js` と書く。

```ts
import { UuidSchema } from './uuid.js'              // ✅
import { UserIdSchema } from './model/index.js'     // ✅ ディレクトリは index.js を明示
import { UuidSchema } from './uuid'                 // 🚫 TS2835
import { UuidSchema } from './uuid.ts'              // 🚫 TS5097
```

理由は 2 つが噛み合うため。

1. **Node の ESM は拡張子を省略できない**。CommonJS の `require` と違い、
   `./foo` から `./foo.js` を推測しない。ディレクトリの暗黙 `index` も無い
2. **TypeScript は import パスを書き換えない**。書いたパスがそのまま出力される

つまり「**実行時に正しいパス**」を書く必要がある。ソースが `.ts` でも、動くのは
コンパイル後の `.js` だから `.js` と書く。

**この制約はこのパッケージの中だけ**の話。`apps/frontend`（Vite）は
`bundler.json`、`apps/backend`（Bun）は `bun.json` を継承するため、
どちらも拡張子を書く必要はない。

## valibot の書き方

スキーマは **valibot** で書く。zod ではない（理由は
[ADR-03](../../docs/adr/ライブラリ関連/ADR-03-バリデーションライブラリにvalibotを採用.md)）。
契約は frontend にもバンドルされるため、同一スキーマで **62.2 KB → 3.3 KB (gzip)** の差が効く。

**`import * as v from 'valibot'` と書く。** これは好みではなく、そう書くしかない。
valibot に `v` という export は存在せず（`import { v }` は TS2305）、
各関数を個別に export しているだけなので、こちら側で名前空間に名前を付けている。

**メソッドチェーンではなく `v.pipe()` で合成する。**

```ts
export const UserNameSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(100),
  v.description('ユーザー名'),
)

export type UserName = v.InferOutput<typeof UserNameSchema>
```

この冗長さには理由がある。`v.minLength` が**独立した関数**だから、使わないものを
バンドラが落とせる。zod の `.min()` はクラスのメソッドなので、1 つ使うと全部付いてくる。

よく使う対応は以下のとおり。

| したいこと | 書き方 |
| --- | --- |
| 文字数制限 | `v.pipe(v.string(), v.minLength(1), v.maxLength(100))` |
| 正規表現 | `v.pipe(v.string(), v.regex(re, 'メッセージ'))` |
| 説明の付与 | `v.description('...')`（pipe の一部として） |
| ISO 日時 | `v.pipe(v.string(), v.isoTimestamp())` |
| 任意項目 | `v.optional(X)` |
| オブジェクトの合成 | `v.object({ ...A.entries, ...B.entries })` |
| 型の取り出し | `v.InferOutput<typeof X>` |

## 契約を目で確かめる

契約を書き換えたら、**実装を起動せずにこのパッケージだけで** OpenAPI の姿を確認できる。

```zsh
pnpm preview   # http://localhost:4000
```

Swagger UI が立ち上がり、契約から生成した仕様を表示する。`--hot` で動くので、
契約を編集して再読み込みすれば即座に反映される。

型が通ることと、意図した API になっていることは別。**`summary` や `example` の
指定漏れは型検査では見つからない**ので、契約を変えたらここで目視する。

## エントリポイント

| import 元 | 用途 |
| --- | --- |
| `@orpc-prac/contract` | 契約本体。backend / frontend の両方が使う |
| `@orpc-prac/contract/openapi` | 契約から OpenAPI 仕様を生成する。サーバ側専用 |

**分けているのは frontend のバンドルを守るため。** 仕様の生成には
`@orpc/openapi` が要るが、ルートに置くと契約を import しただけで巻き込まれる。

```ts
// backend が仕様を配信するとき
import { generateOpenApiSpec } from '@orpc-prac/contract/openapi'

const spec = await generateOpenApiSpec({ servers: [{ url: '/api' }] })
```

`servers`（デプロイ先）だけは契約の知識ではないため、呼ぶ側が渡す。

## コマンド

`packages/contract` で実行する。

| コマンド | 内容 |
| --- | --- |
| `pnpm build` | `dist` に `.js` と `.d.ts` を出力する |
| `pnpm typecheck` | `src` と `scripts` の両方を型検査する |
| `pnpm preview` | Swagger UI で契約を表示する |
| `pnpm clean` | ビルド成果物を消す |

`exports` が `dist` を指すため、**apps から使う前にビルドが必要**。
