import type { Result } from "better-result";

import type { Email } from "~/shared/domain/model/value-objects/email.ts";
import type { EmailDuplicationError } from "~/shared/errors/email-duplication-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";

import type { User } from "./model/user.ts";
import type { UserId } from "./model/value-objects/user-id.ts";

/**
 * User 集約の永続化ポート (書き込み側 / CQRS のコマンド経路)。
 * 読み取り専用の経路はここに来ない (集約を復元せず必要な列だけ引く)。
 */
export type UserRepository = {
  readonly create: (
    user: User,
  ) => Promise<Result<void, EmailDuplicationError | RepositoryError>>;
  /** 名前とメールアドレスだけを書く。 */
  readonly updateProfile: (
    user: User,
  ) => Promise<Result<void, EmailDuplicationError | RepositoryError>>;
  /** ハッシュ済みパスワードだけを書く。メールを書かないので重複は起きない。 */
  readonly updatePassword: (
    user: User,
  ) => Promise<Result<void, RepositoryError>>;
  readonly findById: (
    id: UserId,
  ) => Promise<Result<User | undefined, RepositoryError>>;
  readonly findByEmail: (
    email: Email,
  ) => Promise<Result<User | undefined, RepositoryError>>;
  readonly deleteById: (id: UserId) => Promise<Result<void, RepositoryError>>;
};
