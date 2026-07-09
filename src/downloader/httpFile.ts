import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { ensureDir } from '../utils/fs.js';
import { fetchWithSafeRedirects } from '../utils/http.js';

export async function downloadUrlToFile(
  url: URL,
  opts: {
    outFilePath: string;
    headers?: Record<string, string>;
    authenticatedOrigin?: URL;
  },
): Promise<void> {
  const res = await fetchWithSafeRedirects(url, {
    ...(opts.headers ? { headers: opts.headers } : {}),
    ...(opts.authenticatedOrigin ? { authenticatedOrigin: opts.authenticatedOrigin } : {}),
  });

  if (!res.ok) {
    throw new Error(`Failed to download ${url.toString()} (HTTP ${res.status})`);
  }

  await ensureDir(path.dirname(opts.outFilePath));

  const tempPath = `${opts.outFilePath}.part-${process.pid}-${Date.now()}`;
  const writeStream = createWriteStream(tempPath);

  try {
    if (!res.body) throw new Error(`No response body when downloading ${url.toString()}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reader = (res.body as any).getReader?.();
    if (!reader) {
      throw new Error('Expected a web ReadableStream body with getReader().');
    }

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk: Uint8Array = value;
      if (!writeStream.write(Buffer.from(chunk))) {
        await once(writeStream, 'drain');
      }
    }
    writeStream.end();
    await once(writeStream, 'finish');
    await fs.chmod(tempPath, 0o644).catch(() => undefined);
    await fs.rename(tempPath, opts.outFilePath);
  } catch (e) {
    writeStream.destroy();
    await fs.rm(tempPath, { force: true });
    throw e;
  } finally {
    await fs.rm(tempPath, { force: true });
  }
}
