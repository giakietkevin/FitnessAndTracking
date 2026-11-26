import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, '..');
const serverDir = path.join(rootDir, 'server');
const webDir = path.join(rootDir, 'web');

const viteBin = [
  path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js'),
  path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js')
].find((p) => fs.existsSync(p));

if (!viteBin) {
  console.error('Không tìm thấy vite. Hãy chạy "npm install" ở thư mục gốc.');
  process.exit(1);
}

const procs = [
  spawn(process.execPath, ['--no-warnings', 'src/index.js'], {
    cwd: serverDir,
    stdio: 'inherit'
  }),
  spawn(process.execPath, [viteBin], {
    cwd: webDir,
    stdio: 'inherit'
  })
];

let exiting = false;
function killProc(proc) {
  if (!proc.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
  } else if (!proc.killed) {
    proc.kill('SIGTERM');
  }
}

function shutdown(code = 0) {
  if (exiting) return;
  exiting = true;
  for (const p of procs) {
    killProc(p);
  }
  process.exit(code);
}

for (const p of procs) {
  p.on('exit', (code) => {
    if (!exiting && code && code !== 0) shutdown(code);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
