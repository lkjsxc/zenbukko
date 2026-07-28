import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { downloadReportAssignments } from '../src/services/reportAssignments.js';

test('downloadReportAssignments writes readable chapter Markdown without scripts', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-report-assignments-'));
  const infos: string[] = [];
  const output = await downloadReportAssignments({
    assignments: [{ chapterId: 123, assignmentId: 456, title: '振り返りレポート', contentUrl: 'https://www.nnn.ed.nico/report/456' }],
    courseDir: root,
    chapterDirNameForId: () => '01',
    headers: { cookie: 'private' },
    logger: { info: (message) => infos.push(message), warn: () => undefined },
    fetchImpl: (async () => new Response('<html><body><main> 500字以内で書いてください。 <script>secret()</script> </main></body></html>')) as typeof fetch,
  });

  const expected = path.join(root, '01', 'chapter-123_report_assignments.md');
  assert.deepEqual(output, [expected]);
  assert.match(await fs.readFile(expected, 'utf8'), /## 01 振り返りレポート/);
  assert.match(await fs.readFile(expected, 'utf8'), /500字以内で書いてください。/);
  assert.doesNotMatch(await fs.readFile(expected, 'utf8'), /secret/);
  assert.equal(infos.length, 1);
});
