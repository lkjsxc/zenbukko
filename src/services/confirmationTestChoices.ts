import type { Cheerio, CheerioAPI, Element } from 'cheerio';
import type { Choice } from './confirmationTestsTypes.js';

const CHECKABLE_CONTROL = 'input[type="radio"], input[type="checkbox"]';
const CHOICE_CONTROL = `${CHECKABLE_CONTROL}, .choice-options__option input`;

export function parseChoices($: CheerioAPI, item: Cheerio<Element>, userAnswer: unknown): Choice[] {
  const answerList = item.find('ul.answers').first();
  if (answerList.length > 0) {
    const selectionExposed = userAnswer !== undefined || answerList.find('[data-selected], .selected').length > 0;
    return answerList.children('li').toArray().map((element) => {
      const option = $(element);
      const value = optionalText(option.attr('data-input-value'));
      const correct = booleanValue(option.attr('data-correct'));
      return choiceRecord(
        value,
        normalizedText(option.text()),
        optionalText(option.html() ?? undefined),
        selectionExposed
          ? option.attr('data-selected') === 'true' || option.hasClass('selected') || answerIncludes(userAnswer, value)
          : undefined,
        correct,
      );
    });
  }
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
      booleanValue(option.attr('data-correct')),
    );
  });
  return [...inputChoices, ...selectChoices];
}

export function renderedAnswer($: CheerioAPI, item: Cheerio<Element>, type: string | undefined): unknown {
  if (type === 'essay') return controlValue(item.find('textarea').first().val());
  if (type === 'word') return controlValue(item.find('input[type="text"].answers, input.answers').first().val());
  const checked = item.find(CHOICE_CONTROL).toArray()
    .filter((element) => $(element).attr('checked') !== undefined)
    .map((element) => optionalText($(element).attr('value'))).filter(isString);
  const selected = item.find('select option[selected], ul.answers > li.selected, ul.answers > li[data-selected="true"]')
    .toArray().map((element) => controlChoiceValue($(element))).filter(isString);
  const values = [...checked, ...selected];
  return values.length === 0 ? undefined : values.length === 1 ? values[0] : values;
}

export function inferredType(item: Cheerio<Element>): string | undefined {
  if (item.find('input[type="checkbox"]').length > 0) return 'multiple-choice';
  if (item.find(`${CHECKABLE_CONTROL}, .choice-options__option, ul.answers`).length > 0) return 'single-choice';
  if (item.find('select').length > 0) return 'select';
  if (item.find('textarea').length > 0) return 'essay';
  if (item.find('input[type="text"], input.answers').length > 0) return 'word';
  return undefined;
}

function choiceFromInput($: CheerioAPI, item: Cheerio<Element>, input: Cheerio<Element>, userAnswer: unknown): Choice {
  const value = optionalText(input.attr('value'));
  const label = choiceLabel($, item, input);
  const clone = label?.clone();
  clone?.find('input, select').remove();
  const fallbackText = optionalText(input.attr('aria-label'));
  const correct = booleanValue(input.attr('data-correct'));
  return choiceRecord(
    value,
    label ? normalizedText(label.text()) : fallbackText,
    clone ? optionalText(clone.html() ?? undefined) : undefined,
    input.attr('checked') !== undefined || answerIncludes(userAnswer, value),
    correct,
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

function choiceRecord(
  value: string | undefined,
  text: string | undefined,
  html: string | undefined,
  selected: boolean | undefined,
  correct: boolean | undefined,
): Choice {
  return {
    ...(value ? { value } : {}),
    ...(text ? { text } : {}),
    ...(html ? { html } : {}),
    ...(selected === undefined ? {} : { selected }),
    ...(correct === undefined ? {} : { correct }),
  };
}

function controlChoiceValue(element: Cheerio<Element>): string | undefined {
  return optionalText(element.attr('value'))
    ?? optionalText(element.attr('data-input-value'))
    ?? normalizedText(element.text());
}

function answerIncludes(answer: unknown, value: string | undefined): boolean {
  if (value === undefined) return false;
  if (Array.isArray(answer)) return answer.some((entry) => answerIncludes(entry, value));
  return typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean'
    ? String(answer) === value
    : false;
}

function booleanValue(value: string | undefined): boolean | undefined {
  return value === 'true' ? true : value === 'false' ? false : undefined;
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
