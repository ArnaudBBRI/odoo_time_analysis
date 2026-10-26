# Data Flow

## Manual project-tag scan

The shipped `data/project-tags.json` is a local reference snapshot. Ordinary
app startup does not run a scan. `node scripts/scan-project-tags.js` loads private
configuration through the actual server functions without starting HTTP. The
existing RPC allowlist remains active. Project metadata and an exact unit-206
listing (including archived records) establish the accessible scope.

Completed source-namespace/project-ID pairs are skipped before description
relations or content are read. New IDs use verified `description_version_ids`
links and matching `bw.project.description.version.project_id`; version metadata
selects the latest date/ID before that row's HTML is fetched. Summary extraction
removes template instructions, measures meaningful characters and distinguishes
missing/short descriptions from access/schema failures. Only pending local review
results are written to `.local/project-tag-scan.json`, excluded from Git/Docker.
No Odoo writes or automatic tags/catalogue updates occur. Reviewed entries can
be merged locally through `project-tags.mergeNew`, which retains completed rows.
See [catalogue workflow](../../data/README.md).

The user-requested Buildwise enrichment is a separate reviewed local edit of
completed rows. `project-tags.js` validates accepted HTTPS Buildwise provenance
and a source reference for every applied web tag before permitting tags on a
missing-description row. The original Odoo scan fields and completion flag are
retained; `mergeNew` still preserves completed rows. Public summaries,
identity-match notes, content hashes and per-tag evidence live only in the
catalogue. There is no runtime web scraper, automatic rescan or Odoo write.
See the [public-source review](../ai-context/PROJECT_TAG_WEB_ENRICHMENT.md).

The normal authenticated unit catalogue handler also reads the local snapshot
and applies `project-tag-view.createView` to its already verified accessible IDs
and session source namespace. Only tagged IDs and their used localized
definitions enter `result.tagMap`; public summaries, source URLs, hashes and
evidence are omitted. `unit-dico.js` opts into the similarity renderer
only from the unit overview, before the unchanged calendar 02. No description
reads or scanner imports occur. The browser computes exact-tag weighted Jaccard
links, deterministic positions and weighted communities; tag definitions supply
labels in the current locale. Parent cleanup and opaque state restoration retain
focus/details across language and cached refreshes.

The unit handler also calls pure `programme-service.createProjectMap` on those
same visible project rows. Its fixed reference resolver is shared with the
programme lookup; no RPC is added. `result.programmeMap` carries only programme
identity/subtitle and matched visible IDs. Optional projection errors retain the
catalogue with unavailable mapping.

The same service optionally confirms `organism_id` as a many-to-one
`res.partner` relation. It reads that field only for the retained exact project
IDs under unit 206, then resolves only the resulting exact financing-body IDs
and names. Complete validated rows become `result.organismMap`; unsupported,
denied, incomplete or contradictory evidence becomes unavailable without
discarding the catalogue. The projection is rebuilt with every catalogue
request. The dashboard's existing `unitDicoResult` cache retains it between
refreshes; native grouping and language changes use cached data without another
source call. Explicit Unit refresh replaces the catalogue and body mapping.
No historical project/body table, financing type, collaboration partner or
caller-provided relation is substituted. Partner mode is temporarily absent
from the controls, `partnerMap` is unavailable and its source reads are suspended.

`unit-dico.js` forwards programme and organism maps as renderer options. The
renderer builds one semantic model and a deterministic thematic physical layout.
Programme and organism geometries are computed separately on first use, with
the same weighted semantic links and additional group attraction, then retained
for later returns. More than three body centres use a bounded multi-row
arrangement. Overlapping curated programme memberships still use combined
attraction and a segmented bubble fill; each project has one funding-body group.
A local native toggle interpolates displayed positions toward the chosen target
while updating active fills, cloud layers and member legends. Unassigned
programme/organism projects retain their group colour and weak central force
without a background cloud. Existing circle/link elements remain; their
coordinates change without altering the model or its source evidence.

The pure solver records independent position snapshots for the initial settling
and replay. Cumulative maximum displacement assigns proportional time to each
physical segment with smoothstep easing, including the final collision pass;
mode transitions use cubic interpolation between their retained targets.
Native animation-frame callbacks update circles, label guides,
member hulls and both visible/hit-test link endpoints. Clouds become more opaque
during settling; labels and guides fade in during the final 20%. Reduced motion
or unavailable animation APIs paint the exact final layout
immediately. Cleanup invalidates callbacks and removes the motion listener.
Ready/mode/focus state is captured for cached and language refreshes; a missing
optional mapping disables only its mode and falls back to themes when needed.
Counts/tooltips distinguish exact programme/organism members from approximate
spatial envelopes. The animation itself adds no source request.

## Language and local preference

`i18n.js` and explicit core/shell/project/timeline/steering/server catalogues
load before their renderers on the welcome page and dashboard. `language-client.js`
reads the public `/api/preferences/language`, applies `document.lang` and static
keyed text/attributes, and exposes a `ready` promise before dashboard data
bootstrap. The FR/NL control changes the browser locale immediately, dispatches
`dashboard:languagechange`, and serializes authenticated local preference saves.
Revision checks prevent late reads/saves from replacing newer choices.

The dashboard and steering handlers repaint cached personal, programme and
project data without navigation or another Odoo fetch. Scope, selected
project/programme, monthly mode, independent employee filters and exclusions
remain in their existing state maps. Source names/descriptions are passed
through unchanged; backend-authored warnings/errors use registered message
templates and English aliases. A failed local save leaves the browser choice
active with a localized persistence warning. See [configuration](CONFIGURATION.md#language-preference)
and [API](API.md#local-language-preference) for the fixed-path store boundary.

## XLSX import

1. A file input reads the workbook as an ArrayBuffer in the browser.
2. The embedded ZIP reader extracts stored or deflated entries; DOMParser reads workbook relationships, shared strings and worksheet cells.
3. Import-specific parsers identify month headers, indentation, measures, planning end dates or task deadline counts.
4. Dataset builders create project/employee rows and monthly values, excluding total and Internal rows where applicable.
5. Year selection drives summaries, remaining-hour tables and canvas rendering. Project legends share employee visibility across their line charts.

Uploaded workbooks are parsed in the browser; the import functions do not upload them to the proxy server. Data is held in page memory, so a reload requires importing or fetching again.

## Odoo connector

The personal macro also lazily requests `/api/odoo/my-work-capacity` with only
the selected calendar years (all intersecting years for a custom range). The
server rechecks the session UID, resolves its exact own identity, and delegates
metadata-confirmed calendar/global closure/annual paid allocation reads to
`work-capacity-service.js`. It always includes the current-year reference;
requests, balances and payroll are outside this read path. The frontend caches
by years and refresh generation, discards obsolete responses, and computes
scope capacity through `WorkCapacity.summarize`. `PersonalCapacity.render`
receives that result plus the full own scoped planning total and renders between
recommendations and the pie. Pie visibility does not change these totals or
refetch HR data; custom ranges within already loaded years recalculate locally.
Optional capacity failures leave existing personal hours and planning intact.

1. The page requests /api/auth/session to display the signed-in email, then POST /api/odoo/my-time with an empty body to load **Mon temps**. The server derives employee/resource IDs from exact session UID relations and ignores caller identity, account and unit overrides.
2. Personal reads retain own actual/planning records across accessible projects. The browser stores the response, selects years or a custom date range, and calls `PersonalTime.summarizeProjects`/`render` for the full-disk planned/actual macro. Legend visibility stays in page memory and recomputes geometry locally without fetching. SVG viewBox resizing preserves the chart's coordinate system.
3. The server uses the signed-in session credentials, authenticates and queries Odoo through XML-RPC. Request/config credentials cannot replace the user.
4. Planning queries inspect available fields and try supported employee/project domains. Queries paginate and normalize records into monthly summaries.
5. The browser converts responses to its chart datasets and rerenders. Debug output exposes query results and warnings to the user.

Personal refresh uses response-generation checks; planning failure preserves
actuals and an explicit unknown-plan state. `PersonalTime.normalizeScope` accepts
iterable years or `{startDate, endDate}`. Year mode retains full selected UTC-year
planning. Custom mode uses inclusive Brussels dates for actuals and Brussels
midnight instant boundaries for duration-prorated planning, preserving DST
duration changes. Actuals in both modes stop at the Brussels local day; the existing monthly
datasets remain available for detailed views. Personal identity comes from the
server mapping, not every employee found in a unit aggregate.

The far-right scope control uses two native date inputs and applies a valid
complete range on change. Invalid/incomplete values keep the previous valid
scope and expose an inline message. Scope labels and pressed year chips reflect
the active range; clicking a year returns to year mode, while the explicit reset
restores remembered selected years. The same active scope feeds macro totals,
its calendar ring, the personal project grid and the first two comparisons.
These changes reuse cached records without another Odoo read. Lifetime hours,
monthly history and all-year budgets retain their independent periods.
Hiding the scope bar closes its editor without moving focus. A hidden editor
does not intercept Escape from the independent budget dialog.

`renderPersonalRecommendations` builds a separate model from the same cached
personal summary and raw planning slots, before the pie. It uses all scoped
projects independently of legend-hidden IDs. `buildRecommendations` splits
year/custom ranges into annual parts, prorates slots using the existing UTC or
Brussels-midnight boundaries and reconciles these parts to the scoped plan.
Each part's allocation is spread over its selected/project-date intersection;
inclusive-through-today fractions sum to the expected hours. Invalid slots,
negative/unknown totals, unreconciled annual amounts or a nonzero allocation
without any project-date calendar overlap produce explicit unavailable reasons.
The signed scoped actual total is retained without project-date clipping.

For rows without a confirmed stop condition, variance against expected hours
assigns orange Ralentir, green Augmenter or black Continuer using the local
symmetric tolerance, initially 15%. Remaining
weekly hours use the nonnegative scoped plan balance divided by selected/project
calendar weeks strictly after today, excluding unselected gaps. Future/ended
dates disclose that no future rate is available. Orange/green rows expose the
signed hour gap and max/target rate through the clipped final date; Continuer
normally shows only names. Known unplanned actuals retain an explicit Hors planning note.
The explicit linear-interpolation title includes the selected years or custom
dates and updates in place. It distinguishes these pace gaps from
the personal bar/pie legend's available scoped-hour balance and selected end date.
A separate absence check requires successful complete personal planning and
examines all project slots from inclusive Brussels today to the project end,
including unselected years. Current-day positive allocations prevent this stop
reason; uncertain data cannot prove absence. Known project expiry on or before
Brussels today and a known exhausted project-wide BW convention-hour budget
are two independent stop reasons. Any confirmed reason assigns the row
exclusively to the first, red **Arrêter** column, before Ralentir, Augmenter and
Continuer. Multiple reasons remain visible together as short inline labels
after the project name. Detailed evidence, signed gap or unavailable pace stay
in the native tooltip and accessibility description. Stop rows have no weekly
target and survive missing interpolation without inventing a gap;
the tolerance affects only the remaining three columns. Scope membership and
zero-activity omissions stay unchanged. Known absolute gaps sort descending
in the first three columns, with unavailable stop gaps last and stable title/ID
ties. The grid uses four, two or one column as viewport width decreases.
The recommendation view is a separate host above the pie. Its native range,
label, output, focus and percentage accessibility text remain in place while
only lists/reasons/counts update. Named unavailable reasons use native details,
and category counts announce politely. Threshold changes rerender only this
host, preserve the pie/legend and make no additional RPC call.

The macro groups known nonpositive planning with nonzero actuals into **Hors
planning** below a divider. Its signed subtotal follows shown legend items;
unknown planning remains separate. **Mon temps · 02 / Suivi par projet** is
hidden in the personal view. The **Mes projets** legend adds the neutral
available-hours balance and selected-period end date for known actuals below
a positive full-period plan, preserving the
existing overrun labels, hidden-entry details and signed-credit notices.

After optional project dates and monetary card budgets, the server adds
`personnelBudget` evidence for the same involved project-ID union. A typed
`budget_staffing_convention_hours` read projects only unique exact requested
IDs. Only positive readable allowances with valid project starts enter the
single batched, paginated employee-linked analytic-line read. Its domain uses
these project IDs, the earliest eligible start and inclusive Brussels today;
postfilters enforce each project's own start. Post-end imputations are included,
whereas nonemployee expense/quantity lines are excluded. A known future start
proves zero consumption without reading colleague lines for that project.

An opt-in strict HR lookup requests only typed job-title/job-position columns
for exact employee IDs in these records, with exact private/public fallback.
Known Ormitters are excluded, including the explicit `named-override` for Viktor
de Groote when the already-read employee relation retains his full name. This
label stays backend-only and requires no extra Odoo fields or reads.
Unknown classification for other people, duplicate/malformed
relevant records or unavailable reads prevent a complete affected aggregate;
source precision and signed corrections are preserved with compensated sums.
Only `{status, conventionHours, actualHours, actualStatus}` scalar evidence is
attached to catalogue projects. Colleague records/names remain backend-only;
personal source responses, membership and optional planning-error behavior
remain intact. The browser compares available positive convention hours with
available project-wide actuals without rounding to determine budget exhaustion.
This optional read is session-bound and subject to the same read-only guard
and accessible-record limits as other source reads.

The server optionally enriches the involved project-ID union with strict
`startDate` / `endDate` from confirmed `date_start` / `date` metadata. One batched
exact-ID read, with independent field recovery after denial, cannot broaden
membership or replace unknown dates with inferred periods. It also reads managers
through `project.project.user_id`, then reads names/`image_128` for only those
`res.users` IDs. Missing/denied metadata or rejected photos leave hours intact.
The shared optional `enrichProjectBudgets` helper adds the full convention macro
total and its confirmed currency by exact catalogue ID, independently of dates
and managers. Field denial retries amount/currency separately and cannot alter
membership. Monetary field metadata includes its `currency_field`; a conflicting
binding keeps currency unknown. No financial detail is loaded for these cards.
The browser combines that metadata with the same scoped personal
summary to render the **Projets** native radio grid and the shared
`UnitDico.renderTimeline` calendar below it. Full mode uses project lives for
those same scoped project IDs; near mode clips the display to Brussels today
minus/plus three calendar years, preserving catalogue dates by exact identity.
`ProjectBrowser.cleanup` releases its calendar observer before rerender, detail
entry or tab departure; timeline name/bar selection opens the same project view.
Changing scope can clear
an out-of-scope selection, and macro-hidden IDs do not filter this grid.

Personal, Unit and programme-associated project grids call `ProjectCard.mount`
with its default outline presentation. The direct-child native radio stays
outside the decorative faces and SVG. The outline-only CSS clips this input to
a one-pixel box, removing the visible circle without removing native label,
keyboard or accessibility behavior. The three programme selectors keep their
visible radios. Shared `nameParts` / `createTitle` helpers
parse only the existing `project.name`: the first nonnumeric bracketed acronym
without brackets, a bracketed or leading numeric code of at least five digits,
and the remaining full title. Fronts show the existing manager portrait, bold
short title and turquoise underline. Without an acronym the remaining title
supplies the short title; missing codes remain empty rather than using an Odoo
ID. Hover/focus reveals the mini portrait, source code, full remaining title and
two visible strict start/end dates. The SVG border traces in 650ms while the
faces fade/translate; there is no project flip or ambient-color background.

Complete source names remain in tooltips and native radio labels. One native
metadata description retains the manager name, dates and full convention budget;
the outer label tooltip also retains dates and budget. Budget remains outside
the visible project details. Existing PNG/JPEG/WebP data URLs are bounded and
validated, with initials after image errors. No extra source read occurs, and
source names, metadata, radio identity and listeners are unchanged. Faces and
SVG stay hidden from accessibility trees; the SVG is nonfocusable and cannot
intercept pointer selection. Unit desktop cards stay 112px; personal desktop
cards use 190px, or 180px at phone viewport width. On touch/no-hover devices,
project fronts and details are simultaneously visible with a minimum 190px
height. Dates can wrap, including Dutch unknown-value text. Reduced motion
removes transitions; long titles remain clamped inside equal-size cards.
Personal scope preserves full-lifetime metadata by exact project ID without
recalculating the budget.

Only the three programme selectors pass `variant: "programme"`. They retain
their original portrait/code front, catchphrase and identity back, 550ms flip,
five-second rotating turquoise border and floating turquoise/blue/yellow orbs.
Their touch/no-hover layout still shows both faces at twice the fixed height;
reduced motion removes their transitions and animations. Project cards beneath
a selected programme use the default outline presentation, not that variant.

Selecting a radio requests `/api/odoo/project-hours` once with the exact
numeric `projectId`. Its full-history classified records and exact own
employee/resource identity supply personal and all-employee comparisons.
The browser initially excludes known consultants, includes/discloses unknown functions,
and reuses `PersonalTime.summarizeProjects` for selected-year or custom-date plans and
actuals through Brussels today. `ProjectBrowser.barGeometry` uses 75% as the
positive-plan baseline and a linear `75 * calendarFraction` date position.
`PersonalTime.projectCalendarProgress` intersects the selected calendar periods with
inclusive project start/end dates from the cached lifetime metadata, then counts
eligible Brussels calendar days for the first two comparisons. Disjoint-year
gaps are excluded, the first eligible day is zero and the final eligible day is
one. Missing/invalid dates or no overlap yield an unavailable reference rather
than a full-year fallback. The renderer displays the effective first/last dates.
This calendar correction does not replace raw scoped planned/actual totals
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

Both scoped project and lifetime comparison bars sort a copied included-person
list by descending actual contribution before creating segments. Each uses
its own summary values, with existing name/ID tie order. The original alphabetical
contributor list still drives legends; ignored scoped hours retain their tail
segment and negative/unreconciled summaries retain the neutral fallback.

Selected project hours also start an independent `/api/odoo/project-milestones`
read with the exact positive project ID. A dedicated ID-keyed optional cache
shares hours refresh/session generations, rejects stale or foreign-project
responses, and survives local scope, language and contributor changes. It does
not delay the hours request. The shared personal/Unit/programme detail passes
the normalized source to both monthly charts; each clips dates to its own
visible period. Optional failure retains the hour graphs and shows a separate
milestone availability note.

Before the legacy employee/function lookup can enrich raw planning slots,
`project-planning-service.js` snapshots their authoritative planning identities.
It reads metadata and optional columns only for resources present on the exact
selected project's slots. A unique readable exact-ID resource name with a
case-insensitive `TH_` prefix and nonempty suffix marks a collective placeholder,
even when Odoo links it to an employee. That business marker precedes a positive
original slot employee ID in the immutable snapshot. Technical employee relations
still prove an empty link or unique owner; malformed, denied or contradictory
relations stay technically unknown without discarding a verified TH name.
On the inspected schema, singular `employee_id` is one-to-many to `hr.employee`,
so its ID array is validated by cardinality rather than treated as many-to-one.
Optional name/link reads recover separately, and a successful empty HR search
cannot prove a resource unlinked. Missing/denied/duplicate resource-name evidence
leaves resource-linked business identities unknown, preventing a linked collective
placeholder from becoming confirmed person coverage. The response adds
`planning.resources` and each slot's `planningIdentity`; it does not change source
hours or existing legacy enriched employee fields. Resource-free explicit person
evidence remains usable, and optional source failure cannot discard hours.
Even a whole optional-loader failure keeps resource-linked snapshots unknown;
the fallback does not turn their positive technical employee IDs into people.

The page calls `ProjectPlanning.summarize` on the same cached project-hours
response with Brussels today and `includeOrmitters: false`, independently of
the existing graph checkbox. The four macro cards use the exact positive BW
convention scalar, signed actuals since project start through today, future
planning with TH included, and `actual + future planning - convention`.
Actuals include post-end charges through today; the existing lifetime bar still
clips its records to project end. Known Ormitter records are excluded from the
macro, while unknown functions retain the source-coverage warning.

Remaining planning overlaps each raw UTC slot with Brussels midnight boundaries
from max(tomorrow, project start) through midnight after project end. It divides
by the source slot's unchanged elapsed duration, preserving signed allocations
and DST fractions. Today's actuals are already counted, so today's planned
remainder is not added again. A finite closed project has known-zero future
hours even when historical planning is unavailable; the last project date has
no UTC-tail future allocation. Remaining TH attribution has its own
complete/partial/unavailable state, and the projection depends on total remaining
hours rather than assuming unknown resources are people. Unavailable required
inputs leave the projection unavailable. Legacy full-life totals and confirmed
minus-TH fields remain internally compatible with their original UTC scope.

Positive confirmed-person slots produce merged Brussels calendar-day intervals
from today/project start through project end. This interval union yields inclusive
gap dates/counts without overnight or artificial working-day gaps. TH/unlinked
slots do not cover person-days. Unknown allocations affecting candidate gaps,
relevant negative/null person or unknown corrections, and invalid evidence keep
future coverage indeterminate; negative corrections can invalidate even an
otherwise complete positive union. No future period remains after project end.
Alerts retain only continuous gaps reaching the next calendar-month anniversary
of their start, with the day clamped for shorter months. The exclusive interval
end defines that comparison. `shortGaps`/`allGapDays` preserve shorter evidence,
and `no-substantial-gaps` differs from fully complete coverage; there is no
fixed 30-day threshold. The UI shows substantial inclusive dates/counts in the
warning and native details, rather than alerting on a final single-day gap.

`ProjectBrowser` presents the four cached results in **Convention et planning**
above the bars, emphasizing the future TH portion and explaining the projection
formula. Native TH/unlinked/gap details retain expansion/focus. Year/custom-range
changes do not alter its project boundary, and graph inclusion switches cannot
change the macro's fixed cohort. Both reuse cached data without another RPC.
The own scoped pair
is omitted only for confirmed numeric planned-zero and actual-zero together.

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

`personalProjectIgnoredEmployees` stores exact excluded contributor keys per
project for the scoped project-actual bar only. Legend buttons update this map
and rerender cached summaries; planning and the date tick remain unchanged.
Counted positive contributors precede a grey hatched excluded-hours subtotal,
retaining the original total bar width/cap. Names are struck through, and
counted/ignored totals remain explicit. Signed or unreconciled evidence retains
the neutral bar and a disclosed numeric breakdown instead of invented areas.
This state does not change personal/lifetime or monthly-chart filters.

The page caches full history by project ID; scope and inclusion changes recalculate
without another read. Concurrent duplicates are blocked. Successful personal
refresh clears the cache and advances its generation, so obsolete responses
cannot replace refreshed data. Loading uses titled placeholders; errors expose
retry and preserve available comparisons. Same-project rerenders preserve
heading/back, checkbox and contributor focus within the same comparison, and
returning to the grid restores radio focus. Tooltip identity includes comparison
and employee keys; colors depend on employee keys alone. Known actual totals
below a positive plan show a signed shortfall against the full displayed plan,
symmetrically with the existing overrun badge. The lifetime comparison names
its convention reference explicitly; no shortfall is inferred from unknown or
nonpositive planning or from the calendar tick's elapsed fraction.

The same cached response feeds `ProjectMonthly.summarize`, independently of year
chips or the custom range. Exact project/employee IDs separate contributors; actual series run from
the valid project start through inclusive Brussels today, including recorded
hours after the project end. Continuous month bins retain zeros and signed
corrections. Monthly is the default mode; cumulative mode applies prefix sums
to employee cents and their signed total before converting to display hours.
The actual renderer suppresses known-zero person entries in month tooltips and
known-all-zero displayed month rows in its exact-values table. Nonzero signed
contributions, unknown cells or nonzero references preserve rows; the cached
data, chart bins and totals are not filtered. Cumulative mode checks the values
actually shown, while the planned-area chart retains its existing details.
The convention reference uses the precise source scalar multiplied by each
month's overlap with the inclusive project dates through today, divided by the
total project days. Cumulative mode also sums this reference, which plateaus at
the project end while actuals may continue. A missing budget/end date omits the
reference while retaining actuals. A missing start date prevents inventing a
timeline.
Its displayed section title explicitly says **Heures réalisées · jusqu’à
aujourd’hui** (Dutch: **Gepresteerde uren · tot vandaag**); the period caption
retains the actual-through date independently of the future project end.

The actual summary also exposes `planning`/`planningStatus`/`planningWarning`,
with exact dated slot overlap through today in the same month bins. Each actual
contributor has independent `scheduledPlanning`/status/warning fields for the
solid red comparison. These do not replace the dotted lifetime-linear fields.
The same cached response separately feeds `ProjectMonthly.summarizePlanning`,
which constructs full-project month bins through project end, including future
allocations and planning-only/TH/resource identities. Source planning failure
does not erase actual history and cannot fabricate zero planned hours.
For available planned series, the same cached lifetime convention scalar also
feeds `linearReference` through the inclusive project end rather than today.
Monthly points use overlapping project days; cumulative points sum to the full
allowance. The summary carries the independent budget status. A missing or
nonpositive budget leaves `convention: null`; unreadable/invalid evidence stays
unavailable, and a nonfinite projection is not rendered.

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

These individual history references include future project planning, whereas
the first two horizontal bars contain only selected-year/custom-range planning
and actuals. Comparison headings state the scoped period directly. The history
labels describe the full-life reference and independence from selected scope;
the current month remains partial. A lifetime cumulative reference can therefore
exceed the entire selected year's planned amount without changing either
underlying total or indicating a calculation error.

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
The planned chart has its own `personalProjectPlannedMonthlyEmployee` map and
callback, validated against its full planning cohort. Both charts share mode
and Ormitter preferences, while kind-scoped rendering retains independent
SVG/radio/tooltip IDs, focus/open-table state and complete lifecycle cleanup.
Planned employee/resource filtering retains the independent dotted project
convention in geometry, legend, tooltip and exact table; Ormitter filtering
does not change its allowance. Available/empty/unavailable reference notes use
the French/Dutch catalogue, and missing references do not erase planned areas.
Real inclusion/mode/employee switches advance a per-project reveal revision,
replaying the shared one-second clip reveal on visibility. Scope changes, resizing and
unchanged rerenders retain the revision; reduced motion skips animation.

The separate Lead Unit route still resolves the connected unit and scopes all
contributors by exact owned-project IDs. Its all-contributor totals must not be
installed as personal macro data. DiCo steering retains its own confirmed scope.

The public welcome page posts email/password to /api/auth/login. Its separate
**Utiliser le fichier de configuration** button posts JSON `{}` to
/api/auth/login-config. After checking the loopback peer/Host, the server reads
the private username/token
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

## Unité DiCo overview and shared project detail

The third sticky tab **Unité DiCo** lazily posts JSON `{}` to
`/api/odoo/unit-dico-projects`, independently of personal time and disabled
steering configuration. The server authenticates with the current session,
requires the fixed `project.project.lead_unit_id` many-to-one `hr.department`
metadata, and reads only department `206` projects with archived records enabled.
`unit-dico-service.js` applies exact department/ID postfilters and removes only
normalized exact Interne/Overhead pseudo-projects. No employee involvement,
hours threshold or year/date scope restricts this catalogue.

Only confirmed `date_start` / `date` fields supply project endpoints. Optional
field denial retains readable core identities and retries each date independently
for exact returned IDs in the same department. Manager enrichment reuses exact
project/user IDs and validated optional photos; it cannot remove a project.
The narrow DTO returns catalogue identities/dates, unit/field identity,
warnings and read timestamp without loading hours or finances.

The page checks department `206`, field `lead_unit_id` and positive project IDs
before caching the response. A separate fetch token rejects obsolete catalogue
responses. Unit and personal project selections remain distinct; the overview
uses **Unité DiCo · 01 / Projets** compact manager-radio tiles, followed by
**Unité DiCo · 02 / Calendrier des projets**. `UnitDico.buildTimeline` determines
the full inclusive day scale from readable earliest starts and latest ends by
default. `projectCalendarView` is shared across personal/Unit/programme overviews;
its `near` mode fixes the scale to Brussels today +/-3 calendar years, clips
complete overlapping bars and omits wholly outside rows with a count note.
Source dates/cards and incomplete-date rows remain. Calendar switches rerender
from cache and restore their native radio focus. Projects with valid end dates
in year 2999 are omitted from timeline rows
and both scale bounds, while remaining in the radio catalogue. Missing/reversed
periods remain labelled without fabricated bars. Stable
ID colors connect selectors and timeline rows. Left row labels reuse the shared
short-name parser, with full source names retained in titles/accessible labels.
The contained scroll region
keeps project names sticky beside the time axis. Brussels today controls grey
completed-project bars and an aligned dotted reference across the axis/rows.
Both calendars place ongoing/unknown-end projects before completed projects,
then sort each group by start date, localized name order and exact ID; sorting does not
change their date bounds. A shared calendar builder preserves the same labels,
geometry, selection, viewport reveal and focus behavior in both overviews.
After mounting, one IntersectionObserver watches the untransformed duration
buttons, including clipping by the horizontal scroll region. Each button's
inner fill reveals once over 0.5 seconds. `UnitDico.cleanup` disconnects and
invalidates callbacks on rerender, tab departure and entry into project detail;
reduced-motion and observer-unavailable paths retain fully visible bar fills.

The Unit renderer then adds **Unité DiCo · 03 / Projets simultanés** from the same
timeline result, with no additional source request. Complete valid intervals become
grouped start/end-next-day events; a chronological sweep records each month's
maximum simultaneous count, including zero gaps and future months. Partial dates
can extend full-mode bounds but are excluded from counts with a coverage note.
Near mode uses that same window and only each visible month fragment, retaining
projects spanning the left edge. An all-outside known catalogue yields zero
visible counts; missing complete evidence remains unavailable.
Unavailable bounds/complete periods and spans exceeding 2,400 months produce an
explicit notice without a numeric plot. The step SVG area/line, month tooltips and
expandable values table share calendar bounds/ticks/today. Roving month controls
retain focus across rerenders. Both contained scroll regions synchronize their
horizontal position; `UnitDico.cleanup` removes these listeners together with the
duration observer. The personal `renderTimeline` path adds only its calendar.

Selecting a radio, row name or duration bar passes the exact project ID to the
existing `ProjectBrowser` detail. Hours and finance data reuse shared exact-ID
caches and per-project preferences, while membership comes from the unit
catalogue rather than scoped personal hours. Back restores the unit radio's
focus. Unit overview hides personal period controls; the selected Hours view
uses the shared selected years/custom range, and its lifetime/monthly/finance
views retain their established periods. Scope changes cannot remove a unit
selection. Returning to Unité DiCo preserves that unit selection; entering
Projets retains its established return-to-picker behavior without changing the
remembered unit project or shared per-project preferences.
`loadSelectedProjectDetail` lazily restores missing Hours/Budget data when a
remembered unit selection is reopened with a cached catalogue. Leaving either
project tab tears down its modal/monthly lifecycle; inactive project containers
are not rerendered or remounted in Mon temps or legacy steering views.

Unit refresh replaces its catalogue, invalidates shared hours/finance detail
cache generations after a successful read, and clears a selection only when it
is absent from the refreshed catalogue. It then reloads any currently selected
detail in either project tab, so a refresh completing after navigation cannot
leave the active view waiting on an invalidated response. Required source failures show an error
and retry rather than an empty verified portfolio. These browser states remain
in memory and do not write to Odoo or alter personal dataset membership.

## Fixed programme choices and optional portraits

`steering-client.js` always enables **Programmes** independently of the legacy
metadata/configuration gate and shows its separate `programmes-view` host.
`index.html` hides personal period/hour controls in that view. On first entry,
`ProgrammeBrowser.render` immediately displays the fixed DC1/DC2/DC3 choices
with their approved labels and initials, then lazily requests
`POST /api/odoo/programmes-catalogue` with `{}`. A loading notice does not disable
the radios or replace these definitions.

The server validates the session, method and empty JSON object, reauthenticates
only the session account and requires the same UID before programme reads.
`programme-service.js` begins with the same three fixed definitions. Confirmed
`res.users.id`/`name` metadata permits a bounded OR domain of exact `=ilike`
names: normal/reversed word order and the accent-folded variants of the three
responsibles. Archived users are enabled. Returned names are case/accent/word
order normalized and postmatched to fixed identities; foreign, inconsistent
or ambiguous IDs cannot supply a portrait. Confirmed binary `image_128` allows
a separate read for only uniquely resolved IDs, with another identity and
duplicate-row check. Shared bounded raster validation produces data URLs;
denied, missing or invalid image data leaves the fixed name and initials.
Neither query reads projects, employees, planning or financial records.

The browser validates exactly three unique canonical programme IDs before
installing enrichment, and only accepts photos attached to the matching fixed
responsible name and positive user ID. Definitions cannot be replaced by source
labels. The successful catalogue is cached in page memory, deduplicating repeat
entries/in-flight reads. A generation token ignores obsolete responses; a failed
forced retry retains previously loaded portraits and the selected DC identity.
Failures show a generic notice and **Réessayer** while preserving all choices.
An active retry remains focusable while loading, ignores duplicate clicks and
retains focus on failure; success restores the selected or first DC radio.

`ProjectCard.mount` accepts optional presentation strings for the catchphrase
badge, italic subtitle, tooltip and single native description. This preserves
the shared animated faces without supplying fake project dates or budgets.
Renderer replacement preserves the focused DC radio, and navigating away/back
retains selection and cached portraits. Personal year/custom-date changes leave
this portrait catalogue unchanged.

Choosing a different canonical DC radio clears `selectedProgrammeProjectId`
and requests `POST /api/odoo/programme-projects` with only `{programmeId}`. The
server uses the session UID and fixed 10/8/5 reference lists in
`programme-service.js`, independent of unit, employee involvement and dates.
Metadata-confirmed project `name` and optional `display_name` are searched by
bounded OR domains containing only that programme's eight-digit business codes.
Strict bracketed/leading-code postmatching rejects incidental substrings,
foreign/invalid IDs, conflicting codes/names and multiple exact candidates.
Missing/ambiguous references remain in `coverage`/warnings rather than creating
placeholder projects. A denied optional lookup marks incomplete coverage;
unreadable core metadata or all denied lookups fail explicitly.

Only matched positive project IDs receive optional metadata-confirmed source
dates and full convention-budget/currency enrichment; denied combined dates
recover independently. Exact project/user-ID manager enrichment reuses the
existing safe portrait path. `in-beTwin` uses the specifically verified code
`56261849`; no programme relation is inferred from Odoo. The result contains
the canonical programme identity, accessible project DTOs, coverage, warnings
and read timestamp without hour/finance-detail reads.

`programmeProjectsCache` stores independent entries by DC identity, deduplicates
in-flight/cached reads and ignores replaced entries. The browser requires a
matching programme ID and unique positive project IDs before installing data.
Only the active programme can repaint lower content or alter its project
selection, so late responses cannot replace a newer programme view. Retry and
refresh reload the chosen catalogue; a successful forced refresh invalidates
shared hour/finance cache generations. Programme changes replace the lower
project/cards/calendar/concurrency host, while the separate three-card
programme host remains visible.

`UnitDico.render` receives programme-specific headings, captions, accessible
region/legend/radio names and source-status text while retaining its shared
card/calendar/concurrency calculations. The lower sections are **DCx · 01 /
Projets**, **DCx · 02 / Calendrier des projets** and **DCx · 03 / Projets
simultanés**, with a displayed-match/expected-reference count badge. Source
warnings remain available below the charts. Selection/name/bar uses the shared
exact-project Hours/Budget
detail and preferences, with a separate remembered programme project ID. Back
returns to that programme overview and restores radio focus. Tab departure,
programme replacement and detail entry release chart observers, scroll links
and detail lifecycles. Overview hides personal date controls; Hours detail uses
the existing scope, while project-life/calendar/finance periods stay unchanged.
Shared **Actualiser**/**Réessayer** controls remain focusable during pending
reads with `aria-disabled` and click guards, retaining their focus through
loading/response rerenders.

## Selected project finances

The same cached finance response supplies `purchases`, calculated by
`project-purchase-service.js` from the original exact-project analytic rows.
It independently verifies referenced purchase document types/posting state and
the project-start/Brussels-today scope, deduplicates both category dimensions and
enriches only confirmed purchase descriptions. Failures of this optional source
do not replace the existing lifetime or annual calculations.

`project-budget.js` mounts `ProjectPurchaseFlow` immediately after the first
budget/consumption horizontal comparison. Its model groups by confirmed currency
and direct rubric/code identities, preserving unknown amounts for detail-only
display. Blank internal codes use one explicit unassigned middle bucket per
currency and purchase/correction diagram; original rows and warnings remain
intact. Nonblank codes without a verified category ID
remain entry-specific. Native SVG uses fixed three-column geometry, contained scrolling and
the existing stable internal-code palette. Convention category fills use the
same HSL scheme keyed by exact category identity; allocation gradients start
at that fill, consistently across purchases, corrections and currency groups.
Hover, focus or tap shows a translated
tooltip; a single ribbon gains a foreground copy while its original focusable
node remains in place. Other ribbons dim without propagating selection. Leaving,
blur, Escape, chart-background activation or scrolling clears the emphasis.
Node activation shows information without highlighting its connected paths.
Tooltips retain deduplicated full source code labels whenever all hovered rows
share one nonblank code identity, including aggregate nodes/ribbons. Mixed-code
and unassigned aggregates do not select an arbitrary label. Supplier, document,
date and purchase-description details are shown only for a single allocation.
Reduced motion removes the opacity transition. All purchase allocations remain
available in a bounded native disclosure table.

Right-hand nodes group exact full `description || documentLabel || ""` names
within each currency/purchase-or-correction diagram. Complete monthly NF/FK
references additionally group by exact uppercase initials, with optional source
asterisks ignored for identity. Valid label months determine the chronological
range independently of accounting dates; malformed/partial references keep
exact-name grouping. Stable family keys retain focus when a range extends.
They retain contributing
allocations and sum signed amounts and allocation ribbon heights. Each distinct
code-to-name connection is also summed, with its own source/target offsets;
category-to-code paths and the original detail table stay allocation-based.
Name/family-derived node/link keys survive source order and membership changes.
Same-code groups retain the code palette; mixed-code groups use a stable
name-derived HSL fill with matching gradient ends on every incoming ribbon.

Right-hand purchase/credit names and amounts share an HTML flex row within
an SVG foreignObject. Only names shrink to ellipsis; amounts retain their full
localized value, and accessible labels/tooltips keep the complete source name.
Each diagram targets a right-column content extent at most twice the left
category extent, counting connector rectangles and label envelopes, excluding
canvas padding and headings. Right-column gaps tighten from 18 to 2 SVG units
before font size reduces from 10 to 8 units (7.5 to 6pt before proportional SVG
fitting). Centred label frames/line height scale from 16 to 12.8 units; adjacent
frames retain at least one unit of clearance, increasing individual gaps when
necessary. Category/internal-code gaps remain 52 units. If minimum typography
and spacing still exceed the target, the diagram grows without omissions,
label collisions or changes to amount-to-ribbon thickness. Sparse diagrams
retain the maximum sizes. Layout exposes `purchaseStyle` and `columnExtents`;
the renderer applies those same font, line-height and frame dimensions.
Links whose endpoint node fills differ receive a source-to-target user-space
linear gradient with an ID unique to the render and diagram. The foreground
copy reuses its gradient URL; links with equal endpoint fills remain solid.

The parent budget and shared project renderers preserve stable purchase-control
focus and open detail state on cached rerenders. Budget cleanup hides tooltips
before a host is removed during project/Hours navigation. A top-left square
control moves the same graph panel into a viewport-filling native dialog, with
a sticky restore control. The available viewport area below the first diagram's
preceding title/notices/totals determines a common scale for all expanded SVGs:
the smaller width or height ratio wins. Diagrams are centred and preserve their
aspect ratio, with equal physical ribbon scales for purchases and credits.
ResizeObserver/window resize recalculate the fit; restore/cleanup disconnects
observers/listeners and clears inline dimensions for the embedded layout.
Native modality and a focus
boundary keep keyboard navigation within it; Escape, cancellation or the toggle
restore the panel and control focus. Parent renderers capture the focused
control before teardown so modal reparenting cannot lose its refresh identity.
Cleanup closes the dialog without refocusing before removing a host. No new
source request or alternate graph data is used. The new JS/CSS are
authenticated static assets, loaded before `project-budget.js`; no library or
build step was added.

A second square beside expand controls the graph body with `hidden`, leaving
the translated Sankey heading and both controls visible. Its ARIA label and
expanded state switch with the plus/minus icon. Hiding clears tooltips/emphasis
and closes any fullscreen dialog before restoring toggle focus. Expanding
reveals a hidden body first. A panel collapse-state attribute and the parent
budget's `collapsed` option preserve the choice on cached/language rerenders,
along with existing detail disclosure state; no persistent preference is saved.

The selected project header switches between Heures and Budget. Browser maps
remember the mode, explicit convention choice and default-off annual supplier-cost
exclusion by exact project ID. A separate map remembers `showBwPersonnelCosts`, defaulting
to false and accepting only explicit booleans once finance data is loaded.
Changing it rerenders the cached finance response without a fetch; project
switching and data refresh preserve that project's choice. Both monetary
preferences remain independent of date scope and employee-hours inclusion. Budget
mode hides year/custom-range controls and retains the selected project, independently of
scope changes; its first activation lazily posts only `projectId` to
`/api/odoo/project-finance`. The separate finance cache deduplicates in-flight
reads and rejects mismatched project responses. Personal refresh clears it and
advances its generation, preventing stale results from replacing refreshed data.

`project-finance-service.js` uses the existing guarded metadata/paginated-read
adapters. It resolves exact accessible project identity, macro fields, its
convention/annual source budgets and referenced lines. Every budget retains its
own dates, currency, status and category system. Annual totals use expense 6xxx
lines, while income 7xxx and adjustments 9xxx stay separate. Line measures remain
signed and missing values remain unavailable. Parent totals and account-prefix
controls produce explicit reconciliation states rather than replacing source
values.

The service reads the project's exact analytic account, including entries needed
for all annual periods, and fails closed if the account is shared. Lifetime
consumption applies its own cutoff through today in Brussels. Posted expense entries
and confirmed monetary hour entries contribute negative analytic `amount` as
cost; draft/canceled entries, income and future dates do not contribute. No rate
is inferred from quantity/hours. Exact IDs deduplicate entries and convention
rubric IDs supply the breakdown. Unassigned expense/time costs stay separate but
included; costs before/after project dates also remain included and disclosed.
Missing amounts, classification/unit uncertainty and incompatible currencies
produce partial/unavailable outputs rather than invented totals.
The monetary `amount` field's metadata selects its exact currency relation.
Unknown/unreadable bindings do not fall back to another currency field, including
an accounting-document currency that may be empty on time records.

The lifetime DTO also exposes `expensesOnly`, calculated independently from the
same deduplicated rows classified as posted expenses. This projection recomputes
currency compatibility, exact convention-rubric costs, unmapped costs, status,
record counts and out-of-period notices instead of subtracting personnel totals.
Confirmed employee Hours costs are excluded; posted expense entries with employee
or Hours dimensions, including supplier invoices, remain included. Excluded
personnel currencies or missing monetary values cannot contaminate the expense
basis. Genuine classification/date/source uncertainty remains disclosed. No
additional Odoo read supplies this projection.

Budget lines expose `isBwPersonnel` from their exact normalized category label:
true for a recognized BW personnel label, false for another readable label and
null for an unavailable label. Normalization handles spacing, accents and an
optional displayed numeric code; the code itself never classifies a category.
The renderer honors explicit Boolean markers and uses the same exact label
classifier only when a marker is absent or unknown. Unconfirmed categories are
retained rather than excluded from a broad account-code guess.

Annual supplier exclusion resolves only exact partner IDs and verified commercial
parents. Canonical Ormit Talent identity determines attributable costs; financial
account codes and descriptions do not substitute for identity. Posted expense
amounts must reconcile with each annual line's exact dates/category/currency.
Confirmed purchase evidence has an exact account domain and distribution
postfilter. An affected line requires billed/committed equality and independently
readable supplier evidence before its billed exclusion can also reduce committed
costs; unknown outstanding supplier commitments remain unavailable. Aggregate
filtered values and warnings accompany narrowly projected annual expense
allocations for bill popups. The renderer selects exact line-ID replacements locally, preserving
original allocations, pending values and reported balances.

Each annual expense line also carries `billDetails`, using the exact child
period/category/currency evidence and signed negative analytic amount. Optional
description enrichment reads eligible posted expense IDs only; scope, category,
date, status and currency are rechecked before attaching text. Failures preserve
amounts and disclose missing descriptions. No employee timesheet descriptions,
payment entries or invoice grand totals enter this projection. The code popup
deduplicates exact analytic IDs, keeps distinct allocations of one document,
filters verified Ormit costs and separates unknown supplier evidence. Overlaps
and reconciliation gaps cannot become a complete list.

Each annual chart groups a total and thinner code companions for each of the
three measures. Exact category/currency identities govern grouping; compatible
companion values participate in the shared signed axis. Code details support
pointer, keyboard and tap interactions. Dense plots scroll inside their cards;
only confirmed all-zero rows are removed from annual detail tables.
Thin-bar clicks open a native modal with allocated amounts, references and
Settlements New descriptions; Budgeted/Engaged selections retain their measure
separately from billed entries. Close/Escape/backdrop return focus to the exact
trigger. `ProjectBudget.cleanup` closes/removes native state, and ProjectBrowser
calls it before detaching a budget host or refreshing its project detail. Plots
and axes are 225px tall; macro card/metadata spacing is reduced another 20%.

`ProjectBudget.render` displays macro fields separately from the selected
convention's reference total. It automatically uses a single convention but
requires an explicit choice for multiple versions. Its unchecked **Afficher les
coûts de personnel BW** control selects `lifetime.expensesOnly` for consumption
and `effectiveConventionBudget` for the corresponding reference, ratio and
balance. The filtered reference subtracts signed confirmed personnel rubric
allocations from the selected convention total after validating exact unique
line IDs, classifications, monetary amounts and compatible currency. The
rounded sum of all line allocations must match that source budget total, so an
empty set with a nonzero total or an inconsistent allocation sum cannot imply
verified zero personnel. The macro-only fallback subtracts known `personnelEuros`
from `conventionTotal` in the macro's confirmed currency. Unverifiable allocations
or currency produce
an unavailable reference with a notice; another convention or annual budget
cannot supply a fallback. Checking the control restores the full source budget
and lifetime costs. Confirmed personnel rubric comparison rows are hidden by
default, while surviving posted expenses mapped to those same exact IDs remain
separate expense details. Macro cards and source DTO values stay unchanged.
An absent expense-only projection produces an unavailable notice, never a
full-cost fallback. Rerenders preserve checkbox focus.
Lifetime total/remaining and per-rubric comparisons require compatible confirmed currency.
Annual cards always remove confirmed BW personnel categories from the three
compared totals, code companions and expense details, with an explicit note.
This filter runs independently of the convention checkbox and combines with
the existing Ormit supplier exclusion. Source parent net, income/adjustments,
quality and reconciliation evidence remain separate from compared expense totals.
Retained expense totals are recomputed after exact Ormit line replacements,
requiring confirmed parent/retained currency and known source and line measures.
An unavailable source total cannot become a verified filtered total. Shared
source warnings remain visible rather than being guessed to concern only hidden
personnel lines.
Annual cards show
budgeted, billed consumption and engaged amounts as adjacent signed bars; known
currency groups share an axis, unknown/different currencies stay separate.
Expense details, income/adjustments and annual parent net are independently
visible. Changes reuse the cached DTO and do not call Odoo. The persistent
budget host retains detail expansion, while the shared project renderer restores
control focus. Hours preferences remain independent and monthly observers are
not mounted while Budget is visible.

## DiCo steering

DiCo steering uses authenticated scoped portfolio reads, then additional one-project detail reads. Projets, Unité DiCo and the fixed Programmes selector have separate dashboard hosts independent of steering configuration. The older unit and leader/contributor views retain the internal portfolio and its programme-assignment calculations. Its pure calculation module is shared with the browser for filtered consolidation; refresh replaces in-memory data and invalidates pending detail responses. No snapshots or source writes are made. See [steering data lifecycle](PILOTAGE.md#navigation-and-data-lifecycle).

## Refresh

- Last refreshed: 2026-10-22
- Tag source basis: project-tags.js, project-description.js, project-tag-scan.js,
  project-tag-view.js, project-similarity.js/css, unit-dico.js,
  scripts/scan-project-tags.js, data/project-tags.json and
  ignore/Docker files, including the separately validated web-enrichment flow.
- Purchase source basis: project-purchase-service.js, project-purchase-flow.js/css,
  project-finance-service.js, project-budget.js, project-browser.js,
  tests/project-purchase-flow.test.js and finance/budget/project integration tests.
- Additional source basis: i18n.js, i18n-*-messages.js, language-client.js,
  language-preferences.js and index.html cached locale/calendar/employee handlers.
- Source basis: personal-time.js, personal-time.css, tests/personal-recommendations.test.js, tests/personal-personnel-budget.test.js, project-planning-service.js, project-planning.js, tests/project-planning-service.test.js, tests/project-planning-http.test.js, tests/project-planning.test.js, project-card.js/css, programme-browser.js/css, programme-service.js, unit-dico-service.js, unit-dico.js/css, project-monthly.js, project-browser.js/css, project-budget.js, project-finance-service.js, steering-client.js, login.html, index.html personal/unit/programme/lifetime/planning/finance-fetch/scope/render functions and preference maps, server.js identity/contributor/assignment/convention/date/unit/programme/finance/authentication/transport handlers and summary helpers.
- Limitations: broad live schema/permission coverage remains unverified; automated and browser checks use fictional data.
