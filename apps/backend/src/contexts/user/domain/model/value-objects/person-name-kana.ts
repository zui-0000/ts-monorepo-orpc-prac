import * as v from "valibot";

// 契約の PersonNameKanaSchema と同一パターン (全角カタカナと長音符のみ)。
const KATAKANA_PATTERN = /^[ァ-ヶー]+$/u;

/**
 * 氏名の一部のカナ表記 (値オブジェクト / branded string)。
 * **全角カタカナのみ。** 保存される表記を 1 通りに定めるため (経緯は契約側)。
 */
export const PersonNameKanaSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(50),
  v.regex(KATAKANA_PATTERN),
  v.brand("User.PersonNameKana"),
);

export type PersonNameKana = v.InferOutput<typeof PersonNameKanaSchema>;
