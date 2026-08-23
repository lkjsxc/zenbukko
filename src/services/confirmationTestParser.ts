import * as cheerio from 'cheerio';
import type { Cheerio, CheerioAPI, Element } from 'cheerio';
import type { CourseConfirmationTest } from './nnnClient.js';
import type { CapturedConfirmationTest, Choice, Question } from './confirmationTestsTypes.js';

const CHECKABLE_CONTROL = 'input[type="radio"], input[type="checkbox"]';
const CHOICE_CONTROL = `${CHECKABLE_CONTROL}, .choice-options__option input`;
const QUESTION_CONTENT = `${CHOICE_CONTROL}, select, textarea, input.answers, .choice-options__option`;

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
  return captured;
}

function parseQuestion($: CheerioAPI, item: Cheerio<Element>, answers: Record<string, unknown>,
  answerPairs: Array<[string, unknown]>, index: number): Question {
  const renderedId = optionalText(item.attr('data-question-id'))
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
  const badge = optionalText(item.find('.shoumon-badge').first().attr('data-testid'));
  if (badge) question.badge = badge;
  const statement = item.find('.exercise-item__statement, .question-statement, [data-testid="question-statement"], legend, .statement').first();
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
  const candidates = exercise.find('[data-question-id], [data-type], fieldset, [role="group"]').toArray()
    .filter((element) => $(element).find(QUESTION_CONTENT).length > 0);
  const innermost = candidates.filter((candidate) => (
    !candidates.some((other) => other !== candidate && $.contains(candidate, other))
  ));
  if (innermost.length > 0) return innermost;
  const root = exercise.get(0);
  return root && exercise.find(QUESTION_CONTENT).length > 0 ? [root] : [];
}

function parseChoices($: CheerioAPI, item: Cheerio<Element>, userAnswer: unknown): Choice[] {
  const controls = item.find(CHOICE_CONTROL).toArray();
  const inputChoices = controls.map((element) => choiceFromInput($, item, $(element), userAnswer));
  const selectChoices = item.find('select option').toArray().map((element) => {
    const option = $(element);
    const value = optionalText(option.attr('value')) ?? normalizedText(option.text());
    return choiceRecord(
      value,
      normalizedText(option.text()),
      optionalText(option.html() ?? undefined),
      option.attr('selected') !== undefined || answerIncludes(userAnswer, value),
    );
  });
  return [...inputChoices, ...selectChoices];
}

function choiceFromInput($: CheerioAPI, item: Cheerio<Element>, input: Cheerio<Element>, userAnswer: unknown): Choice {
  const value = optionalText(input.attr('value'));
  const label = choiceLabel($, item, input);
  const clone = label?.clone();
  clone?.find('input, select').remove();
  const fallbackText = optionalText(input.attr('aria-label'));
  return choiceRecord(
    value,
    label ? normalizedText(label.text()) : fallbackText,
    clone ? optionalText(clone.html() ?? undefined) : undefined,
    input.attr('checked') !== undefined || answerIncludes(userAnswer, value),
  );
}

function choiceLabel($: CheerioAPI, item: Cheerio<Element>, input: Cheerio<Element>): Cheerio<Element> | undefined {
  const known = input.closest('.choice-options__option').find('.choice-options__option__value').first();
  if (known.length > 0) return known;
  const wrapping = input.parents('label').first();
  if (wrapping.length > 0) return wrapping;
  const controlId = optionalText(input.attr('id'));
  if (!controlId) return undefined;
  const associated = item.find('label').toArray().find((element) => $(element).attr('for') === controlId);
  return associated ? $(associated) : undefined;
}

function choiceRecord(value: string | undefined, text: string | undefined, html: string | undefined, selected: boolean): Choice {
  return { ...(value ? { value } : {}), ...(text ? { text } : {}), ...(html ? { html } : {}), selected };
}

function renderedAnswer($: CheerioAPI, item: Cheerio<Element>, type: string | undefined): unknown {
  if (type === 'essay') return controlValue(item.find('textarea').first().val());
  if (type === 'word') return controlValue(item.find('input[type="text"].answers, input.answers').first().val());
  const checked = item.find(CHOICE_CONTROL).toArray()
    .filter((element) => $(element).attr('checked') !== undefined)
    .map((element) => optionalText($(element).attr('value'))).filter(isString);
  const selected = item.find('select option[selected]').toArray()
    .map((element) => optionalText($(element).attr('value')) ?? normalizedText($(element).text())).filter(isString);
  const values = [...checked, ...selected];
  return values.length === 0 ? undefined : values.length === 1 ? values[0] : values;
}

function inferredType(item: Cheerio<Element>): string | undefined {
  if (item.find('input[type="checkbox"]').length > 0) return 'multiple-choice';
  if (item.find(`${CHECKABLE_CONTROL}, .choice-options__option`).length > 0) return 'single-choice';
  if (item.find('select').length > 0) return 'select';
  if (item.find('textarea').length > 0) return 'essay';
  if (item.find('input[type="text"], input.answers').length > 0) return 'word';
  return undefined;
}

function answerIncludes(answer: unknown, value: string | undefined): boolean {
  if (value === undefined) return false;
  if (Array.isArray(answer)) return answer.some((entry) => answerIncludes(entry, value));
  return typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean'
    ? String(answer) === value
    : false;
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

function isString(value: string | undefined): value is string {
  return value !== undefined;
}
