import fs from 'node:fs/promises';

export async function hasNonEmptyFile(filePath: string): Promise<boolean> {
  return fs
    .stat(filePath)
    .then((s) => s.isFile() && s.size > 0)
    .catch(() => false);
}

export function normalizeMarkdown(text: string): string {
  const trimmed = text.trim();
  const cleaned = trimmed.replaceAll(/```markdown\s*([\s\S]*?)```/gi, '$1').trim();
  return `${cleaned}\n`;
}
