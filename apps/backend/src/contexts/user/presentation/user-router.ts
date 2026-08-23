import { os } from "~/shared/presentation/os.ts";

import type { UserDeps } from "../user-deps.ts";
import { createUserHandler } from "./handlers/create-user-handler.ts";
import { getUserHandler } from "./handlers/get-user-handler.ts";

/**
 * user コンテキストの契約実装。
 *
 * **パスもメソッドも書かない** — それは契約 (`packages/contract`) が持つ。
 * ここにあるのは「どの操作にどの実装を結ぶか」だけ。
 *
 * **ここが依存を handler へ食わせる点。** 以降の層に deps は現れない。
 *
 * 操作の実装を `handlers/` へ分けているのは、**変わる理由が違う**ため。
 * ここが変わるのは契約に操作が増えたときだけで、個々の操作をどう実装するかとは
 * 独立している。並べて置くと、操作が 5 つ揃ったときに「一覧」が実装に埋もれる。
 *
 * なお handler は移行元の controller と同じ位置の同じ役割 (`(deps) => 手続き`)。
 * 名前が違うのは oRPC の `.handler()` に合わせたためで、層を 1 つ削ったのではない。
 * 契約が転送形式の解釈・検証・成功時のステータスを引き取った結果、
 * この層に残った仕事が**ユースケースの呼び出しと失敗の翻訳の 2 つだけ**になった。
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
