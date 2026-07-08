import puppeteer, { type Page } from 'puppeteer';
import type { StoredSession } from '../session/sessionStore.js';

export const AUTH_LOGIN_PAGE_SCALE = 0.25;

export function authBrowserLaunchArgs(): string[] {
  return ['--no-sandbox', '--disable-setuid-sandbox', `--force-device-scale-factor=${AUTH_LOGIN_PAGE_SCALE}`];
}

export async function interactiveLogin(params: {
  headless: boolean;
  onStatus: (s: string) => void;
}): Promise<StoredSession> {
  const browser = await puppeteer.launch({
    headless: params.headless,
    ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}),
    args: authBrowserLaunchArgs(),
  });
  try {
    const page = await browser.newPage();
    await applyAuthLoginPageScale(page);

    params.onStatus('Opening login page at 25% scale…');
    await page.goto('https://www.nnn.ed.nico/', { waitUntil: 'networkidle2' });
    await applyAuthLoginPageScale(page);

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

async function applyAuthLoginPageScale(page: Page): Promise<void> {
  const client = await page.createCDPSession();
  await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: AUTH_LOGIN_PAGE_SCALE });
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
