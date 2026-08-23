import { Result } from "better-result";
import * as v from "valibot";

import type { Clock } from "~/shared/domain/clock.ts";
import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import type { PasswordHasher } from "~/shared/domain/password-hasher.ts";
import type { ForbiddenError } from "~/shared/errors/forbidden-error.ts";
import type { PasswordMismatchError } from "~/shared/errors/password-mismatch-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";
import { ResourceNotFoundError } from "~/shared/errors/resource-not-found-error.ts";

import {
  changeUserPassword,
  verifyUserPassword,
} from "../domain/model/user.ts";
import { PasswordSchema } from "../domain/model/value-objects/password.ts";
import { UserHashedPasswordSchema } from "../domain/model/value-objects/user-hashed-password.ts";
import { UserIdSchema } from "../domain/model/value-objects/user-id.ts";
import { checkUserIsSelf } from "../domain/services/check-user-is-self.ts";
import type { UserRepository } from "../domain/user-repository.ts";

export type ChangePasswordCommandDeps = {
  readonly userRepository: UserRepository;
  readonly passwordHasher: PasswordHasher;
  readonly clock: Clock;
};

/**
 * 境界を越えてきた値。**スキーマから導く** — 手で書くと、規則を足したときに
 * ズレたまま型検査が通る (`parseInvariant` の引数が `unknown` のため)。
 */
const ChangePasswordCommandInputSchema = v.object({
  id: UserIdSchema,
  actor: UserIdSchema,
  currentPassword: PasswordSchema,
  newPassword: PasswordSchema,
});

export type ChangePasswordCommandInput = Readonly<
  v.InferInput<typeof ChangePasswordCommandInputSchema>
>;

export type ChangePasswordCommandError =
  | ForbiddenError
  | ResourceNotFoundError
  | PasswordMismatchError
  | RepositoryError;

/**
 * パスワードを変更する。認可 → 引き当て → 現在のパスワードを確認 → 差し替え。
 *
 * 現在のパスワードを求めるので、トークンを盗まれてもパスワードは変えられない。
 *
 * **他端末のセッション失効はまだ無い。** better-auth を入れる段で、差し替えより
 * 先に操作中のセッション以外を切る手順が要る。変えたい動機の大半は
 * 「漏れたかもしれない」なので、盗んだ側の券が生き残るなら意味が薄い。
 * 順序も重要で、逆順だと差し替えは通ったのに失効で落ちたとき再試行できない
 * (currentPassword が既に古い)。
 */
export const changePasswordCommand =
  (deps: ChangePasswordCommandDeps) =>
  (
    input: ChangePasswordCommandInput,
  ): Promise<Result<void, ChangePasswordCommandError>> =>
    Result.gen(async function* () {
      const { id, actor, currentPassword, newPassword } = parseInvariant(
        ChangePasswordCommandInputSchema,
        input,
      );

      yield* checkUserIsSelf(id, actor);

      const user = yield* Result.await(deps.userRepository.findById(id));
      if (user === undefined) {
        return Result.err(new ResourceNotFoundError());
      }

      yield* Result.await(verifyUserPassword(deps, user, currentPassword));

      const hashedPassword = parseInvariant(
        UserHashedPasswordSchema,
        await deps.passwordHasher.hash(newPassword),
      );

      const updated = changeUserPassword(deps, user, hashedPassword);

      yield* Result.await(deps.userRepository.updatePassword(updated));
      return Result.ok();
    });
