import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";

import { databaseUrl } from "../src/shared/infrastructure/database-url.ts";

// マイグレーション適用スクリプト。
// drizzle-kit の migrate は Bun ネイティブ SQL ドライバに非対応 (pg/postgres.js 等を要求) のため、
// アプリと同じ drizzle-orm/bun-sql のランタイムマイグレータで適用する。
const db = drizzle(databaseUrl());

// **drizzle-kit は pgSchema に対して CREATE SCHEMA を出さない** (実測)。
// 生成される SQL は CREATE TABLE "auth"."t_user" から始まるため、先に作っておかないと
// schema "auth" does not exist で落ちる。生成のたびに消えるので migration 側では
// なくここに置く。名前空間で所有者を表す判断は 設計関連/ADR-09。
await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "auth"`);

await migrate(db, { migrationsFolder: "./db/migrations" });

console.log("✅ migrations applied");
process.exit(0);
