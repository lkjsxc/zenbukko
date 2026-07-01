# Unsupported OCR Field Search

## Purpose

Verify that removed remote OCR settings do not reappear in source, docs, tests, package metadata, or Compose files.

## Command

Run the current operator-provided forbidden-term search from the work order. Exclude generated and private directories:

```sh
-g '!node_modules' -g '!dist' -g '!data' -g '!tmp'
```

## Expected Result

No matches.

## Follow-Up

If a match appears, remove the setting, code path, package entry, or wording. Do not keep compatibility wrappers for removed OCR providers.
