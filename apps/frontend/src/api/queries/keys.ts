import { orpc } from "~/api/orpc";

/**
 * better-auth の経路。**oRPC を通らないため自前で持つ。**
 */
const SESSION_QUERY_KEY = {
  all: ["session"] as const,
} as const;

/**
 * oRPC が生成したキーを束ねる。
 *
 * **配列を自前で組み立てないこと。** 生成されたキーは `DataTag` を背負っており、
 * `getQueryData` / `setQueryData` の戻り値に型が付く。自前の配列で上書きすると
 * `unknown` に落ちる (実測済み)。
 *
 * `all` は `[["user"], {}]` で、配下のキー `[["user","get"], {...}]` に前方一致
 * する。**これ 1 つで user 配下すべてを無効化できる。**
 */
const USER_QUERY_KEY = {
  all: orpc.user.key(),
  get: (id: string) => orpc.user.get.queryKey({ input: { id } }),
  updateProfile: () => orpc.user.updateProfile.mutationKey(),
} as const;

/**
 * 認証の操作。**oRPC を通らないため自前で持つ。**
 *
 * `useIsMutating` や `useMutationState` で送信中を拾うときの目印になる。
 */
const AUTH_MUTATION_KEY = {
  all: ["auth"] as const,
  signIn: () => [...AUTH_MUTATION_KEY.all, "sign-in"] as const,
  signUp: () => [...AUTH_MUTATION_KEY.all, "sign-up"] as const,
  signOut: () => [...AUTH_MUTATION_KEY.all, "sign-out"] as const,
} as const;

export const QUERY_KEYS = {
  AUTH_MUTATION_KEY,
  SESSION_QUERY_KEY,
  USER_QUERY_KEY,
} as const;
