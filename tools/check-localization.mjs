import fs from 'node:fs';

const source = fs.readFileSync('apps/web/src/main.js', 'utf8');
const catalog = fs.readFileSync('apps/web/src/locales/vi-VN.js', 'utf8');
const used = [...source.matchAll(/\bt\(['"]([^'"]+)['"]/gu)].map((match) => match[1]);
const defined = new Set([...catalog.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9_]*)\s*:/gmu)].map((match) => match[1]));
const missing = [...new Set(used)].filter((key) => !defined.has(key));
if (missing.length) {
  console.error(`Localization missing vi-VN keys: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`Localization validation PASS: ${new Set(used).size} UI keys resolved in vi-VN.`);
}
