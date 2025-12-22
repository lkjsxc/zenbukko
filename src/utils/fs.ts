import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readTextFileIfExists(filePath: string): Promise<string | null> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data;
  } catch {
    return null;
  }
}

export function safeBasename(name: string): string {
  const replaced = name
    .normalize('NFKC')
    .replaceAll(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
    .replaceAll(/\s+/g, ' ')
    .trim();
  return replaced.length ? replaced : 'untitled';
}

export function joinPath(...parts: string[]): string {
  return path.join(...parts);
}
