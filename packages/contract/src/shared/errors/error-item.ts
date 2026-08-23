import * as v from 'valibot'

/**
 * エラーの内訳。**どのフィールドが不正だったか**だけを伝える。
 *
 * 文言 (message) は持たない。検証ライブラリが作る文言には入力値が乗るため
 * (実測: パスワードに数値を送ると "Expected string but received 12345")、
 * そのまま転記すると入力専用のはずの値が応答へ漏れる。
 * 文言が必要になったら、フィールドごとの定型文をこちら側で持つこと。
 */
export const ErrorItemSchema = v.pipe(
  v.object({
    field: v.pipe(v.string(), v.description('不正だったフィールド名')),
  }),
  v.examples([{ field: 'mailAddress' }]),
)

export type ErrorItem = v.InferOutput<typeof ErrorItemSchema>
