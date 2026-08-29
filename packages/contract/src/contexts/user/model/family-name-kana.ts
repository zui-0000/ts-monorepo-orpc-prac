import * as v from "valibot";

import { NamePartKanaSchema } from "../../../shared/model/index.js";

/** 姓のカナ表記 (全角カタカナ)。 */
export const FamilyNameKanaSchema = v.pipe(
  NamePartKanaSchema,
  v.description("姓のカナ表記 (全角カタカナ)"),
  v.examples(["ヤマダ"]),
);

export type FamilyNameKana = v.InferOutput<typeof FamilyNameKanaSchema>;
