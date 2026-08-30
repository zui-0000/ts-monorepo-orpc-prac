import { Result } from "better-result";

import { authClient } from "~/api/auth-client";
import type { AuthError } from "~/api/errors/auth-error";
import { toAuthError } from "~/api/errors/auth-error";

/** backend の `emailAndPassword.minPasswordLength` に合わせる。 */
export const MIN_PASSWORD_LENGTH = 15;

/** サインアップ (`POST /api/auth/sign-up/email`)。 */
export const signUp = async (input: {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}): Promise<Result<void, AuthError>> => {
  const { error } = await authClient.signUp.email(input);
  return error ? Result.err(toAuthError(error)) : Result.ok();
};
