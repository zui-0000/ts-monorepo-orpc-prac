import * as v from 'valibot'

import { UuidSchema } from '../../../shared/model/index.js'

/** ユーザーID (UUID v7) */
export const UserIdSchema = v.pipe(
  UuidSchema,
  v.description('ユーザーID (UUID v7)'),
)

export type UserId = v.InferOutput<typeof UserIdSchema>
