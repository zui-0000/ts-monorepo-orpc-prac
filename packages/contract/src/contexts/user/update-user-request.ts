import * as v from "valibot";

import { EmailSchema } from "../../shared/model/index.js";
import { UserNameSchema } from "./model/index.js";

export const UpdateUserRequestSchema = v.object({
  name: UserNameSchema,
  email: EmailSchema,
});

export type UpdateUserRequest = v.InferOutput<typeof UpdateUserRequestSchema>;
