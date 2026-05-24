import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, readTextFileIfExists } from '../utils/fs.js';

export type ReportPromptSource = {
  path: string;
  kind: 'ocr' | 'transcript';
  text: string;
};

export type BuildReportPromptParams = {
  inputDir: string;
  outputPath?: string;
  courseName?: string;
  topic?: string;
};

export type BuildReportPromptResult = {
  outputPath: string;
  sources: ReportPromptSource[];
};

export async function buildReportPrompt(params: BuildReportPromptParams): Promise<BuildReportPromptResult> {
  const inputDir = path.resolve(params.inputDir);
  const outputPath = path.resolve(params.outputPath ?? path.join(inputDir, 'report_prompt.md'));
  const sources = await collectReportPromptSources(inputDir);
  if (sources.length === 0) throw new Error(`No OCR or transcript sources found under ${inputDir}.`);
  const prompt = renderReportPrompt({
    courseName: cleanPlaceholder(params.courseName, '{{COURSE_NAME}}'),
    topic: cleanPlaceholder(params.topic, '{{REPORT_TOPIC}}'),
    sources,
  });
  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, prompt, 'utf8');
  return { outputPath, sources };
}

export async function collectReportPromptSources(inputDir: string): Promise<ReportPromptSource[]> {
  const root = path.resolve(inputDir);
  const files = await discoverFiles(root);
  const ocr = preferChapterFiles(files, /^chapter-\d+_ocr\.md$/, 'materials_ocr.md');
  const transcripts = preferChapterFiles(files, /^chapter-\d+_transcription\.md$/, '_transcription.txt');
  const sources = await Promise.all([
    ...ocr.map((file) => readSource(root, file, 'ocr' as const)),
    ...transcripts.map((file) => readSource(root, file, 'transcript' as const)),
  ]);
  return sources.filter((source): source is ReportPromptSource => Boolean(source?.text.trim()));
}

export function renderReportPrompt(params: { courseName: string; topic: string; sources: ReportPromptSource[] }): string {
  const ocrText = sourceBlock(params.sources.filter((s) => s.kind === 'ocr'));
  const transcriptText = sourceBlock(params.sources.filter((s) => s.kind === 'transcript'));
  const sourceList = params.sources.map((s) => `- ${s.kind}: ${s.path}`).join('\n');
  return `<prompt>
あなたは大学の受講生として、オンデマンド講義の確認レポートを書きます。

<course>
${params.courseName}
</course>

<report-topic>
${params.topic}
</report-topic>

<sources>
${sourceList}
</sources>

<ocr-materials>
${ocrText || '(OCR material is not available.)'}
</ocr-materials>

<voice-transcripts>
${transcriptText || '(Voice transcript is not available.)'}
</voice-transcripts>

<requirements>
- レポートのお題は report-topic を最優先してください。
- ocr-materials と voice-transcripts にない具体例、固有名詞、事実、講義内容は追加しないでください。
- voice-transcripts は誤認識があり得るため、OCR資料と矛盾する場合はOCR資料を優先し、断定を避けてください。
- 文字数、段落数、文体などの指定が report-topic に含まれる場合は必ず従ってください。
- 指定がない場合は、400字から600字程度、2段落以内の丁寧語で書いてください。
- 見出し、箇条書き、番号、前置き、解説、引用した条件の再掲は出力しないでください。
- 資料が薄くてお題に答えられない場合は、情報不足で作成できない旨だけを簡潔に出力してください。
</requirements>

<output>
レポート本文のみを出力してください。
</output>
</prompt>
`;
}

async function discoverFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  await walk(root);
  return out;
}

function preferChapterFiles(files: string[], chapterPattern: RegExp, fallbackSuffix: string): string[] {
  const chapter = files.filter((file) => chapterPattern.test(path.basename(file)));
  if (chapter.length > 0) return chapter.sort(comparePaths);
  return files.filter((file) => path.basename(file).endsWith(fallbackSuffix)).sort(comparePaths);
}

async function readSource(root: string, file: string, kind: ReportPromptSource['kind']): Promise<ReportPromptSource | undefined> {
  const text = ((await readTextFileIfExists(file)) ?? '').trim();
  if (!text) return undefined;
  return { path: path.relative(root, file) || path.basename(file), kind, text };
}

function sourceBlock(sources: ReportPromptSource[]): string {
  return sources.map((source) => `<source path="${escapeAttr(source.path)}">\n${source.text}\n</source>`).join('\n\n');
}

function cleanPlaceholder(value: string | undefined, placeholder: string): string {
  const text = value?.trim();
  return text ? text : placeholder;
}

function escapeAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function comparePaths(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
