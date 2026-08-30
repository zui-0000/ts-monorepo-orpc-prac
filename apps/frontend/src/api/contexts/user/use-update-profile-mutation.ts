import { useMutation } from "@tanstack/react-query";

import { orpc } from "~/api/orpc";

/**
 * プロフィールの全置換 (`PUT /users/{id}/profile`)。
 *
 * 入力・出力・エラーの型も `mutationKey` も契約から導かれる。
 * キーは `CONTEXT_KEYS.USER_CONTEXT_KEY.updateProfile()` と同じものになる。
 */
const baseOptions = orpc.user.updateProfile.mutationOptions();

export const useUpdateProfileMutation = (
  options?: Pick<typeof baseOptions, "onSuccess" | "onError" | "onSettled">,
) => useMutation({ ...baseOptions, ...options });
