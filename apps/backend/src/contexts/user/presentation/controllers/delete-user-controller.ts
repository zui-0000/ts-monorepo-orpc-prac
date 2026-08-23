import type { UserId } from "@orpc-prac/contract";
import { Result } from "better-result";

import type { AuthenticatedCaller } from "~/shared/domain/model/authenticated-caller.ts";

import {
  type DeleteUserCommandDeps,
  type DeleteUserCommandInput,
  deleteUserCommand,
} from "../../application/delete-user-command.ts";

type DeleteUserControllerInput = {
  readonly auth: AuthenticatedCaller;
  readonly params: { readonly id: UserId };
};

/** ユーザーを削除する (DELETE /users/{id})。 */
export const deleteUserController = (deps: DeleteUserCommandDeps) => {
  const command = deleteUserCommand(deps);

  return ({ auth, params }: DeleteUserControllerInput) =>
    Result.gen(async function* () {
      const input: DeleteUserCommandInput = {
        id: params.id,
        actor: auth.userId,
      };
      yield* Result.await(command(input));
      return Result.ok();
    });
};
