import type { Clock } from "~/shared/domain/clock.ts";

import type { GetUserQueryService } from "./application/get-user-query.ts";
import type { UserProfileRepository } from "./domain/user-profile-repository.ts";

/**
 * user コンテキストを動かすのに必要なもの (要求側の宣言)。
 * **ポートしか import しない。** 結線まで持つと、presentation が型のために
 * ここを読んだ瞬間、全アダプタへ経路が通る (no-indirect-path-to-impl)。
 */
export type UserDeps = {
  readonly getUserQueryService: GetUserQueryService;
  readonly userProfileRepository: UserProfileRepository;
  readonly clock: Clock;
};
