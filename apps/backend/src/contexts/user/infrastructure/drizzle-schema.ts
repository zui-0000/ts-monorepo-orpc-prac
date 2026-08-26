import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const tUser = pgTable(
  "t_user",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    // 利用者が入力した表記のまま保存する (大小を潰さない)。一意性は下の関数インデックスが担う。
    // 文字数上限は RFC 5321 の実質上限 254 に収まる 255。
    email: varchar("email", { length: 255 }).notNull(),
    hashedPassword: text("hashed_password").notNull(),
    // DB 側で上書きするとドメインが決めた値が失われるため、$onUpdate は付けない。
    // DEFAULT は直接 INSERT する場合の保険として残す。
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // メールアドレスの一意性は「大小を無視して」判定する。
    //
    // 列そのものに UNIQUE を張ると Postgres はバイト比較になり、
    // Taro.Yamada@example.co.jp と taro.yamada@example.co.jp が別人として通る。
    // 実運用では同一人物なので、同じ人が 2 アカウント持ててしまう。
    //
    // かといってアプリ側で小文字へ潰すと、利用者が名乗った表記が復元できなくなる。
    // RFC 5321 §2.4 は「ローカル部の大小を保存せよ」と言っており、将来メールを送る際に
    // 宛先の表記を相手のサーバ設定に賭けることになる (経緯は契約の Email)。
    //
    // 保存は入力どおり、一意判定だけ lower() で — が両立させる唯一の形。
    // 検索側 (findByEmail) も lower() で引くこと。揃っていないとこの索引が効かない。
    uniqueIndex("t_user_email_lower_uidx").on(sql`lower(${table.email})`),
  ],
);
