# Commits

## Purpose

Keep the documentation-first upgrade reviewable.

## Sequence

1. Documentation tree and slim root README.
2. Line-limit checker and test scaffolding.
3. Web refactor with no intended behavior change.
4. Downloader/materials/NNN/OCR refactor with no intended behavior change.
5. Session prefill, web settings, and chapter range support.
6. Gemini Batch/Flex OCR.
7. Whisper CPU/CUDA Docker build changes.
8. Final docs updates, lint cleanup, and verification notes.

## Invariants

Each commit should be coherent and should not revert unrelated existing worktree changes.
