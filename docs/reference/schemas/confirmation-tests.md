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
- `questions`: ordered question records.

## Question Record

- `id`, `type`, `badge`: optional rendered question identity and state.
- `choices`: ordered `value`, `text`, and `html` records.
- `userAnswer`: optional submitted answer in its source JSON shape.
- `isCorrect`: `true`, `false`, or `null` when exposed.
- `explanationText`, `explanationHtml`: optional rendered explanation.

## Failure Record

- `id`, `title`, optional `sourceUrl`: discovered test identity.
- `message`: capture failure reason without session credentials.
