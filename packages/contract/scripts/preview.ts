import { spawnSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'

import swaggerUiDist from 'swagger-ui-dist'

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
const port = Number(process.env.PORT ?? 4000)
const packageRoot = join(import.meta.dirname, '..')

// swagger-ui-dist は CommonJS のため、名前付き import ではなく default 経由で取る。
const uiPath = swaggerUiDist.getAbsoluteFSPath()

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

/** node:http は content-type を付けないので、配る拡張子ぶんだけ持つ。 */
const CONTENT_TYPE: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
}

/**
 * 仕様を取り出す。
 *
 * 読むのは dist だが、**要求のたびに焼き直してから読む**ので画面は常に最新になる。
 * 差分ビルドは実測 0.13 秒で、watch を別プロセスで走らせるより後始末が確実。
 * ESM は一度読んだモジュールを使い回すため、クエリを変えて読み直させる。
 */
let revision = 0
const buildAndLoadSpec = async () => {
  const build = spawnSync(join(packageRoot, 'node_modules/.bin/tsc'), ['--build'], {
    cwd: packageRoot,
    encoding: 'utf8',
  })
  if (build.status !== 0) {
    throw new Error(`${build.stdout ?? ''}${build.stderr ?? ''}`.trim())
  }

  const { generateOpenApiSpec } = (await import(
    `../dist/openapi.js?rev=${(revision += 1)}`
  )) as typeof import('../dist/openapi.js')
  return generateOpenApiSpec()
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${port}`)

  if (pathname === '/openapi.json') {
    try {
      const spec = await buildAndLoadSpec()
      res.writeHead(200, { 'content-type': CONTENT_TYPE['.json'] as string })
      res.end(JSON.stringify(spec))
    } catch (error) {
      // 型エラーは画面に出す。ここで気づけないと、古い仕様を見続けることになる。
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(`契約のビルドに失敗した\n\n${(error as Error).message}`)
    }
    return
  }
  if (pathname === '/swagger-initializer.js') {
    res.writeHead(200, { 'content-type': CONTENT_TYPE['.js'] as string })
    res.end(initializer)
    return
  }

  // 配布物の外を読ませない (`..` を含むパスへの保険)。
  const filePath = normalize(join(uiPath, pathname === '/' ? 'index.html' : pathname))
  if (!filePath.startsWith(uiPath + sep)) {
    res.writeHead(403).end('Forbidden')
    return
  }

  try {
    await stat(filePath)
  } catch {
    res.writeHead(404).end('Not Found')
    return
  }

  const type = CONTENT_TYPE[extname(filePath)]
  res.writeHead(200, type ? { 'content-type': type } : {})
  createReadStream(filePath).pipe(res)
})

server.listen(port, () => {
  console.log(`📘 契約プレビュー: http://localhost:${port}/`)
  console.log(`   OpenAPI 仕様  : http://localhost:${port}/openapi.json`)
  console.log('   契約を編集したらブラウザを再読み込みする。')
})
