import * as v from "valibot";

/**
 * 氏名の一部 (姓 または 名 / 値オブジェクト / branded string)。1〜50 文字。
 * 姓と名で規則が同じなのでスキーマを共有する。
 */
export const PersonNameSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(50),
  v.brand("User.PersonName"),
);

export type PersonName = v.InferOutput<typeof PersonNameSchema>;
