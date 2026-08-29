import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { startMocking } from "~/mocks/browser";

import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("#root が見つかりません");

// この画面は MSW だけで完結する。backend には繋がない。
await startMocking();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
