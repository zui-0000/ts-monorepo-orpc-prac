import * as v from 'valibot'

import { HttpStatus } from '../constants/index.js'
import { ErrorTitleSchema } from './error-title.js'

/**
 * 操作する権限が無い (汎用)。
 *
 * 認可の失敗は、**対象が存在するかどうかに関わらず 403** で返す。
 *
 * RFC 9110 §15.5.4 は「禁止されたリソースの存在を隠したいなら 404 を返してもよい」と
 * 認めている (GitHub がプライベートリポジトリでそうしている)。それでも 403 を選ぶのは、
 * **認可の失敗と不在を混ぜないほうが規則として一貫する**から。404 に畳むと「無かった」のか
 * 「見せてもらえなかった」のかが呼び出し側から永久に区別できず、クライアントは 404 のたびに
 * 認証を疑うことになる。
 *
 * 引き換えに、他人の id を指定したとき「その利用者は実在する」と教えることになる。
 * いまの規則は「本人のリソースだけ」なので、漏れるのは実在の有無だけ。
 * id は uuid v7 で 74 bit のランダム部を持つため、総当たりで実在を洗うのは非現実的。
 */
export const ForbiddenErrorSchema = v.pipe(
  v.object({
  status: v.literal(HttpStatus.FORBIDDEN),
  code: v.literal('4030'),
  title: ErrorTitleSchema,
}),
  v.examples([{ status: 403, code: '4030', title: 'この操作を行う権限がありません' }]),
)

export type ForbiddenErrorData = v.InferOutput<typeof ForbiddenErrorSchema>

/** oRPC の .errors() に渡すエラー仕様 */
export const ForbiddenError = {
  status: HttpStatus.FORBIDDEN,
  message: 'この操作を行う権限がありません',
  data: ForbiddenErrorSchema,
} as const
