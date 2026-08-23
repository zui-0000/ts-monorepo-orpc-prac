import { contract } from "@orpc-prac/contract";
import { implement } from "@orpc/server";

import type { AppContext } from "./app-context.ts";
import { toValidationFailure } from "./convert-validation-error.ts";
import { logValidationFailure } from "./log-failure.ts";

/**
 * 契約の実装を組み立てる起点。**すべてのハンドラはここから生やす。**
 *
 * `initialInputValidationIndex: 1` は「入力検証を 1 番目のミドルウェアの後で
 * 行う」指定。既定の 0 では全ミドルウェアより前で検証されるため、
 * 検証エラーを捕まえる余地が無い (@orpc/server の executeProcedureInternal)。
 *
 * ここで検証エラーを契約の `BAD_REQUEST_ERROR` へ翻訳するので、
 * **各ハンドラは検証エラーの存在を意識せずに書ける。**
 *
 * **ログもここで出す。** 翻訳すると issue が失われるため、規則の情報
 * (`password:min_length(12)`) を残せるのはこの時点だけ。
 */
export const os = implement(contract, { initialInputValidationIndex: 1 })
  .$context<AppContext>()
  .use(async ({ next, errors }) => {
    try {
      return await next();
    } catch (error) {
      const failure = toValidationFailure(error);
      if (failure === undefined) {
        throw error;
      }

      logValidationFailure(failure.violations);
      throw errors.BAD_REQUEST_ERROR({ data: failure.data });
    }
  });
