# React Compiler の仕組み

frontend で React Compiler を有効にしている。**何をしてくれるのか、何をしてくれ
ないのか**をここにまとめる。

## 何を解決するのか

React は状態が変わると、そのコンポーネントを**丸ごと再実行する**。再実行のたびに
オブジェクトも関数も作り直されるため、参照が変わる。

```tsx
// 毎レンダーで新しい object と新しい関数ができる
const signIn = useSignInMutation({ onSuccess: async () => { ... } });
```

参照が変わると、それを見ている側 (依存配列、`memo`、`useEffect`) が「変わった」と
判断して余計な仕事をする。**それを避けるために `useMemo` / `useCallback` を手で書く**
のがこれまでのやり方だった。

React Compiler は**ビルド時にコードを読んで、その記述を自動で入れる。** 手で書く
必要が無くなる。

## 入れ方

```ts
// apps/frontend/vite.config.ts
react({ compiler: { logDiagnostics: true } });
```

**Babel は使わない。** `@vitejs/plugin-react` の v6 は
[oxc](https://oxc.rs) 経由で動き、実体は `oxc-transform-react` である。

### 版を固定している理由

`oxc-transform-react` は最新が `0.147.0` だが `^0.145.0` で止めてある。
`@vitejs/plugin-react@6.1.1` の peer がそれを要求しており、**0.x では `^` が
マイナー固定**のため `0.147` は満たせない。plugin 側が上げたら追う。

## 何が起きているか

変換後のコードは `_c(n)` でメモの置き場を確保し、依存が変わったときだけ作り直す。

```js
// SignInPage.tsx の変換結果
const $ = _c(33);
let t1;
if ($[1] !== queryClient || $[2] !== router) {
  t1 = { onSuccess: async () => { /* queryClient と router を使う */ } };
  $[1] = queryClient;
  $[2] = router;
  $[3] = t1;
} else {
  t1 = $[3];
}
const signIn = useSignInMutation(t1);
```

**掴んでいるものだけが依存に入る。** この `onSuccess` は `queryClient` と `router`
しか使っていないため、その 2 つが変わらない限り同じオブジェクトが返る。

現状、frontend の 12 個 (コンポーネント 8・フック 4) がすべて最適化されている。

```txt
ProfilePage _c(54)  SignUpPage _c(38)  SignInPage _c(33)  App _c(11)
ErrorFallback _c(10)  RootLayout _c(6)  NotFoundPage _c(1)  PageLoadingSpinner _c(1)
use-sign-in/up/out-mutation _c(3)  use-update-profile-mutation _c(2)
```

**`.ts` のファイルも対象になる。** `use-` で始まる関数はフックとして扱われるため、
`use-sign-in-mutation.ts` も変換される。

## TanStack Query との関係

**得しかしない。** TanStack Query の `useMutation` は中でこう書いている。

```js
React.useEffect(() => { observer.setOptions(options); }, [observer, options]);
```

`options` は毎レンダー新しいオブジェクトだったため、**`setOptions` が毎回走って
いた。** コンパイラが参照を安定させたことで、依存が実際に変わったときだけになる。

取得側も同じである。

```js
// ProfilePage.tsx の変換結果
if ($[0] !== userId) { t0 = getUserQueryOption(userId); }
const { data: user } = useSuspenseQuery(t0);
```

`mutationFn` に至っては何も掴んでいないため、**モジュールスコープへ巻き上げられて
いる**(変換後に `_temp` という名前で現れる)。

## 何をしてくれないか

**規則違反を教えてくれない。** React Compiler は
[Rules of React](https://react.dev/reference/rules) に従っている前提で動き、
違反を見つけると**黙ってそのコンポーネントの最適化を諦める。**

条件付きでフックを呼ぶファイルを置いて実測した。

```txt
oxlint          何も言わない (rules-of-hooks の規則が無い)
React Compiler  診断も出ない (logDiagnostics: true でも無言)
```

つまり**壊れはしないが、最適化されていないことに気づけない。** いまは 12/12 通って
いるが、将来違反を書いても分からない。`eslint-plugin-react-hooks@7` がコンパイラ用の
規則を持っているものの、採用すると ESLint を持ち込むことになる (docs/TODO.md)。

## 代償

バンドルが **8 KB 増える** (828 KB → 836 KB)。メモの置き場と比較の記述が
各コンポーネントに入るためである。

## 手で書いた memo はどうするか

**書かなくてよい。** このリポジトリには `useMemo` / `useCallback` が 1 つも無く、
今後も足す必要は無い。コンパイラが同じことをするため、手で書くと二重になる。

`useState` の遅延初期化 (`useState(() => new QueryClient())`) は別物なので残す。
あれは「マウントごとに 1 つ」を保証するもので、メモ化ではない。
