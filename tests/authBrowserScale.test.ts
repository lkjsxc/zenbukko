import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUTH_LOGIN_PAGE_SCALE_FACTOR, authBrowserLaunchArgs, authLoginPageScaleFactor } from '../src/services/auth.js';

test('auth browser opens the login page at 80 percent page scale', () => {
  const launchArgs = authBrowserLaunchArgs();

  assert.equal(AUTH_LOGIN_PAGE_SCALE_FACTOR, 0.8);
  assert.equal(authLoginPageScaleFactor(), 0.8);
  assert.deepEqual(launchArgs, ['--no-sandbox', '--disable-setuid-sandbox']);
  assert.equal(launchArgs.some((arg) => arg.includes('device-scale-factor')), false);
});
