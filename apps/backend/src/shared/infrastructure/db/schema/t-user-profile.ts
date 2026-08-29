import { relations } from "drizzle-orm";
import {
  foreignKey,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { tUser } from "./auth/t-user.ts";

/**
 * 利用者のプロフィール。**ドメインが唯一書いてよいテーブル** (設計関連/ADR-09)。
 *
 * `auth` スキーマ側 (better-auth の所有物) とは名前空間で分かれている。
 * プロフィール項目が増えてもこちらだけが太る。
 *
 * **行はサインアップ時に作らない (遅延作成)。** 利用者がプロフィールを入力したとき
 * 初めて INSERT する。better-auth の `create.after` フックはコミット後に走るため、
 * 即時作成では「利用者は作られたがプロフィールが無い」窓を塞げない。
 * 遅延作成ならその窓が構造的に存在しない。
 *
 * **列はすべて NULL 許容。** 遅延作成なので「姓だけ先に入れる」が成り立つ。
 *
 * **長さの上限は DB に置かず契約側で持つ。** 「自己紹介は N 文字まで」はこちらが決めた
 * 方針であってデータ固有の制約ではなく、変えるのに migration を走らせたくないため。
 * (`auth.t_user.email` の 255 は RFC 由来の上限なので DB 側にある。)
 */
export const tUserProfile = pgTable(
  "t_user_profile",
  {
    // 主キー兼外部キー。1 利用者に 1 行 (0 行のこともある)。
    userId: uuid("user_id").primaryKey(),
    // 姓。OpenID Connect / schema.org の family_name に合わせた語 (lastName としない)。
    familyName: text("family_name"),
    // 名。姓が先に来る言語があるため firstName とは呼ばない。
    givenName: text("given_name"),
    // 姓カナ。全角カタカナのみ許す (検証は契約側)。
    familyNameKana: text("family_name_kana"),
    // 名カナ。
    givenNameKana: text("given_name_kana"),
    // 自己紹介。bio は略語で読めないため語をそのまま使う。
    introduction: text("introduction"),
    // 作成日時 (= 初めてプロフィールを入力した時刻)。
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // 更新日時。ドメインが値を書くため $onUpdate は付けない。
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "t_user_profile_user_id_fkey",
      columns: [table.userId],
      foreignColumns: [tUser.id],
    }).onDelete("cascade"),
  ],
);

/**
 * 関連の宣言。**テーブルを持ち込むファイルが、そのテーブルが関わる関連を
 * 両方向ぶん宣言する。**
 *
 * drizzle は同じテーブルへの `relations()` を**マージする** (実測)。そのため
 * `t_user` に紐づくテーブルが増えても、そのファイルが `t<親>To<自分>Relations` を
 * 足すだけでよく、**既存のファイルを触らない。**
 *
 * 逆に `tUserToProfileRelations` を `auth/t-user.ts` へ置くと循環参照になる。
 * 外部キーは子 (profile) が親 (user) を参照し、関連は親が子を参照するため、
 * 両方を各テーブルに置くと必ず輪になる (依存の検査が `no-circular` で止める)。
 *
 * 外部キーそのものは上のテーブル定義が持っており、これは drizzle へ
 * 「どう辿れるか」を教えるための別の宣言である (`db.query` で使う)。
 */

/** プロフィール → 利用者。 */
export const tUserProfileRelations = relations(tUserProfile, ({ one }) => ({
  user: one(tUser, { fields: [tUserProfile.userId], references: [tUser.id] }),
}));

/** 利用者 → プロフィール。1 利用者に 0..1 件 (遅延作成 / 設計関連/ADR-09)。 */
export const tUserToProfileRelations = relations(tUser, ({ one }) => ({
  profile: one(tUserProfile, {
    fields: [tUser.id],
    references: [tUserProfile.userId],
  }),
}));
