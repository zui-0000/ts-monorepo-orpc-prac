import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { Hono } from "hono";

import type { AuthenticatedCaller } from "~/shared/domain/model/authenticated-caller.ts";
import { logFailure } from "~/shared/presentation/log-failure.ts";

import type { AppDeps } from "./app-deps.ts";
import { router } from "./router.ts";

/**
 * 認証を通った相手を決める。**Cookie のセッションから引く。**
 *
 * 署名の検証も期限の判定も better-auth が行うため、ここは結果を
 * アプリの語彙へ写すだけ。未認証なら `undefined` を返し、401 への翻訳は
 * `os` のミドルウェアが担う (presentation が HTTP の応答を組み立てない)。
 */
const resolveCaller = async (
  deps: AppDeps,
  request: Request,
): Promise<AuthenticatedCaller | undefined> => {
  const session = await deps.auth.api.getSession({ headers: request.headers });
  return session === null ? undefined : { userId: session.user.id };
};

/**
 * アプリ全体を組み立てる。知っているのは「契約をどのパスにマウントするか」だけ。
 *
 * **依存を引数で受け取る**ので、テストでは偽の実装を渡すだけで
 * HTTP 境界ごと検証できる。
 */
export const app = (deps: AppDeps) => {
  /**
   * 契約の `.route()` に書いた HTTP メソッドとパスをそのまま公開する。
   * RPCHandler ではなく OpenAPIHandler を使うのは、契約が REST 形式で
   * 書かれているため。
   */
  const handler = new OpenAPIHandler(router(deps), {
    interceptors: [onError(logFailure)],
  });

  const routes = new Hono();

  /**
   * better-auth の HTTP 経路 (サインアップ / サインイン / OAuth のコールバック)。
   *
   * **oRPC より先に登録する。** 下の `/api/*` は「契約に無ければ次へ流す」形なので
   * 順序を逆にしても最終的には届くが、認証の経路が毎回 oRPC の照合を通ることになる。
   */
  routes.on(["GET", "POST"], "/api/auth/*", (c) =>
    deps.auth.handler(c.req.raw),
  );

  routes.use("/api/*", async (c, next) => {
    const { matched, response } = await handler.handle(c.req.raw, {
      prefix: "/api",
      context: { caller: await resolveCaller(deps, c.req.raw) },
    });
    if (matched) {
      return c.newResponse(response.body, response);
    }
    await next();
  });

  routes.get("/health", (c) => c.json({ status: "ok" }));

  return routes;
};
