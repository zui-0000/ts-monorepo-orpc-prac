import {
  boolean,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { authSchema } from "./namespace.ts";

/**
 * 利用者。**行を作るのは better-auth** で、こちらはプロフィールの更新と読み取りだけを行う。
 */
export const tUser = authSchema.table(
  "t_user",
  {
    // 主キー。better-auth が UUIDv7 で採番する (設計関連/ADR-07)。
    id: uuid("id").primaryKey(),
    // 表示名。Google 由来の値が入るため DB 側で長さを切らない (上限は契約側)。
    name: text("name").notNull(),
    // better-auth が小文字化して保存し、素の = で引く。255 は RFC 5321 の上限相当。
    email: varchar("email", { length: 255 }).notNull(),
    // メール検証が済んだか。better-auth が検証完了時に true へ書き換える。
    emailVerified: boolean("is_email_verified").notNull().default(false),
    // プロフィール画像の URL。OAuth のプロフィール由来のほか、サインアップ時の
    // 指定や更新でも入る。Google 専用ではない。
    image: text("image_url"),
    // 作成日時。better-auth が値を書く。
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // 更新日時。better-auth が更新のたびに書き直す。
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique("t_user_email_key").on(table.email)],
);
