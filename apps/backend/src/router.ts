import { userHandlers } from "~/contexts/user/presentation/user-handlers.ts";
import { os } from "~/shared/presentation/os.ts";

import type { AppDeps } from "./app-deps.ts";

/**
 * 契約の実装を合成する。
 *
 * 各コンテキストの実装は所有者が持つ (`contexts/<ctx>/presentation/<ctx>-handlers.ts`)。
 * コンテキストが増えてもここは 1 行増えるだけで済む。
 */
export const router = (deps: AppDeps) =>
  os.router({
    user: userHandlers(deps),
  });
