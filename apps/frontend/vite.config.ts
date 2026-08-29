import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // routes/ の構成から routeTree.gen.ts を作る。react より前に置く必要がある。
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
  ],
  resolve: {
    // tsconfig の paths と対で必要。tsc は型を、こちらは実際の解決を受け持つ。
    alias: { "~": `${import.meta.dirname}/src` },
  },
});
