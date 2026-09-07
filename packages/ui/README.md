# @orpc-prac/ui

画面を組み立てるための **UI コンポーネント**を置くパッケージ。見た目と挙動だけを持ち、
API の呼び出しや画面遷移は知らない。

**まだ空。** 何を入れるかはデザインシステムの方針が決まってから
（`docs/TODO.md`）。ここにあるのは箱と配線だけ。

## ビルドしない

`exports` が `dist` ではなく **`src` を直接指している**。`tsc` を通さず、
TypeScript と JSX のまま frontend へ渡す。

```jsonc
"exports": {
  ".": "./src/index.ts"
}
```

`packages/contract` は `dist` を配るので、形が違う。理由は 3 つ。

1. **React Compiler が効く。** 変換は frontend の Vite（`oxc-transform-react`）が
   行う。`dist` を配ると、その JS はすでに変換後なので最適化の対象から外れる
   （docs/03）
2. **HMR がそのまま動く。** ビルドを挟むと、ボタンの色を 1 つ変えるたびに
   `tsc` の完了を待つことになる
3. **CSS を足せる。** `tsc` は `.css` を出力に含めないため、`dist` を配る形だと
   コピーする配管を別に用意することになる

代わりに、**取り込む側がバンドラを持っていること**が前提になる。いまの利用者は
`apps/frontend`（Vite）だけなので成立している。Node で直接 `import` することは
できない。

## 中は相対 import で書く

frontend と backend は `~/*` を自分の `src` に向けているが、**このパッケージでは
使わない**。

```ts
import { Button } from "./Button"; // ○
import { Button } from "~/Button"; // × frontend の src を指してしまう
```

`src` をそのまま渡す以上、別名の解決は取り込む側の設定が受け持つ。`~` は
`apps/frontend/vite.config.ts` で `apps/frontend/src` に向いているため、
このパッケージの中で書くと別の場所に着地する。

## 型検査は自分で持つ

`tsc --noEmit` を自分で走らせる（`pnpm check:type`）。frontend の `tsc` も
`src` を読むので二重に検査されるが、**このパッケージだけで型が閉じているか**は
ここでしか分からない。frontend が偶然入れている型に頼っていても、向こうの検査では
気づけないため。
