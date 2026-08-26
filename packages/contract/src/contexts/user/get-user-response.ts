import * as v from "valibot";

import { EmailSchema } from "../../shared/model/index.js";
import { UserNameSchema } from "./model/index.js";

export const GetUserResponseSchema = v.object({
  name: UserNameSchema,
  email: EmailSchema,
});

export type GetUserResponse = v.InferOutput<typeof GetUserResponseSchema>;
