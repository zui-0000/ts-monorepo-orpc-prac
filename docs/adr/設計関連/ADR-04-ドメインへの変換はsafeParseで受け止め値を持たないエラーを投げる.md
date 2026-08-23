---
status: accepted
date: 2026-08-24
decision-makers: zui
consulted: Claude
informed:
---

# ドメインへの変換は safeParse で受け止め、値を持たないエラーを投げる

## 背景と課題 (Context and Problem Statement)

境界を越えてきた値をドメインの型へ変える箇所が 5 つある。

| 場所                     | 何を変換するか      | 失敗が意味すること           |
| ------------------------ | ------------------- | ---------------------------- |
| `create-user-command.ts` | HTTP の入力         | 契約とドメインの規則がズレた |
| `create-user-command.ts` | ハッシュ化の結果    | PasswordHasher が壊れている  |
| `get-user-query.ts`      | HTTP の入力と actor | 同上 / 認証の実装の誤り      |
| `user.ts` (集約の生成)   | 採番した UUID       | UuidGenerator が壊れている   |
| `user-repository.ts`     | DB から読んだ行     | 移行漏れ、DB の直接書き換え  |

どれも**通常は起きない**。契約 (oRPC) が入力を検証済みで、アダプタは正しい形を
返す前提だからである。裏を返せば、起きたときは実装の誤りを意味する。

当初は `v.parse` をそのまま呼んでいたが、**valibot の例外はメッセージに値そのものを
載せる**ことが分かった。実測:

```txt
regex     → Invalid format: Expected /^\$[a-z0-9-]+\$/u but received "dummy-hash"
minLength → Invalid length: Expected >=12 but received 9      ← 長さだけ
email     → Invalid email: Received "not-an-email"
```

500 のログにはスタックが残るため、`v.parse` のままでは**正規表現で弾かれた値が
そのままログ基盤へ流れる。** メールアドレスやパスワードのハッシュが該当する。

同じ問題を入力検証側では既に潰している (`ADR-01` の補足)。**ドメインへの変換側にも
同じ守りが要る**というのがこの決定の出発点である。

## 決定要因 (Decision Drivers)

- 送信値・DB の値がログにも応答にも出ないこと
- 実装の誤りと業務上の失敗が混ざらないこと
- 呼び出し側に**対処しようのない失敗**を握らせないこと
- 何がどの規則に反したかは追えること

## 検討した選択肢 (Considered Options)

- `v.parse` をそのまま使う
- `v.parse` のまま、ログ側でスタックから値を伏せる
- `safeParse` で受け止め、`Result.err` で返す
- `safeParse` で受け止め、値を持たない専用エラーを throw する

## 決定 (Decision Outcome)

**「`safeParse` で受け止め、値を持たない専用エラーを throw する」を採用する。**

`parseInvariant` が受け止め、規則の情報だけを持つ `InvariantViolationError` に
載せ替える。

```ts
export const parseInvariant = <TSchema extends v.GenericSchema>(
  schema: TSchema,
  value: unknown,
): v.InferOutput<TSchema> => {
  const result = v.safeParse(schema, value);
  if (result.success) return result.output;
  throw new InvariantViolationError(
    formatViolations(result.issues, subjectOf(schema)),
  );
};
```

**`Result.err` ではなく throw** にしたのが要点。理由は 3 つの発生原因が
どれも呼び出し側にはどうにもできないため。`Result.err` にすると
全ユースケースのエラー型にこれが並び、返せる応答が 500 一択のものを
「対処してください」と差し出す形になる。better-result の語彙でも
`Result.err` は呼び出し側が扱う失敗、`Panic` はバグを指す。

結果として `handleErrorResponse` の `ApplicationError` に加える必要がなく、
**エラー型の見た目は何も変わらない。**

### 見出しは brand から取る

値オブジェクト単体の検証は issue が `path` を持たないため、何を見ていたのかが
`(root)` になる。呼び出し側に名前を渡させる案もあったが、**値オブジェクトは
brand で自分が何者かを既に宣言している。**

```ts
export const UserHashedPasswordSchema = v.pipe(..., v.brand("User.HashedPassword"));
```

`v.brand()` は実行時に `name` を保持するため、そこから引ける。引数が 1 つ減り、
手書きより正確な名前が出る。

### 結果 (Consequences)

- Good, because 値が漏れない。**規則だけが残る** (`User.HashedPassword:regex`)
- Good, because ログが読みやすくなった。valibot の例外より、どの値オブジェクトの
  どの規則で落ちたかが直接読める
- Good, because ユースケースのエラー型が汚れない
- Good, because 入力検証側と同じ整形 (`formatViolations`) を通るため、
  ログの見た目が経路によって変わらない
- Bad, because **throw しうることが型に現れない。** 呼び出し側は
  `Result` を見ても気付けず、コメントと本 ADR が根拠になる
- Bad, because valibot の内部構造 (`schema.pipe` の brand) を読む。
  ただし外れても `undefined` を返して `(root)` に戻るだけで、検証は壊れない
- Neutral, because 500 になること自体は `v.parse` のときと変わらない

### 確認方法 (Confirmation)

平文をそのまま返す壊れた `PasswordHasher` を渡し、HTTP を通して観測した。

```txt
level=ERROR status=500 cause=Panic: generator body threw
Caused by: InvariantViolationError: ドメインの規則に反する値を受け取りました: User.HashedPassword:regex

body: {"defined":false,"code":"INTERNAL_SERVER_ERROR","status":500,"message":"Internal server error"}
```

送信した平文は応答にもログにも現れない。

## 各選択肢の評価 (Pros and Cons of the Options)

### `v.parse` をそのまま使う

- Good, because 追加のコードが要らない
- Good, because valibot の例外に全 issue が入るため情報量は最も多い
- Bad, because **値がログへ流れる。** regex と email の違反はメッセージに
  値そのものが入る (実測)
- Bad, because ログが読みにくい。`Panic: generator body threw` →
  `Panic: map callback threw` → `ValiError` と 3 段重なる

### `v.parse` のまま、ログ側で値を伏せる

- Good, because 変換箇所に手を入れずに済む
- Bad, because **スタック文字列を加工することになる。** どの部分が値かを
  正規表現で当てる形になり、valibot のメッセージが変わると静かに漏れ始める
- Bad, because テストで潰すべき問題をログの加工で隠すことになる

### `safeParse` で受け止め、`Result.err` で返す

- Good, because 失敗が型に現れる。呼び出し側が見落とさない
- Good, because throw が減り、経路が `Result` に統一される
- Bad, because **全ユースケースのエラー型に並ぶ。** 呼び出し側にできることは
  無く、`handleErrorResponse` でも 500 に丸めるだけ
- Bad, because 業務上の失敗 (重複、権限なし) と実装の誤りが同じ器に入り、
  「呼び出し側が対処すべきか」が型から読めなくなる

### `safeParse` で受け止め、値を持たない専用エラーを throw する

- Good, because 値が漏れず、エラー型も汚れない
- Neutral, because throw しうることが型に出ない
- Bad, because valibot の内部構造に触れる箇所が 1 つ増える

## 補足情報 (More Information)

### ズレを防ぐ側と、被害を抑える側

5 つの発生原因のうち最も起きやすいのは**契約とドメインの規則のズレ**である
(`ADR-02` のとおり同じ規則を 2 箇所に手書きしているため)。

- **ズレを起こさない** — 各値オブジェクトの `__tests__` が契約と同じ判定を
  することを見張る (`ADR-02`)
- **ズレたとき値を漏らさない** — 本 ADR

守る対象が違うため、片方だけでは足りない。テストは書き忘れうるし、
新しい値オブジェクトが登録されないこともある。

### 制約の種類によって漏れ方が違う

| 制約                      | メッセージに出るもの |
| ------------------------- | -------------------- |
| `minLength` / `maxLength` | 長さだけ             |
| `regex` / `email`         | **値そのもの**       |

`PasswordSchema` は長さ制約しか持たないため、`v.parse` のままでも平文が
漏れる経路は無かった。危険なのは `MailAddressSchema` と
`UserHashedPasswordSchema` (どちらも regex)。**とはいえ「今の制約の組み合わせなら
安全」に依存する形は残したくない**ため、変換箇所すべてを揃えた。

### 第 2 引数が `unknown` であることの副作用

`parseInvariant(schema, value: unknown)` は、値がスキーマに合うかを型検査しない。
外から来た信用できない値を受けるための設計だが、**呼び出し側が手で書いた型と
スキーマがズレても気付けない**という副作用がある。ユースケースの入力については
`ADR-06` で型をスキーマから導いて塞いだ。

### この判断が変わりうる場面

**valibot が例外に値を載せなくなったとき。** その場合 `v.parse` に戻せるが、
`Result.err` との使い分け (実装の誤りは throw) は残す価値がある。
