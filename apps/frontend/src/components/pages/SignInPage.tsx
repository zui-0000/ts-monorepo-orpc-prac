import { useQueryClient } from "@tanstack/react-query";
import { Link, getRouteApi, useRouter } from "@tanstack/react-router";
import type { FC } from "react";
import { useState } from "react";

import { authErrorMessage } from "~/api/contexts/auth/auth-error";
import { useSignInMutation } from "~/api/contexts/auth/use-sign-in-mutation";
import { CONTEXT_KEYS } from "~/api/shared/keys";

// ルートから Route を import すると循環するため、ID で引く。
const route = getRouteApi("/sign-in");

export const SignInPage: FC = () => {
  const { registered } = route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: "", password: "" });

  const signIn = useSignInMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CONTEXT_KEYS.AUTH_CONTEXT_KEY.session(),
      });
      await router.navigate({ to: "/" });
    },
  });

  return (
    <section>
      <h2>サインイン</h2>
      {registered && (
        <output>
          登録しました。検証メールのリンクを開いてからサインインしてください。
        </output>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          signIn.mutate(form);
        }}
      >
        <p>
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </p>
        <p>
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
          />
        </p>

        <button type="submit" disabled={signIn.isPending}>
          サインイン
        </button>
        {signIn.isError && <p role="alert">{authErrorMessage(signIn.error)}</p>}
      </form>
      <p>
        未登録なら <Link to="/sign-up">サインアップ</Link>
      </p>
    </section>
  );
};
