import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Command } from 'commander';
import { normalizeJobRequest } from '../src/api/requests.js';
import { registerDownloadCommands } from '../src/cli/downloadCommands.js';
import { selectConfirmationTests } from '../src/commands/download/lessonSelection.js';
import { ARCHIVE_OPTION_LABELS, DEFAULT_CONFIRMATION_TESTS } from '../web-ui/src/views/archive.ts';

test('Archive processing options place enabled confirmation tests between materials and OCR', () => {
  assert.equal(DEFAULT_CONFIRMATION_TESTS, true);
  assert.deepEqual(ARCHIVE_OPTION_LABELS, [
    'Transcribe media',
    'Download materials',
    'Download confirmation tests',
    'Run PDF OCR (includes materials)',
    'Delete media after transcript',
  ]);
});

test('download job requests default confirmation tests on and preserve an unchecked value', () => {
  const defaults = normalizeJobRequest('download', {
    learningUrl: 'https://www.nnn.ed.nico/courses/12345',
  });
  const disabled = normalizeJobRequest('download-all', { confirmationTests: false });

  assert.equal(defaults.confirmationTests, true);
  assert.equal(disabled.confirmationTests, false);
});

test('CLI confirmation-test option defaults on and supports explicit opt-out', () => {
  assert.equal(downloadOptions([]).confirmationTests, true);
  assert.equal(downloadOptions(['--no-confirmation-tests']).confirmationTests, false);
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
