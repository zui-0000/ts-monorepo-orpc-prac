import { HttpStatus } from "../constants/index.js";

/** 認証情報が不正 (汎用) */
export const UnauthorizedError = {
  status: HttpStatus.UNAUTHORIZED,
  message: "認証情報が正しくありません",
} as const;
