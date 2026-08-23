# oRPC の仕組み

契約 (`packages/contract`) と実装 (`apps/backend`) が**どこで役割を分けているか**を
記録する。とくに「検証は誰がやるのか」「エラーはどこで形になるのか」は、
読んだだけでは分からず実測しないと確信が持てなかった部分なので、
確かめた結果をそのまま残す。

## 契約が担うもの / 実装が担うもの

|                             | 担当                                  |
| --------------------------- | ------------------------------------- |
| 入力・出力のスキーマ        | **契約** (`.input()` / `.output()`)   |
| HTTP メソッドとパス         | **契約** (`.route()`)                 |
| 型付きエラーの定義          | **契約** (`.errors()`)                |
| 入力の検証と 400 の判断     | **oRPC**                              |
| 出力の検証と 500 の判断     | **oRPC**                              |
| エラー本文の形              | **契約** (`server/error-encoder.ts`)  |
| 業務ロジックと失敗の種類    | **実装**                              |
| 失敗 → 契約のエラーへの翻訳 | **実装** (`handle-error-response.ts`) |

**実装が書くのはハンドラの中身だけ。** 入力検証も応答の組み立ても
コードに現れない。契約に書いたことが、そのまま実行時の門番になる。

## リクエストが処理される流れ

```
リクエスト
  ↓
① 入力検証          validateInput      契約の .input() で検証
  ↓ 失敗 → 400
② ハンドラ実行       実装が書いた関数
  ↓ 例外 → 500
③ 出力検証          validateOutput     契約の .output() で検証
  ↓ 失敗 → 500
④ 応答の組み立て     encodeError        本文だけ差し替え可能
```

### ① 入力検証 — 400 を決めるのは oRPC

`@orpc/server` の `validateInput` がこう書かれている。

```js
async function validateInput(procedure, input) {
  const schema = procedure["~orpc"].inputSchema;   // 契約の .input() が入る
  if (!schema) return input;

  const result = await schema["~standard"].validate(input);
  if (result.issues) {
    throw new ORPCError("BAD_REQUEST", {           // ← 400 はここで固定
      message: "Input validation failed",
      data: { issues: result.issues },
      cause: new ValidationError({ ..., data: input }),
    });
  }
  return result.value;
}
```

読み取れることが 3 つある。

- **契約が検証器そのもの。** `inputSchema` は `.input(UserIdParamSchema)` に
  書いたものがそのまま入る。実装は何も渡していない
- **`schema["~standard"].validate()` を呼んでいる。** これが
  [Standard Schema](https://standardschema.dev/) で、oRPC は valibot を知らない。
  共通の口だけを叩くため、zod でも arktype でも同じコードが動く
  (契約を zod から valibot へ替えたとき構造を変えずに済んだのはこのため)
- **`"BAD_REQUEST"` が固定で書かれている。** 契約にも実装にも選択の余地は無い

**`data` と `cause` に送信値が入る**点に注意する。`issues` の `input` はもちろん、
`cause` には `data: input` で入力そのものが入る。ここを素通しすると
パスワードのような値が応答に載る。

### ② ハンドラの例外 — 500 になる

素の `Error` を投げると `toORPCError` を通って 500 になる。実測:

```
$ # update ハンドラを throw new Error("意図的な失敗（実験）") に差し替えて
$ curl -X PUT .../users/{id} -d '{"name":"...","mailAddress":"..."}'
HTTP 500
{"status":500,"code":"5000","title":"サーバーで予期せぬエラーが発生しました"}
```

**例外の文言は応答に出ない。** 出さないのは実装側の設定
(`TITLE_BY_STATUS` で契約の文言に差し替えている) で、外すと
`"意図的な失敗（実験）"` がそのままクライアントへ届く。

### ③ 出力検証 — こちらも 500

```js
async function validateOutput(procedure, output) {
  const result = await schema["~standard"].validate(output);
  if (result.issues) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Output validation failed",
      ...
    });
  }
}
```

**入力が契約と違えば 400、出力が契約と違えば 500。**
呼び出し側の落ち度か、実装の落ち度か、で分かれている。

### ④ 応答の組み立て — 本文だけ差し替えられる

`@orpc/openapi` の `StandardOpenAPICodec`:

```js
encodeError(error) {
  const body = this.customErrorResponseBodyEncoder?.(error) ?? error.toJSON();
  return {
    status: error.status,      // ← encoder は status に触れない
    body: this.serializer.serialize(body, ...),
  };
}
```

**差し替えられるのは本文だけ。** 「400 ではなく 422 を返す」ようなことは、
契約側でも実装側でもできない。

encoder を外すと oRPC の素の形が出る (実測):

```json
{"defined":false,"code":"BAD_REQUEST","status":400,"message":"Input validation failed",
 "data":{"issues":[{"kind":"validation","type":"regex","input":"bad", ...}]}}
```

`defined` や `data.issues` は **oRPC クライアント向けの封筒**であって
この API の契約ではない。`input` に送信値が入っている点も見えている。

## エラー応答が組み立てられる場所

```
packages/contract/src/server/
├── error-encoder.ts             封筒を剥がして振り分ける
└── encode-bad-request-error.ts  400 の本文を組む（フィールド名だけ残す）

apps/backend/src/shared/presentation/
├── handle-error-response.ts     Result のエラー → 契約のエラー
└── constants/error-payload.ts   翻訳に使う payload
```

実装が書くのはこの 1 行だけ。

```ts
new OpenAPIHandler(router, {
  customErrorResponseBodyEncoder: encodeErrorResponseBody,   // 契約から import
});
```

**契約側に置いたのは、形を決めるのが契約の仕事だから。** 実装側で組み立てると
契約を直しても応答が古いまま、という食い違いが型検査を素通りする
(実際、表題が oRPC の既定 `"Input validation failed"` のまま返っていた時期がある)。

## 型付きエラー (`.errors()`)

契約に書いたエラーは、実装から**キーで投げる**。

```ts
throw errors.FORBIDDEN_ERROR({ data: { status: 403, code: "4030", title: "..." } });
```

こうして投げたものは `error.defined === true` になり、`data` がそのまま応答本文になる。
一方 oRPC が自分で投げるもの (入力検証の 400、出力検証の 500) は `defined === false`
で、封筒を剥がす処理が要る。**encoder が最初に `defined` で分岐するのはこのため。**

### エラーキーは OpenAPI 仕様に出ない

`FORBIDDEN_ERROR` のようなキーは**クライアント側で `isDefinedError()` の判別に使う
内部識別子**で、HTTP には出ない。実測でも生成した仕様に出現回数 0 だった。
仕様に載るのは `status` / `code` / `title` だけなので、キーの改名は
外から見た振る舞いを変えない。

### 契約が定義していても実装が投げないものがある

| 契約のエラー                                    | 実装が投げるか                                                |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `ForbiddenError` / `ResourceNotFoundError` など | 投げる（ユースケースの失敗）                                  |
| `BadRequestError`                               | **投げない** — 入力検証で oRPC が直接投げる                   |
| `InternalServerError`                           | **投げない** — oRPC が直接投げるか `RepositoryError` から翻訳 |

移行元 (Hono + zod) では `decodeInput` が `BadRequestError` を組み立てていたが、
その仕事は oRPC が引き取った。**契約と実装のエラー一覧が 1 対 1 にならないのは、
移し忘れではなく役割分担の反映。**

## 落とし穴

### `Result.match` の中で throw しない

`better-result` の `match` はハンドラを try/catch で包み、投げた例外を
`Panic` に差し替えて再送出する。

```js
match(handlers) {
  return a(() => handlers.ok(this.value), `match ok handler threw`)
  //     ↑ try { ... } catch (e) { throw new Panic(msg, e) }
}
```

そのため `err: (e) => { throw errors.FORBIDDEN_ERROR(...) }` と書くと、
**型付きの 403 が「予期せぬ失敗」扱いになり 500 で返る** (実測)。

`Result` は失敗を戻り値で表す道具なので、その中で例外を投げるのは矛盾
— という思想は筋が通っている。ただし **oRPC は逆にエラーを投げて伝える**ため、
2 つの流儀が交わる場所では `match` を挟まず `isOk()` で分岐する。

```ts
if (result.isOk()) {
  return result.value;
}
throw handleErrorResponse(result.error, errors);
```

`match` が向くのは**両方の枝が値を返す**とき (`handle-error-response.ts` の
`error.match({...})` がそれ)。

### `v.examples()` は検査されない

契約が `v.examples([{ status: 400, ..., title: "リクエスト内容が不正です" }])` と
例示していても、**それは検査されない**。`title` の型は
`ErrorTitleSchema`（ただの string）なので、英語の
`"Input validation failed"` でもスキーマ検証は通ってしまう。

型検査でも `pnpm build` の仕様検査でも検出できない類の食い違いなので、
**応答の文言は契約から引く** (`BadRequestError.message`)。

## 参考

- [oRPC](https://orpc.unnoq.com/)
- [Standard Schema](https://standardschema.dev/) — oRPC が検証ライブラリを問わない仕組み
- `packages/contract/README.md` — 契約の書き方
