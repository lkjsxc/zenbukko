import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import path from 'node:path';

export type WhichOptions = {
  envPath?: string;
  pathExt?: string;
  platform?: NodeJS.Platform;
  isUsableFile?: (filePath: string) => Promise<boolean>;
};

export async function which(command: string, options: WhichOptions = {}): Promise<string | null> {
  const platform = options.platform ?? process.platform;
  const pathApi = platform === 'win32' ? path.win32 : path;
  const envPath = options.envPath ?? process.env.PATH ?? '';
  const delimiter = platform === 'win32' ? ';' : path.delimiter;
  const directories = envPath.split(delimiter).map(stripQuotes).filter(Boolean);
  const names = candidateNames(command, platform, options.pathExt ?? process.env.PATHEXT, pathApi);
  const usable = options.isUsableFile ?? ((filePath) => defaultUsableFile(filePath, platform));

  for (const directory of directories) {
    for (const name of names) {
      const full = pathApi.join(directory, name);
      if (await usable(full)) return full;
    }
  }
  return null;
}

function candidateNames(command: string, platform: NodeJS.Platform, pathExt: string | undefined, pathApi: typeof path): string[] {
  if (platform !== 'win32' || pathApi.extname(command)) return [command];
  const extensions = (pathExt || '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .map((extension) => extension.trim())
    .filter(Boolean);
  return [command, ...extensions.map((extension) => `${command}${extension}`)];
}

async function defaultUsableFile(filePath: string, platform: NodeJS.Platform): Promise<boolean> {
  try {
    if (!(await stat(filePath)).isFile()) return false;
    await access(filePath, platform === 'win32' ? constants.F_OK : constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function stripQuotes(value: string): string {
  return value.replace(/^"|"$/g, '').trim();
}
