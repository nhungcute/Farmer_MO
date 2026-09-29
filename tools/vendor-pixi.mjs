import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repositoryRoot, 'node_modules', 'pixi.js', 'dist', 'pixi.mjs');
const target = path.join(repositoryRoot, 'apps', 'web', 'public', 'vendor', 'pixi.mjs');

await mkdir(path.dirname(target), { recursive: true });
await copyFile(source, target);
console.log(`Pixi vendor ready: ${path.relative(repositoryRoot, target)}`);
