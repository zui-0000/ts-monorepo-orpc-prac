/**
 * 検証ライブラリが返す issue を、値を含まない形で言い表す。
 * issue には送信値がそのまま入るため、規則の側の情報だけを残す
 * (`password:min_length(12)`)。応答もログも漏洩経路なので同じ扱いにする。
 *
 * `shared/errors/` に置くのは presentation とドメインの双方が使うため。
 */

/** issue のうち、ログ・応答に出してよい部分だけ。 */
export type ValidationIssue = {
  readonly type?: string;
  /** 規則の内容。正規表現やオブジェクトが入るため、文字列・数値のときだけ出す。 */
  readonly requirement?: unknown;
  readonly path?: readonly { readonly key?: unknown }[];
};

/** path からフィールド名を組み立てる。path が無い検証では `rootField` を使う。 */
export const fieldOf = (issue: ValidationIssue, rootField = "(root)"): string =>
  (issue.path ?? [])
    .map((segment) => segment.key)
    .filter((key): key is string | number => key !== undefined)
    .join(".") || rootField;

/** 違反を `field:rule(requirement)` の形にする。値は含めない。 */
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
