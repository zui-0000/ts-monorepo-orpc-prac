import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { haveIBeenPwned } from "better-auth/plugins";

import { authBaseUrl, authSecret } from "~/shared/infrastructure/auth-env.ts";
import type { Database } from "~/shared/infrastructure/db/database-client.ts";

import { tAccount, tSession, tUser, tVerification } from "./drizzle-schema.ts";

/**
 * better-auth のインスタンス。**利用者の生成と認証はここが持つ** (設計関連/ADR-07)。
 *
 * `@better-auth/drizzle-adapter` は better-auth の推移的依存なので直接は引けない。
 * 本体が再エクスポートする `better-auth/adapters/drizzle` から取る。
 */
export const auth = (db: Database) =>
  betterAuth({
    secret: authSecret(),
    baseURL: authBaseUrl(),

    database: drizzleAdapter(db, {
      provider: "pg",
      // キーは better-auth のモデル名 (固定)。値は drizzle のテーブル。
      // SQL 名 (t_user 等) は drizzle 側が持つため、ここには現れない。
      schema: {
        user: tUser,
        session: tSession,
        account: tAccount,
        verification: tVerification,
      },
    }),

    advanced: {
      database: {
        // 既定は 32 文字のランダム文字列で uuid 列に入らない (設計関連/ADR-07)。
        generateId: () => Bun.randomUUIDv7(),
      },
    },

    emailAndPassword: {
      enabled: true,
      // 既定の 8 は MFA を前提とした値。MFA が無いため NIST SP 800-63B-4 の 15 にする。
      minPasswordLength: 15,
      password: {
        // 既定の scrypt は OWASP の最低ラインを下回る (設計関連/ADR-08)。
        hash: (password) => Bun.password.hash(password),
        verify: ({ hash, password }) => Bun.password.verify(password, hash),
      },
    },

    // 漏洩済みパスワードを HIBP の k-anonymity API で弾く。
    // ctx.password.hash を包む作りなので、上の argon2id と共存する。
    plugins: [haveIBeenPwned()],
  });

/** 合成ルートが配る better-auth インスタンスの型。 */
export type Auth = ReturnType<typeof auth>;
