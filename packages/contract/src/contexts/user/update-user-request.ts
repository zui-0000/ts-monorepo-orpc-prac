import * as v from "valibot";

import { MailAddressSchema } from "../../shared/model/index.js";
import { UserNameSchema } from "./model/index.js";

export const UpdateUserRequestSchema = v.object({
  name: UserNameSchema,
  mailAddress: MailAddressSchema,
});

export type UpdateUserRequest = v.InferOutput<typeof UpdateUserRequestSchema>;
