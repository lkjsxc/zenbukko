# Gemini Cloud Mode

## Purpose

Define execution behavior when the OCR backend is Google Gemini.

## Auto Mode

`auto` uses Batch for multiple runnable PDFs and Flex for single work, all-skipped runs, or Batch recovery.

## Batch Mode

Batch uploads PDFs through the Gemini Files API and uses inline requests that reference uploaded file URIs. The batch job name is recorded for each successful batch-written output.

## Flex Mode

Flex sends synchronous OCR requests with `serviceTier: "flex"`, long timeout, and retry handling for `429` and `503`.

## Standard Tier

Standard tier is not the default recovery path. It is used only when the operator explicitly selects `ocrServiceTier: "standard"` or `--ocr-service-tier standard`.
