import * as v from 'valibot'

import { HttpStatus } from '../constants/index.js'
import { ErrorTitleSchema } from './error-title.js'

/** 認証情報が不正 (汎用) */
export const UnauthorizedErrorSchema = v.pipe(
  v.object({
  status: v.literal(HttpStatus.UNAUTHORIZED),
  code: v.literal('4010'),
  title: ErrorTitleSchema,
}),
  v.examples([{ status: 401, code: '4010', title: '認証情報が正しくありません' }]),
)

export type UnauthorizedErrorData = v.InferOutput<typeof UnauthorizedErrorSchema>

/** oRPC の .errors() に渡すエラー仕様 */
export const UnauthorizedError = {
  status: HttpStatus.UNAUTHORIZED,
  message: '認証情報が正しくありません',
  data: UnauthorizedErrorSchema,
} as const
