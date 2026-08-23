import { getUserQueryService } from "~/contexts/user/infrastructure/get-user-query-service.ts";
import { databaseUrl } from "~/shared/infrastructure/database-url.ts";
import { database } from "~/shared/infrastructure/db/database-client.ts";

/**
 * 合成ルート。**実装を知ってよいのはここだけ。**
 *
 * ポート (application が定義した型) に実装 (infrastructure) を結線する。
 * 接続 URL の検証は起動時に済ませる — 未設定のまま Bun.sql へ渡すと
 * エラーにならず既定の接続先へフォールバックするため。
 */
const db = database(databaseUrl());

export const appDeps = {
  getUserQueryService: getUserQueryService(db),
} as const;
