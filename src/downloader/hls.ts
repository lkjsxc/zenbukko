import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { ensureDir } from '../utils/fs.js';

export type HlsDownloadOptions = {
  headers?: Record<string, string>;
  outFilePath: string;
  onProgress?: (p: { segmentIndex: number; segmentCount: number }) => void;
};

type ParsedPlaylist = {
  variantUrls: URL[];
  segmentUrls: URL[];
  isEncrypted: boolean;
};

export async function downloadHlsToFile(m3u8Url: URL, opts: HlsDownloadOptions): Promise<void> {
  const playlist = await fetchText(m3u8Url, opts.headers);
  const parsed = parseM3u8(playlist, m3u8Url);

  if (parsed.isEncrypted) {
    throw new Error('Encrypted HLS streams are not supported.');
  }

  // If this is a master playlist, pick the last variant (often highest bandwidth).
  const mediaPlaylistUrl = parsed.variantUrls.length ? parsed.variantUrls.at(-1)! : m3u8Url;

  const mediaPlaylistText =
    parsed.variantUrls.length ? await fetchText(mediaPlaylistUrl, opts.headers) : playlist;
  const media = parseM3u8(mediaPlaylistText, mediaPlaylistUrl);

  if (media.segmentUrls.length === 0) {
    throw new Error('No segments found in HLS playlist.');
  }

  await ensureDir(path.dirname(opts.outFilePath));

  const writeStream = createWriteStream(opts.outFilePath);
  try {
    for (let i = 0; i < media.segmentUrls.length; i++) {
      opts.onProgress?.({ segmentIndex: i + 1, segmentCount: media.segmentUrls.length });
      const segmentUrl = media.segmentUrls[i]!;
      const resp = await fetch(segmentUrl, opts.headers ? { headers: opts.headers } : undefined);
      if (!resp.ok || !resp.body) {
        throw new Error(`Failed to fetch segment ${i + 1}/${media.segmentUrls.length}: ${resp.status}`);
      }

      // Avoid repeatedly attaching listeners to the same write stream.
      // Read web-stream chunks and write to the file stream with backpressure.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = (resp.body as any).getReader?.();
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
    }
  } finally {
    writeStream.end();
    await fs.chmod(opts.outFilePath, 0o644).catch(() => undefined);
  }
}

async function fetchText(url: URL, headers?: Record<string, string>): Promise<string> {
  const resp = await fetch(url, headers ? { headers } : undefined);
  if (!resp.ok) throw new Error(`Failed to fetch ${url.toString()} (${resp.status})`);
  return await resp.text();
}

function parseM3u8(text: string, baseUrl: URL): ParsedPlaylist {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const variantUrls: URL[] = [];
  const segmentUrls: URL[] = [];
  let isEncrypted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.startsWith('#EXT-X-KEY')) {
      isEncrypted = true;
      continue;
    }

    if (line.startsWith('#EXT-X-STREAM-INF')) {
      const next = lines[i + 1];
      if (next && !next.startsWith('#')) {
        variantUrls.push(new URL(next, baseUrl));
      }
      continue;
    }

    if (line.startsWith('#')) continue;
    // For media playlists, non-comment lines are segment URIs.
    segmentUrls.push(new URL(line, baseUrl));
  }

  return { variantUrls, segmentUrls, isEncrypted };
}
