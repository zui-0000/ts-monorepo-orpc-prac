---
status: accepted
date: 2026-08-22
decision-makers: zui
consulted: Claude
informed:
---

# pnpm catalog はフラットな単一カタログを採用

## 背景と課題 (Context and Problem Statement)

pnpm workspace のモノレポにおいて、複数パッケージ間で依存バージョンを
揃える必要がある。`apps/frontend`、`apps/backend`、`packages/*` で
`typescript` や `zod` のバージョンがズレると、特に oRPC のように
**パッケージ間で型を共有する構成では致命的**になる。

pnpm には **catalog** という機能がある。`pnpm-workspace.yaml` に
バージョンを定義し、各 `package.json` から `"catalog:"` で参照する。
この catalog を「1 つのフラットな辞書にするか、用途別に分割するか」を
決める必要がある。

## 決定要因 (Decision Drivers)

- パッケージ間でバージョンが絶対にズレないこと（型共有が壊れないため）
- 依存を追加・更新する手順が単純であること
- `pnpm add --save-catalog` などの標準ツールと衝突しないこと
- 現在および当面の規模（10〜20 エントリ程度）に見合っていること
- 分類のために迷う時間が発生しないこと

## 検討した選択肢 (Considered Options)

- デフォルトカタログ 1 つ（フラット）
- named catalogs でレイヤー別に分割（shared / frontend / backend / パッケージ別）
- named catalogs を dependencies / devDependencies で分割

## 決定 (Decision Outcome)

**選択: 「デフォルトカタログ 1 つ。フラットに並べる」**

そして**ワークスペース内で使う依存はすべて `catalog:` 参照にする**。

```yaml
packages:
  - "apps/*"
  - "packages/*"

# 依存バージョンの一元管理（各 package.json は "catalog:" で参照する）
catalog:
  '@commitlint/cli': ^21.2.2
  '@commitlint/config-conventional': ^21.2.2
  '@commitlint/types': ^21.2.0
```

決め手は、**分割するとバージョンの重複定義が発生し、catalog を導入した
目的そのものが壊れる**ため。加えて、この規模では分割の利点が無い。

ルート専用の依存（commitlint 等）も catalog に載せるのは、
「全依存のバージョンが 1 箇所で見渡せる」一貫性を優先したため。
pnpm 本体のリポジトリも `@commitlint/cli` をデフォルトカタログに
入れており、同じ方針である。

### 結果 (Consequences)

- Good, because 全依存のバージョンを 1 ファイルで見渡せる
- Good, because バージョンのズレが**構造的に**発生しない
  （同じパッケージを 2 箇所に書く余地が無い）
- Good, because `pnpm add --save-catalog` が自動でアルファベット順に
  挿入してくれるため、整列の手間がない
- Good, because 実案件のプラクティスと一致しているため情報を探しやすい
- Bad, because バージョン更新が手作業になる（`pnpm update` が catalog を
  更新しないため。詳細は下記）
- Bad, because ルート専用の依存まで catalog に載るため、参照が 1 段
  間接的になる
- Neutral, because 依存が 100 エントリを超えるような規模になった場合は
  再検討が必要（nuxt の実例を参照）

### 確認方法 (Confirmation)

**1. 全パッケージで同じバージョンが使われているか**

```bash
pnpm ls -r --depth 0
# -> 同じパッケージ名が複数バージョンで現れていないこと
```

特定のパッケージを見るなら:

```bash
pnpm why zod -r
```

**2. `package.json` にバージョンが直書きされていないか**

catalog に載せると決めた依存が、うっかり直書きに戻っていないか確認する。

```bash
grep -rn '"[~^0-9]' --include=package.json apps packages package.json
# -> catalog: 参照のみなら何も出ない（意図的な直書きを除く）
```

**3. catalog に重複定義が無いか**

デフォルトカタログ 1 つの間は、YAML のキー重複になるため構造的に発生
しない。**named catalog を導入した場合はこの保証が消える**ため、
その時点で重複チェックを手順に加えること。

**4. ルートの `pnpm install` だけで全階層が入るか**

```bash
pnpm install
pnpm ls -r --depth -1   # 全 workspace プロジェクトが列挙されること
```

なおこれは `packages:` の働きであり catalog とは無関係だが、
混同しやすいため確認手順に含めている（後述）。

## 各選択肢の評価 (Pros and Cons of the Options)

### デフォルトカタログ 1 つ（フラット）— 採用

```yaml
catalog:
  typescript: ^5.9.2
  zod: ^4.1.5
```

- Good, because 同じパッケージを 2 箇所に書く余地が無く、ズレが構造的に
  起きない
- Good, because 参照が `"catalog:"` だけで済み最短
- Good, because `pnpm add --save-catalog` がそのまま使える
- Good, because 8〜17 エントリ規模の実案件（vuejs/core, element-plus,
  pnpm 本体）と同じ形
- Neutral, because 「どこで使うか」の情報は YAML に現れないが、
  それは `pnpm why` で引ける（後述）
- Bad, because 100 エントリを超える規模では見通しが悪くなる可能性がある

### named catalogs でレイヤー別に分割

```yaml
catalogs:
  shared: { ... }
  frontend: { ... }
  backend: { ... }
  packages/contract: { ... }
```

実際に組んで検証した。スラッシュを含むカタログ名も動作する。

- Good, because カタログ名で分類が明示される
- Good, because `--save-catalog-name=<name>` で追加すれば、意図した
  カタログに入る
- Bad, because **同じパッケージが複数カタログに重複する**。実測では
  `typescript` が 3 箇所、`zod` が 4 箇所に定義される結果になった
- Bad, because **重複はバージョン分裂を招く**。「shared だけ上げて
  frontend を上げ忘れた」シナリオを再現したところ、以下が起きた

  ```
  packages/contract -> zod@4.4.3
  apps/web          -> zod@3.25.76   <- メジャーが分裂
  apps/server       -> zod@4.4.3
  ```

  **`pnpm install` は警告を一切出さない。** oRPC のコントラクト共有が
  静かに壊れる典型パターンである

- Bad, because 分類に迷う依存が出る（zod は shared か backend か）。
  共有範囲が変わるたびに定義と参照の両方を書き換える必要がある
- Bad, because **単一パッケージ専用カタログは存在意義が無い**。
  `packages/contract` カタログを参照するのはそのパッケージ 1 つだけであり、

  ```jsonc
  "dependencies": { "zod": "catalog:packages/contract" }  // これと
  "dependencies": { "zod": "^4.1.5" }                     // これの違いは？
  ```

  後者の方が短く、`pnpm-workspace.yaml` を開かずにバージョンが分かる。
  catalog は「共有するため」の道具なので、共有しない依存を入れると
  純粋に間接参照が増えるだけになる

### named catalogs を dependencies / devDependencies で分割

```yaml
catalogs:
  dependencies: { zod: ^4.1.5 }
  devDependencies: { typescript: ^5.9.2 }
```

- Good, because `--save-catalog-name` で追加すれば分類が自動で保たれる
- Bad, because lockfile に**完全に独立した 2 エントリ**として記録される。
  片方だけ更新すれば即座にズレる

  ```yaml
  catalogs:
    dependencies:
      zod: { specifier: ^4.1.5, version: 4.4.3 }
    devDependencies:
      zod: { specifier: ^4.0.0, version: 4.4.3 }   # 別管理
  ```

- Bad, because **同じパッケージが片方では prod・別では dev** になる
  ケースが普通に存在するため、分類表として最初から破綻している。
  実測でも `zod` が `packages/contract` では dependencies、
  `apps/server` では devDependencies として、`catalog:` 1 つで同一
  バージョンに解決されることを確認した
- Bad, because prod / dev の情報は**各パッケージの `package.json` に
  既にある**ため、同じ事実を 2 箇所で管理することになる

  ```jsonc
  // packages/contract/package.json
  "dependencies":    { "zod": "catalog:" }        // ここが prod と言っている
  // apps/backend/package.json
  "devDependencies": { "typescript": "catalog:" } // ここが dev と言っている
  ```

- Bad, because 依存の種別を prod から dev に変えるとき、`package.json` の
  位置だけでなく catalog 参照名も書き換える必要がある

## 補足情報 (More Information)

### catalog とは何か（前提の整理）

npm の `overrides` / yarn の `resolutions` とは**別物**である。

- `overrides` / `resolutions` — 推移的依存を強制的に上書きする緊急避難装置
- `catalog` — **直接依存のバージョンを一箇所で定義し、各パッケージが参照する**

最も近いのは **Gradle の Version Catalog（`libs.versions.toml`）** や
Maven の BOM（`dependencyManagement`）。バージョンの辞書を一元化し、
各モジュールはバージョンを書かずに参照する、という構造が同じ。

Gradle の Version Catalog も `[libraries]` はフラットな辞書であり、
`implementation` か `testImplementation` かは各モジュールが決める。
本 ADR が dependencies / devDependencies で分割しない理由と同じ設計思想である。

### 実案件の調査結果

| リポジトリ   | catalog の使い方                     | エントリ数 |
| ------------ | ------------------------------------ | ---------- |
| vuejs/core   | デフォルトカタログ 1 つ・フラット    | 8          |
| element-plus | デフォルトカタログ 1 つ・フラット    | 17         |
| pnpm/pnpm    | デフォルトカタログ 1 つ・フラット    | 多数       |
| vitejs/vite  | catalog 未使用（overrides 等は使用） | -          |
| nuxt/nuxt    | **named catalogs を 7 つに分割**     | 193        |

element-plus は `prettier` `typescript` `tsx`（dev）と
`vue` `@floating-ui/dom`（prod）を**意図的に混ぜてフラットに並べている**。
pnpm 本体も同様にフラットで、`@commitlint/cli` のような開発ツールも
デフォルトカタログに入れている。

### nuxt は分割している（重要な反例）

当初「分割している実例は無い」と考えていたが、**これは誤りだった**。
nuxt/nuxt は named catalogs を 7 つ運用している。

| カタログ        | 数  | 用途（原文コメントより）                           |
| --------------- | --- | -------------------------------------------------- |
| `app-runtime`   | 23  | nuxt アプリランタイムで import されるもの          |
| `nitro-runtime` | 5   | サーバーランタイムで import されるもの             |
| `vue`           | 6   | vue コンパイラ / ツーリング                        |
| `vite`          | 7   | vite / rolldown / oxc ツールチェーン               |
| `webpack`       | 20  | webpack / rspack パイプライン                      |
| `build`         | 63  | 公開パッケージのビルド時依存                       |
| `dev`           | 69  | 開発 / テスト / ワークスペースツーリング（pinned） |

注目すべきは分割の基準が「フロント / バック」のような**レイヤー別ではなく、
依存の性質・役割別**である点。「実行時に import されるか」「ビルド時にだけ
必要か」「開発時にだけ必要か」で切られている。`build` と `dev` の分離は
prod / dev の区別に近い。

そして本 ADR が指摘した「重複」は、実際に発生している。

```txt
総パッケージ数: 181 / 複数カタログに出現: 12
  @vue/shared   {'app-runtime': '^3.5.41', 'build': '^3.5.41'}
  consola       {'app-runtime': '^3.4.2',  'build': '^3.4.2'}
  ...
重複のうちバージョンがズレているもの: 0 件
```

**12 件すべてでバージョンが一致していた。** つまり nuxt は
「分割しても揃えなければならない」という代償を、**手作業の規律で
払い続けている**。ズレる余地が構造的に存在することは変わらない。

### 規模が判断を分ける

したがって正確な結論はこうなる。

- **193 エントリ規模**（nuxt）では、分割の見通しの良さが重複管理のコストを
  上回りうる。特に「ランタイムに入るか否か」はバンドルサイズに直結するため、
  カタログで区別する実利がある
- **8〜17 エントリ規模**（vuejs/core, element-plus）ではフラット 1 つ

本プロジェクトの現在の catalog は 3 エントリであり、oRPC・zod・TypeScript・
テストランナーを加えても 10〜20 程度に収まる見込みである。
**この規模では分割の利点が無く、重複のリスクだけが残る。**

### 将来 named catalog を使う場面

以下の 2 つのケースに限る。

**ケース1: バージョンの段階的移行（一時的な足場）**

```yaml
catalogs:
  zod3: { zod: ^3.25.0 }   # まだ移行できていないパッケージ用
  zod4: { zod: ^4.1.5 }    # 移行済み
```

「バージョン分裂」を、**意図的・一時的・移行のために**行う。移行が完了
したら畳んでデフォルトカタログに戻す。**足場であって恒久的な構造ではない。**

これは pnpm 公式ドキュメントが想定している用途でもある
（公式の例が `react17` / `react18`）。

**ケース2: 100 エントリを超える規模で、依存の性質が明確に分かれるとき**

nuxt/nuxt の実例が該当する。ただし分割するなら以下を守ること。

- 分割基準は**レイヤー（frontend / backend）ではなく依存の性質**
  （ランタイム / ビルド時 / 開発時 / ツールチェーン）にする
- カタログをまたいで重複するパッケージは、**バージョンを手で揃え続ける
  規律**が必要になる
- パッケージ 1 つでしか使わない依存のためにカタログを作らない

本プロジェクトがこの規模に達することは当面想定していない。

### 運用ルール

**追加**

```bash
# ワークスペース内のパッケージに追加
pnpm --filter @app/contract add zod --save-catalog

# ルートの開発ツールに追加
pnpm add -D -w --save-catalog <pkg>
```

`--save-catalog` を使うと catalog に自動登録され、`package.json` 側は
`"catalog:"` 参照になる。**アルファベット順の位置に自動挿入される**ため、
その順序を維持しておくとツールと衝突しない。

**更新 — 手で書き換える**

以下を実測で確認済み。

- `pnpm add <pkg>@<新バージョン> --save-catalog` は**既存エントリを
  上書きしない**。警告を出してスキップする

  ```
  [WARN] Skip adding zod to the default catalog because it already exists
         as ^4.1.5. Please use `pnpm update` to update the catalogs.
  ```

- しかし **`pnpm update` でも catalog は更新されなかった**（pnpm 11.22.0）。
  `pnpm update zod --latest -r`、パッケージ内からの実行、
  `pnpm update --latest -r` のいずれも効果なし。`pnpm update` に
  catalog 関連オプションも存在しない（`--save-catalog` は `pnpm add` 専用）。
  警告文の案内と実際の挙動がちぐはぐな状態

つまり**バージョンの引き上げは手作業**になる。

**コメントの扱い**

`pnpm-workspace.yaml` のコメントは、pnpm がファイルを書き換えても
**消えない**（実測: 実行前後で 9 個のまま保持）。ファイル先頭・
セクション区切り・行末コメントすべて維持された。

ただし**グループ見出しコメントは意味を保てない**。新規エントリは
アルファベット順に挿入されるため、意図しないグループに紛れ込む。

```yaml
  # --- 言語・ビルド基盤 ---
  typescript: ^5.9.2
  valibot: ^1.4.2      # <- t の次なのでここに入る。グループ無視
                       #    (--save-catalog で追加した結果)
  # --- バリデーション ---
  zod: ^4.1.5
```

したがって以下の方針とする。

- **グループ見出しコメントは使わない**（フラットなら不要）
- 理由を残したいときは**行末コメント**を使う。行末コメントは
  **キーに紐づく**ため、並び替えられても付いてくる

```yaml
catalog:
  zod: ^4.1.5   # contract のスキーマ定義 -> backend/frontend が型として利用
```

### `packages:` と `catalog:` は別の仕組み

同じファイルに同居しているため混同しやすいが、**役割が完全に異なる**。

| フィールド  | 役割                                              |
| ----------- | ------------------------------------------------- |
| `packages:` | **どのディレクトリが workspace の一員か**を決める |
| `catalog:`  | **バージョンをどこに書くか**を決める              |

- ルートで `pnpm install` すると全階層のパッケージが入る
  → これは **`packages:` の働き**。catalog を 1 つも使っていなくても同じ
- 全パッケージの zod が同じバージョンに揃う
  → これが **`catalog:` の働き**

Gradle でいえば前者が `settings.gradle.kts` の `include(...)`、後者が
`libs.versions.toml` にあたる。pnpm は 1 ファイルに同居しているだけで、
**依存関係も因果関係も無い**。

### どの依存がどこで使われているかの調べ方

catalog を分割したくなる動機は「どの依存がどこで使われているか見たい」
という点にあるが、それは**コマンドで引ける**。

```bash
pnpm why <pkg> -r        # そのパッケージを使っている workspace を列挙
pnpm ls -r --depth 0     # 各パッケージの直接依存を一覧
```

実データなので書き忘れも嘘もない。YAML の構造で表現する必要はない。

### 参考

- https://pnpm.io/catalogs
- vuejs/core, element-plus, nuxt/nuxt, pnpm/pnpm の `pnpm-workspace.yaml`
- 検証はすべて pnpm 11.22.0 で実施
