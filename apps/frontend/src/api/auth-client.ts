import { createAuthClient } from "better-auth/react";

/**
 * better-auth のクライアント。
 *
 * `/api/auth/*` を叩く。応答は MSW が返す (src/mocks/)。oRPC とは別系統で、
 * 認証の経路は契約に定義していない (docs/TODO.md)。
 */
export const authClient = createAuthClient({ basePath: "/api/auth" });
