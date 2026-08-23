import { defineConfig } from "drizzle-kit";

import { databaseUrl } from "./db/database-url.ts";

// drizzle-kit (migration 生成/適用) の設定。
// schema / out のパスはコマンド実行時の CWD (apps/backend) 基準で解決される点に注意。
export default defineConfig({
  // テーブル定義は所有するコンテキストの infrastructure に置く (集約と所有者を揃える)。
  // drizzle-kit は schema に glob を取れるため、分割しても migration は
  // 全テーブルをまとめて 1 系列 (out) で管理できる。
  schema: "./src/contexts/*/infrastructure/drizzle-schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  migrations: {
    // ファイル名の接頭辞を連番 (0000_) ではなくタイムスタンプにする。
    // 連番だとブランチを分けて作業したとき同じ番号が衝突するが、
    // タイムスタンプなら衝突しない。適用順は _journal.json の idx が持つ。
    prefix: "timestamp",
  },
  dbCredentials: {
    url: databaseUrl(),
  },
});
