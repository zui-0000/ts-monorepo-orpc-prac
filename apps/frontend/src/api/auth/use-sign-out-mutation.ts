import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

import { CONTEXT_KEYS } from "~/api/keys";

import type { AuthError } from "./auth-error";
import { authRepository } from "./auth-repository";

export const useSignOutMutation = (
  // 渡させるのは callback だけ。mutationFn や retry は api 層が握る。
  options?: Pick<
    UseMutationOptions<void, AuthError, void>,
    "onSuccess" | "onError" | "onSettled"
  >,
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
