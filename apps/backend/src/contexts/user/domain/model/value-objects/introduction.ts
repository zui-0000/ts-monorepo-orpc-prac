import * as v from "valibot";

/**
 * 自己紹介 (値オブジェクト / branded string)。1〜1000 文字。
 * 上限は方針であってデータ固有の制約ではないため DB では切らない (経緯は契約側)。
 */
export const IntroductionSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(1000),
  v.brand("User.Introduction"),
);

export type Introduction = v.InferOutput<typeof IntroductionSchema>;
