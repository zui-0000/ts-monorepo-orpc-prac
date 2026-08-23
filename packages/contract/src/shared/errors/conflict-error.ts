import * as v from "valibot";

import { HttpStatus } from "../constants/index.js";
import { ErrorTitleSchema } from "./error-title.js";

/** リソースの現在の状態と衝突する (汎用) */
export const ConflictErrorSchema = v.pipe(
  v.object({
    status: v.literal(HttpStatus.CONFLICT),
    code: v.literal("4090"),
    title: ErrorTitleSchema,
  }),
  v.examples([
    { status: 409, code: "4090", title: "リソースの現在の状態と衝突します" },
  ]),
);

export type ConflictErrorData = v.InferOutput<typeof ConflictErrorSchema>;

export const ConflictError = {
  status: HttpStatus.CONFLICT,
  message: "リソースの現在の状態と衝突します",
  data: ConflictErrorSchema,
} as const;
