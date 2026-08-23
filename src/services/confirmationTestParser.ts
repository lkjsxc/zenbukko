import * as cheerio from 'cheerio';
import type { Cheerio, CheerioAPI, Element } from 'cheerio';
import type { CourseConfirmationTest } from './nnnClient.js';
import { inferredType, parseChoices, renderedAnswer } from './confirmationTestChoices.js';
import type { CapturedConfirmationTest, Question } from './confirmationTestsTypes.js';

const QUESTION_CONTENT = 'input, select, textarea, .choice-options__option, ul.answers > li';

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
  const questions = questionElements($, exercise).map((element, index) => (
    parseQuestion($, $(element), answers, answerPairs, index)
  ));
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
  addTextFields(captured, 'statement', exercise.children('div.statement').first());
  addTextFields(captured, 'explanation', exercise.children('div.explanation').first());
  return captured;
}

function parseQuestion($: CheerioAPI, item: Cheerio<Element>, answers: Record<string, unknown>,
  answerPairs: Array<[string, unknown]>, index: number): Question {
  const renderedId = optionalText(item.attr('data-question-id'))
    ?? optionalText(item.attr('data-item-id'))
    ?? optionalText(item.attr('data-ref-name'))
    ?? optionalText(item.find('input[name], textarea[name], select[name]').first().attr('name'));
  const id = renderedId ?? answerPairs[index]?.[0];
  const answer = id ? asRecord(answers[id]) : undefined;
  const type = optionalText(item.attr('data-type')) ?? inferredType(item);
  const storedAnswer = ownValue(answer, 'answering');
  const rendered = renderedAnswer($, item, type);
  const userAnswer = type === 'essay' || type === 'word' ? rendered ?? storedAnswer : storedAnswer ?? rendered;
  const question: Question = { choices: parseChoices($, item, userAnswer) };
  if (id) question.id = id;
  if (type) question.type = type;
  const answerMode = optionalText(item.find('ul.answers').first().attr('data-type'));
  if (answerMode) question.answerMode = answerMode;
  const badge = optionalText(item.find('.shoumon-badge').first().attr('data-testid'));
  if (badge) question.badge = badge;
  const statement = item.find('.exercise-item__statement, .question-statement, [data-testid="question-statement"], legend, .statement, .question, .fill_in').first();
  addTextFields(question, 'statement', statement);
  if (userAnswer !== undefined) question.userAnswer = userAnswer;
  const isCorrect = ownValue(answer, 'isCorrect');
  if (typeof isCorrect === 'boolean' || isCorrect === null) question.isCorrect = isCorrect;
  addTextFields(question, 'explanation', item.find('div.explanation').first());
  return question;
}

function questionElements($: CheerioAPI, exercise: Cheerio<Element>): Element[] {
  const items = exercise.find('li.exercise-item').toArray();
  if (items.length > 0) return items;
  const candidates = exercise.find('li[data-type], [data-question-id], [data-item-id], fieldset, [role="group"]').toArray()
    .filter((element) => !$(element).hasClass('answers')
      && $(element).closest('ul.answers').length === 0
      && $(element).find(QUESTION_CONTENT).length > 0);
  const innermost = candidates.filter((candidate) => (
    !candidates.some((other) => other !== candidate && $.contains(candidate, other))
  ));
  if (innermost.length > 0) return innermost;
  const root = exercise.get(0);
  return root && exercise.find(QUESTION_CONTENT).length > 0 ? [root] : [];
}

function addTextFields(target: object, prefix: string, source: Cheerio<Element>): void {
  const writable = target as Record<string, unknown>;
  const text = normalizedText(source.text());
  const html = optionalText(source.html() ?? undefined);
  if (text) writable[`${prefix}Text`] = text;
  if (html) writable[`${prefix}Html`] = html;
}

function parseInit(raw: string): Record<string, unknown> {
  const text = raw.trim();
  if (!text) return {};
  const parsed: unknown = JSON.parse(text);
  const record = asRecord(parsed);
  if (!record) throw new Error('kokuban-init must contain a JSON object');
  return record;
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

function normalizedText(value: string): string | undefined {
  return optionalText(value.replaceAll(/\s+/g, ' '));
}

function optionalText(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}
