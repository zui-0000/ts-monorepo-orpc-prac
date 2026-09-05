# モック (MSW)

この画面は **backend に繋がず MSW だけで完結する**。ここはその受け口である。

## フォルダ構成

```txt
mocks/
├── browser.ts        画面用の起動 (setupWorker)。?scenario= を読む
├── server.ts         単体テスト用 (setupServer)
├── scenarios.ts      失敗の上書きを束ねる
├── handlers/
│   ├── index.ts      正常系のハンドラを束ねる
│   ├── auth/         認証基盤 (/api/auth/*)
│   └── user/         利用者 (/api/users/*)
└── utils/            oRPC の封筒など、経路をまたぐもの
```

コンテキストの中は 4 つに分かれている。

|                 | 役割                                                  |
| --------------- | ----------------------------------------------------- |
| `data.ts`       | 保管だけ。`localStorage` に置き、再読み込みで消えない |
| `controller.ts` | 判断と応答の組み立て。仕様の再現はここに集まる        |
| `handler.ts`    | 経路の宣言だけ。**数行読めば全経路が分かる**          |
| `scenarios.ts`  | 失敗の上書き (後述)                                   |

**保管は実物のテーブル構成に寄せてある。** backend では認証基盤が `auth.t_user` を、
ドメインが `t_user_profile` を持つ (設計関連/ADR-09)。`localStorage` の鍵も分けている。
`handlers/user/controller.ts` が `handlers/auth/data.ts` を読むのは、backend の
`get-user-query-service.ts` と同じ **CQRS の射影**である。読むだけで書かない。

## 失敗した画面を見る

**URL に `?scenario=<名前>` を付ける。** 例えばメール未検証のままサインインを試した
状態はこう。

```txt
http://localhost:5173/sign-in?scenario=sign-in-unverified
```

**コードは書き換えない。** `handlers/index.ts` は常に正常系のままで、選ばれた上書きが
その前に差し込まれる。外して再読み込みすれば元に戻る。

```ts
// browser.ts —— MSW は左のハンドラを優先する
const worker = setupWorker(...selectedScenario(), ...handlers);
```

使える名前は `handlers/auth/scenarios.ts` と `handlers/user/scenarios.ts` にある。
**間違えたときは既定の正常系で動きつつ、一覧をコンソールへ出す**ので、そこで
確かめてもよい。

```txt
[mock] 知らないシナリオ "sign-in-unverifed"。既定の正常系で動きます。
使えるのは: sign-up-weak-password / sign-up-duplicate / ...
```

### 足すには

コンテキストの `scenarios.ts` に 1 つ書き足す。応答は `authFailure` /
`userFailure` が持っているため、多くは 1 行で済む。

```ts
"sign-out-network-error": [
  http.post("/api/auth/sign-out", () => HttpResponse.error()),
],
```

`HttpResponse.error()` は `TypeError: Failed to fetch` を起こす。**応答が返らない
状態は手では作りにくい**が、これなら URL 一つで再現できる。

**名前は 1 つの平坦な空間にある** (`?scenario=` は 1 つしか取れない)。
コンテキストを跨いで重複すると `scenarios.ts` で型エラーになる。

### この形は MSW 公式が薦めているもの

[Dynamic mock scenarios](https://mswjs.io/docs/best-practices/dynamic-mock-scenarios/)
と [Structuring handlers](https://mswjs.io/docs/best-practices/structuring-handlers/)
に沿っている。公式は「**単一の handlers で正常系を記述し**、実行時の上書きを足す」
としており、上書きの選び方としてクエリパラメータを読む形を挙げている。

## 単体テストから使う

`server.ts` を使う。**`location` を持つ環境で動かすこと** — 認証のハンドラが
検証リンクの組み立てに `location.origin` を使うため、素の Node では落ちる
(jsdom / happy-dom なら動く)。
