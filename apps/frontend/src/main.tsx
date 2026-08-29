import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createAppRouter } from "./router";

/**
 * 既定はモック。実の backend へ向けるときだけ `VITE_API_MODE=live` を渡す。
 *
 * live のときは vite の proxy が `/api` を backend へ流す。
 */
const startMocking = async () => {
  // 本番のバンドルへ MSW を持ち込まないための静的な分岐 (約 420 kB)。
  if (!import.meta.env.DEV) return;
  if (import.meta.env.VITE_API_MODE === "live") return;

  const { worker } = await import("./mocks/browser");
  // 画面やモジュールの取得まで横取りしないよう素通しさせる。
  await worker.start({ onUnhandledRequest: "bypass" });
};

const queryClient = new QueryClient();
const router = createAppRouter(queryClient);

const root = document.getElementById("root");
if (!root) throw new Error("#root が見つかりません");

await startMocking();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
