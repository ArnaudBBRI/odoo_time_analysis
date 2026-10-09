# Modules

| File or directory | Responsibility |
| --- | --- |
| [login.html](../../login.html) | Buildwise welcome page, email/password form, visibility toggle and authentication error messages. |
| [assets/buildwise-logo.svg](../../assets/buildwise-logo.svg) | Official Buildwise logo extracted from its public SVG sprite. |
| [tests/portfolio-ui.test.js](../../tests/portfolio-ui.test.js) | Frontend tests for zero-hour portfolio rows and unknown planning values. |
| [tests/auth.test.js](../../tests/auth.test.js) | Isolated HTTP/XML-RPC authentication integration tests using the Node test runner. |
| [index.html](../../index.html) | Inline connector/import UI, dataset conversion, year filters, legacy charts/tables, personal/project/lifetime hour summaries, inclusive project-date clipping, exact-ID contributor reconciliation, per-project Ormitter inclusion/monthly-cumulative/employee choices, stale-selection clearing and reveal revisions, and generation-scoped full-history cache. |
| [personal-time.js](../../personal-time.js) | Browser/CommonJS personal ID aggregation, Brussels actual cutoff, selected UTC-year planning, planned-first grouped legend/Hors planning subtotal, macro calendar/sector geometry, project-date-clipped scoped calendar reference, unique colors, SVG rendering and accessible local interactions. |
| [personal-time.css](../../personal-time.css) | Responsive personal macro/legend/tooltip styling, radial-sector hover/focus and reduced-motion behavior. |
| [project-monthly.js](../../project-monthly.js) | Browser/CommonJS exact-ID monthly or cumulative actual aggregation from project start through Brussels today, signed cents/prefix sums, continuous month bins, full-project employee planning with unique resource mapping, precise daily individual/convention references and cumulative plateau, explicit unavailable dates/identities and default consultant exclusion. |
| [project-browser.js](../../project-browser.js) | Browser/CommonJS scoped project grid, three hour comparisons in Vue d’ensemble, signed stacked-area or selected-employee solid/dotted-line SVG geometry, shared employee colors, thick net-total/dotted convention lines, employee legend buttons/reset, synchronized Ormitter controls, monthly/cumulative radios, selected-aware month keyboard/touch tooltips/table, revision-based viewport reveal lifecycle and focus preservation. |
| [project-browser.css](../../project-browser.css) | Responsive project tiles, smaller selected title, 37.8px comparison bars, in-segment contributor bubbles/list/tooltips, readable monthly axes/legend/details, employee selection/reset and adjacent mode/inclusion controls, synchronized area/line-reveal clipping, reduced motion and focus styles. |
| [tests/project-browser.test.js](../../tests/project-browser.test.js) | Synthetic project radio/photo/focus, scoped/lifetime comparison geometry, missing convention, shared Ormitter checkbox, contributor stack/breakdown, selected-employee actual/planned lines, zero/unavailable messages and selection/focus/reveal tests. |
| [tests/project-monthly.test.js](../../tests/project-monthly.test.js) | Isolated monthly/cumulative identity, signed reconciliation/prefix sums, date/Brussels boundaries, zero/partial months, full-project individual planning, exact/ambiguous resource mapping, zero/unavailable planning, convention precision/plateau and optional-source fixtures. |
| [server.js](../../server.js) | HTTP routing, restricted application files, in-memory sessions, login rate limiting, origin checks, private configuration, input validation, Odoo authentication, scoped optional contributor/photo/assignment/convention/date reads, paginated queries, XML-RPC encoding/decoding and monthly summaries. |
| [config.example.json](../../config.example.json) | Example connector configuration; copy to private config.local.json. |
| [Dockerfile](../../Dockerfile) | Node 22 Alpine runtime and server startup. |
| [docker-compose.yml](../../docker-compose.yml) | Port publication, environment and optional read-only config mount. |
| Root XLSX files | Example exports for personal and project timesheets, planning and tasks. |
| docs/wiki/ | Technical descriptions grounded in repository files. |
| docs/ai-context/ | Project status, decisions and operational limitations. |
| docs/ai-governance/ | Framework-managed assistant workflow. |

## DiCo steering

The DiCo steering extension separates shared calculations (`steering.js`), read orchestration (`steering-service.js`) and browser rendering (`steering-client.js` / `steering-client.css`). Navigation routes the main Projets tab to the personal project browser, while programme/unit and leader/contributor shortcuts use the internal steering portfolio. [Pilotage](PILOTAGE.md) documents steering API, configuration, source restrictions and test harnesses.

## Refresh

- Last refreshed: 2026-10-09
- Source basis: personal-time.js/css, project-monthly.js, project-browser.js/css, tests/project-monthly.test.js, tests/project-browser.test.js, steering-client.js, index.html, server.js, Docker files and framework manifest.
- Limitations: example workbook contents were not inspected.

## Integrated project modules

server.js includes metadata-driven work-package, milestone and budget handlers and an explicit read-only RPC allowlist. index.html retains the corresponding project visualizations, selected-year comparisons, subcontractor inclusion and generation-scoped caches. Unit-row drilldowns fetch the shared details by exact project ID after installing already loaded hour summaries.
