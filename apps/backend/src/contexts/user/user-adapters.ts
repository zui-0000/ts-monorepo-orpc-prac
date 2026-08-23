import type { Database } from "~/shared/infrastructure/db/database-client.ts";

import { getUserQueryService } from "./infrastructure/get-user-query-service.ts";
import type { UserDeps } from "./user-deps.ts";

/**
 * user コンテキストのポートに実装を結線する (合成ルートの一部)。
 *
 * **どの実装を使うかを所有者の隣に置く。** app-deps.ts に集めると、
 * コンテキストが増えるたびにあちらが膨らみ、user の都合を user の外が
 * 知ることになる。
 */
export const userAdapters = (db: Database): UserDeps => ({
  getUserQueryService: getUserQueryService(db),
});
