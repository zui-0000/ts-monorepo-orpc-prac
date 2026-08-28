import {
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ======================================================================================
// better-auth が所有するテーブル群 (設計関連/ADR-07)。
//
// TS のプロパティ名は better-auth の既定 (camelCase) に揃える。
// アダプタが schema[model][field] で引くため、ここがズレると実行時に落ちる。
// SQL 側の名前は自由なので、テーブルは t_ 接頭辞、列は snake_case、
// 真偽値は is_ 接頭辞にできる (命名関連/ADR-04)。
//
// 索引と制約の命名は Postgres の自動生成に揃える (命名関連/ADR-03)。
// 一意性は索引ではなく UNIQUE 制約で宣言する (_key)。
//
// created_at / updated_at は better-auth が値を書くため $onUpdate は付けない。
// DEFAULT は直接 INSERT する場合の保険として残す。
// ======================================================================================

/**
 * 利用者。**行を作るのは better-auth** で、こちらはプロフィールの更新と読み取りだけを行う。
 */
export const tUser = pgTable(
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

/**
 * サインイン中のセッション。Cookie に載る `token` から引く (`id` からではない)。
 */
export const tSession = pgTable(
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

/**
 * 認証方式ごとの紐づけ。1 人が複数持てる (メール+パスワード / Google のアカウント連携)。
 * `providerId` が方式を、`(issuer, accountId)` が発行者側での同一性を表す。
 */
export const tAccount = pgTable(
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
    // argon2id のハッシュ。providerId が "credential" のときだけ入る。
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
export const tVerification = pgTable(
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
