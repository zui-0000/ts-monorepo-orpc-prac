import { Result } from "better-result";
import * as v from "valibot";

import type { Clock } from "~/shared/domain/clock.ts";
import { EmailSchema } from "~/shared/domain/model/value-objects/email.ts";
import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import type { EmailDuplicationError } from "~/shared/errors/email-duplication-error.ts";
import type { ForbiddenError } from "~/shared/errors/forbidden-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";
import { ResourceNotFoundError } from "~/shared/errors/resource-not-found-error.ts";

import { changeUserProfile } from "../domain/model/user.ts";
import { UserIdSchema } from "../domain/model/value-objects/user-id.ts";
import { UserNameSchema } from "../domain/model/value-objects/user-name.ts";
import { checkUserIsSelf } from "../domain/services/check-user-is-self.ts";
import type { UserRepository } from "../domain/user-repository.ts";

export type UpdateUserCommandDeps = {
  readonly userRepository: UserRepository;
  readonly clock: Clock;
};

/**
 * 素の入力をドメインの値へ変換する。**変換前が入力、変換後がコマンドの値。**
 * 入力型を手で書くとズレたまま型検査が通るため、ここから導く (設計関連/ADR-06)。
 */
const UpdateUserCommandValues = v.object({
  id: UserIdSchema,
  actor: UserIdSchema,
  name: UserNameSchema,
  email: EmailSchema,
});

export type UpdateUserCommandInput = Readonly<
  v.InferInput<typeof UpdateUserCommandValues>
>;

export type UpdateUserCommandError =
  | ForbiddenError
  | ResourceNotFoundError
  | EmailDuplicationError
  | RepositoryError;

/**
 * プロフィールを更新する。認可 → 引き当て → 状態遷移 → 永続化。
 *
 * **メールアドレスの重複は事前に検査しない。** SELECT と UPDATE の間に競合が
 * 入るため事前検査では一意性を守れない。DB の一意制約 (`t_user_email_key`) に
 * 任せ、違反をリポジトリが `EmailDuplicationError` へ翻訳する (設計関連/ADR-07)。
 */
export const updateUserCommand =
  (deps: UpdateUserCommandDeps) =>
  (
    input: UpdateUserCommandInput,
  ): Promise<Result<void, UpdateUserCommandError>> =>
    Result.gen(async function* () {
      const { id, actor, name, email } = parseInvariant(
        UpdateUserCommandValues,
        input,
      );

      yield* checkUserIsSelf(id, actor);

      const user = yield* Result.await(deps.userRepository.findById(id));
      if (user === undefined) {
        return Result.err(new ResourceNotFoundError());
      }

      const updated = changeUserProfile(deps, user, { name, email });

      yield* Result.await(deps.userRepository.updateProfile(updated));
      return Result.ok();
    });
