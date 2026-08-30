/**
 * 呼び出し側が差し込める callback だけを抜き出す。
 *
 * **`mutationFn` と `mutationKey` は渡させない。** どう送るかは api 層の決めごとで、
 * 呼び出し側が決めるのは「成功したら何をするか」だけである。`retry` や
 * `throwOnError` を画面から差し込めると、送り方の一貫性が崩れる。
 *
 * オプションの型そのものを受け取る。契約から導かれるもの (oRPC) と手で書くもの
 * (better-auth) の両方を、同じ書き方で絞れるようにするため。
 */
export type MutationCallbacks<TOptions> = Pick<
  TOptions,
  Extract<keyof TOptions, "onSuccess" | "onError" | "onSettled">
>;
