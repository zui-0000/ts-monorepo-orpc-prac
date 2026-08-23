---
status: accepted
date: 2026-08-24
decision-makers: zui
consulted: Claude
informed:
---

# ユースケースの入力型は検証スキーマから導く

## 背景と課題 (Context and Problem Statement)

ユースケースは境界を越えてきた素の値を受け取り、値オブジェクトへ変換する
(`ADR-04`)。そのため 2 つのものが要る。

- **受け取る形の宣言** — presentation から何を渡せばよいか
- **変換の定義** — どの値オブジェクトへ変えるか

当初はどちらも手で書いていた。

```ts
export type CreateUserCommandInput = {
  readonly name: string;
  readonly mailAddress: string;
  readonly password: string;
};

const CreateUserCommandValues = v.object({
  name: UserNameSchema,
  mailAddress: MailAddressSchema,
  password: PasswordSchema,
});
```

同じ形が 2 箇所にあり、**ズレても型検査が通る。** `parseInvariant` の
第 2 引数が `unknown` なので、TypeScript は「この値がこのスキーマに合うか」を
見ていない。実測でスキーマにだけ項目を足しても `tsc --noEmit` は緑のままだった。

気付けるのは実行時、`InvariantViolationError` による 500 としてである。

## 決定要因 (Decision Drivers)

- 形の宣言が 1 箇所であること
- ズレがコンパイル時に止まること
- presentation から素の値をそのまま渡せること (brand が付かないこと)
- 入力と出力で扱いを変える理由が説明できること

## 検討した選択肢 (Considered Options)

- 入力型も検証スキーマも手で書く (当初の形)
- 入力型を検証スキーマから導く
- `parseInvariant` の第 2 引数を `unknown` ではなくスキーマの入力型にする
- 入力型を契約の型から導く

## 決定 (Decision Outcome)

**「入力型を検証スキーマから導く」を採用する。**

```ts
const CreateUserCommandInputSchema = v.object({
  name: UserNameSchema,
  mailAddress: MailAddressSchema,
  password: PasswordSchema,
});

export type CreateUserCommandInput = Readonly<
  v.InferInput<typeof CreateUserCommandInputSchema>
>;
```

`InferOutput` ではなく **`InferInput`** を使うのが要点。前者は変換後
(brand 付き) の型なので、presentation が素の文字列を渡せなくなる。
後者は変換前なので `string` のまま出る。

### 出力型は素の TypeScript のまま

入力と出力で扱いが違うのは、**parse する場所があるかどうか**が違うため。

|                | 入力                           | 出力                        |
| -------------- | ------------------------------ | --------------------------- |
| 境界を越えるか | 越える (presentation から来る) | 越えない                    |
| parse するか   | する (値オブジェクトへ変換)    | しない (検証済みの値で組む) |
| スキーマの用途 | 変換の定義そのもの             | **無い**                    |

出力にスキーマを書いても実行時に一度も呼ばれない。応答の形の保証は
oRPC が契約の `.output()` で行う。

### 結果 (Consequences)

- Good, because 形の宣言が 1 箇所になった
- Good, because **ズレが両方向でコンパイルエラーになる** (後述)
- Good, because 落ちる場所が controller になる。「契約から来る値が
  ユースケースの入力を満たさない」という壊れている箇所そのものを指す
- Bad, because **フィールドが一目で読めない。** 型定義を見ても中身が分からず、
  すぐ上のスキーマを見ることになる
- Neutral, because 出力型は素のまま。入力と出力で書き方が揃わない

### 確認方法 (Confirmation)

ズレを両方向で作り、`tsc --noEmit` が落ちることを実測した。

```txt
# スキーマにだけ項目を足す
create-user-controller.ts(19,50): error TS2741:
  Property 'nickname' is missing in type '{ name; mailAddress; password; }'
  but required in type 'Readonly<{ name; mailAddress; password; nickname; }>'

# 契約から項目が消える
create-user-controller.ts(19,50): error TS2741:
  Property 'password' is missing in type '{ name; mailAddress; }'
  but required in type 'Readonly<{ name; mailAddress; password; }>'
```

変更前は**どちらも緑のまま通っていた。**

## 各選択肢の評価 (Pros and Cons of the Options)

### 入力型も検証スキーマも手で書く

- Good, because 型定義を見ればフィールドが一目で分かる
- Good, because 受け取る形を意図して宣言している感じが残る
- Bad, because **同じ形を 2 度書く。** ユースケースが 5 つあれば 10 箇所
- Bad, because ズレても型検査が通り、実行時の 500 まで気付けない

### 入力型を検証スキーマから導く

- Good, because 宣言が 1 箇所になり、ズレがコンパイル時に止まる
- Bad, because 型定義だけではフィールドが読めない

### `parseInvariant` の第 2 引数をスキーマの入力型にする

- Good, because 呼び出し側でズレが止まる。手書きの型を残したままでも効く
- Bad, because **重複そのものは消えない。** 入力型は依然として手書き
- Bad, because `parseInvariant` の役目と噛み合わない。あれは
  **外から来た信用できない値**をドメインへ変える関数で、DB の行のように
  「型は付いているが実際は保証されていない」ものも受ける。
  引数に形を要求すると、その用途を締め出すことになる

### 入力型を契約の型から導く

- Good, because 契約とユースケースが直接繋がり、間に何も挟まらない
- Bad, because **アプリケーション層が契約 (HTTP) を知ることになる。**
  ユースケースは配信手段から独立しているべきで、`ADR-05` で controller を
  挟んだ理由とも逆行する
- Bad, because 形が一致しない。`GetUserQueryInput` の `actor` は認証から来る値で、
  契約には現れない

## 補足情報 (More Information)

### 命名

検証スキーマは `<ユースケース名>InputSchema`、そこから導く型は
`<ユースケース名>Input` とする。契約側の `CreateUserRequestSchema` /
`CreateUserRequest` と同じ関係になる。

以前は `<ユースケース名>Values` だったが、派生元になった以上、
名前で対応が読めるほうがよい。

### この判断が変わりうる場面

**入力の形が検証したい形と食い違ったとき。** たとえば「文字列でも数値でも
受け取り、内部では数値に揃える」ようなユースケースが出れば、`InferInput` は
union を返すため型としては正しいが、宣言としては読みにくくなる。
そのときは手書きに戻す余地がある。
