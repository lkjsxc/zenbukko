import fs from 'node:fs/promises';

export const MAX_JOB_LOG_REPLAY_BYTES = 64 * 1024;
export const MAX_JOB_LOG_REPLAY_LINES = 500;
export const MAX_JOB_LOG_EVENT_BYTES = 8 * 1024;
export const JOB_LOG_HISTORY_TRUNCATED = '[Earlier log output omitted]';
export const JOB_LOG_LINE_TRUNCATED = ' …[line truncated]';
const MAX_JOB_LOG_EVENT_DATA_BYTES = MAX_JOB_LOG_EVENT_BYTES - Buffer.byteLength('data: \n\n');

type JobLogTail = { lines: string[] };

export const readJobLogTail = async (filePath: string): Promise<JobLogTail> => {
  try {
    const file = await fs.open(filePath, 'r');
    try {
      const { size } = await file.stat();
      const markerBytes = Buffer.byteLength(`${JOB_LOG_HISTORY_TRUNCATED}\n`);
      const maxContentBytes = MAX_JOB_LOG_REPLAY_BYTES - markerBytes;
      const byteTruncated = size > maxContentBytes;
      const bytesToRead = Math.min(size, maxContentBytes);
      const buffer = Buffer.alloc(bytesToRead);
      const { bytesRead } = await file.read(buffer, 0, bytesToRead, size - bytesToRead);
      const text = buffer.subarray(0, bytesRead).toString('utf8');
      const content = byteTruncated ? completeLines(text) : text;
      const lines = content.split('\n').filter(Boolean).map(boundJobLogLine);
      const retainedLines = lines.slice(-MAX_JOB_LOG_REPLAY_LINES);
      const truncated = byteTruncated || retainedLines.length < lines.length;
      return { lines: truncated ? [JOB_LOG_HISTORY_TRUNCATED, ...retainedLines] : retainedLines };
    } finally {
      await file.close();
    }
  } catch {
    return { lines: [] };
  }
};

export const serializeJobLogEvent = (line: string): string => {
  const bounded = boundJobLogLine(line);
  const encoded = JSON.stringify(bounded);
  if (Buffer.byteLength(encoded) <= MAX_JOB_LOG_EVENT_DATA_BYTES) return encoded;
  const markerBytes = Buffer.byteLength(JSON.stringify(JOB_LOG_LINE_TRUNCATED));
  const prefixLength = Math.floor((MAX_JOB_LOG_EVENT_DATA_BYTES - markerBytes) / 6);
  return JSON.stringify(`${bounded.slice(0, prefixLength)}${JOB_LOG_LINE_TRUNCATED}`);
};

export const boundJobLogLine = (line: string): string => {
  const complete = takePrefix(line, MAX_JOB_LOG_EVENT_BYTES);
  if (complete.complete) return line;
  const availableBytes = MAX_JOB_LOG_EVENT_BYTES - Buffer.byteLength(JOB_LOG_LINE_TRUNCATED);
  const prefix = takePrefix(line, Math.floor(availableBytes / 2)).text;
  const suffix = takeSuffix(line, Math.ceil(availableBytes / 2));
  return `${prefix}${JOB_LOG_LINE_TRUNCATED}${suffix}`;
};

const completeLines = (text: string): string => {
  const firstNewline = text.indexOf('\n');
  return firstNewline === -1 ? '' : text.slice(firstNewline + 1);
};

const takePrefix = (text: string, maxBytes: number): { text: string; complete: boolean } => {
  let offset = 0;
  let usedBytes = 0;
  while (offset < text.length) {
    const codePoint = text.codePointAt(offset);
    if (codePoint === undefined) break;
    const character = String.fromCodePoint(codePoint);
    const bytes = Buffer.byteLength(character);
    if (usedBytes + bytes > maxBytes) return { text: text.slice(0, offset), complete: false };
    usedBytes += bytes;
    offset += character.length;
  }
  return { text, complete: true };
};

const takeSuffix = (text: string, maxBytes: number): string => {
  let offset = text.length;
  let usedBytes = 0;
  while (offset > 0) {
    let start = offset - 1;
    if (isLowSurrogate(text.charCodeAt(start)) && start > 0 && isHighSurrogate(text.charCodeAt(start - 1))) start -= 1;
    const bytes = Buffer.byteLength(text.slice(start, offset));
    if (usedBytes + bytes > maxBytes) break;
    usedBytes += bytes;
    offset = start;
  }
  return text.slice(offset);
};

const isLowSurrogate = (value: number): boolean => value >= 0xdc00 && value <= 0xdfff;
const isHighSurrogate = (value: number): boolean => value >= 0xd800 && value <= 0xdbff;
