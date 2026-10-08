#!/usr/bin/env node
// Cross-platform "VAR=value command" (works in cmd, VS Code terminal and bash).
// Usage: node scripts/with-env.mjs NAME=value [NAME2=value2 ...] -- <command...>
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const sep = args.indexOf('--');
if (sep === -1 || sep === args.length - 1) {
  console.error('Usage: node scripts/with-env.mjs NAME=value -- <command...>');
  process.exit(1);
}
const env = { ...process.env };
for (const pair of args.slice(0, sep)) {
  const i = pair.indexOf('=');
  env[pair.slice(0, i)] = pair.slice(i + 1);
}
const [cmd, ...rest] = args.slice(sep + 1);
const child = spawn(cmd, rest, {
  env,
  stdio: 'inherit',
  // npm is npm.cmd on Windows, which needs a shell to resolve
  shell: process.platform === 'win32',
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
