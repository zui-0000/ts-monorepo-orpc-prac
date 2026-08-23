import { describe, expect, test } from "bun:test";

import { UuidSchema as ContractUuidSchema } from "@orpc-prac/contract";
import * as v from "valibot";

import { UuidSchema } from "../uuid.ts";

/**
 * 自作の正規表現なので、**何を通し何を弾くか**を固定する。
 *
 * 契約 (`packages/contract/.../shared/model/uuid.ts`) にも同じパターンが手書きされている。
 * 片方だけ直すと静かにズレるので、最後の test でそのズレを検出する。
 */
describe("UuidSchema", () => {
  const accepted = ["018eef15-1234-7123-8123-123456789abc"];

  const rejected = [
    // 大文字が混ざる形。ここが緩むと id の表記が 2 通り生まれる。
    // `checkUserIsSelf` は id を素の `===` で比べるので、大小が混ざると
    // **本人なのに 403** になり、しかも全部緑のまま通るので気付けない。
    "018EEF15-1234-7123-8123-123456789ABC",
    "018eef15-1234-7123-8123-123456789ABC",
    // 採番は v7 に統一している (時系列で並ぶため索引が効く)。版を混ぜるとその前提が崩れる。
    "f47ac10b-58cc-4372-a567-0e02b2c3d479", // v4
    "c232ab00-9414-11ec-b3c8-9e6bdeced846", // v1
    "00000000-0000-0000-0000-000000000000", // nil
    // 第 4 区画の頭は RFC 9562 で `[89ab]` に限られる。ここを見ていないと、
    // 版だけ 7 に書き換えた出自不明の文字列が通る。
    "018eef15-1234-7123-c123-123456789abc",
    // 前後の空白を許すと、DB では別の行になるのに `===` では同じに見える値が
    // 生まれる。アンカー (`^`/`$`) があることの確認でもある。
    " 018eef15-1234-7123-8123-123456789abc ",
    "018eef15123471238123123456789abc",
  ];

  test("UUID v7 の場合、通すこと", () => {
    for (const value of accepted) {
      expect(v.safeParse(UuidSchema, value).success).toBe(true);
    }
  });

  test("版・variant・表記が規則に反する場合、弾くこと", () => {
    for (const value of rejected) {
      expect(v.safeParse(UuidSchema, value).success).toBe(false);
    }
  });

  test("契約と同じ判定をすること", () => {
    // 同じ規則が 2 箇所に手書きされている。**片方だけ直すとズレる。**
    // 契約が緩ければ、契約を通った値がドメインで落ちて 500 になる。
    // ドメインが緩ければ、契約が弾いた値を内部の経路が受け入れる。
    // どちらも型検査では捕まらない (どちらも string だから)。
    for (const value of [...accepted, ...rejected]) {
      expect(v.safeParse(UuidSchema, value).success).toBe(
        v.safeParse(ContractUuidSchema, value).success,
      );
    }
  });
});
