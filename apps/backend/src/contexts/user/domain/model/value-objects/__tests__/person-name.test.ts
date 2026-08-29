import { describe, expect, test } from "bun:test";

import { PersonNameSchema as ContractPersonNameSchema } from "@orpc-prac/contract";
import * as v from "valibot";

import { PersonNameSchema } from "../person-name.ts";

/**
 * 固定したいのは**この値オブジェクトが下した判断**: 1〜50 という範囲、
 * 文字種を制限しないこと、値を整形しないこと。
 *
 * 契約側にも同じ数字が手書きされている。ズレの検出は最後の test が担う (設計関連/ADR-02)。
 */
describe("PersonNameSchema", () => {
  const accepted = [
    "山",
    "山".repeat(50),
    // 姓と名の一部であって識別子ではないので、記号や別の文字体系を弾く理由が無い。
    // ここが落ちたら誰かが v.regex() を足した合図。足すなら契約側にも要る。
    "オコンネル",
    "d'Artagnan",
    "ヴァン・ダイク",
  ];
  const rejected = ["", "山".repeat(51)];

  test.each(accepted)("通すこと: %p", (value) => {
    expect(v.safeParse(PersonNameSchema, value).success).toBe(true);
  });

  test.each(rejected)("弾くこと: %p", (value) => {
    expect(v.safeParse(PersonNameSchema, value).success).toBe(false);
  });

  test("値を整形しないこと", () => {
    const padded = " 山田 ";
    expect(String(v.parse(PersonNameSchema, padded))).toBe(padded);
  });

  test("契約と同じ判定をすること", () => {
    for (const value of [...accepted, ...rejected]) {
      expect(v.safeParse(PersonNameSchema, value).success).toBe(
        v.safeParse(ContractPersonNameSchema, value).success,
      );
    }
  });
});
