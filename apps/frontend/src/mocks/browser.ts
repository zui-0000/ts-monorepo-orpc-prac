import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";

const worker = setupWorker(...handlers);

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
