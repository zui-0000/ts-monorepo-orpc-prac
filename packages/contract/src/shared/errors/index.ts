/**
 * エラー定義。各ファイルが「valibot スキーマ」「ボディの型」「oRPC の `.errors()` に
 * 渡す仕様」の 3 つを揃えて持つ。契約側は必要なものだけを直接 import する。
 *
 * ## エラーコードについて
 *
 * `<HTTP ステータス><連番>` の 4 桁で、**各エラーがリテラルで持つ**。
 *
 * 共通のスカラーにして値を例示するだけだと、同じステータスの 2 つ (4010 と 4011) を
 * クライアントが型で区別できない — 分けた目的そのものが契約で表現できていない状態になる。
 * リテラルにすると `v.literal('4011')` になり、判別できる直和になる。
 *
 * ## status がステータス行とボディの 2 箇所に出ることについて
 *
 * 承知のうえの重複。エラーボディだけを取り回す読み手 (ログ、通知、画面へ渡した後の値) が
 * HTTP の応答を持たないまま何が起きたかを判別できるようにするため
 * (RFC 9457 の Problem Details も同じ理由で `status` を本文に持つ)。
 */

export * from "./bad-request-error.js";
export * from "./conflict-error.js";
export * from "./error-item.js";
export * from "./error-title.js";
export * from "./forbidden-error.js";
export * from "./internal-server-error.js";
export * from "./mail-address-duplication-error.js";
export * from "./password-mismatch-error.js";
export * from "./resource-not-found-error.js";
export * from "./unauthorized-error.js";
