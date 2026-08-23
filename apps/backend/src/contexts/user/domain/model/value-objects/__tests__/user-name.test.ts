import { describe, expect, test } from "bun:test";

import { UserNameSchema as ContractUserNameSchema } from "@orpc-prac/contract";
import * as v from "valibot";

import { UserNameSchema } from "../user-name.ts";

/**
 * `minLength`/`maxLength` の組み合わせだけなので valibot の挙動を試す部分は書かない
 * (文字列以外を弾くこと、など)。固定したいのは**この値オブジェクトが下した判断**:
 * 1〜100 という業務が決めた範囲、文字種を制限しないこと、値を整形しないこと。
 *
 * 契約 (`packages/contract/.../contexts/user/model/user-name.ts`) にも同じ数字が
 * 手書きされている。ズレの検出は最後の test が担う。
 */
describe("UserNameSchema", () => {
  const accepted = [
    "あ",
    "あ".repeat(100),
    // 表示のための名前で識別子ではないので、記号や絵文字を弾く理由が無い。
    // ここが落ちたら誰かが `v.regex()` を足した合図。足すなら契約側にも要る。
    "山田 太郎",
    "Taro Yamada",
    "🐈",
    "a-b_c.d",
    "  太郎  ",
  ];

  // 空文字を通すと「名前が無い利用者」が生まれる。
  const rejected = ["", "あ".repeat(101)];

  test("境界の内側 (1 文字と 100 文字) と記号・絵文字の場合、通すこと", () => {
    for (const value of accepted) {
      expect(v.safeParse(UserNameSchema, value).success).toBe(true);
    }
  });

  test("境界の外側 (0 文字と 101 文字) の場合、弾くこと", () => {
    for (const value of rejected) {
      expect(v.safeParse(UserNameSchema, value).success).toBe(false);
    }
  });

  test("前後に空白がある場合、落とさずそのまま通すこと", () => {
    // 検証だけして値は変えないのが値オブジェクトの役目。`trim` を足すと
    // クライアントが送った表記を復元できなくなる。
    const padded = "  太郎  ";
    expect(String(v.parse(UserNameSchema, padded))).toBe(padded);
  });

  test("サロゲートペアを含む場合、UTF-16 コードユニットで数えること (契約の書き方とはズレる)", () => {
    // valibot の `maxLength` は `String.prototype.length` を見るので、
    // サロゲートペアが 2 つに数えられる。一方 OpenAPI の `maxLength` は
    // 「コードポイント数」と定義されているため、**契約は 🐈 を 51 匹まで
    // 許すと読める**のに実装は弾く。
    //
    // 500 にはならない。契約側も同じ valibot で数えるため、ドメインに届く前に
    // 400 になる (下の「契約と同じ判定」がそれを固定している)。
    const cats = "🐈".repeat(51);
    expect(Array.from(cats)).toHaveLength(51); // コードポイントでは 51
    expect(cats).toHaveLength(102); // コードユニットでは 102
    expect(v.safeParse(UserNameSchema, cats).success).toBe(false);

    // 50 匹 = 100 コードユニットならぎりぎり通る。
    expect(v.safeParse(UserNameSchema, "🐈".repeat(50)).success).toBe(true);
  });

  test("契約と同じ判定をすること", () => {
    for (const value of [...accepted, ...rejected, "🐈".repeat(51)]) {
      expect(v.safeParse(UserNameSchema, value).success).toBe(
        v.safeParse(ContractUserNameSchema, value).success,
      );
    }
  });
});
