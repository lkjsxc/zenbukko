import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUTH_LOGIN_ZOOM_OUT_STEPS, authBrowserLaunchArgs, authLoginZoomShortcutCount } from '../src/services/auth.js';

test('auth browser zooms out with the normal Chromium shortcut', () => {
  const launchArgs = authBrowserLaunchArgs();

  assert.equal(AUTH_LOGIN_ZOOM_OUT_STEPS, 2);
  assert.equal(authLoginZoomShortcutCount(), 2);
  assert.deepEqual(launchArgs, ['--no-sandbox', '--disable-setuid-sandbox']);
  assert.equal(launchArgs.some((arg) => arg.includes('scale')), false);
});
