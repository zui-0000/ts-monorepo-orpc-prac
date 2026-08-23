// ==========================================================================
// コミットメッセージ規約（commitlint）
// 形式: <type>(<scope 任意>): <説明>
//   例: feat: メッセージ一覧APIを追加
//       feat(message): 一覧を追加
//       fix: 起動時のNPEを修正
// ==========================================================================

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],

  rules: {
    // --- 文字数制限: 全て無効化 ---
    // 日本語は1文字の情報量が多く、既定の100文字だと本文の折り返しで
    // 誤検知しやすいため無効化する。
    "header-max-length": [0],
    "body-max-line-length": [0],
    "footer-max-line-length": [0],

    // --- 英語前提のチェック: 無効化 ---
    // 既定では subject 先頭の大文字を弾くため、日本語で書いていても
    // 「feat: NPEを修正」「feat: UserAPIを追加」のように
    // 英大文字の略語で始まると弾かれてしまう。実測で確認済み。
    "subject-case": [0],
  },

  // --- 以下は @commitlint/config-conventional の既定をそのまま使う ---
  // type-enum: build,chore,ci,docs,feat,fix,perf,refactor,revert,style,test
  //            （committed の allowed_types と完全一致）
  // scope-enum: 制限なし（scope は任意・名前自由）
  // subject-full-stop: 半角ピリオドの末尾を禁止
  //            ※ 全角の「。」は検出されない（committed も同じ挙動）
  //
  // merge / revert / fixup コミットは commitlint の defaultIgnores により
  // 自動でスキップされる。個別設定は不要。
};
