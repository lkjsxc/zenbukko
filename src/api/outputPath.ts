import path from 'node:path';

export function resolveOutputFile(outputDir: string, relative: string): string {
  const trimmed = relative.trim();
  if (!trimmed) throw new Error('Path is required.');
  if (path.isAbsolute(trimmed)) throw new Error('Path must be relative to output directory.');
  if (trimmed.split(/[/\\]/).includes('..')) throw new Error('Path must not contain .. segments.');

  const root = path.resolve(outputDir);
  const resolved = path.resolve(root, trimmed);
  const rel = path.relative(root, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Path escapes output directory.');
  return resolved;
}

export function relativeOutputPath(outputDir: string, absolute: string): string {
  return path.relative(path.resolve(outputDir), absolute).split(path.sep).join('/');
}
