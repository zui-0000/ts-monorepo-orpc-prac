import { index, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { authSchema } from "./namespace.ts";

/**
 * 一時データの置き場 (**TTL 付きの Key-Value ストア**)。
 *
 * better-auth が用途を問わず使い回すため、`identifier` と `value` の中身は
 * 用途ごとに変わる。**どちらも単一の具体名を付けられない。**
 *
 * | 用途               | identifier               | value               | TTL     |
 * | ------------------ | ------------------------ | ------------------- | ------- |
 * | Google サインイン  | `<state>`                | JSON (state 情報)   | 10 分   |
 * | パスワードリセット | `reset-password:<token>` | ユーザー ID         | 1 時間  |
 * | アカウント削除     | `delete-account-<token>` | ユーザー ID         | 24 時間 |
 * | (プラグイン導入時) | `2fa-otp-<key>` ほか     | `OTP:試行回数` ほか | 各種    |
 *
 * メールのリンクに載るのは `identifier` に埋め込まれたトークンであって、`id` ではない。
 */
export const tVerification = authSchema.table(
  "t_verification",
  {
    // 主キー。better-auth が UUIDv7 で採番する。**秘密ではない**。
    id: uuid("id").primaryKey(),
    // 引くためのキー。用途を接頭辞に持つ合成値。再送で同じ用途の行が複数できる。
    identifier: text("identifier").notNull(),
    // 中身。形は用途しだい (上表)。ユーザー ID のことも JSON のこともある。
    value: text("value").notNull(),
    // 失効時刻。用途ごとに長さが違う (上表)。better-auth が期限切れを判定する。
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // 作成日時 (= トークンを発行した時刻)。
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // 更新日時。
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("t_verification_identifier_idx").on(table.identifier)],
);
