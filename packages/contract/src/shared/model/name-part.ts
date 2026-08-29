import * as v from "valibot";

/**
 * 氏名の一部の書式 (姓・名などの構成要素)。**単体では使わない素材。**
 *
 * `PersonName` と呼ばないのは、それだとフルネームに読めるため。実際に入るのは
 * 姓か名という**一部**であり、vCard や OpenID Connect も姓名を分解した構成要素
 * (name components) として扱っている。
 *
 * 文字種を制限しないのは、表示のための名前であって識別子ではないため。
 */
export const NamePartSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(50),
);

export type NamePart = v.InferOutput<typeof NamePartSchema>;
