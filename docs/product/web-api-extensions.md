# Web API Extensions

## Purpose

Document API endpoints added for the redesigned Web UI.

## GET /api/courses/:courseId

Returns course title and chapter list for visual chapter picker.

**Response:** `{ courseId: number, title?: string, chapters: [{ id, title?, order? }] }`

**Errors:** 404 no session; 400 invalid courseId; 502 NNN upstream failure.

## GET /api/courses/:courseId/chapters/:chapterId

Returns chapter sections for advanced lesson filtering.

**Response:** `{ id, title?, sections: [{ id, title?, kind: 'lesson'|'movie'|'other' }] }`

## GET /api/outputs/content

**Query:** `path` — relative path under output directory.

**Response:** `{ path, content, encoding: 'utf-8' }` for md, txt, srt, vtt, json, html.

**415** for binary types — use download endpoint.

## GET /api/outputs/download

**Query:** `path` — relative path under output directory.

Streams file with `Content-Disposition: attachment`.

## Path Validation

The query is a canonical portable relative identifier using `/`. Reject empty input, absolute or drive/UNC paths, backslashes, NUL, duplicate separators, `.` and `..` segments. Both lexical and existing-file real paths must remain under `outputDir`; symlinks cannot escape it.

The content response returns the canonical path identifier.

## Failure Behavior

Validation failures return HTTP 400. Missing files return HTTP 404.
