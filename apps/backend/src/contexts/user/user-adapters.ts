import { clock } from "~/shared/infrastructure/clock.ts";
import type { Database } from "~/shared/infrastructure/db/database-client.ts";

import { getUserQueryService } from "./infrastructure/get-user-query-service.ts";
import { userRepository } from "./infrastructure/user-repository.ts";
import type { UserDeps } from "./user-deps.ts";

/**
 * user コンテキストのポートに実装を結線する (合成ルートの一部)。
 * どの実装を使うかを所有者の隣に置く。
 */
export const userAdapters = (db: Database): UserDeps => ({
  getUserQueryService: getUserQueryService(db),
  userRepository: userRepository(db),
  clock,
});
