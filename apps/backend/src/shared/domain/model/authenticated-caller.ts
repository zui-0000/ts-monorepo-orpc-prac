import * as v from "valibot";

import { UuidSchema } from "./uuid.ts";

/**
 * 認証を通った相手。**誰が (`userId`)**。
 *
 * better-auth を入れる段で `sessionId` (どのログインで) が加わる。あちらが指すのは
 * 券 1 枚ではなく**セッション** — ローテーションを跨いで不変にしておかないと、
 * 古いアクセストークンを持つタブからのログアウトが空振りする。
 *
 * **ここに載せたものはクライアントに晒される前提で選ぶ。** 署名付きトークンは
 * 暗号化されていないので payload は誰でも読める。名前もメールアドレスも載せない。
 * 必要になったら DB から引く。
 *
 * 型が branded な `UserId` ではなく素の `Uuid` なのは、shared が contexts を
 * 知らないため。brand を付け直すのは受け取った側 (各ユースケースの 1 行目) の仕事で、
 * 素のまま domain へ渡そうとすると型が止める。
 */
export const AuthenticatedCallerSchema = v.object({ userId: UuidSchema });

export type AuthenticatedCaller = v.InferOutput<
  typeof AuthenticatedCallerSchema
>;
