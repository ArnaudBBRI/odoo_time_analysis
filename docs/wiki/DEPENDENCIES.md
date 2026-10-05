# Dependencies

| Area | Observed dependencies |
| --- | --- |
| Backend | Node.js core `http`, `fs`, `path`; globals `fetch`, `AbortController`, `URL`, `Buffer`. |
| Browser input | File/Blob, ArrayBuffer/DataView, TextDecoder, DOMParser, and `DecompressionStream` for compressed XLSX. |
| Browser display | DOM, canvas 2D, Intl/date, Map/Set, Promise/fetch APIs. |
| Odoo connector | Reachable XML-RPC common/db/object services; account/API key with read permissions on relevant models. |
| Safety tests | Built-in Node `node:test`, `node:assert/strict`, `node:vm`, and file/path utilities. |
| Workflow | PowerShell for the optional session-start hook; Git for branch/history checks. |

There is no `package.json`, lockfile, vendored application library, external
script tag, or CDN dependency in the inspected application. XLSX ZIP/XML parsing
and chart drawing are implemented in `index.html`; XML-RPC encoding/parsing
is implemented in `server.js`.

The repository does not pin a Node.js version. The connector needs a runtime
providing its global APIs. The XLSX reader reports an error if the browser lacks
`DecompressionStream` or cannot decode the compressed input. Run instructions
use an existing runtime and ordinary user commands.

## Refresh

- Last refreshed: 2026-10-05.
- Source basis: imports/global APIs in `server.js` and tests; script tags and
  workbook/chart code in `index.html`; inventory and optional Codex hook.
- Limitations: runtime/browser compatibility was not measured across versions;
  live services and automatic hook execution were not verified.
