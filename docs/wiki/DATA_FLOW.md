# Data Flow

## XLSX import

1. A file input reads the workbook as an ArrayBuffer in the browser.
2. The embedded ZIP reader extracts stored or deflated entries; DOMParser reads workbook relationships, shared strings and worksheet cells.
3. Import-specific parsers identify month headers, indentation, measures, planning end dates or task deadline counts.
4. Dataset builders create project/employee rows and monthly values, excluding total and Internal rows where applicable.
5. Year selection drives summaries, remaining-hour tables and canvas rendering. Project legends share employee visibility across their line charts.

Uploaded workbooks are parsed in the browser; the import functions do not upload them to the proxy server. Data is held in page memory, so a reload requires importing or fetching again.

## Odoo connector

1. The page requests /api/auth/session to display the signed-in email, then POST /api/odoo/my-time with an empty body to load **Mon temps**. The server derives employee/resource IDs from exact session UID relations and ignores caller identity, account and unit overrides.
2. Personal reads retain own actual/planning records across accessible projects. The browser stores the response, selects years, and calls `PersonalTime.summarizeProjects`/`render` for the full-disk planned/actual macro. Legend visibility stays in page memory and recomputes geometry locally without fetching. SVG viewBox resizing preserves the chart's coordinate system.
3. The server uses the signed-in session credentials, authenticates and queries Odoo through XML-RPC. Request/config credentials cannot replace the user.
4. Planning queries inspect available fields and try supported employee/project domains. Queries paginate and normalize records into monthly summaries.
5. The browser converts responses to its chart datasets and rerenders. Debug output exposes query results and warnings to the user.

Personal refresh uses response-generation checks; planning failure preserves
actuals and an explicit unknown-plan state. The macro uses full selected UTC-year
planning and actuals through the Brussels local day; the existing monthly
datasets remain available for detailed views. Personal identity comes from the
server mapping, not every employee found in a unit aggregate.

The macro groups known nonpositive planning with nonzero actuals into **Hors
planning** below a divider. Its signed subtotal follows shown legend items;
unknown planning remains separate. **Mon temps · 02 / Suivi par projet** is
hidden in the personal view.

The server optionally enriches the involved project-ID union with managers
through `project.project.user_id`, then reads names/`image_128` for only those
`res.users` IDs. Missing/denied metadata or rejected photos leave hours intact.
The browser combines that metadata with the same selected-year personal
summary to render the **Projets** native radio grid. Changing years can clear
an out-of-scope selection, and macro-hidden IDs do not filter this grid.

Selecting a radio requests `/api/odoo/project-hours` once with the exact
numeric `projectId`. Its full-history classified records and exact own
employee/resource identity supply personal and all-employee comparisons.
The browser initially excludes known consultants, includes/discloses unknown functions,
and reuses `PersonalTime.summarizeProjects` for selected UTC-year plans and
actuals through Brussels today. `ProjectBrowser.barGeometry` uses 75% as the
positive-plan baseline and a linear `75 * calendarFraction` date position.
`PersonalTime.projectCalendarProgress` intersects each selected UTC year with
inclusive project start/end dates from the cached lifetime metadata, then counts
eligible Brussels calendar days for the first two comparisons. Disjoint-year
gaps are excluded, the first eligible day is zero and the final eligible day is
one. Missing/invalid dates or no overlap yield an unavailable reference rather
than a full-year fallback. The renderer displays the effective first/last dates.
This calendar correction does not replace raw selected-year planned/actual totals
or change the full-project lifetime and monthly charts.

The same response provides optional exact-ID contributor names/photos and
`hasOrmitters`. Presence uses nonzero classified actual/planned records across
full history or metadata-confirmed `bw.staffing.convention` assignments for the
exact project. Denied assignment/profile reads preserve hours and use warnings
or photo fallbacks. No arbitrary membership relation is treated as an assignment.
The page shows a project-only unchecked inclusion checkbox when presence is
confirmed. Its per-project state recalculates selected-year project totals and
lifetime project actuals locally; personal and legacy inclusion state remain independent.

The response also supplies optional `lifetime` convention/date metadata from
the exact project. The convention source is the technical
`project.project.budget_staffing_convention_hours` field with numeric metadata;
labels are ignored and the decimal-hour scalar is preserved without parsing
displayed hour/minute text. Staffing/planning values are not substitutes.
`conventionStatus` distinguishes available, empty and unavailable values; the
browser carries this as `budgetStatus` to choose an empty-field MIS message or
an unreadable-field message. Separate budget and date reads let one optional denial preserve
the other. The browser clips classified actual records to inclusive project
start/end dates and Brussels today, then reuses the exact-ID contributor
aggregation without selected-year filtering. Invalid/missing dates produce
unavailable actuals, not a full-history fallback.

The third **Convention · durée du projet** pair uses this summary and its own
linear project-date fraction. Positive convention hours use the 75% baseline
and capped actual scale. Missing/nonpositive hours omit the upper row and show
the status-specific budget message; positive actuals use a 100%-of-actual employee
distribution explicitly without a convention scale or date tick.

Project actual records are grouped by exact employee/resource identity after
scope, date and inclusion filtering. Signed contributions rounded to two decimal
places sum to the displayed actual total. Both project comparisons share stable
employee colors while keeping their date/total scopes separate. `ProjectBrowser`
stacks reconciled positive values within the existing outer actual fill.
Photo/name bubbles are children of their matching segment buttons and adapt to
each segment's width: full pill, avatar only, or hidden when too small to fit.
A keyed list always exposes all
nonzero contributors. Negative contributors use a neutral net bar with a signed
breakdown; unavailable planning keeps numbers/list without inventing a scale.

The page caches full history by project ID; year and inclusion changes recalculate
without another read. Concurrent duplicates are blocked. Successful personal
refresh clears the cache and advances its generation, so obsolete responses
cannot replace refreshed data. Loading uses titled placeholders; errors expose
retry and preserve available comparisons. Same-project rerenders preserve
heading/back, checkbox and contributor focus within the same comparison, and
returning to the grid restores radio focus. Tooltip identity includes comparison
and employee keys; colors depend on employee keys alone.

The same cached response feeds `ProjectMonthly.summarize`, independently of year
chips. Exact project/employee IDs separate contributors; actual series run from
the valid project start through inclusive Brussels today, including recorded
hours after the project end. Continuous month bins retain zeros and signed
corrections. Monthly is the default mode; cumulative mode applies prefix sums
to employee cents and their signed total before converting to display hours.
The convention reference uses the precise source scalar multiplied by each
month's overlap with the inclusive project dates through today, divided by the
total project days. Cumulative mode also sums this reference, which plateaus at
the project end while actuals may continue. A missing budget/end date omits the
reference while retaining actuals. A missing start date prevents inventing a
timeline.

Each actual contributor also receives `plannedHours`, `plannedStatus`,
`plannedReference` and `plannedWarning`. Planning is read from the same cached
slots, clipped proportionally to the full inclusive project dates, including
future slots. Exact employee IDs take precedence; resource-only allocations
use exact resource identity or unique confirmed employee ownership, without matching names. The resulting
employee total is spread linearly over project days using the convention's
monthly/cumulative proration helper. Known empty planning produces a zero
reference; inaccessible planning, invalid project/slot data or unresolved
identity leave the individual reference unavailable. An unmapped resource-only
slot overlapping the project cannot imply known-zero planning for an employee
whose resource metadata is missing. Slots wholly outside the project dates do
not affect individual lifetime totals.

The renderer builds stacked employee areas with colors shared by the bars,
separating positive and negative stacks around zero. A thicker line retains the
signed net total; the dotted convention remains an independent line. The graph
and bars share the same per-project Ormitter inclusion map. A separate map
remembers monthly/cumulative mode, and another stores the exact selected
contributor ID for each project during the session. Employee legend buttons
isolate that contributor's solid actual line and dotted planned reference;
the net total, convention and areas are omitted. Details and table use the same
selection, while all employee buttons remain available. Clicking the selected
name again or **Tous les employés** clears the filter. Exclusion or changed
source records clear a selection that is no longer present. These controls
recompute from cached raw records without a fetch or Odoo mutation.
Real inclusion/mode/employee switches advance a per-project reveal revision,
replaying the shared one-second clip reveal on visibility. Year changes, resizing and
unchanged rerenders retain the revision; reduced motion skips animation.

The separate Lead Unit route still resolves the connected unit and scopes all
contributors by exact owned-project IDs. Its all-contributor totals must not be
installed as personal macro data. DiCo steering retains its own confirmed scope.

The public welcome page posts email/password to /api/auth/login. Its separate
**Use config file** button posts JSON `{}` to /api/auth/login-config. After
checking the loopback peer/Host, the server reads the private username/token
and configured instance; request credentials and target overrides are ignored.
Missing/invalid config and rejected tokens produce compact welcome-page
messages without exposing token contents.

Either successful Odoo authentication creates a random session token in an
HttpOnly cookie. Its exact credentials remain in server memory for subsequent
calls. Logout, fixed expiry (eight hours by default) and replacement login
invalidate the session; restarting clears all sessions. API requests without a
session return 401 and the dashboard redirects to /login on the next request.
Manual passwords are not persisted to disk/browser storage; configured API
tokens stay in the private file and server memory. XML-RPC redirects are
rejected. The server does not implement a persistent timesheet database or cache.

## DiCo steering

DiCo steering uses authenticated scoped portfolio reads, then additional one-project detail reads. The main Projets tab routes to the personal grid even when DiCo is disabled; programme/unit and leader/contributor shortcuts retain the internal steering portfolio. The pure calculation module is shared with the browser for filtered consolidation; refresh replaces in-memory data and invalidates pending detail responses. No snapshots or source writes are made. See [steering data lifecycle](PILOTAGE.md#navigation-and-data-lifecycle).

## Refresh

- Last refreshed: 2026-10-09
- Source basis: personal-time.js, project-monthly.js, project-browser.js, steering-client.js, login.html, index.html personal/lifetime-fetch/scope/render functions and chart preference maps, server.js identity/contributor/assignment/convention/date/authentication/transport handlers and summary helpers.
- Limitations: broad live schema/permission coverage remains unverified; automated and browser checks use fictional data.
