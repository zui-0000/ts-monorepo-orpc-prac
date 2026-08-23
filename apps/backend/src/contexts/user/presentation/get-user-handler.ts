import { handleErrorResponse } from "~/shared/presentation/handle-error-response.ts";
import { os } from "~/shared/presentation/os.ts";

import {
  type GetUserQueryDeps,
  getUserQuery,
} from "../application/get-user-query.ts";

/**
 * ID を指定してユーザーを取得する (GET /users/{id})。
 *
 * **この層の仕事は 2 つだけ。** 入力を組み立てることと、失敗を契約のエラーへ
 * 渡すこと。入力と出力の検証は oRPC が契約から行い、検証エラーの翻訳は
 * 共有の `os` に載せたミドルウェアが引き受けるため、ここには現れない。
 */
export const getUserHandler = (deps: GetUserQueryDeps) => {
  const query = getUserQuery(deps);

  return os.user.get.handler(async ({ input, errors, context }) => {
    const result = await query({ id: input.id, actor: context.caller.userId });

    // **`match` では書かない。** better-result の match はハンドラを try/catch で
    // 包んでおり、投げた例外を Panic に差し替えて再送出する
    // (実測: 403 が「予期せぬ失敗」扱いになり 500 で返った)。
    if (result.isOk()) {
      return result.value;
    }

    throw handleErrorResponse(result.error, errors);
  });
};
