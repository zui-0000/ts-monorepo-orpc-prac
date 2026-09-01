import { http } from "msw";

import { userFailure } from "./controller";

/** 利用者の失敗。`?scenario=<名前>` で選ぶ (mocks/scenarios.ts)。 */
export const userScenarios = {
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
} as const;
