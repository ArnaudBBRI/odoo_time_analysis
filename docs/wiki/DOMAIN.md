# Domain

- Actual hours come from Odoo account.analytic.line unit_amount, grouped by month, project and employee.
- Planned hours come from planning.slot or pivot exports. API slots use allocated_hours, with a duration/percentage fallback when unavailable.
- Project matching in the browser prefers a numeric bracketed code, then a normalized name. Server project lookup searches Odoo project names using the supplied reference.
- The primary dashboard scope is the connected person's Lead Unit, resolved server-side and matched against project.project.lead_unit_id. It includes accessible archived and zero-hour projects; it does not filter by employee name or project-manager assignment.
- Portfolio remaining hours equal planned minus actual within the selected year scope. Negative values indicate actual hours exceeding the selected plan.
- Internal/Interne rows are excluded in legacy personal/XLSX aggregation. Owner-team API portfolios retain every owned project, including those names. The display describes these as holiday rows; that business interpretation is not independently validated.
- Pivot planning columns represent end dates. Hours are distributed linearly over each interval. API slot hours are allocated proportionally to elapsed time overlapping each month, rather than a working-day calendar.
- Task deadline exports supply month markers, not task progress or completion status.
- The All year option uses available dataset months. Loading personal planning defaults the selection to the browser's current year.
- Portfolio charts use loaded data and selected months; no date-based future-record cutoff is implemented. Missing planning is shown as unknown rather than zero remaining effort.

## DiCo steering

The DiCo steering views introduce cumulative project-authoritative actuals, convention envelopes, programme assignments and reconciled financial/people/WP diagnostics. These definitions are separate from the existing visible-timesheet time dashboard. See [steering measures](PILOTAGE.md#measures-and-controls).

## Refresh

- Last refreshed: 2026-10-05
- Source basis: index.html dataset builders, matching, filtering and chart functions; server.js normalization and month allocation.
- Limitations: business meanings and completeness of supplied exports were not validated.

## Hours and project detail behavior retained from main

Date-level actual/foreseen comparisons use selected years and the Brussels day boundary; planning allocation uses Odoo UTC month boundaries. Signed actual credits are retained. AI Consultant and AI Consultant Ormit hours are classified using employee functions and excluded by default, with an inclusion toggle. Whole Project and Me remain distinct for personal datasets; a connected-unit portfolio uses Whole Project scope, with Me disabled to avoid treating every contributor as the signed-in person. Project budget, task/WP and milestone evidence is shared project data.
