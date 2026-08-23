import { oc } from '@orpc/contract'
import * as v from 'valibot'

import { HttpMethod, HttpStatus } from '../../shared/constants/index.js'
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  MailAddressDuplicationError,
  PasswordMismatchError,
  ResourceNotFoundError,
  UnauthorizedError,
} from '../../shared/errors/index.js'
import { ChangePasswordRequestSchema } from './change-password-request.js'
import { CreateUserRequestSchema } from './create-user-request.js'
import { CreateUserResponseSchema } from './create-user-response.js'
import { GetUserResponseSchema } from './get-user-response.js'
import { UserIdSchema } from './model/index.js'
import { UpdateUserRequestSchema } from './update-user-request.js'

/**
 * user コンテキストの契約。
 *
 * TypeSpec の `@route("/users")` namespace Users を移植したもの。
 * 本文のスキーマは Request / Response として独立したファイルに定義し、
 * ここでは組み立てだけを行う。
 *
 * path パラメータと本文は oRPC の既定 (inputStructure: 'compact') に従い
 * 1 つの input オブジェクトに統合される。`/users/{id}` の `{id}` は input の
 * `id` に束縛されるため、本文スキーマへ `.extend({ id })` して合成する。
 *
 * 認証の要否は契約には現れない (TypeSpec の `@useAuth(BearerAuth)` に相当)。
 * 実装側の middleware で担保し、失敗時は UNAUTHORIZED / FORBIDDEN を返す。
 */

/** 対象ユーザーを指す path パラメータ */
const UserIdParamSchema = v.object({ id: UserIdSchema })

/** ユーザーを新規作成する (サインアップ想定のため認証不要) */
export const createUser = oc
  .route({
    method: HttpMethod.POST,
    path: '/users',
    successStatus: HttpStatus.CREATED,
  })
  .input(CreateUserRequestSchema)
  .output(CreateUserResponseSchema)
  .errors({
    BAD_REQUEST_ERROR: BadRequestError,
    MAIL_ADDRESS_DUPLICATION_ERROR: MailAddressDuplicationError,
    INTERNAL_SERVER_ERROR: InternalServerError,
  })

/** IDを指定してユーザーを取得する (要認証) */
export const getUser = oc
  .route({
    method: HttpMethod.GET,
    path: '/users/{id}',
    successStatus: HttpStatus.OK,
  })
  .input(UserIdParamSchema)
  .output(GetUserResponseSchema)
  .errors({
    BAD_REQUEST_ERROR: BadRequestError,
    UNAUTHORIZED_ERROR: UnauthorizedError,
    FORBIDDEN_ERROR: ForbiddenError,
    NOT_FOUND_ERROR: ResourceNotFoundError,
    INTERNAL_SERVER_ERROR: InternalServerError,
  })

/** ユーザーを更新する (要認証) */
export const updateUser = oc
  .route({
    method: HttpMethod.PUT,
    path: '/users/{id}',
    successStatus: HttpStatus.NO_CONTENT,
  })
  .input(v.object({ ...UpdateUserRequestSchema.entries, ...UserIdParamSchema.entries }))
  .output(v.void())
  .errors({
    BAD_REQUEST_ERROR: BadRequestError,
    UNAUTHORIZED_ERROR: UnauthorizedError,
    FORBIDDEN_ERROR: ForbiddenError,
    NOT_FOUND_ERROR: ResourceNotFoundError,
    MAIL_ADDRESS_DUPLICATION_ERROR: MailAddressDuplicationError,
    INTERNAL_SERVER_ERROR: InternalServerError,
  })

/** ユーザーを削除する (要認証) */
export const deleteUser = oc
  .route({
    method: HttpMethod.DELETE,
    path: '/users/{id}',
    successStatus: HttpStatus.NO_CONTENT,
  })
  .input(UserIdParamSchema)
  .output(v.void())
  .errors({
    BAD_REQUEST_ERROR: BadRequestError,
    UNAUTHORIZED_ERROR: UnauthorizedError,
    FORBIDDEN_ERROR: ForbiddenError,
    NOT_FOUND_ERROR: ResourceNotFoundError,
    INTERNAL_SERVER_ERROR: InternalServerError,
  })

/** パスワードを変更する (要認証。現在のパスワードで本人確認する) */
export const changePassword = oc
  .route({
    method: HttpMethod.PUT,
    path: '/users/{id}/password',
    successStatus: HttpStatus.NO_CONTENT,
  })
  .input(v.object({ ...ChangePasswordRequestSchema.entries, ...UserIdParamSchema.entries }))
  .output(v.void())
  .errors({
    BAD_REQUEST_ERROR: BadRequestError,
    UNAUTHORIZED_ERROR: UnauthorizedError,
    PASSWORD_MISMATCH_ERROR: PasswordMismatchError,
    FORBIDDEN_ERROR: ForbiddenError,
    NOT_FOUND_ERROR: ResourceNotFoundError,
    INTERNAL_SERVER_ERROR: InternalServerError,
  })

export const userContract = {
  create: createUser,
  get: getUser,
  update: updateUser,
  delete: deleteUser,
  changePassword,
} as const
