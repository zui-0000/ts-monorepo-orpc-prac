---
status: accepted
date: 2026-08-23
decision-makers: zui
consulted: Claude
informed:
---

# バリデーションライブラリに valibot を採用

## 背景と課題 (Context and Problem Statement)

`packages/contract` は oRPC の契約を定義する共有パッケージであり、入出力の
スキーマを検証ライブラリで記述する。この契約は **backend だけでなく frontend
にもバンドルされる**（クライアントが入力検証に同じスキーマを使うため）。

当初は zod を採用していたが、実装を進めた段階で「zod は重いパッケージなので
バンドルサイズが気になる」という懸念が挙がった。そこで実際に計測したところ、
無視できない量であることが判明した。

oRPC は [Standard Schema](https://standardschema.dev/) に対応しており、
zod / valibot / arktype のいずれでも契約を記述できる。つまり**契約の構造を
変えずに検証ライブラリだけ差し替えられる**状態にある。

## 決定要因 (Decision Drivers)

* frontend にバンドルされるため、転送量とパース量が小さいこと
* oRPC の契約構造（`.route()` / `.input()` / `.output()` / `.errors()`）を
  変えずに済むこと
* 契約が持つ型安全性（エラーコードのリテラル判別など）が損なわれないこと
* スキーマの記述が読めること。契約は長く残る資産のため
* 移行するなら**契約が小さいうちに**行うこと

## 検討した選択肢 (Considered Options)

* zod をそのまま使い続ける
* zod/mini に切り替える
* valibot に切り替える

## 決定 (Decision Outcome)

**選択: valibot**

```ts
import * as v from 'valibot'

export const UserNameSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(100),
  v.description('ユーザー名'),
)
```

決め手は **バンドルサイズが 13 分の 1 になり、かつ型安全性を一切失わなかった**
こと。oRPC が Standard Schema 対応のため、契約の構造は 1 行も変えずに済んだ。

### 結果 (Consequences)

* Good, because `packages/contract` のバンドルが **65.5 KB → 5.1 KB (gzip)**
  になった。**60 KB の削減**
* Good, because ブラウザがパースする量が **281.2 KB → 8.8 KB** に減った
  （転送より効く場合がある）
* Good, because oRPC 側は無変更で済んだ。`.route()` / `.errors()` /
  `implement()` はそのまま動く
* Good, because 契約の型安全性が完全に維持された（後述の検証を参照）
* Good, because 契約がまだ小さい段階で移行できた。スキーマ 17 ファイル程度
* Bad, because zod に比べて情報量が少ない。詰まったときに調べにくい
* Bad, because `v.pipe()` の記法に慣れが必要。メソッドチェーンより冗長
* Neutral, because 検証ロジックの表現力は今回必要な範囲で差が無かった
  （文字数・正規表現・リテラル・配列・optional・ISO 日時のすべてを移植できた）

### 確認方法 (Confirmation)

**1. バンドルサイズが増えていないこと**

```bash
pnpm --filter @orpc-prac/contract build
bun build packages/contract/dist/index.js --minify --outfile /tmp/b.js
gzip -c /tmp/b.js | wc -c    # 目安: 6 KB 以下
```

契約が育つと当然増えるが、**桁が変わったら疑う**こと。zod を間接的に
引き込んでいないか、`import` が名前空間から個別へ変わっていないかを見る。

**2. 型安全性が維持されていること**

使い捨てのパッケージから `implement(contract)` して、以下が**すべて型エラーに
なる**ことを確認する。

| 壊し方 | 期待 |
| --- | --- |
| 契約に無いエラーを投げる | TS2339 |
| エラー code のリテラル違反 (4091 → 9999) | TS2322 |
| 401 の 2 種を取り違え (4010 を 4011 の枠に) | TS2322 |
| 204 の手続きが値を返す | TS2322 |
| input に無いフィールドを参照 | TS2339 |

**3. zod が再混入していないこと**

```bash
grep -rn "zod" packages/*/src packages/*/package.json pnpm-workspace.yaml
```

## 各選択肢の評価 (Pros and Cons of the Options)

計測はすべて **同一のスキーマ**（UUID v7 の正規表現・文字数制限・メール
正規表現・パスワード制限）を各ライブラリで記述し、Bun で minify + gzip した値。

| 選択肢 | gzip | 展開後 |
| --- | --- | --- |
| zod | **62.2 KB** | 281.2 KB |
| zod/mini | 4.1 KB | - |
| valibot | **3.3 KB** | 8.8 KB |

参考までに、契約そのもののコードは 2.0 KB、`@orpc/contract` の寄与は 1.7 KB
しかない。**バンドルの 95% を検証ライブラリが占めていた**。

### zod をそのまま使い続ける

* Good, because 情報量が圧倒的に多い。詰まったときに調べやすく、学習目的では
  大きな利点
* Good, because メソッドチェーン (`z.string().min(1).max(100)`) が簡潔で読みやすい
* Good, because エコシステムの対応が広い
* Bad, because **62 KB (gzip)**。React + ReactDOM（約 45 KB）より大きい
* Bad, because **原理的に tree-shaking が効かない**（下記）

**なぜ tree-shaking が効かないか**

zod の公式ドキュメントにこう書かれている。

> bundlers are generally **not able to remove unused method implementations**

`z.string().min(5)` の `.min()` は `ZodString` クラスのメソッドであり、
バンドラは「`min` だけ使っている」と判断できない。クラスを 1 つ使えば
全メソッドが付いてくる。**import の書き方を変えても解決しない**。

実際、`import { z } from 'zod'` と `import * as z from 'zod'` と
`import { string } from 'zod'` の 3 通りを計測したが、サイズは変わらなかった。

**転送時間への影響（zod と valibot の差 60.5 KB 分）**

| 回線 | 追加時間 |
| --- | --- |
| 光 100Mbps | 5 ms |
| 4G 中央値 20Mbps | 24 ms |
| 低速 4G 5Mbps | 97 ms |
| 3G 400Kbps | **1212 ms** |

高速回線では無視できる差である。**この選択肢を却下したのは「遅いから」ではなく、
同等の型安全性を 13 分の 1 のコストで得られると分かったから**。

### zod/mini に切り替える

* Good, because 4.1 KB。zod の 15 分の 1
* Good, because zod の型システムとエラー形式をそのまま使える
* Bad, because API が関数合成に変わる
  （`z.string().check(z.minLength(5))`）。結局書き換えが必要
* Bad, because 書き換えるなら、より小さい valibot を選ばない理由が薄い
* Bad, because zod 本体向けの情報がそのままは使えず、mini 固有の情報は
  本体より少ない

### valibot に切り替える — 採用

* Good, because **3.3 KB**。3 択で最小
* Good, because 設計そのものが tree-shaking 前提。各検証が独立した関数
  （`v.minLength` など）なので、使わないものはバンドラが落とせる
* Good, because oRPC が Standard Schema 対応のため、**契約の構造を変えずに済む**
* Good, because 移行に必要な変換が機械的（後述の対応表）
* Neutral, because `v.pipe()` の記法はメソッドチェーンより冗長だが、
  **その冗長さこそが tree-shaking を可能にしている**。トレードオフを理解して選ぶ
* Bad, because zod に比べて情報量が少ない

## 補足情報 (More Information)

### 移行の対応表

契約の構造（`.route()` / `.input()` / `.output()` / `.errors()` /
`implement()`）は**一切変更していない**。書き換えたのはスキーマの記述のみ。

| zod | valibot |
| --- | --- |
| `z.string().min(1).max(100)` | `v.pipe(v.string(), v.minLength(1), v.maxLength(100))` |
| `z.string().regex(re, msg)` | `v.pipe(v.string(), v.regex(re, msg))` |
| `.describe('...')` | `v.description('...')`（pipe の一部として） |
| `z.iso.datetime()` | `v.pipe(v.string(), v.isoTimestamp())` |
| `z.object({...})` | `v.object({...})` |
| `z.literal(400)` | `v.literal(400)` |
| `z.array(X)` | `v.array(X)` |
| `X.optional()` | `v.optional(X)` |
| `X.extend(Y.shape)` | `v.object({ ...X.entries, ...Y.entries })` |
| `z.infer<typeof X>` | `v.InferOutput<typeof X>` |
| `z.void()` | `v.void()` |

### import の書き方について

**`import * as v from 'valibot'` を使う。** これは好みではなく、そう書くしかない。

| | zod | valibot |
| --- | --- | --- |
| `import { z }` / `import { v }` | ✅ 通る | 🚫 **TS2305: has no exported member 'v'** |
| `import * as z` / `import * as v` | ✅ | ✅ |
| `import { string }`（個別） | ✅ | ✅ |

**zod は `z` という名前のオブジェクトを実際に export している**ため
`import { z }` が成立する。一方 **valibot に `v` という export は存在しない**。
各関数を個別に export しているだけなので、`import * as v` で**こちら側が
名前空間に名前を付けている**。`v` という名前は公式ドキュメントの慣習にすぎず、
`import * as valibot from 'valibot'` でも動く。

zod が `z` オブジェクトを export しているのは v3 時代からの書き味を守るための
設計判断だが、名前空間オブジェクト自体が全関数への参照を持つため、
tree-shaking とは相性が悪い。

なお **import 方式によるバンドルサイズの差はゼロ**（実測でバイト単位まで一致）。
モダンなバンドラは `import * as` でも使用箇所を静的解析できる。
名前空間 import を選ぶ理由は可読性の側にある。

* valibot の関数名（`object` `string` `number` `array` `union` `literal`）は
  一般的な変数名と衝突しやすい
* `v.` が付いていればスキーマ定義だと一目で分かる
* 検証を足すたびに import 文を編集しなくて済む
* 公式ドキュメントの例がすべてこの形

### valibot に mini 版は無い

zod は後付けで `zod/mini` を用意したが、valibot の `exports` は `.` のみ。
**最初から全体がその設計**である。

### この判断が変わりうる条件

* **frontend にスキーマを配らない構成にした場合** — 実行時検証をサーバ側だけで
  行い、frontend は型情報しか使わないなら、検証ライブラリはバンドルされない。
  その場合サイズの論拠は消える（ただし oRPC クライアントの入力検証は失われる）
* **valibot で表現できない検証が必要になった場合** — 現時点では必要な検証を
  すべて移植できたが、複雑な変換や refine が必要になったら再評価する
* **zod が tree-shaking 可能な構造になった場合** — 現在の `zod/mini` が本体に
  統合されるなど

## 参考

- https://valibot.dev/
- https://zod.dev/packages/mini — zod 公式による mini の説明とサイズ比較
- https://standardschema.dev/ — oRPC がこれに対応しているため差し替えが可能だった
- 計測はすべて Bun 1.4.0 の `bun build --minify` + gzip で実施
