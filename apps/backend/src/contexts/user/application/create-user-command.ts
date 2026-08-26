import { Result } from "better-result";
import * as v from "valibot";

import type { Clock } from "~/shared/domain/clock.ts";
import { EmailSchema } from "~/shared/domain/model/value-objects/email.ts";
import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import type { PasswordHasher } from "~/shared/domain/password-hasher.ts";
import type { UuidGenerator } from "~/shared/domain/uuid-generator.ts";
import type { EmailDuplicationError } from "~/shared/errors/email-duplication-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";

import { createUser } from "../domain/model/user.ts";
import { PasswordSchema } from "../domain/model/value-objects/password.ts";
import { UserHashedPasswordSchema } from "../domain/model/value-objects/user-hashed-password.ts";
import type { UserId } from "../domain/model/value-objects/user-id.ts";
import { UserNameSchema } from "../domain/model/value-objects/user-name.ts";
import { checkEmailDuplication } from "../domain/services/check-email-duplication.ts";
import type { UserRepository } from "../domain/user-repository.ts";

export type CreateUserCommandDeps = {
  readonly userRepository: UserRepository;
  readonly passwordHasher: PasswordHasher;
  readonly uuidGenerator: UuidGenerator;
  readonly clock: Clock;
};

/**
 * 素の入力をドメインの値へ変換する。**変換前が入力、変換後がコマンドの値。**
 * 入力型を手で書くとズレたまま型検査が通るため、ここから導く (設計関連/ADR-06)。
 */
const CreateUserCommandValues = v.object({
  name: UserNameSchema,
  email: EmailSchema,
  password: PasswordSchema,
});

export type CreateUserCommandInput = Readonly<
  v.InferInput<typeof CreateUserCommandValues>
>;

export type CreateUserCommandOutput = { readonly id: UserId };

export type CreateUserCommandError = EmailDuplicationError | RepositoryError;

/**
 * ユーザーを作成する (CQRS のコマンド)。
 */
export const createUserCommand =
  (deps: CreateUserCommandDeps) =>
  (
    input: CreateUserCommandInput,
  ): Promise<Result<CreateUserCommandOutput, CreateUserCommandError>> =>
    Result.gen(async function* () {
      const { name, email, password } = parseInvariant(
        CreateUserCommandValues,
        input,
      );

      yield* Result.await(checkEmailDuplication(deps, email));

      const hashedPassword = parseInvariant(
        UserHashedPasswordSchema,
        await deps.passwordHasher.hash(password),
      );

      const user = createUser(deps, { name, email, hashedPassword });

      yield* Result.await(deps.userRepository.create(user));

      return Result.ok({ id: user.id });
    });
