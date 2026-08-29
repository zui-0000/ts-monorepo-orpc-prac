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
 * 認証方式ごとの紐づけ。1 人が複数持てる (メール+パスワード / Google のアカウント連携)。
 * `providerId` が方式を、`(issuer, accountId)` が発行者側での同一性を表す。
 */
export const tAccount = authSchema.table(
  "t_account",
  {
    // 主キー。better-auth が UUIDv7 で採番する。
    id: uuid("id").primaryKey(),
    // 発行者。Google は https://accounts.google.com、メール+パスワードは local:credential。
    issuer: text("issuer").notNull(),
    // 発行者側の識別子 (Google の sub)。t_account.id とは別物。
    accountId: text("provider_account_id").notNull(),
    // 認証方式。"credential" (メール+パスワード) または "google"。
    providerId: text("provider_id").notNull(),
    // 所有者。1 人が複数の認証方式を持てる (アカウント連携)。
    userId: uuid("user_id").notNull(),
    // OAuth のアクセストークン。メール+パスワードでは NULL。
    accessToken: text("access_token"),
    // OAuth のリフレッシュトークン。メール+パスワードでは NULL。
    refreshToken: text("refresh_token"),
    // OIDC の ID トークン。メール+パスワードでは NULL。
    idToken: text("id_token"),
    // アクセストークンの失効時刻。
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    // リフレッシュトークンの失効時刻。
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    // 許諾済みの OAuth スコープ。カンマ区切りで、直近のトークンではなく累積の許諾を持つ。
    scope: text("scope"),
    // argon2id のハッシュ (設計関連/ADR-08)。providerId が "credential" のときだけ入る。
    password: text("password_hash"),
    // 作成日時 (= この認証方式を紐づけた時刻)。
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // 更新日時。better-auth がトークン更新のたびに書き直す。
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("t_account_issuer_provider_account_id_key").on(
      table.issuer,
      table.accountId,
    ),
    index("t_account_user_id_idx").on(table.userId),
    foreignKey({
      name: "t_account_user_id_fkey",
      columns: [table.userId],
      foreignColumns: [tUser.id],
    }).onDelete("cascade"),
  ],
);
