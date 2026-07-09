import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUTH_LOGIN_PAGE_ZOOM_PERCENT, authBrowserLaunchArgs, authLoginPageZoom } from '../src/services/auth.js';

test('auth browser uses CSS zoom without changing Chromium device scale', () => {
  const launchArgs = authBrowserLaunchArgs();

  assert.equal(AUTH_LOGIN_PAGE_ZOOM_PERCENT, 25);
  assert.equal(authLoginPageZoom(), '25%');
  assert.deepEqual(launchArgs, ['--no-sandbox', '--disable-setuid-sandbox']);
  assert.equal(launchArgs.some((arg) => arg.includes('scale')), false);
});
