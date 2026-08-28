import type { Result } from "better-result";

import type { EmailDuplicationError } from "~/shared/errors/email-duplication-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";

import type { User } from "./model/user.ts";
import type { UserId } from "./model/value-objects/user-id.ts";

/**
 * User 集約の永続化ポート (書き込み側 / CQRS のコマンド経路)。
 * 読み取り専用の経路はここに来ない (集約を復元せず必要な列だけ引く)。
 *
 * 行の生成は better-auth が持つため `create` は無い (設計関連/ADR-07)。
 */
export type UserRepository = {
  /** 名前とメールアドレスだけを書く。 */
  readonly updateProfile: (
    user: User,
  ) => Promise<Result<void, EmailDuplicationError | RepositoryError>>;
  readonly findById: (
    id: UserId,
  ) => Promise<Result<User | undefined, RepositoryError>>;
  readonly deleteById: (id: UserId) => Promise<Result<void, RepositoryError>>;
};
