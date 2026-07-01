import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ocrMaterialsCommand } from '../src/services/ocr/index.js';
import { Logger } from '../src/utils/log.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-local-ocr-smoke-'));
const chapterDir = path.join(root, 'course-1', '01');
const lessonDir = path.join(chapterDir, '01');
const materialsDir = path.join(lessonDir, 'lesson-101_materials');
const assetsDir = path.join(materialsDir, 'assets');

await fs.mkdir(assetsDir, { recursive: true });
await fs.writeFile(path.join(materialsDir, 'reference.html'), '<!doctype html><meta charset="utf-8"><h1>OCR Smoke Reference</h1>', 'utf8');
await fs.writeFile(path.join(assetsDir, 'fixture.txt'), 'ZENBUKKO LOCAL OCR SMOKE\nReadable fixture text for local OCR verification.\n', 'utf8');
await fs.writeFile(path.join(materialsDir, 'materials_manifest.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  referencePages: [{ url: 'https://example.test/courses/1/chapters/777/movies/101/references', file: 'reference.html' }],
  assets: [{ sourcePageUrl: 'https://example.test/ref', url: 'https://example.test/fixture.txt', file: 'assets/fixture.txt' }],
}, null, 2), 'utf8');

const logger = new Logger((process.env.LOG_LEVEL as 'silent' | 'error' | 'warn' | 'info' | 'debug' | undefined) ?? 'info');
const result = await ocrMaterialsCommand({
  inputDir: materialsDir,
  force: true,
  ndlocrCommand: process.env.ZENBUKKO_NDLOCR_CMD?.trim() || 'ndlocr-lite',
  ndlocrDevice: process.env.ZENBUKKO_NDLOCR_DEVICE === 'cuda' ? 'cuda' : 'cpu',
  ocrPageDpi: Number(process.env.ZENBUKKO_OCR_PAGE_DPI || 300),
  ndlocrEnableTcy: process.env.ZENBUKKO_NDLOCR_ENABLE_TCY !== 'false',
  logger,
});

assert.ok(result.results.some((entry) => entry.status === 'written'), 'expected at least one written OCR result');
assert.ok(await hasText(path.join(materialsDir, 'materials_ocr.md')), 'expected materials_ocr.md');
assert.ok(await hasText(path.join(materialsDir, 'materials_ocr_manifest.json')), 'expected materials_ocr_manifest.json');
assert.ok(await hasText(path.join(chapterDir, 'chapter-777_ocr.md')), 'expected chapter OCR aggregate');
logger.info(`Local OCR smoke passed in ${root}`);

async function hasText(filePath: string): Promise<boolean> {
  const text = await fs.readFile(filePath, 'utf8').catch(() => '');
  return text.trim().length > 0;
}
