import { describe, expect, test } from "bun:test";

import { IntroductionSchema as ContractIntroductionSchema } from "@orpc-prac/contract";
import * as v from "valibot";

import { IntroductionSchema } from "../introduction.ts";

/**
 * 固定したいのは 1〜1000 という範囲と、文字種も改行も制限しないこと。
 * 自由文なので弾く理由が無い。
 */
describe("IntroductionSchema", () => {
  const accepted = [
    "あ",
    "あ".repeat(1000),
    "フロントエンドを書いています。\n最近は Bun を触っています。",
    "🐈",
  ];
  const rejected = ["", "あ".repeat(1001)];

  test.each(accepted)("通すこと: %p", (value) => {
    expect(v.safeParse(IntroductionSchema, value).success).toBe(true);
  });

  test.each(rejected)("弾くこと: %p", (value) => {
    expect(v.safeParse(IntroductionSchema, value).success).toBe(false);
  });

  test("契約と同じ判定をすること", () => {
    for (const value of [...accepted, ...rejected]) {
      expect(v.safeParse(IntroductionSchema, value).success).toBe(
        v.safeParse(ContractIntroductionSchema, value).success,
      );
    }
  });
});
