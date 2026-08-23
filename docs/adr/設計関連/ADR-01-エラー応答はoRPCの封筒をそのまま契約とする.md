---
status: accepted
date: 2026-08-23
decision-makers: zui
consulted: Claude
informed:
---

# エラー応答は oRPC の封筒をそのまま契約とする

## 背景と課題 (Context and Problem Statement)

oRPC はエラーを**封筒**に包んで返す。

```json
{
  "defined": true,
  "code": "FORBIDDEN_ERROR",
  "status": 403,
  "message": "この操作を行う権限がありません",
  "data": { ... }
}
```

`defined` は「契約の `.errors()` で宣言されたエラーか」を表す oRPC 固有の項目で、
クライアントが `isDefinedError()` で型付きに分岐するために使う。

一方、移行元 (Hono + TypeSpec) は RFC 9457 (Problem Details) に寄せた形を
契約としていた。

```json
{ "status": 403, "code": "4030", "title": "この操作を行う権限がありません" }
```

移行当初はこちらを維持し、`customErrorResponseBodyEncoder` で封筒を剥がしていた。
**この 2 つの形式のどちらを API の契約とするか**を決める必要がある。

## 決定要因 (Decision Drivers)

- クライアント (frontend) がエラーを**型付きで**扱えること
- 応答に同じ情報が重複しないこと
- 契約 (OpenAPI 仕様) と実際の応答が一致すること
- 実装が持つ変換層をできるだけ薄くすること

## 検討した選択肢 (Considered Options)

- 封筒を剥がし、RFC 9457 寄りの形を契約とする（移行当初の形）
- 封筒をそのまま契約とする
- 封筒を剥がしたうえで、クライアント側は契約の valibot スキーマで判別する

## 決定 (Decision Outcome)

**「封筒をそのまま契約とする」を採用する。**

決め手は、**封筒を剥がすとクライアント側の型判別が働かなくなる**ことを
実測で確認したため。契約に `.errors()` を書く意味が消える。

あわせて契約のエラー定義から `status` / `code` / `title` を落とし、
`{ status, message }` だけを持たせた。封筒がそれらを載せるため二重になる。

```ts
export const ForbiddenError = {
  status: HttpStatus.FORBIDDEN,
  message: "この操作を行う権限がありません",
} as const;
```

**業務コード (4 桁) は廃止した。** 導入していた理由は「HTTP ステータスだけでは
区別できない」こと (401 の `4010` と `4011` など) だが、封筒の `code` に契約の
キーがそのまま出るため、`UNAUTHORIZED_ERROR` / `PASSWORD_MISMATCH_ERROR` の
ように名前で区別できる。数字の体系を別に維持する理由が無い。

### 結果 (Consequences)

- Good, because クライアントが `isDefinedError(error) && error.code === "..."` で
  **型付きのまま**分岐でき、`data` の型も一緒に絞られる
- Good, because 応答から重複が消えた (以前は `status` が 2 箇所、文言が
  `message` と `data.title` の 2 箇所にあった)
- Good, because エラー本文を組み立てる層 (encoder / payload) が丸ごと不要になった
- Good, because OpenAPI 仕様が `code` を `const` で固定するため、**仕様を見れば
  どのキーが来るか分かる**
- Bad, because `defined` が応答に出る。oRPC を使っているという実装の事実が
  API の表面に現れる
- Bad, because RFC 9457 に寄せた形から離れる
- Bad, because 入力検証エラーだけは oRPC が `defined: false` で投げるため、
  ミドルウェアで翻訳する必要がある

### 確認方法 (Confirmation)

生成した OpenAPI 仕様で実応答を検証する。`code` の `const` と `required` を
突き合わせ、403 と 400 の双方が適合することを確認済み。

## 各選択肢の評価 (Pros and Cons of the Options)

### 封筒を剥がし、RFC 9457 寄りの形を契約とする

- Good, because REST API として素直な応答になる (`defined` が出ない)
- Good, because Swagger UI や curl で叩く利用者に説明しやすい
- Bad, because **クライアントの型判別が働かない。** 実測ではこうなった

  ```
  isDefinedError() : false
  code             : "FORBIDDEN"   ← HTTP 由来の汎用値。契約のキーではない
  data             : { body: {...}, status: 403, headers: {...} }  ← 生の HTTP 応答
  ```

  契約の本文は `data.body` に入れ子で入り、oRPC は「知らない形」と判断する

- Bad, because 封筒を剥がす encoder と、本文を組み立てる payload が必要になる
- Bad, because 応答スキーマの上書きが要る。`data` を持たないエラーが出た時点で
  仕様が `"content": {}` (何も返さない) になり、型検査でも仕様検査でも気付けない

### 封筒をそのまま契約とする

- Good, because クライアントが型付きで分岐できる
- Good, because 変換層が不要 (入力検証エラーの翻訳を除く)
- Good, because 仕様と実応答が一致する
- Neutral, because `defined` という oRPC 固有の項目が公開される
- Bad, because REST の一般的な作法から外れる

### 封筒を剥がし、クライアント側で契約のスキーマ判別する

- Good, because 応答の形は REST のまま保てる
- Good, because 契約が valibot スキーマを持つので `v.safeParse` で型は付く
- Bad, because **判別を手で書くことになる。** oRPC が用意した仕組みを捨てて
  同じことを再実装する形になり、経路が増えるたびに書き足す必要がある
- Bad, because encoder は依然として必要

## 補足情報 (More Information)

### 入力検証エラーだけは翻訳が要る

oRPC は入力が契約に合わないとき、契約の `.errors()` を経由せず
`ORPCError("BAD_REQUEST")` を直接投げる。`defined: false` になるうえ、
本文に**送信値がそのまま入る**。

```json
{"defined":false,"code":"BAD_REQUEST","message":"Input validation failed",
 "data":{"issues":[{"input":"bad","expected":"/^[0-9a-f]{8}-.../u",
                    "path":[{"input":{"id":"bad"},"value":"bad"}]}]}}
```

送信値 (`input` / `received` / `path[].value`)、検証パターン (`expected`)、
英語の文言 — いずれも外に出したくない。パスワード変更で同じことが起きれば
平文が応答に載る。

そこでミドルウェアで捕まえ、契約の `BAD_REQUEST_ERROR` へ投げ直す。

```ts
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

**`initialInputValidationIndex` が鍵。** 既定の `0` は「全ミドルウェアより前に
検証する」意味なので、検証エラーを捕まえる余地が無い。`1` にすると最初の
ミドルウェアの後ろへ移る。

結果として 400 も封筒に乗る。

```json
{"defined":true,"code":"BAD_REQUEST_ERROR","status":400,
 "message":"リクエスト内容が不正です","data":{"errors":[{"field":"id"}]}}
```

### oRPC v2 でも事情は変わらない

2.0.0-beta.30 (2026-08-21 時点) の `validateInput` を確認したが、
`"BAD_REQUEST"` を固定で投げる作りは v1 と同一で、契約側に検証エラーを
カスタマイズする口も無い。v2 の主な変更は HTTP アダプタ層の外部化
(`@orpc/standard-server-*` → `@standardserver/*`) で、エラー処理の思想は
変わっていない。

### この判断が変わりうる場面

**API の利用者が oRPC クライアント以外に広がったとき。** いまは frontend だけが
叩くため封筒の利点を活かせるが、モバイルアプリや外部連携が curl で叩くように
なると `defined` の説明が必要になる。そのときは「封筒を剥がし、クライアント側で
契約のスキーマ判別する」案が現実的な落とし所になる。
