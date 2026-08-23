import { handleErrorResponse } from "~/shared/presentation/handle-error-response.ts";
import { os } from "~/shared/presentation/os.ts";

import {
  type GetUserQueryDeps,
  getUserQuery,
} from "../../application/get-user-query.ts";

/**
 * ID を指定してユーザーを取得する (GET /users/{id})。
 */
export const getUserHandler = (deps: GetUserQueryDeps) => {
  const query = getUserQuery(deps);

  return os.user.get.handler(async ({ input, errors, context }) => {
    const result = await query({ id: input.id, actor: context.caller.userId });

    if (result.isOk()) {
      return result.value;
    }

    throw handleErrorResponse(result.error, errors);
  });
};
