# TODO

**決めていないこと**と**やり残していること**の一覧。決まったものは ADR
(`docs/adr/`) か解説 (`docs/NN-*.md`) へ移し、ここからは消す。

## 検討中

### auth と db をパッケージに切り出す

**状態**: 検討中 (2026-08-30 起票)

#### 動機

**仕様の出どころが 2 箇所になるのが気持ち悪い。**

`packages/contract` が oRPC の契約から OpenAPI 仕様を出している。一方 better-auth の
30 経路は契約の外にあり、仕様書には載らない (載っているのは自前の 2 経路だけ)。
合成しようとすると、**実インスタンスを持つ `apps/backend` が仕様を出す**ことになり、
「仕様は契約が出す」という形が崩れる。

**認証が backend にしか無いのも非対称**に感じる。契約は共有物なのに、認証だけ実装側に
埋まっている。

#### 分かったこと

**better-auth は契約と実装が分離していないライブラリである。**

```txt
oRPC        契約 (宣言) と実装が別物     → contract / backend に割れる
better-auth 設定がそのまま実装であり仕様 → 割れない
```

`socialProviders` に google を足せば、実装も仕様も同時に変わる。**宣言だけを取り出せ
ない構造**なので、contract / backend の二分に収まらない。これはライブラリの性質で
あって設計の失敗ではない。

そのため**認証を丸ごと 1 つの箱に入れる**ほうが素直、というのが検討の出発点。

#### 想定する形

```txt
packages/
  contract/   oRPC の契約 (現状のまま)
  db/         drizzle スキーマ + クライアント + migration
  auth/       better-auth の設定
apps/
  backend/    契約の実装 (db と auth を使う)
  frontend/   contract + auth/client
```

`packages/auth` は `exports` マップで入口を分ける。frontend は `./client` だけを
import すればサーバ側のコードを引き込まない (`packages/contract` が `.` と
`./openapi` を分けているのと同じ手)。

```jsonc
"exports": {
  ".":        "./dist/index.js",   // サーバ: betterAuth の設定
  "./client": "./dist/client.js"   // frontend: createAuthClient
}
```

#### 先に潰しておく点

1. **DB のエラー変換は backend に残る。** `handleDbError` は `RepositoryError`
   (backend のドメインエラー) を返すため、`packages/db` へ持っていくと db が
   backend のドメインを知ることになる。`packages/db` はスキーマ・クライアント・
   migration までとする
2. **`EnvName` が backend の `shared` にある。** `packages/auth` は自分の環境変数名を
   自分で持つ必要がある
3. **`sendVerificationEmail` はアプリの判断。** 「どう届けるか」はアプリごとに違うので
   パッケージに焼き付けず注入する (`createAuth({ db, sendVerificationEmail })`)
4. **`contexts/auth` が消える。** 中身がパッケージへ移るため
   **設計関連/ADR-11 が実質無効**になる。**ADR-10** (スキーマの置き場所) も覆る。
   2 本を supersede することになる

#### 移動する荷物

```txt
packages/db    schema/ ・ database-client.ts ・ db/migrations/ ・ drizzle.config.ts
               ・ docker-compose.yaml (Postgres) ・ package.json ・ tsconfig
packages/auth  auth.ts ・ auth-env.ts ・ assert-password-not-compromised.ts
               ＋ 自前の env 名 ・ createAuth の引数設計
backend        import の張り替え ・ db:generate / db:migrate スクリプトの移動
docs           ADR-10 / ADR-11 の見直し
```

#### 選択肢

| 案                        | 内容                                                           |
| ------------------------- | -------------------------------------------------------------- |
| **A. 先にフロントを作る** | 認証クライアントに必要な形が分かってから切り出す。空振りしない |
| **B. 今やる**             | 気持ち悪さが先に消える。frontend を書くとき既に置き場がある    |

**frontend がまだ無い**ため、`packages/auth/client` が本当に必要な形は実際に画面を
書かないと分からない。一方で、学習用のリポジトリでは**構造を探ること自体が目的**でも
ある。

#### 却下した案

- **認証の経路を oRPC の契約に定義する。** OAuth のコールバックが 302 リダイレクトで
  あり、**oRPC の「型付きの値を返す」形に乗らない**。どうやっても契約の外に残るものが
  出るため、「契約が API の全体を表す」という動機を満たせない。加えて better-auth の
  入出力スキーマを手で写す二重管理と、Cookie を応答へ載せる配管の自作が要る
- **`packages/contract` で better-auth の仕様を生成する。** 仕様の生成には
  設定済みの `AuthContext` が要り、契約側でダミーを組むと**実物とズレた仕様**が出る

## 未着手

- **Google OAuth** — `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` が未取得。
  Google Cloud Console での作業が要る。10 経路がこれ待ち
  (`/sign-in/social` `/callback/:id` `/link-social` ほか)
- **エラー文言の置き場所** — いま 2 箇所に分かれている。`authErrorMessage` は
  `api/auth/auth-error.ts` (タグ付きエラーの `match` の隣。1 つ足すとコンパイル
  エラーになる利点がある)、`FIELD_MESSAGES` は `ProfilePage.tsx` の中 (他から
  使えない)。**方針が決まっていないので構造だけ先に決めない。** 文言の網羅や
  トーンを実装するときに、api 側へ寄せるか画面側へ寄せるかを判断する。
  なお **user コンテキストにエラーの定義は要らない**。oRPC が契約から型を生やし、
  `isDefinedError` で絞れるため
- **見た目** — CSS を 1 行も書いていない。素の HTML のまま。
  `PageLoadingSpinner` は回らないので、スタイルを入れるか改名するかを決める
- **`sendResetPassword` / `sendChangeEmailVerification`** — 未設定のため
  パスワードリセットとメール変更が完結しない。`send-verification-email.ts` と同じ形で
  埋められる (docs/02)
- **ビルドが警告を 2 つ出す** — `routes/create-router.ts` と `routes/types/router.ts`
  が「Route を export していない」と TanStack Router に指摘される。**動作には
  影響しない**（ルートツリーに入らない、という通知）が、毎ビルド出る。
  `routeFileIgnorePattern` で黙らせるか、`routes/` の外へ出すか
- **React Compiler の規則違反を誰も検査しない** — oxlint に rules-of-hooks が無く、
  コンパイラは違反を見つけると黙って最適化を諦める（`logDiagnostics` でも出ない）。
  現状 12/12 最適化されているが、将来違反を書いても気づけない。
  `eslint-plugin-react-hooks@7` が持っているが ESLint を持ち込むことになる
  （docs/03）
- **OpenAPI 仕様が API の全体を表さない** — 上の検討と同じ話。
  外部へ公開するまで実害は無い

## 保留

- **`resolveCaller` が毎リクエストで `getSession` を呼ぶ** (DB 1 往復)。
  セッションの失効を即座に効かせるための対価であり、無駄ではない。
  必要になれば better-auth の `secondaryStorage` (Redis 等) で緩和できる
