import type { Clock } from "~/shared/domain/clock.ts";
import type { PasswordHasher } from "~/shared/domain/password-hasher.ts";
import type { UuidGenerator } from "~/shared/domain/uuid-generator.ts";
import { clock } from "~/shared/infrastructure/clock.ts";
import type { Database } from "~/shared/infrastructure/db/database-client.ts";
import { passwordHasher } from "~/shared/infrastructure/password-hasher.ts";
import { uuidGenerator } from "~/shared/infrastructure/uuid-generator.ts";

import type { GetUserQueryService } from "./application/get-user-query.ts";
import type { UserRepository } from "./domain/user-repository.ts";
import { getUserQueryService } from "./infrastructure/get-user-query-service.ts";
import { userRepository } from "./infrastructure/user-repository.ts";

/** user コンテキストを動かすのに必要なもの (要求側の宣言)。 */
export type UserDeps = {
  readonly getUserQueryService: GetUserQueryService;
  readonly userRepository: UserRepository;
  readonly passwordHasher: PasswordHasher;
  readonly uuidGenerator: UuidGenerator;
  readonly clock: Clock;
};

/** ポートに実装を結線する (合成ルートの一部)。 */
export const userAdapters = (db: Database): UserDeps => ({
  getUserQueryService: getUserQueryService(db),
  userRepository: userRepository(db),
  clock,
  uuidGenerator,
  passwordHasher,
});
