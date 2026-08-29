import { Result } from "better-result";
import { eq } from "drizzle-orm";

import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import { EmailDuplicationError } from "~/shared/errors/email-duplication-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";
import type { Database } from "~/shared/infrastructure/db/database-client.ts";
import { SqlState } from "~/shared/infrastructure/db/error/constants/sql-state.ts";
import { handleDbError } from "~/shared/infrastructure/db/error/handle-db-error.ts";
import { isSqlStateViolation } from "~/shared/infrastructure/db/error/postgres-error-reader.ts";

import { type User, UserSchema } from "../domain/model/user.ts";
import type { UserRepository } from "../domain/user-repository.ts";
import { tUser } from "./auth-drizzle-schema.ts";

// DB が一意違反で返す制約名。drizzle スキーマの unique() と揃えること
// (命名関連/ADR-03)。ズレると 409 が 500 に化ける。
const EMAIL_UNIQUE_CONSTRAINT = "t_user_email_key";

/**
 * 一意制約違反をドメインのエラーへ翻訳する (`.mapError` に渡す)。
 */
const handleEmailDuplicationError = (
  error: RepositoryError,
): EmailDuplicationError | RepositoryError =>
  isSqlStateViolation(
    error.cause,
    SqlState.UniqueViolation,
    EMAIL_UNIQUE_CONSTRAINT,
  )
    ? new EmailDuplicationError()
    : error;

/**
 * 先頭行を集約へ復元する。
 */
const restoreUser = (
  rows: readonly (typeof tUser.$inferSelect)[],
): User | undefined => {
  const row = rows[0];
  return row === undefined ? undefined : parseInvariant(UserSchema, row);
};

/**
 * UserRepository の Drizzle 実装 (アダプタ)。
 */
export const userRepository = (db: Database): UserRepository => ({
  updateProfile: async (user) =>
    (
      await Result.tryPromise(() =>
        db
          .update(tUser)
          .set({
            name: user.name,
            email: user.email,
            updatedAt: user.updatedAt,
          })
          .where(eq(tUser.id, user.id)),
      )
    )
      .mapError(handleDbError)
      .mapError(handleEmailDuplicationError)
      .map(() => undefined),

  findById: async (id) =>
    (
      await Result.tryPromise(() =>
        db.select().from(tUser).where(eq(tUser.id, id)).limit(1),
      )
    )
      .mapError(handleDbError)
      .map(restoreUser),

  deleteById: async (id) =>
    (await Result.tryPromise(() => db.delete(tUser).where(eq(tUser.id, id))))
      .mapError(handleDbError)
      .map(() => undefined),
});
