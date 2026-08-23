import { EnvName } from "../src/shared/infrastructure/env-name.ts";

/**
 * 接続情報を環境変数から読む。未設定なら throw する。
 *
 * **非 null 断言 (`process.env.DATABASE_URL!`) では足りない。** 未設定のまま Bun へ渡すと、
 * Bun.sql はエラーにせず**既定の接続先へフォールバックする** — localhost:5432 に
 * OS ユーザー名で繋ぎにいく。つまり設定漏れが「起動しない」ではなく
 * 「**別の DB に繋がる**」に化ける。ローカルに trust 認証の Postgres が居れば、
 * 意図しない DB にマイグレーションが当たる。しかも表に出るのは
 * `Failed query: CREATE SCHEMA IF NOT EXISTS "drizzle"` で、環境変数の話が一言も出てこない。
 */
export const databaseUrl = (): string => {
  const url = process.env[EnvName.DatabaseUrl];
  if (url === undefined || url === "") {
    throw new Error(
      `${EnvName.DatabaseUrl} が設定されていません。` +
        ".env を確認してください (未設定のまま進むと既定の接続先へ繋ぎにいきます)。",
    );
  }
  return url;
};
