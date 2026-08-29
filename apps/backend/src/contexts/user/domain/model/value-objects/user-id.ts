import * as v from "valibot";

import { UuidSchema } from "~/shared/domain/model/uuid.ts";

/**
 * 利用者の識別子 (値オブジェクト / branded uuidv7)。形式検証は共有ドメインの Uuid。
 *
 * **指すのは `auth.t_user` の行**で、採番するのは better-auth (設計関連/ADR-07)。
 * `UserProfile` 集約はこの id を主キーとして借りているだけなので、
 * `UserProfile.Id` ではない。
 */
export const UserIdSchema = v.pipe(UuidSchema, v.brand("User.Id"));

export type UserId = v.InferOutput<typeof UserIdSchema>;
