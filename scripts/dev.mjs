import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const procs = [
  spawn(npmCmd, ['--workspace=server', 'run', 'dev'], { stdio: 'inherit' }),
  spawn(npmCmd, ['--workspace=web', 'run', 'dev'], { stdio: 'inherit' }),
];

function shutdown() {
  for (const p of procs) {
    if (!p.killed) p.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
