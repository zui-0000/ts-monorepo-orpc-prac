import * as v from "valibot";

/** 全角カタカナと長音符のみ。半角カナ・ひらがな・漢字は通さない。 */
const KATAKANA_PATTERN = /^[ァ-ヶー]+$/u;

/**
 * 氏名の一部のカナ表記の書式。**単体では使わない素材。**
 *
 * **全角カタカナだけを許す。** ひらがなも許すと同じ人が「ヤマダ」と「やまだ」の
 * 2 通りで登録でき、並び替えと検索が揺れる。保存される表記を 1 通りに定める。
 *
 * 半角カナを全角へ正規化する案は採らない。利用者が入れた値を変える操作であり、
 * 弾いて入れ直してもらうほうが挙動が読める。
 */
export const NamePartKanaSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(50),
  v.regex(KATAKANA_PATTERN, "全角カタカナで入力してください"),
);

export type NamePartKana = v.InferOutput<typeof NamePartKanaSchema>;
