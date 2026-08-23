import { os } from "~/shared/presentation/os.ts";

import type { UserDeps } from "../user-deps.ts";
import { getUserHandler } from "./get-user-handler.ts";

/**
 * user コンテキストの契約実装。
 *
 * **パスもメソッドも書かない** — それは契約 (`packages/contract`) が持つ。
 * ここにあるのは「どの操作にどの実装を結ぶか」だけ。
 *
 * **ここが依存を handler へ食わせる点。** 以降の層に deps は現れない。
 */
export const userRouter = (deps: UserDeps) => ({
  create: os.user.create.handler(({ input }) => {
    console.log("[create]", input.name, input.mailAddress);
    return { id: "018eef15-1234-7123-8123-123456789abc" };
  }),

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
