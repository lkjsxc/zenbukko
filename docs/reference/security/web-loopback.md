# Web Exposure

## Behavior

- The default non-Docker web flow can bind to loopback for local operator use.
- Docker Compose publishes the Web UI on `0.0.0.0:8787` for trusted-network access.
- Browser access does not require a generated Zenbukko token.
- Web proxies `/api/*` directly to Core API.
- Core API has no token by default and should stay on loopback or an internal Compose network.

## Operator Responsibility

Expose the Web service only on trusted networks or behind a separate access-control layer. Native API and Web defaults remain on loopback and print a warning when explicitly bound elsewhere. Session data, settings, jobs, and generated outputs are local private data.

The Web proxy accepts only HTTP(S) upstream URLs without embedded credentials, preserves the configured upstream origin, and rejects request bodies larger than 4 MB.
