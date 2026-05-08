export function normalizeMarkdown(text: string): string {
  const trimmed = text.trim();
  const cleaned = trimmed.replaceAll(/```markdown\s*([\s\S]*?)```/gi, '$1').trim();
  return `${cleaned}\n`;
}
