import { HttpStatus } from "../constants/index.js";

/** メールアドレスが既に使用されている */
export const EmailDuplicationError = {
  status: HttpStatus.CONFLICT,
  message: "メールアドレスが既に使用されています",
} as const;
