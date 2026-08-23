import * as v from 'valibot'

import { PasswordSchema } from './model/index.js'

/**
 * パスワード変更リクエストの本文。
 *
 * 対象の `id` は URL のパスパラメータで受け取るため、本文には含まれない。
 */
export const ChangePasswordRequestSchema = v.object({
  /** 現在のパスワード。本人確認 (セッション乗っ取り対策) のため必須 */
  currentPassword: PasswordSchema,
  newPassword: PasswordSchema,
})

export type ChangePasswordRequest = v.InferOutput<typeof ChangePasswordRequestSchema>
