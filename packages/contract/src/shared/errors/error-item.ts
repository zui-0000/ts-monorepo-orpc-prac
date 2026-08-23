import * as v from 'valibot'

/** エラーの内訳 (フィールド単位の指摘) */
export const ErrorItemSchema = v.object({
  field: v.string(),
  message: v.string(),
})

export type ErrorItem = v.InferOutput<typeof ErrorItemSchema>
