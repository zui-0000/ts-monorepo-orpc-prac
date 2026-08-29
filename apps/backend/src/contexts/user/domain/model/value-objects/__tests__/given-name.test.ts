import { describe, expect, test } from "bun:test";

import { GivenNameSchema as ContractGivenNameSchema } from "@orpc-prac/contract";
import * as v from "valibot";

import { GivenNameSchema } from "../given-name.ts";

/**
 * 固定したいのは**この値オブジェクトが下した判断**: 1〜50 という範囲、
 * 文字種を制限しないこと、値を整形しないこと。
 *
 * 書式は共有ドメインの `NamePartSchema` が持ち、ここは brand を重ねるだけ。
 * 契約側にも同じ数字が手書きされている。ズレの検出は最後の test が担う (設計関連/ADR-02)。
 */
describe("GivenNameSchema", () => {
  // 名 は表示のための名前であって識別子ではないので、記号や別の文字体系を
  // 弾く理由が無い。ここが落ちたら誰かが v.regex() を足した合図。
  const accepted = ["太", "ジャン=リュック", "Jr.", "山".repeat(50)];
  const rejected = ["", "山".repeat(51)];

  test.each(accepted)("通すこと: %p", (value) => {
    expect(v.safeParse(GivenNameSchema, value).success).toBe(true);
  });

  test.each(rejected)("弾くこと: %p", (value) => {
    expect(v.safeParse(GivenNameSchema, value).success).toBe(false);
  });

  test("値を整形しないこと", () => {
    const padded = " 山田 ";
    expect(String(v.parse(GivenNameSchema, padded))).toBe(padded);
  });

  test("契約と同じ判定をすること", () => {
    for (const value of [...accepted, ...rejected]) {
      expect(v.safeParse(GivenNameSchema, value).success).toBe(
        v.safeParse(ContractGivenNameSchema, value).success,
      );
    }
  });
});
