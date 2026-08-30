import { orpc } from "~/api/orpc";

/**
 * ユーザーの取得 (`GET /users/{id}`)。
 *
 * キーは oRPC が生成し、`CONTEXT_KEYS.USER_CONTEXT_KEY.get(id)` と同じものになる。
 */
export const getUserQueryOption = (userId: string) =>
  orpc.user.get.queryOptions({ input: { id: userId } });
