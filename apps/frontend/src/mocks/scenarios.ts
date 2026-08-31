import type { HttpHandler } from "msw";
import { HttpResponse, http } from "msw";

import { authFailure } from "./auth/controller";
import { userFailure } from "./user/controller";

/**
 * 失敗の状態を画面で見るための上書き。**`?scenario=<名前>` で選ぶ。**
 *
 * ```txt
 * http://localhost:5173/sign-in?scenario=sign-in-unverified
 * ```
 *
 * 既定 (`handlers.ts`) は正常系だけを持ち、ここが前に差し込まれて優先される
 * (MSW の Best Practices「Dynamic mock scenarios」)。
 *
 * **名前は 1 つの平坦な空間にある。** 重複していないことをこの一覧で確かめる。
 */
export const scenarios: Readonly<Record<string, readonly HttpHandler[]>> = {
  "sign-up-weak-password": [
    http.post("/api/auth/sign-up/email", () =>
      authFailure("PASSWORD_TOO_SHORT"),
    ),
  ],
  "sign-up-duplicate": [
    http.post("/api/auth/sign-up/email", () =>
      authFailure("USER_ALREADY_EXISTS"),
    ),
  ],
  "sign-in-invalid": [
    http.post("/api/auth/sign-in/email", () =>
      authFailure("INVALID_EMAIL_OR_PASSWORD"),
    ),
  ],
  "sign-in-unverified": [
    http.post("/api/auth/sign-in/email", () =>
      authFailure("EMAIL_NOT_VERIFIED"),
    ),
  ],

  "profile-unauthorized": [
    http.get("/api/users/:id", () => userFailure.unauthorized()),
  ],
  "profile-forbidden": [
    http.get("/api/users/:id", () => userFailure.forbidden()),
  ],
  "profile-update-invalid": [
    http.put("/api/users/:id/profile", () =>
      userFailure.badRequest(["familyNameKana", "givenNameKana"]),
    ),
  ],

  /**
   * 応答が返らない状態。**`{ data, error }` ではなく例外が飛ぶ**ため、
   * `auth-repository.ts` の `tryPromise` が捕まえる経路を通る (設計関連/ADR-12)。
   */
  "session-network-error": [
    http.get("/api/auth/get-session", () => HttpResponse.error()),
  ],
  "sign-in-network-error": [
    http.post("/api/auth/sign-in/email", () => HttpResponse.error()),
  ],
};
