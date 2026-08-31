import { http } from "msw";

import { getUser, updateProfile } from "./controller";

/**
 * 利用者の経路 (`/api/users/*`)。**宣言だけを置き、中身は controller が持つ。**
 *
 * 失敗を画面で見たいときは `userFailure` を直に返す形へ書き換える。例:
 *
 * ```ts
 * http.get("/api/users/:id", () => userFailure.forbidden()),
 * ```
 */
export const userHandlers = [
  http.get("/api/users/:id", ({ params }) => getUser(String(params.id))),
  http.put("/api/users/:id/profile", ({ params, request }) =>
    updateProfile(String(params.id), request),
  ),
];
