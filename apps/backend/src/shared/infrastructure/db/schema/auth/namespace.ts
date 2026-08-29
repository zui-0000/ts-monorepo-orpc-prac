import { pgSchema } from "drizzle-orm/pg-core";

/**
 * better-auth が所有するテーブル群の名前空間 (設計関連/ADR-07, ADR-09)。
 *
 * **auth スキーマに置くことで所有者を構造で表す。** ドメインの属性は
 * `public.t_user_profile` 側に置き、こちらは better-auth が要求する列で固定する。
 * **この名前空間のテーブルは自前のコマンドが書かない。** 読み取りは射影として
 * 認めているが、書き込みは better-auth の API を通す。
 *
 * ---
 *
 * 以下はこの名前空間の 4 テーブルに共通する規約。
 *
 * TS のプロパティ名は better-auth の既定 (camelCase) に揃える。アダプタが
 * `schema[model][field]` で引くため、**ここがズレると実行時に落ちる。**
 * SQL 側の名前は自由なので、テーブルは `t_` 接頭辞、列は snake_case、
 * 真偽値は `is_` 接頭辞にできる (命名関連/ADR-04)。
 *
 * 索引と制約の命名は Postgres の自動生成に揃える (命名関連/ADR-03)。
 * 一意性は索引ではなく UNIQUE 制約で宣言する (`_key`)。
 *
 * `created_at` / `updated_at` は better-auth が値を書くため `$onUpdate` は付けない。
 * DEFAULT は直接 INSERT する場合の保険として残す。
 */
export const authSchema = pgSchema("auth");
