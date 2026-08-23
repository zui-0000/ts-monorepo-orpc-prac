import { HttpStatus } from "../constants/index.js";

/** サーバー内部で予期せぬエラーが発生した (汎用) */
export const InternalServerError = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  message: "サーバーで予期せぬエラーが発生しました",
} as const;
