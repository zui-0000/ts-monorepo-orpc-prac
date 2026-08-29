import { createFileRoute, redirect } from "@tanstack/react-router";
import * as v from "valibot";

import { sessionQueryOptions } from "~/api/session";
import { SignInPage } from "~/components/pages/SignInPage";

/** サインアップ直後だけ案内を出すための印。 */
const SearchSchema = v.object({
  registered: v.optional(v.boolean(), false),
});

export const Route = createFileRoute("/sign-in")({
  validateSearch: SearchSchema,
  beforeLoad: async ({ context }) => {
    const session =
      await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (session) throw redirect({ to: "/" });
  },
  component: SignInPage,
});
