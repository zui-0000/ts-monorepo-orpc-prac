import { oc } from "@orpc/contract";
import * as v from "valibot";

import { HttpMethod, HttpStatus } from "../../shared/constants/index.js";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  ResourceNotFoundError,
  UnauthorizedError,
} from "../../shared/errors/index.js";
import { GetUserResponseSchema } from "./get-user-response.js";
import { UserIdSchema } from "./model/index.js";
import { UpdateUserRequestSchema } from "./update-user-request.js";

/** 対象ユーザーを指す path パラメータ */
const UserIdParamSchema = v.object({ id: UserIdSchema });

// サインアップ・サインイン・パスワード変更・**削除**はここに無い。
// better-auth が自前の HTTP 経路で持つため (設計関連/ADR-07, ADR-09)。
// 削除は /api/auth/delete-user がセッションの持ち主自身を消す形で受け持つ。

export const getUser = oc
  .route({
    method: HttpMethod.GET,
    path: "/users/{id}",
    successStatus: HttpStatus.OK,
    operationId: "getUser",
    tags: ["Users"],
    summary: "IDを指定してユーザーを取得する",
    description: "要認証。本人のリソースだけを取得できる。",
  })
  .input(UserIdParamSchema)
  .output(GetUserResponseSchema)
  .errors({
    BAD_REQUEST_ERROR: BadRequestError,
    UNAUTHORIZED_ERROR: UnauthorizedError,
    FORBIDDEN_ERROR: ForbiddenError,
    RESOURCE_NOT_FOUND_ERROR: ResourceNotFoundError,
    INTERNAL_SERVER_ERROR: InternalServerError,
  });

export const updateUser = oc
  .route({
    method: HttpMethod.PUT,
    path: "/users/{id}",
    successStatus: HttpStatus.NO_CONTENT,
    operationId: "updateUser",
    tags: ["Users"],
    summary: "プロフィールを更新する",
    description:
      "要認証。本人のリソースだけを更新できる。表示名とメールアドレスは認証基盤が持つため含まない。",
  })
  .input(
    v.object({
      ...UpdateUserRequestSchema.entries,
      ...UserIdParamSchema.entries,
    }),
  )
  .output(v.void())
  .errors({
    BAD_REQUEST_ERROR: BadRequestError,
    UNAUTHORIZED_ERROR: UnauthorizedError,
    FORBIDDEN_ERROR: ForbiddenError,
    RESOURCE_NOT_FOUND_ERROR: ResourceNotFoundError,
    INTERNAL_SERVER_ERROR: InternalServerError,
  });

export const userContract = {
  get: getUser,
  update: updateUser,
} as const;
