import * as v from "valibot";

/** エラーの表題 (何が起きたかを 1 行で表す) */
export const ErrorTitleSchema = v.pipe(
  v.string(),
  v.description("エラーの表題"),
  v.examples(["リクエスト内容が不正です"]),
);

export type ErrorTitle = v.InferOutput<typeof ErrorTitleSchema>;
