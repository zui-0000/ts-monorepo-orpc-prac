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
      throw errors.RESOURCE_NOT_FOUND_ERROR()
    }),
    // 契約が持つ操作をすべて実装しないと型が通らない
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
│       ├── contract.ts         操作の組み立て（route + input + output + errors）
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
  .route({
    method: HttpMethod.GET,
    path: '/users/{id}',
    successStatus: HttpStatus.OK,
    operationId: 'getUser',        // クライアント生成時の関数名になる
    tags: ['Users'],               // Swagger 上のグループ
    summary: 'IDを指定してユーザーを取得する',
    description: '要認証。本人のリソースだけを取得できる。',
  })
  .input(UserIdParamSchema)        // path パラメータ
  .output(GetUserResponseSchema)   // レスポンス本文
  .errors({ NOT_FOUND_ERROR: ResourceNotFoundError, /* … */ })
```

**`summary` などは `.route()` に書く。** JSDoc は TypeScript のコメントに過ぎず、
OpenAPI には届かない。仕様に出したい説明はここに書く。

**エラーは `status` と `message` だけを持つ。**

```ts
// shared/errors/resource-not-found-error.ts
export const ResourceNotFoundError = {
  status: HttpStatus.NOT_FOUND,
  message: '指定されたリソースは存在しません',
} as const
```

投げるときも引数が要らない。

```ts
throw errors.RESOURCE_NOT_FOUND_ERROR()
```

`data` を持つのは**追加情報があるエラーだけ**で、いまは `BadRequestError` の
`errors`（どの項目が不正か）のみ。

### エラー応答の形

oRPC はエラーを封筒に包んで返す。**その封筒をそのまま契約とする。**

```json
{
  "defined": true,
  "code": "FORBIDDEN_ERROR",
  "status": 403,
  "message": "この操作を行う権限がありません"
}
```

`status` と `message` が封筒に載るため、**本文で二重に持たない**。だから
エラー定義が上のように痩せている。

**業務コード（4 桁）は持たない。** `code` に契約のキーがそのまま出るためで、
同じステータスの 2 つ（401 の `UNAUTHORIZED_ERROR` と `PASSWORD_MISMATCH_ERROR`）は
名前で区別できる。数字の体系を別に維持する理由が無い。

クライアントは型付きのまま分岐できる。

```ts
catch (error) {
  if (isDefinedError(error) && error.code === 'FORBIDDEN_ERROR') {
    // error.data も型が絞られる
  }
}
```

**封筒を外すと、この判別が働かなくなる。** 実測では `isDefinedError()` が
`false` を返し、`code` も `"FORBIDDEN"`（HTTP 由来の汎用値）に化けた。
`.errors()` を書いた意味がクライアント側で消えるため、封筒ごと受け入れている。

引き換えに `defined` が応答に出る。oRPC を使っているという実装の事実が
API の表面に現れるが、**型付きエラーと引き換えなら許容する**という判断
（[ADR](../../docs/adr/)）。

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

| したいこと         | 書き方                                                 |
| ------------------ | ------------------------------------------------------ |
| 文字数制限         | `v.pipe(v.string(), v.minLength(1), v.maxLength(100))` |
| 正規表現           | `v.pipe(v.string(), v.regex(re, 'メッセージ'))`        |
| 説明の付与         | `v.description('...')`（pipe の一部として）            |
| 例の付与           | `v.examples(['user@example.com'])`                     |
| ISO 日時           | `v.pipe(v.string(), v.isoTimestamp())`                 |
| 任意項目           | `v.optional(X)`                                        |
| オブジェクトの合成 | `v.object({ ...A.entries, ...B.entries })`             |
| 型の取り出し       | `v.InferOutput<typeof X>`                              |

## 契約を目で確かめる

契約を書き換えたら、**実装を起動せずにこのパッケージだけで** OpenAPI の姿を確認できる。

```zsh
pnpm build     # 契約から dist-openapi/openapi.json を書き出す
pnpm preview   # http://localhost:4000
```

Swagger UI が立ち上がり、`dist-openapi/openapi.json` を表示する。契約を書き換えたら
`pnpm build` で仕様を焼き直し、ブラウザを再読み込みする。

画面は **swagger-ui の公式イメージ**を docker で動かしている（`docker-compose.yaml`）。
パッケージとして入れると配布物が数 MB あり、画面を見るためだけに `node_modules` が
重くなるため、仕様のファイルだけを渡す形にしている。

型が通ることと、意図した API になっていることは別。**`summary` や `example` の
指定漏れは型検査では見つからない**ので、契約を変えたらここで目視する。

## エントリポイント

| import 元                     | 用途                                          |
| ----------------------------- | --------------------------------------------- |
| `@orpc-prac/contract`         | 契約本体。backend / frontend の両方が使う     |
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

| コマンド               | 内容                                                  |
| ---------------------- | ----------------------------------------------------- |
| `pnpm build`           | lint 修正 → 整形 → 型検査 → 成果物の作成              |
| `pnpm build:artifacts` | `dist` と仕様を作り直す（ソースは書き換えない）       |
| `pnpm lint:fix`        | lint の自動修正 → 整形 → 型検査                       |
| `pnpm check:type`      | 成果物を作らずに `src` の型だけを検査する             |
| `pnpm check:lint`      | oxlint をかける（設定は `.oxlintrc.jsonc`）           |
| `pnpm format:check`    | 整形のズレを報告する（書き換えない）                  |
| `pnpm format:fix`      | 整形する（設定はリポジトリルートの `.oxfmtrc.jsonc`） |
| `pnpm build:openapi`   | `dist` から `dist-openapi/openapi.json` を書き出す    |
| `pnpm preview`         | docker で Swagger UI を起動する                       |

`exports` が `dist` を指すため、**apps から使う前にビルドが必要**。
