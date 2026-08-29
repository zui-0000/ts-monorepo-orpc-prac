import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { client } from "./api-client";

/**
 * 契約から導かれる TanStack Query 用の道具。
 *
 * `orpc.user.get.queryOptions({ input })` のように書ける。キーも入出力の型も
 * 契約から生えるため、ここで文字列キーを組み立てることはない。
 */
export const orpc = createTanstackQueryUtils(client);
