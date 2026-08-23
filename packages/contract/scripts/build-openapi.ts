import { mkdirSync, writeFileSync } from "node:fs";

import { generateOpenApiSpec } from "../dist/openapi.js";

/**
 * 契約から OpenAPI 仕様を書き出す。
 *
 * 読み手は docker の swagger-ui (docker-compose.yaml) で、この 1 ファイルだけを
 * mount して表示する。dist と同じ生成物なので追跡しない (.gitignore)。
 *
 * **dist を読む。** src を直接読めないのは、Node が `./index.js` と書かれた
 * import を `index.ts` に読み替えないため (契約は nodenext なので .js と書く)。
 */
const OUT_DIR = "dist-openapi";

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  `${OUT_DIR}/openapi.json`,
  JSON.stringify(await generateOpenApiSpec(), null, 2),
);
