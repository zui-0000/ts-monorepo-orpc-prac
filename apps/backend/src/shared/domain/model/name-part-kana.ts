import * as v from "valibot";

// 契約の NamePartKanaSchema と同一パターン (全角カタカナと長音符のみ)。
const KATAKANA_PATTERN = /^[ァ-ヶー]+$/u;

/**
 * 氏名の一部のカナ表記の書式 (未 brand・共有ドメイン)。
 * **全角カタカナのみ。** 保存される表記を 1 通りに定めるため (経緯は契約側)。
 *
 * `NamePartSchema` と同じく、brand を重ねて初めて値オブジェクトになる素材。
 */
export const NamePartKanaSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(50),
  v.regex(KATAKANA_PATTERN),
);

export type NamePartKana = v.InferOutput<typeof NamePartKanaSchema>;
