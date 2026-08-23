import type { UpdateUserRequest, UserId } from "@orpc-prac/contract";
import { Result } from "better-result";

import type { AuthenticatedCaller } from "~/shared/domain/model/authenticated-caller.ts";

import {
  type UpdateUserCommandDeps,
  type UpdateUserCommandInput,
  updateUserCommand,
} from "../../application/update-user-command.ts";

type UpdateUserControllerInput = {
  readonly auth: AuthenticatedCaller;
  readonly params: { readonly id: UserId };
  readonly body: UpdateUserRequest;
};

/** ユーザーを更新する (PUT /users/{id})。 */
export const updateUserController = (deps: UpdateUserCommandDeps) => {
  const command = updateUserCommand(deps);

  return ({ auth, params, body }: UpdateUserControllerInput) =>
    Result.gen(async function* () {
      const input: UpdateUserCommandInput = {
        ...body,
        id: params.id,
        actor: auth.userId,
      };
      yield* Result.await(command(input));
      return Result.ok();
    });
};
