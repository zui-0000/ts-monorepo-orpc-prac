import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Outlet, useLocation } from "@tanstack/react-router";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { ErrorFallback } from "~/components/elements/ErrorFallback";
import { PageLoadingSpinner } from "~/components/elements/PageLoadingSpinner";

export const RootLayout = () => {
  const { reset } = useQueryErrorResetBoundary();
  const { pathname } = useLocation();

  return (
    // resetKeys: pathname が変わったら ErrorBoundary を戻し、
    //   エラー画面が次のページへ持ち越されるのを防ぐ
    // onReset: リセット時 (resetKeys の変化・再試行ボタンの押下の両方) に
    //   TanStack Query のエラー印を消し、クエリを再試行できるようにする
    <ErrorBoundary
      onReset={reset}
      resetKeys={[pathname]}
      FallbackComponent={ErrorFallback}
    >
      <Suspense fallback={<PageLoadingSpinner />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
};
