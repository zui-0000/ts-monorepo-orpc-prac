import { OpenAPIGenerator } from "@orpc/openapi";
import { experimental_ValibotToJsonSchemaConverter as ValibotToJsonSchemaConverter } from "@orpc/valibot";

import { contract } from "./index.js";

/**
 * 契約から OpenAPI 仕様を生成する。
 *
 * 仕様は契約の別表現なので、実装 (backend) ではなくこのパッケージが持つ。
 */
const generator = new OpenAPIGenerator({
  schemaConverters: [new ValibotToJsonSchemaConverter()],
});

/**
 * エラー応答の本文スキーマ。
 *
 * oRPC の既定は `{ defined, code, status, message, data }` というenvelopで、
 * data の中に契約が定めた形が入ってしまう。
 * oRPC クライアントが型安全にエラーを扱うための形式であって、**この API が公開する契約ではない**。
 *
 * したがって、仕様が定めた形 (status / code / title) だけを応答本文として宣言する。
 * 同じステータスに複数のエラーがある場合(401 の 4010 と 4011 など) は oneOf で並べる。
 */
const errorResponseBodySchema = (
  definedErrors: [
    code: string,
    defaultMessage: string,
    dataRequired: boolean,
    dataSchema: unknown,
  ][],
) => {
  const schemas = definedErrors.map(([, , , dataSchema]) => dataSchema);
  return schemas.length === 1 ? schemas[0] : { oneOf: schemas };
};

export type OpenApiSpecOptions = {
  /** API の配信元。どこにデプロイされるかは契約の知識ではないため呼ぶ側が渡す。 */
  readonly servers?: readonly { readonly url: string }[];
};

export const generateOpenApiSpec = async (options?: OpenApiSpecOptions) =>
  generator.generate(contract, {
    info: {
      title: "ts-monorepo-orpc-prac API",
      version: "0.0.0",
      description: "backend が提供する API の契約一覧。",
    },
    customErrorResponseBodySchema: (definedErrors) =>
      errorResponseBodySchema(definedErrors) as never,
    ...(options?.servers ? { servers: [...options.servers] } : {}),
  });
