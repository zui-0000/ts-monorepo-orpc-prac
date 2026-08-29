import * as v from "valibot";

/**
 * 自己紹介 (値オブジェクト / branded string)。1〜1000 文字。
 * 上限は方針であってデータ固有の制約ではないため DB では切らない (経緯は契約側)。
 *
 * **姓名と違い共有ドメインの素材を持たない。** `NamePart` を切ったのは姓と名という
 * 同じ規則の項目が 2 つあったからで、自己紹介は 1 つきりである。同じ規則を持つ
 * 項目が現れたら、そのとき素材へ切り出す。
 */
export const IntroductionSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(1000),
  v.brand("User.Introduction"),
);

export type Introduction = v.InferOutput<typeof IntroductionSchema>;
