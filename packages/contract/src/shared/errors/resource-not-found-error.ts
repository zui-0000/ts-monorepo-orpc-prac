import { HttpStatus } from "../constants/index.js";

/** リソースが存在しない (汎用) */
export const ResourceNotFoundError = {
  status: HttpStatus.NOT_FOUND,
  message: "指定されたリソースは存在しません",
} as const;
