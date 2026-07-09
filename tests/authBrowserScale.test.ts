import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUTH_BROWSER_WINDOW, authBrowserLaunchArgs, authBrowserWindowSizeArg } from '../src/services/auth.js';

test('auth browser opens in a larger window without device scale flags', () => {
  const launchArgs = authBrowserLaunchArgs();

  assert.deepEqual(AUTH_BROWSER_WINDOW, { width: 1280, height: 900 });
  assert.equal(authBrowserWindowSizeArg(), '--window-size=1280,900');
  assert.deepEqual(launchArgs, ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']);
  assert.equal(launchArgs.some((arg) => arg.includes('device-scale-factor')), false);
});
