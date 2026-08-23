import * as v from "valibot";

import type { Clock } from "~/shared/domain/clock.ts";
import {
  type MailAddress,
  MailAddressSchema,
} from "~/shared/domain/model/value-objects/mail-address.ts";
import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import type { UuidGenerator } from "~/shared/domain/uuid-generator.ts";

import {
  type UserHashedPassword,
  UserHashedPasswordSchema,
} from "./value-objects/user-hashed-password.ts";
import { UserIdSchema } from "./value-objects/user-id.ts";
import { type UserName, UserNameSchema } from "./value-objects/user-name.ts";

/**
 * User 集約ルート。
 */
export const UserSchema = v.object({
  id: UserIdSchema,
  name: UserNameSchema,
  mailAddress: MailAddressSchema,
  hashedPassword: UserHashedPasswordSchema,
  createdAt: v.date(),
  updatedAt: v.date(),
});

export type User = v.InferOutput<typeof UserSchema>;

/**
 * 新規ユーザーを生成する。
 */
export const createUser = (
  deps: { readonly uuidGenerator: UuidGenerator; readonly clock: Clock },
  params: {
    readonly name: UserName;
    readonly mailAddress: MailAddress;
    readonly hashedPassword: UserHashedPassword;
  },
): User => {
  const timestamp = deps.clock.now();

  return {
    id: parseInvariant(UserIdSchema, deps.uuidGenerator.generate()),
    name: params.name,
    mailAddress: params.mailAddress,
    hashedPassword: params.hashedPassword,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};
