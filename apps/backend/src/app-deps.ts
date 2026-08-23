import { userAdapters } from "~/contexts/user/user-adapters.ts";
import type { UserDeps } from "~/contexts/user/user-deps.ts";
import { databaseUrl } from "~/shared/infrastructure/database-url.ts";
import { database } from "~/shared/infrastructure/db/database-client.ts";

/**
 * アプリケーションの合成ルート (composition root)。
 *
 * 実装を組み立てるのは合成ルートだけ — このファイルと、各所有者が持つ
 * `<ctx>-adapters.ts` の一群を指す。domain / application / presentation は
 * ポート (型) しか知らない。
 *
 * 接続 URL の検証は起動時に済ませる — 未設定のまま Bun.sql へ渡すと
 * エラーにならず既定の接続先へフォールバックするため。
 */
export type AppDeps = UserDeps;

export const appDeps = (): AppDeps => {
  const db = database(databaseUrl());

  return {
    ...userAdapters(db),
  };
};
