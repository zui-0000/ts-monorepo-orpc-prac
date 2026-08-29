import { QueryClientProvider } from "@tanstack/react-query";
import type { FC, ReactNode } from "react";

import { queryClient } from "~/api/query-client";

export const TanStackQueryProvider: FC<{ readonly children: ReactNode }> = ({
  children,
}) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);
