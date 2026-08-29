import * as v from "valibot";

/**
 * 氏名の一部 (姓 または 名)。
 *
 * `familyName` / `givenName` の語は OpenID Connect の標準クレーム、schema.org の
 * Person、vCard、HTML の autocomplete が揃って使っているもの。
 * `lastName` / `firstName` を採らないのは、姓が先に来る言語で成り立たないため。
 *
 * 姓と名で規則が同じなのでスキーマを共有する。
 */
export const PersonNameSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(50),
  v.description("氏名の一部 (姓 または 名)"),
  v.examples(["山田", "太郎"]),
);

export type PersonName = v.InferOutput<typeof PersonNameSchema>;
