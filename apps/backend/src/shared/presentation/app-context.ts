import type { AuthenticatedCaller } from "~/shared/domain/model/authenticated-caller.ts";

/**
 * oRPC のハンドラへ渡す文脈。**リクエストごとに 1 つ組み立てる。**
 *
 * 契約の実装 (`implement(contract).$context<AppContext>()`) はすべてこの型を
 * 共有する。ハンドラごとに同じ形を書き直すと、増やすたびに写す羽目になり、
 * 項目を足したときの追随漏れが起きる。
 */
export type AppContext = {
  readonly caller: AuthenticatedCaller;
};
