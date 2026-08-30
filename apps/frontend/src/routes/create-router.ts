import type { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import { routeTree } from "~/routeTree.gen";

/** 各ルートの `beforeLoad` / `loader` に配る依存。 */
export interface RouterContext {
  readonly queryClient: QueryClient;
}

export const createAppRouter = (queryClient: QueryClient) =>
  createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    scrollRestoration: true,
  });
