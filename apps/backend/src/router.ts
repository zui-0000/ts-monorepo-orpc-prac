import { contract } from "@orpc-prac/contract";
import { implement } from "@orpc/server";

/**
 * 契約の実装。
 *
 * **今はまだ器の確認用のダミー**で、固定値を返すだけ。
 * 業務ロジック (application / domain / infrastructure) はこの後で移植する。
 */
const os = implement(contract);

export const router = os.router({
  user: {
    create: os.user.create.handler(({ input }) => {
      console.log("[create]", input.name, input.mailAddress);
      return { id: "018eef15-1234-7123-8123-123456789abc" };
    }),

    get: os.user.get.handler(({ input, errors }) => {
      if (input.id === "018eef15-0000-7000-8000-000000000000") {
        throw errors.NOT_FOUND_ERROR({
          data: {
            status: 404,
            code: "4040",
            title: "指定されたリソースは存在しません",
          },
        });
      }
      return {
        name: "惣流・アスカ・ラングレー",
        mailAddress: "asuka@nerv.example.com",
      };
    }),

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
