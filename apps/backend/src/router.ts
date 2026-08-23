import { userRouter } from "~/contexts/user/presentation/user-router.ts";
import { os } from "~/shared/presentation/os.ts";

import type { AppDeps } from "./app-deps.ts";

/**
 * 契約の実装を合成する。知っているのは**どのコンテキストを繋ぐか**だけ。
 *
 * 各コンテキストの実装は所有者が持つ (`contexts/<ctx>/presentation/<ctx>-router.ts`)。
 * コンテキストが増えてもここは 1 行増えるだけで済む。
 */
export const router = (deps: AppDeps) =>
  os.router({
    user: userRouter(deps),
  });
