# AI Change Log

## 2026-10-05 - Sticky Dashboard Controls and Employee Scope

- Consolidated year selection, Ormitters inclusion, and Me / Whole Project in a
  responsive sticky menu; Me is selected initially.
- Added common scoped hour inputs for overview/Remaining, Dico, project charts,
  project progress, expanded pies, and exports, preserving source responses and
  selected years/project/inclusion. Employee IDs from fetched personal records
  determine personal scope, with exact-name fallback only when IDs are absent.
- Added lazy read-only project timesheet/planning caching for complete team
  overviews and explicit loading/failure feedback. Missing identity or export
  detail shows a disclosed shared baseline.
- Kept tasks, milestones/deadlines, and financial budgets as shared project
  data. Preserved signed actual credits and unnamed employee contributions;
  Whole Project omits the unassigned project bucket with a notice. Guarded
  response generations and coherent actual/planning fallbacks avoid stale or
  mixed-scope inputs.
- All 94 combined offline tests passed, including 25 sticky-scope tests.
  Syntax, unique-ID, whitespace, and independent review checks completed;
  browser rendering and live scope fetches remain unverified. Details are
  recorded in `CURRENT_STATE.md`.

## 2026-10-05 - Diagnose Unchanged Inclusion Toggle

- Confirmed the running local server still returned old responses without
  employee-function flags/summaries, making the checkbox a no-op for those data.
- Replaced the false exclusion claim with a highlighted unavailable-filter
  notice. Added personal/all-Dico Remaining scope labels and selected-year
  consultant-hour counters; enabled Dico-only Remaining rendering.
- Added six regressions, including Internal-row exclusion and signed actual
  credits in counters. All 69 combined offline tests passed.
- Verified current handlers against read-only Extrai actual/planning data and
  confirmed the project-wide 2026 actual toggle delta of 449 hours.
- Identified the stale server by process/port and exact workspace page content,
  restarted that local process with current code, then confirmed the HTTP API
  returns all 280 classified records and 838/1287 employee-only/inclusive hours.

## 2026-10-05 - Subcontractor Hour Filtering

- Added scoped read-only employee-function enrichment and safe planning
  resource-to-employee resolution, including public metadata/role fallbacks.
- Added default exclusion for AI Consultant and AI Consultant Ormit actual and
  planned hours across hour charts/totals/consumption, with an unchecked local
  inclusion checkbox. Preserved inclusive originals, selected years/project,
  and separate manual overrides for each setting.
- Kept empty filtered datasets valid and prevented inclusive task aggregates
  from restoring excluded hours. Unknown functions, export limitations, and
  unavailable task consumption are disclosed in the dashboard.
- Added offline role and dashboard regressions; independent review fixes cover
  public metadata for resource-only planning and out-of-scope task aggregates.
  Final verification and limitations are recorded in `CURRENT_STATE.md`.

## 2026-10-05 - Remaining-Hours Comparison

- Replaced the balance graphic with light-blue foreseen and colored actual bars
  through today, normalized independently for each project.
- Applied absolute 10%/25% deviation thresholds in both directions and handled
  zero forecasts and empty pairs.
- Retained raw API records for date-accurate employee/Dico comparisons; no new
  Odoo request or write path was added. Kept scope totals and drilldown intact.
- Added offline regression checks and documented monthly-export fallback,
  calendar-day proration, and UTC-to-local cutoff behavior. Verification results
  are recorded in `CURRENT_STATE.md`.

## 2026-10-05 - Framework Adoption and Odoo Safety

- Request: adopt BW_CODEX_DEV_GUIDE and make Odoo access strictly read-only.
- Installed Buildwise framework 3.0.0 from commit
  `d968ed2fb82171e9337d6fbd90f23939efdaaf90`.
- Added mandatory project policy and durable decisions, including the user's
  standard-user Windows constraint.
- Added a strict RPC service/method allowlist before outbound serialization and
  network access; mutation and unknown operations are blocked with no bypass.
- Initialized all ten source-derived wiki pages, documented upstream provenance
  and update conflicts, and retained the framework MIT notice.
- Checks: full framework validation, direct startup hook, missing-policy negative
  fixture, syntax/link/diff checks, and all 11 offline safety tests passed.
  The sandbox required the test runner's no-child-process mode; details and
  verification boundaries are recorded in `CURRENT_STATE.md`.
- Preserved the user's existing `index.html` edits; no live Odoo was contacted.
