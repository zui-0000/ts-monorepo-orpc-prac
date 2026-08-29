import * as v from "valibot";

import { NamePartKanaSchema } from "../../../shared/model/index.js";

/** 名のカナ表記 (全角カタカナ)。 */
export const GivenNameKanaSchema = v.pipe(
  NamePartKanaSchema,
  v.description("名のカナ表記 (全角カタカナ)"),
  v.examples(["タロウ"]),
);

export type GivenNameKana = v.InferOutput<typeof GivenNameKanaSchema>;
