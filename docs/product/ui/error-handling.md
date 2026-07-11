# Error Handling

## Purpose

How the Web UI surfaces failures.

## Access Errors

Zenbukko does not add a browser-token gate. Network or upstream access failures surface as API errors.

## API Errors

Non-2xx responses: toast with `error` message from JSON body. Recoverable screen-level failures also provide inline retry. Buttons re-enable after failure, and unsaved form input is retained.

Initial resources load independently so one failed endpoint does not hide successful data.

## Validation Errors

Client-side validation before POST: inline field messages and toast summary. Invalid values remain available for correction.

## SSE Errors

LogViewer shows a persistent reconnect banner on `EventSource` error. Exponential backoff runs up to 30s and is cancelled when the operator leaves the job.

## Job Failures

Failed jobs display `error` field in job table. Log panel retains the most recent bounded log text.

## Failure Behavior

Never use blocking `alert()`. Never fail silently with `console.error` only.
