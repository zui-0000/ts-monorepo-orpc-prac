import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { Hono } from "hono";

import type { AuthenticatedCaller } from "~/shared/domain/model/authenticated-caller.ts";
import { logFailure } from "~/shared/presentation/log-failure.ts";

import type { AppDeps } from "./app-deps.ts";
import { router } from "./router.ts";

/**
 * 認証を通った相手を決める。
 *
 * **これは認証ではない。** ヘッダの値をそのまま信じているので、
 * 誰でも他人を名乗れる。better-auth を入れる段でセッションから引く形に
 * 差し替える。それまで動作確認ができるよう受け口だけ用意している。
 */
const resolveCaller = (request: Request): AuthenticatedCaller => ({
  userId: request.headers.get("x-actor-id") ?? "",
});

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

  routes.use("/api/*", async (c, next) => {
    const { matched, response } = await handler.handle(c.req.raw, {
      prefix: "/api",
      context: { caller: resolveCaller(c.req.raw) },
    });
    if (matched) {
      return c.newResponse(response.body, response);
    }
    await next();
  });

  routes.get("/health", (c) => c.json({ status: "ok" }));

  return routes;
};
