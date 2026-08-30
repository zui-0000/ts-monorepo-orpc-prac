import { orpc } from "~/api/orpc";

/**
 * 認証コンテキストのキー。**better-auth の経路は oRPC を通らないため自前で持つ。**
 *
 * 取得 (`session`) と操作 (`signIn` 以下) を 1 つに束ねている。**コンテキストが
 * 単位で、query と mutation は区別しない。** 無効化はコンテキストを跨がないため。
 *
 * `all` は配下すべてに前方一致する。`session` も含めて一度に無効化できる。
 */
const AUTH_CONTEXT_KEY = {
  all: ["auth"] as const,
  session: () => [...AUTH_CONTEXT_KEY.all, "session"] as const,
  signIn: () => [...AUTH_CONTEXT_KEY.all, "sign-in"] as const,
  signUp: () => [...AUTH_CONTEXT_KEY.all, "sign-up"] as const,
  signOut: () => [...AUTH_CONTEXT_KEY.all, "sign-out"] as const,
} as const;

/**
 * 利用者コンテキストのキー。**oRPC が生成したものを束ねるだけ。**
 *
 * **配列を自前で組み立てないこと。** 生成されたキーは `DataTag` を背負っており、
 * `getQueryData` / `setQueryData` の戻り値に型が付く。自前の配列で上書きすると
 * `unknown` に落ちる (実測済み)。
 *
 * `all` は `[["user"], {}]` で、配下のキー `[["user","get"], {...}]` に前方一致
 * する。**これ 1 つで user 配下すべてを無効化できる。**
 */
const USER_CONTEXT_KEY = {
  all: orpc.user.key(),
  get: (id: string) => orpc.user.get.queryKey({ input: { id } }),
  updateProfile: () => orpc.user.updateProfile.mutationKey(),
} as const;

export const CONTEXT_KEYS = {
  AUTH_CONTEXT_KEY,
  USER_CONTEXT_KEY,
} as const;
