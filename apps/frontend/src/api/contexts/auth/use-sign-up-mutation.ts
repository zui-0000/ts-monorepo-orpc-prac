import { useMutation } from "@tanstack/react-query";

import { CONTEXT_KEYS } from "~/api/shared/keys";
import type { MutationCallbacks } from "~/api/shared/mutation-callbacks";

import type { AuthError } from "./auth-error";
import type { SignUpInput } from "./infrastructure/auth-repository";
import { authRepository } from "./infrastructure/auth-repository";

/** backend の `emailAndPassword.minPasswordLength` に合わせる。 */
export const MIN_PASSWORD_LENGTH = 15;

export const useSignUpMutation = (
  options?: MutationCallbacks<void, AuthError, SignUpInput>,
) =>
  useMutation({
    mutationKey: CONTEXT_KEYS.AUTH_CONTEXT_KEY.signUp(),
    mutationFn: async (input: SignUpInput) => {
      // **TanStack は throw でしか失敗を認識しない。** Result を返すと成功扱いになる。
      const result = await authRepository.signUp(input);
      if (result.isErr()) throw result.error;
    },
    ...options,
  });
