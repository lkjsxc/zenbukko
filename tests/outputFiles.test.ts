import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { relativeOutputPath, resolveExistingOutputFile, resolveOutputFile } from '../src/api/outputPath.js';
import { toPortableRelativePath } from '../src/utils/portablePath.js';

test('resolveOutputFile returns an OS-native absolute path', () => {
  const root = path.resolve('data', 'downloads');
  const resolved = resolveOutputFile(root, 'course-1/chapter.md');
  assert.equal(resolved, path.join(root, 'course-1', 'chapter.md'));
});

test('output identifiers are canonical portable relative paths', () => {
  const root = path.resolve('data', 'downloads');
  assert.equal(relativeOutputPath(root, path.join(root, '..notes.md')), '..notes.md');
  assert.equal(resolveOutputFile(root, '..notes.md'), path.join(root, '..notes.md'));

  for (const invalid of [
    '', ' course/file.md', 'course//file.md', 'course/./file.md', '../etc/passwd',
    '/etc/passwd', 'C:/Windows/file', 'C:\\Windows\\file', '\\\\server\\share\\file',
    'course\\file.md', 'course/file.md:stream',
  ]) {
    assert.throws(() => resolveOutputFile(root, invalid), invalid);
  }
});

test('portable serializer emits forward slashes for Windows paths', () => {
  const root = 'C:\\data\\downloads';
  const file = 'C:\\data\\downloads\\course-1\\chapter.md';
  assert.equal(toPortableRelativePath(root, file, path.win32), 'course-1/chapter.md');
  assert.throws(() => toPortableRelativePath(root, 'D:\\secret.txt', path.win32));
  assert.throws(() => toPortableRelativePath(root, 'C:\\data\\outside.txt', path.win32));
});

test('resolveExistingOutputFile rejects symlink escapes', async (context) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-output-path-'));
  const root = path.join(temp, 'outputs');
  const outside = path.join(temp, 'private');
  await fs.mkdir(root);
  await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, 'secret.txt'), 'private', 'utf8');
  const link = path.join(root, 'linked');
  try {
    await fs.symlink(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'EPERM') {
      context.skip('Host does not permit symlink creation.');
      return;
    }
    throw error;
  }

  await assert.rejects(resolveExistingOutputFile(root, 'linked/secret.txt'), /escapes/);
});
