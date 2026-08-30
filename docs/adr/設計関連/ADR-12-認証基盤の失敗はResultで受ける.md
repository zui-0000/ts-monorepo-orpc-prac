---
status: accepted
date: 2026-08-30
scope: frontend
decision-makers: zui
consulted: Claude
informed:
---

# 認証基盤の失敗は Result で受ける

## 背景と課題 (Context and Problem Statement)

better-auth のクライアントは `{ data, error }` を返す。素直に書くとこうなる。

```ts
const { data, error } = await authClient.getSession();
return error ? Result.err(toAuthError(error)) : Result.ok(data);
```

**この形は失敗を 1 種類しか見ていない。** 応答が返らなかったとき、better-fetch は
`{ data, error }` を返さず**例外を投げる**。

```zsh
$ bun -e '...createAuthClient({ baseURL: "http://127.0.0.1:59999" }).getSession()'
✘ throw した: TypeError Unable to connect. Is the computer able to access the url?
```

例外は `Result` を返す前に抜ける。その先で起きることが問題だった。

```zsh
$ bun -e 'authErrorMessage(new TypeError("Unable to connect"))'
✘ error.match is not a function
```

`authErrorMessage` はタグ付きエラーの `match` を呼ぶ。飛んでくるのが `TypeError`
なので `match` が無く、**エラーを表示するコードが自分で落ちる。** 型は
`AuthError` と宣言しているが、実行時には別のものが入る。

## 決定要因 (Decision Drivers)

- **通信断は日常的に起きる。** 開発中に backend を落とすだけで再現する
- **型が嘘をつかないこと。** `signIn.error` の型が `AuthError` なら、実際にそれが入る
- **エラーの `code` を失わないこと。** 文言の翻訳はコードで引いており
  (`EMAIL_NOT_VERIFIED` など)、失うと英語の文言照合に落ちる
- **ライブラリの内部実装に賭けないこと**

## 検討した選択肢 (Considered Options)

1. `Result.tryPromise` で包み、応答の有無と本文の失敗を別々に捌く (採用)
2. `fetchOptions.throw` で入口を例外に一本化する
3. `fetchOptions.catchAllError` で入口を `{ data, error }` に一本化する

## 決定 (Decision Outcome)

**選択肢 1 を採用する。** リポジトリの全メソッドが `request` を通る。

```ts
const request = async <T>(
  call: () => Promise<AuthResponse<T>>,
): Promise<Result<T, AuthError>> =>
  (await Result.tryPromise(call))
    .mapError((cause) => new UnexpectedAuthError({ message: `応答なし: ${cause.message}` }))
    .andThen(({ data, error }) =>
      error ? Result.err(toAuthError(error)) : Result.ok(data),
    );
```

`tryPromise` が「応答が返らなかった」を捕まえ、`andThen` が「応答は返ったが失敗」を
捌く。**ここを通れば throw はしない。**

### なぜ関数に切り出すか

行数を減らすためではない。**`tryPromise` を 1 箇所でも書き忘れると、型もテストも
何も言わないまま同じバグが戻る。** 通信が繋がっている限り気づけない。
`request(() => ...)` と書くしかない形にして、**安全な道を唯一の道にする。**

### 結果 (Consequences)

- **良い方向**: 通信断が `UnexpectedAuthError` になり、画面は
  「通信に失敗しました。時間をおいて試してください」を出す。落ちない
- **良い方向**: `authClient` を直に触るのが `auth-repository.ts` だけになった
- **悪い方向**: `AuthResponse<T>` は手書きの型で、**検証されていない。**
  better-auth のメソッドは戻り値が `any` に落ちるため
  (`Awaited<ReturnType<typeof authClient.getSession>>` が `any`)、
  応答の形が変わっても TypeScript は黙っている
- **制約**: リポジトリ以外から `authClient` を呼んではいけない。呼べば同じ穴が空く

### 確認方法 (Confirmation)

実測で 3 通りを確かめた。

```txt
通信断 (誰も居ないポート)  → throw しない / UnexpectedAuthError
                              → 「通信に失敗しました。時間をおいて試してください」
403 EMAIL_NOT_VERIFIED     → EmailNotVerifiedError
                              → 「メールアドレスの検証が済んでいません…」
成功                        → 中身が返る
```

## 各選択肢の評価 (Pros and Cons of the Options)

### `Result.tryPromise` で包む (採用)

- 良い: クライアントの設定に依存しない。ライブラリの内部実装に賭けない
- 良い: 応答本文の `code` がそのまま残る
- 悪い: 失敗の入口が 2 つあることを、読む側が知る必要がある

### `fetchOptions.throw` で例外に一本化

**却下。応答本文の `code` が落ちる。** 実測で確認した。

```txt
throw: true    → BetterFetchError。error = { message: "Email not verified" }
catchAllError  → { code: "EMAIL_NOT_VERIFIED", message, status, statusText }
```

`toAuthError` は `code` で引いている。`message` しか残らないと、英語の文言を
文字列比較することになり、ライブラリの文言変更で静かに壊れる。

### `fetchOptions.catchAllError` で `{ data, error }` に一本化

実行時には正しく動き、通信断も `{ status: 500, statusText: "Fetch Error" }` として
返る。**却下したのは型の理由。**

`catchAllError` は `createFetch` の設定項目 (`CreateFetchOption`) であり、
クライアントの `fetchOptions` の型 (`ClientFetchOption`) には無い。動くのは
better-auth が `fetchOptions` を `createFetch` へ spread しているためで
(`dist/client/config.mjs` の `restOfFetchOptions`)、**通すにはキャストが要る。**

キャストが通ったまま better-auth 側の受け渡しが変われば、**通信断で再び例外が
抜ける状態へ静かに戻る。** 今回直したのがまさにその状態だった。

## 補足情報 (More Information)

### なぜ気づけなかったか

型が `AuthError` だと宣言していたため、**画面側は正しく書けているように見えた。**

```tsx
{signIn.isError && <p role="alert">{authErrorMessage(signIn.error)}</p>}
```

このコードに誤りは無い。誤っていたのは「`signIn.error` には必ず `AuthError` が
入る」という前提のほうだった。**型の宣言は実行時の保証ではない。**

### この判断が変わりうる場面

better-auth が `fetchOptions` の型に `catchAllError` を含めたら、選択肢 3 が
キャスト無しで成立する。そのときは `request` から `tryPromise` を外し、
`andThen` の 1 本にできる。
