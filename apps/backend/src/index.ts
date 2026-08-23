import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { Hono } from "hono";

import { router } from "./router.ts";
import { encodeErrorResponseBody } from "./shared/presentation/encode-error-response.ts";

const app = new Hono();

/**
 * 契約の `.route()` に書いた HTTP メソッドとパスをそのまま公開する。
 * RPCHandler ではなく OpenAPIHandler を使うのは、契約が TypeSpec 由来の
 * REST 形式で書かれているため。
 */
const handler = new OpenAPIHandler(router, {
  customErrorResponseBodyEncoder: encodeErrorResponseBody,
  interceptors: [
    onError((error) => {
      console.error("[orpc]", error);
    }),
  ],
});

/**
 * 操作している本人の id を決める。
 *
 * **これは認証ではない。** ヘッダの値をそのまま信じているので、
 * 誰でも他人を名乗れる。better-auth を入れる段でセッションから引く形に
 * 差し替える。それまで動作確認ができるよう受け口だけ用意している。
 */
const resolveActor = (request: Request): string =>
  request.headers.get("x-actor-id") ?? "";

app.use("/api/*", async (c, next) => {
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: "/api",
    context: { actor: resolveActor(c.req.raw) },
  });
  if (matched) {
    return c.newResponse(response.body, response);
  }
  await next();
});

app.get("/health", (c) => c.json({ status: "ok" }));

export default {
  port: Number(Bun.env.PORT ?? 3000),
  fetch: app.fetch,
};
