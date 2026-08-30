import { Result } from "better-result";

import { authClient } from "~/api/auth-client";
import type { AuthError } from "~/api/errors/auth-error";
import { toAuthError } from "~/api/errors/auth-error";

/** サインアウト (`POST /api/auth/sign-out`)。 */
export const signOut = async (): Promise<Result<void, AuthError>> => {
  const { error } = await authClient.signOut();
  return error ? Result.err(toAuthError(error)) : Result.ok();
};
