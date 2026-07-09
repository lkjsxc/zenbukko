import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHash, routeToHash } from '../web-ui/src/router/hash.ts';

test('router parses every documented route', () => {
  assert.deepEqual(parseHash('#/'), { name: 'dashboard' });
  assert.deepEqual(parseHash('#/session'), { name: 'session' });
  assert.deepEqual(parseHash('#/courses'), { name: 'courses' });
  assert.deepEqual(parseHash('#/archive?courseId=42'), { name: 'archive', courseId: '42' });
  assert.deepEqual(parseHash('#/jobs/job%201'), { name: 'jobs', jobId: 'job 1' });
  assert.deepEqual(parseHash('#/outputs'), { name: 'outputs' });
  assert.deepEqual(parseHash('#/settings'), { name: 'settings' });
});

test('router serializes dynamic routes safely', () => {
  assert.equal(routeToHash({ name: 'archive', courseId: '12 3' }), '#/archive?courseId=12%203');
  assert.equal(routeToHash({ name: 'jobs', jobId: 'job/1' }), '#/jobs/job%2F1');
  assert.deepEqual(parseHash(routeToHash({ name: 'jobs', jobId: 'job/1' })), { name: 'jobs', jobId: 'job/1' });
  assert.deepEqual(parseHash('#/unknown'), { name: 'dashboard' });
});
