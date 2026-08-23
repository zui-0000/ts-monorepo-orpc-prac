import { getAbsoluteFSPath } from 'swagger-ui-dist'

import { generateOpenApiSpec } from '../src/openapi.ts'

/**
 * 契約のプレビュー用サーバー（開発時のみ）。
 *
 * **契約を書き換えたとき、その場で OpenAPI の姿を確かめるためのもの。**
 * 実装 (apps/backend) を起動しなくても、契約だけで完結して確認できる。
 *
 * 画面は swagger-ui-dist の配布物をそのまま配る。差し替えるのは初期化スクリプト
 * (既定で petstore を指している) だけで、HTML や CSS は持たない。
 *
 * このディレクトリはビルド対象 (src) の外にあるため dist には入らない。
 */
const port = Number(Bun.env.PORT ?? 4000)
const uiPath = getAbsoluteFSPath()

/** swagger-ui-dist の既定 (petstore) を、この契約の仕様に向け直す。 */
const initializer = `window.onload = () => {
  window.ui = SwaggerUIBundle({
    url: '/openapi.json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    layout: 'StandaloneLayout',
  })
}
`

const server = Bun.serve({
  port,
  fetch: async (req) => {
    const { pathname } = new URL(req.url)

    // 毎回生成する。--hot で契約を書き換えたら、再読み込みで即座に反映される。
    if (pathname === '/openapi.json') {
      return Response.json(await generateOpenApiSpec())
    }
    if (pathname === '/swagger-initializer.js') {
      return new Response(initializer, {
        headers: { 'content-type': 'text/javascript; charset=utf-8' },
      })
    }

    const file = Bun.file(
      `${uiPath}${pathname === '/' ? '/index.html' : pathname}`,
    )
    return (await file.exists())
      ? new Response(file)
      : new Response('Not Found', { status: 404 })
  },
})

console.log(`📘 契約プレビュー: ${server.url}`)
console.log(`   OpenAPI 仕様  : ${server.url}openapi.json`)
