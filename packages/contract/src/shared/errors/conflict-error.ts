import { HttpStatus } from "../constants/index.js";

/** リソースの現在の状態と衝突する (汎用) */
export const ConflictError = {
  status: HttpStatus.CONFLICT,
  message: "リソースの現在の状態と衝突します",
} as const;
