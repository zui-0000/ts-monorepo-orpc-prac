import * as v from 'valibot'

import { MailAddressSchema } from '../../shared/model/index.js'
import { UserNameSchema } from './model/index.js'

/**
 * ユーザー更新リクエストの本文。
 *
 * 対象の `id` は URL のパスパラメータで受け取るため、本文には含まれない。
 * 契約側で path パラメータと合成して入力全体を組み立てる。
 */
export const UpdateUserRequestSchema = v.object({
  name: UserNameSchema,
  mailAddress: MailAddressSchema,
})

export type UpdateUserRequest = v.InferOutput<typeof UpdateUserRequestSchema>
