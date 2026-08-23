import { OpenAPIGenerator } from "@orpc/openapi";
import { experimental_ValibotToJsonSchemaConverter as ValibotToJsonSchemaConverter } from "@orpc/valibot";

import { contract } from "./index.js";

/**
 * 契約から OpenAPI 仕様を生成する。
 *
 * **エラー応答の形は上書きしない。** oRPC の封筒
 * (`{ defined, code, status, message, data }`) をそのまま契約として公開する。
 * 実装も封筒のまま返すため、仕様と実際の応答が一致する。
 *
 * 以前は封筒を外して `data` の中身だけを仕様に出していたが、エラーが `data` を
 * 持たなくなった時点で**空の応答定義になってしまう**ため取りやめた
 * (`"content": {}` が出ていた)。
 */
const generator = new OpenAPIGenerator({
  schemaConverters: [new ValibotToJsonSchemaConverter()],
});

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
    // 各操作が .route({ tags }) で参照するタグの定義。
    // ここに無いタグを使うと Swagger で説明が出ない。
    tags: [{ name: "Users", description: "ユーザーの登録・取得・更新・削除" }],
    ...(options?.servers ? { servers: [...options.servers] } : {}),
  });
