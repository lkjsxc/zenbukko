import fs from 'node:fs/promises';
import path from 'node:path';

export async function listOutputs(root: string): Promise<Array<{ path: string; size: number; updatedAt: string }>> {
  const files = await walk(root);
  const out: Array<{ path: string; size: number; updatedAt: string }> = [];
  for (const file of files) {
    if (!/\.(md|txt|srt|vtt|html|json|pdf)$/i.test(file)) continue;
    const st = await fs.stat(file);
    out.push({ path: file, size: st.size, updatedAt: st.mtime.toISOString() });
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 300);
}

async function walk(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const entry of entries) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}
