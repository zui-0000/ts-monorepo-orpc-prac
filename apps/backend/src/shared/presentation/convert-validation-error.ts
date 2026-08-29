import type { BadRequestErrorData } from "@orpc-prac/contract";
import { ORPCError, ValidationError } from "@orpc/server";

import {
  fieldOf,
  formatViolations,
  type ValidationIssue,
} from "~/shared/errors/validation-issue.ts";

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
 *
 * 捕まえて詰め替えるこの形は oRPC 公式のレシピ (Validation Customization) と同じ。
 * **issue の中身をマスクする設定は用意されていない** — 検証は Standard Schema 側が
 * 行うため、oRPC からは触れないためである。
 *
 * **出力検証エラーはここで扱わない。** 応答が自分の契約に合わないのは実装の誤りで、
 * 呼び出し側が対処できるものではない。oRPC は出力側の issue を `data` に載せない
 * ため送信値も漏れない (載るのは `defined:false` と "Output validation failed" の
 * 文言だけ)。
 */

export type ValidationFailure = {
  /** 応答に載せるもの。**フィールド名だけ。** */
  readonly data: BadRequestErrorData;
  /** ログに残すもの。**規則の情報だけで、値は含まない。** */
  readonly violations: string;
};

export const toValidationFailure = (
  error: unknown,
): ValidationFailure | undefined => {
  // **`cause` が `ValidationError` かで判定する。** `!error.defined` だけで見ると、
  // 検証と無関係な素の BAD_REQUEST まで検証エラーに化けさせてしまう。
  //
  // 真偽値の const に畳まず条件を直に書くのは、そうしないと `error.cause` の
  // 絞り込みが下まで届かないため (TS は const 越しにプロパティを絞らない)。
  if (
    !(error instanceof ORPCError) ||
    error.code !== "BAD_REQUEST" ||
    !(error.cause instanceof ValidationError)
  ) {
    return undefined;
  }

  // **`cause.issues` から読む。** `error.data` に issues を入れるのは oRPC の
  // 内部的な選択だが、`ValidationError.issues` は公開された型である。
  //
  // Standard Schema の Issue は `message` と `path` しか約束しない。`type` と
  // `requirement` は valibot の拡張なので、**あるものだけ使う**形へ広げる
  // (`ValidationIssue` 側がすべて省略可能にしてある)。
  const issues = error.cause.issues as readonly ValidationIssue[];

  // **どのフィールドが不正か、だけを返す。** issue には送信値がそのまま入る。
  const fields = [...new Set(issues.map((issue) => fieldOf(issue, "")))].filter(
    Boolean,
  );

  return {
    data: { errors: fields.map((field) => ({ field })) },
    violations: formatViolations(issues),
  };
};
