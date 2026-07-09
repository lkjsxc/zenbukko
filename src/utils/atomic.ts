import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function writeTextAtomic(
  filePath: string,
  content: string,
  options: { mode?: number } = {},
): Promise<void> {
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(tempPath, content, { encoding: 'utf8', ...(options.mode ? { mode: options.mode } : {}) });
    await fs.rename(tempPath, filePath);
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
  }
}

export async function writeJsonAtomic(
  filePath: string,
  value: unknown,
  options: { mode?: number } = {},
): Promise<void> {
  await writeTextAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`, options);
}
