# Overview

The Odoo Time Dashboard compares actual and planned hours from Odoo pivot XLSX exports or read-only XML-RPC queries. It provides personal project distributions, remaining hours, employee contributions, monthly and cumulative project charts, and uploaded task deadline markers.

## Entry points

- Open [index.html](../../index.html) directly for XLSX imports.
- Run [server.js](../../server.js) for static hosting and the Odoo connector.
- [Dockerfile](../../Dockerfile) and [docker-compose.yml](../../docker-compose.yml) provide container execution.

The browser contains the UI, workbook reader, aggregation, and canvas charts in one HTML file. The Node server uses built-in modules and global fetch; there is no package manifest or compilation step.

## Refresh

- Last refreshed: 2026-10-05
- Source basis: index.html, server.js, README.md, Dockerfile, docker-compose.yml.
- Limitations: browser imports and live Odoo access were not exercised during this refresh.
