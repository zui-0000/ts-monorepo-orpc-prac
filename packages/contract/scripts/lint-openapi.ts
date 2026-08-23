import { Spectral } from '@stoplight/spectral-core'
import { oas } from '@stoplight/spectral-rulesets'

import { generateOpenApiSpec } from '../src/openapi.ts'

/**
 * 契約から生成した OpenAPI 仕様を検査する。
 *
 * **ファイルには書き出さない。** 検査したいのは契約の姿であって、
 * その写しではない。生成した仕様をそのまま Spectral に渡す。
 *
 * 型検査では見つからない指摘 (説明の欠落、タグの未定義、例の不足) を拾う。
 * 直すのは常に契約側で、仕様は派生物なので触らない。
 */
const spectral = new Spectral()

spectral.setRuleset({
  extends: [[oas as never, 'recommended']],
  rules: {
    // 問い合わせ先とライセンスは、公開 API になったときに考える。
    'info-contact': 'off',
    'info-license': 'off',
    'license-url': 'off',
  },
})

const SEVERITY = ['error', 'warn', 'info', 'hint'] as const

// servers は配信側 (backend) が渡すもので契約は知らない。
// 検査に必要なだけなので、ここでは仮の値を置く。
const spec = await generateOpenApiSpec({ servers: [{ url: "/api" }] })
const results = await spectral.run(spec as never)

if (results.length === 0) {
  console.log('✅ OpenAPI 仕様に指摘なし')
  process.exit(0)
}

for (const r of results) {
  const level = SEVERITY[r.severity] ?? 'info'
  const at = r.path.join('.') || '(root)'
  console.log(`[${level}] ${r.code}\n  ${r.message}\n  at ${at}\n`)
}

const errors = results.filter((r) => r.severity === 0).length
const warnings = results.length - errors
console.log(`✗ ${errors} errors / ▲ ${warnings} warnings`)

// error があるときだけ落とす。warning は気づけば十分なので通す。
process.exit(errors > 0 ? 1 : 0)
