import * as v from 'valibot'

import { HttpStatus } from '../constants/index.js'
import { ErrorItemSchema } from './error-item.js'
import { ErrorTitleSchema } from './error-title.js'

/** リクエスト内容が不正 (汎用) */
export const BadRequestErrorSchema = v.object({
  status: v.literal(HttpStatus.BAD_REQUEST),
  code: v.literal('4000'),
  title: ErrorTitleSchema,
  errors: v.optional(v.array(ErrorItemSchema)),
})

export type BadRequestErrorData = v.InferOutput<typeof BadRequestErrorSchema>

/** oRPC の .errors() に渡すエラー仕様 */
export const BadRequestError = {
  status: HttpStatus.BAD_REQUEST,
  message: 'リクエスト内容が不正です',
  data: BadRequestErrorSchema,
} as const
