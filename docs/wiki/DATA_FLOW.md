# Data Flow

## XLSX uploads

1. The user selects personal/project timesheet or planning files, or a project's
   task deadline file.
2. `readXlsx` reads an ArrayBuffer, opens ZIP entries, parses workbook
   relationships/shared strings/worksheet XML, and constructs cell rows.
3. `parse*Workbook` reads the first worksheet and recognizes months,
   project/employee rows, hours, planning events, or deadline counts.
4. Dataset builders populate browser state. Filters and aggregation derive
   totals, remaining hours, cumulative series, and chart inputs.
5. DOM/canvas renderers update tables/charts. Files are processed in the browser;
   this path has no server upload request.

## Odoo connector

1. Browser startup requests `/api/config` to fill non-secret fields. This fails
   harmlessly in the direct-file workflow.
2. User actions send JSON to local `/api/odoo/*` routes. Employee fetches request
   timesheets/planning together. Project details request timesheets, planning,
   work packages, milestones, and budgets with `Promise.allSettled`, allowing
   partial results for failed optional datasets.
3. The backend merges request settings with local config/defaults, validates
   them, and authenticates through XML-RPC.
4. Read helpers discover metadata, construct domains, and paginate records.
   Every outbound RPC passes the explicit service/method guard first; rejected
   calls cannot reach `fetch`. Schema fallbacks can emit warnings.
5. Normalization retains records, resolves employee functions through scoped
   HR/public reads, and produces inclusive and employee-only monthly summaries.
   Metadata lookup failures preserve hours with explicit warnings; planning
   roles provide a disclosed fallback when HR function is unavailable.
6. The browser retains each inclusive response as `sourceResult`. API adapters
   default to employee-only summaries/raw records and render the selected scope.

The enabled `Include Ormitters hours` checkbox starts unchecked. Changes rebuild
API-backed personal, project, planning, and Dico datasets from `sourceResult`
and rerender locally without another request. Months, selected scope, project
selections, chart settings, and workbook-backed datasets are retained. Unknown
functions and exports remain included, with a visible scope note.
Legacy API data without employee summaries retains inclusive totals and shows
a highlighted unavailable-filter notice. Checkbox changes cannot recover
metadata absent from `sourceResult`; a backend restart and refetch are needed.
The sticky menu also controls Me / Whole Project. `getPersonalIdentity` derives
IDs and resolved names from fetched personal source records; IDs take precedence
in `recordMatchesPersonalIdentity`. `scopeProjectHours` derives project actual
and planning datasets without replacing sources. `getScopedOverview` supplies
the overview pies and Remaining table, using the same selected population across
personal and Dico project lists. Scope labels and consultant-hour counters use
the matching original records within selected years, omitting Internal projects
and netting actual credits.

For personal project lists, `ensureWholeProjectHours` fills
`state.projectHoursCache` with missing responses from the existing project
timesheet/planning routes, limiting simultaneous project fetches to three.
Project detail fetches seed the cache. Loaded raw results are adapted under the
current Ormitters setting each time the overview is built. Failed or pending
reads show an unavailable/loading overview rather than personal or partial
whole-project totals. Generation checks discard results after cache invalidation
by employee refresh or connector setting changes. Employee/Dico/detail response
installation also checks the current generation. Selected years and detail
selection are retained. Dico already contains project-wide records and needs no
additional scope-fetch route. The unassigned `(No project)` bucket stays in Me
but is omitted, with notice, from Whole Project and its background lookup queue.

Missing personal identity or insufficient export records use a labeled shared
baseline; actual and planning fall back together if either cannot support Me.
Project inputs preserve signed credits and unnamed employee contributions.
Missing raw records/filtering capabilities retain the disclosed monthly
fallback. Renderers pass scoped project inputs to contribution, trend, planning,
macro progress, expanded pie, and PNG export views. Tasks instead receive the
baseline project input; milestones/deadlines and currency budgets also remain
shared in both employee scopes.

API planning uses duration overlap across months. End-date XLSX planning uses
linear allocation across periods. Budget discovery reads candidate metadata
and records before classifying and aggregating chart lines.

State is in memory. Local hour edits update `projectMacroOverrides` and rerender;
expanded pie export generates a local PNG from canvas. Neither submits an Odoo
mutation. See [PROJECT_RULES.md](../ai-context/PROJECT_RULES.md).
Local macro override keys include employee/whole-project and subcontractor modes. Task
actuals use filtered task-linked records; complete exclusion gives zero with
task coverage, while unassignable excluded actuals make task consumption
unavailable. Static task planned budgets and currency budget data use their
original inputs.

The remaining table retains raw employee/Dico timesheets and planning slots to
calculate paired bars through today. It filters actual dates and intersects
planning intervals with elapsed selected-year periods. Odoo datetime strings
are interpreted as UTC and compared against local day boundaries, following
[Odoo's timezone convention](https://www.odoo.com/documentation/19.0/developer/reference/backend/orm.html).
For monthly-only input, actuals use reported month totals and planning is
prorated by calendar days, independent of daylight saving; the UI discloses this
fallback. Missing project names use the summary's `(No project)` bucket.

## Refresh

- Last refreshed: 2026-10-05.
- Source basis: parser, fetch/adaptation/render, inclusion rebuilding, employee
  scope/cache/identity helpers, task scoping, overrides, and exports in
  `index.html`; route, guard, RPC,
  function enrichment, and normalization/allocation in `server.js`.
- Limitations: source tracing only; browser interactions, sample export contents,
  and actual Odoo schema/responses were not exercised.
