/**
 * エラー定義。各ファイルが oRPC の `.errors()` に渡す仕様を持つ。
 * 契約側は必要なものだけを直接 import する。
 *
 * ## 何を持ち、何を持たないか
 *
 * **持つのは `status` と `message` だけ。** どちらも oRPC の応答（封筒）が
 * そのまま載せるため、本文で二重に持たない。
 *
 * ```json
 * { "defined": true, "code": "FORBIDDEN_ERROR", "status": 403,
 *   "message": "この操作を行う権限がありません" }
 * ```
 *
 * `data` を持つのは**追加情報があるエラーだけ** (いまは BadRequestError の
 * `errors` のみ)。
 *
 * ## 業務コード (4 桁) を持たない理由
 *
 * **`code` に契約のキーがそのまま出るため。** 同じステータスの 2 つ
 * (401 の Unauthorized と PasswordMismatch、409 の Conflict と
 * MailAddressDuplication) は `UNAUTHORIZED_ERROR` / `PASSWORD_MISMATCH_ERROR`
 * のように名前で区別できる。数字の体系を別に維持する理由が無い。
 *
 * クライアントは `isDefinedError(error) && error.code === "FORBIDDEN_ERROR"` で
 * **型付きのまま**分岐できる。数字より読めるうえ、`data` の型も一緒に絞られる。
 */

export * from "./bad-request-error.js";
export * from "./conflict-error.js";
export * from "./error-item.js";
export * from "./forbidden-error.js";
export * from "./internal-server-error.js";
export * from "./mail-address-duplication-error.js";
export * from "./password-mismatch-error.js";
export * from "./resource-not-found-error.js";
export * from "./unauthorized-error.js";
