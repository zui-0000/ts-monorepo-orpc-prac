import { contract } from "@orpc-prac/contract";
import { implement } from "@orpc/server";

import { handleErrorResponse } from "~/shared/presentation/handle-error-response.ts";

import {
  type GetUserQueryDeps,
  getUserQuery,
} from "../application/get-user-query.ts";

const os = implement(contract).$context<{ readonly actor: string }>();

/**
 * ID を指定してユーザーを取得する (GET /users/{id})。
 *
 * **この層の仕事は 2 つだけ。** 入力を組み立てることと、失敗を契約のエラーへ
 * 渡すこと。入力と出力の検証は oRPC が契約から行うため、ここには無い。
 * 翻訳規則そのものは handleErrorResponse が一手に持つ。
 */
export const getUserHandler = (deps: GetUserQueryDeps) => {
  const query = getUserQuery(deps);

  return os.user.get.handler(async ({ input, errors, context }) => {
    const result = await query({ id: input.id, actor: context.actor });

    if (result.isOk()) {
      return result.value;
    }

    throw handleErrorResponse(result.error, errors);
  });
};
