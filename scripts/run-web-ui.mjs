import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(root, 'web-ui');
const commands = {
  build: {
    entry: path.join(webRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
    args: ['build'],
  },
  'type-check': {
    entry: path.join(webRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
    args: ['--noEmit'],
  },
};

const command = process.argv[2];
const selected = commands[command];
if (!selected) {
  console.error(`Unknown Web UI command: ${command ?? '(missing)'}`);
  process.exitCode = 2;
} else if (!existsSync(selected.entry)) {
  console.error([
    'Web UI dependencies are missing.',
    'Run `npm --prefix web-ui ci` or `pnpm install --no-lockfile`, then retry.',
  ].join('\n'));
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, [selected.entry, ...selected.args], {
    cwd: webRoot,
    stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
}
