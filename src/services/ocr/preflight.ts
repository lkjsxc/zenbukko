import { access } from 'node:fs/promises';
import path from 'node:path';
import { which } from '../../utils/which.js';

export async function localOcrUnavailable(command: string): Promise<string | undefined> {
  if (!(await commandExists('pdftoppm'))) return 'pdftoppm was not found in PATH.';
  if (!(await commandExists(command))) return `NDLOCR-Lite command was not found: ${command}`;
  return undefined;
}

async function commandExists(command: string): Promise<boolean> {
  if (command.includes(path.sep)) {
    return access(command).then(() => true).catch(() => false);
  }
  return Boolean(await which(command));
}
