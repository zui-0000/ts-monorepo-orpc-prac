import { handleErrorResponse } from "~/shared/presentation/handle-error-response.ts";
import { os } from "~/shared/presentation/os.ts";

import {
  type CreateUserCommandDeps,
  createUserCommand,
} from "../../application/create-user-command.ts";

/**
 * ユーザーを新規作成する (POST /users)。
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
