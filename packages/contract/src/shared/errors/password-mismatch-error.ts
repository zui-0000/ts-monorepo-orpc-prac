import * as v from 'valibot'

import { HttpStatus } from '../constants/index.js'
import { ErrorTitleSchema } from './error-title.js'

/**
 * 現在のパスワードが一致しない。
 *
 * パスワード変更でのみ返す。汎用の 401 (UnauthorizedError) と分けておくと、
 * クライアントが打ち間違いとして扱える (トークンの更新やログアウトへ倒さない)。
 *
 * 認証の失敗理由を書き分けないという方針の例外にあたる。許されるのは、この応答を
 * 受け取る時点で相手が本人だと既に証明済みだから (Bearer は通っている)。
 * 自分のパスワードを打ち間違えたと伝えても、その人が知らない情報は漏れない。
 */
export const PasswordMismatchErrorSchema = v.pipe(
  v.object({
  status: v.literal(HttpStatus.UNAUTHORIZED),
  code: v.literal('4011'),
  title: ErrorTitleSchema,
}),
  v.examples([{ status: 401, code: '4011', title: '現在のパスワードが正しくありません' }]),
)

export type PasswordMismatchErrorData = v.InferOutput<typeof PasswordMismatchErrorSchema>

/** oRPC の .errors() に渡すエラー仕様 */
export const PasswordMismatchError = {
  status: HttpStatus.UNAUTHORIZED,
  message: '現在のパスワードが正しくありません',
  data: PasswordMismatchErrorSchema,
} as const
