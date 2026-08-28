import * as v from "valibot";

import type { Clock } from "~/shared/domain/clock.ts";
import {
  type Email,
  EmailSchema,
} from "~/shared/domain/model/value-objects/email.ts";

import { UserIdSchema } from "./value-objects/user-id.ts";
import { type UserName, UserNameSchema } from "./value-objects/user-name.ts";

/**
 * User 集約ルート。
 *
 * 生成・認証・パスワードは better-auth が持つためここには現れない
 * (設計関連/ADR-07)。残るのはプロフィールの変更だけ。
 */
export const UserSchema = v.object({
  id: UserIdSchema,
  name: UserNameSchema,
  email: EmailSchema,
  createdAt: v.date(),
  updatedAt: v.date(),
});

export type User = v.InferOutput<typeof UserSchema>;

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
