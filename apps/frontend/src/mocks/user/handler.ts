import { http } from "msw";

import { getUser, updateProfile } from "./controller";

/**
 * 利用者の経路 (`/api/users/*`)。**宣言だけを置き、中身は controller が持つ。**
 *
 * **ここは正常系だけを持つ。書き換えない。** 失敗を画面で見たいときは URL に
 * `?scenario=profile-forbidden` のように付ける (user/scenarios.ts)。
 */
export const userHandlers = [
  http.get("/api/users/:id", ({ params }) => getUser(String(params.id))),
  http.put("/api/users/:id/profile", ({ params, request }) =>
    updateProfile(String(params.id), request),
  ),
];
