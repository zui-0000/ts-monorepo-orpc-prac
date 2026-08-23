import * as v from 'valibot'

import { UserIdSchema } from './model/index.js'

/** ユーザー作成レスポンスの本文 */
export const CreateUserResponseSchema = v.object({
  /** 採番された ID。クライアントはこれを使って GET /users/{id} を呼べる */
  id: UserIdSchema,
})

export type CreateUserResponse = v.InferOutput<typeof CreateUserResponseSchema>
