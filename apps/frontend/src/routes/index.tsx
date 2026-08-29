import { createFileRoute, redirect } from "@tanstack/react-router";

import { sessionQueryOptions } from "~/api/queries/auth/get-session";
import { getUserQueryOptions } from "~/api/queries/users/get-user";
import { ProfilePage } from "~/components/pages/ProfilePage";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    // staleTime: "static" は「あれば使い、無ければ取る」。ensureQueryData の後継。
    const session = await context.queryClient.query({
      ...sessionQueryOptions,
      staleTime: "static",
    });
    if (!session) throw redirect({ to: "/sign-in" });
    return { userId: session.user.id };
  },
  loader: ({ context }) =>
    context.queryClient.query({
      ...getUserQueryOptions(context.userId),
      staleTime: "static",
    }),
  component: ProfilePage,
});
