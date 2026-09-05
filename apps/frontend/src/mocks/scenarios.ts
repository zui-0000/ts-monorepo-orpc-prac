import { authScenarios } from "./handlers/auth/scenarios";
import { userScenarios } from "./handlers/user/scenarios";

const merged = { ...authScenarios, ...userScenarios };

/**
 * 名前が重なっていたら `never` になり、下の代入が型エラーになる。
 *
 * **名前は 1 つの平坦な空間にある** (`?scenario=` は 1 つしか取れない) が、
 * 定義はコンテキストごとに分かれているため、目視では気づけない。
 */
type UniqueNames =
  Extract<keyof typeof authScenarios, keyof typeof userScenarios> extends never
    ? typeof merged
    : never;

/**
 * 失敗の状態を画面で見るための上書き。**`?scenario=<名前>` で選ぶ。**
 *
 * ```txt
 * http://localhost:5173/sign-in?scenario=sign-in-unverified
 * ```
 *
 * 既定 (`handlers/index.ts`) は正常系だけを持ち、ここが前に差し込まれて優先される
 * (MSW の Best Practices「Dynamic mock scenarios」)。
 */
export const scenarios: UniqueNames = merged;
