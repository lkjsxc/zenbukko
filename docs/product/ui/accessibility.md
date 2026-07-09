# Accessibility

## Purpose

Minimum accessibility requirements for the Web UI.

## Requirements

- Semantic HTML: `main`, `nav`, `header`, `section`, `label` with `for`/`id`.
- A skip link targets the main content; route changes focus its heading region.
- Active navigation uses `aria-current="page"`.
- Loading regions expose `aria-busy` or a live status message.
- Log output uses `role="log"`, `aria-live="polite"`, and incremental updates.
- Focus is clearly visible on every interactive element.
- Status badges include text labels, not color alone.
- Tables use scoped headers and remain horizontally scrollable when needed.
- `prefers-reduced-motion: reduce` disables non-essential animation.

## Keyboard

- Tables are navigable with Tab to action buttons.
- Toast dismiss controls have accessible names.
- Escape closes drawers where applicable.

## Failure Behavior

Accessibility gaps are bugs; fix in same change set as the feature.
