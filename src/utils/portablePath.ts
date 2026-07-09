import path from 'node:path';

type PathApi = Pick<typeof path, 'isAbsolute' | 'relative' | 'resolve' | 'sep'>;

export function assertPortableRelativePath(value: string): string {
  if (!value || value !== value.trim()) throw new Error('Path must be a non-empty canonical relative identifier.');
  if (value.includes('\0')) throw new Error('Path must not contain NUL.');
  if (value.includes('\\')) throw new Error('Path must use / separators.');
  if (value.includes(':')) throw new Error('Path must not contain a drive prefix or colon.');
  if (value.startsWith('/') || /^[a-zA-Z]:/.test(value)) throw new Error('Path must be relative.');
  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Path must not contain empty, . or .. segments.');
  }
  return value;
}

export function resolvePortablePath(root: string, identifier: string, pathApi: PathApi = path): string {
  const portable = assertPortableRelativePath(identifier);
  const absoluteRoot = pathApi.resolve(root);
  const resolved = pathApi.resolve(absoluteRoot, ...portable.split('/'));
  assertPathInside(absoluteRoot, resolved, pathApi);
  return resolved;
}

export function toPortableRelativePath(root: string, file: string, pathApi: PathApi = path): string {
  const absoluteRoot = pathApi.resolve(root);
  const absoluteFile = pathApi.resolve(file);
  assertPathInside(absoluteRoot, absoluteFile, pathApi);
  const relative = pathApi.relative(absoluteRoot, absoluteFile).split(pathApi.sep).join('/');
  return assertPortableRelativePath(relative);
}

export function assertPathInside(root: string, file: string, pathApi: PathApi = path): void {
  const relative = pathApi.relative(pathApi.resolve(root), pathApi.resolve(file));
  if (!relative) throw new Error('Path must identify a child of its configured root.');
  assertPathInsideOrEqual(root, file, pathApi);
}

export function assertPathInsideOrEqual(root: string, file: string, pathApi: PathApi = path): void {
  const relative = pathApi.relative(pathApi.resolve(root), pathApi.resolve(file));
  if (relative === '..' || relative.startsWith(`..${pathApi.sep}`) || pathApi.isAbsolute(relative)) {
    throw new Error('Path escapes its configured root.');
  }
}
