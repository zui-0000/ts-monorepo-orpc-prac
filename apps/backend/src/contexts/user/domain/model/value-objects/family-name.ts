import * as v from "valibot";

import { NamePartSchema } from "~/shared/domain/model/name-part.ts";

/** 姓 (値オブジェクト / branded string)。書式は共有ドメインの素材に従う。 */
export const FamilyNameSchema = v.pipe(
  NamePartSchema,
  v.brand("User.FamilyName"),
);

export type FamilyName = v.InferOutput<typeof FamilyNameSchema>;
