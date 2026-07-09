import puppeteer from 'puppeteer';
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
  onStatus: (s: string) => void;
}): Promise<StoredSession> {
  const browser = await puppeteer.launch({
    headless: params.headless,
    ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}),
    defaultViewport: null,
    args: authBrowserLaunchArgs(),
  });
  try {
    const page = await browser.newPage();

    params.onStatus('Opening login page in a larger browser window…');
    await page.goto('https://www.nnn.ed.nico/', { waitUntil: 'networkidle2' });

    params.onStatus('Please log in in the opened browser window.');
    params.onStatus('After login, return here and press ENTER.');

    await waitForEnter();

    const cookies = await page.cookies();
    const userAgent = await page.evaluate(() => navigator.userAgent);

    return {
      savedAt: new Date().toISOString(),
      userAgent,
      cookies: cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      })),
    };
  } finally {
    await browser.close();
  }
}

async function waitForEnter(): Promise<void> {
  const stdin = process.stdin;
  const stdout = process.stdout;
  stdin.resume();
  stdin.setEncoding('utf8');

  await new Promise<void>((resolve) => {
    stdout.write('Press ENTER when you are logged in…\n');
    stdin.once('data', () => resolve());
  });
}
