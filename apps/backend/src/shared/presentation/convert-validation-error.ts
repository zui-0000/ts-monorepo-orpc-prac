import type { BadRequestErrorData } from "@orpc-prac/contract";
import { ORPCError } from "@orpc/server";

/**
 * oRPC の入力検証エラーから、契約の `BadRequestError` に渡す `data` を作る。
 * 検証エラーでなければ `undefined` を返す（そのまま投げ直す合図）。
 *
 * oRPC は入力が契約に合わないとき `ORPCError("BAD_REQUEST")` を自分で投げる。
 * これは契約の `.errors()` を経由しないため `defined: false` になり、
 * **本文が oRPC の素の封筒のまま外へ出る。** 実測ではこうなった。
 *
 * ```json
 * {"defined":false,"code":"BAD_REQUEST","message":"Input validation failed",
 *  "data":{"issues":[{"input":"bad","expected":"/^[0-9a-f]{8}-.../u", ...}]}}
 * ```
 *
 * 3 つまずい。**送信値が丸見え** (`input` / `received` / `path[].value`)、
 * **検証パターンが漏れる** (`expected`)、**表題が英語**。パスワード変更で
 * 同じことが起きれば平文が応答に載る。
 */

/** 検証ライブラリが返す issue のうち、ここで使う部分だけ。 */
type ValidationIssue = {
  readonly path?: readonly { readonly key?: unknown }[];
};

/** issue の path からフィールド名を組み立てる (例: user.mailAddress)。 */
const fieldOf = (issue: ValidationIssue): string =>
  (issue.path ?? [])
    .map((segment) => segment.key)
    .filter((key): key is string | number => key !== undefined)
    .join(".");

export const toBadRequestData = (
  error: unknown,
): BadRequestErrorData | undefined => {
  const isInputValidationError =
    error instanceof ORPCError &&
    error.code === "BAD_REQUEST" &&
    !error.defined;

  if (!isInputValidationError) {
    return undefined;
  }

  // **どのフィールドが不正か、だけを返す。** issue には送信値がそのまま入る。
  const issues = (error.data as { issues?: ValidationIssue[] })?.issues ?? [];
  const fields = [...new Set(issues.map(fieldOf))].filter(Boolean);

  return { errors: fields.map((field) => ({ field })) };
};
