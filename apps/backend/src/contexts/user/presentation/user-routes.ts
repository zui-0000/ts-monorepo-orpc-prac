import { okOrThrow } from "~/shared/presentation/handle-error-response.ts";
import { os } from "~/shared/presentation/os.ts";

import type { UserDeps } from "../user-deps.ts";
import { getUserController } from "./controllers/get-user-controller.ts";
import { updateUserProfileController } from "./controllers/update-user-profile-controller.ts";

/**
 * user コンテキストの契約実装。**oRPC に触れるのはこのファイルだけ。**
 * controller には後続で使う値の箱だけを渡し、失敗の翻訳はここで行う。
 *
 * サインアップ・サインイン・パスワード変更・削除はここに無い。better-auth が
 * 自前の HTTP 経路で持つため (設計関連/ADR-07, ADR-09)。
 */
export const userRoutes = (deps: UserDeps) => {
  const getUser = getUserController(deps);
  const updateUserProfile = updateUserProfileController(deps);

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
      const result = await updateUserProfile({
        auth: context.caller,
        params: { id },
        body,
      });

      return okOrThrow(result, errors);
    }),
  };
};
