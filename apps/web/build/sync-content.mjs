import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const source = await readFile(path.join(root,'packages/content/index.mjs'),'utf8');
const target = path.join(root,'apps/web/src/ui/foundation/content.generated.mjs');
await mkdir(path.dirname(target),{recursive:true});
// A packaging artifact, never another editable content definition.
await writeFile(target,'// GENERATED from packages/content/index.mjs. DO NOT EDIT.\n'+source.replaceAll('\r\n','\n'),'utf8');
console.log('Canonical browser content generated from packages/content/index.mjs');
