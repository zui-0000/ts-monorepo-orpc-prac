import * as v from 'valibot'

/** エラーの表題 (何が起きたかを 1 行で表す) */
export const ErrorTitleSchema = v.pipe(v.string(), v.description('エラーの表題'))

export type ErrorTitle = v.InferOutput<typeof ErrorTitleSchema>
