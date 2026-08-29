import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { worker } from "~/mocks/browser";

import { createAppRouter } from "./router";

const queryClient = new QueryClient();
const router = createAppRouter(queryClient);

const root = document.getElementById("root");
if (!root) throw new Error("#root が見つかりません");

/**
 * この画面は MSW だけで完結する。backend には繋がない。
 *
 * モックの起動を待ってから描画する。先に描くと最初の取得が素通りしてしまう。
 */
await worker.start({
  onUnhandledRequest: (request, print) => {
    // 画面やモジュールの取得は素通しし、API の取りこぼしだけ知らせる。
    if (new URL(request.url).pathname.startsWith("/api")) print.warning();
  },
});

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
