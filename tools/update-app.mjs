import { runCli } from './lib/named-tunnel-runtime.mjs';

if (process.argv.slice(2).some((argument) => argument !== '--nginx')) {
  console.error('USAGE: node tools/update-app.mjs [--nginx]');
  process.exitCode = 1;
} else await runCli('update', { nginx: process.argv.includes('--nginx') });
