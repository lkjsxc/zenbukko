import * as cheerio from 'cheerio';
import path from 'node:path';
import type { CourseConfirmationTest } from './nnnClient.js';
import { ensureDir } from '../utils/fs.js';
import { fetchWithSafeRedirects } from '../utils/http.js';
import { writeJsonAtomic } from '../utils/atomic.js';
import type { CaptureFailure, CapturedConfirmationTest, Choice, Question } from './confirmationTestsTypes.js';

export type { CapturedConfirmationTest } from './confirmationTestsTypes.js';

export async function downloadConfirmationTests(params: {
  tests: CourseConfirmationTest[];
  courseDir: string;
  chapterDirNameForId: (chapterId: number) => string;
  headers: Record<string, string>;
  logger: { info: (message: string) => void; warn: (message: string) => void };
  fetchImpl?: typeof fetch;
}): Promise<string[]> {
  const written: string[] = [];
  for (const [chapterId, tests] of groupByChapter(params.tests)) {
    const captured: CapturedConfirmationTest[] = [];
    const failures: CaptureFailure[] = [];
    for (const test of tests) {
      try {
        captured.push(await fetchConfirmationTest(test, params.headers, params.fetchImpl));
      } catch (error) {
        const failure = captureFailure(test, error);
        failures.push(failure);
        params.logger.warn(`Confirmation test capture failed: ${test.contentUrl ?? `section ${test.testId}`} (${failure.message})`);
      }
    }
    const chapterDir = path.join(params.courseDir, params.chapterDirNameForId(chapterId));
    await ensureDir(chapterDir);
    const outputPath = path.join(chapterDir, `chapter-${chapterId}_confirmation_tests.json`);
    await writeJsonAtomic(outputPath, { generatedAt: new Date().toISOString(), chapterId, tests: captured, failures });
    params.logger.info(
      `Wrote chapter confirmation tests (${captured.length} captured, ${failures.length} failed): ${path.relative(process.cwd(), outputPath)}`,
    );
    written.push(outputPath);
  }
  return written;
}

export function parseConfirmationTestPage(test: CourseConfirmationTest & { contentUrl: string }, html: string): CapturedConfirmationTest {
  const $ = cheerio.load(html);
  const initElement = $('#kokuban-init').first();
  const exercise = $('section.exercise').first();
  if (initElement.length === 0 && exercise.length === 0) {
    throw new Error('exercise content was not found; the session may have expired');
  }
  const init = parseInit(initElement.text());
  const materialMeta = asRecord(init.materialMeta);
  const userContext = asRecord(init.userContext);
  const answers = asRecord(userContext?.answers) ?? {};
  const answerPairs = Object.entries(answers);
  const questions = $('section.exercise > ul > li.exercise-item').toArray().map((element, index) => {
    const item = $(element);
    const type = optionalText(item.attr('data-type'));
    const renderedId = optionalText(item.find('input[name], textarea[name]').first().attr('name'));
    const id = renderedId ?? answerPairs[index]?.[0];
    const answer = id ? asRecord(answers[id]) : undefined;
    const domAnswer = type === 'essay'
      ? controlValue(item.find('textarea').first().val())
      : type === 'word' ? controlValue(item.find('input[type="text"].answers').first().val()) : undefined;
    const question: Question = {
      choices: item.find('.choice-options__option').toArray().map((element) => {
        const option = $(element);
        const label = option.find('.choice-options__option__value').first();
        const choice: Choice = {};
        const value = optionalText(option.find('input').first().attr('value'));
        const text = normalizedText(label.text());
        const choiceHtml = optionalText(label.html() ?? undefined);
        if (value) choice.value = value;
        if (text) choice.text = text;
        if (choiceHtml) choice.html = choiceHtml;
        return choice;
      }),
    };
    if (id) question.id = id;
    if (type) question.type = type;
    const badge = optionalText(item.find('.shoumon-badge').first().attr('data-testid'));
    if (badge) question.badge = badge;
    const userAnswer = domAnswer ?? ownValue(answer, 'answering');
    if (userAnswer !== undefined) question.userAnswer = userAnswer;
    const isCorrect = ownValue(answer, 'isCorrect');
    if (typeof isCorrect === 'boolean' || isCorrect === null) question.isCorrect = isCorrect;
    addTextFields(question, 'explanation', item.find('div.explanation').first().text(), item.find('div.explanation').first().html());
    return question;
  });

  const captured: CapturedConfirmationTest = {
    id: test.testId,
    resourceType: 'exercise',
    sourceUrl: test.contentUrl,
    questions,
  };
  const title = optionalText(test.title) ?? stringValue(materialMeta?.title);
  if (title) captured.title = title;
  const materialType = stringValue(materialMeta?.type);
  if (materialType) captured.materialType = materialType;
  const code = stringValue(materialMeta?.learningMaterialCode);
  if (code) captured.learningMaterialCode = code;
  if (typeof userContext?.passed === 'boolean') captured.passed = userContext.passed;
  const history = ownValue(userContext, 'history');
  if (history !== undefined) captured.history = history;
  addTextFields(captured, 'statement', exercise.children('div.statement').first().text(), exercise.children('div.statement').first().html());
  return captured;
}

async function fetchConfirmationTest(
  test: CourseConfirmationTest,
  headers: Record<string, string>,
  fetchImpl?: typeof fetch,
): Promise<CapturedConfirmationTest> {
  if (!test.contentUrl) throw new Error('content URL is missing');
  const url = confirmationTestUrl(test.contentUrl);
  const response = await fetchWithSafeRedirects(url, { headers, authenticatedOrigin: url, ...(fetchImpl ? { fetchImpl } : {}) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseConfirmationTestPage({ ...test, contentUrl: test.contentUrl }, await response.text());
}

function confirmationTestUrl(value: string): URL {
  const url = new URL(value);
  const nnnHost = url.hostname === 'nnn.ed.nico' || url.hostname.endsWith('.nnn.ed.nico');
  if (url.protocol !== 'https:' || !nnnHost || url.username || url.password) {
    throw new Error('content URL must be an HTTPS URL on nnn.ed.nico');
  }
  return url;
}

function addTextFields(target: object, prefix: string, text: string, html: string | null): void {
  const writable = target as Record<string, unknown>;
  const cleanText = normalizedText(text);
  const cleanHtml = optionalText(html ?? undefined);
  if (cleanText) writable[`${prefix}Text`] = cleanText;
  if (cleanHtml) writable[`${prefix}Html`] = cleanHtml;
}

function parseInit(raw: string): Record<string, unknown> {
  const text = raw.trim();
  if (!text) return {};
  const parsed: unknown = JSON.parse(text);
  const record = asRecord(parsed);
  if (!record) throw new Error('kokuban-init must contain a JSON object');
  return record;
}

function groupByChapter(tests: CourseConfirmationTest[]): Map<number, CourseConfirmationTest[]> {
  const grouped = new Map<number, CourseConfirmationTest[]>();
  for (const test of tests) grouped.set(test.chapterId, [...(grouped.get(test.chapterId) ?? []), test]);
  return grouped;
}

function captureFailure(test: CourseConfirmationTest, error: unknown): CaptureFailure {
  return {
    id: test.testId,
    ...(test.title ? { title: test.title } : {}),
    ...(test.contentUrl ? { sourceUrl: test.contentUrl } : {}),
    message: error instanceof Error ? error.message : String(error),
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function ownValue(record: Record<string, unknown> | undefined, key: string): unknown {
  return record && Object.hasOwn(record, key) ? record[key] : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? optionalText(value) : undefined;
}

function controlValue(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? optionalText(value) : undefined;
}

function normalizedText(value: string): string | undefined {
  return optionalText(value.replaceAll(/\s+/g, ' '));
}

function optionalText(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}
