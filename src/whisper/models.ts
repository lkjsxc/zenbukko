import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { resolveModelPath } from './whisperPaths.js';

const MODEL_SHA1: Record<string, string> = {
  tiny: 'bd577a113a864445d4c299885e0cb97d4ba92b5f', 'tiny.en': 'c78c86eb1a8faa21b369bcd33207cc90d64ae9df',
  base: '465707469ff3a37a2b9b8d8f89f2f99de7299dac', 'base.en': '137c40403d78fd54d454da0f9bd998f78703390c',
  small: '55356645c2b361a969dfd0ef2c5a50d530afd8d5', 'small.en': 'db8a495a91d927739e50b3fc1cc4c6b8f6c2d022',
  'small.en-tdrz': 'b6c6e7e89af1a35c08e6de56b66ca6a02a2fdfa1', medium: 'fd9727b6e1217c2f614f9b698455c4ffd82463b4',
  'medium.en': '8c30f0e44ce9560643ebd10bbe50cd20eafd3723', 'large-v1': 'b1caaf735c4cc1429223d5a74f0f4d0b9b59a299',
  'large-v2': '0f4c8e34f21cf1a914c59d8b3ce882345ad349d6', 'large-v2-q5_0': '00e39f2196344e901b3a2bd5814807a769bd1630',
  'large-v3': 'ad82bf6a9043ceed055076d0fd39f5f186ff8062', 'large-v3-q5_0': 'e6e2ed78495d403bef4b7cff42ef4aaadcfea8de',
  'large-v3-turbo': '4af2b29d7ec73d781377bfd1758ca957a807e941', 'large-v3-turbo-q5_0': 'e050f7970618a659205450ad97eb95a18d69c9ee',
};

export type WhisperModelStatus = { path: string; exists: boolean; valid: boolean; detail: string };

export async function inspectWhisperModel(model: string, verifyChecksum = false): Promise<WhisperModelStatus> {
  const modelPath = resolveModelPath(model);
  const info = await stat(modelPath).catch(() => null);
  if (!info?.isFile()) return { path: modelPath, exists: false, valid: false, detail: 'model file is missing' };
  if (info.size < 1) return { path: modelPath, exists: true, valid: false, detail: 'model file is empty' };
  const expected = MODEL_SHA1[model];
  if (!expected) return { path: modelPath, exists: true, valid: true, detail: 'model has no bundled upstream checksum' };
  if (!verifyChecksum) return { path: modelPath, exists: true, valid: true, detail: 'model file is present; checksum verified during installation' };
  const actual = await sha1(modelPath);
  return actual === expected
    ? { path: modelPath, exists: true, valid: true, detail: 'verified against upstream SHA-1' }
    : { path: modelPath, exists: true, valid: false, detail: 'model checksum does not match upstream metadata' };
}

export async function downloadWhisperModel(model: string): Promise<string> {
  const expected = MODEL_SHA1[model];
  if (!expected) throw new Error(`No upstream checksum is recorded for Whisper model "${model}". Place a verified model file manually.`);
  const target = resolveModelPath(model);
  const current = await inspectWhisperModel(model, true);
  if (current.valid) return target;
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.part-${process.pid}`;
  await unlink(temporary).catch(() => undefined);
  try {
    const response = await fetch(`https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${encodeURIComponent(model)}.bin`);
    if (!response.ok || !response.body) throw new Error(`model download failed with HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary, { flags: 'wx' }));
    if (await sha1(temporary) !== expected) throw new Error('downloaded model checksum does not match upstream metadata');
    await rename(temporary, target);
    return target;
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

async function sha1(filePath: string): Promise<string> {
  const hash = createHash('sha1');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}
