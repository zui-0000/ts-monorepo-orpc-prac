import { okOrThrow } from "~/shared/presentation/handle-error-response.ts";
import { os } from "~/shared/presentation/os.ts";

import type { UserDeps } from "../user-deps.ts";
import { deleteUserController } from "./controllers/delete-user-controller.ts";
import { getUserController } from "./controllers/get-user-controller.ts";
import { updateUserController } from "./controllers/update-user-controller.ts";

/**
 * user コンテキストの契約実装。**oRPC に触れるのはこのファイルだけ。**
 * controller には後続で使う値の箱だけを渡し、失敗の翻訳はここで行う。
 *
 * サインアップとパスワード変更は better-auth が持つためここには無い
 * (設計関連/ADR-07)。
 */
export const userRoutes = (deps: UserDeps) => {
  const getUser = getUserController(deps);
  const updateUser = updateUserController(deps);
  const deleteUser = deleteUserController(deps);

  return {
    get: os.user.get.handler(async ({ input, errors, context }) => {
      const result = await getUser({
        auth: context.caller,
        params: { id: input.id },
      });

      return okOrThrow(result, errors);
    }),

    update: os.user.update.handler(async ({ input, errors, context }) => {
      const { id, ...body } = input;
      const result = await updateUser({
        auth: context.caller,
        params: { id },
        body,
      });

      return okOrThrow(result, errors);
    }),

    delete: os.user.delete.handler(async ({ input, errors, context }) => {
      const result = await deleteUser({
        auth: context.caller,
        params: { id: input.id },
      });

      return okOrThrow(result, errors);
    }),
  };
};
