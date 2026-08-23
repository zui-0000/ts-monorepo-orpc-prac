import { Result } from "better-result";
import * as v from "valibot";

import type { Clock } from "~/shared/domain/clock.ts";
import { MailAddressSchema } from "~/shared/domain/model/value-objects/mail-address.ts";
import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import type { ForbiddenError } from "~/shared/errors/forbidden-error.ts";
import type { MailAddressDuplicationError } from "~/shared/errors/mail-address-duplication-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";
import { ResourceNotFoundError } from "~/shared/errors/resource-not-found-error.ts";

import { changeUserProfile } from "../domain/model/user.ts";
import { UserIdSchema } from "../domain/model/value-objects/user-id.ts";
import { UserNameSchema } from "../domain/model/value-objects/user-name.ts";
import { checkMailAddressDuplication } from "../domain/services/check-mail-address-duplication.ts";
import { checkUserIsSelf } from "../domain/services/check-user-is-self.ts";
import type { UserRepository } from "../domain/user-repository.ts";

export type UpdateUserCommandDeps = {
  readonly userRepository: UserRepository;
  readonly clock: Clock;
};

/**
 * 境界を越えてきた値。**スキーマから導く** — 手で書くと、規則を足したときに
 * ズレたまま型検査が通る (`parseInvariant` の引数が `unknown` のため)。
 */
const UpdateUserCommandValues = v.object({
  id: UserIdSchema,
  actor: UserIdSchema,
  name: UserNameSchema,
  mailAddress: MailAddressSchema,
});

export type UpdateUserCommandInput = Readonly<
  v.InferInput<typeof UpdateUserCommandValues>
>;

export type UpdateUserCommandError =
  | ForbiddenError
  | ResourceNotFoundError
  | MailAddressDuplicationError
  | RepositoryError;

/**
 * プロフィールを更新する。認可 → 引き当て → 重複検証 → 状態遷移 → 永続化。
 * 重複検証で `excluding` に自分を渡すのは、メールアドレスを変えない更新が
 * 常に 409 になるのを防ぐため。
 */
export const updateUserCommand =
  (deps: UpdateUserCommandDeps) =>
  (
    input: UpdateUserCommandInput,
  ): Promise<Result<void, UpdateUserCommandError>> =>
    Result.gen(async function* () {
      const { id, actor, name, mailAddress } = parseInvariant(
        UpdateUserCommandValues,
        input,
      );

      yield* checkUserIsSelf(id, actor);

      const user = yield* Result.await(deps.userRepository.findById(id));
      if (user === undefined) {
        return Result.err(new ResourceNotFoundError());
      }

      yield* Result.await(
        checkMailAddressDuplication(deps, mailAddress, { excluding: user.id }),
      );

      const updated = changeUserProfile(deps, user, { name, mailAddress });

      yield* Result.await(deps.userRepository.updateProfile(updated));
      return Result.ok();
    });
