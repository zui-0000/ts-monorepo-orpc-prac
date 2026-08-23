import * as v from 'valibot'

import { UuidSchema } from './uuid.js'

/**
 * リクエストの相関ID (UUID v7)。
 * クライアントが採番するとログを突き合わせて追跡できる。
 * 省略・不正な形式ならサーバーが採番する。
 */
export const RequestIdSchema = v.pipe(
  UuidSchema,
  v.description('リクエストの相関ID (UUID v7)'),
  v.examples(['018eef15-1234-7123-8123-123456789abc']),
)

export type RequestId = v.InferOutput<typeof RequestIdSchema>
