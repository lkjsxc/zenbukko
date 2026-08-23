import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Command } from 'commander';
import { normalizeJobRequest } from '../src/api/requests.js';
import { registerDownloadCommands } from '../src/cli/downloadCommands.js';
import { resolveLessonCaptureModes } from '../src/commands/download/lessonRunner.js';
import { selectConfirmationTests } from '../src/commands/download/lessonSelection.js';
import {
  ARCHIVE_OPTION_LABELS,
  DEFAULT_CONFIRMATION_TESTS,
  DEFAULT_MEDIA,
  normalizeArchiveOptionState,
} from '../web-ui/src/views/archiveOptions.js';

test('Archive processing options expose independent media, materials, and confirmation-test choices', () => {
  assert.equal(DEFAULT_MEDIA, true);
  assert.equal(DEFAULT_CONFIRMATION_TESTS, true);
  assert.deepEqual(ARCHIVE_OPTION_LABELS, [
    'Download media',
    'Transcribe media',
    'Download materials',
    'Download confirmation tests',
    'Run PDF OCR (includes materials)',
    'Delete media after transcript',
  ]);
});

test('download job requests normalize media and material processing dependencies', () => {
  const defaults = normalizeJobRequest('download', {
    learningUrl: 'https://www.nnn.ed.nico/courses/12345',
  });
  const disabled = normalizeJobRequest('download-all', { media: false, confirmationTests: false });
  const required = normalizeJobRequest('download-all', {
    media: false,
    transcribe: true,
    materials: false,
    ocrMaterials: true,
  });

  assert.equal(defaults.media, true);
  assert.equal(defaults.confirmationTests, true);
  assert.equal(disabled.media, false);
  assert.equal(disabled.confirmationTests, false);
  assert.equal(required.media, true);
  assert.equal(required.materials, true);
});

test('CLI media and confirmation-test options default on and support explicit opt-out', () => {
  assert.equal(downloadOptions([]).media, true);
  assert.equal(downloadOptions([]).confirmationTests, true);
  assert.equal(downloadOptions(['--no-media']).media, false);
  assert.equal(downloadOptions(['--no-confirmation-tests']).confirmationTests, false);
});

test('Archive dependencies force required inputs without mutating the requested state', () => {
  const requested = {
    media: false,
    transcribe: true,
    materials: false,
    confirmationTests: false,
    ocrMaterials: true,
    cleanup: true,
  };
  assert.deepEqual(normalizeArchiveOptionState(requested), {
    ...requested,
    media: true,
    materials: true,
  });
  assert.equal(requested.media, false);
  assert.equal(requested.materials, false);
});

test('lesson capture modes allow materials without requesting media', () => {
  assert.deepEqual(resolveLessonCaptureModes({
    media: false,
    transcribe: false,
    materials: true,
    ocrMaterials: false,
  }), { media: false, materials: true });
  assert.deepEqual(resolveLessonCaptureModes({
    media: false,
    transcribe: true,
    materials: false,
    ocrMaterials: false,
  }), { media: true, materials: false });
});

test('unchecked confirmation tests are excluded without mutating discovery results', () => {
  const confirmationTests = [{ chapterId: 1, testId: 2, contentUrl: 'https://www.nnn.ed.nico/test/2' }];
  const structure = { confirmationTests };

  assert.deepEqual(selectConfirmationTests(structure, false), []);
  assert.equal(selectConfirmationTests(structure, true), confirmationTests);
  assert.equal(structure.confirmationTests, confirmationTests);
});

function downloadOptions(args: string[]): Record<string, unknown> {
  const program = new Command();
  registerDownloadCommands(program);
  const command = program.commands.find((candidate) => candidate.name() === 'download');
  assert.ok(command);
  command.parseOptions(args);
  return command.opts();
}
