/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `live` のとき実の backend を叩く。未指定なら MSW のモック。 */
  readonly VITE_API_MODE?: "live" | "mock";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
