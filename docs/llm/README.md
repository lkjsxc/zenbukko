# LLM Index

## Purpose

Provide a compact, deterministic map for reading Zenbukko behavior quickly.

## Top-Level Pointers

- [`../features/`](../features/README.md): feature contracts and invariants.
- [`../decisions/`](../decisions/README.md): accepted cross-cutting behavior decisions.
- [`../reference/`](../reference/README.md): settings, APIs, outputs, and troubleshooting.
- [`../architecture/`](../architecture/README.md): control flow and module boundaries.
- [`../usage/`](../usage/README.md): operator commands and generated outputs.
- [`../development/`](../development/README.md): engineering process and verification.

## Files

- [`map.md`](map.md): recursive reading map for behavior lookup.
- [`contracts.md`](contracts.md): compact list of locked behavior contracts.

## Stable Query Pattern

When extracting behavior from docs:
1. Read the feature root for the user-facing contract.
2. Read decisions for locked cross-cutting behavior.
3. Read the schema docs for field names and required values.
4. Read reference sections for runtime configuration and outputs.
5. Use schema names as canonical identifiers for manifests and settings.

## LLM-Readable Conventions

- Keep answers scoped to file names and section headings.
- Distinguish required behavior from recommended behavior.
- Use manifest field names as canonical keys.
