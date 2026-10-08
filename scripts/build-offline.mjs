#!/usr/bin/env node
// Rebuilds the self-contained app in ./app-dist. Works in cmd, VS Code
// terminal and bash:   node scripts/build-offline.mjs
//
// Needs npm access (public registry or Nexus). The output runs with plain
// `node`: no node_modules and no `npm install` inside the Databricks App.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

function step(title, cmd, args) {
  console.log(`==> ${title}`);
  // npm is npm.cmd on Windows, which needs a shell
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    console.error(`ERROR: "${title}" failed (exit code ${r.status})`);
    process.exit(1);
  }
}

step('Installing build dependencies', 'npm', ['ci', '--no-audit', '--no-fund']);
step('Building client (React) and server (single bundled file)', 'npm', ['run', 'build']);

console.log('==> Assembling app-dist/');
for (const part of ['server', 'client']) {
  rmSync(join('app-dist', part, 'dist'), { recursive: true, force: true });
  cpSync(join(part, 'dist'), join('app-dist', part, 'dist'), { recursive: true });
}

// Sanity check: the bundle must start with no node_modules anywhere near it.
console.log('==> Verifying app-dist runs without node_modules');
const tmp = mkdtempSync(join(tmpdir(), 'risk-ai-check-'));
cpSync('app-dist', tmp, { recursive: true });
const server = spawn(process.execPath, [join(tmp, 'server', 'dist', 'index.mjs')], {
  env: { ...process.env, PORT: '38123', NODE_ENV: 'production', UI_PREVIEW: 'true' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));

let ok = false;
for (let i = 0; i < 30 && !ok; i++) {
  try {
    ok = (await fetch('http://localhost:38123/ping')).ok;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}
server.kill();
await new Promise((r) => setTimeout(r, 300));
rmSync(tmp, { recursive: true, force: true });
if (!ok) {
  console.error('ERROR: bundled server did not start. Log:\n' + log);
  process.exit(1);
}
console.log('==> Done. app-dist/ is ready to deploy.');
