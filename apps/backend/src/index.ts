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

app.use("/api/*", async (c, next) => {
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: "/api",
    context: {},
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
