import { queryOptions } from "@tanstack/react-query";

import { authClient } from "~/api/auth-client";
import { QUERY_KEYS } from "~/api/queries/keys";

/**
 * 現在のセッション (`GET /api/auth/get-session`)。未サインインなら `null`。
 *
 * better-auth の `useSession` (独自ストア) ではなく TanStack Query に載せている。
 * ルータの `beforeLoad` は React の外で動くためフックを呼べず、
 * `queryClient.query()` で待てる形が要るため。
 */
export const sessionQueryOptions = queryOptions({
  queryKey: QUERY_KEYS.SESSION_QUERY_KEY.all,
  queryFn: async () => {
    const { data, error } = await authClient.getSession();
    if (error) throw new Error(error.message ?? "セッションを取得できません");
    return data;
  },
  staleTime: 30_000,
});
