import type { UserId } from "@orpc-prac/contract";
import { Result } from "better-result";

import type { AuthenticatedCaller } from "~/shared/domain/model/authenticated-caller.ts";

import {
  type GetUserQueryDeps,
  type GetUserQueryInput,
  getUserQuery,
} from "../../application/get-user-query.ts";

type GetUserControllerInput = {
  readonly auth: AuthenticatedCaller;
  readonly params: { readonly id: UserId };
};

/** ID を指定してユーザーを取得する (GET /users/{id})。 */
export const getUserController = (deps: GetUserQueryDeps) => {
  const query = getUserQuery(deps);

  return ({ auth, params }: GetUserControllerInput) =>
    Result.gen(async function* () {
      const input: GetUserQueryInput = { id: params.id, actor: auth.userId };
      const output = yield* Result.await(query(input));
      return Result.ok(output);
    });
};
