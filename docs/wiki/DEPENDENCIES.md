# Dependencies

## Runtime

- server.js uses Node built-ins http, fs, path, crypto and async_hooks, plus global fetch and AbortController.
- Dockerfile selects node:22-alpine. No package.json, npm installation or bundler is present.
- index.html implements its own workbook reader and canvas charts, without external script dependencies.
- Browser XLSX decompression requires DecompressionStream, with deflate-raw and deflate attempts. Other required APIs include DOMParser, Blob, TextDecoder, fetch and canvas.
- Odoo API workflows require access to an Odoo XML-RPC service and permissions for timesheets, planning and associated lookup models.
- Docker Compose is optional for container execution.

## Internal relationships

The login page and dashboard consume JSON from server.js; tests/auth.test.js uses the Node built-in test runner and a local simulated Odoo server. The server reads config.local.json when present and serves only the application pages and logo. Docker copies the build context into /app and starts that same server. See [Configuration](CONFIGURATION.md) for the build-context limitation.

## Refresh

- Last refreshed: 2026-10-05
- Source basis: index.html, server.js, Dockerfile and root inventory.
- Limitations: no browser compatibility matrix or live Odoo compatibility test is present.
