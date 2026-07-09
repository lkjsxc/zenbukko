# Path Contracts

## Purpose

Keep local filesystem operations correct on Windows, macOS, and Linux while making generated artifacts portable.

## Native Filesystem Paths

CLI input/output paths, internal discovery paths, resolved API files, executable paths, and command result paths use the host operating system's path format. Absolute Windows paths therefore use drive letters or UNC form and `\` separators.

Tests for native paths compare with `path.resolve()` or `path.join()` rather than hard-coded separators.

## Portable Relative Identifiers

Paths serialized into these surfaces are relative to an explicit root and always use `/`:

- Output-list and preview API JSON.
- Material manifest relative fields and offline HTML links.
- Report-prompt source labels and attributes.
- Other JSON or Markdown fields documented as relative paths.

Portable identifiers reject empty input, absolute paths, drive or UNC prefixes, backslashes, NUL, `.` segments, `..` segments, and ambiguous duplicate separators. Case is preserved.

## Containment

Lexical resolution and existing-file real paths must remain inside the declared root. An in-root symlink must not expose a file outside the output root. Manifest-controlled source and PDF paths must remain inside their material directory.

## Exceptions

OCR manifests intentionally record local absolute diagnostic paths. Those paths remain OS-native and are not portable artifact identifiers.
