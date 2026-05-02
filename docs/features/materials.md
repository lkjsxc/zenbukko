# Materials

## Purpose

Download lesson reference pages and linked material assets for offline study.

## Inputs

- Reference page URLs from resolved lessons or movies.
- Authenticated request headers.

## Outputs

- Saved reference HTML pages.
- Downloaded assets under `assets/` with stable hashed file names.
- `materials_manifest.json`.
- Offline `index.html`.

## Invariants

Existing stable files are reused. Legacy top-level material files are recognized to avoid duplicate downloads.

## Failure Behavior

Individual reference pages or assets may fail without aborting the entire course when the surrounding workflow can continue.
