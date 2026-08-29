import { Result } from "better-result";
import { eq } from "drizzle-orm";

import type { Database } from "~/shared/infrastructure/db/database-client.ts";
import { handleDbError } from "~/shared/infrastructure/db/error/handle-db-error.ts";
import {
  tUser,
  tUserProfile,
} from "~/shared/infrastructure/db/schema/index.ts";

import type {
  GetUserQueryOutput,
  GetUserQueryService,
} from "../application/get-user-query.ts";

type Row = {
  name: string;
  email: string;
  profile: {
    familyName: string | null;
    givenName: string | null;
    familyNameKana: string | null;
    givenNameKana: string | null;
    introduction: string | null;
  } | null;
};

/**
 * プロフィールの行が無ければ `profile` を `null` に畳む。
 *
 * LEFT JOIN は列を `null` で埋めて返すため、**行が無い**のか
 * **項目が空で入っている**のかを列だけでは見分けられない。主キーである
 * `user_id` が `null` かどうかで判定する。
 */
const toOutput = (
  row: Row & { profileUserId: string | null },
): GetUserQueryOutput => ({
  name: row.name,
  email: row.email,
  profile: row.profileUserId === null ? null : row.profile,
});

/**
 * GetUserQueryService の Drizzle 実装 (アダプタ)。
 *
 * **認証基盤のテーブルを読んでいるが、書いてはいない。** 読み取りが他所の
 * テーブルを直接引くのは CQRS の射影として認めた形 (設計関連/ADR-09, ADR-10)。
 */
export const getUserQueryService = (db: Database): GetUserQueryService => ({
  execute: async ({ id }) =>
    (
      await Result.tryPromise(() =>
        db
          .select({
            name: tUser.name,
            email: tUser.email,
            profileUserId: tUserProfile.userId,
            profile: {
              familyName: tUserProfile.familyName,
              givenName: tUserProfile.givenName,
              familyNameKana: tUserProfile.familyNameKana,
              givenNameKana: tUserProfile.givenNameKana,
              introduction: tUserProfile.introduction,
            },
          })
          .from(tUser)
          .leftJoin(tUserProfile, eq(tUserProfile.userId, tUser.id))
          .where(eq(tUser.id, id))
          .limit(1),
      )
    )
      .mapError(handleDbError)
      .map((rows) => {
        const row = rows[0];
        return row === undefined ? undefined : toOutput(row);
      }),
});
