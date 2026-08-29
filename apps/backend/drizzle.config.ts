import { defineConfig } from "drizzle-kit";

import { databaseUrl } from "./src/shared/infrastructure/database-url.ts";

// drizzle-kit (migration 生成/適用) の設定。
// schema / out のパスはコマンド実行時の CWD (apps/backend) 基準で解決される点に注意。
export default defineConfig({
  // テーブル定義は共有基盤に集約する (設計関連/ADR-10)。目次となる index.ts を
  // 指すだけでよい。glob にすると index.ts と各ファイルが二重に読まれる。
  //
  // 集めているのは物理的な定義だけで、集約・リポジトリはコンテキストに残る。
  // **共有されていることは「誰でも書いてよい」を意味しない** (設計関連/ADR-09)。
  schema: "./src/shared/infrastructure/db/schema/index.ts",
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
