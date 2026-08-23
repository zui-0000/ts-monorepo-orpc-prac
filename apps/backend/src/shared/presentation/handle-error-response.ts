import type { Result } from "better-result";

import type { ForbiddenError } from "~/shared/errors/forbidden-error.ts";
import type { MailAddressDuplicationError } from "~/shared/errors/mail-address-duplication-error.ts";
import type { PasswordMismatchError } from "~/shared/errors/password-mismatch-error.ts";
import type { RepositoryError } from "~/shared/errors/repository-error.ts";
import type { ResourceNotFoundError } from "~/shared/errors/resource-not-found-error.ts";

/**
 * presentation 層が契約のエラーへ翻訳できるエラーの集合。ステータスの昇順に並べる。
 *
 * ドメイン/アプリケーションは HTTP を知らないため、**対応付けをこの 1 ファイルに
 * 閉じ込める。** ユースケースが増えても翻訳規則は 1 箇所にあり、
 * 同じ失敗が経路ごとに違うステータスで返る事故が起きない。
 *
 * ---
 *
 * **ここに無いエラーがある。** 理由は 3 種類。
 *
 * 1. **まだ移していないだけ** — `ConflictError` (汎用)、`UnauthorizedError` (認証)。
 *    ユースケースを移すたびにここへ足す
 *
 * 2. **実装が投げることが無い** — `BadRequestError` と `InternalServerError`。
 *    どちらも oRPC が入力検証・出力検証で直接投げる
 *
 * 3. **`Result` に乗らない** — `InvariantViolationError`。実装の誤りなので
 *    throw し、oRPC の既定の 500 になる (設計関連/ADR-04)
 */
export type ApplicationError =
  | PasswordMismatchError
  | ForbiddenError
  | ResourceNotFoundError
  | MailAddressDuplicationError
  | RepositoryError;

/**
 * 契約が生成するエラー構築子の形。
 *
 * **どれも引数を取らない。** 契約のエラーが `status` と `message` しか持たず、
 * どちらも oRPC の応答が載せるため、実装が組み立てる本文が無い
 * (追加情報を持つのは BadRequestError だけで、あれは oRPC が直接投げる)。
 */
type ErrorFactories = {
  readonly PASSWORD_MISMATCH_ERROR: () => Error;
  readonly FORBIDDEN_ERROR: () => Error;
  readonly RESOURCE_NOT_FOUND_ERROR: () => Error;
  readonly MAIL_ADDRESS_DUPLICATION_ERROR: () => Error;
  readonly INTERNAL_SERVER_ERROR: () => Error;
};

/**
 * そのエラーを翻訳するのに必要な契約のキーだけを導く。
 *
 * ユースケースが `ForbiddenError` しか返さないなら `"FORBIDDEN_ERROR"` だけを
 * 要求する。**契約で宣言していないエラーを使おうとすると呼び出し側で型エラー**
 * になるため、経路ごとの `.errors()` と食い違わない。
 */
type ErrorKeyOf<E> =
  | (E extends PasswordMismatchError ? "PASSWORD_MISMATCH_ERROR" : never)
  | (E extends ForbiddenError ? "FORBIDDEN_ERROR" : never)
  | (E extends ResourceNotFoundError ? "RESOURCE_NOT_FOUND_ERROR" : never)
  | (E extends MailAddressDuplicationError
      ? "MAIL_ADDRESS_DUPLICATION_ERROR"
      : never)
  | (E extends RepositoryError ? "INTERNAL_SERVER_ERROR" : never);

/**
 * アプリケーションのエラーを、契約が定めたエラーへ翻訳する。
 *
 * `match` は**網羅性を型が見張る**ので、`ApplicationError` に 1 つ足すと
 * ここがコンパイルエラーになる。翻訳漏れのまま通ることがない。
 *
 * ```ts
 * if (result.isOk()) return result.value;
 * throw handleErrorResponse(result.error, errors);
 * ```
 */
export const handleErrorResponse = <E extends ApplicationError>(
  error: E,
  errors: Pick<ErrorFactories, ErrorKeyOf<E>>,
): Error => {
  // **型を広げるのはここだけ。**
  //
  // `Pick` で絞った型は match の内側からキーが見えない (絞り込みが分配されない)
  // ため、全キーを持つ形に戻して扱う。
  //
  // これが安全なのは、入口の `Pick<ErrorFactories, ErrorKeyOf<E>>` が
  // 「E が必要とするキーを errors が持つこと」を既に検査しているため。
  // match は E に含まれる事由の枝しか実行しないので、
  // **実行時に存在しないキーへは到達しない。**
  const factories = errors as ErrorFactories;

  return error.match<ApplicationError, Error>({
    PasswordMismatchError: () => factories.PASSWORD_MISMATCH_ERROR(),

    ForbiddenError: () => factories.FORBIDDEN_ERROR(),

    ResourceNotFoundError: () => factories.RESOURCE_NOT_FOUND_ERROR(),

    MailAddressDuplicationError: () =>
      factories.MAIL_ADDRESS_DUPLICATION_ERROR(),

    // インフラ由来。原因 (cause) は外に出さず、ログにのみ残す。
    RepositoryError: () => factories.INTERNAL_SERVER_ERROR(),
  });
};

/**
 * Result を handler の返り値へ解く。失敗は契約のエラーへ訳して投げる。
 */
export const okOrThrow = <T, E extends ApplicationError>(
  result: Result<T, E>,
  errors: Pick<ErrorFactories, ErrorKeyOf<E>>,
): T => {
  if (result.isOk()) {
    return result.value;
  }

  throw handleErrorResponse(result.error, errors);
};
