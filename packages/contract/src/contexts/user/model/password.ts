import * as v from 'valibot'

/**
 * パスワード(平文)。入力専用で、レスポンスに含めないこと。
 *
 * - 下限 12: NIST SP 800-63B の最低 8 より強め (エントロピーは長さに支配されるため長さで稼ぐ)。
 * - 上限 128: bcrypt の 72バイト制限に縛られない前提で置く。超長文パスワードによる
 *   hash コスト増 (DoS) を防ぐ上限で、NIST の「64文字以上を許容」も満たす。
 * - 文字種の強制 (composition rules) は予測可能なパターンを誘発し逆効果のため、NIST 推奨に従い課さない。
 *   強度は長さ + アプリ層での漏洩パスワード照合 (ブロックリスト) で担保する。
 */
export const PasswordSchema = v.pipe(
  v.string(),
  v.minLength(12),
  v.maxLength(128),
  v.description('パスワード(平文)。入力専用で、レスポンスに含めないこと'),
  v.examples(['************']),
)

export type Password = v.InferOutput<typeof PasswordSchema>
