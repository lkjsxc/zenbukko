# Settings Schema

## Purpose

API settings persist operator preferences under `/data/api/settings.json` in Compose.

## Fields

- `chapterRange`: one-based chapter ordinal range expression.
- `ndlocrCommand`: OCR executable name or absolute path.
- `ndlocrDevice`: `cpu` or `cuda`.
- `ocrPageDpi`: PDF rasterization DPI, 72 through 600.
- `ocrKeepIntermediates`: retain page images and raw text outputs.
- `ndlocrEnableTcy`: enable tate-chu-yoko handling when supported by the local runner.

## Defaults

- `ndlocrCommand`: `ndlocr-lite`.
- `ndlocrDevice`: `cpu`.
- `ocrPageDpi`: `300`.
- `ocrKeepIntermediates`: `false`.
- `ndlocrEnableTcy`: `true`.
- `chapterRange`: empty.

## Precedence

API settings override environment variables for browser-created jobs. Environment variables override built-in defaults. Request fields override settings for a single job.

## Validation

Unknown fields are not returned by the API. Invalid device or DPI values fail settings validation.
