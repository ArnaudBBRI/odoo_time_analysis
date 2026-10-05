# Overview

The Odoo Time Dashboard compares actual and planned hours from Odoo pivot XLSX exports or read-only XML-RPC queries. It provides personal project distributions, remaining hours, employee contributions, monthly and cumulative project charts, and uploaded task deadline markers.

## Entry points

- Run the server and open / for the [Buildwise welcome page](../../login.html). Sign in with an Odoo email/password to access /dashboard. The top-level XLSX upload controls in index.html are currently commented out; the underlying parsers remain implemented.
- Run [server.js](../../server.js) for static hosting and the Odoo connector.
- [Dockerfile](../../Dockerfile) and [docker-compose.yml](../../docker-compose.yml) provide container execution.

login.html contains the responsive welcome/sign-in page; index.html contains the protected dashboard, workbook reader, aggregation and canvas charts. The Node server uses built-in modules and global fetch; there is no package manifest or compilation step.

## Refresh

- Last refreshed: 2026-10-05
- Source basis: login.html, index.html, server.js, README.md, Docker files and tests/auth.test.js.
- Limitations: browser imports and live Odoo access were not exercised during this refresh.
