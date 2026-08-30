import { createFileRoute, redirect } from "@tanstack/react-router";

import { getSessionQueryOption } from "~/api/contexts/auth/get-session-query-option";
import { getUserQueryOption } from "~/api/contexts/user/get-user-query-option";
import { ProfilePage } from "~/components/pages/ProfilePage";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    // staleTime: "static" は「あれば使い、無ければ取る」。ensureQueryData の後継。
    const session = await context.queryClient.query({
      ...getSessionQueryOption,
      staleTime: "static",
    });
    if (!session) throw redirect({ to: "/sign-in" });
    return { userId: session.user.id };
  },
  loader: ({ context }) =>
    context.queryClient.query({
      ...getUserQueryOption(context.userId),
      staleTime: "static",
    }),
  component: ProfilePage,
});
