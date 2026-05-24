import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildReportPrompt, collectReportPromptSources, renderReportPrompt } from '../src/services/reportPrompt.js';

test('collectReportPromptSources prefers chapter aggregates over lesson fallbacks', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-report-prompt-'));
  await fs.mkdir(path.join(root, '01', '01', 'lesson-1_materials'), { recursive: true });
  await fs.writeFile(path.join(root, '01', 'chapter-111_ocr.md'), 'chapter ocr\n', 'utf8');
  await fs.writeFile(path.join(root, '01', 'chapter-111_transcription.md'), 'chapter voice\n', 'utf8');
  await fs.writeFile(path.join(root, '01', '01', 'lesson-1_materials', 'materials_ocr.md'), 'lesson ocr\n', 'utf8');
  await fs.writeFile(path.join(root, '01', '01', 'lesson-1_transcription.txt'), 'lesson voice\n', 'utf8');

  const sources = await collectReportPromptSources(root);

  assert.deepEqual(sources.map((s) => s.path), ['01/chapter-111_ocr.md', '01/chapter-111_transcription.md']);
  assert.deepEqual(sources.map((s) => s.kind), ['ocr', 'transcript']);
});

test('buildReportPrompt writes a topic-placeholder prompt from fallback sources', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-report-prompt-fallback-'));
  const materialsDir = path.join(root, 'course-1', '01', '01', 'lesson-1_materials');
  await fs.mkdir(materialsDir, { recursive: true });
  await fs.writeFile(path.join(materialsDir, 'materials_ocr.md'), '# Slide\n\ncontent\n', 'utf8');
  await fs.writeFile(path.join(root, 'course-1', '01', '01', 'lesson-1_transcription.txt'), 'voice memo\n', 'utf8');

  const outputPath = path.join(root, 'prompt.md');
  const result = await buildReportPrompt({ inputDir: root, outputPath, courseName: 'Math History' });
  const prompt = await fs.readFile(outputPath, 'utf8');

  assert.equal(result.sources.length, 2);
  assert.match(prompt, /Math History/);
  assert.match(prompt, /\{\{REPORT_TOPIC\}\}/);
  assert.match(prompt, /# Slide/);
  assert.match(prompt, /voice memo/);
  assert.match(prompt, /レポート本文のみを出力してください/);
});

test('renderReportPrompt omits missing source blocks without inventing content', () => {
  const prompt = renderReportPrompt({
    courseName: '{{COURSE_NAME}}',
    topic: 'Explain the lecture.',
    sources: [{ path: 'chapter.md', kind: 'ocr', text: 'only ocr' }],
  });

  assert.match(prompt, /only ocr/);
  assert.match(prompt, /\(Voice transcript is not available\.\)/);
  assert.doesNotMatch(prompt, /undefined/);
});
