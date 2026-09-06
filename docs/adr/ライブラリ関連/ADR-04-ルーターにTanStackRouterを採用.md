---
status: accepted
date: 2026-09-06
scope: frontend
decision-makers: zui
consulted: Claude
informed:
---

# ルーターに TanStack Router を採用

## 背景と課題 (Context and Problem Statement)

`apps/frontend` は Vite の SPA であり、backend に繋がず MSW だけで完結する
(`src/mocks/README.md`)。画面遷移を持つ以上ルーターが要る。

**採用時の動機は選好だった。** TanStack Query を既に使っており、同じ設計思想の
ものに揃えたかった、というのが実際のところである。その後「React Router と何が
違うのか説明できない」ことに気づいたため、選定理由を後から再構築した。
**この ADR はその再構築の記録である。**

再構築の結果、選好で選んだものが要件に合っていたと確認できたため `accepted`
とする。合っていなければ差し替えるつもりで検証した。

## 決定要因 (Decision Drivers)

- **検索パラメータを型付きの状態として扱えること。** URL に載る値も契約
  (ライブラリ関連/ADR-03) と同じ扱いにしたい
- **ルートコンテキストで `queryClient` を配れること。** 認証ガードを
  `beforeLoad` に置くため、コンテキストが型付きである必要がある
- **SPA のまま型生成が効くこと。** サーバレンダリングは要件に無い
- 学習目的のため、**仕組みを説明できること**
- 依存の版数が現行に追随していること

## 検討した選択肢 (Considered Options)

- React Router — declarative mode
- React Router — data mode
- React Router — framework mode
- TanStack Router

React Router は v8 で 3 つのモードを維持しており、**モードごとに得られるものが
大きく違う**ため、1 つの選択肢として括らず分けて評価した。

## 決定 (Decision Outcome)

**選択: TanStack Router**

決め手は 3 つ。いずれも既にコードで使っている。

**1. 検索パラメータをスキーマで検証し、型として受け取れる**

`routes/sign-in.tsx` はサインアップ直後だけ案内を出すため `registered` を持つ。

```ts
const SearchSchema = v.object({
  registered: v.optional(v.boolean(), false),
});

export const Route = createFileRoute("/sign-in")({
  validateSearch: SearchSchema,
  // ...
});
```

受け取り側は真偽値をそのまま読める。

```ts
const { registered } = route.useSearch();
```

React Router はどのモードでも検索パラメータを型付けしない。`useSearchParams` が
返すのは文字列であり、既定値も変換も自前になる。

```ts
// React Router ではこう書くことになる
const [searchParams] = useSearchParams();
const registered = searchParams.get("registered") === "true";
```

**2. ルートコンテキストが route tree を下って型として積み上がる**

`create-router.ts` で `queryClient` を注ぎ、`routes/index.tsx` の `beforeLoad`
が `userId` を足す。**足した値は子の `loader` で型付きのまま読める。**

```ts
beforeLoad: async ({ context }) => {
  const session = await context.queryClient.query({ ...getSessionQueryOption, staleTime: "static" });
  if (!session) throw redirect({ to: "/sign-in" });
  return { userId: session.user.id };
},
loader: ({ context }) =>
  context.queryClient.query({ ...getUserQueryOption(context.userId), staleTime: "static" }),
```

React Router v8 も middleware で型付きコンテキストを持つ (後述) が、**鍵ごとに
`createContext()` を作って `set` / `get` する形**であり、親が値を入れたことを
型が保証しない。TanStack は戻り値がそのまま合成されるため、`userId` を入れ忘れれば
`loader` 側が型エラーになる。

**3. SPA のまま型生成が効く**

`routeTree.gen.ts` を `@tanstack/router-plugin` が吐き、`routes/types/router.ts`
のモジュール拡張で `Link` の `to` などに効かせている。React Router の型生成は
**framework mode 専用**で、data / declarative では提供されない。

### 結果 (Consequences)

- Good, because `registered` が真偽値として読め、`?registered=true` の解釈を
  画面側に書かずに済む
- Good, because 認証ガードを `beforeLoad` に寄せられた。3 ルートすべてが同じ形で
  セッションを見てリダイレクトを投げる
- Good, because `Link` と `navigate` の `to` が既知パスに限定される。ルートを
  改名すると参照側が型エラーになる
- Good, because 検索パラメータの検証に valibot をそのまま使えた。契約
  (ライブラリ関連/ADR-03) と同じライブラリで URL と HTTP ボディの両方を賄える
- Bad, because `routeTree.gen.ts` という生成物を抱える。手で編集しない規律が要る
- Bad, because React Router に比べて情報量が少ない。詰まったときに調べにくい
- Bad, because サーバレンダリングが必要になったら TanStack Start への移行になる。
  React Router なら framework mode へ切り替えるだけで済んだ
- Neutral, because **性能は選定理由に入れていない。** 実測しておらず、この規模で
  差が出る根拠も見つからなかった

### 確認方法 (Confirmation)

**1. 型が実際に効いていること**

以下がすべて型エラーになることを確認する。**通ってしまったら
`routes/types/router.ts` のモジュール拡張が壊れている。**

| 壊し方                                                | 期待     |
| ----------------------------------------------------- | -------- |
| `<Link to="/sign-inn">` のように存在しないパス        | 型エラー |
| `navigate({ to: "/sign-in", search: {} })` で必須欠落 | 型エラー |
| `registered` を文字列と比較する                       | 型エラー |
| `beforeLoad` の戻り値から `userId` を外す             | 型エラー |

**2. 生成物が最新であること**

```zsh
$ pnpm --filter @orpc-prac/frontend check:type
```

`routeTree.gen.ts` が古いと未知ルートとして型エラーになる。dev サーバを起動すれば
プラグインが再生成する。

**3. 検索パラメータが実際に効くこと**

```txt
http://localhost:5173/sign-in?registered=true
```

案内文が出れば通っている。パラメータを外すと既定値 `false` に落ちて消える。

## 各選択肢の評価 (Pros and Cons of the Options)

前提として、**版数の制約はどの選択肢も満たす。** React Router v8 の基準は
Node 22.22 以上、React 19.2.7 以上、Vite 7 以上であり、この repo は Node 24.19.0、
React 19.2.8、Vite 8.2.2 で動いている。**「新しい方しか入らないから」で選んだ
わけではない。**

### React Router — declarative mode

`BrowserRouter` と `Link` だけの最小構成。ビルド手順は要らない。

- Good, because 導入が最も軽い。プラグインも生成物も無い
- Good, because 情報量が最も多い。React のルーティングと言えばこれ
- Bad, because ローダーが無い。データ取得を画面の中で始めることになり、
  認証ガードを置く場所が `useEffect` になる
- Bad, because 型安全がほぼ無い。`to` は素の文字列
- Bad, because 検索パラメータは文字列のまま

### React Router — data mode

`createBrowserRouter` にルート定義を渡す形。`loader` / `action` / `useFetcher`
が使える。ビルド手順は要らない。middleware も使える。

- Good, because ローダーとアクションが手に入る。データ取得を描画の外へ出せる
- Good, because middleware の `createContext()` で型付きの依存注入ができる。
  **v8 で middleware が既定になり、ここは TanStack との差が縮んだ**
- Neutral, because コンテキストが鍵ごとの `get` / `set` である。型は鍵から来る
  ため、親が入れ忘れても `get` 側は型エラーにならず実行時に既定値へ落ちる
- Bad, because **型生成が提供されない。** `loader` の戻り値もパスパラメータも
  手で型を書くか `as` で通すことになる
- Bad, because 検索パラメータは文字列のまま
- Bad, because ルート定義がオブジェクトの入れ子になり、ファイル分割との対応が薄い

### React Router — framework mode

Vite プラグインを足し、`routes.ts` でルートを宣言する形。**React Router の型安全は
ここでしか手に入らない。**

- Good, because `href` と Route Module API が型付きになる。`+types/` に型が生成される
- Good, because サーバレンダリング、静的生成、SPA を同じ書き方で切り替えられる
- Good, because コード分割が自動で入る
- Neutral, because 生成物を抱える点は TanStack Router と同じ。**「生成物が嫌だから
  TanStack を避ける」という理由は成立しない**
- Bad, because **検索パラメータはこのモードでも型付かない。** 型生成の対象は
  ローダー引数、アクション引数、コンポーネントの props であり、クエリ文字列は含まれない
- Bad, because フレームワークとしての作法が付いてくる。この repo は backend を
  別に持ち、画面は MSW で完結させる方針のため、サーバ側の仕組みが余る
- Bad, because ルートコンテキストの積み上げは無い。middleware の鍵渡しになる

### TanStack Router — 採用

- Good, because 検索パラメータをスキーマで検証し、型付きの状態として扱える。
  **4 択でこれができるのはここだけ**
- Good, because ルートコンテキストが route tree を下って合成される。
  `beforeLoad` の戻り値が子の型に積み上がる
- Good, because SPA のまま型生成が効く。フレームワークの作法を持ち込まずに済む
- Good, because TanStack Query と同じ思想で、`loader` から `queryClient` を
  素直に触れる
- Neutral, because 生成物 (`routeTree.gen.ts`) を抱えるが、framework mode も同じ
- Bad, because 情報量が React Router より少ない
- Bad, because サーバレンダリングが必要になったら TanStack Start へ移ることになる

## 補足情報 (More Information)

### 公式の比較表について

TanStack が公開している
[比較表](https://tanstack.com/router/latest/docs/framework/react/comparison)
では、React Router に無いものとして型付き検索パラメータ、検索パラメータの
スキーマ検証、型付きルートコンテキスト、パスパラメータの検証が挙げられている。

**ただしこれは TanStack 自身が書いた表であり、鵜呑みにしない。** 実際、
「型付きルートコンテキスト」は React Router v8 で middleware が既定になった結果、
`createContext()` による型付き注入という形で提供されている。**表が想定している
より差は小さい。** 残る違いは「鍵ごとの `get` / `set`」か「route tree を下る
合成」かという設計の差である。

一方で**検索パラメータの型付けと検証は、v8 の時点でも React Router に無い**。
公式の型安全の説明が対象としているのはローダー引数、アクション引数、
コンポーネントの props であって、クエリ文字列は含まれない。

### React Router v8 の現状 (2026-09 時点)

2026-06-17 リリース。チーム自身が「できるだけ退屈に」と表現する内容で、
v7 の 3 モードは維持されている。主な変更は ESM のみの配布、middleware と
Vite Environment API の既定化、基準の引き上げ (Node 22.22 以上、React 19.2.7 以上、
Vite 7 以上)。`react-router-dom` は廃止され `react-router` へ統合された。
年 1 回のメジャーリリースへ移行するとしている。

**Remix は v7 で React Router に吸収された。** そのため「React Router か
TanStack Router か」は対称な比較にならない。framework mode の相手は
TanStack Router ではなく TanStack Start である。

### 性能について

**性能差を理由に選んでいない。** 検索パラメータの更新で購読側だけを再描画する
粒度の違いは存在するが、この repo の規模で体感できる差になる根拠は無く、
実測もしていない。ADR-03 (valibot) がバンドルサイズを実測して決めたのとは
性質が違う判断である、と明記しておく。

### この判断が変わりうる条件

- **サーバレンダリングが必要になった場合** — 画面を MSW で完結させる方針を
  やめ、SEO や初期表示が要件に入ったら再評価する。移行先は TanStack Start か
  React Router の framework mode になる
- **検索パラメータを使わない構成に落ち着いた場合** — 決め手の 1 つが消える。
  ただしルートコンテキストの合成は残る
- **React Router が検索パラメータの型付けを入れた場合** — 最大の差が消えるため、
  情報量の多さが効いてくる

## 参考

- [Comparison | TanStack Router](https://tanstack.com/router/latest/docs/framework/react/comparison)
- [Router Context | TanStack Router](https://tanstack.com/router/latest/docs/guide/router-context)
- [Type Safety | React Router](https://reactrouter.com/explanation/type-safety) — 型生成が framework mode 限定であること
- [Modes | React Router](https://reactrouter.com/start/modes) — 3 モードの違い
- [Middleware | React Router](https://reactrouter.com/how-to/middleware) — `createContext()` による型付き注入
- [React Router v8 | Remix](https://remix.run/blog/react-router-v8) — v8 のリリース内容
