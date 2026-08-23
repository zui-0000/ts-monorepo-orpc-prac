import * as v from "valibot";

import { UuidSchema } from "~/shared/domain/model/uuid.ts";

/** ユーザーの識別子 (値オブジェクト / branded uuidv7)。形式検証は共有ドメインの Uuid。 */
export const UserIdSchema = v.pipe(UuidSchema, v.brand("User.Id"));

export type UserId = v.InferOutput<typeof UserIdSchema>;
