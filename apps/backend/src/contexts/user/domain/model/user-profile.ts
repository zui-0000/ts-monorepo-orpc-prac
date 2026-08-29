import * as v from "valibot";

import type { Clock } from "~/shared/domain/clock.ts";

import { FamilyNameKanaSchema } from "./value-objects/family-name-kana.ts";
import { FamilyNameSchema } from "./value-objects/family-name.ts";
import { GivenNameKanaSchema } from "./value-objects/given-name-kana.ts";
import { GivenNameSchema } from "./value-objects/given-name.ts";
import { IntroductionSchema } from "./value-objects/introduction.ts";
import { UserIdSchema } from "./value-objects/user-id.ts";

/**
 * UserProfile 集約ルート。**ドメインが唯一書ける状態** (設計関連/ADR-09)。
 *
 * 表示名とメールアドレスは認証基盤 (better-auth) の持ち物なのでここには無い。
 *
 * **項目はすべて `null` を取りうる。** 行そのものが遅延作成されるうえ、
 * 「姓だけ入れて名は後で」も成り立つため。
 *
 * `createdAt` を持たないのは、値をドメインが決めないから。行が無ければ INSERT 時に
 * DB の `DEFAULT now()` が入り、あれば upsert が触らない。**業務の状態ではない。**
 */
export const UserProfileSchema = v.object({
  userId: UserIdSchema,
  familyName: v.nullable(FamilyNameSchema),
  givenName: v.nullable(GivenNameSchema),
  familyNameKana: v.nullable(FamilyNameKanaSchema),
  givenNameKana: v.nullable(GivenNameKanaSchema),
  introduction: v.nullable(IntroductionSchema),
  updatedAt: v.date(),
});

export type UserProfile = v.InferOutput<typeof UserProfileSchema>;

/** 全置換したプロフィールを返す。契約が PUT なので「差し替える」操作として表現する。 */
export const replaceUserProfile = (
  deps: { readonly clock: Clock },
  params: Omit<UserProfile, "updatedAt">,
): UserProfile => ({ ...params, updatedAt: deps.clock.now() });
