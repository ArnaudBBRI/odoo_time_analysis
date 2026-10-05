# Current State

## Functional State

- The repository contains a browser dashboard and a local Node.js Odoo proxy.
  See [the technical wiki](../wiki/INDEX.md) for source-derived behavior.
- BW AI Development Framework 3.0.0 was installed on 2026-10-05, including
  shared assistant instructions, GitHub templates, optional Codex hooks, and
  project-memory/wiki files.
- The mandatory Odoo read-only policy is recorded in
  [PROJECT_RULES.md](PROJECT_RULES.md) and decision D001. No write is approved.
- The backend now rejects RPC operations outside the existing read allowlist
  before serialization or network access. There is no runtime bypass.
- All ten technical wiki pages are initialized from the current source tree;
  framework provenance and safe updates are documented in
  [FRAMEWORK_ADOPTION.md](FRAMEWORK_ADOPTION.md).
- Remaining-hours rows now show paired foreseen/actual bars through today,
  normalized per project and colored by absolute 10%/25% deviation. API data
  uses dated records with local day cutoffs; monthly input uses the disclosed
  forecast proration/report-total fallback. Scope totals and drilldown remain.
- AI Consultant/AI Consultant Ormit actual and planned hours are now excluded
  from API-backed hour charts/totals/consumption by default. An enabled,
  unchecked `Include Ormitters hours` checkbox rebuilds loaded data locally.
  Scoped HR/public read enrichment resolves employee/resource IDs; unknown
  metadata and workbook limitations are disclosed. Inclusive responses and
  scope/project selections are retained, with separate local override modes.
- Task-linked actuals use filtered records, including zero after complete
  exclusion. Unassignable subcontractor aggregates produce unavailable task
  consumption instead of inclusive fallback. Task foreseen budgets and currency
  budget records retain their source amounts.
- The Remaining table now labels personal versus all-Dico scope and displays
  classified consultant hours in the selected years. Old API data leads with
  a highlighted unavailable-filter notice; no false exclusion claim is shown.
  Dico-only Remaining data can render without personal datasets.
- A sticky dashboard menu now holds year scope, Ormitters inclusion, and the
  default-Me / Whole Project toggle. Relevant actual/planned hour views share
  that scope, including Dico overview/Remaining data, project charts, progress,
  expanded pies, and PNG exports. Shared tasks, milestones/deadlines, and
  financial budgets retain their project baseline.
- Personal identity comes from fetched employee records, preferring IDs. Missing
  identity or insufficient export records show a disclosed baseline. Whole
  Project lazily reads/caches only missing project timesheets/planning for the
  listed personal projects, preserving project/year/inclusion selections and
  exposing loading/failure states.
- Signed actual credits and unnamed employees are retained in project totals.
  Me keeps the unassigned `(No project)` bucket; Whole Project shows assigned
  projects and discloses its omission, without looking up the unassigned bucket.
  Stale employee, Dico, project-detail, and background responses cannot replace
  data after a connector/employee cache generation changes.

## In Progress

- None for this request. Sticky controls, shared employee scope, offline
  verification, independent review fixes, and documentation are complete.

## Known Limitations

- Broader Odoo integration and browser rendering remain unverified; scoped
  read-only Extrai inquiries succeeded as recorded below. Do not contact live
  Odoo as part of safety verification.
- Preexisting dashboard changes were preserved while editing the requested
  table and API adapters. Unrelated dashboard behavior was not fully reviewed.
- Browser layout was not visually verified: the browser tool's URL policy
  blocked the local file preview. Offline tests validate calculation and row
  markup, not rendered dimensions.
- Role classification uses current HR functions; historical function timelines
  are unavailable. Unknown functions and metadata-free workbook hours remain
  included with notices; broader HR schema/access remains unverified.
- Sticky-menu dimensions and rendered Me / Whole Project interactions have not
  been verified in a browser. Whole-project background reads use the existing
  guarded endpoints; broader project access remains unverified.

- Scoped live verification on 2026-10-05 subsequently confirmed private HR
  `job_title` reads for all four employees with positive recorded Extrai hours.
  This does not verify public HR fallback, other projects, planning roles, or
  browser rendering. A subsequent diagnostic found and restarted the stale
  local server; the current HTTP endpoint now returns employee summaries and
  role fields. Existing browser datasets still need a reload/refetch.

## Project Maturity

- Small local application under active development; no release/deployment
  process was established by this task.

## Last Verified

- Date: 2026-10-05 (Europe/Brussels).
- The running local app on port 8765 serves the current workspace HTML with the
  sticky controls. The 94 offline tests also passed with Europe/Brussels time;
  this static HTTP check did not query Odoo or verify browser rendering.
- Upstream installer dry run and installation: 26 framework/template files
  created without overwriting app files.
- Upstream `validate-target.ps1 -Profile full -IncludeWiki`: passed, including
  required project policy presence.
- Direct `.codex/hooks/session_start.ps1` invocation and PowerShell syntax check:
  passed. Automatic hook dispatch/trust remains unverified.
- Negative fixture check: both validator and startup hook returned exit code 1
  when only `PROJECT_RULES.md` was absent.
- `node --check server.js` and `node --check tests/odoo-read-only.test.js`: passed.
- `node --test --test-isolation=none tests/odoo-read-only.test.js`: 11/11 passed
  with Node.js 24.19.0. Default isolation was blocked by sandbox `spawn EPERM`;
  no-child execution ran the actual offline suite successfully.
- Local Markdown links and `git diff --check`: passed. The existing
  `index.html` remained byte-for-byte unchanged during adoption.
- No package build/lint/typecheck scripts exist; no live Odoo or full browser
  integration test was run. Independent governance/code review found no
  substantive issues.
- Remaining-hours improvement: all 17 tests in
  `node --test --test-isolation=none tests/remaining-hours.test.js` passed,
  including Brussels UTC midnight/year boundaries and DST month proration.
- The 11 Odoo safety tests passed again after the Dico response-only change.
  Backend/test syntax and scoped whitespace checks passed. No new Odoo operation
  was added and no live Odoo was contacted.
- Independent review found UTC timestamp and blank-project grouping issues;
  both were fixed and covered by the final offline tests. Browser rendering
  remains unverified for the reason above.
- Subcontractor improvement: all 63 tests passed in the combined offline command
  `node --test --test-isolation=none tests/odoo-read-only.test.js tests/remaining-hours.test.js tests/subcontractor-roles.test.js tests/subcontractor-hours.test.js`:
  11 RPC safety, 17 remaining-hour, 17 backend role, and 18 frontend filtering
  tests. Backend and new test syntax checks and `git diff --check` passed.
- Independent review identified and verified fixes for public metadata on
  resource-only planning and task aggregate/year fallback errors. The final
  regressions cover these cases. Tests used mocked network/file/server startup;
  no live Odoo or private config was read, no dependency was installed, and the
  Odoo guard was not changed by this feature.
- User-requested Extrai lookup (54252043) on 2026-10-05: read 280 timesheet
  records, all matching exact project ID 2083. The current guarded enrichment
  found one AI Consultant with 449 positive recorded hours, all in 2026, with
  no function lookup warnings. This was an explicitly requested read-only
  inquiry, separate from offline safety testing. Credentials remained inside
  the server settings code and were not printed or copied into artifacts.
- Unchanged-checkbox follow-up: all 69 combined offline tests passed (11 safety,
  17 remaining-hour, 17 backend role, 24 frontend filtering). Syntax and diff
  whitespace checks passed. Independent UI review found an Internal-row counter
  mismatch; fixed and covered alongside scope, stale-response, zero-data,
  actual-credit, and Dico-only regressions.
- Targeted read-only Extrai diagnostic through current handlers and frontend
  adapters/table markup: selected 2026 actuals changed from 838 to 1287 hours
  when inclusion was checked, a 449-hour delta. Classified consultant planning
  in those records was zero; two planning records had unknown functions and
  remained included with warnings. This did not render browser pixels.
- Runtime repair: identified old listener PID 57108 and verified it served the
  exact workspace `index.html`, then restarted only that local dashboard process.
  Current server PID 28684 runs the absolute workspace `server.js` in a hidden
  standard-user process, with stdout/stderr in the user's temporary directory.
  HTTP `/api/odoo/project-timesheets` now returns `employeeMonthly`, classifications
  on all 280 Extrai lines, and 838/1287 filtered/inclusive 2026 hours, no warnings.
  No Odoo write, installation, or guard change occurred.
- Sticky-scope improvement: all 94 combined offline tests passed in
  `node --test --test-isolation=none tests/odoo-read-only.test.js tests/remaining-hours.test.js tests/subcontractor-roles.test.js tests/subcontractor-hours.test.js tests/sticky-scope.test.js`:
  11 RPC safety, 17 remaining-hour, 17 backend role, 24 prior frontend, and
  25 sticky-scope tests. Inline dashboard JavaScript and server syntax, unique
  HTML IDs, and whitespace checks passed.
- Independent review fixes preserve signed credits and unnamed employee hours,
  reject stale response generations, keep actual/planning fallback coherent,
  disclose missing filtering capabilities, and offset project-detail scrolling
  below the sticky menu. The final regressions cover these cases. This request
  used offline checks only; no live Odoo fetch or private config read was used
  for sticky-scope verification. Browser rendering remains unverified.

## Session handoff

- Objective: add sticky year/Ormitters controls and one Me / Whole Project scope
  across relevant hour views while preserving shared project baselines and
  read-only behavior.
- Updated: 2026-10-05 (Europe/Brussels).
- Completed: framework adoption and read-only guard; paired through-today bars,
  raw API record retention, Dico response fields, offline regression tests,
  review fixes, and documentation updates; subcontractor metadata enrichment,
  employee-only summaries, checkbox rebuilds, task safeguards, and 63 combined
  passing offline tests.
  Follow-up completed: truthful unavailable-filter UI, Remaining scope/counters,
  Dico-only rendering, 69 passing tests, scoped live diagnostic, and local server
  restart with verified current HTTP responses.
  Sticky-scope improvement completed: responsive controls, identity-based
  scoped views, lazy project-hour cache, shared-baseline labels, and updated
  documentation, with 94 combined passing offline tests and independent review
  fixes for credits, unnamed employees, stale responses, and coherent fallback.
- Implementation base: `main`,
  `8a6bc9441d3c68d6ea4067827ff571889909002f`.
- Delivery scope: existing dashboard work plus the requested table/API adapter
  and sticky-scope changes in `index.html`, updated `README.md` and `server.js`,
  and the framework/docs/tests. The user explicitly authorized committing and
  pushing this work directly on `main` on 2026-10-05. Private local configuration
  remains ignored. Git history/status is authoritative for the delivered
  revision and publication state.
- Checks: see Last Verified above; a scoped live Extrai/function read succeeded.
  Broader integration and browser behavior remain unverified.
- Next action: reload the dashboard and fetch employee data, then select Whole
  Project for team hours if desired. Dico changes the overview project list.
  Await the user's next scoped request; no implementation/check is pending.
- Runtime note: the current local server is running with role filtering on port
  8765 (PID 28684). Previously loaded browser responses do not update themselves.
- Blockers: none; see [DECISIONS.md](DECISIONS.md) for constraints.
