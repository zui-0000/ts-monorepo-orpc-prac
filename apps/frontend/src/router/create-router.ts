import { createRouter } from "@tanstack/react-router";

import { queryClient } from "~/api/query-client";
import { routeTree } from "~/routeTree.gen";

/** 各ルートの `beforeLoad` / `loader` に配る依存。 */
export interface RouterContext {
  readonly queryClient: typeof queryClient;
}

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
