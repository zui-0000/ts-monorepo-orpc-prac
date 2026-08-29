import * as v from "valibot";

import type { Clock } from "~/shared/domain/clock.ts";

import { IntroductionSchema } from "./value-objects/introduction.ts";
import { PersonNameKanaSchema } from "./value-objects/person-name-kana.ts";
import { PersonNameSchema } from "./value-objects/person-name.ts";
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
  familyName: v.nullable(PersonNameSchema),
  givenName: v.nullable(PersonNameSchema),
  familyNameKana: v.nullable(PersonNameKanaSchema),
  givenNameKana: v.nullable(PersonNameKanaSchema),
  introduction: v.nullable(IntroductionSchema),
  updatedAt: v.date(),
});

export type UserProfile = v.InferOutput<typeof UserProfileSchema>;

/** 全置換したプロフィールを返す。契約が PUT なので「差し替える」操作として表現する。 */
export const replaceUserProfile = (
  deps: { readonly clock: Clock },
  params: Omit<UserProfile, "updatedAt">,
): UserProfile => ({ ...params, updatedAt: deps.clock.now() });
