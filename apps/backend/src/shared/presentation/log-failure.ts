import { ORPCError } from "@orpc/server";

/**
 * 失敗を構造化ログに 1 行で残す。
 *
 * **相関できる形であればよい**ので、ログライブラリは入れない。
 *
 * ## 値は出さない
 *
 * 送信値をログへ書かない理由と整形の規則は `shared/errors/validation-issue.ts`
 * にまとめてある (presentation とドメインの両方が同じ整形を通るため)。
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
