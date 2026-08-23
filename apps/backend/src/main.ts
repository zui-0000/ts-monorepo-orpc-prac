import { appDeps } from "./app-deps.ts";
import { app } from "./app.ts";

/**
 * エントリ。**組み立てて起動するだけ。**
 *
 * どの実装を使うか、設定をどう読むかは合成ルート (`app-deps.ts`) が持つ。
 */
export default {
  port: Number(Bun.env.PORT ?? 3000),
  fetch: app(appDeps()).fetch,
};
