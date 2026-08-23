import { ORPCError } from "@orpc/server";

/**
 * 失敗を構造化ログに 1 行で残す。
 *
 * **相関できる形であればよい**ので、ログライブラリは入れない。
 *
 * ## 値は出さない
 *
 * 検証ライブラリの issue には送信値がそのまま入る (`input` / `received`、
 * `message` にも乗る)。ログも漏洩経路 — APM やログ基盤へ送られ、
 * 開発者以外の目にも触れる — なので、**規則の側の情報だけを残す。**
 *
 * ```
 * password: min_length(>=12)     ← 何文字だったかは出さない
 * ```
 *
 * これで「なぜ落ちたか」は追える。値そのものが要る場面は無い。
 *
 * ## 4xx と 5xx で粒度を変える
 *
 * 4xx は**呼び出し側の落ち度**なので、サーバ側で原因を追う必要が薄い。
 * 5xx だけ cause (スタックまで) を残す — 応答には定型文しか載せないため、
 * 何が起きたかを追える場所はログだけになる。
 */

type LogLevel = "WARN" | "ERROR";

const write = (
  level: LogLevel,
  message: string,
  context: Readonly<Record<string, unknown>>,
): void => {
  const fields = Object.entries(context)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");
  const line = `timestamp=${new Date().toISOString()} level=${level} message=${message} ${fields}`;

  if (level === "ERROR") {
    console.error(line);
  } else {
    console.warn(line);
  }
};

/** 検証ライブラリが返す issue のうち、ログに出してよい部分だけ。 */
type ValidationIssue = {
  readonly type?: string;
  /**
   * 規則の内容 (`min_length` なら 12 など)。
   * **文字列・数値のときだけログに出す。** 正規表現やオブジェクトが入ることが
   * あり、そのまま文字列化すると検証パターンが漏れる / [object Object] になる。
   */
  readonly requirement?: unknown;
  readonly path?: readonly { readonly key?: unknown }[];
};

const fieldOf = (issue: ValidationIssue): string =>
  (issue.path ?? [])
    .map((segment) => segment.key)
    .filter((key): key is string | number => key !== undefined)
    .join(".");

/**
 * 違反の一覧を `field:rule(requirement)` の形にする。**値は含めない。**
 */
export const formatViolations = (issues: readonly ValidationIssue[]): string =>
  issues
    .map((issue) => {
      const field = fieldOf(issue) || "(root)";
      const rule = issue.type ?? "invalid";
      const requirement =
        typeof issue.requirement === "number" ||
        typeof issue.requirement === "string"
          ? `(${issue.requirement})`
          : "";
      return `${field}:${rule}${requirement}`;
    })
    .join(",");

/** 入力検証の失敗を記録する (WARN)。 */
export const logValidationFailure = (violations: string): void => {
  write("WARN", "リクエストを受け付けられませんでした", {
    status: 400,
    code: "BAD_REQUEST_ERROR",
    violations,
  });
};

/**
 * 型付きエラーを記録する。5xx だけ ERROR、それ以外は WARN。
 *
 * **cause を出すのは 5xx だけ。** 4xx の cause には検証ライブラリの
 * 生データ (送信値を含む) が入りうるため。
 *
 * **入力検証の失敗はここでは出さない。** ミドルウェアが翻訳する時点で
 * 違反の内訳つきで記録済みで、そのエラーがここへも流れてくる。
 * 両方書くと同じ失敗が 2 行になり、しかも後から来るほうは内訳を持たない。
 */
export const logFailure = (error: unknown): void => {
  if (!(error instanceof ORPCError)) {
    write("ERROR", "リクエストの処理に失敗しました", {
      status: 500,
      cause:
        error instanceof Error ? (error.stack ?? error.message) : String(error),
    });
    return;
  }

  // ミドルウェアが記録済み (violations 付き)。二重に書かない。
  if (error.code === "BAD_REQUEST_ERROR" && error.defined) {
    return;
  }

  const context = {
    status: error.status,
    code: error.code,
    defined: error.defined,
  };

  if (error.status >= 500) {
    write("ERROR", "リクエストの処理に失敗しました", {
      ...context,
      cause:
        error.cause instanceof Error
          ? (error.cause.stack ?? error.cause.message)
          : String(error.cause),
    });
    return;
  }

  // 4xx は原因を出さない。呼び出し側の落ち度であり、cause に送信値が入りうる。
  write("WARN", "リクエストを受け付けられませんでした", context);
};
