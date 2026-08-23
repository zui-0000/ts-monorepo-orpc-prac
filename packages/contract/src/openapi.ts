import { OpenAPIGenerator } from "@orpc/openapi";
import { experimental_ValibotToJsonSchemaConverter as ValibotToJsonSchemaConverter } from "@orpc/valibot";

import { contract } from "./index.js";

/**
 * 契約から OpenAPI 仕様を生成する。
 *
 * **仕様は契約の別表現**なので、実装 (backend) ではなくこのパッケージが持つ。
 * backend は生成された仕様を配信するだけで、何が API なのかを知る必要はない。
 *
 * ## 別エントリポイントにしている理由
 *
 * `@orpc-prac/contract/openapi` からだけ import できる。ルート (`.`) に置くと
 * frontend が契約を import したとき `@orpc/openapi` まで一緒にバンドルされてしまう。
 * 仕様の生成はサーバ側でしか必要ないので、経路を分けて巻き込まないようにしている。
 *
 * ## 変換器について
 *
 * 契約のスキーマが valibot なので JSON Schema への変換器を渡す。
 * `experimental_` が付いているとおり、この変換器はまだ不安定な扱い。
 * 現時点で文字数・正規表現・description・リテラルの翻訳は確認済み。
 */
const generator = new OpenAPIGenerator({
  schemaConverters: [new ValibotToJsonSchemaConverter()],
});

export type OpenApiSpecOptions = {
  readonly servers?: readonly { readonly url: string }[];
};

export const generateOpenApiSpec = async (options?: OpenApiSpecOptions) =>
  generator.generate(contract, {
    info: {
      title: "ts-monorepo-orpc-prac API",
      version: "0.0.0",
      description: "backend が提供する API の契約一覧。",
    },
    ...(options?.servers ? { servers: [...options.servers] } : {}),
  });
