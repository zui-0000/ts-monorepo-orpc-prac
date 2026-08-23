import type { PasswordHasher } from "~/shared/domain/password-hasher.ts";

/**
 * 本番実装: Bun ネイティブの argon2id (`Bun.password` の既定)。
 *
 * 出力は PHC 文字列 (`$argon2id$v=19$m=...`) で、ソルトとパラメータを同梱する。
 * `verify` がアルゴリズムやコストの指定を要らないのはそのため — 保存済みの
 * 文字列から読み出す。パラメータを上げても**過去のハッシュがそのまま検証できる**。
 */
export const passwordHasher: PasswordHasher = {
  hash: (plainText) => Bun.password.hash(plainText),
  verify: (plainText, hashed) => Bun.password.verify(plainText, hashed),
};
