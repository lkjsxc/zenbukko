import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUTH_LOGIN_PAGE_SCALE, authBrowserLaunchArgs } from '../src/services/auth.js';

test('auth browser opens with a quarter-scale login view', () => {
  assert.equal(AUTH_LOGIN_PAGE_SCALE, 0.25);
  assert.deepEqual(authBrowserLaunchArgs(), [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--force-device-scale-factor=0.25',
  ]);
});
