import * as v from 'valibot'

/**
 * UUID v7。
 *
 * TypeSpec 側の `@pattern` をそのまま移植している。
 * 汎用の uuid 検証ではなく正規表現を使うのは、**v7 であること**（3 番目のブロックが
 * `7` で始まり、4 番目が `[89ab]`）まで契約で縛るため。
 */
export const UuidSchema = v.pipe(
  v.string(),
  v.regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    'UUID v7 の形式ではありません',
  ),
  v.description('UUID v7'),
)

export type Uuid = v.InferOutput<typeof UuidSchema>
