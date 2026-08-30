import { queryOptions } from "@tanstack/react-query";

import { CONTEXT_KEYS } from "~/api/keys";

import { authRepository } from "./auth-repository";

/**
 * セッションの取得。
 *
 * better-auth の `useSession` (独自ストア) ではなく TanStack Query に載せている。
 * ルータの `beforeLoad` は React の外で動くためフックを呼べず、
 * `queryClient.query()` で待てる形が要るため。
 */
export const getSessionQueryOption = queryOptions({
  queryKey: CONTEXT_KEYS.AUTH_CONTEXT_KEY.session(),
  queryFn: async () => {
    // **TanStack は throw でしか失敗を認識しない。** Result を返すと成功扱いになる。
    const result = await authRepository.getSession();
    if (result.isErr()) throw result.error;
    return result.value;
  },
  staleTime: 30_000,
});
