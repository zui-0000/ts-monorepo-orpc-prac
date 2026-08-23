import { Result } from "better-result";
import * as v from "valibot";

import type { Clock } from "~/shared/domain/clock.ts";
import { MailAddressSchema } from "~/shared/domain/model/value-objects/mail-address.ts";
import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import type { PasswordHasher } from "~/shared/domain/password-hasher.ts";
import type { UuidGenerator } from "~/shared/domain/uuid-generator.ts";
import type { MailAddressDuplicationError } from "~/shared/errors/mail-address-duplication-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";

import { createUser } from "../domain/model/user.ts";
import { PasswordSchema } from "../domain/model/value-objects/password.ts";
import { UserHashedPasswordSchema } from "../domain/model/value-objects/user-hashed-password.ts";
import type { UserId } from "../domain/model/value-objects/user-id.ts";
import { UserNameSchema } from "../domain/model/value-objects/user-name.ts";
import { checkMailAddressDuplication } from "../domain/services/check-mail-address-duplication.ts";
import type { UserRepository } from "../domain/user-repository.ts";

export type CreateUserCommandDeps = {
  readonly userRepository: UserRepository;
  readonly passwordHasher: PasswordHasher;
  readonly uuidGenerator: UuidGenerator;
  readonly clock: Clock;
};

export type CreateUserCommandInput = {
  readonly name: string;
  readonly mailAddress: string;
  readonly password: string;
};

const CreateUserCommandValues = v.object({
  name: UserNameSchema,
  mailAddress: MailAddressSchema,
  password: PasswordSchema,
});

export type CreateUserCommandOutput = { readonly id: UserId };

export type CreateUserCommandError =
  | MailAddressDuplicationError
  | RepositoryError;

/**
 * ユーザーを作成する (CQRS のコマンド)。
 */
export const createUserCommand =
  (deps: CreateUserCommandDeps) =>
  (
    input: CreateUserCommandInput,
  ): Promise<Result<CreateUserCommandOutput, CreateUserCommandError>> =>
    Result.gen(async function* () {
      const { name, mailAddress, password } = parseInvariant(
        CreateUserCommandValues,
        input,
      );

      yield* Result.await(checkMailAddressDuplication(deps, mailAddress));

      const hashedPassword = parseInvariant(
        UserHashedPasswordSchema,
        await deps.passwordHasher.hash(password),
      );

      const user = createUser(deps, { name, mailAddress, hashedPassword });

      yield* Result.await(deps.userRepository.create(user));

      return Result.ok({ id: user.id });
    });
