import { HttpStatus } from "../shared/constants/index.js";
import {
  BadRequestError,
  type BadRequestErrorData,
} from "../shared/errors/index.js";

/**
 * 入力検証の失敗を、契約が定めた 400 の本文に組み立てる。
 *
 * **形を決めるのは契約の仕事。** 実装側で組み立てると、契約を直したのに
 * 応答が古いまま、という食い違いが型検査を素通りする (実際、表題が
 * 検証ライブラリの既定文言のまま返っていたことがある)。
 *
 * **ステータスは変えられない。** 400 を決めるのは oRPC の入力検証で、
 * 呼び出し側が差し替えられるのは本文だけ。
 *
 * 受け取るのが `issue` の配列で `ORPCError` そのものではないのは、
 * **契約に oRPC の内部構造を持ち込まないため。** 封筒を剥がすのは
 * 実装側 (サーバの encoder) の役目で、契約は形だけを知る。
 */

/** 検証ライブラリが返す issue のうち、ここで使う部分だけ。 */
export type ValidationIssue = {
  readonly path?: readonly { readonly key?: unknown }[];
};

/** issue の path からフィールド名を組み立てる (例: user.mailAddress)。 */
const fieldOf = (issue: ValidationIssue): string =>
  (issue.path ?? [])
    .map((segment) => segment.key)
    .filter((key): key is string | number => key !== undefined)
    .join(".");

export const encodeBadRequestError = (
  issues: readonly ValidationIssue[],
): BadRequestErrorData => {
  // **どのフィールドが不正か、だけを返す。** issue には送信値がそのまま入る
  // (`input` はもちろん `message` にも乗る)。パスワードを検証に落とすと
  // 平文が応答に載るため、名前以外は捨てる。
  const fields = [...new Set(issues.map(fieldOf))].filter(Boolean);

  return {
    status: HttpStatus.BAD_REQUEST,
    code: "4000",
    title: BadRequestError.message,
    errors: fields.map((field) => ({ field })),
  };
};
