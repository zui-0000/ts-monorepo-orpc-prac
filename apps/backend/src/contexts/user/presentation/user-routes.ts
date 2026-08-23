import { handleErrorResponse } from "~/shared/presentation/handle-error-response.ts";
import { os } from "~/shared/presentation/os.ts";

import type { UserDeps } from "../user-deps.ts";
import { changePasswordController } from "./controllers/change-password-controller.ts";
import { createUserController } from "./controllers/create-user-controller.ts";
import { deleteUserController } from "./controllers/delete-user-controller.ts";
import { getUserController } from "./controllers/get-user-controller.ts";
import { updateUserController } from "./controllers/update-user-controller.ts";

/**
 * user コンテキストの契約実装。**oRPC に触れるのはこのファイルだけ。**
 * controller には後続で使う値の箱だけを渡し、失敗の翻訳はここで行う。
 */
export const userRoutes = (deps: UserDeps) => {
  const createUser = createUserController(deps);
  const getUser = getUserController(deps);
  const updateUser = updateUserController(deps);
  const deleteUser = deleteUserController(deps);
  const changePassword = changePasswordController(deps);

  return {
    create: os.user.create.handler(async ({ input, errors }) => {
      const result = await createUser({ body: input });

      if (result.isOk()) {
        return result.value;
      }

      throw handleErrorResponse(result.error, errors);
    }),

    get: os.user.get.handler(async ({ input, errors, context }) => {
      const result = await getUser({
        auth: context.caller,
        params: { id: input.id },
      });

      if (result.isOk()) {
        return result.value;
      }

      throw handleErrorResponse(result.error, errors);
    }),

    update: os.user.update.handler(async ({ input, errors, context }) => {
      const { id, ...body } = input;
      const result = await updateUser({
        auth: context.caller,
        params: { id },
        body,
      });

      if (result.isOk()) {
        return;
      }

      throw handleErrorResponse(result.error, errors);
    }),

    delete: os.user.delete.handler(async ({ input, errors, context }) => {
      const result = await deleteUser({
        auth: context.caller,
        params: { id: input.id },
      });

      if (result.isOk()) {
        return;
      }

      throw handleErrorResponse(result.error, errors);
    }),

    changePassword: os.user.changePassword.handler(
      async ({ input, errors, context }) => {
        const { id, ...body } = input;
        const result = await changePassword({
          auth: context.caller,
          params: { id },
          body,
        });

        if (result.isOk()) {
          return;
        }

        throw handleErrorResponse(result.error, errors);
      },
    ),
  };
};
