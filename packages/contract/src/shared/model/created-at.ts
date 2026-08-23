import * as v from 'valibot'

/** 作成日時 (RFC 3339 / ISO 8601, PostgreSQL TIMESTAMPTZ互換) */
export const CreatedAtSchema = v.pipe(
  v.string(),
  v.isoTimestamp(),
  v.description('作成日時'),
)

export type CreatedAt = v.InferOutput<typeof CreatedAtSchema>
