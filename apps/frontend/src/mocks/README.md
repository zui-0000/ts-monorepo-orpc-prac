# モック (MSW)

この画面は **backend に繋がず MSW だけで完結する**。ここはその受け口である。

## フォルダ構成

```txt
mocks/
├── browser.ts        画面用の起動 (setupWorker)。?scenario= を読む
├── server.ts         単体テスト用 (setupServer)
├── handlers.ts       正常系のハンドラを束ねる
├── scenarios.ts      失敗の上書きを束ねる
├── auth/             認証基盤 (/api/auth/*)
│   ├── data.ts       保管。backend の auth.t_user にあたる
│   ├── controller.ts 判断と応答の組み立て
│   ├── handler.ts    経路の宣言だけ
│   └── scenarios.ts  失敗の上書き
├── user/             利用者 (/api/users/*)
│   ├── data.ts       保管。backend の t_user_profile にあたる
│   ├── controller.ts 判断と応答の組み立て
│   ├── handler.ts    経路の宣言だけ
│   └── scenarios.ts  失敗の上書き
└── utils/
    └── orpc-error-response.ts   oRPC の封筒で失敗を返す
```

### 3 層に分けている理由

|                 | 役割                                                  |
| --------------- | ----------------------------------------------------- |
| `data.ts`       | 保管だけ。`localStorage` に置き、再読み込みで消えない |
| `controller.ts` | 判断と応答の組み立て。ここに仕様の再現が集まる        |
| `handler.ts`    | 経路の宣言だけ。**5 行読めば全経路が分かる**          |

**保管を実物のテーブル構成に寄せている。** backend では認証基盤が `auth.t_user` を、
ドメインが `t_user_profile` を持つ (設計関連/ADR-09)。モックも同じ形にし、
`localStorage` の鍵も `orpc-prac.mock.auth` と `orpc-prac.mock.user` に分けてある。

`user/controller.ts` が `auth/data.ts` の利用者を読むのは、backend の
`get-user-query-service.ts` と同じ **CQRS の射影**である。読むだけで書かない。

## カスタムシナリオ

失敗した画面を見たいとき、**URL に `?scenario=<名前>` を付ける。**

```txt
http://localhost:5173/?scenario=profile-forbidden
http://localhost:5173/sign-in?scenario=sign-in-unverified
http://localhost:5173/?scenario=session-network-error
```

**コードは書き換えない。** `handlers.ts` は常に正常系のままで、選ばれた上書きが
その前に差し込まれる。外して再読み込みすれば元に戻る。

### 使える名前

| 名前                     | 起きること                                     |
| ------------------------ | ---------------------------------------------- |
| `sign-up-weak-password`  | サインアップが 400 (`PASSWORD_TOO_SHORT`)      |
| `sign-up-duplicate`      | サインアップが 422 (`USER_ALREADY_EXISTS`)     |
| `sign-in-invalid`        | サインインが 401 (`INVALID_EMAIL_OR_PASSWORD`) |
| `sign-in-unverified`     | サインインが 403 (`EMAIL_NOT_VERIFIED`)        |
| `profile-unauthorized`   | 利用者の取得が 401                             |
| `profile-forbidden`      | 利用者の取得が 403                             |
| `profile-update-invalid` | プロフィールの更新が 400 (カナ 2 項目が不正)   |
| `session-network-error`  | セッション取得の**応答が返らない**             |
| `sign-in-network-error`  | サインインの**応答が返らない**                 |

最後の 2 つは `HttpResponse.error()` で `TypeError: Failed to fetch` を起こす。
**`{ data, error }` ではなく例外が飛ぶ**ため、`api/auth/auth-repository.ts` の
`tryPromise` が捕まえる経路を通る (設計関連/ADR-12)。手では起こしにくい失敗を
URL 一つで再現できる。

名前を間違えたときは既定の正常系で動きつつ、使える名前をコンソールへ出す。

```txt
[mock] 知らないシナリオ "sign-in-unverifed"。既定の正常系で動きます。
使えるのは: sign-up-weak-password / sign-up-duplicate / ...
```

### この形は MSW 公式が薦めているもの

[Dynamic mock scenarios](https://mswjs.io/docs/best-practices/dynamic-mock-scenarios/)
と [Structuring handlers](https://mswjs.io/docs/best-practices/structuring-handlers/)
に沿っている。公式は「**単一の handlers で正常系を記述し**、実行時の上書きを足す」
としており、上書きの選び方としてクエリパラメータを読む形を挙げている。

**MSW は左のハンドラを優先する。** `browser.ts` が上書きを前に置くのはこのため。

```ts
const worker = setupWorker(...selectedScenario(), ...handlers);
```

### 名前を足すには

コンテキストの `scenarios.ts` に 1 つ書き足すだけでよい。応答は
`authFailure` / `userFailure` が持っているため、多くは 1 行で済む。

```ts
"sign-out-network-error": [
  http.post("/api/auth/sign-out", () => HttpResponse.error()),
],
```

**名前は 1 つの平坦な空間にある** (`?scenario=` は 1 つしか取れない)。
コンテキストを跨いで重複すると `scenarios.ts` で型エラーになる。

## 単体テストから使う

`server.ts` を使う。**`location` を持つ環境で動かすこと** — 認証のハンドラが
検証リンクの組み立てに `location.origin` を使うため、素の Node では落ちる
(jsdom / happy-dom なら動く)。
