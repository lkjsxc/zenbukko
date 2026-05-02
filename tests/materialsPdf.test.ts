import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { classifyMaterialForPdf, generatedPdfRelativePath } from '../src/services/materials/pdfPlan.js';
import { pdfFilesFromMaterialsManifest } from '../src/services/geminiOcrDiscovery.js';
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

test('pdfFilesFromMaterialsManifest prefers ready normalized pdf entries', () => {
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

  assert.deepEqual(pdfFilesFromMaterialsManifest(manifest), ['assets/file.pdf', 'pdf/image.pdf', 'pdf/reference.pdf']);
});
