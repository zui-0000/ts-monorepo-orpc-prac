import * as v from "valibot";

import { HttpStatus } from "../constants/index.js";
import { ErrorItemSchema } from "./error-item.js";

/** リクエスト内容が不正 (汎用) */
export const BadRequestErrorSchema = v.pipe(
  v.object({
    errors: v.array(ErrorItemSchema),
  }),
  v.examples([{ errors: [{ field: "email" }] }]),
);

export type BadRequestErrorData = v.InferOutput<typeof BadRequestErrorSchema>;

export const BadRequestError = {
  status: HttpStatus.BAD_REQUEST,
  message: "リクエスト内容が不正です",
  data: BadRequestErrorSchema,
} as const;
