import { createFileRoute, redirect } from "@tanstack/react-router";

import { sessionQueryOptions } from "~/api/session";
import { SignUpPage } from "~/components/pages/SignUpPage";

export const Route = createFileRoute("/sign-up")({
  beforeLoad: async ({ context }) => {
    const session =
      await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (session) throw redirect({ to: "/" });
  },
  component: SignUpPage,
});
