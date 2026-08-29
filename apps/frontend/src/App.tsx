import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { FC } from "react";

import { TanStackQueryProvider } from "~/components/providers/TanStackQueryProvider";
import { router } from "~/router/create-router";

export const App: FC = () => (
  <TanStackQueryProvider>
    <RouterProvider router={router} />
    {/* 本番ビルドでは何も描かないため、環境分岐を書く必要はない。 */}
    <ReactQueryDevtools buttonPosition="bottom-left" />
    <TanStackRouterDevtools router={router} position="bottom-right" />
  </TanStackQueryProvider>
);
