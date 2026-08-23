---
status: accepted
date: 2026-08-24
decision-makers: zui
consulted: Claude
informed:
---

# oRPC に触れる面を routes に閉じ、controller を挟む

**`ADR-03` を覆す。**

## 背景と課題 (Context and Problem Statement)

`ADR-03` では controller を置かず、oRPC の `.handler()` をプレゼンテーション層の
実体とした。操作ごとに `create-user-handler.ts` / `get-user-handler.ts` を作り、
`user-router.ts` はそれを並べるだけの一覧だった。

実装が 2 本並んだところで違和感が出た。**handler は oRPC の語彙に浸かっている。**

```ts
// create-user-handler.ts — oRPC を import して .handler() を返す
export const createUserHandler = (deps: CreateUserCommandDeps) => {
  const command = createUserCommand(deps);
  return os.user.create.handler(async ({ input, errors }) => { ... });
};
```

操作を増やすほど、`os` / `input` / `errors` / `context` を知るファイルが増える。
プレゼンテーション層の中に**言語の違う 2 種類の仕事が混ざったまま 1 つの器に
入っていた**というのが問題の言い換えである。

## 決定要因 (Decision Drivers)

- oRPC の語彙が現れる場所を数えられること
- 契約の操作一覧と、失敗の翻訳が一望できること
- ユースケースの入力を組み立てる仕事が、配信手段から独立していること
- 移行元 (Hono) と語彙を揃えること

## 検討した選択肢 (Considered Options)

- `ADR-03` のまま、handler を操作ごとのファイルに置く
- handler は routes に直接書き、その内側に controller を挟む
- handler のファイルを残したうえで controller も置く (3 段)

## 決定 (Decision Outcome)

**「handler は routes に直接書き、その内側に controller を挟む」を採用する。**

決め手は、**handler と controller が同じ層の中で違う言語を話している**こと。

|        | handler                              | controller                      |
| ------ | ------------------------------------ | ------------------------------- |
| 語彙   | oRPC (`os` / `input` / `errors`)     | 箱 (`auth` / `body` / `params`) |
| 仕事   | 契約の操作に結ぶ、失敗を HTTP へ訳す | ユースケースの入力を組み立てる  |
| import | `@orpc/server` 由来                  | `better-result` と契約の型だけ  |

handler は **oRPC との接点そのもの**であって、それ自体をファイルにする意味が薄い。
契約の操作一覧 (routes) と同じ場所にある方が、どの操作にどの実装が結ばれ、
失敗がどう訳されるかを 1 画面で読める。

```ts
// user-routes.ts — oRPC に触れるのはここだけ
get: os.user.get.handler(async ({ input, errors, context }) => {
  const result = await getUser({ auth: context.caller, params: { id: input.id } });
  if (result.isOk()) return result.value;
  throw handleErrorResponse(result.error, errors);
}),
```

```ts
// controllers/get-user-controller.ts — oRPC を知らない
export const getUserController = (deps: GetUserQueryDeps) => {
  const query = getUserQuery(deps);
  return ({ auth, params }: GetUserControllerInput) =>
    Result.gen(async function* () {
      const input: GetUserQueryInput = { id: params.id, actor: auth.userId };
      const output = yield* Result.await(query(input));
      return Result.ok(output);
    });
};
```

controller が受け取るのは**後続で使う値の箱だけ** (`auth` / `body` / `params`)。
`errors` も `os` も渡らないため、oRPC を知りようがない。
移行元と違うのは `SuccessResponse.Ok(...)` の包みが無い点だけで、
ステータスは契約の `successStatus` が持つ。

### 結果 (Consequences)

- Good, because **oRPC に触れるファイルがコンテキストごとに 1 つになった。**
  以前は操作の数だけ増えていた
- Good, because controller が `better-result` と契約の型しか import しない。
  配信手段が変わっても、入力を組み立てる仕事はそのまま残る
- Good, because 契約の操作一覧と失敗の翻訳が同じ画面にある
- Good, because 移行元と語彙が揃う (`user-routes.ts` / `controllers/`)
- Bad, because routes が長くなる。操作が 5 つ揃うと 60 行ほどになる
- Bad, because **handler ごとに同じ 4 行を繰り返す** (`isOk` なら返し、
  そうでなければ `handleErrorResponse` に投げる)。共通化すると間接が戻るため、
  今は繰り返しを受け入れる
- Neutral, because ファイル数は変わらない (handler 2 つ → controller 2 つ)

### 確認方法 (Confirmation)

**controller が oRPC を import していないこと。** 実測:

```zsh
$ grep -rln "@orpc/\|presentation/os.ts" src
app.ts
contexts/user/presentation/user-routes.ts
router.ts
shared/presentation/convert-validation-error.ts
shared/presentation/log-failure.ts
shared/presentation/os.ts
```

`contexts/user/presentation/controllers/` は 1 つも挙がらない。

## 各選択肢の評価 (Pros and Cons of the Options)

### `ADR-03` のまま、handler を操作ごとのファイルに置く

- Good, because ファイルが操作と 1 対 1 で、追う先が分かりやすい
- Good, because routes が短いままでいられる
- Bad, because **oRPC を知るファイルが操作の数だけ増える**
- Bad, because 入力の組み立てが oRPC の `.handler()` の中に置かれ、
  配信手段と分けられない
- Bad, because 1 つの操作を読むのに 2 ファイル開く。しかも routes 側には
  「どう失敗を訳すか」が書かれていない

### handler は routes に直接書き、その内側に controller を挟む

- Good, because oRPC の面が 1 ファイルに閉じる
- Good, because 層の中の 2 種類の仕事が名前で分かれる
- Bad, because routes が長くなり、同じ 4 行が繰り返される

### handler のファイルを残したうえで controller も置く (3 段)

- Good, because 各ファイルの責務は最も細かく分かれる
- Bad, because **handler が委譲だけの層になる。** routes から呼ばれ、
  controller を呼ぶだけで、自分では何も決めない
- Bad, because 1 つの操作を追うのに 3 ファイル開くことになる

## 補足情報 (More Information)

### `ADR-03` の何が誤っていたか

2 点ある。

**1. 「controller は委譲しかしない層になる」と判断した。** 実際の controller は
箱 (`auth` / `body` / `params`) をユースケースの入力へ**組み替えている**。
`get-user-controller` は `params.id` と `auth.userId` から
`{ id, actor }` を作っており、委譲ではなく翻訳である。

**2. 「oRPC を差し替える想定に現実味が無いので controller 層は救われない」
と論じた。** これは論点がズレていた。問題は差し替えではなく、
**フレームワークの語彙が何ファイルに散るか**である。差し替えないとしても、
oRPC を知るファイルは少ない方がよい。

一方で `ADR-03` が数えた「契約が引き取った仕事」(転送形式の解釈・検証・
成功時のステータス) の分析自体は正しく、いまも有効。**プレゼンテーション層が
薄いことと、その中を 2 つに分けることは両立する。**

### handler をファイルにしない理由

handler は `os.user.get.handler(...)` という**式**であって、独立した概念ではない。
契約の操作 1 つに対して 1 つ存在し、契約が消えれば消える。
契約の一覧 (routes) と同じ場所に置くのが素直である。

### 繰り返しは `okOrThrow` で畳んだ (2026-08-24 追記)

当初は各 handler の末尾 4 行が同じ形になっていた。

```ts
if (result.isOk()) return result.value;
throw handleErrorResponse(result.error, errors);
```

「包むと型の絞り込みが効かなくなる恐れがある」として保留していたが、
操作が 5 つ揃った時点で試したところ **絞り込みは生き残った。**

```ts
export const okOrThrow = <T, E extends ApplicationError>(
  result: Result<T, E>,
  errors: Pick<ErrorFactories, ErrorKeyOf<E>>,
): T => {
  if (result.isOk()) return result.value;
  throw handleErrorResponse(result.error, errors);
};
```

呼び出し側はこうなる。

```ts
create: os.user.create.handler(async ({ input, errors }) =>
  okOrThrow(await createUser({ body: input }), errors),
),
```

`user-routes.ts` は 91 行から 59 行になった。守りが残っていることは
2 方向で実測している。

| 壊し方                                      | 結果                                             |
| ------------------------------------------- | ------------------------------------------------ |
| 契約が宣言していないエラーを混ぜる          | `Property 'FORBIDDEN_ERROR' is missing` (routes) |
| `handleErrorResponse` の match から枝を消す | 網羅性のエラー                                   |

**懸念が外れた理由。** 絞り込みを担っているのは `ErrorKeyOf<E>` の
条件型で、これは `E` から計算される。`okOrThrow` が `E` をそのまま
引き継ぐ限り、間に関数が 1 つ挟まっても計算結果は変わらない。

引き換えに `throw` が呼び出し側から見えなくなった。名前で示している
(`...OrThrow`) が、routes だけを読んで「失敗すると投げる」と気付けるかは
名前次第になる。
