import { TaggedError } from "better-result";

/**
 * ドメインの規則に反する値を受け取った (実装の誤り)。
 * 業務上の失敗ではないため `Result.err` では返さず throw する (設計関連/ADR-04)。
 * 持つのは違反した規則だけで、値は載せない。
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
