import type { HttpHandler } from "msw";
import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";
import { scenarios } from "./scenarios";

/** `?scenario=<名前>` で選ばれた上書き。知らない名前なら知らせて既定で動く。 */
const selectedScenario = (): readonly HttpHandler[] => {
  const requested = new URLSearchParams(location.search).get("scenario");
  if (!requested) return [];

  const found = scenarios[requested];
  if (!found) {
    console.warn(
      `[mock] 知らないシナリオ "${requested}"。既定の正常系で動きます。`,
      `\n使えるのは: ${Object.keys(scenarios).join(" / ")}`,
    );
    return [];
  }
  return found;
};

// **上書きを前に置く。** MSW は左のハンドラを優先する。
const worker = setupWorker(...selectedScenario(), ...handlers);

/**
 * モックの受け口を立ち上げる。
 *
 * **描画の前に待つ必要がある。** 先に描くと最初の取得がモックを素通りする。
 */
export const startMocking = async () =>
  worker.start({
    // ハンドラに一致しなかった通信の扱い。**`print.warning()` を呼べば `warn`、
    // 呼ばなければ `bypass` と同じ**になる。Service Worker は画面や JS の取得まで
    // 横取りするため、一律 warn だと埋まり、一律 bypass だと API の書き忘れに
    // 気づけない。
    onUnhandledRequest: (request, print) => {
      if (new URL(request.url).pathname.startsWith("/api")) print.warning();
    },
  });
