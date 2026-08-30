import { orpc } from "~/api/orpc";

/**
 * プロフィールの全置換 (`PUT /users/{id}/profile`)。
 *
 * キーは oRPC が生成し、`QUERY_KEYS.USER_QUERY_KEY.updateProfile()` と同じものになる。
 */
export const updateProfileMutationOptions =
  orpc.user.updateProfile.mutationOptions();
