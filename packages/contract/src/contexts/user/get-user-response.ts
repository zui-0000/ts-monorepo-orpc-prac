import * as v from 'valibot'

import { MailAddressSchema } from '../../shared/model/index.js'
import { UserNameSchema } from './model/index.js'

/** ユーザー取得レスポンスの本文 */
export const GetUserResponseSchema = v.object({
  name: UserNameSchema,
  mailAddress: MailAddressSchema,
})

export type GetUserResponse = v.InferOutput<typeof GetUserResponseSchema>
