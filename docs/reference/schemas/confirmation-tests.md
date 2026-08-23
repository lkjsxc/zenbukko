# Confirmation Tests Schema

## Purpose

`chapter-<chapterId>_confirmation_tests.json` preserves the confirmation tests
discovered in one selected chapter.

## Top-Level Fields

- `generatedAt`: ISO timestamp.
- `chapterId`: NNN chapter ID.
- `tests`: captured test records in chapter order.
- `failures`: test records whose page could not be captured.

## Test Record

- `id`, `title`, `resourceType`, `sourceUrl`: chapter-section identity.
- `materialType`, `learningMaterialCode`: optional page metadata.
- `passed`, `history`: optional result data exposed to the current user.
- `statementText`, `statementHtml`: optional rendered statement forms.
- `explanationText`, `explanationHtml`: optional exercise-level explanation.
- `questions`: ordered question records.

## Question Record

- `id`, `type`, `badge`, `answerMode`: optional rendered question identity,
  kind, and answer-list mode.
- `statementText`, `statementHtml`: optional per-question rendered prompt.
- `choices`: ordered `value`, `text`, `html`, optional Boolean `selected`, and
  optional Boolean `correct` records. Choices may originate from server-rendered
  answer lists, radio buttons, checkboxes, or select options. An absent
  `selected` means the static page did not expose selection state.
- `userAnswer`: optional submitted answer in its source JSON shape.
- `isCorrect`: `true`, `false`, or `null` when exposed.
- `explanationText`, `explanationHtml`: optional rendered explanation.

## Failure Record

- `id`, `title`, optional `sourceUrl`: discovered test identity.
- `message`: capture failure reason without session credentials.
