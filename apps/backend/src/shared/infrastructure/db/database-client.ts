import { drizzle } from "drizzle-orm/bun-sql";

import * as schema from "./schema/index.ts";

/**
 * 接続を張る。**URL の検証は呼び出し側 (合成ルート) の仕事。**
 *
 * `Bun.sql` は未設定の URL をエラーにせず既定の接続先へフォールバックするため、
 * 設定漏れが「起動しない」ではなく「**別の DB に繋がる**」に化ける。
 * だから起動時に読んで検証しきる (`main.ts`)。
 *
 * **スキーマを渡すのは `db.query` (リレーショナルクエリ) を生やすため。**
 * better-auth のアダプタも `db.query` を見るが、使うのは `joins` を有効にした
 * ときだけで、既定は無効なので挙動は変わらない (実測)。
 */
export const database = (url: string) => drizzle(url, { schema });

/**
 * Drizzle のクライアント。アダプタはこの型だけを知る (ドライバは隠す)。
 *
 * `BunSQLDatabase` を直に書かないのは、`$client` (接続を閉じる口) が
 * `drizzle()` の戻り値にしか生えていないため。
 */
export type Database = ReturnType<typeof database>;

/** 接続を閉じる (終了時)。 */
export const closeDatabase = async (db: Database): Promise<void> => {
  await db.$client.close();
};
