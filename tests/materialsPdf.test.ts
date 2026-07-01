import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { classifyMaterialForPdf, generatedPdfRelativePath } from '../src/services/materials/pdfPlan.js';
import { discoverPdfFiles, pdfFilesFromMaterialsManifest } from '../src/services/ocr/discovery.js';
import { normalizeAggregateSection } from '../src/services/ocr/aggregate.js';
import type { MaterialsManifest } from '../src/services/materials/types.js';

test('classifyMaterialForPdf identifies supported normalization inputs', () => {
  assert.equal(classifyMaterialForPdf('reference_page.html'), 'html');
  assert.equal(classifyMaterialForPdf('assets/photo.JPG'), 'image');
  assert.equal(classifyMaterialForPdf('assets/notes.md'), 'text');
  assert.equal(classifyMaterialForPdf('assets/slides.pdf'), 'source-pdf');
  assert.equal(classifyMaterialForPdf('assets/slides.pptx'), 'unsupported');
});

test('generatedPdfRelativePath is stable and isolated under pdf directory', () => {
  const first = generatedPdfRelativePath(path.join('assets', 'notes.md'));
  const second = generatedPdfRelativePath(path.join('assets', 'notes.md'));
  assert.equal(first, second);
  assert.match(first, /^pdf\/notes_[a-f0-9]{10}\.pdf$/);
});

test('pdfFilesFromMaterialsManifest prefers asset pdf entries and preserves order', () => {
  const manifest: MaterialsManifest = {
    generatedAt: '2026-05-02T00:00:00.000Z',
    referencePages: [{ url: 'https://example.test/ref', file: 'reference.html', pdfFile: 'pdf/reference.pdf', ocrEligible: true }],
    assets: [
      { sourcePageUrl: 'https://example.test/ref', url: 'https://example.test/file.pdf', file: 'assets/file.pdf' },
      { sourcePageUrl: 'https://example.test/ref', url: 'https://example.test/image.png', file: 'assets/image.png', pdfFile: 'pdf/image.pdf', ocrEligible: true },
    ],
    pdfs: [
      { sourceFile: 'reference.html', pdfFile: 'pdf/reference.pdf', kind: 'html', status: 'ready' },
      { sourceFile: 'assets/broken.png', pdfFile: 'pdf/broken.pdf', kind: 'image', status: 'failed', message: 'boom' },
    ],
  };

  assert.deepEqual(pdfFilesFromMaterialsManifest(manifest), ['assets/file.pdf', 'pdf/image.pdf']);
});

test('discoverPdfFiles falls back to recursive PDF discovery when manifest is malformed', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-bad-manifest-'));
  await fs.mkdir(path.join(root, 'nested'), { recursive: true });
  const badManifest = path.join(root, 'materials_manifest.json');
  const topPdf = path.join(root, 'root.pdf');
  const nestedPdf = path.join(root, 'nested', 'nested.pdf');
  await fs.writeFile(badManifest, '{not-json', 'utf8');
  await fs.writeFile(topPdf, 'pdf');
  await fs.writeFile(nestedPdf, 'pdf');

  const warnings: string[] = [];
  const files = await discoverPdfFiles(root, { warn: (message) => warnings.push(message) });

  assert.deepEqual(files, [topPdf, nestedPdf].sort());
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Skipping malformed materials manifest: .*materials_manifest\.json/);
});

test('normalizeAggregateSection keeps slide titles at H2 and sections below them', () => {
  const markdown = ['### Slide Title', '', '#### Section', '', 'text', '', '# Another Slide'].join('\n');
  assert.equal(normalizeAggregateSection(markdown), ['## Slide Title', '', '### Section', '', 'text', '', '## Another Slide'].join('\n'));
});
