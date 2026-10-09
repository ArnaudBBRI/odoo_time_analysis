# Domain

- Actual hours come from Odoo account.analytic.line unit_amount, grouped by month, project and employee.
- Planned hours come from planning.slot or pivot exports. API slots use allocated_hours, with a duration/percentage fallback when unavailable.
- Personal macro/Projets records use exact project IDs. Legacy workbook matching prefers a numeric bracketed code, then a normalized name; legacy projectCode lookup can search names, while projectId reads use the exact Odoo ID.
- The primary **Mon temps** view uses employee/resource IDs linked to the authenticated session UID. Its own actuals/planning include all personal roles across accessible projects, independently of Lead Unit ownership. The separate Lead Unit portfolio remains server-resolved against project.project.lead_unit_id and includes all contributors, archived and zero-hour owned projects.
- Portfolio remaining hours equal planned minus actual within the selected year scope. Negative values indicate actual hours exceeding the selected plan.
- Internal/Interne rows are excluded in legacy personal/XLSX aggregation. Owner-team API portfolios retain every owned project, including those names. The display describes these as holiday rows; that business interpretation is not independently validated.
- Pivot planning columns represent end dates. Hours are distributed linearly over each interval. API slot hours are allocated proportionally to elapsed time overlapping each month, rather than a working-day calendar.
- Task deadline exports supply month markers, not task progress or completion status.
- The All year option uses available dataset months. Loading personal planning defaults the selection to the browser's current year.
- Existing portfolio/monthly charts use loaded data and selected months. The personal macro additionally limits actuals to inclusive today in Europe/Brussels. Missing planning is unknown, not zero.

## Personal planned/actual macro

`personal-time.js` aggregates by stable project ID, retaining signed actual
credits. Only projects with nonzero planned hours or nonzero actual hours
through today in selected years appear in the macro and its legend. Zero-hour
records, future-only actuals and totals cancelling to zero do not establish
activity; duplicate names gain an ID suffix. Planning is prorated by slot
duration over each selected UTC calendar year, including disjoint years without
filling their gaps. Available year enumeration is capped at 150.

Positive planned hours determine sector angles. Every sector has the same outer
radius, starts at the center, and has no donut hole. Colored area equals the
clamped actual/planned ratio; its radius is the square root of that ratio.
Overruns/negative actuals retain signed numeric evidence while geometry remains
within the planned disk. Unknown/zero plans remain in the legend without a
sector when actual hours are nonzero. Project colors remain unique and stable across local hide/show and year
changes; hiding projects recalculates the visible planned shares.

The legend shows positive planned totals first, then separate unknown-planning
and planning-correction groups, with **Hors planning** last below a horizontal
divider. This final group contains known nonpositive plans with nonzero signed
actual hours. Its subtotal includes only shown projects, consistently with the
top metrics; unknown plans are never classified as unplanned. French name/ID
ordering applies within each group, independently of visibility.
The calendar reference ring uses Brussels today as a date-only ordinal. Its
fraction is selected days before today divided by total selected days minus
one, clamped to [0, 1]; this anchors the first 1 January at the center and the
last 31 December at the rim. Leap days count and unselected gaps do not advance
the reference. Ring radius is the square root of that fraction times the pie
radius. It is a uniform calendar reference, independent of planning-slot dates
and hidden projects, drawn outside hover transforms with no pointer capture.

## Personal project browser

**Projets** uses the same personal summary and selected years as the macro,
independently of its hidden legend IDs. Only positive Odoo project IDs with
nonzero scoped planning or actuals enter the alphabetical native radio grid.
Manager metadata comes from the involved project's `user_id` relation to
`res.users`; photos are optional, with initials/unknown-manager fallbacks.
Selecting a project displays **Mes heures**, **Heures du projet · tous les
employés (hors Ormitters)** and **Convention · durée du projet (hors Ormitters)**.
The comparisons initially exclude records explicitly classified as
subcontractors/consultants; unknown functions remain included with a warning,
including any disclosed planning-role fallback. Personal matching
prefers an explicit employee ID; resource fallback applies only when no
employee ID is present. The personal macro retains all personal roles.

An unchecked **Inclure les heures des Ormitters** checkbox appears only in the
project comparison when any full-history nonzero actual/planned record is
classified as an Ormitter, or a metadata-confirmed `bw.staffing.convention`
assignment establishes their presence. This condition is independent of selected
years. Enabling it includes classified planned and actual hours in that project's
pair and changes its title to **Heures du projet · tous les employés (Ormitters
inclus)**. The same choice controls actuals and the inclusion label in the
convention comparison; its convention budget remains unchanged. The choice is
local per project and does not alter personal or legacy inclusion controls.
Unavailable assignment/function metadata produces a project
warning; unconfirmed presence does not enable inclusion.

In the first two pairs, plans cover full selected UTC calendar years; actuals
retain signed credits through inclusive Brussels today. `barGeometry` maps positive planned totals
to 75% width, actuals to `clamp(75 * actual / planned, 0, 100)` percent, and the
date tick to `75 * calendarFraction` percent. The fraction counts only selected
calendar days within the inclusive project start/end dates, excluding unselected
years and pre-start/post-end days. A December 2025 start adds only December to
the reference when 2025 is selected. Effective dates are shown; invalid/missing
project dates or an empty intersection omit the tick with an unavailable notice.
Recorded scoped hours retain their original selected-year totals. The tick is linear rather than
the macro ring's square-root radius. Actuals beyond four-thirds of plan keep
their numeric total with a capped-bar badge. Zero planning with positive
actuals uses a full **Hors planning** bar and no date tick. Unknown planning or
negative plans have no positive comparison scale; negative actuals draw no
positive fill while retaining their signed number. **Mon temps · 02 / Suivi
par projet** remains hidden in the personal view.

The third pair uses the exact project's numeric
`project.project.budget_staffing_convention_hours` field as **Budget personnel BW**
convention hours. Its decimal-hour scalar retains source precision; translated
or English labels do not select the field, and displayed hour/minute strings are
not parsed. Monetary/other fields and staffing/planning totals are not substitutes. Its caption shows
the project's full start/end dates and **hors filtre d’années**. Actuals retain
only dates inclusively within that interval and through Brussels today,
independently of selected years. Missing, invalid or reversed dates make these
actuals unavailable; there is no full-history fallback. A positive convention
uses the same 75% baseline/capped actual geometry, with a separate linear
`75 * calendarFraction` tick across the project interval.

For missing or nonpositive convention hours, the upper row is omitted. An empty,
zero or negative value says **Budget personnel BW non renseigné. Demandez au MIS
de mettre ce champ à jour.** Missing metadata, incompatible type, unreadable or
invalid values instead say **Budget personnel BW indisponible. Impossible de
lire ce champ dans Odoo.** Positive actuals fill the lower track as an employee distribution,
explicitly labelled **Répartition du réalisé · sans échelle conventionnelle.**
There is no convention scale or date tick in this case. Signed values and
unavailable actuals remain explicit.

**Projets · 02 — Évolution mensuelle** stacks actual employee hours in colored
areas with a thicker signed net-total line. Positive and negative contributions
stack separately above and below zero, preserving signed corrections. The
timeline starts at the project start and ends at Brussels today, without
selected-year filtering. Actuals after the project end remain included.
Employee identity/color is shared with the bars; known Ormitters use the same
default-off inclusion choice. Zero months remain visible, and the current month
is partial.

The adjacent **Par mois / Cumulé** control defaults to monthly values and retains
each project's choice for the session. Cumulative mode takes prefix sums of the
signed employee series and their total. The independent dotted convention line
uses a daily-linear budget allocation over inclusive project dates, summed for
each month only through today. Monthly allowance is zero after the end; the
cumulative reference plateaus at the full budget. Missing budget or end dates
cannot invent a reference; missing start dates cannot invent a timeline.

Employee-name buttons isolate one contributor's actual line in the selected
monthly/cumulative mode, together with their own dotted planned-hours
projection. The project total/convention and stacked areas are hidden in this
selection. Planned hours use exact employee/resource IDs or unique confirmed
resource ownership, never employee names. Slots are prorated to the full inclusive
project dates, including future planning; that total is then allocated evenly
by project day and clipped through today. This compares actual hours with a
linear individual plan, rather than forecasting future actuals or reproducing
the slot schedule. Known zero planning is distinct from unavailable planning,
dates or identity. Month details/table follow the selected employee; clicking
the name again or **Tous les employés** restores all contributors. Per-project
selection is cleared when its contributor becomes unavailable or is excluded.

All areas and lines share a one-second reveal on first display and each mode,
employee selection or Ormitter inclusion switch. Year changes, resizing and
unchanged rerenders do not replay it; reduced-motion preference displays the final chart immediately.

Project actuals are grouped by exact employee ID, otherwise resource ID, with an
explicit **Employé non identifié** bucket when neither is available. Zero net
contributors are omitted. Their signed amounts use at most two decimal places
and sum to the displayed actual total. Reconciled positive contributions stack
within the actual bar in proportion to their hours, retaining the outer bar's
cap and stable identity colors across year/inclusion changes. Photos or initials
and names sit in bubbles inside sufficiently wide segments, with avatar-only
bubbles on narrower segments; a keyed contributor list
always exposes all amounts. Optional profiles are joined by exact IDs, with no
remote photo requests. Any negative contribution uses a neutral net bar plus
the signed list and an explanation, rather than positive areas for credits.
An inconsistent supplied breakdown also avoids stacking and is disclosed.

Visible bar fills animate together from the left over one second on render,
without changing their final hour-based widths or the date tick. A reduced-motion
preference displays the final bars immediately.

## DiCo steering

The DiCo steering views introduce cumulative project-authoritative actuals, convention envelopes, programme assignments and reconciled financial/people/WP diagnostics. The main Projets tab uses the personal browser without requiring DiCo configuration; programme/unit and leader/contributor shortcuts retain the separate internal steering portfolio. See [steering measures](PILOTAGE.md#measures-and-controls).

## Refresh

- Last refreshed: 2026-10-09
- Source basis: personal-time.js, project-monthly.js, project-browser.js, index.html personal/lifetime scope/rendering and chart controls, steering-client.js navigation and server.js identity/contributor/assignment/convention/date metadata/month allocation.
- Limitations: business meanings and completeness of supplied exports were not validated.

## Hours and project detail behavior retained from main

Date-level actual/foreseen comparisons use selected years and the Brussels day boundary; planning allocation uses Odoo UTC month boundaries. Signed actual credits are retained. The primary Mon temps view includes the signed-in person's hours regardless of employee function and hides the scope/inclusion switches. Legacy imports and unit loaders retain consultant classification and their Me/Whole Project controls; a connected-unit portfolio uses Whole Project scope, with Me disabled to avoid treating every contributor as the signed-in person. Project budget, task/WP and milestone evidence is shared project data.
