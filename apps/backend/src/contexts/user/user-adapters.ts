import { clock } from "~/shared/infrastructure/clock.ts";
import type { Database } from "~/shared/infrastructure/db/database-client.ts";

import { getUserQueryService } from "./infrastructure/get-user-query-service.ts";
import { userProfileRepository } from "./infrastructure/user-profile-repository.ts";
import type { UserDeps } from "./user-deps.ts";

/**
 * user コンテキストのポートに実装を結線する (合成ルートの一部)。
 * どの実装を使うかを所有者の隣に置く。
 */
export const userAdapters = (db: Database): UserDeps => ({
  getUserQueryService: getUserQueryService(db),
  userProfileRepository: userProfileRepository(db),
  clock,
});
