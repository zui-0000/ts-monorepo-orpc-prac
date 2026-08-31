import { http } from "msw";

import { getSession, signIn, signOut, signUp, verifyEmail } from "./controller";

/**
 * 認証基盤の経路 (`/api/auth/*`)。**宣言だけを置き、中身は controller が持つ。**
 *
 * 失敗を画面で見たいときは `authFailure` を直に返す形へ書き換える。例:
 *
 * ```ts
 * http.post("/api/auth/sign-in/email", () => authFailure("EMAIL_NOT_VERIFIED")),
 * ```
 */
export const authHandlers = [
  http.post("/api/auth/sign-up/email", ({ request }) => signUp(request)),
  http.get("/api/auth/verify-email", ({ request }) => verifyEmail(request)),
  http.post("/api/auth/sign-in/email", ({ request }) => signIn(request)),
  http.post("/api/auth/sign-out", () => signOut()),
  http.get("/api/auth/get-session", () => getSession()),
];
