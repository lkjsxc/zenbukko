import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialState, reduce } from '../web-ui/src/state/store.ts';
import { LOG_HISTORY_TRUNCATED, MAX_LOG_TEXT_CHARACTERS } from '../web-ui/src/utils/logText.ts';

test('toast queue preserves notifications and dismisses one', () => {
  const first = reduce(initialState(), { type: 'SHOW_TOAST', message: 'Saved', kind: 'success' });
  const second = reduce(first, { type: 'SHOW_TOAST', message: 'Failed', kind: 'error' });

  assert.deepEqual(second.toasts.map((toast) => toast.message), ['Saved', 'Failed']);
  const dismissed = reduce(second, { type: 'DISMISS_TOAST', id: first.toasts[0].id });
  assert.deepEqual(dismissed.toasts.map((toast) => toast.message), ['Failed']);
});

test('output filter survives preview transitions', () => {
  const filtered = reduce(initialState(), { type: 'SET_OUTPUT_FILTER', filter: 'pdf' });
  const selected = reduce(filtered, { type: 'SELECT_OUTPUT', path: 'course/book.pdf' });
  const ready = reduce(selected, { type: 'SET_OUTPUT_PREVIEW_STATUS', status: 'ready' });

  assert.equal(ready.outputFilter, 'pdf');
  assert.equal(ready.selectedOutputPath, 'course/book.pdf');
  assert.equal(ready.outputPreviewStatus, 'ready');
});

test('selecting a different job clears only its log', () => {
  const withLog = reduce(initialState(), { type: 'APPEND_LOG', line: 'first' });
  const selected = reduce(withLog, { type: 'SELECT_JOB', jobId: 'job-2' });

  assert.equal(selected.logText, '');
  assert.equal(selected.selectedJobId, 'job-2');
});

test('log output keeps a bounded recent tail', () => {
  let state = initialState();
  for (let index = 0; index < 5; index += 1) {
    state = reduce(state, { type: 'APPEND_LOG', line: `old-${index}:${'x'.repeat(7000)}` });
  }
  const next = reduce(state, { type: 'APPEND_LOG', line: 'latest line' });

  assert.ok(next.logText.length <= MAX_LOG_TEXT_CHARACTERS);
  assert.ok(next.logText.startsWith(LOG_HISTORY_TRUNCATED));
  assert.match(next.logText, /latest line/);
});

test('stream status updates preserve loaded resources', () => {
  const jobs = [{ id: '1', kind: 'download', status: 'running' as const, createdAt: '', updatedAt: '', title: 'Course' }];
  const loaded = reduce(initialState(), { type: 'SET_JOBS', jobs });
  const reconnecting = reduce(loaded, { type: 'SET_STREAM_STATUS', status: 'reconnecting' });

  assert.deepEqual(reconnecting.jobs, jobs);
  assert.equal(reconnecting.streamStatus, 'reconnecting');
});
