import { APIError } from "better-auth/api";

/** k-anonymity API。ハッシュの先頭 5 文字だけを送る。 */
const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range";

/** 応答を待つ上限。HIBP が遅いときにサインアップを無限に待たせない。 */
const TIMEOUT_MS = 5000;

const sha1Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
};

/**
 * 漏洩済みのパスワードを Have I Been Pwned で弾く。
 *
 * **better-auth の `haveIBeenPwned()` プラグインを使わず自前で持つ。**
 * あちらは `getCurrentAuthEndpointContext()` でパスを見て検査の要否を決めるが、
 * `transaction: true` にすると endpoint context を辿れず 500 になる (実測)。
 * こちらは**無条件に検査する**ので context が要らない。
 *
 * 無条件でよいのは、これを呼ぶ `password.hash` が
 * サインアップ / パスワードリセット / パスワード変更 でしか動かないため。
 * **どれも「新しいパスワードを決める場面」**であり、検査したくない経路が無い。
 *
 * **パスワードそのものは送らない。** SHA-1 の先頭 5 文字だけを送り、
 * 返ってきた候補群と手元で突き合わせる (k-anonymity)。
 * `Add-Padding` は応答の大きさから候補数を推測されないようにするための指定。
 */
export const assertPasswordNotCompromised = async (
  password: string,
): Promise<void> => {
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  let body: string;
  try {
    const response = await fetch(`${HIBP_RANGE_URL}/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
    body = await response.text();
  } catch {
    // **通信できないときは通さない (fail closed)。** 検査を素通りさせると、
    // 障害中に登録された漏洩済みパスワードが後から気付かれずに残り続ける。
    // 可用性より、弱いパスワードが恒久的に居座るほうを重く見た。
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message:
        "パスワードの安全性を確認できませんでした。時間をおいて再試行してください。",
    });
  }

  const compromised = body
    .split("\n")
    .some((line) => line.split(":")[0]?.trim().toUpperCase() === suffix);

  if (compromised) {
    throw new APIError("BAD_REQUEST", {
      code: "PASSWORD_COMPROMISED",
      message:
        "このパスワードは漏洩が確認されています。別のパスワードを設定してください。",
    });
  }
};
