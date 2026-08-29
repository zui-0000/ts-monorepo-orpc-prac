/**
 * better-auth が所有するテーブル群 (設計関連/ADR-07, ADR-09)。
 *
 * **auth スキーマに置くことで所有者を構造で表す。** ドメインの属性は
 * `public.t_user_profile` 側に置き、こちらは better-auth が要求する列で固定する。
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

export * from "./t-account.ts";
export * from "./t-session.ts";
export * from "./t-user.ts";
export * from "./t-verification.ts";
