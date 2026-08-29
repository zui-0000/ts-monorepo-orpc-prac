import * as v from "valibot";

import { NamePartSchema } from "../../../shared/model/index.js";

/** 姓。書式は氏名の一部の共通ルールに従う。 */
export const FamilyNameSchema = v.pipe(
  NamePartSchema,
  v.description("姓"),
  v.examples(["山田"]),
);

export type FamilyName = v.InferOutput<typeof FamilyNameSchema>;
