import * as v from "valibot";

/**
 * 平文パスワード (値オブジェクト / branded string)。12〜128 文字。
 *
 * NIST SP 800-63B に沿い、構成ルール (記号必須等) は課さず長さで強度を担保する
 * (根拠は契約の PasswordSchema)。
 *
 * **ハッシュ化するための一時的な値で、集約は保持しない。** 平文がドメインの内側に
 * 留まることはなく、User が持つのは `UserHashedPassword` だけ。
 *
 * user コンテキストに置くのは契約の配置 (`contexts/user/model/password.ts`) に
 * 合わせたもの。認証は better-auth が担う想定なので、shared へ上げる理由が今は無い。
 */
export const PasswordSchema = v.pipe(
  v.string(),
  v.minLength(12),
  v.maxLength(128),
  v.brand("User.Password"),
);

export type Password = v.InferOutput<typeof PasswordSchema>;
