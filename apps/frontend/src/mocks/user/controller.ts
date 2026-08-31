import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
  UpdateUserProfileRequestSchema,
} from "@orpc-prac/contract";
import { HttpResponse } from "msw";
import * as v from "valibot";

import type { AuthUser } from "../auth/data";
import { currentUser } from "../auth/data";
import { orpcErrorResponse } from "../utils/orpc-error-response";
import { findProfile, saveProfile } from "./data";

/**
 * 失敗の応答。**`handler.ts` で手で差し替えると、その失敗を画面で再現できる。**
 *
 * `badRequest` が載せるのは**不正だったフィールド名だけ**。入力値は返さない
 * (契約の error-item.ts)。
 */
export const userFailure = {
  unauthorized: () =>
    orpcErrorResponse("UNAUTHORIZED_ERROR", UnauthorizedError),
  forbidden: () => orpcErrorResponse("FORBIDDEN_ERROR", ForbiddenError),
  badRequest: (fields: readonly string[]) =>
    orpcErrorResponse("BAD_REQUEST_ERROR", BadRequestError, {
      errors: fields.map((field) => ({ field })),
    }),
} as const;

/** 本人のリソースだけを許す。通らなければ応答をそのまま返す。 */
const authorize = (targetId: string): AuthUser | Response => {
  const actor = currentUser();
  if (!actor) return userFailure.unauthorized();
  if (actor.id !== targetId) return userFailure.forbidden();
  return actor;
};

/**
 * 利用者の取得。
 *
 * **認証基盤の利用者を読んでいるが、書いてはいない。** 読み取りが他所の持ち物を
 * 直接引くのは CQRS の射影として認めた形 (設計関連/ADR-09)。
 */
export const getUser = (targetId: string) => {
  const actor = authorize(targetId);
  if (actor instanceof Response) return actor;

  return HttpResponse.json({
    name: actor.name,
    email: actor.email,
    profile: findProfile(actor.id),
  });
};

export const updateProfile = async (targetId: string, request: Request) => {
  const actor = authorize(targetId);
  if (actor instanceof Response) return actor;

  // **契約のスキーマをそのまま使う。** 検証規則をモックへ書き写さないため。
  const parsed = v.safeParse(
    UpdateUserProfileRequestSchema,
    await request.json(),
  );
  if (!parsed.success) {
    return userFailure.badRequest(
      parsed.issues
        .map((issue) => issue.path?.[0]?.key)
        .filter((key) => typeof key === "string"),
    );
  }

  saveProfile(actor.id, parsed.output);
  return new HttpResponse(null, { status: 204 });
};
