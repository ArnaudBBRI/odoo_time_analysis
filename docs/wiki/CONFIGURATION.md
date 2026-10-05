# Configuration

## Server and connector settings

| Setting | Source/default and behavior |
| --- | --- |
| `PORT` | Environment variable; converted to a number, default `8765`. |
| Host | Fixed `127.0.0.1` in `server.js`. |
| `odooUrl` | Request `url`/`odooUrl`, local config `odooUrl`/`url`, then `https://odoo.buildwise.be/`. Trailing slashes are removed; a root `/web` URL is normalized to the origin. |
| `database` | Request, local config, then `buildwiseprd`. |
| `username` | Request, then local config; required for authenticated reads. |
| `apiKey` | Request, then local config `apiKey`/`api_key`; required for authenticated reads. |
| `employeeName` | Request, then local config; required by employee fetch routes. |
| Project reference | Request `projectCode`/`projectName`/`projectQuery`, then local config `projectId`/`projectID`/`projectCode`; required by project routes. |

The first nonblank value wins. Optional `config.local.json` sits beside
`server.js` and must contain a JSON object.
[config.example.json](../../config.example.json) shows the ordinary keys.
Settings are reread when handlers merge them. The inspected code does not take
Odoo credentials from environment variables or expose a guard bypass setting.

The Dico unit string, body limit (64 KiB), RPC timeout (15 seconds), and default
read page size (1,000) are code constants/defaults. The browser derives its
current year from its clock and keeps chart/filter state and hour overrides
in memory.

## Privacy

`.gitignore` excludes `config.local.json`. Static serving refuses that basename;
`/api/config` returns non-secret fields and `hasApiKey`, never the configured key.
A dashboard-entered key overrides local config for that request, goes to the
local proxy, then to Odoo as the XML-RPC password. The inspected source does
not persist keys in browser storage.

Keep local configuration and exports private. Settings do not approve an Odoo
write; see [PROJECT_RULES.md](../ai-context/PROJECT_RULES.md).

## Refresh

- Last refreshed: 2026-10-05.
- Source basis: defaults, settings/config helpers, config route, static privacy
  check and guard in `server.js`; form/config loading in `index.html`;
  `config.example.json`, `.gitignore`, and `README.md`.
- Limitations: private config contents were deliberately not read. Credentials,
  service permissions, runtime settings, and connectivity remain unverified.
