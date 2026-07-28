# Report Assignment Capture

## Purpose

Save the text shown for report assignments during a course download so it can be
used as a local source when building a report prompt.

## Discovery

- Zenbukko recognizes a chapter section as a report assignment when its resource
  type identifies a report or assignment, or its title contains `レポート`, `課題`,
  `report`, or `assignment`.
- The section must provide an authenticated content URL.
- Capture is limited to the selected course chapters and never submits, saves, or
  changes an assignment response.

## Output

Each chapter with captured assignments receives
`chapter-<chapterId>_report_assignments.md` in its chapter directory. The
Markdown preserves assignment order and records each title, source URL, and
readable page text.

## Failure Behavior

An unavailable assignment page produces a warning and does not stop unrelated
media, material, transcription, or OCR work. `build-report-prompt` uses only
already-downloaded assignment artifacts and never calls NNN.
