import { Result } from "better-result";
import { eq } from "drizzle-orm";

import type { Database } from "~/shared/infrastructure/db/database-client.ts";
import { handleDbError } from "~/shared/infrastructure/db/error/handle-db-error.ts";
import { tUser } from "~/shared/infrastructure/db/schema/index.ts";

import type { GetUserQueryService } from "../application/get-user-query.ts";

/**
 * GetUserQueryService の Drizzle 実装 (アダプタ)。
 *
 * **リレーショナルクエリ (`db.query`) で引く。** 手で LEFT JOIN を書くと、
 * プロフィールの行が無い場合も列が `null` で埋まって返るため、
 * **「行が無い」と「項目がすべて空」を見分けるのに主キーを余分に引く**必要があった。
 * `with` なら行が無い側は `null` で返るので、判定のための列が要らない。
 *
 * **認証基盤のテーブルを読んでいるが、書いてはいない。** 読み取りが他所の
 * テーブルを直接引くのは CQRS の射影として認めた形 (設計関連/ADR-09, ADR-10)。
 */
export const getUserQueryService = (db: Database): GetUserQueryService => ({
  execute: async ({ id }) =>
    (
      await Result.tryPromise(() =>
        db.query.tUser.findFirst({
          columns: { name: true, email: true },
          with: {
            profile: {
              columns: {
                familyName: true,
                givenName: true,
                familyNameKana: true,
                givenNameKana: true,
                introduction: true,
              },
            },
          },
          where: eq(tUser.id, id),
        }),
      )
    ).mapError(handleDbError),
});
