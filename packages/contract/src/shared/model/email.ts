import * as v from "valibot";

/**
 * メールアドレス (RFC 5322 準拠)。
 * 大文字小文字は区別せず同一のアドレスとして扱う。保存時に小文字へ正規化される。
 *
 * ## なぜ同一人物とみなすか
 *
 * RFC 5321 §2.4 はドメイン部を大小無視と定める一方、ローカル部は
 * "MUST BE treated as case sensitive" と書く。規格だけ読むと別アドレスになる。
 * ただし同じ節が "impedes interoperability and is discouraged" と続き、
 * 実際の事業者は区別しない。規格に忠実に「別アドレス」とすると、同じ人が
 * Taro.Yamada@ と taro.yamada@ で 2 アカウント作れ、前に使った大小を忘れると
 * ログインできない。**日常的に起きる事故**のほうを避けた。
 *
 * ## 保存されるのは小文字
 *
 * RFC 5321 §2.4 は SMTP 実装に "MUST take care to preserve the case of mailbox
 * local-parts" と要求しており、表記を保存するのが本来の姿ではある。
 * ただし**認証を better-auth に委ねたため、保存時に小文字化される**
 * (設計関連/ADR-07)。契約はここで正規化せず、受け取った値をそのまま通す。
 *
 * 一意性は DB 側の UNIQUE 制約 `t_user_email_key` が担保する。
 */
export const EmailSchema = v.pipe(
  v.string(),
  v.maxLength(255),
  v.regex(
    /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/u,
    "メールアドレスの形式が不正です",
  ),
  v.description("メールアドレス (RFC 5322準拠)"),
  v.examples(["user@example.com"]),
);

export type Email = v.InferOutput<typeof EmailSchema>;
