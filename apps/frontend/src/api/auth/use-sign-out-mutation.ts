import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

import { CONTEXT_KEYS } from "~/api/keys";
import type { MutationCallbacks } from "~/api/mutation-callbacks";

import type { AuthError } from "./auth-error";
import { authRepository } from "./auth-repository";

export const useSignOutMutation = (
  options?: MutationCallbacks<UseMutationOptions<void, AuthError, void>>,
) =>
  useMutation({
    mutationKey: CONTEXT_KEYS.AUTH_CONTEXT_KEY.signOut(),
    mutationFn: async () => {
      // **TanStack は throw でしか失敗を認識しない。** Result を返すと成功扱いになる。
      const result = await authRepository.signOut();
      if (result.isErr()) throw result.error;
    },
    ...options,
  });
