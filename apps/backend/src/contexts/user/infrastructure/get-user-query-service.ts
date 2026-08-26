import { Result } from "better-result";
import { eq } from "drizzle-orm";

import type { Database } from "~/shared/infrastructure/db/database-client.ts";
import { handleDbError } from "~/shared/infrastructure/db/error/handle-db-error.ts";

import type { GetUserQueryService } from "../application/get-user-query.ts";
import { tUser } from "./drizzle-schema.ts";

/**
 * GetUserQueryService の Drizzle 実装 (アダプタ)。
 */
export const getUserQueryService = (db: Database): GetUserQueryService => ({
  execute: async ({ id }) =>
    (
      await Result.tryPromise(() =>
        db
          .select({ name: tUser.name, email: tUser.email })
          .from(tUser)
          .where(eq(tUser.id, id))
          .limit(1),
      )
    )
      .mapError(handleDbError)
      .map((rows) => rows[0]),
});
