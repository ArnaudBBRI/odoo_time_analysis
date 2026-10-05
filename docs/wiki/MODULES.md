# Modules

| File or directory | Observed responsibility |
| --- | --- |
| [index.html](../../index.html) | Single browser application with inline CSS/script. Handles uploads, connector forms, in-memory state, filters, tables, and canvas charts. |
| [server.js](../../server.js) | Node HTTP server, static serving, JSON routes, connector settings, guarded XML-RPC transport, Odoo reads, and normalization. |
| [tests/odoo-read-only.test.js](../../tests/odoo-read-only.test.js) | Offline tests of the RPC boundary using mocked server startup, file access, timers, and network. |
| [tests/remaining-hours.test.js](../../tests/remaining-hours.test.js) | Offline checks of through-today totals, year/date/timezone boundaries, bar thresholds/scaling, API adapters, and row rendering. |
| [tests/subcontractor-roles.test.js](../../tests/subcontractor-roles.test.js) | Mocked backend checks of exact function matching, scoped HR/public reads, identity/resource resolution, fallback warnings, and inclusive/employee-only hour responses. |
| [tests/subcontractor-hours.test.js](../../tests/subcontractor-hours.test.js) | Offline browser-script checks of default exclusion, local inclusion rebuilding, chart inputs, task consumption, notices, and separate macro overrides. |
| [tests/sticky-scope.test.js](../../tests/sticky-scope.test.js) | Offline checks of sticky controls, Me/Whole Project identity/scoped chart feeds, shared baselines, Dico, and lazy project-hour caching. |
| [config.example.json](../../config.example.json) | Public example connector settings. |
| `config.local.json` | Optional private settings; ignored by Git and blocked by static serving. |
| [README.md](../../README.md) | Run instructions and expected XLSX export shapes. |
| Root `*.xlsx` files | Existing timesheet, planning, and task export files; contents were not inspected. |
| [docs/ai-governance/](../ai-governance/) | Framework-managed assistant workflow. |
| [docs/ai-context/](../ai-context/) | Project-owned policy and operational memory. |
| [docs/wiki/](./) | Generated source-derived technical documentation. |
| `.ai/`, `.codex/`, `.github/` | Framework manifest, optional session-start hook, and Issue/PR templates. |

In `index.html`, `readXlsx`/`parse*Workbook` decode workbooks;
`build*FromApi` adapt connector results; `render*` update the dashboard. State
contains datasets, maps, sets, active selections, and local overrides.
`budgetMonthlySummary`/`budgetHourRecords` select the hour inclusion mode;
`setIncludeOrmittersHours` rebuilds API-backed datasets from retained responses.
`getPersonalIdentity`/`recordMatchesPersonalIdentity` prefer fetched employee IDs;
`scopeProjectHours` and `getScopedOverview` derive presentation inputs for
Me / Whole Project. `ensureWholeProjectHours` reads and caches only missing
project timesheet/planning responses. Sticky controls share these scope/year
settings across relevant hour renderers; task and financial views retain their
shared baseline.

In `server.js`, `handle*` implement routes; `searchReadAll`/`getModelFields`
perform record/metadata reads; `normalize*`/`buildMonthly*` prepare responses.
`enrichEmployeeFunctions` resolves current HR functions and planning resources;
`isSubcontractorFunction` applies exact normalized matching.
Budget/task helpers discover custom fields. `xmlRpcCall` is the shared outbound
transport and first calls `assertReadOnlyOdooCall`.

## Refresh

- Last refreshed: 2026-10-05.
- Source basis: `index.html`, `server.js`, the five offline test files,
  `README.md`, `config.example.json`, `.gitignore`, and directory inventory.
- Limitations: private config and XLSX contents were not read; this maps current
  files without asserting a future modularization or deployment structure.
