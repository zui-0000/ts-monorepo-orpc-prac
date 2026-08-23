---
status: accepted
date: 2026-08-24
decision-makers: zui
consulted: Claude
informed:
---

# 値オブジェクトは契約と別に定義する

## 背景と課題 (Context and Problem Statement)

契約 (`packages/contract`) と実装 (`apps/backend`) が同じモノレポに同居している。
契約は valibot でスキーマを持ち、ドメインも valibot で値オブジェクトを定義するため、
**同じ形の検証が 2 箇所に書かれる**状態になる。

```ts
// packages/contract/src/contexts/user/model/user-id.ts
export const UserIdSchema = v.pipe(
  UuidSchema,
  v.description("ユーザーID (UUID v7)"),
  v.examples(["018eef15-1234-7123-8123-123456789abc"]),
);

// apps/backend/src/contexts/user/domain/model/value-objects/user-id.ts
export const UserIdSchema = v.pipe(UuidSchema, v.brand("User.Id"));
```

移行元 (Hono + TypeSpec) では契約が別の言語 (TypeSpec) で書かれていたため、
重複は避けようがなかった。oRPC では**両方 TypeScript の valibot** なので、
共有できてしまう。**共有すべきかどうか**を決める必要がある。

## 決定要因 (Decision Drivers)

- 依存の向きが内向き (presentation → application → domain) であること
- brand (名目的型付け) はドメインの都合であり、契約の利用者に押し付けないこと
- 契約に付く `description` / `examples` は OpenAPI のための情報であること
- 検証の意味が違うこと — 契約は「API の入力として妥当か」、ドメインは
  「その値として妥当か」

## 検討した選択肢 (Considered Options)

- 契約のスキーマをドメインでもそのまま使う
- 契約のスキーマに brand を重ねてドメインの値オブジェクトにする
- ドメインで独立に定義する

## 決定 (Decision Outcome)

**「ドメインで独立に定義する」を採用する。**

形式のパターン (UUID v7 の正規表現など) は両者が同じものを持つが、
**意図的な重複**として扱う。コードにもその旨を書く。

```ts
// apps/backend/src/shared/domain/model/uuid.ts
// UUID v7 の形式 (契約側の UuidSchema と同一パターン)。
```

### 結果 (Consequences)

- Good, because 依存が内向きのまま保たれる。domain が presentation の関心
  (API の表面) を知らない
- Good, because brand が契約に漏れない。frontend は素の `string` を扱える
- Good, because 契約側の `description` / `examples` (OpenAPI 用) が
  ドメインに混ざらない
- Good, because 契約と実装で**検証を変えられる**。API では受け取るが
  ドメインでは弾く、という差を表現できる
- Bad, because **パターンがズレても気付けない。** 契約が緩いと「API は通るのに
  ドメインで落ちる」、契約が厳しいと「到達しない検証」になる
- Bad, because 同じ正規表現を 2 箇所で保守する

### 確認方法 (Confirmation)

**同じ入力に対して契約とドメインが同じ判定をすること**をテストで担保する。
コメントで「同一パターン」と書くだけでは、片方を直したときに気付けない。

各値オブジェクトの `__tests__` に、その値が通す/弾く入力を並べたうえで
最後に置く。**振る舞いだけを比べる** (スキーマの内部構造は読まない)。

```ts
test("契約と同じ判定をすること", () => {
  for (const value of [...accepted, ...rejected]) {
    expect(v.safeParse(MailAddressSchema, value).success).toBe(
      v.safeParse(ContractMailAddressSchema, value).success,
    );
  }
});
```

対象は `Uuid` / `MailAddress` / `UserName` / `Password`。
`UserHashedPassword` だけは置かない — ハッシュは API に出ないため
契約側に対応する型が無く、ズレようがない。

ドメイン側・契約側それぞれで規則をズラして落ちることを実測で確認済み。

**契約を直したらビルドしてからテストすること。** backend が import するのは
`packages/contract` の `dist` であり `src` ではないため、契約の `src` を
変えただけではこのテストに映らない。

## 各選択肢の評価 (Pros and Cons of the Options)

### 契約のスキーマをドメインでもそのまま使う

- Good, because 重複が無い。パターンがズレる余地も無い
- Bad, because **依存の向きが逆になる。** domain が
  `@orpc-prac/contract` を import することになり、一番内側の層が
  一番外側 (API の表面) を知る
- Bad, because brand を持てない。`UserId` と `MailAddress` がどちらも
  素の `string` になり、取り違えても型が止めない
- Bad, because 契約を変えるとドメインの意味まで変わる。API の都合
  (例: 移行期間中に古い形式も受け付ける) がドメインの不変条件を緩めてしまう

### 契約のスキーマに brand を重ねる

- Good, because 形式の定義は 1 箇所で済む
- Good, because brand は持てる
- Bad, because 依存の向きは逆のまま。上と同じ問題を抱える
- Bad, because 契約に付いた `description` / `examples` がドメイン側にも
  ぶら下がる。ドメインが OpenAPI の語彙を引きずる

### ドメインで独立に定義する

- Good, because 依存が内向きのまま
- Good, because brand も description も、それぞれの層の都合に閉じる
- Neutral, because 形式のパターンが重複する
- Bad, because ズレに気付く仕掛けが要る (テストで担保する)

## 補足情報 (More Information)

### ズレると起きること

移行元のコメントに実例が残っている。

> `z.uuidv7()` を使わないのは、**あれが大文字を通すから** (実測)。
> 他は契約と同じ厳しさだが、この 1 点だけ緩い。緩いほうへズレると
> **id の表記が 2 通り生まれる**のがまずい。`checkUserIsSelf` は id を素の
> `===` で比べるので、大小が混ざると**本人なのに 403** になる。
> しかも緑のまま通るので気付けない。

**「契約の方が緩い」ケースが危ない。** API を通った値がドメインで想定外の形を
していると、型検査では見つからない不具合になる。

### 検証の意味が違うことの実例

`getUserQuery` は入力を受け取った直後に parse し直している。

```ts
const { id, actor } = v.parse(GetUserQueryValues, input);
```

契約 (oRPC) が既に検証済みでも、それは「HTTP の入力として妥当か」であって
「ドメインの値として妥当か」とは別の問い。**`actor` は認証から来るため
契約の検証を通っていない。** 同じ関数が両方の値を受け取る以上、
ドメイン側で揃えて検証する必要がある。

### 関連

- [ADR-01](./ADR-01-エラー応答はoRPCの封筒をそのまま契約とする.md) —
  こちらは逆に「oRPC の流儀に寄せる」判断をしている。契約の**表面**は
  道具に合わせ、ドメインの**内側**は道具から独立させる、という切り分け
