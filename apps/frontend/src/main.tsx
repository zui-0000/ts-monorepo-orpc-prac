import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { startMocking } from "~/utils/msw";

import { createAppRouter } from "./router";

const queryClient = new QueryClient();
const router = createAppRouter(queryClient);

const root = document.getElementById("root");
if (!root) throw new Error("#root が見つかりません");

// この画面は MSW だけで完結する。backend には繋がない。
await startMocking();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
