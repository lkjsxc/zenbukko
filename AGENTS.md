# Agent Contract

## Purpose

Rules for LLM agents working on Zenbukko.

## Rules

- Documentation is the source of truth. Update docs before or with behavior changes.
- Keep Markdown files under 200 lines.
- Keep source files under 200 lines.
- Prefer functional programming: pure functions, immutable state updates.
- No mocks or placeholders in production code.
- No backward compatibility requirement.
- Commit frequently with clear messages.
- Use Docker Compose for build and test verification.
- Do not commit `tmp/`, `data/`, `dist/`, or `node_modules/`.

## Reading Order

1. `docs/README.md`
2. `docs/llm/map.md`
3. `docs/product/` when touching Web UI
4. Area owner docs for each module changed

## Verification

```sh
npm run type-check
npm run lint
npm test
npm run check:lines
npm run build
```

## Failure Behavior

If docs and code conflict, fix both in the same change set.
