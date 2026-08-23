import { describe, expect, test } from "bun:test";

import * as v from "valibot";

import { UserHashedPasswordSchema } from "../user-hashed-password.ts";

/**
 * **平文がこの欄に入る事故を防げているか**を固定する。
 *
 * 長さだけの値オブジェクト (`UserNameSchema` など) と違い、ここは**自作の正規表現**で、
 * しかも「長さでは分離できないから形式で見る」という非自明な判断が入っている。
 *
 * **契約との突き合わせが無いのはこの値だけ。** ハッシュは API に出ないため
 * 契約側に対応する型が無い。ズレようがないので最後の test も置かない。
 */
describe("UserHashedPasswordSchema", () => {
  test("PHC 形式の場合、アルゴリズムを問わず通すこと", () => {
    // argon2id / bcrypt / scrypt はどれも `$<識別子>$` で始まる規約に従う。
    // 特定のアルゴリズムに縛らないので、実装を替えても通り続ける。
    for (const hashed of [
      "$argon2id$v=19$m=65536,t=2,p=1$c2FsdA$aGFzaA",
      "$2b$12$abcdefghijklmnopqrstuv",
      "$scrypt$ln=16,r=8,p=1$c2FsdA$aGFzaA",
    ]) {
      expect(v.safeParse(UserHashedPasswordSchema, hashed).success).toBe(true);
    }
  });

  test("平文の場合、弾くこと", () => {
    // 防ぎたい事故そのもの。ハッシュ化を挟み忘れて平文が渡ってくる形。
    for (const plainText of [
      "password1234",
      "Str0ng-Passphrase-With-Symbols!",
      "a".repeat(128),
    ]) {
      expect(v.safeParse(UserHashedPasswordSchema, plainText).success).toBe(
        false,
      );
    }
  });

  test("平文とハッシュが同じ長さの場合でも、形式で弾くこと", () => {
    // 平文は 12〜128 文字、argon2id は 118 文字、bcrypt は 60 文字。
    // どちらも平文の許容範囲に収まるので、長さで弾く実装にしてはいけない。
    const bcryptLength = "$2b$12$abcdefghijklmnopqrstuv".length;
    const plainTextSameLength = "x".repeat(bcryptLength);

    expect(bcryptLength).toBeGreaterThanOrEqual(12);
    expect(bcryptLength).toBeLessThanOrEqual(128);
    expect(
      v.safeParse(UserHashedPasswordSchema, plainTextSameLength).success,
    ).toBe(false);
  });

  test("`$` で始まるだけの文字列の場合、通してしまうこと (承知の限界)", () => {
    // 不透明な値として扱うので中身は解釈しない。`$` 始まりの文字列を
    // わざわざ渡す経路は無く、防ぎたいのは平文の混入なのでここは許容する。
    expect(
      v.safeParse(UserHashedPasswordSchema, "$x$notreallyahash").success,
    ).toBe(true);
  });
});
