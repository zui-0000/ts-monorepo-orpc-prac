import { EnvName } from "~/shared/infrastructure/env-name.ts";

const required = (name: EnvName, why: string): string => {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} が設定されていません。${why}`);
  }
  return value;
};

/**
 * セッションの署名鍵。
 *
 * **未設定を既定値で埋めてはいけない。** better-auth はこの値でセッション Cookie に
 * 署名し、OAuth の state を検証する。既知の値になった瞬間、誰でも任意の利用者として
 * 署名済み Cookie を組み立てられる。起動時に落とす。
 */
export const authSecret = (): string =>
  required(
    EnvName.AuthSecret,
    "openssl rand -base64 32 などで生成し .env に置いてください。",
  );

/**
 * better-auth が絶対 URL を組み立てる基点。
 *
 * メール内のリンクと OAuth のコールバック URL がこれを基に作られるため、
 * **間違えるとリンクが別のホストを指す**。
 */
export const authBaseUrl = (): string =>
  required(
    EnvName.AuthBaseUrl,
    "アプリが実際に公開される URL (開発なら http://localhost:3000) を .env に置いてください。",
  );
