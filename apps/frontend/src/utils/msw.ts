import { worker } from "~/mocks/browser";

/**
 * モックの受け口を立ち上げる。
 *
 * **描画の前に待つ必要がある。** 先に描くと最初の取得がモックを素通りする。
 */
export const startMocking = () =>
  worker.start({
    onUnhandledRequest: (request, print) => {
      // 画面やモジュールの取得は素通しし、API の取りこぼしだけ知らせる。
      if (new URL(request.url).pathname.startsWith("/api")) print.warning();
    },
  });
