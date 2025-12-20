import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { ensureDir } from '../utils/fs.js';

export async function downloadUrlToFile(
  url: URL,
  opts: {
    outFilePath: string;
    headers?: Record<string, string>;
  },
): Promise<void> {
  const init: RequestInit = {
    method: 'GET',
    redirect: 'follow',
  };
  if (opts.headers) init.headers = opts.headers;
  const res = await fetch(url, init);

  if (!res.ok) {
    throw new Error(`Failed to download ${url.toString()} (HTTP ${res.status})`);
  }

  await ensureDir(path.dirname(opts.outFilePath));

  const writeStream = createWriteStream(opts.outFilePath);

  try {
    if (!res.body) throw new Error(`No response body when downloading ${url.toString()}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reader = (res.body as any).getReader?.();
    if (!reader) {
      throw new Error('Expected a web ReadableStream body with getReader().');
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { value, done } = await reader.read();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (done) break;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const chunk: Uint8Array = value;
      if (!writeStream.write(Buffer.from(chunk))) {
        await once(writeStream, 'drain');
      }
    }
  } finally {
    writeStream.end();
    await fs.chmod(opts.outFilePath, 0o644).catch(() => undefined);
  }
}
