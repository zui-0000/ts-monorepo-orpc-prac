import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { FC } from "react";
import { useState } from "react";

import { PageLoadingSpinner } from "~/components/elements/PageLoadingSpinner";
import { routeTree } from "~/routeTree.gen";

/** Link と useNavigate の `to` を既知の経路だけに絞る。 */
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

/** context の型は routeTree 越しに __root.tsx の RouterContext と照合される。 */
const createAppRouter = (queryClient: QueryClient) =>
  createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    // 出るのは既定で 1 秒以上かかったときだけ。個別の経路は pendingComponent で上書きする。
    defaultPendingComponent: PageLoadingSpinner,
    scrollRestoration: true,
  });

export const App: FC = () => {
  // モジュールスコープではなく useState で初期化することで、マウントごとに独立した
  // インスタンスが生成される。テストで複数回マウントしてもキャッシュが混在しない。
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 失敗しても再試行しない (観測器の既定は 3 回)。
            // 命令的な queryClient.query() は元から 1 回きりで、これは効かない。
            retry: false,
            // オフライン判定でも実行する。応答は MSW が返すため。
            networkMode: "always",
            // 取得したものを即座に古い扱いにする。保持は各 query-option が決める。
            staleTime: 0,
          },
        },
      }),
  );

  // ルータの beforeLoad は React の外で動くため、同じ実体を context へ渡す。
  const [router] = useState(() => createAppRouter(queryClient));

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* 本番ビルドでは何も描かないため、環境分岐を書く必要はない。 */}
      <ReactQueryDevtools buttonPosition="bottom-left" />
      <TanStackRouterDevtools router={router} position="bottom-right" />
    </QueryClientProvider>
  );
};
