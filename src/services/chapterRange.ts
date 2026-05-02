export type ChapterRangePart = {
  start: number;
  end: number;
};

export function parseChapterRange(input: string): number[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const ordinals: number[] = [];
  const seen = new Set<number>();

  for (const token of trimmed.split(',')) {
    const part = parsePart(token.trim());
    for (let n = part.start; n <= part.end; n += 1) {
      if (!seen.has(n)) {
        seen.add(n);
        ordinals.push(n);
      }
    }
  }

  return ordinals;
}

export function mapChapterOrdinalsToIds(
  ordinals: number[],
  chapters: Array<{ id: number; order?: number }>,
): number[] {
  const sorted = [...chapters].sort((a, b) => {
    const ao = a.order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.order ?? Number.MAX_SAFE_INTEGER;
    return ao === bo ? a.id - b.id : ao - bo;
  });
  return ordinals.map((ordinal) => {
    const chapter = sorted[ordinal - 1];
    if (!chapter) throw new Error(`Chapter ordinal ${ordinal} is outside course range 1-${sorted.length}.`);
    return chapter.id;
  });
}

function parsePart(token: string): ChapterRangePart {
  if (!token) throw new Error('Chapter range contains an empty segment.');
  const match = /^(\d+)(?:-(\d+))?$/.exec(token);
  if (!match) throw new Error(`Invalid chapter range segment: ${token}`);

  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);
  if (!Number.isInteger(start) || start < 1) throw new Error(`Invalid chapter ordinal: ${match[1]}`);
  if (!Number.isInteger(end) || end < 1) throw new Error(`Invalid chapter ordinal: ${match[2]}`);
  if (end < start) throw new Error(`Chapter range end must be greater than or equal to start: ${token}`);
  return { start, end };
}
