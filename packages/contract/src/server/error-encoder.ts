import type { ORPCError } from "@orpc/contract";

import { HttpStatus } from "../shared/constants/index.js";
import { InternalServerError } from "../shared/errors/index.js";
import {
  encodeBadRequestError,
  type ValidationIssue,
} from "./encode-bad-request-error.js";

/**
 * エラー応答の本文を、契約が定めた形に揃える。**サーバ側専用。**
 *
 * oRPC の既定は `{ defined, code, status, message, data }` という封筒だが、
 * それは oRPC クライアント向けの形式であって本 API の契約ではない。
 *
 * **実装はこれを渡すだけでよい。**
 *
 * ```ts
 * new OpenAPIHandler(router, {
 *   customErrorResponseBodyEncoder: encodeErrorResponseBody,
 * });
 * ```
 *
 * 契約側に置くのは、**形を決めるのが契約の仕事**だから。実装側で組み立てると
 * 契約を直したのに応答が古いまま、という食い違いが型検査を素通りする。
 *
 * **ステータスは変えられない。** どの経路も `error.status` がそのまま使われ、
 * 差し替えられるのは本文だけ (@orpc/openapi の `encodeError`)。
 */

const isIssueList = (data: unknown): data is { issues: ValidationIssue[] } =>
  typeof data === "object" &&
  data !== null &&
  Array.isArray((data as { issues?: unknown }).issues);

/** 契約が持たないエラーに割り当てる汎用コード (`<status>0` の 4 桁)。 */
const genericCodeOf = (status: number): string => `${status}0`;

/**
 * oRPC が自前で投げるエラーの表題を、契約の文言に差し替える。
 *
 * 500 は実装を経由せず oRPC が直接投げるため、`message` は既定 (英語) の
 * ままになる。契約が文言を持つものはそちらを使う。ここに無いステータス
 * (405 など) は契約に対応するエラーが無いため、oRPC の文言を通す。
 */
const TITLE_BY_STATUS: Readonly<Record<number, string>> = {
  [HttpStatus.INTERNAL_SERVER_ERROR]: InternalServerError.message,
};

export const encodeErrorResponseBody = (
  error: ORPCError<string, unknown>,
): unknown => {
  // 契約で宣言したエラーは data がそのまま契約の形をしている。
  if (error.defined) {
    return error.data;
  }

  // 入力検証の失敗 (oRPC が直接投げる)。
  if (isIssueList(error.data)) {
    return encodeBadRequestError(error.data.issues);
  }

  return {
    status: error.status,
    code: genericCodeOf(error.status),
    title: TITLE_BY_STATUS[error.status] ?? error.message,
  };
};
