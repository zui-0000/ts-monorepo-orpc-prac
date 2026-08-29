import * as v from "valibot";

import { NamePartKanaSchema } from "~/shared/domain/model/name-part-kana.ts";

/** 名のカナ表記 (全角カタカナ) (値オブジェクト / branded string)。書式は共有ドメインの素材に従う。 */
export const GivenNameKanaSchema = v.pipe(
  NamePartKanaSchema,
  v.brand("User.GivenNameKana"),
);

export type GivenNameKana = v.InferOutput<typeof GivenNameKanaSchema>;
