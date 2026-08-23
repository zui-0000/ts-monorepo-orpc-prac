import * as v from "valibot";

import { InvariantViolationError } from "~/shared/errors/invariant-violation-error.ts";
import { formatViolations } from "~/shared/errors/validation-issue.ts";

/** valibot のスキーマ内部。公開 API ではないので、読む形をここに閉じ込める。 */
type BrandedSchema = {
  readonly pipe?: readonly {
    readonly type?: string;
    readonly name?: string;
  }[];
};

/**
 * 検証していた対象の名前を brand から取る。path を持たない値オブジェクト単体の
 * 検証で使う。見つからなければ `(root)` に戻るだけで、検証には影響しない。
 */
const subjectOf = (schema: unknown): string | undefined =>
  (schema as BrandedSchema).pipe?.find((item) => item.type === "brand")?.name;

/**
 * 外から来た値をドメインの型へ変える。失敗は実装の誤りとして throw する。
 * `v.parse` を使わないのは、valibot の例外が値そのものをメッセージに載せるため
 * (設計関連/ADR-04)。
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
