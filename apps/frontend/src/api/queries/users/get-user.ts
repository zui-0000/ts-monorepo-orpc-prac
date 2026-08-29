import { orpc } from "~/api/orpc";

/** ユーザーの取得 (`GET /users/{id}`)。入力の形をここに閉じ込める。 */
export const getUserQueryOptions = (userId: string) =>
  orpc.user.get.queryOptions({ input: { id: userId } });

/** 更新後の無効化に使う。`getUserQueryOptions` と同じ住所を指す。 */
export const getUserQueryKey = (userId: string) =>
  orpc.user.get.queryKey({ input: { id: userId } });
