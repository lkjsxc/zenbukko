export const MAX_LOG_TEXT_CHARACTERS = 32 * 1024;
export const MAX_LOG_LINE_CHARACTERS = 8 * 1024;
export const LOG_HISTORY_TRUNCATED = '[Earlier log output omitted]\n';
const LOG_LINE_TRUNCATED = ' …[line truncated]';

export const appendLogText = (text: string, line: string): string => {
  const next = `${text}${boundLine(line)}\n`;
  return retainLogText(next);
};

export const retainLogText = (text: string): string => {
  if (text.length <= MAX_LOG_TEXT_CHARACTERS) return text;
  const tailLength = MAX_LOG_TEXT_CHARACTERS - LOG_HISTORY_TRUNCATED.length;
  return `${LOG_HISTORY_TRUNCATED}${tail(text, tailLength)}`;
};

const boundLine = (line: string): string => {
  if (line.length <= MAX_LOG_LINE_CHARACTERS) return line;
  const tailLength = MAX_LOG_LINE_CHARACTERS - LOG_LINE_TRUNCATED.length;
  return `${LOG_LINE_TRUNCATED}${tail(line, tailLength)}`;
};

const tail = (text: string, length: number): string => {
  let start = text.length - length;
  if (start > 0 && isLowSurrogate(text.charCodeAt(start))) start += 1;
  return text.slice(start);
};

const isLowSurrogate = (value: number): boolean => value >= 0xdc00 && value <= 0xdfff;
