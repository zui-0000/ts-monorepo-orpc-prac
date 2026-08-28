import type { UuidGenerator } from "~/shared/domain/uuid-generator.ts";

/**
 * 本番実装: Bun ネイティブの uuidv7 を採番する。
 *
 * v4 ではなく v7 なのは、先頭にミリ秒精度の時刻を持ち**単調増加**するため。
 * 主キーが乱数だと B-Tree の挿入位置が毎回散らばり、ページ分割とキャッシュミスを
 * 招く (`t_user.id` は主キー)。判断の経緯は設計関連/ADR-07。
 *
 * 現在の参照元は無い。better-auth の `advanced.database.generateId` に渡すため残す。
 */
export const uuidGenerator: UuidGenerator = {
  generate: () => Bun.randomUUIDv7(),
};
