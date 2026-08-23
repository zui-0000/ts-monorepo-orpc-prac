import { CreateUserRequestSchema } from "@orpc-prac/contract";
import type {
  CreateUserRequest,
  CreateUserResponse,
} from "@orpc-prac/contract";
import { useState } from "react";
import * as v from "valibot";

import { client } from "./api-client";

/**
 * 契約が frontend からどう使えるかを確かめるための画面。
 *
 * - 入力の型 (CreateUserRequest) は契約から来る
 * - 送る前の検証も契約のスキーマ (valibot) をそのまま使う
 * - 呼び出しと戻り値の型は oRPC クライアントが契約から導く
 */
export const UserForm = () => {
  const [form, setForm] = useState<CreateUserRequest>({
    name: "",
    mailAddress: "",
    password: "",
  });
  const [created, setCreated] = useState<CreateUserResponse | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 契約のスキーマで送信前に検証する。サーバと同じ規則が効く。
    const parsed = v.safeParse(CreateUserRequestSchema, form);
    if (!parsed.success) {
      setIssues(parsed.issues.map((i) => v.getDotPath(i) ?? "(root)"));
      return;
    }

    setIssues([]);
    const result = await client.user.create(parsed.output);
    setCreated(result);
  };

  const field = (
    key: keyof CreateUserRequest,
    label: string,
    type = "text",
  ) => (
    <label>
      {label}
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );

  return (
    <form onSubmit={submit}>
      {field("name", "名前")}
      {field("mailAddress", "メールアドレス")}
      {field("password", "パスワード", "password")}
      <button type="submit">作成</button>

      {issues.length > 0 && <p>不正な項目: {issues.join(", ")}</p>}
      {created && <p>作成しました: {created.id}</p>}
    </form>
  );
};
