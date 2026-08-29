import type { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

/** 各ルートの `beforeLoad` / `loader` に配る依存。 */
export interface RouterContext {
  readonly queryClient: QueryClient;
}

export const createAppRouter = (queryClient: QueryClient) =>
  createRouter({
    routeTree,
    context: { queryClient },
    // 取得は loader が済ませるため、描画中の再取得を既定で止める。
    defaultPreload: "intent",
    scrollRestoration: true,
  });

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
