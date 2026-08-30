import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import type { FC } from "react";
import { useState } from "react";

import { authErrorMessage } from "~/api/auth/auth-error";
import {
  MIN_PASSWORD_LENGTH,
  useSignUpMutation,
} from "~/api/auth/use-sign-up-mutation";
import { CONTEXT_KEYS } from "~/api/keys";

export const SignUpPage: FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const signUp = useSignUpMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CONTEXT_KEYS.AUTH_CONTEXT_KEY.session(),
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
          signUp.mutate(form);
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
        {signUp.isError && <p role="alert">{authErrorMessage(signUp.error)}</p>}
      </form>
      <p>
        登録済みなら <Link to="/sign-in">サインイン</Link>
      </p>
    </section>
  );
};
