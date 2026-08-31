import { Result } from "better-result";

import type { AuthUser } from "./data";
import {
  authState,
  currentUser,
  findByEmail,
  nextId,
  persistAuth,
} from "./data";

/** backend の `emailAndPassword.minPasswordLength` に合わせる。 */
export const MIN_PASSWORD_LENGTH = 15;

/**
 * 失敗の事由。**`@better-auth/core` の `BASE_ERROR_CODES` に実在するものだけ**を使う。
 * HTTP の状態への翻訳は `handler.ts` が持つ。
 */
export type AuthFailure =
  | "PASSWORD_TOO_SHORT"
  | "USER_ALREADY_EXISTS"
  | "INVALID_EMAIL_OR_PASSWORD"
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_TOKEN";

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

export const signUp = (input: {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}): Result<AuthUser, AuthFailure> => {
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return Result.err("PASSWORD_TOO_SHORT");
  }
  if (findByEmail(input.email)) return Result.err("USER_ALREADY_EXISTS");

  // better-auth は小文字で保存する。
  const user: AuthUser = {
    id: nextId(),
    name: input.name,
    email: input.email.toLowerCase(),
    password: input.password,
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
  return Result.ok(user);
};

export const verifyEmail = (token: string): Result<AuthUser, AuthFailure> => {
  const user = authState.users.find(
    (u) => u.id === authState.verifications[token],
  );
  if (!user) return Result.err("INVALID_TOKEN");

  user.emailVerified = true;
  // autoSignInAfterVerification: true に合わせる。
  authState.sessionUserId = user.id;
  persistAuth();
  return Result.ok(user);
};

export const signIn = (input: {
  readonly email: string;
  readonly password: string;
}): Result<AuthUser, AuthFailure> => {
  const user = findByEmail(input.email);
  if (!user || user.password !== input.password) {
    return Result.err("INVALID_EMAIL_OR_PASSWORD");
  }
  // requireEmailVerification: true に合わせる。
  if (!user.emailVerified) return Result.err("EMAIL_NOT_VERIFIED");

  authState.sessionUserId = user.id;
  persistAuth();
  return Result.ok(user);
};

export const signOut = () => {
  authState.sessionUserId = null;
  persistAuth();
};

export const getSession = (): AuthUser | undefined => currentUser();

/** セッションの見た目上の ID。モックは実体を持たない。 */
export const nextSessionId = () => nextId();
