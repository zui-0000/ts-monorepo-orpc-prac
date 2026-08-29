import {
  foreignKey,
  index,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { authSchema } from "./namespace.ts";
import { tUser } from "./t-user.ts";

/**
 * サインイン中のセッション。Cookie に載る `token` から引く (`id` からではない)。
 */
export const tSession = authSchema.table(
  "t_session",
  {
    // 主キー。better-auth が UUIDv7 で採番する。**秘密ではない**。
    id: uuid("id").primaryKey(),
    // セッションの秘密。Cookie に載る。行の id とは別に CSPRNG で 32 文字を採番する。
    token: text("token").notNull(),
    // セッションの有効期限。better-auth が期限切れを判定する。
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // 発行時のクライアント IP。プロキシ構成次第で伸びるため長さを切らない。
    ipAddress: text("ip_address"),
    // 発行時の User-Agent。セッション一覧を人に見せるときに使う。
    userAgent: text("user_agent"),
    // 所有者。利用者の削除に追随して消える (CASCADE)。
    userId: uuid("user_id").notNull(),
    // 作成日時 (= サインインした時刻)。
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // 更新日時。better-auth がセッション延長のたびに書き直す。
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("t_session_token_key").on(table.token),
    index("t_session_user_id_idx").on(table.userId),
    foreignKey({
      name: "t_session_user_id_fkey",
      columns: [table.userId],
      foreignColumns: [tUser.id],
    }).onDelete("cascade"),
  ],
);
