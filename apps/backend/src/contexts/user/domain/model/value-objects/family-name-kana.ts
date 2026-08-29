import * as v from "valibot";

import { NamePartKanaSchema } from "~/shared/domain/model/name-part-kana.ts";

/** 姓のカナ表記 (全角カタカナ) (値オブジェクト / branded string)。書式は共有ドメインの素材に従う。 */
export const FamilyNameKanaSchema = v.pipe(
  NamePartKanaSchema,
  v.brand("User.FamilyNameKana"),
);

export type FamilyNameKana = v.InferOutput<typeof FamilyNameKanaSchema>;
