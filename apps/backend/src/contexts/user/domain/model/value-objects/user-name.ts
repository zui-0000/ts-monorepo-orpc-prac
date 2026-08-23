import * as v from "valibot";

/**
 * ユーザー名 (値オブジェクト / branded string)。1〜100 文字。
 * 上限は保存先 `t_user.name` の varchar(100) と揃える。
 */
export const UserNameSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(100),
  v.brand("User.Name"),
);

export type UserName = v.InferOutput<typeof UserNameSchema>;
