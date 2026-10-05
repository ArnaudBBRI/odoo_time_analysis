# API

The local server returns JSON. All dashboard and Odoo routes require a valid bw_session cookie. Unauthenticated API requests return 401 with authenticationRequired: true; protected page requests redirect to /login.

## Authentication

| Method | Route | Behavior |
| --- | --- | --- |
| POST | /api/auth/login | Public. JSON email/password; authenticates through configured Odoo XML-RPC, sets HttpOnly/SameSite=Lax cookie, returns ok, email and expiresAt. |
| POST | /api/auth/logout | Removes the current session and clears its cookie; returns ok, including when already signed out. |
| GET | /api/auth/session | Protected. Returns ok, email and expiresAt. |

Login returns 400 for invalid input, 401 for rejected credentials, 429 for rate limiting, 502 for upstream/configuration failure and 503 when session capacity is reached. Origin checks reject cross-site POSTs with 403. Incorrect endpoint methods return 405. See [Configuration](CONFIGURATION.md) for HTTPS, lifetime and limits.

## Dashboard connector

| Method | Route | Query inputs and successful response |
| --- | --- | --- |
| GET | /api/config | Public session connector fields, hasConfig, authenticated and hasApiKey: false; no credential secret. |
| POST | /api/odoo/test-connection | Uses session identity; returns uid and optional serverVersion. |
| POST | /api/odoo/list-databases | Uses session instance URL; returns sorted databases, if Odoo permits listing. |
| POST | /api/odoo/employee-timesheets | employeeName; normalized lines, monthly project totals, lineCount, totalHours, domain and warnings. |
| POST | /api/odoo/employee-planning | employeeName; normalized slots, monthly project totals, slotCount, totalHours, fields, domain and warnings. |
| POST | /api/odoo/project-timesheets | projectCode; project identity, normalized lines, monthly employee totals, counts, hours, domain and warnings. |
| POST | /api/odoo/project-planning | projectCode; project identity, normalized slots, monthly employee totals, counts, hours, fields, domain and warnings. |

Session URL, database, username and password override any caller-supplied authentication fields and private config credentials. Invalid query settings/JSON return 400. Rejected Odoo query authentication returns 401; employee fallback lookup can return 404; unexpected database-list structure returns 502. Unhandled errors return 500. JSON bodies are limited to 64 KiB; oversized connections are destroyed.

Odoo calls use /xmlrpc/2/common, /xmlrpc/2/db and /xmlrpc/2/object. Read operations use fields_get and search_read, with default 1,000-record pages. No Odoo write operations are implemented.

## Pages and files

- /, /login and /login.html serve the public welcome page, or redirect signed-in users to /dashboard.
- /dashboard and /index.html serve the protected dashboard.
- /assets/buildwise-logo.svg is public; /favicon.ico returns 204.
- Other files/routes return 404 after login. Anonymous non-API requests redirect to /login.
- Responses use no-store, nosniff, same-origin referrer policy and a CSP blocking framing and off-origin connections. Inline scripts/styles remain allowed for the current single-file pages.

## Refresh

- Last refreshed: 2026-10-05
- Source basis: server.js, browser callers and tests/auth.test.js.
- Limitations: integration tests use simulated Odoo; real Odoo permissions and schemas remain unverified.
