/**
 * メール検証のリンクを届ける。**ここが送信手段の差し替え口** (docs/02)。
 *
 * better-auth は `{ user, url, token }` を渡してくるだけで、**メールを送る義務は無い。**
 * 検証 URL がどこかに出れば検証は成立する。送信サービスを決めていないため、
 * いまはコンソールへ出す実装を置いている。
 *
 * **`requireEmailVerification: true` と対で必須。** この関数が無いと better-auth は
 * サインインを 403 で止めたまま検証する手段を出さず、誰もログインできなくなる
 * (`sign-in.mjs` が `sendVerificationEmail` の有無を見て分岐する)。
 *
 * 本番では中身を送信サービスの呼び出しに替える。**URL の組み立ては better-auth が
 * 済ませている**ので、差し替えるのは「どう届けるか」だけである。
 */
export const sendVerificationEmail = async ({
  user,
  url,
}: {
  readonly user: { readonly email: string };
  readonly url: string;
}): Promise<void> => {
  // **URL は秘密を含む。** token がそのまま入っているため、本番のログには出さない。
  // 開発でコンソールに出しているのは、届ける先が他に無いからである。
  console.info(
    [
      "",
      "──────── メール検証 ────────",
      `宛先: ${user.email}`,
      `リンク: ${url}`,
      "────────────────────────────",
      "",
    ].join("\n"),
  );
};
