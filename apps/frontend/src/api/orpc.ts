import { contract } from "@orpc-prac/contract";
import type { ApiClient } from "@orpc-prac/contract";
import { createORPCClient } from "@orpc/client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

/** 契約が REST 形式 (`.route()` を持つ) なので OpenAPILink を使う。 */
const link = new OpenAPILink(contract, {
  url: `${window.location.origin}/api`,
});

const client: ApiClient = createORPCClient(link);

/**
 * 契約から導かれる TanStack Query 用の道具。
 *
 * `orpc.user.get.queryOptions({ input })` のように書ける。キーも入出力の型も
 * 契約から生えるため、ここで文字列キーを組み立てることはない。
 */
export const orpc = createTanstackQueryUtils(client);
