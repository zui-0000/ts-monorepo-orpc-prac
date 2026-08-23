import type { GetUserQueryService } from "./application/get-user-query.ts";

/**
 * user コンテキストを動かすのに必要なもの (要求側の宣言)。
 *
 * **ポートしか import しない。** 実装 (infrastructure) を知るのは合成ルート
 * (`user-adapters.ts` と `app-deps.ts`) だけ。ここで組み立てまでやると、
 * presentation が**型のためだけに**このファイルを読んだ瞬間、
 * そこから全アダプタへ経路が通ってしまう。
 *
 * このコンテキストが何を要求するかが名前で読め、足りなければ利用側で
 * コンパイルエラーになる。
 */
export type UserDeps = {
  readonly getUserQueryService: GetUserQueryService;
};
