import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("#root が見つかりません");

// 開発だけモックを立てる。動的 import なので本番ビルドには含まれない。
if (import.meta.env.DEV) {
  const { startMocking } = await import("~/mocks/browser");
  await startMocking();
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
