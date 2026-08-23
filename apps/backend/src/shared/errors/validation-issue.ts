/**
 * 検証ライブラリが返す issue を、**値を含まない形**で言い表す。
 *
 * ## なぜ値を出さないか
 *
 * issue には送信値がそのまま入る (`input` / `received`、`message` にも乗る)。
 * 応答もログも漏洩経路 — ログは APM や集約基盤へ送られ、開発者以外の目にも
 * 触れる — なので、**規則の側の情報だけを残す。**
 *
 * ```
 * password:min_length(12)     ← 何文字だったか、何を送ったかは出さない
 * ```
 *
 * これで「なぜ落ちたか」は追える。値そのものが要る場面は無い。
 *
 * ## 置き場所
 *
 * `shared/errors/` に置くのは、**presentation とドメインの両方が使う**ため。
 * 入口の検証エラー (`convert-validation-error.ts` / `log-failure.ts`) と、
 * ドメインへの変換の失敗 (`parse-invariant.ts`) が同じ整形を通る。
 * ここが層をまたいで参照される中立地帯であることは、
 * 既存のエラー型 (ForbiddenError 等) が全層から参照されているのと同じ。
 */

/** 検証ライブラリが返す issue のうち、ログ・応答に出してよい部分だけ。 */
export type ValidationIssue = {
  readonly type?: string;
  /**
   * 規則の内容 (`min_length` なら 12 など)。
   * **文字列・数値のときだけ出す。** 正規表現やオブジェクトが入ることがあり、
   * そのまま文字列化すると検証パターンが漏れる / [object Object] になる。
   */
  readonly requirement?: unknown;
  readonly path?: readonly { readonly key?: unknown }[];
};

/**
 * issue の path からフィールド名を組み立てる (例: `user.mailAddress`)。
 *
 * 値オブジェクト単体の検証には path が無い。その場合は呼び出し側が渡す
 * `rootField` で何を検証していたかを示す。
 */
export const fieldOf = (issue: ValidationIssue, rootField = "(root)"): string =>
  (issue.path ?? [])
    .map((segment) => segment.key)
    .filter((key): key is string | number => key !== undefined)
    .join(".") || rootField;

/**
 * 違反の一覧を `field:rule(requirement)` の形にする。**値は含めない。**
 */
export const formatViolations = (
  issues: readonly ValidationIssue[],
  rootField?: string,
): string =>
  issues
    .map((issue) => {
      const field = fieldOf(issue, rootField);
      const rule = issue.type ?? "invalid";
      const requirement =
        typeof issue.requirement === "number" ||
        typeof issue.requirement === "string"
          ? `(${issue.requirement})`
          : "";
      return `${field}:${rule}${requirement}`;
    })
    .join(",");
