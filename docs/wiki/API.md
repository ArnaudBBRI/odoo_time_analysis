# API

The local server returns JSON from these routes. The browser calls them from the same origin.

| Method | Route | Inputs and successful response |
| --- | --- | --- |
| GET | /api/config | No body; returns ok, hasConfig, connector fields and hasApiKey, never the API key itself. |
| POST | /api/odoo/test-connection | Authentication settings; returns ok, uid and optional serverVersion. |
| POST | /api/odoo/list-databases | Odoo URL; returns ok and sorted databases. Odoo may disable database listing. |
| POST | /api/odoo/employee-timesheets | Authentication and employeeName; returns normalized lines, monthly project totals, lineCount, totalHours, domain and warnings. |
| POST | /api/odoo/employee-planning | Authentication and employeeName; returns normalized slots, monthly project totals, slotCount, totalHours, available fields, domain and warnings. |
| POST | /api/odoo/project-timesheets | Authentication and projectCode; returns project identity, normalized lines, monthly employee totals, counts, hours, domain and warnings. |
| POST | /api/odoo/project-planning | Authentication and projectCode; returns project identity, normalized slots, monthly employee totals, counts, hours, fields, domain and warnings. |

Authentication fields are odooUrl, database, username and apiKey. Nonblank request values override local configuration and defaults. See [Configuration](CONFIGURATION.md) for accepted aliases.

Wrong HTTP methods return 405. Invalid settings or JSON return 400; rejected authentication returns 401. Employee fallback lookup can return 404; unexpected database-list structure returns 502. Unhandled errors return 500 with ok: false and an error string. JSON bodies are limited to 64 KiB; oversized requests are destroyed.

Static hosting maps / to index.html, returns 204 for /favicon.ico, blocks config.local.json with 403, and rejects missing files, directories and paths outside the repository with 404. Other existing repository files can be served; this is not an authenticated hosting layer.

Odoo calls use /xmlrpc/2/common, /xmlrpc/2/db and /xmlrpc/2/object. Queries use fields_get and search_read, with 1,000-record pages by default. No Odoo write operations are implemented.

## Refresh

- Last refreshed: 2026-10-05
- Source basis: server.js handlers, configuration helpers, searchReadAll and xmlRpcCall; index.html fetch callers.
- Limitations: live Odoo permissions, schemas and responses were not verified.
