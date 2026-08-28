import * as v from "valibot";

// 契約の EmailSchema と同一パターン (RFC 5322 準拠)。
const EMAIL_PATTERN =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/u;

/**
 * メールアドレス (値オブジェクト / branded string)。
 * **検証だけを行い、値は変えない。** 利用者が名乗った表記をそのまま持つ。
 *
 * `v.email()` を使わないのは、**契約と判定がズレるから**。境界では契約の
 * `EmailSchema` (上と同じ regex) が検証し、ここは同じ値をドメインの型へ
 * 変えるだけなので、両者が食い違うと**契約を通った入力がここで throw して 500 になる**
 * (`Result.gen` は本体の throw を Panic に変えて外へ出す)。
 *
 * 契約は OpenAPI の `pattern` として出るため、実装側の都合には寄せられない。
 * 逆に**ここが契約より緩いのも駄目** — 契約が弾いた値をドメインが受け入れる形になり、
 * 検証の意味が経路によって変わる。ズレていないことは規則の一致で担保する
 * (突き合わせのテストは ADR-02 の宿題)。
 *
 * **小文字化はここでは行わない。** better-auth が保存時に `toLowerCase()` するため、
 * DB に載る値は常に小文字になる。一意性も素の UNIQUE 制約 (`t_user_email_key`) が
 * 担う (設計関連/ADR-07、命名関連/ADR-03)。
 *
 * shared に置くのは契約の配置に合わせたもの。user 以外の文脈でも同じ形を使う。
 */
export const EmailSchema = v.pipe(
  v.string(),
  v.maxLength(255),
  v.regex(EMAIL_PATTERN),
  v.brand("Email"),
);

export type Email = v.InferOutput<typeof EmailSchema>;
