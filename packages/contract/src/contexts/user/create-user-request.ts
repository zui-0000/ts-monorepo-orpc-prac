import * as v from "valibot";

import { MailAddressSchema } from "../../shared/model/index.js";
import { PasswordSchema, UserNameSchema } from "./model/index.js";

export const CreateUserRequestSchema = v.object({
  name: UserNameSchema,
  mailAddress: MailAddressSchema,
  password: PasswordSchema,
});

export type CreateUserRequest = v.InferOutput<typeof CreateUserRequestSchema>;
