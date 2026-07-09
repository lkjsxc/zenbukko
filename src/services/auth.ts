import puppeteer, { type Page } from 'puppeteer';
import type { StoredSession } from '../session/sessionStore.js';

export const AUTH_LOGIN_PAGE_ZOOM_PERCENT = 25;

export function authLoginPageZoom(): string {
  return `${AUTH_LOGIN_PAGE_ZOOM_PERCENT}%`;
}

export function authBrowserLaunchArgs(): string[] {
  return ['--no-sandbox', '--disable-setuid-sandbox'];
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
    await installAuthLoginPageZoom(page);

    params.onStatus('Opening login page at 25% page zoom…');
    await page.goto('https://www.nnn.ed.nico/', { waitUntil: 'networkidle2' });
    await applyAuthLoginPageZoom(page);

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

async function installAuthLoginPageZoom(page: Page): Promise<void> {
  const zoom = authLoginPageZoom();
  await page.evaluateOnNewDocument((zoomValue: string) => {
    const doc = (globalThis as unknown as BrowserDocument).document;
    const apply = () => doc.documentElement.style.setProperty('zoom', zoomValue, 'important');
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', apply, { once: true });
    else apply();
  }, zoom);
  await applyAuthLoginPageZoom(page);
}

async function applyAuthLoginPageZoom(page: Page): Promise<void> {
  const zoom = authLoginPageZoom();
  await page.evaluate((zoomValue: string) => {
    const doc = (globalThis as unknown as BrowserDocument).document;
    doc.documentElement.style.setProperty('zoom', zoomValue, 'important');
  }, zoom);
}

type BrowserDocument = {
  document: {
    readyState: string;
    documentElement: { style: { setProperty: (name: string, value: string, priority?: string) => void } };
    addEventListener: (type: string, listener: () => void, options?: { once: boolean }) => void;
  };
};

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
