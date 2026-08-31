import { HttpResponse, http } from "msw";

import type { UserFailure } from "./service";
import { getUser, updateProfile } from "./service";

/**
 * oRPC の既定のエラー本文。
 *
 * `{ defined, code, status, message }` に、追加情報があるものだけ `data` が付く
 * (契約の errors/index.ts)。
 */
const orpcError = (
  code: string,
  status: number,
  message: string,
  data?: unknown,
) =>
  HttpResponse.json(
    {
      defined: true,
      code,
      status,
      message,
      ...(data === undefined ? {} : { data }),
    },
    { status },
  );

/** 事由から HTTP へ。**応答に載せるのはフィールド名だけ。入力値は返さない。** */
const failed = (failure: UserFailure) => {
  switch (failure.kind) {
    case "UNAUTHORIZED":
      return orpcError("UNAUTHORIZED_ERROR", 401, "認証が必要です");
    case "FORBIDDEN":
      return orpcError(
        "FORBIDDEN_ERROR",
        403,
        "この操作を行う権限がありません",
      );
    case "BAD_REQUEST":
      return orpcError("BAD_REQUEST_ERROR", 400, "リクエスト内容が不正です", {
        errors: failure.fields.map((field) => ({ field })),
      });
  }
};

export const userHandlers = [
  http.get("/api/users/:id", ({ params }) =>
    getUser(String(params.id)).match({
      ok: (user) => HttpResponse.json(user),
      err: failed,
    }),
  ),

  http.put("/api/users/:id/profile", async ({ params, request }) =>
    updateProfile(String(params.id), await request.json()).match({
      ok: () => new HttpResponse(null, { status: 204 }),
      err: failed,
    }),
  ),
];
