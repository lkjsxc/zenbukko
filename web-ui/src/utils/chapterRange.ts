/** Convert sorted unique ordinals to range string e.g. [1,3,4,5] -> "1,3-5" */
export const ordinalsToRange = (ordinals: number[]): string => {
  const sorted = [...new Set(ordinals)].filter((n) => n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return '';

  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  const flush = (s: number, e: number) => parts.push(s === e ? `${s}` : `${s}-${e}`);

  for (let i = 1; i < sorted.length; i += 1) {
    const n = sorted[i];
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    flush(start, prev);
    start = n;
    prev = n;
  }
  flush(start, prev);
  return parts.join(',');
};

export const rangeToOrdinals = (input: string): number[] => {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const token of trimmed.split(',')) {
    const part = token.trim();
    const match = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!match) throw new Error(`Invalid range segment: ${part}`);
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < 1) throw new Error(`Chapter ordinals must be positive: ${part}`);
    if (end < start) throw new Error(`Chapter range cannot be reversed: ${part}`);
    for (let n = start; n <= end; n += 1) {
      if (!seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
  }
  return out;
};

export const chapterOrdinal = (chapters: Array<{ order?: number }>, index: number): number =>
  chapters[index]?.order ?? index + 1;
