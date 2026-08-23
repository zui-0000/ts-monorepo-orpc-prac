import { Result } from "better-result";
import { sql } from "drizzle-orm";

import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import { MailAddressDuplicationError } from "~/shared/errors/mail-address-duplication-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";
import type { Database } from "~/shared/infrastructure/db/database-client.ts";
import { SqlState } from "~/shared/infrastructure/db/error/constants/sql-state.ts";
import { handleDbError } from "~/shared/infrastructure/db/error/handle-db-error.ts";
import { isSqlStateViolation } from "~/shared/infrastructure/db/error/postgres-error-reader.ts";

import { type User, UserSchema } from "../domain/model/user.ts";
import type { UserRepository } from "../domain/user-repository.ts";
import { tUser } from "./drizzle-schema.ts";

const MAIL_ADDRESS_UNIQUE_CONSTRAINT = "t_user_mail_address_lower_unique";

/**
 * 一意制約違反をドメインのエラーへ翻訳する (`.mapError` に渡す)。
 *
 * アプリ側の事前チェックをすり抜けた同時挿入は**ここが最後の砦**。普段は
 * `checkMailAddressDuplication` が先に弾くので、この経路は通常テストで踏めない。
 * **消しても壊れて見えない**類なので、消さないこと。
 *
 * 制約名まで見るのは、将来ほかの一意索引が増えたときに**別の違反を
 * メールアドレスの重複として報告しない**ため。
 */
const handleMailAddressDuplicationError = (
  error: RepositoryError,
): MailAddressDuplicationError | RepositoryError =>
  isSqlStateViolation(
    error.cause,
    SqlState.UniqueViolation,
    MAIL_ADDRESS_UNIQUE_CONSTRAINT,
  )
    ? new MailAddressDuplicationError()
    : error;

/**
 * 先頭行を集約へ復元する。**parse の失敗は throw** —
 * DB の行がドメインの制約を満たさないのは、書き込み側かマイグレーションのバグで、
 * 呼び出し側が回復できる失敗ではない。
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
          mailAddress: user.mailAddress,
          hashedPassword: user.hashedPassword,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }),
      )
    )
      .mapError(handleDbError)
      .mapError(handleMailAddressDuplicationError)
      .map(() => undefined),

  // 大小を無視して引く。保存は入力どおりで、同一性の判定だけ lower() で行う。
  // **DB 側の一意索引も lower() で張ってある** — 揃っていないと索引が効かない。
  findByMailAddress: async (mailAddress) =>
    (
      await Result.tryPromise(() =>
        db
          .select()
          .from(tUser)
          .where(sql`lower(${tUser.mailAddress}) = lower(${mailAddress})`)
          .limit(1),
      )
    )
      .mapError(handleDbError)
      .map(restoreUser),
});
