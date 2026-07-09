import type { Readable, Writable } from 'node:stream';
import { launchBrowser } from './browser.js';
import type { StoredSession } from '../session/sessionStore.js';

export const AUTH_BROWSER_WINDOW = { width: 1280, height: 900 };

export function authBrowserWindowSizeArg(): string {
  return `--window-size=${AUTH_BROWSER_WINDOW.width},${AUTH_BROWSER_WINDOW.height}`;
}

export function authBrowserLaunchArgs(): string[] {
  return ['--no-sandbox', '--disable-setuid-sandbox', authBrowserWindowSizeArg()];
}

export async function interactiveLogin(params: {
  headless: boolean;
  onStatus: (message: string) => void;
}): Promise<StoredSession> {
  const browser = await launchBrowser({
    headless: params.headless,
    defaultViewport: null,
    args: authBrowserLaunchArgs(),
  });
  try {
    const page = await browser.newPage();
    params.onStatus('Opening login page in a larger browser window…');
    await page.goto('https://www.nnn.ed.nico/', { waitUntil: 'networkidle2' });
    params.onStatus('Please log in in the opened browser window.');
    params.onStatus('After login, return here and press ENTER.');

    const controller = new AbortController();
    const onDisconnected = (): void => controller.abort(new Error('Login browser was closed before confirmation.'));
    browser.once('disconnected', onDisconnected);
    try {
      await waitForEnter({ signal: controller.signal });
    } finally {
      browser.off('disconnected', onDisconnected);
      controller.abort();
    }

    const cookies = await page.cookies();
    const userAgent = await page.evaluate(() => navigator.userAgent);
    return {
      savedAt: new Date().toISOString(),
      userAgent,
      cookies: cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      })),
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export async function waitForEnter(options: {
  stdin?: Readable;
  stdout?: Pick<Writable, 'write'>;
  signal?: AbortSignal;
} = {}): Promise<void> {
  const stdin = options.stdin ?? process.stdin;
  const stdout = options.stdout ?? process.stdout;
  const wasPaused = stdin.isPaused();
  stdout.write('Press ENTER when you are logged in…\n');

  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = (): void => {
        stdin.off('data', handleData);
        stdin.off('end', handleEnd);
        options.signal?.removeEventListener('abort', handleAbort);
      };
      const finish = (action: () => void): void => { cleanup(); action(); };
      const handleData = (): void => finish(resolve);
      const handleEnd = (): void => finish(() => reject(new Error('Terminal input ended before login confirmation.')));
      const handleAbort = (): void => finish(() => reject(abortError(options.signal)));
      stdin.once('data', handleData);
      stdin.once('end', handleEnd);
      options.signal?.addEventListener('abort', handleAbort, { once: true });
      if (options.signal?.aborted) handleAbort();
      else if (stdin.readableEnded) handleEnd();
      else stdin.resume();
    });
  } finally {
    if (wasPaused) stdin.pause();
  }
}

function abortError(signal: AbortSignal | undefined): Error {
  return signal?.reason instanceof Error ? signal.reason : new Error('Login confirmation was cancelled.');
}
