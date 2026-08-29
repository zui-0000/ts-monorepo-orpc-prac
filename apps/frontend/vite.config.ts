import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // routes/ の構成から routeTree.gen.ts を作る。react より前に置く必要がある。
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
  ],
});
