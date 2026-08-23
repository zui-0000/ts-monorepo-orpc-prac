import { Result } from "better-result";

import type { MailAddress } from "~/shared/domain/model/value-objects/mail-address.ts";
import { MailAddressDuplicationError } from "~/shared/errors/mail-address-duplication-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";

import type { UserRepository } from "../user-repository.ts";

/**
 * メールアドレスの重複を検証する (ドメインサービス)。
 * 「同じメールアドレスのユーザーは 2 人存在しない」という業務ルールを担う。
 *
 * 集約 1 つを見ても答えが出ない (他の全ユーザーを知る必要がある) ため、
 * 集約にも値オブジェクトにも属さない。
 *
 * 要求するのは `findByMailAddress` **だけ**。`Pick` で絞るのは、このサービスが
 * 書き込みをしないことを型で示すため。
 *
 * ---
 *
 * **更新を移す段では引数がもう 1 つ要る。** 重複判定から自分自身を除外しないと、
 * メールアドレスを変えない更新が「既に使われている」で常に失敗する。
 */
export const checkMailAddressDuplication = (
  deps: { readonly userRepository: Pick<UserRepository, "findByMailAddress"> },
  mailAddress: MailAddress,
): Promise<Result<void, MailAddressDuplicationError | RepositoryError>> =>
  Result.gen(async function* () {
    const user = yield* Result.await(
      deps.userRepository.findByMailAddress(mailAddress),
    );

    if (user !== undefined) {
      return Result.err(new MailAddressDuplicationError());
    }

    return Result.ok();
  });
