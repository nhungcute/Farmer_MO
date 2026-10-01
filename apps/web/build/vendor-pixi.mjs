import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const target = path.join(repositoryRoot, 'apps/web/public/vendor/pixi.mjs');
await mkdir(path.dirname(target), { recursive: true });

// The official polyfills replace runtime code generation with ordinary functions.
// Bundle them with Pixi so they patch the same classes the renderer imports.
await build({
  absWorkingDir: repositoryRoot,
  stdin: {
    contents: "import 'pixi.js/unsafe-eval'; export * from 'pixi.js';",
    resolveDir: repositoryRoot,
    sourcefile: 'pixi-csp-entry.mjs',
    loader: 'js',
  },
  outfile: target,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'inline',
});
console.log(`Pixi CSP vendor ready: ${path.relative(repositoryRoot, target)}`);
