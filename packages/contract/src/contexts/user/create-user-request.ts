import * as v from "valibot";

import { EmailSchema } from "../../shared/model/index.js";
import { PasswordSchema, UserNameSchema } from "./model/index.js";

export const CreateUserRequestSchema = v.object({
  name: UserNameSchema,
  email: EmailSchema,
  password: PasswordSchema,
});

export type CreateUserRequest = v.InferOutput<typeof CreateUserRequestSchema>;
