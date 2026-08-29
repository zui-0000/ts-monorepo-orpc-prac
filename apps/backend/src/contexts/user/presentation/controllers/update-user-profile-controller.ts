import type { UpdateUserRequest, UserId } from "@orpc-prac/contract";
import { Result } from "better-result";

import type { AuthenticatedCaller } from "~/shared/domain/model/authenticated-caller.ts";

import {
  type UpdateUserProfileCommandDeps,
  type UpdateUserProfileCommandInput,
  updateUserProfileCommand,
} from "../../application/update-user-profile-command.ts";

type UpdateUserProfileControllerInput = {
  readonly auth: AuthenticatedCaller;
  readonly params: { readonly id: UserId };
  readonly body: UpdateUserRequest;
};

/** プロフィールを更新する (PUT /users/{id})。 */
export const updateUserProfileController = (
  deps: UpdateUserProfileCommandDeps,
) => {
  const command = updateUserProfileCommand(deps);

  return ({ auth, params, body }: UpdateUserProfileControllerInput) =>
    Result.gen(async function* () {
      const input: UpdateUserProfileCommandInput = {
        ...body,
        id: params.id,
        actor: auth.userId,
      };
      yield* Result.await(command(input));
      return Result.ok();
    });
};
