import * as v from "valibot";

// UUID v7 の形式 (契約側の UuidSchema と同一パターン)。
const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

/**
 * UUID v7 形式の文字列スキーマ (未 brand・共有ドメイン)。
 *
 * 各集約の id 値オブジェクトは、これに固有の brand を重ねて定義する:
 *   export const UserIdSchema = v.pipe(UuidSchema, v.brand("User.Id"));
 *
 * **大文字を通さない。** 緩いほうへズレると id の表記が 2 通り生まれる。
 * `checkUserIsSelf` は id を素の `===` で比べるので、大小が混ざると
 * **本人なのに 403** になり、しかも型検査は緑のまま通る。
 *
 * value-objects/ に入れないのは、このリポジトリで値オブジェクトの目印が brand
 * (名目的型付け) であり、Uuid はそれを持たないから。単体では意味を成さず、
 * brand を重ねて初めて値オブジェクトになる素材。
 */
export const UuidSchema = v.pipe(v.string(), v.regex(UUID_V7_PATTERN));

export type Uuid = v.InferOutput<typeof UuidSchema>;
