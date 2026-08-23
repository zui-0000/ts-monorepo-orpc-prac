import { handleErrorResponse } from "~/shared/presentation/handle-error-response.ts";
import { os } from "~/shared/presentation/os.ts";

import {
  type CreateUserCommandDeps,
  createUserCommand,
} from "../../application/create-user-command.ts";

/**
 * ユーザーを新規作成する (POST /users)。
 *
 * **`context` を使わない。** サインアップを想定した操作なので認証を通らず、
 * 「誰が呼んだか」を問わない (契約側でも認証系のエラーを宣言していない)。
 */
export const createUserHandler = (deps: CreateUserCommandDeps) => {
  const command = createUserCommand(deps);

  return os.user.create.handler(async ({ input, errors }) => {
    const result = await command(input);

    if (result.isOk()) {
      return result.value;
    }

    throw handleErrorResponse(result.error, errors);
  });
};
