import * as v from "valibot";

import { PasswordSchema } from "./model/index.js";

export const ChangePasswordRequestSchema = v.object({
  currentPassword: PasswordSchema,
  newPassword: PasswordSchema,
});

export type ChangePasswordRequest = v.InferOutput<
  typeof ChangePasswordRequestSchema
>;
