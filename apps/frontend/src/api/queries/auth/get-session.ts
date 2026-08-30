import { queryOptions } from "@tanstack/react-query";
import { Result } from "better-result";

import { authClient } from "~/api/auth-client";
import type { AuthError } from "~/api/errors/auth-error";
import { toAuthError } from "~/api/errors/auth-error";
import { QUERY_KEYS } from "~/api/queries/keys";

type Session = Awaited<ReturnType<typeof authClient.getSession>>["data"];

/** 現在のセッション (`GET /api/auth/get-session`)。未サインインなら `null`。 */
export const getSession = async (): Promise<Result<Session, AuthError>> => {
  const { data, error } = await authClient.getSession();
  return error ? Result.err(toAuthError(error)) : Result.ok(data);
};

/**
 * セッションの取得。
 *
 * better-auth の `useSession` (独自ストア) ではなく TanStack Query に載せている。
 * ルータの `beforeLoad` は React の外で動くためフックを呼べず、
 * `queryClient.query()` で待てる形が要るため。
 */
export const sessionQueryOptions = queryOptions({
  queryKey: QUERY_KEYS.SESSION_QUERY_KEY.all,
  queryFn: async () => {
    // **TanStack は throw でしか失敗を認識しない。** Result を返すと成功扱いになる。
    const result = await getSession();
    if (result.isErr()) throw result.error;
    return result.value;
  },
  staleTime: 30_000,
});
