import { describe, expect, test } from "bun:test";

import { PasswordSchema as ContractPasswordSchema } from "@orpc-prac/contract";
import * as v from "valibot";

import { PasswordSchema } from "../password.ts";

/**
 * 固定したいのは**この値オブジェクトが下した判断**: 12〜128 という範囲と、
 * **文字種を強制しないこと**。後者は NIST SP 800-63B の推奨に沿った判断で、
 * 記号必須のような構成ルールは予測可能なパターンを誘発して逆効果になる。
 *
 * 契約 (`packages/contract/.../contexts/user/model/password.ts`) にも同じ数字が
 * 手書きされている。ズレの検出は最後の test が担う。
 *
 * **ここがズレると平文が絡む経路で 500 になる。** 契約を通った入力が
 * ドメインで落ちるため。値そのものはログにも応答にも出ない
 * (`parse-invariant.ts`) が、利用者から見れば正しい入力が通らないことになる。
 */
describe("PasswordSchema", () => {
  const accepted = [
    "a".repeat(12),
    "a".repeat(128),
    // 記号も大文字も数字も無い。長さだけで強度を担保する方針の確認。
    "correcthorsebattery",
    // 逆に記号だらけでも通る。文字種で選り好みしない。
    "!#$%&'()*+,-./:;",
    // 前後の空白も落とさない。整形は値オブジェクトの仕事ではない。
    "  passphrase  ",
  ];

  const rejected = ["", "a".repeat(11), "a".repeat(129)];

  test("境界の内側 (12 文字と 128 文字) と文字種を問わない場合、通すこと", () => {
    for (const value of accepted) {
      expect(v.safeParse(PasswordSchema, value).success).toBe(true);
    }
  });

  test("境界の外側 (11 文字と 129 文字) の場合、弾くこと", () => {
    // 下限 12 は NIST の最低 8 より強め (エントロピーは長さに支配される)。
    // 上限 128 は超長文による hash コスト増 (DoS) を防ぐためのもの。
    for (const value of rejected) {
      expect(v.safeParse(PasswordSchema, value).success).toBe(false);
    }
  });

  test("契約と同じ判定をすること", () => {
    for (const value of [...accepted, ...rejected]) {
      expect(v.safeParse(PasswordSchema, value).success).toBe(
        v.safeParse(ContractPasswordSchema, value).success,
      );
    }
  });
});
