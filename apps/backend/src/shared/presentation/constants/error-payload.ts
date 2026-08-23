import type {
  ForbiddenErrorData,
  InternalServerErrorData,
  ResourceNotFoundErrorData,
} from "@orpc-prac/contract";
import {
  ForbiddenError,
  InternalServerError,
  ResourceNotFoundError,
} from "@orpc-prac/contract";

/**
 * 契約が定めるエラー本文 (`data`)。**応答に載る値はここだけで決める。**
 *
 * **`status` と `title` は契約から引く。** 同じ文言を実装側で書き直すと、
 * 契約を直したのに応答が古いまま、という食い違いが型検査を素通りする。
 *
 * `code` だけは手で書く — 契約ではスキーマ内のリテラル (`v.literal("4030")`)
 * として表現されており、値として export されていないため。体系は
 * `<HTTP ステータス><連番>` の 4 桁で、専用コードを足すのは
 * **クライアントが分岐する必要のある事由**だけ。
 */
export const ErrorPayload = {
  /** 403 操作する権限が無い (汎用) */
  Forbidden: {
    status: ForbiddenError.status,
    code: "4030",
    title: ForbiddenError.message,
  } satisfies ForbiddenErrorData,

  /** 404 リソースが存在しない (汎用) */
  ResourceNotFound: {
    status: ResourceNotFoundError.status,
    code: "4040",
    title: ResourceNotFoundError.message,
  } satisfies ResourceNotFoundErrorData,

  /** 500 サーバー内部で予期せぬエラーが発生した (汎用) */
  InternalServer: {
    status: InternalServerError.status,
    code: "5000",
    title: InternalServerError.message,
  } satisfies InternalServerErrorData,
} as const;
