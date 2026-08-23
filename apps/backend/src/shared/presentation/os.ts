import { contract } from "@orpc-prac/contract";
import { implement } from "@orpc/server";

import type { AppContext } from "./app-context.ts";
import { toBadRequestData } from "./convert-validation-error.ts";

/**
 * 契約の実装を組み立てる起点。**すべてのハンドラはここから生やす。**
 *
 * `initialInputValidationIndex: 1` は「入力検証を 1 番目のミドルウェアの後で
 * 行う」指定。既定の 0 では全ミドルウェアより前で検証されるため、
 * 検証エラーを捕まえる余地が無い (@orpc/server の executeProcedureInternal)。
 *
 * 下のミドルウェアが検証エラーを契約の `BAD_REQUEST_ERROR` へ翻訳するので、
 * **各ハンドラは検証エラーの存在を意識せずに書ける。**
 */
export const os = implement(contract, { initialInputValidationIndex: 1 })
  .$context<AppContext>()
  .use(async ({ next, errors }) => {
    try {
      return await next();
    } catch (error) {
      const data = toBadRequestData(error);
      if (data === undefined) {
        throw error;
      }
      throw errors.BAD_REQUEST_ERROR({ data });
    }
  });
