---
status: accepted
date: 2026-08-23
decision-makers: zui
consulted: Claude
informed:
---

# コミットメッセージ規約に lefthook と commitlint を採用

## 背景と課題 (Context and Problem Statement)

モノレポの土台を整えるにあたり、Conventional Commits 形式をローカルで
強制したい。前提として以下の状況があった。

- `mise.toml` に git hook manager の **hk** が既に入っていた
- 同じく `committed`（Rust 製の commit linter）も入っていたが、この作業の
  過程で削除した
- コミットメッセージは**日本語で書く**

ここで「**フックをいつ・どう発火させるか**」と「**メッセージが規約に沿うかを
どう検証するか**」は別の関心事であり、それぞれ何を使うかを決める必要がある。

当初はフック管理を hk のまま進めたが、後に**依存の管理方針**が固まった
（→ ADR-02: 依存は `pnpm-workspace.yaml` の catalog に集約する）。
hk は mise で入れるバイナリでこの方針から外れる唯一の存在だったため、
npm パッケージとして配布される lefthook へ移した。

## 決定要因 (Decision Drivers)

* 日本語のコミットメッセージで誤検知しないこと
* `git merge` / `git pull` を妨げないこと（マージが詰まないこと）
* 規約を後から調整できること
* 設定ミスに気づけること（黙って素通りしないこと）
* コミットのたびに走るため、実行時間が実用的であること
* 依存が catalog で一元管理できること（→ ADR-02）

## 検討した選択肢 (Considered Options)

**メッセージの検証**

* hk 内蔵の `check_conventional_commit`
* commitlint（npm）
* committed（Rust）
* cocogitto

**フックの管理**

* hk（mise で入れるバイナリ）
* lefthook（npm パッケージ）

## 決定 (Decision Outcome)

**選択: 「フック管理は lefthook、メッセージ検証は commitlint」**

`lefthook.yml` の `commit-msg` フックから commitlint を呼ぶ。

```yml
commit-msg:
  commands:
    commitlint:
      # {1} は git が渡す第 1 引数 = コミットメッセージファイルのパス
      run: ./node_modules/.bin/commitlint --edit {1}
```

検証に commitlint を選ぶ決め手は **`git merge` を妨げない唯一の選択肢**で
あり、かつ日本語向けに規約を調整できる点。

フック管理に lefthook を選ぶ決め手は、**npm パッケージとして catalog に
載せられる**点。依存はすべて `pnpm-workspace.yaml` に集約する方針
（→ ADR-02）に対し、hk だけが mise 管理のバイナリで例外になっていた。

- `@commitlint/cli` ^21.2.2
- `@commitlint/config-conventional` ^21.2.2
- `@commitlint/types` ^21.2.0

あわせて、clone した人のセットアップを 1 手順減らすため
`package.json` に `prepare` スクリプトを置く。

```jsonc
"scripts": {
  "prepare": "lefthook install"
}
```

`prepare` は pnpm が install 後に自動実行するライフサイクルスクリプトで、
husky が採用しているのと同じ仕組み。lefthook は npm 依存なので
`node_modules/.bin` から解決でき、PATH の有無を気にしなくてよい。

`commitlint.config.js`:

```js
/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [0],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
    'subject-case': [0],
  },
};
```

`type-enum` は既定のまま使う。**既定の 11 種が、旧 `committed.toml` の
`allowed_types` と完全に一致していた**ため、明示的な指定は不要と判断した。

```
build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test
```

### 結果 (Consequences)

* Good, because merge / revert / fixup コミットが**設定ゼロ**で正しく
  スキップされる
* Good, because 規約を細かく制御でき、`@commitlint/types` による型で
  ルール名の typo が防げる
* Good, because TypeScript エコシステムの定番であり、情報を探しやすい
* Good, because 旧 `committed.toml` の意図を 12 項目中 10 項目まで再現できた
* Good, because フック管理も含めて依存が catalog に揃った。mise で管理する
  ものは言語ランタイムだけになる
* Neutral, because 不正なメッセージの検出は実測 0.08 秒。hk 経由（0.45 秒）
  より速く、体感できる待ちは無い
* Bad, because 依存が増える（commitlint 3 つ + lefthook）
* Bad, because clone しただけではフックが有効にならない。`lefthook install`
  が別途必要（`prepare` スクリプトで自動化したが、仕組みの理解は必要）
* Bad, because `no_fixup` / `no_wip` 相当は実現できていない

### 確認方法 (Confirmation)

**この決定が実際に効いているかは、必ず実地で確認する。**
理由は後述の「学び」の通り、設定しても黙って素通りする事故が実際に起きたため。

**1. 不正なメッセージが弾かれるか**

```bash
git commit --allow-empty -m "update stuff"
# -> 失敗すれば正常。成功してしまったらフックが効いていない
```

**2. 日本語と英大文字略語が通るか**

```bash
git commit --allow-empty -m "feat: NPEを修正"
# -> 成功すれば正常。失敗するなら subject-case が効いてしまっている
```

**3. マージが詰まないか**

```bash
git merge --no-ff <branch>
# -> "Not committing merge" で止まったらフックがマージを妨げている
```

**4. フックがそもそも登録されているか**

```bash
ls .git/hooks/ | grep -v sample
# -> commit-msg と pre-commit が出れば登録済み
```

**5. マージが詰まないか**

```bash
git merge --no-ff <branch>
# -> 完了すれば正常。commitlint は merge コミットを既定で無視する
```

**6. clone した人の環境で有効になるか**

使い捨ての clone で以下を確認する。

```bash
git clone <repo> /tmp/verify && cd /tmp/verify
mise install
pnpm install                                  # prepare が lefthook install を実行
ls /tmp/verify/.git/hooks/ | grep -v sample   # commit-msg が出ること
git commit --allow-empty -m "update stuff"    # 弾かれること
```

`node_modules` が既に存在する環境では `prepare` が走らないため、
フックを入れ直したいときは `pnpm run prepare` を明示的に実行する
（理由は補足情報の「セットアップの仕組み」を参照）。

## 各選択肢の評価 (Pros and Cons of the Options)

### メッセージの検証: hk 内蔵の `check_conventional_commit`

hk には conventional commit チェッカーが内蔵されている
（`hk util check-conventional-commit`）。ソース
（`src/cli/util/check_conventional_commit.rs`）を読んで確認した実際の
検証内容は以下の 5 点のみ。

1. `#` 始まりの行を除外して**1 行目だけ**を見る（本文は一切読まない）
2. `fixup! ` / `squash! ` / `amend! ` 始まりはスキップ
3. type が許可リストに含まれるか
4. scope の括弧が正しいか（空 `()`・二重 `(a)(b)` は弾く）
5. description が空でないか

* Good, because 追加依存がゼロ
* Good, because Rust 製で高速（数十 ms）
* Good, because `fixup!` / `squash!` / `amend!` を自動スキップし、
  `git rebase --autosquash` を妨げない
* Neutral, because 日本語は素通りする（全角・半角どちらの句点も通る）
* Bad, because **外から変えられるパラメータが `--allowed-types` ただ 1 つ**
* Bad, because **`git merge` が詰む**（決定的な欠点。詳細は下記）

**マージが詰む問題（この選択肢を却下した理由）**

`man githooks` の通り commit-msg フックは **`git merge` でも呼ばれる**。
しかし `Merge branch 'feature'` には `:` が無いため、hk 内蔵チェッカーは
「description が無い」として弾く。使い捨てリポジトリで実証した結果:

```
$ git merge --no-ff feature
✗ conventional-commit
Not committing merge; use 'git commit' to complete the merge.
```

**マージコミットが作れない。** 非 FF の `git pull` でも同じことが起きる
ため、PR 運用をしていても日常的に踏む。

`.git/MERGE_HEAD` の有無で除外するシェルラッパーで回避はできる
（実証済み）が、設定ファイルの中でシェル芸を書くのは筋が悪いと判断した。

なお `git revert` は commit-msg フックを呼ばないため、`Revert "..."` は
この選択肢でも問題にならなかった（実測で確認）。**問題は merge だけ**である。

### メッセージの検証: commitlint — 採用

* Good, because **`defaultIgnores` により merge / revert / fixup を
  設定ゼロでスキップする**

  | メッセージ | 結果 |
  | --- | --- |
  | `Merge branch 'feature'` | 通る |
  | `Merge pull request #1 from a/b` | 通る |
  | `Revert "feat: x"` | 通る |
  | `fixup! feat: x` | 通る |

* Good, because ルールを細かく制御できる
* Good, because `@commitlint/types` で型安全に設定できる。型定義は
  `rules?: Partial<RulesConfig>` であり、`RulesConfig` はルール名が文字列
  リテラルで**全て列挙**されている。各ルールに専用の型
  （`LengthRuleConfig` / `CaseRuleConfig` など）も付いているため、
  **名前の typo も値の形の誤りも型エラーになる**
* Neutral, because 既定のままだと日本語で誤検知するが、無効化で対処できる
  （下記）
* Bad, because Node プロセスの起動コストがかかる（0.45 秒）
* Bad, because 依存が 3 つ増える

**日本語対応で無効化が必要だった項目（いずれも実測で確認）**

`subject-case` — 日本語で書いていても**先頭が英大文字の略語だと弾かれる**。

```
feat: NPEを修正        -> subject must not be sentence-case, ... [subject-case]
feat: UserAPIを追加     -> 同上
feat: メッセージ一覧を追加  -> 通る
```

旧 `committed.toml` の `subject_capitalized = false` と同じ意図である。

`header-max-length` / `body-max-line-length` — 既定の 100 文字は日本語だと
本文の折り返しで誤検知しやすい。実測でも `feat: ` + 95 文字で 101 文字と
なり弾かれた。

**`@commitlint/types` を明示的に依存に加えた理由**

pnpm は厳格で node_modules 直下にシンボリックリンクを張らないため、
入れないと phantom dependency となりエディタが型を解決できない。
実際に `node_modules/@commitlint/` の下は `cli` と `config-conventional`
だけだった。

**`pnpm exec` を使わない理由**

実測で 2 倍近い差が出たため、直接パスで呼ぶ。

| 呼び方 | 所要時間 |
| --- | --- |
| `pnpm exec commitlint` | 0.77〜0.83 秒 |
| `./node_modules/.bin/commitlint` | 0.38 秒 |

フック全体では 0.90 秒 → 0.45 秒に半減した。

### メッセージの検証: committed

削除する前まで使っていたもの。`committed.toml` で細かく設定できる。

* Good, because Rust 製で高速
* Good, because `merge_commit = true` でマージコミットを対象外にできる
* Good, because `no_wip` / `no_fixup` がある
* Good, because 既存の設定ファイルをそのまま流用できた
* Bad, because 依存が 1 つ増える（mise 管理のバイナリ）
* Bad, because 設定の大半（長さ制限・大文字・命令形）を日本語向けに
  無効化する必要があり、実効ルールは commitlint とほぼ同じになる
* Bad, because TypeScript プロジェクトの依存管理（catalog）の外に出る

### メッセージの検証: cocogitto

* Good, because conventional commits に特化している
* Bad, because `cog.toml` という別の設定ファイルが必要
* Bad, because 今回の要件に対して commitlint 以上の利点が見当たらなかった

候補として挙げたのみで、詳細な評価は行っていない。

### フックの管理: hk

* Good, because Rust 製で速い
* Good, because builtin が豊富（`check_conventional_commit` / `prettier` /
  `eslint` などが 1 行で使える）
* Good, because mise の作者による実装で、mise との統合が前提にある
* Bad, because **mise で入れるバイナリなので catalog に載せられない**。
  依存を `pnpm-workspace.yaml` に集約する方針（→ ADR-02）から外れる唯一の存在だった
* Bad, because 設定が Pkl。`amends "package://github.com/jdx/hk/releases/…"` の
  ような記述が必要で、YAML に比べて書き方を調べる場面が多い
* Bad, because 新しく情報が少ない

### フックの管理: lefthook — 採用

* Good, because **npm パッケージとして catalog に載る**。依存の管理方針が揃う
* Good, because 設定が YAML で、`root` / `glob` / `parallel` といった
  モノレポ向けの機能が素直に書ける
* Good, because 実績があり情報を探しやすい
* Neutral, because builtin は持たずコマンドを直接書く。ただし本プロジェクトが
  hk で使っていた builtin は無かった（commitlint を直接呼んでいた）ため失うものが無い
* Bad, because postinstall でバイナリを配置するため `allowBuilds` の許可が要る

**乗り換えの実測**

| 確認 | 結果 |
| --- | --- |
| 不正なメッセージを弾く | ✅（0.08 秒。hk 経由では 0.45 秒） |
| 日本語 + 英大文字略語が通る | ✅ |
| 非 FF マージが詰まない | ✅ |

## 補足情報 (More Information)

### 旧 committed 設定との対応表

| committed | commitlint | 状態 |
| --- | --- | --- |
| `style = "conventional"` | `extends: config-conventional` | 達成 |
| `allowed_types` 11 種 | `type-enum` 既定と完全一致 | 達成（記述不要） |
| `allowed_scopes = []` | `scope-enum` 制限なし | 達成 |
| `subject_length = 0` | `header-max-length: [0]` | 達成 |
| `line_length = 0` | `body-max-line-length: [0]` | 達成 |
| `hard_line_length = 0` | `footer-max-line-length: [0]` | 達成 |
| `subject_capitalized = false` | `subject-case: [0]` | 達成 |
| `imperative_subject = false` | 該当ルールが存在しない | 達成 |
| `subject_not_punctuated = true` | `subject-full-stop` 既定 | 達成 |
| `merge_commit = true` | `defaultIgnores` | 達成（設定不要） |
| `no_fixup = true` | 無し（fixup! はスキップされる） | **未達** |
| `no_wip = true` | 無し（`wip:` は type-enum で弾ける） | **部分的** |

12 項目中 10 項目を達成。未達の 2 つは以下の理由で許容した。

- **`no_fixup`**: commitlint は `git rebase --autosquash` を妨げないため
  意図的に fixup! を無視する設計。そもそも fixup を止めるべきは commit 時
  ではなく **pre-push** であり、必要になったら hk の `pre-push` フックに
  別途仕込む方が筋が良い。
- **`no_wip`**: `wip: 途中` は type-enum で弾けるが `feat: WIP 途中` は
  通る。実害が小さいため見送った。必要ならカスタムルールで追加できる。

なお `subject-full-stop` は既定のまま（半角ピリオドの末尾を禁止）だが、
**全角の「。」は検出されない**。これは旧 `committed` でも同じ挙動だった
ため、実質的な差は無い。

### セットアップの仕組み

**clone しただけではフックは有効にならない。** `lefthook.yml` をコミットしても、
フックの登録先は `.git/hooks/` であり、**`.git` の中身は clone されない**ためである。

使い捨ての clone で実測したところ、以下が確認できた。

| 手順 | フックの状態 |
| --- | --- |
| `git clone` 直後 | **未登録**。`update stuff` がそのまま通ってしまう |
| `mise install` | ランタイムが入るだけ。**登録されない** |
| `pnpm install` | commitlint と lefthook が `node_modules` に入る |
| `lefthook install` | **ここで初めて登録される** |

この 3 手順を 2 手順に減らすため、`package.json` に `prepare` スクリプトを
置いた。結果、clone した人がやることは以下だけになる。

```bash
mise install    # node / pnpm / bun
pnpm install    # 依存 + prepare で lefthook install も走る
```

lefthook は npm 依存なので `node_modules/.bin` から呼べる。hk のときに必要
だった「PATH に無ければ飛ばす」ガードは要らない。

**`prepare` が走る条件**

pnpm 11 は `optimisticRepeatInstall` が既定で有効なため、依存に変更が
なければ install 処理ごとスキップされ、`prepare` も実行されない。

| 状況 | `prepare` |
| --- | --- |
| `node_modules` が無い状態で `pnpm install` | 走る |
| `node_modules` がある状態（`--force` を付けても） | **走らない** |
| `pnpm run prepare` を直接実行 | 走る |

clone 直後は必ず `node_modules` が無いため目的は達成される。
既存環境でフックを入れ直すときは `pnpm run prepare` を使う。

**postinstall の許可が要る**

lefthook はプラットフォーム別バイナリを `optionalDependencies` で配り、
postinstall で配置する。pnpm 11 は既定で全てのビルドスクリプトを拒否する
ため、`pnpm-workspace.yaml` の `allowBuilds` に許可を書く必要がある
（`pnpm approve-builds` が追記する）。

### ローカルフックの限界（重要な認識）

このフックは**クライアントサイド**であり、以下の限界がある。

- **GitHub の「Merge pull request」ボタンには効かない**。マージコミットは
  GitHub のサーバー上で作られるため、ローカルの `.git/config` は参照され
  ない。Squash / Rebase も同様
- `git commit --no-verify` で誰でもバイパスできる
- clone した人が `hk install` を実行しないと動かない

つまり**ローカルフックは親切機能であって、関門ではない**。リモート側で
強制したくなったら以下を検討する。

1. GitHub Actions で PR タイトルを lint する（Squash merge に統一し、
   「Default to PR title for squash merge commits」を有効にすると
   PR タイトル = コミットメッセージになる）
2. Rulesets の metadata restrictions（**GitHub Enterprise プラン限定**の
   ため、個人リポジトリでは使えない）

現状は個人の練習リポジトリのため、ローカルフックのみで運用する。

### 学び: サイレント失敗を踏んだ話

フック管理が hk だった時期の出来事だが、**教訓は道具に依らない**ため残す。

**hk 1.54.1 は `Builtins.check_conventional_commit` を解決できないとき、
エラーも警告も出さずに黙ってスキップした。**

`mise.toml` を 1.56.0 に更新した後、シェルの PATH が古い 1.54.1 を指した
ままだったことが原因。「設定したのに効いていない」に気づけない、最も
質の悪い失敗である。実際にこれで不正なメッセージのコミットが通ってしまった。

切り分けの実測結果:

| 実行方法 | 終了コード | 判定 |
| --- | --- | --- |
| hk 1.54.1 で直接 | 0 | 素通り |
| hk 1.56.0 で直接 | 1 | 正しく弾く |
| git hook 経由（素の PATH） | 0 | 素通り |
| git hook 経由（PATH=1.56.0） | 1 | 正しく弾く |

教訓は以下の通り。

- **フックを入れたら必ず NG メッセージで実地確認する**（→ 確認方法の節）
- `mise.toml` を書き換えたらシェルを開き直す（PATH は起動時に固定される）
- CI や GUI の git クライアントなど mise activate が効かない環境では、
  同じ理由で道具が見つからない可能性がある

lefthook は npm 依存で `node_modules/.bin` から解決するため、この経路の
PATH ずれは起きにくい。ただし**「設定したのに効いていない」に気づけない**
という失敗の形そのものは、どの道具でも起こりうる。

### 参考

- `man githooks` — commit-msg は git-commit と git-merge から呼ばれる
- https://lefthook.dev/ — 設定の記法（`{1}` などのテンプレート）
- https://commitlint.js.org/reference/configuration.html
- hk のソース: `src/cli/util/check_conventional_commit.rs`（検証内容の確認に使用）
