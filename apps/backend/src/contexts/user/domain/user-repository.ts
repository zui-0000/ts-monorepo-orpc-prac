import type { Result } from "better-result";

import type { MailAddress } from "~/shared/domain/model/value-objects/mail-address.ts";
import type { MailAddressDuplicationError } from "~/shared/errors/mail-address-duplication-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";

import type { User } from "./model/user.ts";

/**
 * User 集約の永続化ポート (書き込み側 / CQRS のコマンド経路)。
 *
 * **読み取り専用の経路はここに来ない。** 一覧や単票の取得は集約を復元せず
 * 必要な列だけを引く (`GetUserQueryService`)。ここに現れる `findByMailAddress` は
 * 重複検証という**書き込みの前提**を満たすためのもので、集約を丸ごと返す。
 *
 * **今あるのは create が必要とする 2 つだけ。** 更新・削除はそのユースケースを
 * 移す段で足す (`updateProfile` / `updatePassword` / `findById` / `deleteById`)。
 */
export type UserRepository = {
  readonly create: (
    user: User,
  ) => Promise<Result<void, MailAddressDuplicationError | RepositoryError>>;
  readonly findByMailAddress: (
    mailAddress: MailAddress,
  ) => Promise<Result<User | undefined, RepositoryError>>;
};
