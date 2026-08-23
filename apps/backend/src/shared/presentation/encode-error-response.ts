import type { ORPCError } from "@orpc/server";

/**
 * エラー応答の本文を、契約が定めた形に揃える。
 *
 * oRPC の既定は `{ defined, code, status, message, data }` という封筒だが、
 * それは oRPC クライアント向けの形式であって本 API の契約ではない。
 * 契約が定めた形 (status / code / title) だけを返す。
 */

type ValidationIssue = {
  readonly path?: readonly { readonly key?: unknown }[];
};

const isIssueList = (data: unknown): data is { issues: ValidationIssue[] } =>
  typeof data === "object" &&
  data !== null &&
  Array.isArray((data as { issues?: unknown }).issues);

/** issue の path からフィールド名を組み立てる (例: user.mailAddress)。 */
const fieldOf = (issue: ValidationIssue): string =>
  (issue.path ?? [])
    .map((segment) => segment.key)
    .filter((key): key is string | number => key !== undefined)
    .join(".");

/** 契約が持たないエラーに割り当てる汎用コード (`<status>0` の 4 桁)。 */
const genericCodeOf = (status: number): string => `${status}0`;

export const encodeErrorResponseBody = (
  error: ORPCError<any, any>,
): unknown => {
  // 契約で宣言したエラーは data がそのまま契約の形をしている。
  if (error.defined) {
    return error.data;
  }

  const base = {
    status: error.status,
    code: genericCodeOf(error.status),
    title: error.message,
  };

  if (!isIssueList(error.data)) {
    return base;
  }

  // 入力検証の失敗は、どのフィールドが不正か、だけを返す。
  const fields = [...new Set(error.data.issues.map(fieldOf))].filter(Boolean);

  return {
    ...base,
    errors: fields.map((field) => ({ field })),
  };
};
