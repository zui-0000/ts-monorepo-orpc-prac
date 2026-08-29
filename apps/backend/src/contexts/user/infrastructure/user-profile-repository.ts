import { Result } from "better-result";

import type { Database } from "~/shared/infrastructure/db/database-client.ts";
import { handleDbError } from "~/shared/infrastructure/db/error/handle-db-error.ts";
import { tUserProfile } from "~/shared/infrastructure/db/schema/index.ts";

import type { UserProfileRepository } from "../domain/user-profile-repository.ts";

/**
 * UserProfileRepository の Drizzle 実装 (アダプタ)。
 */
export const userProfileRepository = (db: Database): UserProfileRepository => ({
  // 行が無ければ作り、あれば置き換える。**created_at は更新側に含めない** —
  // 初回の INSERT で DB の DEFAULT が入り、以降は触らせない。
  save: async (profile) =>
    (
      await Result.tryPromise(() =>
        db
          .insert(tUserProfile)
          .values({
            userId: profile.userId,
            familyName: profile.familyName,
            givenName: profile.givenName,
            familyNameKana: profile.familyNameKana,
            givenNameKana: profile.givenNameKana,
            introduction: profile.introduction,
            updatedAt: profile.updatedAt,
          })
          .onConflictDoUpdate({
            target: tUserProfile.userId,
            set: {
              familyName: profile.familyName,
              givenName: profile.givenName,
              familyNameKana: profile.familyNameKana,
              givenNameKana: profile.givenNameKana,
              introduction: profile.introduction,
              updatedAt: profile.updatedAt,
            },
          }),
      )
    )
      .mapError(handleDbError)
      .map(() => undefined),
});
