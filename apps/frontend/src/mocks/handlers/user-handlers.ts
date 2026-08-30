import { UpdateUserProfileRequestSchema } from "@orpc-prac/contract";
import { HttpResponse, http } from "msw";
import * as v from "valibot";

import { currentUser, persist } from "../data/state";

/**
 * oRPC の既定のエラー本文。
 *
 * `{ defined, code, status, message }` に、追加情報があるものだけ `data` が付く
 * (contract の errors/index.ts)。
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

export const userHandlers = [
  http.get("/api/users/:id", ({ params }) => {
    const user = currentUser();
    if (!user) return orpcError("UNAUTHORIZED_ERROR", 401, "認証が必要です");
    if (user.id !== params.id) {
      return orpcError(
        "FORBIDDEN_ERROR",
        403,
        "この操作を行う権限がありません",
      );
    }

    return HttpResponse.json({
      name: user.name,
      email: user.email,
      profile: user.profile,
    });
  }),

  http.put("/api/users/:id/profile", async ({ params, request }) => {
    const user = currentUser();
    if (!user) return orpcError("UNAUTHORIZED_ERROR", 401, "認証が必要です");
    if (user.id !== params.id) {
      return orpcError(
        "FORBIDDEN_ERROR",
        403,
        "この操作を行う権限がありません",
      );
    }

    // **契約のスキーマをそのまま使う。** 検証規則をモックへ書き写さないため。
    const parsed = v.safeParse(
      UpdateUserProfileRequestSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return orpcError("BAD_REQUEST_ERROR", 400, "リクエスト内容が不正です", {
        // 応答に載せるのはフィールド名だけ。入力値は返さない。
        errors: parsed.issues
          .map((issue) => issue.path?.[0]?.key)
          .filter((key) => typeof key === "string")
          .map((field) => ({ field })),
      });
    }

    user.profile = parsed.output;
    persist();
    return new HttpResponse(null, { status: 204 });
  }),
];
