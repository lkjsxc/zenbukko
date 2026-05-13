# Web Loopback

## Behavior

- The default web flow binds to loopback.
- Browser access requires a generated token.
- Docker web services publish loopback host ports by default.

## Operator Responsibility

Do not expose the web service beyond trusted local access unless a separate access-control layer is provided.
