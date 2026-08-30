import { createFileRoute, redirect } from "@tanstack/react-router";

import { getSessionQueryOption } from "~/api/auth/get-session-query-option";
import { SignUpPage } from "~/components/pages/SignUpPage";

export const Route = createFileRoute("/sign-up")({
  beforeLoad: async ({ context }) => {
    // staleTime: "static" は「あれば使い、無ければ取る」。ensureQueryData の後継。
    const session = await context.queryClient.query({
      ...getSessionQueryOption,
      staleTime: "static",
    });
    if (session) throw redirect({ to: "/" });
  },
  component: SignUpPage,
});
