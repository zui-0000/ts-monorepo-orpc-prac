import { Result } from "better-result";

import type { Email } from "~/shared/domain/model/value-objects/email.ts";
import { EmailDuplicationError } from "~/shared/errors/email-duplication-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";

import type { UserId } from "../model/value-objects/user-id.ts";
import type { UserRepository } from "../user-repository.ts";

/**
 * メールアドレスの重複を検証する (ドメインサービス)。
 * 「同じメールアドレスのユーザーは 2 人存在しない」という業務ルールを担う。
 *
 * 集約 1 つを見ても答えが出ない (他の全ユーザーを知る必要がある) ため、
 * 集約にも値オブジェクトにも属さない。
 *
 * 要求するのは `findByEmail` だけ。`Pick` で絞るのは、このサービスが
 * 書き込みをしないことを型で示すため。
 *
 * `excluding` には重複判定から除外するユーザーを渡す。**更新で必須** —
 * 無いとメールアドレスを変えない更新が常に「既に使われている」で失敗する。
 */
export const checkEmailDuplication = (
  deps: { readonly userRepository: Pick<UserRepository, "findByEmail"> },
  email: Email,
  options: { readonly excluding?: UserId } = {},
): Promise<Result<void, EmailDuplicationError | RepositoryError>> =>
  Result.gen(async function* () {
    const user = yield* Result.await(deps.userRepository.findByEmail(email));

    // 除外対象本人以外の誰かが使っていれば重複。
    if (user !== undefined && user.id !== options.excluding) {
      return Result.err(new EmailDuplicationError());
    }

    return Result.ok();
  });
