import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/**
 * 単体テスト用のモック。**画面は `browser.ts` を使う。**
 *
 * **`location` を持つ環境で動かすこと。** 認証のハンドラが検証リンクの組み立てに
 * `location.origin` を使うため、素の Node では落ちる (jsdom / happy-dom なら動く)。
 */
export const server = setupServer(...handlers);
