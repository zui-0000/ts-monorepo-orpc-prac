import * as v from "valibot";

import { NamePartSchema } from "~/shared/domain/model/name-part.ts";

/** 名 (値オブジェクト / branded string)。書式は共有ドメインの素材に従う。 */
export const GivenNameSchema = v.pipe(
  NamePartSchema,
  v.brand("User.GivenName"),
);

export type GivenName = v.InferOutput<typeof GivenNameSchema>;
