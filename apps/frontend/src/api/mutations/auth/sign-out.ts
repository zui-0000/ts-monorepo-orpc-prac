import { mutationOptions } from "@tanstack/react-query";
import { Result } from "better-result";

import { authClient } from "~/api/auth-client";
import type { AuthError } from "~/api/errors/auth-error";
import { toAuthError } from "~/api/errors/auth-error";
import { QUERY_KEYS } from "~/api/queries/keys";

/** サインアウト (`POST /api/auth/sign-out`)。 */
const signOut = async (): Promise<Result<void, AuthError>> => {
  const { error } = await authClient.signOut();
  return error ? Result.err(toAuthError(error)) : Result.ok();
};

export const signOutMutationOptions = mutationOptions<void, AuthError>({
  mutationKey: QUERY_KEYS.AUTH_MUTATION_KEY.signOut(),
  mutationFn: async () => {
    // **TanStack は throw でしか失敗を認識しない。** Result を返すと成功扱いになる。
    const result = await signOut();
    if (result.isErr()) throw result.error;
  },
});
