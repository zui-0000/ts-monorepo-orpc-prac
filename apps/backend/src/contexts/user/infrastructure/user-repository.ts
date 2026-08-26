import { Result } from "better-result";
import { eq, sql } from "drizzle-orm";

import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import { EmailDuplicationError } from "~/shared/errors/email-duplication-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";
import type { Database } from "~/shared/infrastructure/db/database-client.ts";
import { SqlState } from "~/shared/infrastructure/db/error/constants/sql-state.ts";
import { handleDbError } from "~/shared/infrastructure/db/error/handle-db-error.ts";
import { isSqlStateViolation } from "~/shared/infrastructure/db/error/postgres-error-reader.ts";

import { type User, UserSchema } from "../domain/model/user.ts";
import type { UserRepository } from "../domain/user-repository.ts";
import { tUser } from "./drizzle-schema.ts";

const EMAIL_UNIQUE_INDEX = "t_user_email_lower_uidx";

/**
 * 一意制約違反をドメインのエラーへ翻訳する (`.mapError` に渡す)。
 */
const handleEmailDuplicationError = (
  error: RepositoryError,
): EmailDuplicationError | RepositoryError =>
  isSqlStateViolation(error.cause, SqlState.UniqueViolation, EMAIL_UNIQUE_INDEX)
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
  create: async (user) =>
    (
      await Result.tryPromise(() =>
        db.insert(tUser).values({
          id: user.id,
          name: user.name,
          email: user.email,
          hashedPassword: user.hashedPassword,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }),
      )
    )
      .mapError(handleDbError)
      .mapError(handleEmailDuplicationError)
      .map(() => undefined),

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

  updatePassword: async (user) =>
    (
      await Result.tryPromise(() =>
        db
          .update(tUser)
          .set({
            hashedPassword: user.hashedPassword,
            updatedAt: user.updatedAt,
          })
          .where(eq(tUser.id, user.id)),
      )
    )
      .mapError(handleDbError)
      .map(() => undefined),

  findById: async (id) =>
    (
      await Result.tryPromise(() =>
        db.select().from(tUser).where(eq(tUser.id, id)).limit(1),
      )
    )
      .mapError(handleDbError)
      .map(restoreUser),

  // 大小を無視して引く。保存は入力どおりで、同一性の判定だけ lower() で行う。
  // **DB 側の一意索引も lower() で張ってある** — 揃っていないと索引が効かない。
  findByEmail: async (email) =>
    (
      await Result.tryPromise(() =>
        db
          .select()
          .from(tUser)
          .where(sql`lower(${tUser.email}) = lower(${email})`)
          .limit(1),
      )
    )
      .mapError(handleDbError)
      .map(restoreUser),

  deleteById: async (id) =>
    (await Result.tryPromise(() => db.delete(tUser).where(eq(tUser.id, id))))
      .mapError(handleDbError)
      .map(() => undefined),
});
