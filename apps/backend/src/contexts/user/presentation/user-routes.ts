import { handleErrorResponse } from "~/shared/presentation/handle-error-response.ts";
import { os } from "~/shared/presentation/os.ts";

import type { UserDeps } from "../user-deps.ts";
import { createUserController } from "./controllers/create-user-controller.ts";
import { getUserController } from "./controllers/get-user-controller.ts";

/**
 * user コンテキストの契約実装。**oRPC に触れるのはこのファイルだけ。**
 * controller には後続で使う値の箱だけを渡し、失敗の翻訳はここで行う。
 */
export const userRoutes = (deps: UserDeps) => {
  const createUser = createUserController(deps);
  const getUser = getUserController(deps);

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

    update: os.user.update.handler(({ input }) => {
      console.log("[update]", input.id, input.name);
    }),

    delete: os.user.delete.handler(({ input }) => {
      console.log("[delete]", input.id);
    }),

    changePassword: os.user.changePassword.handler(({ input, errors }) => {
      if (input.currentPassword === input.newPassword) {
        throw errors.PASSWORD_MISMATCH_ERROR();
      }
      console.log("[changePassword]", input.id);
    }),
  };
};
