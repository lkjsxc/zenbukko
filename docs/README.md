# Zenbukko Documentation

## Purpose

This tree is the source of truth for expected behavior. Implementation changes should update these files before code when behavior or public interfaces change.

## Directories

- [`architecture/`](architecture/README.md): system boundaries, module ownership, data flow.
- [`usage/`](usage/README.md): operator workflows for local CLI, web UI, and Docker.
- [`features/`](features/README.md): user-visible feature contracts.
- [`decisions/`](decisions/README.md): accepted behavior decisions and rationale.
- [`reference/`](reference/README.md): config, HTTP API, file layout, and troubleshooting.
- [`llm/`](llm/README.md): machine-consumable indexes and cross-reference pointers.
- [`reference/outputs/`](reference/outputs/README.md): stable output-artifact contract.
- [`development/`](development/README.md): code style, tests, commits, verification.

## Invariants

- Every directory under `docs/` has a `README.md`.
- Markdown files stay under 300 lines.
- Source files stay under 200 lines unless explicitly generated and exempted by policy.
- Documentation defaults to stable behavior contracts first, then implementation notes.
- Feature topics use directories with child pages instead of duplicate flat pointer files.

## Failure Behavior

If docs and implementation conflict, fix the implementation or update the docs in the same change set. Do not leave behavior ambiguous.
