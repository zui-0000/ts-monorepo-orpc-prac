/**
 * 依存関係の構造ルール (dependency-cruiser)。
 *
 * oxlint の no-restricted-imports は import 文の「文字列」を見るだけなので、
 * 相対パスと別名の書き分けを取りこぼしうる。こちらは tsconfig の paths を解決して
 * 実ファイル同士の依存として判定するため、書き方に依らず必ず捕まえられる。
 *
 * comment は違反時にそのまま端末へ出るメッセージ。規約を知らない人がその場で直せるよう
 * 「何が起きたか / なぜ禁止か / どう直すか」の 3 点を必ず書く。
 * 表示には err-long レポーターが必要 (既定の err は comment を出さない)。
 */

/** 実装 (アダプタ) の置き場。contexts と shared を同じ扱いにする。 */
const IMPL_LAYER = "^src/(contexts/[^/]+|shared)/infrastructure/";

/**
 * 実装を知ってはいけない側。contexts の内側 3 層と、shared のうち
 * ポート・型・共通部品・HTTP 基盤を置く層 (infrastructure 以外すべて)。
 */
const PORT_SIDE =
  "^src/(contexts/[^/]+/(domain|application|presentation)" +
  "|shared/(domain|application|errors|presentation))/";

/** 違反メッセージを 3 部構成に揃えるためのヘルパー。 */
const message = ({ violation, reason, fix }) =>
  [`【違反】${violation}`, `【理由】${reason}`, `【対処】${fix}`].join("\n");

export default {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: message({
        violation: "モジュールが循環参照になっています。",
        reason:
          "循環は「本来 1 つであるべき責務が 2 ファイルに分かれている」か\n" +
          "「依存の向きが逆のものが混ざっている」サインです。\n" +
          "初期化順に依存する壊れ方をするため、実行時まで問題が表面化しません。",
        fix:
          "共通して必要な部分を第 3 のモジュールへ切り出し、双方がそれを参照する形にします。\n" +
          "あるいは、どちらが内側かを決めて依存を一方向に倒します。",
      }),
      from: {},
      to: { circular: true },
    },

    // ---- 層の向き (常に内向き) ----
    {
      name: "domain-not-to-outer",
      severity: "error",
      comment: message({
        violation:
          "domain 層が application / infrastructure / presentation を参照しています。",
        reason:
          "ドメインは HTTP もユースケースも DB も知らずに成立すべき層です。\n" +
          "外側を知ると、ドメインだけを取り出して読む・テストすることができなくなり、\n" +
          "「業務ルールがどこに書いてあるか」が追えなくなります。",
        fix:
          "必要なのが値なら引数で受け取ります (呼び出し側が用意する)。\n" +
          "必要なのが副作用なら domain/ にポート (型) を定義し、\n" +
          "実装は infrastructure/ に置き、合成ルートが差し込みます。",
      }),
      from: { path: "^src/(contexts/[^/]+|shared)/domain/" },
      to: {
        path:
          "^src/(contexts/[^/]+/(application|infrastructure|presentation)" +
          "|shared/(application|infrastructure|presentation))/",
      },
    },
    {
      name: "application-not-to-impl",
      severity: "error",
      comment: message({
        violation:
          "application 層が infrastructure / presentation を参照しています。",
        reason:
          "application は「何を、どの順でやるか」だけを決める層で、実装の詳細は持ちません。\n" +
          "実装を直接掴むとテストで差し替えられなくなり、\n" +
          "DB やフレームワークを替えただけでユースケースが壊れます。",
        fix:
          "ポート (domain/ の Repository や application/ の QueryService) 越しに使います。\n" +
          "どの実装を使うかを決めるのは合成ルート (src/app-deps.ts) だけです。",
      }),
      from: { path: "^src/(contexts/[^/]+|shared)/application/" },
      to: {
        path:
          "^src/(contexts/[^/]+/(infrastructure|presentation)" +
          "|shared/(infrastructure|presentation))/",
      },
    },
    {
      name: "presentation-not-to-context-domain",
      severity: "error",
      comment: message({
        violation: "presentation 層が contexts/<ctx>/domain を参照しています。",
        reason:
          "presentation の仕事は「入力を箱に詰めて controller へ渡す」ことだけです。\n" +
          "ドメインに手が届くと、認可やリポジトリ呼び出しを controller / routes に\n" +
          "書けてしまいます。認可は業務ルールなのでユースケースとドメインの側にあるべきで、\n" +
          "経路ごとに散ると修正漏れの温床になります。",
        fix:
          "値オブジェクトが要るなら application の入力型 (XxxCommandInput /\n" +
          "XxxQueryInput) 越しに渡します。判定が要るなら application の関数を 1 本呼び、\n" +
          "その中でドメインサービスを使います。",
      }),
      from: { path: "^src/(contexts/[^/]+|shared)/presentation/" },
      to: { path: "^src/contexts/[^/]+/domain/" },
    },
    {
      name: "presentation-not-to-impl",
      severity: "error",
      comment: message({
        violation: "presentation 層が infrastructure を参照しています。",
        reason:
          "controller の仕事はユースケースへの橋渡しだけです。\n" +
          "実装を直接掴むと application 層を素通りでき、\n" +
          "「どの実装を使うか」の決定が合成ルート以外にも散らばります。",
        fix:
          "application の command / query を呼びます。\n" +
          "実装の結線は合成ルート (src/app-deps.ts と contexts/<ctx>/<ctx>-deps.ts) が行います。",
      }),
      from: { path: "^src/(contexts/[^/]+|shared)/presentation/" },
      to: { path: IMPL_LAYER },
    },
    {
      name: "no-indirect-path-to-impl",
      severity: "error",
      comment: message({
        violation:
          "ポート側の層から、何かを経由して infrastructure に到達しています。",
        reason:
          "直接 import していなくても、経路が繋がっていれば実装に依存していることに変わりません。\n" +
          "とくに実装を束ねたファイル (合成ルート) を型のためだけに import すると、\n" +
          "そこから全アダプタへ経路が通ってしまいます。\n" +
          "直接依存だけを見るルールはこれを検出できないため、到達可能性で塞いでいます。",
        fix:
          "型が欲しいだけならポート (型) を直接 import します。\n" +
          "コンテキストが要求するサービスの型は、実装から導出せずポートを列挙して組み立てます。",
      }),
      from: { path: PORT_SIDE },
      to: { path: IMPL_LAYER, reachable: true },
    },

    // ---- 契約の扱い (移行元の generated-only-from-presentation に対応) ----
    {
      name: "contract-only-from-presentation",
      severity: "error",
      comment: message({
        violation:
          "presentation 以外の層が @orpc-prac/contract (API 契約) を参照しています。",
        reason:
          "契約は API の語彙であって、ドメインの語彙ではありません。\n" +
          "内側に漏らすと契約を変えるたびにドメインまで書き換えが波及し、\n" +
          "「契約の都合」と「業務の都合」が混ざります。\n" +
          "値オブジェクトを契約と別に定義しているのも同じ理由です (設計関連/ADR-02)。",
        fix:
          "controller が契約の型で受け取り、ユースケースの入力へ組み替えて内側へ渡します\n" +
          "(設計関連/ADR-05)。ドメインの検証規則は契約と別に書きます。",
      }),
      // dependencyTypes は指定しない。ワークスペースの契約は exports マップ越しの
      // ため dependency-cruiser が解決できず、種別が "unknown" になる (実測)。
      // "npm" で絞ると当たらないので、モジュール名そのもので見る。
      from: { pathNot: "^src/(contexts/[^/]+|shared)/presentation/" },
      to: { path: "^@orpc-prac/contract" },
    },

    // ---- CQRS の非対称 ----
    {
      name: "query-not-to-write-model",
      severity: "error",
      comment: message({
        violation:
          "クエリ側 (*-query.ts / *-query-service.ts) が書き込みモデル\n" +
          "(集約 または Repository ポート) を参照しています。",
        reason:
          "読み取りは集約を復元しません。読み取りに不変条件の強制は要らないからで、\n" +
          "そのぶん必要な列だけを引いて射影 (DTO) をそのまま返せます。\n" +
          "集約を掴むと、その利点を捨てたうえ「読むために書き込みモデルが要る」形になり、\n" +
          "集約の項目が変わるたびに読み取り経路まで壊れます。\n" +
          "Repository を掴むのはさらに悪く、create / deleteById まで握るため\n" +
          "クエリと名乗るモジュールから書き込みができてしまいます。",
        fix:
          "必要な項目だけを持つ射影の型を query 側に定義し、SELECT でその形を直接作ります\n" +
          "(get-user-query.ts の GetUserQueryOutput と、その実装)。\n" +
          "値オブジェクトとドメインサービスは許可しています。前者は語彙、後者は認可などの判定で、\n" +
          "どちらも集約の復元にはあたりません。",
      }),
      from: {
        path: "^src/contexts/[^/]+/(application|public)/.*-query(-service)?\\.ts$",
      },
      to: {
        path: [
          // 集約本体 (domain/model/ 直下)。value-objects/ は 1 階層下なので当たらない。
          "^src/contexts/[^/]+/domain/model/[^/]+\\.ts$",
          // 書き込みポート。
          "^src/contexts/[^/]+/domain/[^/]+-repository\\.ts$",
        ],
      },
    },

    // ---- 共有基盤の向き ----
    {
      name: "shared-not-to-contexts",
      severity: "error",
      comment: message({
        violation:
          "shared (共有基盤) が contexts を参照しています。依存が逆向きです。",
        reason:
          "共有基盤が個別コンテキストを知ると、コンテキストを 1 つ増やすたびに\n" +
          "shared を書き換えることになり、共有基盤が全体の変更点になります。",
        fix:
          "向きを逆にします (contexts が shared を使う)。\n" +
          "実装同士の結線が必要な場合に限り、合成ルート (src/app-deps.ts) に書きます。",
      }),
      from: { path: "^src/shared/" },
      to: { path: "^src/contexts/" },
    },

    // ---- コンテキストの境界 (oxlint では表現できない後方参照) ----
    {
      name: "cross-context-public-only",
      severity: "error",
      comment: message({
        violation: "他コンテキストの非公開な部分を直接参照しています。",
        reason:
          "コンテキストの外から使われる前提があるのは、公開面 (public/) と\n" +
          "値オブジェクト (domain/model/value-objects/) だけです。\n" +
          "それ以外は相手の内部で、参照すると 2 つの壊れ方をします。\n" +
          "  リポジトリ → create / deleteById まで一緒に握ることになり、\n" +
          "               相手の command を通さない書き込みができてしまう\n" +
          "  集約       → 相手の業務ルールが変わるたびにこちらが壊れる",
        fix:
          "相手コンテキストの public/ にあるポートを参照します。\n" +
          "必要なポートが無ければ相手側に用意してもらいます\n" +
          "(DDD の Customer/Supplier: 使う側の要求を供給側が受けて公開する)。\n" +
          "識別子だけが要るなら値オブジェクトを参照します (集約は ID で参照する)。",
      }),
      from: { path: "^src/contexts/([^/]+)/" },
      to: {
        path: "^src/contexts/[^/]+/",
        pathNot: [
          "^src/contexts/$1/",
          "^src/contexts/[^/]+/public/",
          "^src/contexts/[^/]+/domain/model/value-objects/",
        ],
      },
    },
  ],

  options: {
    // パーサーに swc を使う。dependency-cruiser の tsc パーサーは
    // typescript@>=2 <7 しかサポートしておらず、TypeScript 7 では 1 ファイルも
    // 解析できない (0 modules cruised になる)。swc は TS の構文解析を自前で行うため
    // TS のバージョンに縛られない。import type も依存として拾う。
    parser: "swc",

    // tsconfig の paths (~/* → ./src/*) を解決させる。
    // これが無いと "~/shared/..." が未解決のままになり、ルールが素通りする。
    tsConfig: { fileName: "tsconfig.json" },

    doNotFollow: { path: "node_modules" },

    // テストとモックは境界検査の対象にしない。ここのルールが守っているのは
    // 本番コードの構造で、テストは元からその外側にいる。
    // とくに API テストは app を組み立てるため、合成ルートと同じく全アダプタへ
    // 経路が繋がる (presentation/__tests__/ は PORT_SIDE に含まれる)。
    exclude: { path: "(__tests__|__mocks__)/" },
  },
};
