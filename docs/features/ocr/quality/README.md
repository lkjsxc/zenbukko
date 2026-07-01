# OCR Quality

## Purpose

Define minimum checks before local OCR behavior is treated as ready.

## Files

- [`gates.md`](gates.md): output and manifest quality gates.
- [`smoke.md`](smoke.md): Docker-gated OCR smoke expectations.

## Invariants

- Quality checks verify generated files, not only command exit status.
- Local runs keep stable output names and manifest fields.
