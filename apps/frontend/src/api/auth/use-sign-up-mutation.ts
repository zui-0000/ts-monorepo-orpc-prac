import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

import { CONTEXT_KEYS } from "~/api/keys";

import type { AuthError } from "./auth-error";
import type { SignUpInput } from "./auth-repository";
import { authRepository } from "./auth-repository";

/** backend の `emailAndPassword.minPasswordLength` に合わせる。 */
export const MIN_PASSWORD_LENGTH = 15;

export const useSignUpMutation = (
  // 渡させるのは callback だけ。mutationFn や retry は api 層が握る。
  options?: Pick<
    UseMutationOptions<void, AuthError, SignUpInput>,
    "onSuccess" | "onError" | "onSettled"
  >,
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
