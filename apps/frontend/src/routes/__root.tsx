import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

import { RootLayout } from "~/components/layouts/RootLayout";
import { NotFoundPage } from "~/components/pages/NotFoundPage";

/** 各ルートの `beforeLoad` / `loader` に配る依存。 */
export interface RouterContext {
  readonly queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});
