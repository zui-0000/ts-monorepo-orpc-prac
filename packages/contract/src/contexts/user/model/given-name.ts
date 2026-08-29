import * as v from "valibot";

import { NamePartSchema } from "../../../shared/model/index.js";

/** 名。書式は氏名の一部の共通ルールに従う。 */
export const GivenNameSchema = v.pipe(
  NamePartSchema,
  v.description("名"),
  v.examples(["太郎"]),
);

export type GivenName = v.InferOutput<typeof GivenNameSchema>;
