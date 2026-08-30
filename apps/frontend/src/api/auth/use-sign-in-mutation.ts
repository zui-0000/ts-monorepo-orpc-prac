import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

import { CONTEXT_KEYS } from "~/api/keys";

import type { AuthError } from "./auth-error";
import type { SignInInput } from "./auth-repository";
import { authRepository } from "./auth-repository";

export const useSignInMutation = (
  // 渡させるのは callback だけ。mutationFn や retry は api 層が握る。
  options?: Pick<
    UseMutationOptions<void, AuthError, SignInInput>,
    "onSuccess" | "onError" | "onSettled"
  >,
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
