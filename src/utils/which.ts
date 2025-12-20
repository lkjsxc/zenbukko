import { access } from 'node:fs/promises';
import path from 'node:path';

export async function which(cmd: string): Promise<string | null> {
  const envPath = process.env.PATH ?? '';
  const dirs = envPath.split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    const full = path.join(dir, cmd);
    try {
      await access(full);
      return full;
    } catch {
      // ignore
    }
  }
  return null;
}
