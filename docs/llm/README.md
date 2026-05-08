# LLM Index

## Purpose

Provide a compact, deterministic map for reading Zenbukko behavior quickly.

## Top-Level Pointers

- [`../features/`](../features/README.md): feature contracts and invariants.
- [`../reference/`](../reference/README.md): settings, APIs, outputs, and troubleshooting.
- [`../architecture/`](../architecture/README.md): control flow and module boundaries.
- [`../usage/`](../usage/README.md): operator commands and generated outputs.
- [`../development/`](../development/README.md): engineering process and verification.

## Stable Query Pattern

When extracting behavior from docs:
1. Read the feature root for the user-facing contract.
2. Read the schema docs for field names and required values.
3. Read reference sections for runtime configuration and outputs.
4. Use schema names as canonical identifiers for manifests and settings.

## LLM-Readable Conventions

- Keep answers scoped to file names and section headings.
- Distinguish required behavior from recommended behavior.
- Use manifest field names as canonical keys.
