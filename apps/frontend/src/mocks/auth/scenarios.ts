import { HttpResponse, http } from "msw";

import { authFailure } from "./controller";

/** 認証基盤の失敗。`?scenario=<名前>` で選ぶ (mocks/scenarios.ts)。 */
export const authScenarios = {
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
} as const;
