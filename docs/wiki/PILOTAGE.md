# DiCo steering dashboard

## Navigation and data lifecycle

The authenticated dashboard adds Projects, Business programmes and DiCo Unit views alongside the existing time dashboard. The new views share programme, responsible user, stage, project-date overlap year and connected-project-leader filters. The leader shortcut resets the other filters and selects projects whose configured user relation contains the authenticated Odoo UID.

Portfolio reads happen on demand. Opening a project reloads that one scoped project and its detail sources; its timestamp can differ from the portfolio. Refresh clears detail and replaces page-memory results. No snapshots, historical cache, local storage, exports or Odoo writes are implemented. Failed refreshes clear stale results and permit retry.

The three views combine macro resource/budget summaries with coverage, source availability and assignment diagnostics. Contributor buttons open the actual included projects. Project detail has Summary, Resources, Budgets and Reliability tabs. All new user-facing copy is French.

## Configuration and activation

`config.local.json` accepts a non-secret `pilotage` object:

```json
{
  "unitConfirmed": true,
  "unitDomain": [["lead_unit_id", "in", [123]]],
  "projectLeaderField": "user_id",
  "programmes": [
    { "id": "programme-id", "name": "Programme name", "projectIds": [456, 789] }
  ]
}
```

**123, 456 and 789 are illustrative IDs, not verified Buildwise values.** Confirm the actual responsible-unit field and DiCo relation ID before using this example. No production filter is enabled by default. The metadata endpoint lists candidate field names and labels without downloading project records. It validates every configured domain field against readable metadata, including dotted relation paths. Only AND conditions with `=` or `in` and non-empty string/positive integer values are accepted. The administrator's `unitConfirmed: true` records the business confirmation; metadata alone cannot prove that a field means responsible unit.

The time dashboard's connected-person Lead Unit resolution remains separate. It does not automatically authorize or broaden the DiCo steering domain.

Programmes are held in that server-side configuration; no editor or assignment write-back is supplied. IDs must be unique strings and project IDs positive integers. A project assigned to multiple programmes is excluded from programme totals but kept once in the unit. Unassigned projects remain visible. Odoo impact pathways are a separate project-level axis, showing original coefficients and unallocated percentage; no weighted resource allocation is inferred.

The leader relation defaults to `project.project.user_id` and must be a many-to-one or many-to-many relation to `res.users`. Configure the actual business leader field if different. An unavailable relation disables the quick link instead of matching names.

## Read-only API

All endpoints use POST, a valid session and the existing origin checks. Caller-supplied credentials, unit domains and UIDs are ignored.

| Route | Body | Result |
| --- | --- | --- |
| `/api/odoo/pilotage/metadata` | `{}` | Activation status/reason, unit-field candidates, programmes and leader capability. |
| `/api/odoo/pilotage/portfolio` | `{}` | Timestamp, accessible scope, normalized projects, unit and programme summaries. |
| `/api/odoo/pilotage/project` | `{ "projectId": 456 }` | Scoped project and additional visibility, Progress, people, monthly and WP diagnostics. |

Invalid project IDs return 400; absent/out-of-scope/inaccessible projects return 404; unsupported methods 405; main query/configuration failures return a sanitized 502. Disabled configuration returns 200 with `enabled: false` and no project records. Optional source failures produce unavailable sections, not a failure of the entire portfolio.

The service reads `project.project` through the confirmed domain, including archived projects. Related records require a metadata-confirmed direct `project_id` relation and a scoped ID domain; returned rows are filtered again. Budget lines are read only by IDs referenced by scoped convention/annual parent budgets. Analytic-account fallback and task-linked planning are not supported by the new steering service; missing direct relations remain unavailable. The pre-existing time connector retains its own fallbacks.

Progress uses only `bw.open.plannning.slot.read_group`, three fixed hours-only sums, fixed project/role/employee grouping and optional metadata-confirmed task grouping, `lazy=false` and scoped active-project context. No financial cost fields or generic HTTP aggregation inputs are accepted.

## Measures and controls

- Actual cumulative hours: `project.project.effective_hours`. Visible analytic lines are separately aggregated by month without descriptions, and never replace that total.
- Convention: `bw.staffing.convention.staffing_hours`. Remaining convention is convention minus actual; remaining planning is operational plan minus actual.
- Planning: `planning.slot.allocated_hours`. Past/future hours are split proportionally by calendar duration at the read timestamp. Invalid periods remain unknown. Horizon end is compared with project end.
- Like-for-like planning deviation: visible actual lines in the planning horizon through the read date minus elapsed plan in the same window. It remains a visibility diagnostic, not a full-team measurement when incomplete.
- Consumption: sum of actual divided by sum of convention, using the same projects with both values known. Never average project percentages. Zero/unknown denominators yield null.
- Project year filters select projects whose lifetime overlaps the year, retaining unknown dates for review. Resource totals remain explicitly labelled cumulative/horizon totals, not annual actuals.
- People actuals require Progress/project reconciliation within 0.05 h. Definitive population differences additionally require staffing/Progress and planning/Progress reconciliation and usable person identities. Collective `TH_*` staffing resources are retained as collective, not individuals.
- WP drill-down additionally requires explicit WP flags, hierarchy/identity, complete WP coverage, zero unmapped hours, matching base and task-aware sums, convention reconciliation and valid WP periods. Any failure returns a reason and no actionable WP rows. Expected WP hours to date are convention hours multiplied by its own elapsed-period fraction.
- Budgets preserve convention versus annual, exact rubric/account, currency and period. Annual expense envelopes use 6xxx accounts, separate from signed income-minus-expense controls. 60/61/63/64/65 parent controls must reconcile too. Unknown account labels, nonzero 9xxx adjustments, unavailable controls or missing lines prevent verified aggregation.
- Monetary consolidation groups identical type/currency/start/end. Only reconciled budgets contribute. Multiple parent budgets for one project in the same group are ambiguous and excluded; they remain visible in project detail. Ordered and consumed amounts are never added. Personnel cost completeness is not established or derived from hours.

Null is unavailable, not zero. Each resource metric includes contributor IDs and coverage. Financial totals include excluded IDs. Negative convention remainder, short planning horizon, overdue unreached milestones, negative category balances and reconciliation/assignment problems produce explainable attention items. Linear pace comparisons are screening evidence, never a delivery-progress or risk score.

The 2026-01-01 history boundary from the supplied extractor is not applied as a cutoff; its applicability still needs human confirmation. Readable rows do not establish company-wide completeness, and the separate Odoo calls do not form a transactional snapshot.

## Implementation and verification

`steering.js` contains shared pure calculations used by Node and the browser. `steering-service.js` orchestrates scoped reads; `steering-client.js` and its stylesheet implement navigation, filters and drill-down. Only the pure calculations and browser assets are served to signed-in users; the server-side service is not served.

```powershell
node --test tests/auth.test.js tests/portfolio-ui.test.js tests/steering.test.js tests/steering-http.test.js
```

Optional rendered checks use `node tests/steering-browser.js` with `PLAYWRIGHT_MODULE` pointing to an existing Playwright package and optionally `SCREENSHOT_DIR`. The isolated temporary app uses labelled fictional fixtures; it never reads private repository credentials. `node tests/steering-runtime.js` starts the same labelled preview, with normal sign-in using `person@example.com` / `correct password`, until stopped.

## Refresh

- Last refreshed: 2026-10-05.
- Source basis: steering modules, server routes, dashboard markup and steering tests.
- Limitations: no live Buildwise account/schema or Docker image validation; DiCo field/ID and programme membership remain deployment configuration.
