import { HttpResponse, http } from "msw";

import type { AuthUser } from "./data";
import type { AuthFailure } from "./service";
import {
  MIN_PASSWORD_LENGTH,
  getSession,
  nextSessionId,
  signIn,
  signOut,
  signUp,
  verifyEmail,
} from "./service";

/** 事由から HTTP へ。better-auth の応答本文は `{ message, code }`。 */
const FAILURES: Readonly<
  Record<AuthFailure, { readonly status: number; readonly message: string }>
> = {
  PASSWORD_TOO_SHORT: {
    status: 400,
    message: `パスワードは ${MIN_PASSWORD_LENGTH} 文字以上にしてください`,
  },
  USER_ALREADY_EXISTS: {
    status: 422,
    message: "このメールアドレスは登録済みです",
  },
  INVALID_EMAIL_OR_PASSWORD: {
    status: 401,
    message: "メールアドレスまたはパスワードが違います",
  },
  EMAIL_NOT_VERIFIED: { status: 403, message: "メールアドレスが未検証です" },
  INVALID_TOKEN: { status: 400, message: "トークンが無効です" },
};

const failed = (code: AuthFailure) =>
  HttpResponse.json(
    { message: FAILURES[code].message, code },
    { status: FAILURES[code].status },
  );

/** better-auth がクライアントへ返す利用者の形。 */
const toAuthUser = (user: AuthUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  image: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const authHandlers = [
  http.post("/api/auth/sign-up/email", async ({ request }) => {
    const input = (await request.json()) as {
      name: string;
      email: string;
      password: string;
    };

    return signUp(input).match({
      // 検証が済むまでセッションは張らない (sendOnSignUp: true と対)。
      ok: (user) => HttpResponse.json({ token: null, user: toAuthUser(user) }),
      err: failed,
    });
  }),

  http.get("/api/auth/verify-email", ({ request }) => {
    const url = new URL(request.url);

    return verifyEmail(url.searchParams.get("token") ?? "").match({
      ok: () =>
        HttpResponse.redirect(
          new URL(url.searchParams.get("callbackURL") ?? "/", location.origin)
            .href,
        ),
      err: failed,
    });
  }),

  http.post("/api/auth/sign-in/email", async ({ request }) => {
    const input = (await request.json()) as {
      email: string;
      password: string;
    };

    return signIn(input).match({
      ok: (user) =>
        HttpResponse.json({
          redirect: false,
          token: nextSessionId(),
          user: toAuthUser(user),
        }),
      err: failed,
    });
  }),

  http.post("/api/auth/sign-out", () => {
    signOut();
    return HttpResponse.json({ success: true });
  }),

  http.get("/api/auth/get-session", () => {
    const user = getSession();
    if (!user) return HttpResponse.json(null);

    return HttpResponse.json({
      session: { id: nextSessionId(), userId: user.id },
      user: toAuthUser(user),
    });
  }),
];
