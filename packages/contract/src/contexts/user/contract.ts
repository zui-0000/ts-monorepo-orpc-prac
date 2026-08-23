import { oc } from "@orpc/contract";
import * as v from "valibot";

import { HttpMethod, HttpStatus } from "../../shared/constants/index.js";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  MailAddressDuplicationError,
  PasswordMismatchError,
  ResourceNotFoundError,
  UnauthorizedError,
} from "../../shared/errors/index.js";
import { ChangePasswordRequestSchema } from "./change-password-request.js";
import { CreateUserRequestSchema } from "./create-user-request.js";
import { CreateUserResponseSchema } from "./create-user-response.js";
import { GetUserResponseSchema } from "./get-user-response.js";
import { UserIdSchema } from "./model/index.js";
import { UpdateUserRequestSchema } from "./update-user-request.js";

/** 対象ユーザーを指す path パラメータ */
const UserIdParamSchema = v.object({ id: UserIdSchema });

export const createUser = oc
  .route({
    method: HttpMethod.POST,
    path: "/users",
    successStatus: HttpStatus.CREATED,
    operationId: "createUser",
    tags: ["Users"],
    summary: "ユーザーを新規作成する",
    description: "サインアップを想定しているため認証は不要。",
  })
  .input(CreateUserRequestSchema)
  .output(CreateUserResponseSchema)
  .errors({
    BAD_REQUEST_ERROR: BadRequestError,
    MAIL_ADDRESS_DUPLICATION_ERROR: MailAddressDuplicationError,
    INTERNAL_SERVER_ERROR: InternalServerError,
  });

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
    summary: "ユーザーを更新する",
    description: "要認証。本人のリソースだけを更新できる。",
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
    MAIL_ADDRESS_DUPLICATION_ERROR: MailAddressDuplicationError,
    INTERNAL_SERVER_ERROR: InternalServerError,
  });

export const deleteUser = oc
  .route({
    method: HttpMethod.DELETE,
    path: "/users/{id}",
    successStatus: HttpStatus.NO_CONTENT,
    operationId: "deleteUser",
    tags: ["Users"],
    summary: "ユーザーを削除する",
    description: "要認証。本人のリソースだけを削除できる。",
  })
  .input(UserIdParamSchema)
  .output(v.void())
  .errors({
    BAD_REQUEST_ERROR: BadRequestError,
    UNAUTHORIZED_ERROR: UnauthorizedError,
    FORBIDDEN_ERROR: ForbiddenError,
    RESOURCE_NOT_FOUND_ERROR: ResourceNotFoundError,
    INTERNAL_SERVER_ERROR: InternalServerError,
  });

export const changePassword = oc
  .route({
    method: HttpMethod.PUT,
    path: "/users/{id}/password",
    successStatus: HttpStatus.NO_CONTENT,
    operationId: "changePassword",
    tags: ["Users"],
    summary: "パスワードを変更する",
    description:
      "要認証。セッション乗っ取り対策として現在のパスワードで本人確認する。",
  })
  .input(
    v.object({
      ...ChangePasswordRequestSchema.entries,
      ...UserIdParamSchema.entries,
    }),
  )
  .output(v.void())
  .errors({
    BAD_REQUEST_ERROR: BadRequestError,
    UNAUTHORIZED_ERROR: UnauthorizedError,
    PASSWORD_MISMATCH_ERROR: PasswordMismatchError,
    FORBIDDEN_ERROR: ForbiddenError,
    RESOURCE_NOT_FOUND_ERROR: ResourceNotFoundError,
    INTERNAL_SERVER_ERROR: InternalServerError,
  });

export const userContract = {
  create: createUser,
  get: getUser,
  update: updateUser,
  delete: deleteUser,
  changePassword,
} as const;
