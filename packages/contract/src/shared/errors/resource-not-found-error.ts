import * as v from 'valibot'

import { HttpStatus } from '../constants/index.js'
import { ErrorTitleSchema } from './error-title.js'

/** リソースが存在しない (汎用) */
export const ResourceNotFoundErrorSchema = v.pipe(
  v.object({
  status: v.literal(HttpStatus.NOT_FOUND),
  code: v.literal('4040'),
  title: ErrorTitleSchema,
}),
  v.examples([{ status: 404, code: '4040', title: '指定されたリソースは存在しません' }]),
)

export type ResourceNotFoundErrorData = v.InferOutput<typeof ResourceNotFoundErrorSchema>

/** oRPC の .errors() に渡すエラー仕様 */
export const ResourceNotFoundError = {
  status: HttpStatus.NOT_FOUND,
  message: '指定されたリソースは存在しません',
  data: ResourceNotFoundErrorSchema,
} as const
