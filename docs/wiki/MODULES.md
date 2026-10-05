# Modules

| File or directory | Responsibility |
| --- | --- |
| [index.html](../../index.html) | Inline CSS and JavaScript, connector UI, ZIP/XML workbook parsing, dataset conversion, year filters, canvas charts, tables and deadline overlays. |
| [server.js](../../server.js) | HTTP routing, static files, private configuration, input validation, Odoo authentication, paginated queries, XML-RPC encoding/decoding and monthly summaries. |
| [config.example.json](../../config.example.json) | Example connector configuration; copy to private config.local.json. |
| [Dockerfile](../../Dockerfile) | Node 22 Alpine runtime and server startup. |
| [docker-compose.yml](../../docker-compose.yml) | Port publication, environment and optional read-only config mount. |
| Root XLSX files | Example exports for personal and project timesheets, planning and tasks. |
| docs/wiki/ | Technical descriptions grounded in repository files. |
| docs/ai-context/ | Project status, decisions and operational limitations. |
| docs/ai-governance/ | Framework-managed assistant workflow. |

## Refresh

- Last refreshed: 2026-10-05
- Source basis: root file inventory, index.html, server.js, Docker files and framework manifest.
- Limitations: example workbook contents were not inspected.
