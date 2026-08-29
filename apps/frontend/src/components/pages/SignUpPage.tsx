import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import type { FC } from "react";
import { useState } from "react";

import { authClient } from "~/api/auth-client";
import { QUERY_KEYS } from "~/api/queries/keys";

/** backend の `emailAndPassword.minPasswordLength` に合わせる。 */
const MIN_PASSWORD_LENGTH = 15;

export const SignUpPage: FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const signUp = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signUp.email(form);
      if (error) throw new Error(error.message ?? "登録できませんでした");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SESSION_QUERY_KEY.all,
      });
      await router.navigate({ to: "/sign-in", search: { registered: true } });
    },
  });

  return (
    <section>
      <h2>サインアップ</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          signUp.mutate();
        }}
      >
        <p>
          <label htmlFor="name">表示名</label>
          <input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </p>
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
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
          />
          <small>
            {MIN_PASSWORD_LENGTH} 文字以上。漏洩したパスワードは登録できません。
          </small>
        </p>

        <button type="submit" disabled={signUp.isPending}>
          登録する
        </button>
        {signUp.isError && <p role="alert">{signUp.error.message}</p>}
      </form>
      <p>
        登録済みなら <Link to="/sign-in">サインイン</Link>
      </p>
    </section>
  );
};
