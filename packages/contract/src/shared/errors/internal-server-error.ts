import * as v from "valibot";

import { HttpStatus } from "../constants/index.js";
import { ErrorTitleSchema } from "./error-title.js";

/** サーバー内部で予期せぬエラーが発生した (汎用) */
export const InternalServerErrorSchema = v.pipe(
  v.object({
    status: v.literal(HttpStatus.INTERNAL_SERVER_ERROR),
    code: v.literal("5000"),
    title: ErrorTitleSchema,
  }),
  v.examples([
    {
      status: 500,
      code: "5000",
      title: "サーバーで予期せぬエラーが発生しました",
    },
  ]),
);

export type InternalServerErrorData = v.InferOutput<
  typeof InternalServerErrorSchema
>;

export const InternalServerError = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  message: "サーバーで予期せぬエラーが発生しました",
  data: InternalServerErrorSchema,
} as const;
