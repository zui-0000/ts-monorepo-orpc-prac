import { Result } from "better-result";
import * as v from "valibot";

import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import type { ForbiddenError } from "~/shared/errors/forbidden-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";
import { ResourceNotFoundError } from "~/shared/errors/resource-not-found-error.ts";

import { UserIdSchema } from "../domain/model/value-objects/user-id.ts";
import { checkUserIsSelf } from "../domain/services/check-user-is-self.ts";

export type GetUserQueryDeps = {
  readonly getUserQueryService: GetUserQueryService;
};

/**
 * 境界を越えてきた値。**スキーマから導く** — 手で書くと、規則を足したときに
 * ズレたまま型検査が通る (`parseInvariant` の引数が `unknown` のため)。
 */
const GetUserQueryValues = v.object({ id: UserIdSchema, actor: UserIdSchema });

export type GetUserQueryInput = Readonly<
  v.InferInput<typeof GetUserQueryValues>
>;

export type GetUserQueryOutput = {
  readonly name: string;
  readonly mailAddress: string;
};

export type GetUserQueryParams = { readonly id: UserId };

type UserId = v.InferOutput<typeof UserIdSchema>;

/**
 * ユーザー取得クエリのポート (読み取り側 / CQRS のクエリ経路)。
 */
export type GetUserQueryService = {
  readonly execute: (
    params: GetUserQueryParams,
  ) => Promise<Result<GetUserQueryOutput | undefined, RepositoryError>>;
};

export type GetUserQueryError =
  | ForbiddenError
  | ResourceNotFoundError
  | RepositoryError;

/**
 * ユーザーを取得する (CQRS のクエリ)。
 */
export const getUserQuery =
  (deps: GetUserQueryDeps) =>
  (
    input: GetUserQueryInput,
  ): Promise<Result<GetUserQueryOutput, GetUserQueryError>> =>
    Result.gen(async function* () {
      const { id, actor } = parseInvariant(GetUserQueryValues, input);

      yield* checkUserIsSelf(id, actor);

      const user = yield* Result.await(
        deps.getUserQueryService.execute({ id }),
      );
      if (user === undefined) {
        return Result.err(new ResourceNotFoundError());
      }

      return Result.ok(user);
    });
