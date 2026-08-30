import { createFileRoute, redirect } from "@tanstack/react-router";
import * as v from "valibot";

import { getSessionQueryOption } from "~/api/contexts/auth/get-session-query-option";
import { SignInPage } from "~/components/pages/SignInPage";

/** サインアップ直後だけ案内を出すための印。 */
const SearchSchema = v.object({
  registered: v.optional(v.boolean(), false),
});

export const Route = createFileRoute("/sign-in")({
  validateSearch: SearchSchema,
  beforeLoad: async ({ context }) => {
    // staleTime: "static" は「あれば使い、無ければ取る」。ensureQueryData の後継。
    const session = await context.queryClient.query({
      ...getSessionQueryOption,
      staleTime: "static",
    });
    if (session) throw redirect({ to: "/" });
  },
  component: SignInPage,
});
