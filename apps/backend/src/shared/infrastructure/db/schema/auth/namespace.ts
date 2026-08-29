import { pgSchema } from "drizzle-orm/pg-core";

/**
 * better-auth の所有物であることを名前空間で表す (設計関連/ADR-09)。
 *
 * この名前空間のテーブルは**自前のコマンドが書かない。** 読み取りは射影として
 * 認めているが、書き込みは better-auth の API を通す。
 */
export const authSchema = pgSchema("auth");
