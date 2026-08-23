import { TaggedError } from "better-result";

/**
 * メールアドレスが既に使用されている (HTTP 409)。
 *
 * **どのアドレスが重複したかを持たない。** 契約側の
 * `MailAddressDuplicationError` は `status` と `message` しか持たず、
 * 応答へ載せる先が無い。載せられるのはログだけになるが、
 * 送られてきた値をログへ書かないという方針 (`log-failure.ts`) とも合わない。
 *
 * 追跡が要るなら、値ではなくリクエストの識別子で辿ること。
 */
export class MailAddressDuplicationError extends TaggedError(
  "MailAddressDuplicationError",
)<{}> {}
