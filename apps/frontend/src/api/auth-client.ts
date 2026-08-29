import { createAuthClient } from "better-auth/react";

/**
 * better-auth のクライアント。
 *
 * backend の `/api/auth/*` を叩く。oRPC とは別系統のクライアントで、
 * 認証の経路は契約に定義していない (docs/TODO.md)。
 */
export const authClient = createAuthClient({ basePath: "/api/auth" });
