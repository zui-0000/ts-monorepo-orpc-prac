import { userContract } from './contexts/user/index.js'

/**
 * API の契約定義。
 * backend はこれを implement() で実装し、frontend はこれを型として参照する。
 */
export const contract = {
  user: userContract,
} as const

export type Contract = typeof contract

export * from './contexts/user/index.js'
export * from './shared/constants/index.js'
export * from './shared/errors/index.js'
export * from './shared/model/index.js'
