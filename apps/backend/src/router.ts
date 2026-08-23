import { contract } from "@orpc-prac/contract";
import { implement } from "@orpc/server";

import type { AppContext } from "~/shared/presentation/app-context.ts";

import { appDeps } from "./app-deps.ts";
import { getUserHandler } from "./contexts/user/presentation/get-user-handler.ts";

/** 契約の実装。 */
const os = implement(contract).$context<AppContext>();

export const router = os.router({
  user: {
    create: os.user.create.handler(({ input }) => {
      console.log("[create]", input.name, input.mailAddress);
      return { id: "018eef15-1234-7123-8123-123456789abc" };
    }),

    get: getUserHandler(appDeps),

    update: os.user.update.handler(({ input }) => {
      console.log("[update]", input.id, input.name);
    }),

    delete: os.user.delete.handler(({ input }) => {
      console.log("[delete]", input.id);
    }),

    changePassword: os.user.changePassword.handler(({ input, errors }) => {
      if (input.currentPassword === input.newPassword) {
        throw errors.PASSWORD_MISMATCH_ERROR({
          data: {
            status: 401,
            code: "4011",
            title: "現在のパスワードが正しくありません",
          },
        });
      }
      console.log("[changePassword]", input.id);
    }),
  },
});
