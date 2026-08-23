import * as v from 'valibot'

/**
 * メールアドレス (RFC 5322 準拠)。
 * 大文字小文字は区別せず同一のアドレスとして扱うが、送った表記はそのまま保存され、そのまま返る。
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
 * ## なぜ小文字へ潰さないか
 *
 * 潰すと元の表記を復元できず、将来このアドレスへメールを送るとき、
 * 届くかどうかを受信サーバの設定に賭けることになる。同じ §2.4 が SMTP 実装に
 * "MUST take care to preserve the case of mailbox local-parts" と要求している
 * とおり、大小を保存するのが本来の姿。**避けられる賭けをする理由が無い。**
 *
 * 一意性は DB 側の lower(mail_address) 一意索引が担保する。
 */
export const MailAddressSchema = v.pipe(
  v.string(),
  v.maxLength(255),
  v.regex(
    /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    'メールアドレスの形式が不正です',
  ),
  v.description('メールアドレス (RFC 5322準拠)'),
  v.examples(['user@example.com']),
)

export type MailAddress = v.InferOutput<typeof MailAddressSchema>
