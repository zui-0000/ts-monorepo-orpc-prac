import { createRootRouteWithContext } from "@tanstack/react-router";

import { RootLayout } from "~/components/layouts/RootLayout";
import { NotFoundPage } from "~/components/pages/NotFoundPage";

import type { RouterContext } from "./create-router";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});
