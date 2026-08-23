# oRPC の仕組み

契約 (`packages/contract`) と実装 (`apps/backend`) が**どこで役割を分けているか**を
記録する。とくに「検証は誰がやるのか」「エラーはどこで形になるのか」は、
読んだだけでは分からず実測しないと確信が持てなかった部分なので、
確かめた結果をそのまま残す。

## 契約が担うもの / 実装が担うもの

|                                  | 担当                                    |
| -------------------------------- | --------------------------------------- |
| 入力・出力のスキーマ             | **契約** (`.input()` / `.output()`)     |
| HTTP メソッドとパス              | **契約** (`.route()`)                   |
| エラーの定義（status / message） | **契約** (`.errors()`)                  |
| 入力の検証と 400 の判断          | **oRPC**                                |
| 出力の検証と 500 の判断          | **oRPC**                                |
| エラー応答の形                   | **oRPC の封筒**（契約として受け入れる） |
| 業務ロジックと失敗の種類         | **実装**                                |
| 失敗 → 契約のエラーへの翻訳      | **実装** (`handle-error-response.ts`)   |

**実装が書くのはハンドラの中身だけ。** 入力検証も応答の組み立ても
コードに現れない。契約に書いたことが、そのまま実行時の門番になる。

## リクエストが処理される流れ

```
リクエスト
  ↓
① ミドルウェア      os.use(...)        検証エラーを捕まえる
  ↓
② 入力検証          validateInput      契約の .input() で検証
  ↓ 失敗 → ① へ戻り BAD_REQUEST_ERROR に翻訳される
③ ハンドラ実行      実装が書いた関数
  ↓ 例外 → 500
④ 出力検証          validateOutput     契約の .output() で検証
  ↓ 失敗 → 500
⑤ 応答の組み立て    encodeError        封筒のまま返す
```

**①が②より先にあるのは既定ではない。** `implement(contract, {
initialInputValidationIndex: 1 })` で入力検証の位置を後ろへずらしている
（後述）。

### ② 入力検証 — 400 を決めるのは oRPC

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
  （契約を zod から valibot へ替えたとき構造を変えずに済んだのはこのため）
- **`"BAD_REQUEST"` が固定で書かれている。** 契約にも実装にも選択の余地は無い

**このエラーは契約の `.errors()` を経由しない。** そのため `defined: false` に
なり、放っておくと oRPC の素の封筒が外へ出る。実測ではこうだった。

```json
{"defined":false,"code":"BAD_REQUEST","status":400,"message":"Input validation failed",
 "data":{"issues":[{"kind":"validation","type":"regex","input":"bad",
                    "expected":"/^[0-9a-f]{8}-.../u","received":"\"bad\"",
                    "path":[{"input":{"id":"bad"},"key":"id","value":"bad"}]}]}}
```

3 つまずい。**送信値が丸見え**（`input` / `received` / `path[].value`）、
**検証パターンが漏れる**（`expected`）、**表題が英語**。パスワード変更で
同じことが起きれば平文が応答に載る。

### ③ ハンドラの例外 — 500 になる

素の `Error` を投げると `toORPCError` を通って 500 になる。実測:

```
$ # update ハンドラを throw new Error("意図的な失敗（実験）") に差し替えて
$ curl -X PUT .../users/{id} -d '{"name":"...","mailAddress":"..."}'
HTTP 500
{"defined":false,"code":"INTERNAL_SERVER_ERROR","status":500,"message":"Internal server error"}
```

例外の文言は応答に出ない（oRPC が伏せる）。

### ④ 出力検証 — こちらも 500

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

## エラー応答は封筒をそのまま契約とする

```json
{
  "defined": true,
  "code": "FORBIDDEN_ERROR",
  "status": 403,
  "message": "この操作を行う権限がありません"
}
```

`status` と `message` が封筒に載るため、**契約のエラー定義は
`{ status, message }` だけを持つ**。`data` を持つのは追加情報がある
`BadRequestError`（`errors`）のみ。

**業務コード（4 桁）は持たない。** `code` に契約のキーが出るため、
同じステータスの 2 つ（401 の `UNAUTHORIZED_ERROR` と
`PASSWORD_MISMATCH_ERROR`）は名前で区別できる。

### なぜ封筒を剥がさないのか

以前は `customErrorResponseBodyEncoder` で封筒を外し、
`{status, code, title}` という REST 寄りの形にしていた。やめた理由は
**クライアント側の型判別が死ぬ**から。実測でこうなった。

|                    | 封筒を剥がす                       | 封筒のまま                        |
| ------------------ | ---------------------------------- | --------------------------------- |
| `isDefinedError()` | **false**                          | **true**                          |
| `code`             | `"FORBIDDEN"`（HTTP 由来の汎用値） | `"FORBIDDEN_ERROR"`（契約のキー） |
| `data`             | 生の HTTP 応答が入れ子で入る       | 契約が定めたもの                  |

剥がすと契約の `.errors()` を書いた意味がクライアント側で消える。
引き換えに `defined` が応答に出るが、**型付きエラーと引き換えなら許容する**
という判断（[ADR](./adr/)）。

### OpenAPI 仕様も封筒の形で出す

`openapi.ts` では応答スキーマを上書きしない。仕様と実際の応答が一致し、
`code` が `const` で固定されるため、**クライアントは仕様を見るだけで
どのキーが来るか分かる**。

```json
{ "defined": {"const": true}, "code": {"const": "FORBIDDEN_ERROR"},
  "status": {"const": 403}, "message": {"type":"string","default":"..."} }
```

同じステータスに複数のエラーがある場合は `oneOf` で並び、`code` で判別できる
直和になる。

## 入力検証エラーを契約のエラーへ翻訳する

oRPC が投げる 400 は `defined: false` なので、そのままでは上の利点が得られず、
送信値も漏れる。**ミドルウェアで捕まえて投げ直す。**

```ts
// shared/presentation/os.ts
export const os = implement(contract, { initialInputValidationIndex: 1 })
  .$context<AppContext>()
  .use(async ({ next, errors }) => {
    try {
      return await next();
    } catch (error) {
      const data = toBadRequestData(error);   // issue → フィールド名だけ
      if (data === undefined) throw error;
      throw errors.BAD_REQUEST_ERROR({ data });
    }
  });
```

**`initialInputValidationIndex` が鍵。** 既定は `0` で「全ミドルウェアより前に
検証する」意味なので、検証エラーを捕まえる余地が無い。

```js
// @orpc/server の executeProcedureInternal
const inputValidationIndex = Math.min(Math.max(0, procedure["~orpc"].inputValidationIndex), middlewares.length);
const next = async (index, context, input) => {
  if (index === inputValidationIndex) {
    currentInput = await validateInput(procedure, currentInput);
  }
```

`1` にすると最初のミドルウェアの後ろへ移るため、その手前で `try/catch` できる。
結果はこうなる。

```json
{"defined":true,"code":"BAD_REQUEST_ERROR","status":400,
 "message":"リクエスト内容が不正です","data":{"errors":[{"field":"id"}]}}
```

送信値も検証パターンも消え、文言は契約のものになり、`defined: true` で
クライアントが型判別できる。

**各ハンドラはこれを意識しない。** 共有の `os` に載せてあるため、
ユースケースを増やしても書くのはハンドラの中身だけ。

### 公式は送信値の露出を警告していない

[公式ドキュメント](https://orpc.dev/docs/error-handling)は
「`ORPCError.data` はクライアントに送られるので機密情報を入れるな」と
繰り返し警告している。しかし**警告の対象は「実装が入れるもの」**であり、
oRPC 自身が `data.issues` と `cause` に送信値を入れることには触れていない。

[Validation Errors のページ](https://orpc.dev/docs/advanced/validation-errors)も
`z.prettifyError()` / `z.flattenError()` で整形する例を示すのみで、
**機密の露出に関する記載は無い**（2026-08-23 時点。v2 も同様）。

GitHub issue を検索しても同種の報告は見つからず、むしろ
[#1027](https://github.com/middleapi/orpc/issues/1027) のように
「出力検証の詳細が足りない、入力と同じように出してほしい」という
**逆方向の要望**が上がっている。

つまりここで挟んでいるミドルウェアは、**公式に案内のある手順ではない。**

### ログも塞ぐ

漏洩経路は応答だけではない。APM やログ基盤へ送られる**ログも同じ**なので、
値を書かない形にしてある。

```
level=WARN message=リクエストを受け付けられませんでした
  status=400 code=BAD_REQUEST_ERROR violations=password:min_length(12)
```

**規則の側だけを残す。** `password` が `min_length(12)` で落ちたことは分かるが、
何を送ったかは残らない。issue のうち安全なのは `type` / `requirement` /
`expected` で、`input` と `received` と `message` には値が入る
(`min_length` の `received` は長さだが、`regex` では値そのものになる)。

**ログを出すのはミドルウェア。** 翻訳するとフィールド名しか残らないため、
規則を記録できるのはこの時点だけになる。

| 経路               | 出すもの                                               |
| ------------------ | ------------------------------------------------------ |
| HTTP 応答          | 違反フィールド名だけ                                   |
| ミドルウェアのログ | 違反フィールドと規則                                   |
| `onError` のログ   | 4xx は status/code のみ、**5xx だけ cause とスタック** |

4xx で `cause` を出さないのは、そこに検証ライブラリの生データ
(送信値を含む) が入りうるため。

**`onError` は入力検証の失敗を記録しない。** ミドルウェアが翻訳する時点で
内訳つきで記録済みのものが流れてくるため、両方書くと同じ失敗が 2 行になり、
しかも後から来るほうは内訳を持たない。

```
level=WARN status=403 code=FORBIDDEN_ERROR defined=true
level=WARN status=400 code=BAD_REQUEST_ERROR violations=mailAddress:regex,password:min_length(12)
```

`requirement` を出すのは**数値と文字列のときだけ**。`regex` の requirement は
正規表現そのもので、書き出すと検証パターンが漏れる。これは型情報を使う lint
(`no-base-to-string`) が検出した — 文字列化すると `[object Object]` になる、
という指摘から気付いた。

## 契約が定義していても実装が投げないものがある

| 契約のエラー                                    | 実装が投げるか                                                |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `ForbiddenError` / `ResourceNotFoundError` など | 投げる（ユースケースの失敗）                                  |
| `BadRequestError`                               | **ミドルウェアだけが投げる** — 入力検証の翻訳                 |
| `InternalServerError`                           | **投げない** — oRPC が直接投げるか `RepositoryError` から翻訳 |

移行元（Hono + zod）では `decodeInput` が `BadRequestError` を組み立てていたが、
その仕事は oRPC とミドルウェアが引き取った。**契約と実装のエラー一覧が
1 対 1 にならないのは、移し忘れではなく役割分担の反映。**

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

そのため `err: (e) => { throw errors.FORBIDDEN_ERROR() }` と書くと、
**型付きの 403 が「予期せぬ失敗」扱いになり 500 で返る**（実測）。

`Result` は失敗を戻り値で表す道具なので、その中で例外を投げるのは矛盾
— という思想は筋が通っている。ただし **oRPC は逆にエラーを投げて伝える**ため、
2 つの流儀が交わる場所では `match` を挟まず `isOk()` で分岐する。

```ts
if (result.isOk()) {
  return result.value;
}
throw handleErrorResponse(result.error, errors);
```

`match` が向くのは**両方の枝が値を返す**とき（`handle-error-response.ts` の
`error.match({...})` がそれ）。

### 応答スキーマを上書きすると空になることがある

`customErrorResponseBodySchema` で「各エラーの `data` を集める」実装をしていたが、
エラーが `data` を持たなくなった時点で `"content": {}` になった。
**仕様が「何も返さない」と宣言する**状態で、型検査でも仕様検査でも気付けない。

## 参考

- [oRPC](https://orpc.unnoq.com/)
- [Standard Schema](https://standardschema.dev/) — oRPC が検証ライブラリを問わない仕組み
- `packages/contract/README.md` — 契約の書き方
