import * as v from "valibot";

import {
  FamilyNameKanaSchema,
  FamilyNameSchema,
  GivenNameKanaSchema,
  GivenNameSchema,
  IntroductionSchema,
} from "./model/index.js";

/**
 * プロフィールの更新リクエスト。
 *
 * **`name` と `email` は含めない。** どちらも認証基盤 (better-auth) の所有物で、
 * 直接書くと不変条件を壊す (設計関連/ADR-09)。表示名は `/api/auth/update-user`、
 * メールアドレスは `/api/auth/change-email` が受け持つ。
 *
 * **すべて `null` を許す。** PUT は全置換なので、`null` は「その項目を空にする」を
 * 意味する。プロフィールは遅延作成のため「姓だけ入れて名は後で」も成り立つ。
 */
export const UpdateUserRequestSchema = v.object({
  familyName: v.nullable(FamilyNameSchema),
  givenName: v.nullable(GivenNameSchema),
  familyNameKana: v.nullable(FamilyNameKanaSchema),
  givenNameKana: v.nullable(GivenNameKanaSchema),
  introduction: v.nullable(IntroductionSchema),
});

export type UpdateUserRequest = v.InferOutput<typeof UpdateUserRequestSchema>;
