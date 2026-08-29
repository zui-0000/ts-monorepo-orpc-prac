import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, getRouteApi, useRouter } from "@tanstack/react-router";
import type { FC } from "react";
import { useState } from "react";

import { authClient } from "~/api/auth-client";
import { QUERY_KEYS } from "~/api/queries/keys";

// ルートから Route を import すると循環するため、ID で引く。
const route = getRouteApi("/sign-in");

export const SignInPage: FC = () => {
  const { registered } = route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: "", password: "" });

  const signIn = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signIn.email(form);
      if (error) {
        // backend が requireEmailVerification を有効にしているため、
        // 未検証のまま入ろうとするとここに来る。
        throw new Error(
          error.status === 403
            ? "メールアドレスの検証が済んでいません。届いたリンクを開いてください"
            : (error.message ?? "サインインできませんでした"),
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SESSION_QUERY_KEY.all,
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
          signIn.mutate();
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
        {signIn.isError && <p role="alert">{signIn.error.message}</p>}
      </form>
      <p>
        未登録なら <Link to="/sign-up">サインアップ</Link>
      </p>
    </section>
  );
};
