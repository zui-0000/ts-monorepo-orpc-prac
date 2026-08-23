import type { CreateUserRequest } from "@orpc-prac/contract";
import { Result } from "better-result";

import {
  type CreateUserCommandDeps,
  createUserCommand,
} from "../../application/create-user-command.ts";

type CreateUserControllerInput = {
  readonly body: CreateUserRequest;
};

/** ユーザーを新規作成する (POST /users)。 */
export const createUserController = (deps: CreateUserCommandDeps) => {
  const command = createUserCommand(deps);

  return ({ body }: CreateUserControllerInput) =>
    Result.gen(async function* () {
      const output = yield* Result.await(command(body));
      return Result.ok(output);
    });
};
