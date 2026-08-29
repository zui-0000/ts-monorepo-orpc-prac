import type { Result } from "better-result";

import type { RepositoryError } from "~/shared/errors/repository-error.ts";

import type { UserProfile } from "./model/user-profile.ts";

/**
 * UserProfile 集約の永続化ポート (書き込み側 / CQRS のコマンド経路)。
 *
 * `create` と `update` を分けないのは**行が遅延作成される**ため。呼ぶ側からは
 * 「この状態にする」の一手しかなく、行の有無で分岐する必要が無い。
 */
export type UserProfileRepository = {
  /** 行が無ければ作り、あれば置き換える。 */
  readonly save: (
    profile: UserProfile,
  ) => Promise<Result<void, RepositoryError>>;
};
