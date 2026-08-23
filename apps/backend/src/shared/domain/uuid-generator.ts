/**
 * UUID (v7) を生成するポート。テストでは固定値を返す実装を渡す。
 *
 * 返すのが素の `string` なのは、shared が contexts を知らないため。
 * brand を付けるのは受け取った側 (集約の生成ファクトリ) の仕事。
 */
export type UuidGenerator = {
  readonly generate: () => string;
};
