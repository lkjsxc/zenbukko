# Accessibility

## Purpose

Minimum accessibility requirements for the Web UI.

## Requirements

- Semantic HTML: `main`, `nav`, `header`, `section`, `label` with `for`/`id`.
- Log panel: `aria-live="polite"` for streaming updates.
- Focus visible on interactive elements.
- Status badges include text labels, not color alone.
- `prefers-reduced-motion: reduce` disables non-essential animation.

## Keyboard

- Tables navigable with Tab to action buttons.
- Escape closes drawers where applicable.

## Failure Behavior

Accessibility gaps are bugs; fix in same change set as the feature.
