# Error Handling

## Purpose

How the Web UI surfaces failures.

## Auth Errors

Missing or invalid web token: full-screen AuthGate with instructions to use token URL from server logs.

## API Errors

Non-2xx responses: toast with `error` message from JSON body. Buttons re-enable after failure.

## Validation Errors

Client-side validation before POST: inline field messages and toast summary.

## SSE Errors

LogViewer shows reconnect banner on `EventSource` error. Exponential backoff up to 30s.

## Job Failures

Failed jobs display `error` field in job table. Log panel retains full log text.

## Failure Behavior

Never use blocking `alert()`. Never fail silently with `console.error` only.
