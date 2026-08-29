import { createFileRoute, redirect } from "@tanstack/react-router";

import { sessionQueryOptions } from "~/api/queries/auth/get-session";
import { SignUpPage } from "~/components/pages/SignUpPage";

export const Route = createFileRoute("/sign-up")({
  beforeLoad: async ({ context }) => {
    // staleTime: "static" は「あれば使い、無ければ取る」。ensureQueryData の後継。
    const session = await context.queryClient.query({
      ...sessionQueryOptions,
      staleTime: "static",
    });
    if (session) throw redirect({ to: "/" });
  },
  component: SignUpPage,
});
