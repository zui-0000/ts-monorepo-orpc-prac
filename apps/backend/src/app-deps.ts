import { type UserDeps, userAdapters } from "~/contexts/user/user-deps.ts";
import { databaseUrl } from "~/shared/infrastructure/database-url.ts";
import { database } from "~/shared/infrastructure/db/database-client.ts";

/**
 * アプリケーションの合成ルート (composition root)。
 * 実装を組み立てるのはここと各 `<ctx>-deps.ts` だけ。
 * 接続 URL は起動時に検証する (未設定のまま Bun.sql へ渡すと既定の接続先へ流れるため)。
 */
export type AppDeps = UserDeps;

export const appDeps = (): AppDeps => {
  const db = database(databaseUrl());

  return {
    ...userAdapters(db),
  };
};
