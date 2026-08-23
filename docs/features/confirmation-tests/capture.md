# Confirmation-Test Capture

## Discovery

Zenbukko recognizes chapter sections whose resource type is `exercise` as
confirmation tests. Title matching for `確認テスト` and `小テスト` supports
compatible chapter payloads that omit a useful resource type. Discovery is
limited to the selected chapters and is independent of lesson media selection.
When confirmation-test download is disabled, Zenbukko does not fetch test
content pages or write chapter confirmation-test JSON. Existing artifacts are
left untouched.

## Capture

For each test, Zenbukko reads its authenticated content page and captures the
server-rendered exercise data:

- section ID, title, resource type, and source URL;
- material type and learning-material code when exposed;
- pass state and attempt history when exposed to the current user;
- statement text and HTML;
- question ID, type, rendered prompt text and HTML, status badge, choices,
  submitted answer, correctness, and explanation text and HTML.

Choice capture recognizes rendered radio buttons, checkboxes, and select
options in addition to the known NNN choice wrappers. Every choice records its
value, rendered label when available, and whether it is selected. Selection is
recovered from the rendered control state and the authenticated answer data.
Question containers are discovered from exercise items and rendered form
groups so a changed presentation class does not silently omit an entire
selection question.

The downloader does not call answer or progress mutation endpoints.
Authenticated capture accepts only HTTPS content URLs on `nnn.ed.nico`.

## Output

Each selected chapter containing tests receives
`chapter-<chapterId>_confirmation_tests.json`. Tests preserve chapter order. The
artifact records a generation timestamp, the chapter ID, captured tests, and
any per-test failures.

## Failure Behavior

An unavailable or unrecognized test page produces a warning and a failure
record without stopping unrelated tests, media, materials, reports,
transcription, or OCR. A chapter artifact is still written when every test in
that chapter fails so missing content remains visible.
