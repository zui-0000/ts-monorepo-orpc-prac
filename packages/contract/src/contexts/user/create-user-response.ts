import * as v from "valibot";

import { UserIdSchema } from "./model/index.js";

export const CreateUserResponseSchema = v.object({
  id: UserIdSchema,
});

export type CreateUserResponse = v.InferOutput<typeof CreateUserResponseSchema>;
