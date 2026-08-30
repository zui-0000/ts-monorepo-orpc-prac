import { TaggedError } from "better-result";

/** メールアドレスの検証が済んでいない (better-auth: `EMAIL_NOT_VERIFIED`)。 */
export class EmailNotVerifiedError extends TaggedError(
  "EmailNotVerifiedError",
)<{}> {}

/** メールアドレスかパスワードが違う (`INVALID_EMAIL_OR_PASSWORD`)。 */
export class InvalidCredentialsError extends TaggedError(
  "InvalidCredentialsError",
)<{}> {}

/** そのメールアドレスは登録済み (`USER_ALREADY_EXISTS`)。 */
export class EmailAlreadyTakenError extends TaggedError(
  "EmailAlreadyTakenError",
)<{}> {}

/** パスワードが長さの要件を満たさない (`PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG`)。 */
export class WeakPasswordError extends TaggedError("WeakPasswordError")<{}> {}

/**
 * 上のどれでもない失敗。通信断や、こちらが知らないコードが来たとき。
 *
 * `message` はライブラリが返した文言をそのまま持つ。**診断用で、画面には出さない**
 * (通信断のときは "Fetch related error. Captured by catchAllError option..." という
 * 開発者向けの文字列が入る)。
 */
export class UnexpectedAuthError extends TaggedError("UnexpectedAuthError")<{
  readonly message: string;
}> {}

export type AuthError =
  | EmailNotVerifiedError
  | InvalidCredentialsError
  | EmailAlreadyTakenError
  | WeakPasswordError
  | UnexpectedAuthError;

/** better-auth の応答に載る失敗の形。 */
export interface BetterAuthFailure {
  readonly code?: string | undefined;
  readonly message?: string | undefined;
}

/**
 * better-auth のエラーコードを、こちらで扱えるエラーへ翻訳する。
 *
 * コードは `@better-auth/core` の `BASE_ERROR_CODES` に定義されているもの。
 * **知らないコードは握り潰さず `UnexpectedAuthError` に落とす。**
 */
export const toAuthError = ({
  code,
  message,
}: BetterAuthFailure): AuthError => {
  switch (code) {
    case "EMAIL_NOT_VERIFIED":
      return new EmailNotVerifiedError();
    case "INVALID_EMAIL_OR_PASSWORD":
      return new InvalidCredentialsError();
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return new EmailAlreadyTakenError();
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
      return new WeakPasswordError();
    default:
      return new UnexpectedAuthError({ message: message ?? "(文言なし)" });
  }
};

/**
 * 画面に出す文言。
 *
 * `match` は網羅性を型が見張るため、**エラーを 1 つ足すとここがコンパイルエラー**
 * になる。文言の付け忘れが起きない (backend の handle-error-response.ts と同じ形)。
 */
export const authErrorMessage = (error: AuthError): string =>
  error.match<AuthError, string>({
    EmailNotVerifiedError: () =>
      "メールアドレスの検証が済んでいません。届いたリンクを開いてください",
    InvalidCredentialsError: () => "メールアドレスまたはパスワードが違います",
    EmailAlreadyTakenError: () => "このメールアドレスは登録済みです",
    WeakPasswordError: () => "パスワードが要件を満たしていません",
    // ライブラリの文言をそのまま出さない。英語だったり開発者向けだったりする。
    UnexpectedAuthError: () => "通信に失敗しました。時間をおいて試してください",
  });
