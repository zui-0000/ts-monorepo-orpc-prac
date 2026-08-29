import * as v from "valibot";

/**
 * 自己紹介。
 *
 * `bio` (biography の略) は Web サービスで一般的だが、略語を知らないと読めないため
 * 語をそのまま使う。上限は方針であってデータ固有の制約ではないので、DB ではなく
 * ここで持つ (変更に migration が要らない)。
 */
export const IntroductionSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(1000),
  v.description("自己紹介"),
  v.examples(["フロントエンドを書いています。"]),
);

export type Introduction = v.InferOutput<typeof IntroductionSchema>;
