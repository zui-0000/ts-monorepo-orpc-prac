import type { ContractRouterClient } from "@orpc/contract";

import { userContract } from "./contexts/user/index.js";

/**
 * API の契約定義。
 * backend はこれを implement() で実装し、frontend はこれを型として参照する。
 */
export const contract = {
  user: userContract,
} as const;

export type Contract = typeof contract;

/**
 * 契約から導かれるクライアントの型。
 *
 * 呼ぶ側 (frontend) が oRPC の内部型を知らずに済むよう、契約側が用意する。
 * 実体の生成は createORPCClient が行う。
 */
export type ApiClient = ContractRouterClient<typeof contract>;

export * from "./contexts/user/index.js";
export * from "./shared/constants/index.js";
export * from "./shared/errors/index.js";
export * from "./shared/model/index.js";
