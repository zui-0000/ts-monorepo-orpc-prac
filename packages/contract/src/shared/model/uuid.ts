import * as v from "valibot";

/**
 * UUID v7。
 */
export const UuidSchema = v.pipe(
  v.string(),
  v.regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    "UUID v7 の形式ではありません",
  ),
  v.description("UUID v7"),
  v.examples(["018eef15-1234-7123-8123-123456789abc"]),
);

export type Uuid = v.InferOutput<typeof UuidSchema>;
