---
status: accepted
date: 2026-08-24
decision-makers: zui
consulted: Claude
informed:
---

# プレゼンテーション層は controller を置かず handler を実体とする

## 背景と課題 (Context and Problem Statement)

移行元 (Hono + TypeSpec) はプレゼンテーション層を 2 段で構成していた。

```txt
presentation/
  controllers/create-user-controller.ts   ← DTO を組み立ててユースケースへ渡す
  routes.ts                               ← パス・メソッドと controller の対応
```

oRPC へ移った結果、**契約 (`packages/contract`) が転送形式に関する仕事を
引き取った。** パスもメソッドも成功時のステータスも契約が持ち、入力は
契約の valibot スキーマで検証されたうえで型付きでハンドラへ渡る。

この状態で controller 層を維持すべきか、oRPC の `.handler()` をそのまま
プレゼンテーション層の実体とするかを決める必要がある。

## 決定要因 (Decision Drivers)

- **層が翻訳の仕事を持っていること。** 委譲しかしない層を作らない
- DDD / CQRS が配信層に求めるものと整合すること
- API テストの書き方が成立すること
- 契約に並ぶ操作と、それを実装するファイルが 1 対 1 で読めること

## 検討した選択肢 (Considered Options)

- controller を維持し、その内側に oRPC の handler を置く
- handler をプレゼンテーション層の実体とする (controller を置かない)
- router に手続きの本体を直接書く (操作ごとにファイルを分けない)

## 決定 (Decision Outcome)

**「handler をプレゼンテーション層の実体とする」を採用する。**

決め手は、**controller の仕事が 5 つのうち 3 つ契約へ移った**こと。

| 仕事                       | 移行元                         | oRPC 移行後                        |
| -------------------------- | ------------------------------ | ---------------------------------- |
| ① 転送形式から値を取り出す | controller が `body` を分解    | **契約** (型付きで渡る)            |
| ② 検証する                 | 生成 zod ＋ ルート定義         | **契約** ＋ `os.ts` のミドルウェア |
| ③ ユースケースを呼ぶ       | controller                     | handler                            |
| ④ 成功応答を組む           | `SuccessResponse.Created(...)` | **契約** の `successStatus`        |
| ⑤ 失敗を HTTP へ翻訳       | `handle-with-result`           | `handleErrorResponse`              |

残ったのは ③ と ⑤ の 2 つで、これは 1 つの関数が担える量。ここに controller を
足すと、中身が handler と同一の**委譲しかしない層**が生まれる。

実際、両者は同じ形をしている。

```ts
// 移行元
export const createUserController = (deps: UserDeps) => {
  const command = createUserCommand(deps);
  return ({ body }) =>
    Result.gen(async function* () {
      const output = yield* Result.await(command(body));
      return Result.ok(SuccessResponse.Created(output));
    });
};

// 採用した形
export const createUserHandler = (deps: CreateUserCommandDeps) => {
  const command = createUserCommand(deps);
  return os.user.create.handler(async ({ input, errors }) => {
    const result = await command(input);
    if (result.isOk()) return result.value;
    throw handleErrorResponse(result.error, errors);
  });
};
```

どちらも `(deps) => 手続き` で、同じ場所で同じ仕事をしている。
**層を 1 つ削ったのではなく、層の仕事が減った。**

### DDD / CQRS からの検討

**DDD に controller という構成要素は無い。** Evans の戦術パターンは
Entity / Value Object / Aggregate / Repository / Domain Service / Factory /
Module であり、controller は MVC の語彙である。DDD が定めるのは
**プレゼンテーション「層」の責務**（配信手段とアプリケーション層の翻訳）であって、
その層をいくつのファイルで構成するかではない。

**CQRS も配信層に要求を持たない。** CQRS はコマンドとクエリでモデルを分ける
話であり、このリポジトリでそれが現れているのは配信層ではなく内側である。

|                  | 書き込み側                  | 読み取り側                      |
| ---------------- | --------------------------- | ------------------------------- |
| ポートの置き場所 | `domain/user-repository.ts` | `application/get-user-query.ts` |
| 通る道           | 集約を復元する              | ドメインを一切通らない          |

読み取り側が domain を素通りすることが CQRS の本体で、controller の有無とは
独立している。

### ファイル構成

操作の実装は `handlers/` へ分ける。

```txt
presentation/
  handlers/
    create-user-handler.ts
    get-user-handler.ts
  user-router.ts
```

`user-router.ts` が変わるのは**契約に操作が増えたとき**だけで、個々の操作を
どう実装するかとは独立している。並べて置くと、操作が 5 つ揃ったときに
「どの操作にどの実装が結ばれているか」の一覧が実装に埋もれる。

### 結果 (Consequences)

- Good, because 委譲しかしない層が生まれない
- Good, because 契約に並ぶ操作と実装ファイルが 1 対 1 で対応する
- Good, because プレゼンテーション層に残った仕事が 2 つだけになり、
  handler を読めば「何を呼び、失敗をどう訳すか」が一望できる
- Good, because API テストの書き方が移行元と変わらない (後述)
- Bad, because handler が oRPC の `.handler()` に結びつく。
  フレームワーク非依存のプレゼンテーション関数が存在しない
- Bad, because 転送 DTO とアプリケーション入力の**対応付けが暗黙になる。**
  移行元は `const input: CreateUserCommandInput = body;` と 1 行で明示していた
  (採用した形では `command(input)` の引数の代入検査が同じ役目を果たすが、
  目には見えない)
- Neutral, because 移行元と名前が変わる。`.handler()` に合わせたもので、
  役割は controller と同じ

### 確認方法 (Confirmation)

**`app(deps).request()` で HTTP を通したテストが書けること。** 偽の依存を渡し、
サーバも DB も立てずに実応答と副作用を観察できることを実測で確認した。

```txt
status: 201
body: {"id":"018eef15-1234-7123-8123-123456789abc"}
保存された値: $argon2id$v=19$m=65536,t=2,p=1$c2FsdA$aGFzaA   ← 平文ではない
```

controller を挟まなくても、**平文が保存されていないこと**のような
最も確かめたい事実を検証できる。

## 各選択肢の評価 (Pros and Cons of the Options)

### controller を維持し、その内側に handler を置く

- Good, because 移行元と構成が揃い、移行時に読み替えが要らない
- Good, because フレームワーク非依存の関数が 1 つ残るため、oRPC を差し替える
  ときに影響範囲が狭い
- Bad, because **中身が handler と同一の層になる。** ③ と ⑤ しか仕事が無いため、
  分けても片方は委譲だけになる
- Bad, because oRPC を差し替える想定に現実味が無い。契約そのものが oRPC であり、
  差し替えるなら契約と frontend のクライアントごと書き直すことになる。
  controller 層があっても救われない
- Bad, because `router → controller → handler` と辿る段数が増え、
  契約の 1 操作を追うのに 3 ファイル開くことになる

### handler をプレゼンテーション層の実体とする

- Good, because 層の仕事の量と実体の数が釣り合う
- Good, because 段数が最小 (`router → handler`)
- Neutral, because oRPC に結びつく
- Bad, because 転送 DTO とアプリ入力の対応が暗黙になる

### router に手続きの本体を直接書く

- Good, because ファイルが最も少ない
- Good, because 契約と実装が同じ画面に並ぶ
- Bad, because **一覧性が壊れる。** 操作が 5 つ揃うと、どの操作にどの実装が
  結ばれているかが本体の中に埋もれる
- Bad, because 変わる理由が違うものが同居する。契約に操作が増えたときと、
  ある操作の実装を直すときで、同じファイルが変更対象になる
- Bad, because ユースケースの部分適用 (`createUserCommand(deps)`) を
  操作ごとに書くことになり、依存の受け渡しが散る

## 補足情報 (More Information)

### 移行元も controller を直接テストしていなかった

判断の後押しになった事実。移行元の controller テストは controller を
import しているが、**呼んではいない。**

```ts
describe(createUserController.name, () => {          // ← 名前のためだけの import
  test("...", async () => {
    const response = await app(deps).request("/users", { ... });  // ← 実際に叩くのはアプリ全体
```

つまりテストが相手にしていたのは controller ではなくアプリ全体であり、
**内側の名前が controller でも handler でもテストの書き方は変わらない。**
「controller があるとテストしやすい」という利点は、移行元でも使われていなかった。

### この判断が変わりうる場面

- **1 つの HTTP 操作が複数のユースケースを束ねるようになったとき。**
  ただしその調整役はアプリケーションサービスの仕事である可能性が高く、
  まず内側を疑うこと
- **転送 DTO とアプリケーション入力の詰め替えが自明でなくなったとき。**
  契約が `{ user: { name, ... } }` のように入れ子になれば、handler の中に
  詰め替えが現れる。それが育ったら分ければよい
- **HTTP 以外の配信口が増えたとき。** ただしそのとき共有すべきは
  ユースケースであって controller ではない

いずれも「先に層を作っておく」ではなく、**必要になってから分ける**方針を取る。

### 関連する決定

- `ADR-01` — 契約が `status` と `message` を持つため、handler が組み立てる
  応答本文が無くなった。⑤ が `handleErrorResponse` 1 つで済む前提
