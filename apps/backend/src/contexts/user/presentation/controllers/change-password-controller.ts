import type { ChangePasswordRequest, UserId } from "@orpc-prac/contract";
import { Result } from "better-result";

import type { AuthenticatedCaller } from "~/shared/domain/model/authenticated-caller.ts";

import {
  type ChangePasswordCommandDeps,
  type ChangePasswordCommandInput,
  changePasswordCommand,
} from "../../application/change-password-command.ts";

type ChangePasswordControllerInput = {
  readonly auth: AuthenticatedCaller;
  readonly params: { readonly id: UserId };
  readonly body: ChangePasswordRequest;
};

/** パスワードを変更する (PUT /users/{id}/password)。 */
export const changePasswordController = (deps: ChangePasswordCommandDeps) => {
  const command = changePasswordCommand(deps);

  return ({ auth, params, body }: ChangePasswordControllerInput) =>
    Result.gen(async function* () {
      const input: ChangePasswordCommandInput = {
        ...body,
        id: params.id,
        actor: auth.userId,
      };
      yield* Result.await(command(input));
      return Result.ok();
    });
};
