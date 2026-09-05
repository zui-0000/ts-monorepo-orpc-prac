import { http } from "msw";

import { getSession, signIn, signOut, signUp, verifyEmail } from "./controller";

/**
 * 認証基盤の経路 (`/api/auth/*`)。**宣言だけを置き、中身は controller が持つ。**
 *
 * **ここは正常系だけを持つ。書き換えない。** 失敗を画面で見たいときは URL に
 * `?scenario=sign-in-unverified` のように付ける (handlers/auth/scenarios.ts)。
 */
export const authHandlers = [
  http.post("/api/auth/sign-up/email", ({ request }) => signUp(request)),
  http.get("/api/auth/verify-email", ({ request }) => verifyEmail(request)),
  http.post("/api/auth/sign-in/email", ({ request }) => signIn(request)),
  http.post("/api/auth/sign-out", () => signOut()),
  http.get("/api/auth/get-session", () => getSession()),
];
