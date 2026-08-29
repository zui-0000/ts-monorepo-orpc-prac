import { Link, Outlet } from "@tanstack/react-router";
import type { FC } from "react";

export const RootLayout: FC = () => (
  <main>
    <h1>
      <Link to="/">ts-monorepo-orpc-prac</Link>
    </h1>
    <Outlet />
  </main>
);
