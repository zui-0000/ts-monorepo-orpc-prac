import { os } from "~/shared/presentation/os.ts";

import type { UserDeps } from "../user-deps.ts";
import { createUserHandler } from "./handlers/create-user-handler.ts";
import { getUserHandler } from "./handlers/get-user-handler.ts";

/**
 * user コンテキストの契約実装。
 */
export const userRouter = (deps: UserDeps) => ({
  create: createUserHandler(deps),

  get: getUserHandler(deps),

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
});
