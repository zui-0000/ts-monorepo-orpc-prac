import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Outlet, useLocation } from "@tanstack/react-router";
import type { FC } from "react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { ErrorFallback } from "~/components/elements/ErrorFallback";
import { PageLoadingSpinner } from "~/components/elements/PageLoadingSpinner";

export const RootLayout: FC = () => {
  const { reset } = useQueryErrorResetBoundary();
  const { pathname } = useLocation();

  return (
    // 失敗しても main は残るよう、境界の外側に置く。
    <main>
      {/* resetKeys: pathname が変わったらエラー画面を戻し、次のページへ持ち越さない
          onReset: 再試行ボタンと resetKeys の変化のどちらでも
                   TanStack Query のエラー印を消し、再取得できるようにする */}
      <ErrorBoundary
        onReset={reset}
        resetKeys={[pathname]}
        FallbackComponent={ErrorFallback}
      >
        <Suspense fallback={<PageLoadingSpinner />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </main>
  );
};
