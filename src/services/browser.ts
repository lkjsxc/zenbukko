import { stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer';
import { which } from '../utils/which.js';

type BrowserProbeOptions = {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  homeDir?: string;
  bundledExecutablePath?: string | null;
  exists?: (filePath: string) => Promise<boolean>;
  findCommand?: (command: string) => Promise<string | null>;
};

const COMMON_ARGS = ['--no-sandbox', '--disable-setuid-sandbox'];

export async function resolveBrowserExecutablePath(options: BrowserProbeOptions = {}): Promise<string> {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const exists = options.exists ?? isFile;
  const explicit = envValue(env, 'PUPPETEER_EXECUTABLE_PATH')?.trim();
  if (explicit) {
    if (await exists(explicit)) return explicit;
    throw new Error(`Configured browser does not exist: ${explicit}. Fix PUPPETEER_EXECUTABLE_PATH.`);
  }

  const bundled = options.bundledExecutablePath === undefined ? bundledBrowserPath() : options.bundledExecutablePath;
  if (bundled && await exists(bundled)) return bundled;

  for (const candidate of browserSystemCandidates(platform, env, options.homeDir ?? os.homedir())) {
    if (await exists(candidate)) return candidate;
  }

  const findCommand = options.findCommand ?? ((command) => which(command, { platform }));
  for (const command of browserCommandCandidates(platform)) {
    const found = await findCommand(command);
    if (found) return found;
  }

  throw new Error(
    'No supported Edge, Chrome, or Chromium executable was found. Install a browser or set PUPPETEER_EXECUTABLE_PATH.',
  );
}

export async function launchBrowser(options: LaunchOptions): Promise<Browser> {
  const executablePath = await resolveBrowserExecutablePath();
  const args = [...new Set([...COMMON_ARGS, ...(options.args ?? [])])];
  return puppeteer.launch({ ...options, executablePath, args });
}

export function browserSystemCandidates(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  homeDir: string,
): string[] {
  if (platform === 'win32') return windowsCandidates(env);
  if (platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      path.join(homeDir, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      path.join(homeDir, 'Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
  }
  return ['/opt/google/chrome/chrome', '/opt/microsoft/msedge/msedge', '/snap/bin/chromium'];
}

export function browserCommandCandidates(platform: NodeJS.Platform): string[] {
  if (platform === 'win32') return ['msedge', 'chrome', 'chromium'];
  if (platform === 'darwin') return ['google-chrome', 'microsoft-edge', 'chromium'];
  return ['google-chrome-stable', 'google-chrome', 'microsoft-edge-stable', 'microsoft-edge', 'chromium', 'chromium-browser'];
}

function windowsCandidates(env: NodeJS.ProcessEnv): string[] {
  const roots = [envValue(env, 'PROGRAMFILES'), envValue(env, 'PROGRAMFILES(X86)'), envValue(env, 'LOCALAPPDATA')]
    .filter((value): value is string => Boolean(value));
  const relatives = [
    ['Google', 'Chrome', 'Application', 'chrome.exe'],
    ['Microsoft', 'Edge', 'Application', 'msedge.exe'],
    ['Microsoft', 'Edge Beta', 'Application', 'msedge.exe'],
    ['Microsoft', 'Edge Dev', 'Application', 'msedge.exe'],
    ['Microsoft', 'Edge SxS', 'Application', 'msedge.exe'],
  ];
  return roots.flatMap((root) => relatives.map((relative) => path.win32.join(root, ...relative)));
}

function bundledBrowserPath(): string | null {
  try { return puppeteer.executablePath(); } catch { return null; }
}

async function isFile(filePath: string): Promise<boolean> {
  return stat(filePath).then((value) => value.isFile()).catch(() => false);
}

function envValue(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const actual = Object.keys(env).find((name) => name.toLowerCase() === key.toLowerCase());
  return actual ? env[actual] : undefined;
}
