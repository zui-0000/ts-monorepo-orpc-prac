import * as v from "valibot";

// 契約の MailAddressSchema と同一パターン (RFC 5322 準拠)。
const MAIL_ADDRESS_PATTERN =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/u;

/**
 * メールアドレス (値オブジェクト / branded string)。
 * **検証だけを行い、値は変えない。** 利用者が名乗った表記をそのまま持つ。
 *
 * `v.email()` を使わないのは、**契約と判定がズレるから**。境界では契約の
 * `MailAddressSchema` (上と同じ regex) が検証し、ここは同じ値をドメインの型へ
 * 変えるだけなので、両者が食い違うと**契約を通った入力がここで throw して 500 になる**
 * (`Result.gen` は本体の throw を Panic に変えて外へ出す)。
 *
 * 契約は OpenAPI の `pattern` として出るため、実装側の都合には寄せられない。
 * 逆に**ここが契約より緩いのも駄目** — 契約が弾いた値をドメインが受け入れる形になり、
 * 検証の意味が経路によって変わる。ズレていないことは規則の一致で担保する
 * (突き合わせのテストは ADR-02 の宿題)。
 *
 * 小文字へ正規化しないのは、潰すと元の表記を復元できないから。RFC 5321 §2.4 は
 * ローカル部の大小保存を要求しており、区別する受信サーバへ送ると届かなくなる。
 * 大小違いの重複は DB 側の `lower(mail_address)` 一意索引で防ぐ (経緯は契約側)。
 *
 * shared に置くのは契約の配置に合わせたもの。user 以外の文脈でも同じ形を使う。
 */
export const MailAddressSchema = v.pipe(
  v.string(),
  v.maxLength(255),
  v.regex(MAIL_ADDRESS_PATTERN),
  v.brand("MailAddress"),
);

export type MailAddress = v.InferOutput<typeof MailAddressSchema>;
