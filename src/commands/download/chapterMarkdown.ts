import fs from 'node:fs/promises';
import path from 'node:path';
import { readTextFileIfExists } from '../../utils/fs.js';

type ChapterMarkdownLesson = {
  lessonIndex: number;
  lessonId: number;
  lessonTitle?: string;
  transcriptPaths: string[];
};

export class ChapterMarkdown {
  private readonly entries = new Map<number, Map<number, ChapterMarkdownLesson>>();

  public constructor(private readonly chapterDirNameForId: (chapterId: number) => string) {}

  addTranscript(params: {
    chapterId: number;
    lessonIndex: number;
    lessonId: number;
    lessonTitle?: string;
    transcriptPath: string;
  }): void {
    const byLesson = this.entries.get(params.chapterId) ?? new Map<number, ChapterMarkdownLesson>();
    if (!this.entries.has(params.chapterId)) this.entries.set(params.chapterId, byLesson);
    let entry = byLesson.get(params.lessonIndex);
    if (!entry) {
      entry = { lessonIndex: params.lessonIndex, lessonId: params.lessonId, transcriptPaths: [] };
      if (params.lessonTitle) entry.lessonTitle = params.lessonTitle;
      byLesson.set(params.lessonIndex, entry);
    }
    entry.transcriptPaths.push(params.transcriptPath);
  }

  async writeAll(params: {
    courseDir: string;
    transcribeFormat: 'txt' | 'srt' | 'vtt';
    logger: { warn: (message: string) => void; info: (message: string) => void };
  }): Promise<void> {
    if (params.transcribeFormat !== 'txt') {
      params.logger.warn('Skipping chapter aggregated markdown: only supported for --transcribe-format txt');
      return;
    }
    for (const [chapterId, lessonsByIndex] of this.entries) {
      const chapterDir = path.join(params.courseDir, this.chapterDirNameForId(chapterId));
      const outMdPath = path.join(chapterDir, `chapter-${chapterId}_transcription.md`);
      const sections = await this.sectionsFor(lessonsByIndex);
      const md = sections.join('\n\n');
      await fs.writeFile(outMdPath, md + (md.endsWith('\n') ? '' : '\n'), 'utf8');
      params.logger.info(`Wrote chapter transcription markdown: ${path.relative(process.cwd(), outMdPath)}`);
    }
  }

  private async sectionsFor(lessonsByIndex: Map<number, ChapterMarkdownLesson>): Promise<string[]> {
    const sections: string[] = [];
    for (const lessonIndex of [...lessonsByIndex.keys()].sort((a, b) => a - b)) {
      const entry = lessonsByIndex.get(lessonIndex);
      if (!entry) continue;
      const title = (entry.lessonTitle ?? `lesson-${entry.lessonId}`).replaceAll(/\s+/g, ' ').trim();
      const texts = await Promise.all(entry.transcriptPaths.map((p) => readTextFileIfExists(p)));
      const body = texts.map((t) => (t ?? '').trim()).filter(Boolean).join('\n\n');
      sections.push(`## ${String(entry.lessonIndex).padStart(2, '0')} ${title}\n\n${body}`.trimEnd());
    }
    return sections;
  }
}
