# Domain

- Actual hours come from Odoo account.analytic.line unit_amount, grouped by month, project and employee.
- Planned hours come from planning.slot or pivot exports. API slots use allocated_hours, with a duration/percentage fallback when unavailable.
- Project matching in the browser prefers a numeric bracketed code, then a normalized name. Server project lookup searches Odoo project names using the supplied reference.
- Personal remaining hours equal planned minus actual within the selected year scope. Negative values indicate actual hours exceeding the selected plan.
- Internal/Interne project rows are excluded from dashboard totals and percentages. The display describes these as holiday rows; that business interpretation is not independently validated.
- Pivot planning columns represent end dates. Hours are distributed linearly over each interval. API slot hours are allocated proportionally to elapsed time overlapping each month, rather than a working-day calendar.
- Task deadline exports supply month markers, not task progress or completion status.
- The All year option uses available dataset months. Loading personal planning defaults the selection to the browser's current year.
- The personal pie title says Actual time (as of today), but aggregation uses loaded data and selected months; no date-based future-record cutoff is implemented.

## Refresh

- Last refreshed: 2026-10-05
- Source basis: index.html dataset builders, matching, filtering and chart functions; server.js normalization and month allocation.
- Limitations: business meanings and completeness of supplied exports were not validated.
