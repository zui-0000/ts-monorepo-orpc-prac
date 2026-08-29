import { relations } from "drizzle-orm";

import { tUser } from "./auth.ts";
import { tUserProfile } from "./user-profile.ts";

/**
 * テーブル間の関係。**`db.query` (リレーショナルクエリ) を使うために要る。**
 *
 * 外部キーは各テーブルの定義が持っており、ここはそれとは別に
 * **drizzle へ「どう辿れるか」を教えるための宣言**である。
 *
 * これがあると LEFT JOIN を手で書かずに済み、行が無い側は `null` で返る。
 * 手書きの JOIN では「行が無い」と「項目がすべて空」を見分けるために主キーを
 * 余分に引く必要があった。
 */
export const tUserRelations = relations(tUser, ({ one }) => ({
  // 1 利用者に 0..1 件。プロフィールは遅延作成される (設計関連/ADR-09)。
  profile: one(tUserProfile, {
    fields: [tUser.id],
    references: [tUserProfile.userId],
  }),
}));

export const tUserProfileRelations = relations(tUserProfile, ({ one }) => ({
  user: one(tUser, {
    fields: [tUserProfile.userId],
    references: [tUser.id],
  }),
}));
