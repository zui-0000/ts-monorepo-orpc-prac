import {
  foreignKey,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { tUser } from "./auth.ts";

/**
 * 利用者のプロフィール。**ドメインが唯一書いてよいテーブル** (設計関連/ADR-09)。
 *
 * `auth` スキーマ側 (better-auth の所有物) とは名前空間で分かれている。
 * プロフィール項目が増えてもこちらだけが太る。
 *
 * **行はサインアップ時に作らない (遅延作成)。** 利用者がプロフィールを入力したとき
 * 初めて INSERT する。better-auth の `create.after` フックはコミット後に走るため、
 * 即時作成では「利用者は作られたがプロフィールが無い」窓を塞げない。
 * 遅延作成ならその窓が構造的に存在しない。
 */
export const tUserProfile = pgTable(
  "t_user_profile",
  {
    // 主キー兼外部キー。1 利用者に 1 行 (0 行のこともある)。
    userId: uuid("user_id").primaryKey(),
    // 姓。遅延作成なので「姓だけ入れて名は後で」を許す。
    familyName: text("family_name"),
    // 名。
    givenName: text("given_name"),
    // 作成日時 (= 初めてプロフィールを入力した時刻)。
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // 更新日時。ドメインが値を書くため $onUpdate は付けない。
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "t_user_profile_user_id_fkey",
      columns: [table.userId],
      foreignColumns: [tUser.id],
    }).onDelete("cascade"),
  ],
);
