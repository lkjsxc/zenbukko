import fs from 'node:fs/promises';
import path from 'node:path';

export type LineLimitViolation = {
  file: string;
  lines: number;
  limit: number;
  kind: 'docs' | 'source';
};

export type LineLimitOptions = {
  root: string;
  docsLimit: number;
  sourceLimit: number;
};

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'data', 'whisper.cpp']);

export async function checkLineLimits(options: LineLimitOptions): Promise<LineLimitViolation[]> {
  const files = await walk(options.root);
  const violations: LineLimitViolation[] = [];
  for (const file of files) {
    const rel = path.relative(options.root, file);
    const kind = classify(rel);
    if (!kind) continue;
    const limit = kind === 'docs' ? options.docsLimit : options.sourceLimit;
    const lines = countLines(await fs.readFile(file, 'utf8'));
    if (lines > limit) violations.push({ file: rel, lines, limit, kind });
  }
  return violations.sort((a, b) => a.file.localeCompare(b.file));
}

export function countLines(text: string): number {
  if (text.length === 0) return 0;
  return text.endsWith('\n') ? text.split('\n').length - 1 : text.split('\n').length;
}

function classify(relPath: string): 'docs' | 'source' | undefined {
  const ext = path.extname(relPath);
  if (relPath.startsWith(`docs${path.sep}`) && ext === '.md') return 'docs';
  if (relPath === 'README.md') return 'docs';
  if (relPath.startsWith(`src${path.sep}`) && SOURCE_EXTS.has(ext)) return 'source';
  if (relPath.startsWith(`web-ui${path.sep}`) && SOURCE_EXTS.has(ext)) return 'source';
  if (relPath.startsWith(`scripts${path.sep}`) && SOURCE_EXTS.has(ext)) return 'source';
  return undefined;
}

async function walk(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}
