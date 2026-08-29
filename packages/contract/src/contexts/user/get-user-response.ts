import * as v from "valibot";

import { EmailSchema } from "../../shared/model/index.js";
import {
  FamilyNameKanaSchema,
  FamilyNameSchema,
  GivenNameKanaSchema,
  GivenNameSchema,
  IntroductionSchema,
  UserNameSchema,
} from "./model/index.js";

/**
 * プロフィール。**未入力なら `null`。**
 *
 * 行そのものが無い状態を表す (遅延作成 / 設計関連/ADR-09)。項目をフラットに並べると
 * 「行が無い」と「空で入っている」が区別できないため、入れ子にしている。
 */
const ProfileSchema = v.object({
  familyName: v.nullable(FamilyNameSchema),
  givenName: v.nullable(GivenNameSchema),
  familyNameKana: v.nullable(FamilyNameKanaSchema),
  givenNameKana: v.nullable(GivenNameKanaSchema),
  introduction: v.nullable(IntroductionSchema),
});

/**
 * ユーザー取得のレスポンス。
 *
 * `name` と `email` は認証基盤が持つ値、`profile` はドメインが持つ値。
 * **書き込みの経路は別だが、読み取りは 1 回で返す** (CQRS の射影)。
 */
export const GetUserResponseSchema = v.object({
  name: UserNameSchema,
  email: EmailSchema,
  profile: v.nullable(ProfileSchema),
});

export type GetUserResponse = v.InferOutput<typeof GetUserResponseSchema>;
