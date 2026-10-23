# Dependencies

## Runtime

- server.js uses Node built-ins http, fs, path, crypto and async_hooks, plus global fetch and AbortController.
- Dockerfile selects node:22-alpine. No package.json, npm installation or bundler is present.
- index.html implements its own workbook reader and canvas charts, without external script dependencies.
- Browser XLSX decompression requires DecompressionStream, with deflate-raw and deflate attempts. Other required APIs include DOMParser, Blob, TextDecoder, fetch and canvas.
- Odoo API workflows require access to an Odoo XML-RPC service and permissions for timesheets, planning and associated lookup models.
- Docker Compose is optional for container execution.
- FR/NL presentation uses repository-owned UMD/CommonJS `i18n.js` and explicit
  message fragments; browser locale formatting uses native `Intl` APIs. No
  translation service, package installation or external asset request is used.
- `chart-palette.js` is a repository-owned Browser/CommonJS dependency of
  project and Unit/programme area charts and header settings. It uses native
  browser storage and disposable listeners; no chart package or remote service
  is added. The authenticated script loads before its chart consumers.
- Project-map settling, replay and grouping transitions use the repository's
  own deterministic particle solver, native `requestAnimationFrame`/
  `cancelAnimationFrame` and `matchMedia` reduced-motion preference. Missing
  animation APIs retain the final static SVG. No graph/animation package is used.

## Internal relationships

The login page and dashboard consume JSON from server.js; tests/auth.test.js
uses the Node built-in test runner and a local simulated Odoo server. The server
reads config.local.json and can merge its local language preference through
`language-preferences.js`, independently of Odoo credentials. Only explicitly
allowed application pages/browser assets are served; the public i18n assets
support login while dashboard modules remain authenticated. Docker copies the
build context into /app and starts that same server. See
[Configuration](CONFIGURATION.md) for preference persistence and mount limits.

## Refresh

- Last refreshed: 2026-10-22
- Source basis: index.html, server.js, i18n.js, i18n-*-messages.js,
  language-client.js, language-preferences.js, project-similarity.js,
  Dockerfile and root inventory.
- Limitations: no browser compatibility matrix or live Odoo compatibility test is present.
