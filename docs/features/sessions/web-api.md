# Session Web API

## Endpoints

- `GET /api/session`: returns existence, normalized session data, and a formatted JSON string for UI prefill.
- `POST /api/session`: validates and saves normalized session JSON.

## Browser Behavior

- The Session panel may paste the exported JSON directly.
- Existing session data is loaded for display through `GET /api/session`.

## Security

Session data is browser cookie material. Treat it as secret local data and store it only in configured data paths.
