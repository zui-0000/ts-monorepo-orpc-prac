import { describe, expect, test } from "bun:test";

import { PersonNameKanaSchema as ContractPersonNameKanaSchema } from "@orpc-prac/contract";
import * as v from "valibot";

import { PersonNameKanaSchema } from "../person-name-kana.ts";

/**
 * 固定したいのは**全角カタカナだけを通す**という判断。保存される表記を 1 通りに
 * 定めるためで、ひらがな・半角カナ・漢字はすべて弾く (経緯は契約側)。
 */
describe("PersonNameKanaSchema", () => {
  const accepted = ["ヤマダ", "タロウ", "ヴァン", "オーツカ", "ア".repeat(50)];
  const rejected = [
    "",
    "ア".repeat(51),
    // ひらがな。許すと同じ人が 2 通りで登録できてしまう。
    "やまだ",
    // 半角カナ。正規化せず弾く。
    "ﾔﾏﾀﾞ",
    "山田",
    "Yamada",
    // 空白や記号は氏名のカナ表記に含めない。
    "ヤマダ タロウ",
    "ヤマダ・タロウ",
  ];

  test.each(accepted)("通すこと: %p", (value) => {
    expect(v.safeParse(PersonNameKanaSchema, value).success).toBe(true);
  });

  test.each(rejected)("弾くこと: %p", (value) => {
    expect(v.safeParse(PersonNameKanaSchema, value).success).toBe(false);
  });

  test("契約と同じ判定をすること", () => {
    for (const value of [...accepted, ...rejected]) {
      expect(v.safeParse(PersonNameKanaSchema, value).success).toBe(
        v.safeParse(ContractPersonNameKanaSchema, value).success,
      );
    }
  });
});
