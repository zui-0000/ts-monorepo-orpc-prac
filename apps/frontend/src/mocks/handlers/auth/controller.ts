import { HttpResponse } from "msw";

import type { AuthUser } from "./data";
import {
  authState,
  currentUser,
  findByEmail,
  nextId,
  persistAuth,
} from "./data";

/** backend の `emailAndPassword.minPasswordLength` に合わせる。 */
const MIN_PASSWORD_LENGTH = 15;

/**
 * 失敗の事由。**`@better-auth/core` の `BASE_ERROR_CODES` に実在するものだけ**を使う。
 */
type AuthFailure =
  | "PASSWORD_TOO_SHORT"
  | "USER_ALREADY_EXISTS"
  | "INVALID_EMAIL_OR_PASSWORD"
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_TOKEN";

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

/**
 * 失敗の応答。better-auth の本文は `{ message, code }`。
 *
 * **`handler.ts` で手で差し替えると、その失敗を画面で再現できる。**
 */
export const authFailure = (code: AuthFailure) =>
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

export const signUp = async (request: Request) => {
  const { name, email, password } = (await request.json()) as {
    name: string;
    email: string;
    password: string;
  };

  if (password.length < MIN_PASSWORD_LENGTH) {
    return authFailure("PASSWORD_TOO_SHORT");
  }
  if (findByEmail(email)) return authFailure("USER_ALREADY_EXISTS");

  // better-auth は小文字で保存する。
  const user: AuthUser = {
    id: nextId(),
    name,
    email: email.toLowerCase(),
    password,
    emailVerified: false,
  };
  authState.users.push(user);

  const token = nextId();
  authState.verifications[token] = user.id;
  persistAuth();

  deliverVerificationUrl(
    user.email,
    `${location.origin}/api/auth/verify-email?token=${token}&callbackURL=/sign-in`,
  );

  // 検証が済むまでセッションは張らない (sendOnSignUp: true と対)。
  return HttpResponse.json({ token: null, user: toAuthUser(user) });
};

export const verifyEmail = (request: Request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const user = authState.users.find(
    (u) => u.id === authState.verifications[token],
  );
  if (!user) return authFailure("INVALID_TOKEN");

  user.emailVerified = true;
  // autoSignInAfterVerification: true に合わせる。
  authState.sessionUserId = user.id;
  persistAuth();

  return HttpResponse.redirect(
    new URL(url.searchParams.get("callbackURL") ?? "/", location.origin).href,
  );
};

export const signIn = async (request: Request) => {
  const { email, password } = (await request.json()) as {
    email: string;
    password: string;
  };
  const user = findByEmail(email);

  if (!user || user.password !== password) {
    return authFailure("INVALID_EMAIL_OR_PASSWORD");
  }
  // requireEmailVerification: true に合わせる。
  if (!user.emailVerified) return authFailure("EMAIL_NOT_VERIFIED");

  authState.sessionUserId = user.id;
  persistAuth();
  return HttpResponse.json({
    redirect: false,
    token: nextId(),
    user: toAuthUser(user),
  });
};

export const signOut = () => {
  authState.sessionUserId = null;
  persistAuth();
  return HttpResponse.json({ success: true });
};

export const getSession = () => {
  const user = currentUser();
  if (!user) return HttpResponse.json(null);

  return HttpResponse.json({
    session: { id: nextId(), userId: user.id },
    user: toAuthUser(user),
  });
};
