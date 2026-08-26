import { describe, expect, test } from "bun:test";

import { EmailSchema as ContractEmailSchema } from "@orpc-prac/contract";
import * as v from "valibot";

import { EmailSchema } from "../email.ts";

/** 255 文字ちょうどのアドレス (DB の列幅と契約の maxLength に合わせた境界)。 */
const MAX_LENGTH_ADDRESS = `${"a".repeat(243)}@example.com`;

/**
 * 自作の正規表現なので、**何を通し何を弾くか**を固定する。あわせて
 * **値を変えないこと** (小文字へ潰さない) を固定する。
 *
 * 契約 (`packages/contract/.../shared/model/email.ts`) にも同じパターンが
 * 手書きされている。ズレの検出は最後の test が担う。
 */
describe("EmailSchema", () => {
  const accepted = [
    // `v.email()` を採らなかった理由。あれはこの形を弾くので、契約 (同じ regex)
    // を通った入力がドメインで落ちて **500** になる。
    "user!#$%&'*+/=?^_`{|}~-@example.com",
    "taro.yamada@example.com",
    // TLD の実在は確かめない (確かめるには一覧を抱えることになり、更新できずに古びる)。
    "a@b.c",
    MAX_LENGTH_ADDRESS,
  ];

  const rejected = [
    // ローカル部のドットは区切りにしか使えない。RFC 5322 は引用符で囲めば
    // これらも認めるが、この正規表現は引用形式を扱わないので通らない。
    "taro..yamada@example.com",
    ".taro@example.com",
    "taro.@example.com",
    // ドメイン部にドットを 1 つ以上求めるので `user@localhost` は通らない。
    // 末尾のハイフンは DNS のラベル規則違反。
    "userexample.com",
    "user@example",
    "user@exa-.com",
    `a${MAX_LENGTH_ADDRESS}`,
  ];

  test("RFC 5322 の記号・単文字ラベル・境界長の場合、通すこと", () => {
    expect(MAX_LENGTH_ADDRESS).toHaveLength(255);
    for (const value of accepted) {
      expect(v.safeParse(EmailSchema, value).success).toBe(true);
    }
  });

  test("アドレスの形が破れている場合、弾くこと", () => {
    for (const value of rejected) {
      expect(v.safeParse(EmailSchema, value).success).toBe(false);
    }
  });

  test("大文字が含まれる場合、そのまま保存すること", () => {
    // 潰すと元の表記を復元できず、送信時に届くかどうかを受信サーバの設定に
    // 賭けることになる (RFC 5321 §2.4 はローカル部の大小保存を要求する)。
    // 一意性は DB 側の `lower(email)` 一意索引が担保するので、
    // ここで正規化する必要が無い。
    const original = "Taro.Yamada@Example.COM";
    expect(String(v.parse(EmailSchema, original))).toBe(original);
  });

  test("契約と同じ判定をすること", () => {
    for (const value of [...accepted, ...rejected, "Taro.Yamada@Example.COM"]) {
      expect(v.safeParse(EmailSchema, value).success).toBe(
        v.safeParse(ContractEmailSchema, value).success,
      );
    }
  });
});
