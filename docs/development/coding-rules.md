# Coding Rules

## Purpose

Set maintainable code constraints.

## Rules

- Keep Markdown files under 200 lines.
- Keep source-code files under 200 lines.
- Browser UI source lives in `web-ui/`; build output in `dist/web/static/`.
- Move embedded browser assets out of TypeScript server modules.
- Prefer shared parsers and service modules over duplicated route or CLI logic.
- Preserve user-owned worktree changes.
- Add comments only where they clarify non-obvious control flow.

## Failure Behavior

`npm run check:lines` fails when line limits are exceeded.
