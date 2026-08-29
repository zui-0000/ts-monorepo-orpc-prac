import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import type { Database } from "~/shared/infrastructure/db/database-client.ts";
import {
  tAccount,
  tSession,
  tUser,
  tVerification,
} from "~/shared/infrastructure/db/schema/index.ts";

import { assertPasswordNotCompromised } from "./assert-password-not-compromised.ts";
import { authBaseUrl, authSecret } from "./auth-env.ts";
import { sendVerificationEmail } from "./send-verification-email.ts";

/**
 * better-auth のインスタンス。**利用者の生成と認証はここが持つ** (設計関連/ADR-07)。
 *
 * auth コンテキストは**認証という支援サブドメインを第三者の実装で満たす**もので、
 * 自前のドメインモデルを持たない。そのため infrastructure 層しか無い。
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
      // **既定は false。** アダプタが「トランザクションは無い」と答えると、
      // sign-up が runWithTransaction で包んでいても実際には包まれず、
      // t_user だけ入って t_account が失敗した行が残る (実測)。
      // そうなるとサインインもできず、メールが埋まっているので再登録もできない。
      transaction: true,
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

    user: {
      // **既定は無効。** 有効にしないと /api/auth/delete-user は 404 を返す。
      // 自前の DELETE /users/{id} は置かない。あちらはセッションの持ち主自身を
      // 消す形で、id 指定の API とは噛み合わないため (設計関連/ADR-09)。
      deleteUser: { enabled: true },
    },

    emailVerification: {
      // 届け先は docs/02 のとおりコンソール。送信手段は未定 (差し替え口)。
      sendVerificationEmail,
      // サインアップ直後にリンクを出す。
      sendOnSignUp: true,
      // **未検証のままサインインを試みたら再発行する。** リンクを見失っても詰まない。
      sendOnSignIn: true,
      // 検証を終えたらそのままサインイン状態にする。
      autoSignInAfterVerification: true,
    },

    emailAndPassword: {
      enabled: true,
      // **未検証のアカウントでサインインさせない。** 他人のメールで先に登録して
      // おき、本人が来たときに乗っ取る手口を塞ぐ。
      requireEmailVerification: true,
      // 既定の 8 は MFA を前提とした値。MFA が無いため NIST SP 800-63B-4 の 15 にする。
      minPasswordLength: 15,
      password: {
        // ここが動くのは「新しいパスワードを決める場面」だけなので、
        // 漏洩の検査も無条件でここに置く。
        hash: async (password) => {
          await assertPasswordNotCompromised(password);
          // 既定の scrypt は OWASP の最低ラインを下回る (設計関連/ADR-08)。
          return Bun.password.hash(password);
        },
        verify: ({ hash, password }) => Bun.password.verify(password, hash),
      },
    },
  });

/** 合成ルートが配る better-auth インスタンスの型。 */
export type Auth = ReturnType<typeof auth>;
