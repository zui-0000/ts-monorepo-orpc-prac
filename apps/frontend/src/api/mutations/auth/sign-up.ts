import { mutationOptions } from "@tanstack/react-query";
import { Result } from "better-result";

import { authClient } from "~/api/auth-client";
import type { AuthError } from "~/api/errors/auth-error";
import { toAuthError } from "~/api/errors/auth-error";
import { QUERY_KEYS } from "~/api/queries/keys";

/** backend の `emailAndPassword.minPasswordLength` に合わせる。 */
export const MIN_PASSWORD_LENGTH = 15;

export interface SignUpInput {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

/** サインアップ (`POST /api/auth/sign-up/email`)。 */
const signUp = async (input: SignUpInput): Promise<Result<void, AuthError>> => {
  const { error } = await authClient.signUp.email(input);
  return error ? Result.err(toAuthError(error)) : Result.ok();
};

export const signUpMutationOptions = mutationOptions<
  void,
  AuthError,
  SignUpInput
>({
  mutationKey: QUERY_KEYS.AUTH_MUTATION_KEY.signUp(),
  mutationFn: async (input) => {
    // **TanStack は throw でしか失敗を認識しない。** Result を返すと成功扱いになる。
    const result = await signUp(input);
    if (result.isErr()) throw result.error;
  },
});
