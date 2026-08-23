import * as v from 'valibot'

import { HttpStatus } from '../constants/index.js'
import { ErrorTitleSchema } from './error-title.js'

/** メールアドレスが既に使用されている */
export const MailAddressDuplicationErrorSchema = v.object({
  status: v.literal(HttpStatus.CONFLICT),
  code: v.literal('4091'),
  title: ErrorTitleSchema,
})

export type MailAddressDuplicationErrorData = v.InferOutput<typeof MailAddressDuplicationErrorSchema>

/** oRPC の .errors() に渡すエラー仕様 */
export const MailAddressDuplicationError = {
  status: HttpStatus.CONFLICT,
  message: 'メールアドレスが既に使用されています',
  data: MailAddressDuplicationErrorSchema,
} as const
