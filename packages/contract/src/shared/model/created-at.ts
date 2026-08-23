import * as v from "valibot";

/** 作成日時 (RFC 3339 / ISO 8601, PostgreSQL TIMESTAMPTZ互換) */
export const CreatedAtSchema = v.pipe(
  v.string(),
  v.isoTimestamp(),
  v.description("作成日時"),
  v.examples(["2025-01-01T12:00:00Z"]),
);

export type CreatedAt = v.InferOutput<typeof CreatedAtSchema>;
