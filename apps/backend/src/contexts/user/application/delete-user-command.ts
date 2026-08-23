import { Result } from "better-result";
import * as v from "valibot";

import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import type { ForbiddenError } from "~/shared/errors/forbidden-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";
import { ResourceNotFoundError } from "~/shared/errors/resource-not-found-error.ts";

import { UserIdSchema } from "../domain/model/value-objects/user-id.ts";
import { checkUserIsSelf } from "../domain/services/check-user-is-self.ts";
import type { UserRepository } from "../domain/user-repository.ts";

export type DeleteUserCommandDeps = {
  readonly userRepository: UserRepository;
};

/**
 * 素の入力をドメインの値へ変換する。**変換前が入力、変換後がコマンドの値。**
 * 入力型を手で書くとズレたまま型検査が通るため、ここから導く (設計関連/ADR-06)。
 */
const DeleteUserCommandValues = v.object({
  id: UserIdSchema,
  actor: UserIdSchema,
});

export type DeleteUserCommandInput = Readonly<
  v.InferInput<typeof DeleteUserCommandValues>
>;

export type DeleteUserCommandError =
  | ForbiddenError
  | ResourceNotFoundError
  | RepositoryError;

/**
 * ユーザーを削除する。認可 → 存在確認 → 削除。
 *
 * 削除の前に引き当てるのは、無い相手を消して 204 を返さないため
 * (DELETE の冪等性より「指定が誤っている」と教えるほうを採った)。
 *
 * **セッションの失効はまだ無い。** better-auth を入れる段で、削除より先に
 * 全セッションを切る手順が要る (逆順だと失効に失敗したとき「消えた利用者の
 * 券だけが生きている」状態が残り、再試行しても相手が居ないので直せない)。
 */
export const deleteUserCommand =
  (deps: DeleteUserCommandDeps) =>
  (
    input: DeleteUserCommandInput,
  ): Promise<Result<void, DeleteUserCommandError>> =>
    Result.gen(async function* () {
      const { id, actor } = parseInvariant(DeleteUserCommandValues, input);

      yield* checkUserIsSelf(id, actor);

      // 引き当てるのは存在確認のため。集約そのものは使わない。
      const user = yield* Result.await(deps.userRepository.findById(id));
      if (user === undefined) {
        return Result.err(new ResourceNotFoundError());
      }

      yield* Result.await(deps.userRepository.deleteById(id));
      return Result.ok();
    });
