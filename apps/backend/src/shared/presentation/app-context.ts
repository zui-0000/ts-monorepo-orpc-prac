import type { AuthenticatedCaller } from "~/shared/domain/model/authenticated-caller.ts";

/**
 * oRPC のハンドラへ渡す文脈。**リクエストごとに 1 つ組み立てる。**
 *
 * 契約の実装 (`implement(contract).$context<AppContext>()`) はすべてこの型を
 * 共有する。ハンドラごとに同じ形を書き直すと、増やすたびに写す羽目になり、
 * 項目を足したときの追随漏れが起きる。
 */
export type AppContext = {
  /**
   * セッションから引いた相手。**未認証なら `undefined`。**
   *
   * 認証の判定は `os` のミドルウェアが行い、そこで 401 に翻訳する。
   * ハンドラへ届く時点では `undefined` が除かれているため、
   * controller は素の `AuthenticatedCaller` を受け取れる。
   */
  readonly caller: AuthenticatedCaller | undefined;
};
