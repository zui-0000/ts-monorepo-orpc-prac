import { Result } from "better-result";
import * as v from "valibot";

import type { Clock } from "~/shared/domain/clock.ts";
import {
  type Email,
  EmailSchema,
} from "~/shared/domain/model/value-objects/email.ts";
import { parseInvariant } from "~/shared/domain/parse-invariant.ts";
import type { PasswordHasher } from "~/shared/domain/password-hasher.ts";
import type { UuidGenerator } from "~/shared/domain/uuid-generator.ts";
import { PasswordMismatchError } from "~/shared/errors/password-mismatch-error.ts";

import type { Password } from "./value-objects/password.ts";
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
  email: EmailSchema,
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
    readonly email: Email;
    readonly hashedPassword: UserHashedPassword;
  },
): User => {
  const timestamp = deps.clock.now();

  return {
    id: parseInvariant(UserIdSchema, deps.uuidGenerator.generate()),
    name: params.name,
    email: params.email,
    hashedPassword: params.hashedPassword,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

/**
 * プロフィールを変更した集約を返す。元の User は書き換えない。
 * 契約が PUT (全置換) なので「変更後の値で差し替える」操作として表現する。
 */
export const changeUserProfile = (
  deps: { readonly clock: Clock },
  user: User,
  params: { readonly name: UserName; readonly email: Email },
): User => ({
  ...user,
  name: params.name,
  email: params.email,
  updatedAt: deps.clock.now(),
});

/**
 * 渡された平文が、このユーザーの現在のパスワードかを確かめる。
 * 集約 1 つで答えが出るためドメインサービスではなく集約に置く。
 */
export const verifyUserPassword = async (
  deps: { readonly passwordHasher: PasswordHasher },
  user: User,
  plainText: Password,
): Promise<Result<void, PasswordMismatchError>> => {
  const matched = await deps.passwordHasher.verify(
    plainText,
    user.hashedPassword,
  );
  return matched ? Result.ok() : Result.err(new PasswordMismatchError());
};

/**
 * パスワードを変更した集約を返す。受け取るのはハッシュ済みの値だけで、
 * 平文も本人確認もここには現れない。
 */
export const changeUserPassword = (
  deps: { readonly clock: Clock },
  user: User,
  hashedPassword: UserHashedPassword,
): User => ({
  ...user,
  hashedPassword,
  updatedAt: deps.clock.now(),
});
