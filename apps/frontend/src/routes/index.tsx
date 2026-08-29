import { isDefinedError } from "@orpc/client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "~/api/auth-client";
import { orpc } from "~/api/orpc";
import { SESSION_QUERY_KEY, sessionQueryOptions } from "~/api/session";

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

/**
 * 検証違反の文言。
 *
 * 応答は不正だったフィールド名しか返さない。検証ライブラリの文言には入力値が
 * 乗るため、サーバは載せない約束になっている (contract の error-item.ts)。
 */
const FIELD_MESSAGES: Readonly<Record<string, string>> = {
  familyName: "姓は 1〜50 文字で入力してください",
  givenName: "名は 1〜50 文字で入力してください",
  familyNameKana: "姓 (カナ) は全角カタカナ 1〜50 文字で入力してください",
  givenNameKana: "名 (カナ) は全角カタカナ 1〜50 文字で入力してください",
  introduction: "自己紹介は 1〜1000 文字で入力してください",
};

const FIELDS = [
  { name: "familyName", label: "姓" },
  { name: "givenName", label: "名" },
  { name: "familyNameKana", label: "姓 (カナ)" },
  { name: "givenNameKana", label: "名 (カナ)" },
  { name: "introduction", label: "自己紹介", multiline: true },
] as const;

type FieldName = (typeof FIELDS)[number]["name"];
type FormValues = Record<FieldName, string>;

/** 空文字は「その項目を空にする」を意味するため null へ寄せる。 */
const toRequest = (values: FormValues) =>
  Object.fromEntries(
    FIELDS.map(({ name }) => [name, values[name].trim() || null]),
  ) as Record<FieldName, string | null>;

function ProfilePage() {
  const { userId } = Route.useRouteContext();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user } = useSuspenseQuery(
    orpc.user.get.queryOptions({ input: { id: userId } }),
  );

  const [values, setValues] = useState<FormValues>(
    () =>
      Object.fromEntries(
        FIELDS.map(({ name }) => [name, user.profile?.[name] ?? ""]),
      ) as FormValues,
  );

  const update = useMutation(
    orpc.user.updateProfile.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.user.get.queryKey({ input: { id: userId } }),
        }),
    }),
  );

  const signOut = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      await router.navigate({ to: "/sign-in" });
    },
  });

  const invalidFields = new Set(
    isDefinedError(update.error) && update.error.code === "BAD_REQUEST_ERROR"
      ? update.error.data.errors.map(({ field }) => field)
      : [],
  );

  return (
    <>
      <section>
        <h2>アカウント</h2>
        {/* どちらも認証基盤が持つ値。ここからは変更できない (設計関連/ADR-09)。 */}
        <dl>
          <dt>表示名</dt>
          <dd>{user.name}</dd>
          <dt>メールアドレス</dt>
          <dd>{user.email}</dd>
        </dl>
        <button
          type="button"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          サインアウト
        </button>
      </section>

      <section>
        <h2>プロフィール</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            update.mutate({ id: userId, ...toRequest(values) });
          }}
        >
          {FIELDS.map(({ name, label, ...rest }) => (
            <p key={name}>
              <label htmlFor={name}>{label}</label>
              {"multiline" in rest ? (
                <textarea
                  id={name}
                  value={values[name]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [name]: e.target.value }))
                  }
                />
              ) : (
                <input
                  id={name}
                  value={values[name]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [name]: e.target.value }))
                  }
                />
              )}
              {invalidFields.has(name) && (
                <strong role="alert">{FIELD_MESSAGES[name]}</strong>
              )}
            </p>
          ))}

          <button type="submit" disabled={update.isPending}>
            保存
          </button>
          {update.isSuccess && <output>保存しました</output>}
          {update.isError && !invalidFields.size && (
            <p role="alert">保存できませんでした</p>
          )}
        </form>
      </section>
    </>
  );
}
