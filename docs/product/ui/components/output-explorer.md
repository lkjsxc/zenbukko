# Output Explorer

## Purpose

List and preview output artifacts.

## Layout

Left: filter chips + scrollable file list.
Right: preview pane or download prompt for binary.

## Filters

Visible labels are All, Markdown, Transcripts, PDF, JSON, and HTML. Selected filters expose `aria-pressed`.

## Invariants

Preview only known text extensions and decide before requesting content. Every selected file has a same-origin download action; no browser token is required. No-output and no-filter-match states are distinct.
