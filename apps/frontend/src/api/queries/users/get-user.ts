import { orpc } from "~/api/orpc";

/**
 * ユーザーの取得 (`GET /users/{id}`)。
 *
 * キーは oRPC が生成し、`QUERY_KEYS.USER_QUERY_KEY.get(id)` と同じものになる。
 */
export const getUserQueryOptions = (userId: string) =>
  orpc.user.get.queryOptions({ input: { id: userId } });
