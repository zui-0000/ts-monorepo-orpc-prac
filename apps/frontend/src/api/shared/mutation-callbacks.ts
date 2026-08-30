import type { UseMutationOptions } from "@tanstack/react-query";

/**
 * 呼び出し側が差し込める callback だけを抜き出した型。
 *
 * **`mutationFn` と `mutationKey` は渡させない。** どう送るかは api 層の決めごとで、
 * 呼び出し側が決めるのは「成功したら何をするか」だけである。
 */
export type MutationCallbacks<TData, TError, TVariables> = Pick<
  UseMutationOptions<TData, TError, TVariables>,
  "onSuccess" | "onError" | "onSettled"
>;
