import { TaggedError } from "better-result";

/**
 * ドメインの規則に反する値を受け取った (**実装の誤り**)。
 *
 * ## これは業務上の失敗ではない
 *
 * だから `Result.err` では返さず **throw する。** 起きる原因は 3 つとも
 * 呼び出し側にはどうにもできないもの:
 *
 * - 契約とドメインで規則がズレた (契約を通った値がドメインで落ちる)
 * - アダプタが壊れた (ハッシュ化・UUID 採番が想定の形を返さない)
 * - DB の行がドメインの制約を満たさない (移行漏れ、直接の書き換え)
 *
 * `Result.err` にすると全ユースケースのエラー型にこれが並び、
 * **呼び出し側が対処しようのない失敗を握らされる。** 応答は 500 一択で、
 * 直すのはコードのほう。
 *
 * ## 値は持たない
 *
 * 持つのは `violations` (`mailAddress:regex` の形) だけ。
 * 検証ライブラリの例外をそのまま投げると `received "..."` として
 * **値が混ざったままログへ流れる** — これを避けるのがこの型の存在理由。
 */
export class InvariantViolationError extends TaggedError(
  "InvariantViolationError",
)<{
  readonly message: string;
  readonly violations: string;
}> {
  constructor(violations: string) {
    super({
      message: `ドメインの規則に反する値を受け取りました: ${violations}`,
      violations,
    });
  }
}
