import * as v from "valibot";

/** ユーザー名 */
export const UserNameSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(100),
  v.description("ユーザー名"),
  v.examples(["山田太郎"]),
);

export type UserName = v.InferOutput<typeof UserNameSchema>;
