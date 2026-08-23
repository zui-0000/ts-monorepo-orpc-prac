import type { Clock } from "~/shared/domain/clock.ts";
import type { PasswordHasher } from "~/shared/domain/password-hasher.ts";
import type { UuidGenerator } from "~/shared/domain/uuid-generator.ts";

import type { GetUserQueryService } from "./application/get-user-query.ts";
import type { UserRepository } from "./domain/user-repository.ts";

/**
 * user コンテキストを動かすのに必要なもの (要求側の宣言)。
 * ポートしか import しない。実装 (infrastructure) を知るのは合成ルート
 */
export type UserDeps = {
  readonly getUserQueryService: GetUserQueryService;
  readonly userRepository: UserRepository;
  readonly passwordHasher: PasswordHasher;
  readonly uuidGenerator: UuidGenerator;
  readonly clock: Clock;
};
