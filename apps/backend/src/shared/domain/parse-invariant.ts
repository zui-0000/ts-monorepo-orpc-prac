import * as v from "valibot";

import { InvariantViolationError } from "~/shared/errors/invariant-violation-error.ts";
import { formatViolations } from "~/shared/errors/validation-issue.ts";

/**
 * valibot のスキーマ内部。**公開 API ではない**ので、読む形をここに閉じ込める。
 */
type BrandedSchema = {
  readonly pipe?: readonly {
    readonly type?: string;
    readonly name?: string;
  }[];
};

/**
 * 値オブジェクト単体の検証で、何を見ていたかを示す名前を取り出す。
 *
 * **brand の名前をそのまま使う。** 値オブジェクトは brand で自分が何者かを
 * 既に宣言しているので (`v.brand("User.HashedPassword")`)、呼び出し側が
 * 改めて名前を渡す必要が無い。オブジェクトの検証では issue が path を持つため、
 * こちらは使われない。
 *
 * 内部構造に依存するが、**外したときに壊れない**設計にしてある —
 * 見つからなければ `undefined` を返し、ログの見出しが `(root)` に戻るだけ。
 * 検証そのものには影響しない。
 */
const subjectOf = (schema: unknown): string | undefined =>
  (schema as BrandedSchema).pipe?.find((item) => item.type === "brand")?.name;

/**
 * 外から来た値をドメインの型へ変える。**失敗は実装の誤りとして throw する。**
 *
 * `v.parse` を直に呼ばないのは、valibot の例外が**値そのものをメッセージに
 * 載せる**ため。実測:
 *
 * ```
 * regex     → Invalid format: Expected /^\$[a-z0-9-]+\$/u but received "dummy-hash"
 * minLength → Invalid length: Expected >=12 but received 9   ← 長さだけ
 * ```
 *
 * 500 のログにはスタックが残るので、`v.parse` のままだと**正規表現で弾かれた値が
 * そのまま流れる。** メールアドレスやハッシュがログ基盤へ送られることになる。
 * ここで `safeParse` に受け止め、規則の情報だけを載せ替える。
 *
 * ズレそのものを防ぐのは別の仕組み — 契約とドメインの規則が一致していることは
 * 各値オブジェクトの `__tests__` が見張る。**こちらはズレたときの被害を抑える側。**
 */
export const parseInvariant = <TSchema extends v.GenericSchema>(
  schema: TSchema,
  value: unknown,
): v.InferOutput<TSchema> => {
  const result = v.safeParse(schema, value);

  if (result.success) {
    return result.output;
  }

  throw new InvariantViolationError(
    formatViolations(result.issues, subjectOf(schema)),
  );
};
