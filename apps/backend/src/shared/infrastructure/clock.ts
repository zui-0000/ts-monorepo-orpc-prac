import type { Clock } from "~/shared/domain/clock.ts";

/**
 * 本番実装: システム時刻。テストでは固定した実装を渡す。
 *
 * `system` ではなく素の `clock` と名乗るのは、差し替え候補が
 * **実物か固定かの 2 択しかない**ため。技術名を冠する必要があるのは
 * 実装の選択肢が実在するアダプタだけで、時計にその対比は無い。
 */
export const clock: Clock = {
  now: () => new Date(),
};
