import { runCli } from './lib/named-tunnel-runtime.mjs';

const action = process.argv[2];
if (!['start', 'status', 'stop'].includes(action) || process.argv.length !== 3) {
  console.error('USAGE: node tools/tunnel.mjs start|status|stop');
  process.exitCode = 1;
} else await runCli(action);
