import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

import { CONTEXT_KEYS } from "~/api/keys";
import type { MutationCallbacks } from "~/api/mutation-callbacks";

import type { AuthError } from "./auth-error";
import type { SignInInput } from "./auth-repository";
import { authRepository } from "./auth-repository";

export const useSignInMutation = (
  options?: MutationCallbacks<UseMutationOptions<void, AuthError, SignInInput>>,
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
