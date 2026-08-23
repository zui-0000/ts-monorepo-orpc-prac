import * as v from 'valibot'

/** 更新日時 (RFC 3339 / ISO 8601, PostgreSQL TIMESTAMPTZ互換) */
export const UpdatedAtSchema = v.pipe(
  v.string(),
  v.isoTimestamp(),
  v.description('更新日時'),
  v.examples(['2025-01-01T12:00:00Z']),
)

export type UpdatedAt = v.InferOutput<typeof UpdatedAtSchema>
