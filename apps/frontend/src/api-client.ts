import { contract } from "@orpc-prac/contract";
import type { ApiClient } from "@orpc-prac/contract";
import { createORPCClient } from "@orpc/client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";

/**
 * 契約から導かれる API クライアント。
 *
 * 契約が REST 形式 (`.route()` を持つ) なので OpenAPILink を使う。
 * 呼び出しの型・入力・エラーはすべて契約から導かれ、ここで型を書くことはない。
 */
const link = new OpenAPILink(contract, {
  url: `${window.location.origin}/api`,
});

export const client: ApiClient = createORPCClient(link);
