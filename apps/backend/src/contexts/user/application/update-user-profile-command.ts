import { Result } from "better-result";
import * as v from "valibot";

import type { Clock } from "~/shared/domain/clock.ts";
import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import type { ForbiddenError } from "~/shared/errors/forbidden-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";

import { replaceUserProfile } from "../domain/model/user-profile.ts";
import { FamilyNameKanaSchema } from "../domain/model/value-objects/family-name-kana.ts";
import { FamilyNameSchema } from "../domain/model/value-objects/family-name.ts";
import { GivenNameKanaSchema } from "../domain/model/value-objects/given-name-kana.ts";
import { GivenNameSchema } from "../domain/model/value-objects/given-name.ts";
import { IntroductionSchema } from "../domain/model/value-objects/introduction.ts";
import { UserIdSchema } from "../domain/model/value-objects/user-id.ts";
import { checkUserIsSelf } from "../domain/services/check-user-is-self.ts";
import type { UserProfileRepository } from "../domain/user-profile-repository.ts";

export type UpdateUserProfileCommandDeps = {
  readonly userProfileRepository: UserProfileRepository;
  readonly clock: Clock;
};

/**
 * 素の入力をドメインの値へ変換する。**変換前が入力、変換後がコマンドの値。**
 * 入力型を手で書くとズレたまま型検査が通るため、ここから導く (設計関連/ADR-06)。
 */
const UpdateUserProfileCommandValues = v.object({
  id: UserIdSchema,
  actor: UserIdSchema,
  familyName: v.nullable(FamilyNameSchema),
  givenName: v.nullable(GivenNameSchema),
  familyNameKana: v.nullable(FamilyNameKanaSchema),
  givenNameKana: v.nullable(GivenNameKanaSchema),
  introduction: v.nullable(IntroductionSchema),
});

export type UpdateUserProfileCommandInput = Readonly<
  v.InferInput<typeof UpdateUserProfileCommandValues>
>;

export type UpdateUserProfileCommandError = ForbiddenError | RepositoryError;

/**
 * プロフィールを更新する。認可 → 全置換。
 *
 * **引き当てが要らない。** 行の有無で分岐しない upsert なので、読んでから書く必要が
 * 無い (設計関連/ADR-09 の遅延作成)。存在確認も不要で、`id` は認可で `actor` と
 * 一致することを確かめており、`actor` は有効なセッションから来るため必ず実在する。
 *
 * 表示名とメールアドレスはここで扱わない。認証基盤の所有物で、直接書くと不変条件を
 * 壊す (設計関連/ADR-09)。
 */
export const updateUserProfileCommand =
  (deps: UpdateUserProfileCommandDeps) =>
  (
    input: UpdateUserProfileCommandInput,
  ): Promise<Result<void, UpdateUserProfileCommandError>> =>
    Result.gen(async function* () {
      const { id, actor, ...fields } = parseInvariant(
        UpdateUserProfileCommandValues,
        input,
      );

      yield* checkUserIsSelf(id, actor);

      const profile = replaceUserProfile(deps, { userId: id, ...fields });

      yield* Result.await(deps.userProfileRepository.save(profile));
      return Result.ok();
    });
