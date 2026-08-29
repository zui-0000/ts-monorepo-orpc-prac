import { createFileRoute, redirect } from "@tanstack/react-router";

import { orpc } from "~/api/orpc";
import { sessionQueryOptions } from "~/api/session";
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
      ...orpc.user.get.queryOptions({ input: { id: context.userId } }),
      staleTime: "static",
    }),
  component: ProfilePage,
});
