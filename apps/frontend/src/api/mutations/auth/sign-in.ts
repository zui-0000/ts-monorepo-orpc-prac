import { mutationOptions } from "@tanstack/react-query";
import { Result } from "better-result";

import { authClient } from "~/api/auth-client";
import type { AuthError } from "~/api/errors/auth-error";
import { toAuthError } from "~/api/errors/auth-error";
import { QUERY_KEYS } from "~/api/queries/keys";

export interface SignInInput {
  readonly email: string;
  readonly password: string;
}

/** サインイン (`POST /api/auth/sign-in/email`)。 */
const signIn = async (input: SignInInput): Promise<Result<void, AuthError>> => {
  const { error } = await authClient.signIn.email(input);
  return error ? Result.err(toAuthError(error)) : Result.ok();
};

export const signInMutationOptions = mutationOptions<
  void,
  AuthError,
  SignInInput
>({
  mutationKey: QUERY_KEYS.AUTH_MUTATION_KEY.signIn(),
  mutationFn: async (input) => {
    // **TanStack は throw でしか失敗を認識しない。** Result を返すと成功扱いになる。
    const result = await signIn(input);
    if (result.isErr()) throw result.error;
  },
});
