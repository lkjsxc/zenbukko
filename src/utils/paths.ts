import os from 'node:os';
import path from 'node:path';

export function getDefaultConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && xdg.trim()) return xdg;
  return path.join(os.homedir(), '.config');
}

export function getDefaultSessionPath(): string {
  return path.join(getDefaultConfigDir(), 'zenbukko', 'session.json');
}
