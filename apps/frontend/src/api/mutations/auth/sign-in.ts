import { Result } from "better-result";

import { authClient } from "~/api/auth-client";
import type { AuthError } from "~/api/errors/auth-error";
import { toAuthError } from "~/api/errors/auth-error";

/** サインイン (`POST /api/auth/sign-in/email`)。 */
export const signIn = async (input: {
  readonly email: string;
  readonly password: string;
}): Promise<Result<void, AuthError>> => {
  const { error } = await authClient.signIn.email(input);
  return error ? Result.err(toAuthError(error)) : Result.ok();
};
