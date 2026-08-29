import { type Auth, auth } from "~/contexts/auth/infrastructure/auth.ts";
import { userAdapters } from "~/contexts/user/user-adapters.ts";
import type { UserDeps } from "~/contexts/user/user-deps.ts";
import { databaseUrl } from "~/shared/infrastructure/database-url.ts";
import { database } from "~/shared/infrastructure/db/database-client.ts";

/**
 * アプリケーションの合成ルート (composition root)。
 * 実装を組み立てるのはここと各 `<ctx>-adapters.ts` だけ。
 * 接続 URL は起動時に検証する (未設定のまま Bun.sql へ渡すと既定の接続先へ流れるため)。
 */
/**
 * auth コンテキストのインスタンスは `UserDeps` に混ぜない。
 * あちらは**ポートだけを並べた要求の宣言**で、presentation が型のために読む。
 * 第三者のインスタンスを混ぜると、その経路から実装へ到達できてしまう。
 */
export type AppDeps = UserDeps & { readonly auth: Auth };

export const appDeps = (): AppDeps => {
  const db = database(databaseUrl());

  return {
    ...userAdapters(db),
    auth: auth(db),
  };
};
