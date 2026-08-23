import { TaggedError } from "better-result";

/**
 * 現在のパスワードが一致しない (HTTP 401)。パスワード変更でのみ返す。
 * 名前に「現在の」を入れないのは、返す `verifyUserPassword` が変更の文脈を
 * 知らないため (文言は応答側で決める)。
 */
export class PasswordMismatchError extends TaggedError(
  "PasswordMismatchError",
)<{}> {}
