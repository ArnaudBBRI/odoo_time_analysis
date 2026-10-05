# API

[server.js](../../server.js) binds to `127.0.0.1` on port `8765` by default.
The browser calls these local JSON routes:

| Method | Route | Main result |
| --- | --- | --- |
| GET | `/api/config` | Non-secret defaults/settings, `hasConfig`, and `hasApiKey`. |
| POST | `/api/odoo/test-connection` | Authenticated `uid` and optional `serverVersion`. |
| POST | `/api/odoo/list-databases` | Sorted database names. |
| POST | `/api/odoo/employee-timesheets` | Employee timesheet `lines`, `monthly` totals, count, and total hours. |
| POST | `/api/odoo/employee-planning` | Employee planning `slots`, `monthly` totals, count, and total hours. |
| POST | `/api/odoo/project-timesheets` | Project timesheet lines and monthly totals by employee. |
| POST | `/api/odoo/project-planning` | Project planning slots and monthly totals by employee. |
| POST | `/api/odoo/project-workpackages` | Normalized project tasks, work-package detection, and progress. |
| POST | `/api/odoo/project-milestones` | Dated project milestones. |
| POST | `/api/odoo/project-budgets` | Convention/annual budgets, lines, diagnostics, and excluded future-year count. |
| POST | `/api/odoo/dico-projects` | Responsible-unit projects, aggregate monthly hours, and normalized timesheet `lines`/planning `slots` for through-today comparisons. |

POST bodies accept connector settings (`url` or `odooUrl`, `database`,
`username`, `apiKey`). Blank values fall back to server-side settings.
Employee routes also require `employeeName`; project routes require a project
reference via `projectCode` (with `projectName`/`projectQuery` aliases).
Database listing only needs a URL. The server chooses all Odoo models and
methods; no public generic RPC endpoint exists.

Responses include `ok`. Failures return `error`; many data responses include
`warnings`, query domains, and fields. Method mismatch returns 405; invalid
settings/JSON return 400; failed authentication returns 401; unhandled errors
return 500. JSON request bodies are capped at 64 KiB.

The four employee/project hour routes retain inclusive `monthly`, counts,
`totalHours`, and raw `lines`/`slots`, and add `employeeMonthly` with classified
subcontractor hours excluded. Dico similarly retains inclusive `actualMonthly`,
`plannedMonthly`, counts/totals, `lines`/`slots`, and adds
`employeeActualMonthly`/`employeePlannedMonthly`. Empty filtered summaries are
valid arrays; browser adapters retain months from the inclusive summaries.

Normalized hour records add `employeeFunction`, `employeeFunctionSource`,
`isSubcontractor`, and `subcontractorClassification` (`employee-function`,
`planning-role`, or `unknown`). Planning keeps `resourceId` separate from
`employeeId`. Function lookup reads only fetched employee/resource identities
through `hr.employee` and, when needed, `hr.employee.public`, including archived
employees. HR record fields are limited to ID/name, `job_title`, `job_id`, and
`resource_id`. Resource mappings use the resolved employee's latest metadata.
Lookup failures, unknown functions, and planning-role fallback emit warnings.
See [Domain](DOMAIN.md) for matching and [Data Flow](DATA_FLOW.md) for filtering.

The browser's Whole Project scope reuses `/api/odoo/project-timesheets` and
`/api/odoo/project-planning` to cache missing team-hour responses for projects
listed in the personal overview. Project details can seed this cache. Dico
responses already contain full records for employee-scope filtering. No new
route or outbound RPC operation is introduced by the sticky scope controls.

## Outbound integration

`assertReadOnlyOdooCall` permits only these service/method combinations before
XML serialization or network access:

- `/xmlrpc/2/common`: `authenticate`, `version`.
- `/xmlrpc/2/db`: `list`.
- `/xmlrpc/2/object`: `execute_kw` wrapping `fields_get` or `search_read`.

Unknown operations, malformed envelopes, and query/fragment URLs are rejected;
there is no runtime bypass. XML-RPC uses HTTP POST with a 15-second timeout.
`searchReadAll` paginates in groups of 1,000 by default. See the mandatory
[Odoo policy](../ai-context/PROJECT_RULES.md) before changing the integration.

The root serves `index.html`; existing repository files use the static handler
except `config.local.json` (403). Missing/out-of-root paths return 404;
`/favicon.ico` returns 204.

## Refresh

- Last refreshed: 2026-10-05.
- Source basis: route dispatch, hour handlers/function enrichment, settings,
  pagination, RPC guard/transport, and static serving in `server.js`; requests
  and API adapters in `index.html`.
- Limitations: response behavior is source-derived; no live Odoo calls,
  authentication, permissions, or custom-model compatibility were tested.
