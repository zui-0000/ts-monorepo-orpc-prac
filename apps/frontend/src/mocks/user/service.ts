import type { GetUserResponse } from "@orpc-prac/contract";
import { UpdateUserProfileRequestSchema } from "@orpc-prac/contract";
import { Result } from "better-result";
import * as v from "valibot";

import type { AuthUser } from "../auth/data";
import { currentUser } from "../auth/data";
import { findProfile, saveProfile } from "./data";

/**
 * 失敗の事由。HTTP の状態への翻訳は `handler.ts` が持つ。
 *
 * `BAD_REQUEST` が持つのは**不正だったフィールド名だけ**。入力値は返さない
 * (契約の error-item.ts)。
 */
export type UserFailure =
  | { readonly kind: "UNAUTHORIZED" }
  | { readonly kind: "FORBIDDEN" }
  | { readonly kind: "BAD_REQUEST"; readonly fields: readonly string[] };

/** 本人のリソースだけを許す。認証と認可をまとめて見る。 */
const authorize = (targetId: string): Result<AuthUser, UserFailure> => {
  const actor = currentUser();
  if (!actor) return Result.err({ kind: "UNAUTHORIZED" });
  if (actor.id !== targetId) return Result.err({ kind: "FORBIDDEN" });
  return Result.ok(actor);
};

/**
 * 利用者の取得。
 *
 * **認証基盤の利用者を読んでいるが、書いてはいない。** 読み取りが他所の持ち物を
 * 直接引くのは CQRS の射影として認めた形 (設計関連/ADR-09)。
 */
export const getUser = (
  targetId: string,
): Result<GetUserResponse, UserFailure> =>
  authorize(targetId).map((actor) => ({
    name: actor.name,
    email: actor.email,
    profile: findProfile(actor.id),
  }));

export const updateProfile = (
  targetId: string,
  body: unknown,
): Result<void, UserFailure> =>
  authorize(targetId).andThen((actor) => {
    // **契約のスキーマをそのまま使う。** 検証規則をモックへ書き写さないため。
    const parsed = v.safeParse(UpdateUserProfileRequestSchema, body);
    if (!parsed.success) {
      return Result.err({
        kind: "BAD_REQUEST" as const,
        fields: parsed.issues
          .map((issue) => issue.path?.[0]?.key)
          .filter((key) => typeof key === "string"),
      });
    }

    saveProfile(actor.id, parsed.output);
    return Result.ok();
  });
