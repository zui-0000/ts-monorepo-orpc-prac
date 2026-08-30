import { useMutation } from "@tanstack/react-query";

import { CONTEXT_KEYS } from "~/api/shared/keys";
import type { MutationCallbacks } from "~/api/shared/mutation-callbacks";

import type { AuthError } from "./auth-error";
import type { SignInInput } from "./infrastructure/auth-repository";
import { authRepository } from "./infrastructure/auth-repository";

export const useSignInMutation = (
  options?: MutationCallbacks<void, AuthError, SignInInput>,
) =>
  useMutation({
    mutationKey: CONTEXT_KEYS.AUTH_CONTEXT_KEY.signIn(),
    mutationFn: async (input: SignInInput) => {
      // **TanStack は throw でしか失敗を認識しない。** Result を返すと成功扱いになる。
      const result = await authRepository.signIn(input);
      if (result.isErr()) throw result.error;
    },
    ...options,
  });
