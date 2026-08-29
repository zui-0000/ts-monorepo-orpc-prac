import { createFileRoute, redirect } from "@tanstack/react-router";

import { orpc } from "~/api/orpc";
import { sessionQueryOptions } from "~/api/session";
import { ProfilePage } from "~/components/pages/ProfilePage";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const session =
      await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (!session) throw redirect({ to: "/sign-in" });
    return { userId: session.user.id };
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      orpc.user.get.queryOptions({ input: { id: context.userId } }),
    ),
  component: ProfilePage,
});
