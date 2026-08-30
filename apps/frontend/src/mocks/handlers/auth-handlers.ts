import { HttpResponse, http } from "msw";
import { uuidv7 } from "uuidv7";

import { currentUser, findUserByEmail, persist, state } from "../data/state";

/** backend の `emailAndPassword.minPasswordLength` に合わせる。 */
const MIN_PASSWORD_LENGTH = 15;

/** better-auth のエラー本文。 */
const authError = (status: number, message: string, code: string) =>
  HttpResponse.json({ message, code }, { status });

/** better-auth がクライアントへ返す利用者の形。 */
const toAuthUser = (user: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  image: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/**
 * 検証リンクの届け先。**backend の send-verification-email.ts と同じ形**にしている。
 * 送信手段を決めていないため、実物もモックもコンソールに出す (docs/02)。
 */
const deliverVerificationUrl = (email: string, url: string) => {
  console.info(
    [
      "",
      "──────── メール検証 (モック) ────────",
      `宛先: ${email}`,
      `リンク: ${url}`,
      "────────────────────────────────────",
      "",
    ].join("\n"),
  );
};

export const authHandlers = [
  http.post("/api/auth/sign-up/email", async ({ request }) => {
    const { name, email, password } = (await request.json()) as {
      name: string;
      email: string;
      password: string;
    };

    if (password.length < MIN_PASSWORD_LENGTH) {
      return authError(
        400,
        `パスワードは ${MIN_PASSWORD_LENGTH} 文字以上にしてください`,
        "PASSWORD_TOO_SHORT",
      );
    }
    if (findUserByEmail(email)) {
      return authError(
        422,
        "このメールアドレスは登録済みです",
        "USER_ALREADY_EXISTS",
      );
    }

    // better-auth は小文字で保存する。
    const user = {
      id: uuidv7(),
      name,
      email: email.toLowerCase(),
      password,
      emailVerified: false,
      profile: null,
    };
    state.users.push(user);

    const token = uuidv7();
    state.verifications[token] = user.id;
    persist();

    deliverVerificationUrl(
      user.email,
      `${location.origin}/api/auth/verify-email?token=${token}&callbackURL=/sign-in`,
    );

    // 検証が済むまでセッションは張らない (sendOnSignUp: true と対)。
    return HttpResponse.json({ token: null, user: toAuthUser(user) });
  }),

  http.get("/api/auth/verify-email", ({ request }) => {
    const url = new URL(request.url);
    const userId = state.verifications[url.searchParams.get("token") ?? ""];
    const user = state.users.find((u) => u.id === userId);

    if (!user) return authError(400, "トークンが無効です", "INVALID_TOKEN");

    user.emailVerified = true;
    // autoSignInAfterVerification: true に合わせる。
    state.sessionUserId = user.id;
    persist();

    return HttpResponse.redirect(
      new URL(url.searchParams.get("callbackURL") ?? "/", location.origin).href,
    );
  }),

  http.post("/api/auth/sign-in/email", async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };
    const user = findUserByEmail(email);

    if (!user || user.password !== password) {
      return authError(
        401,
        "メールアドレスまたはパスワードが違います",
        "INVALID_EMAIL_OR_PASSWORD",
      );
    }
    // requireEmailVerification: true に合わせる。
    if (!user.emailVerified) {
      return authError(403, "メールアドレスが未検証です", "EMAIL_NOT_VERIFIED");
    }

    state.sessionUserId = user.id;
    persist();
    return HttpResponse.json({
      redirect: false,
      token: uuidv7(),
      user: toAuthUser(user),
    });
  }),

  http.post("/api/auth/sign-out", () => {
    state.sessionUserId = null;
    persist();
    return HttpResponse.json({ success: true });
  }),

  http.get("/api/auth/get-session", () => {
    const user = currentUser();
    if (!user) return HttpResponse.json(null);

    return HttpResponse.json({
      session: { id: uuidv7(), userId: user.id },
      user: toAuthUser(user),
    });
  }),
];
