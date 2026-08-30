import { createAuthClient } from "better-auth/react";
import { Result } from "better-result";

import type { AuthError, BetterAuthFailure } from "./auth-error";
import { UnexpectedAuthError, toAuthError } from "./auth-error";

/**
 * better-auth のクライアント。`/api/auth/*` を叩き、応答は MSW が返す (src/mocks/)。
 * oRPC とは別系統で、認証の経路は契約に定義していない (docs/TODO.md)。
 */
const authClient = createAuthClient({ basePath: "/api/auth" });

/**
 * セッションの中身。未サインインなら `null`。
 *
 * **`$Infer` から取る。** `ReturnType<typeof authClient.getSession>` は
 * better-fetch の条件型が解決しきれず `any` に落ちる。
 */
export type Session = typeof authClient.$Infer.Session | null;

export interface SignInInput {
  readonly email: string;
  readonly password: string;
}

export interface SignUpInput {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

/** better-auth の呼び出しが返す形。 */
interface AuthResponse<T> {
  readonly data: T;
  readonly error: BetterAuthFailure | null;
}

/**
 * better-auth の呼び出しを `Result` に開く。**失敗の入口が 2 つある。**
 * 応答が返らない場合 (例外) を `tryPromise` が、応答本文の失敗を `andThen` が捌く
 * (設計関連/ADR-12)。
 */
const request = async <T>(
  call: () => Promise<AuthResponse<T>>,
): Promise<Result<T, AuthError>> =>
  (await Result.tryPromise(call))
    .mapError(
      (cause) =>
        new UnexpectedAuthError({ message: `応答なし: ${cause.message}` }),
    )
    .andThen(({ data, error }) =>
      error ? Result.err(toAuthError(error)) : Result.ok(data),
    );

/** 現在のセッション (`GET /api/auth/get-session`)。未サインインなら `null`。 */
const getSession = (): Promise<Result<Session, AuthError>> =>
  request<Session>(() => authClient.getSession());

/** サインイン (`POST /api/auth/sign-in/email`)。 */
const signIn = (input: SignInInput): Promise<Result<unknown, AuthError>> =>
  request(() => authClient.signIn.email(input));

/** サインアップ (`POST /api/auth/sign-up/email`)。 */
const signUp = (input: SignUpInput): Promise<Result<unknown, AuthError>> =>
  request(() => authClient.signUp.email(input));

/** サインアウト (`POST /api/auth/sign-out`)。 */
const signOut = (): Promise<Result<unknown, AuthError>> =>
  request(() => authClient.signOut());

/**
 * 認証基盤への問い合わせ。**`authClient` を直に触るのはここだけ** (設計関連/ADR-12)。
 *
 * どれも `Result` を返し throw しない。TanStack へ載せるときの throw への変換は
 * 呼ぶ側 (query-option / mutation) が行う。
 * 注入するものが無いためファクトリにしていない (backend の `db` にあたるものが無い)。
 */
export const authRepository = {
  getSession,
  signIn,
  signUp,
  signOut,
} as const;
