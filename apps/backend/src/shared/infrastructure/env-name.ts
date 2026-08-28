/**
 * 読む環境変数の名前。直書きすると綴りのゆらぎが**実行時まで表面化しない** —
 * 未設定として扱われ、既定値で静かに動くか、起動時に「設定されていません」と
 * 言われて設定済みの `.env` を睨むことになる。
 *
 * `.env.example` が説明の本体で、ここはそれを型に写したもの。
 */
export const EnvName = {
  /** DB の接続先。未設定だと Bun.sql が**既定の接続先へフォールバックする**。 */
  DatabaseUrl: "DATABASE_URL",
  /** better-auth がセッションの署名と暗号化に使う鍵。**漏れると偽装できる**。 */
  AuthSecret: "BETTER_AUTH_SECRET",
  /** better-auth が自分の絶対 URL を組み立てる基点 (メールのリンク、OAuth の戻り先)。 */
  AuthBaseUrl: "BETTER_AUTH_URL",
} as const;

export type EnvName = (typeof EnvName)[keyof typeof EnvName];
