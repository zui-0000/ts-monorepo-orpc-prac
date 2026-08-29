import type { router } from "../create-router";

/**
 * tanstack-router のモジュール拡張。
 * Register インターフェースに router の型を登録することで、
 * useNavigate や Link の `to` プロップが既知のルートパスのみを受け付けるようになる。
 * このファイルは tsconfig の include 設定により自動的に読み込まれるため、明示的な import は不要。
 *
 * **.d.ts にしないこと。** skipLibCheck が有効なため、.d.ts だとこのファイル自身が
 * 型検査されず、import 先を改名しても壊れたまま気づけない (Link の型安全だけが
 * 静かに消える)。
 */
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
