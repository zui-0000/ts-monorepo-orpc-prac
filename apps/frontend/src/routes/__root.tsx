import {
  Link,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";

import type { RouterContext } from "../router";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => (
    <p>
      ページが見つかりません。<Link to="/">トップへ</Link>
    </p>
  ),
});

function RootLayout() {
  return (
    <main>
      <h1>
        <Link to="/">ts-monorepo-orpc-prac</Link>
      </h1>
      <Outlet />
    </main>
  );
}
