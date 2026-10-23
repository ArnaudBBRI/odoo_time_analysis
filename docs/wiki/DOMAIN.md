# Domain

## Local project tags

The shipped catalogue is keyed by normalized Odoo base URL/database and exact
project ID, with business codes/names as labels. Tags use canonical IDs and
English/French/Dutch labels. Completed rows carry a description-quality status,
meaningful character count, source-version ID/date, extracted-text hash and scan
timestamp. Full source narratives are omitted. Missing/short results are also
permanently completed; `unavailable` remains retryable. Quality uses the latest
owned macro-info summary, excluding template prompts and URL-only content;
fewer than 200 meaningful Unicode characters is short. The catalogue is local
reference data and does not represent Odoo tag assignments. See
[workflow](../../data/README.md).

Public-source enrichment is separate from Odoo description quality. Optional
`webEnrichment` records identify a Buildwise review as `verified`, `not-found`,
`ambiguous` or `insufficient`. A missing Odoo description can have tags only with
verified public provenance covering every tag. Accepted sources carry identity
evidence, URL/title, retrieval time and a content fingerprint; tag evidence
references accepted source URLs. The short public summary does not replace
Odoo's description status, character count, version, hash or scan timestamp.
Completed scans remain permanent after a deliberate local enrichment edit.
See the [web review report](../ai-context/PROJECT_TAG_WEB_ENRICHMENT.md).

The unit similarity map includes only session-visible projects with saved tags.
Each project has an equal-size bubble; link strength is weighted Jaccard overlap,
with weight `ln(1 + N / tagFrequency)` for the visible tagged population.
Weighted communities suggest thematic regions, named from their shared tags.
Positions and boundaries are approximate; exact common tags appear in focus/
pointer details. Tagged projects with no shared tags remain in a separate
specialties panel. Parent/subtype relationships are not inferred; untagged
projects are omitted. Opening a project is an explicit existing-app action.

The grouping toggle selects separate retained thematic and programme layouts.
Both use the same rarity-weighted semantic links and pair repulsion; programme
mode adds attraction to the curated DC1/DC2/DC3 centres. Other projects have
weaker central attraction rather than a tightly bound fourth programme.
Programme membership is projected onto visible IDs using the same unique
whole-code rules as the programme view. A shared member belongs to every matched
list, with combined attraction and a segmented fill from the programme colours.
Bubble fills and cloud colours match the active legend. Existing link endpoints
move with their bubbles; identities, common tags, similarities and semantic
communities remain unchanged. Deterministic settling/replay and smooth mode
transitions are presentation, not new evidence of project similarity.

Each mode has its own bounded label placement and member envelopes. Hulls can
still overlap or enclose nonmembers, so the caption is explicit and legend
counts/tooltips list exact plotted members. Animation respects reduced motion;
retained mode/readiness avoids restarting settling on cached or language refresh.

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

## Presentation language

The application presents French (`fr-BE`) or Dutch (`nl-BE`), defaulting to
French. Explicit keyed catalogues supply application labels, notes, statuses,
validation, table/graph text and accessible descriptions. Dates/numbers use
the current display locale; canonical source IDs, ISO dates and Brussels/UTC
calculation boundaries do not change. Source project/person names, codes and
bill descriptions remain original. Application-authored backend messages use
an explicit translation bridge, including registered English source aliases;
arbitrary source text is not inferred or translated.
Invented project/contributor names carry explicit `nameMessageKey` provenance.
The allowlisted `I18n.displayName` formats only those fallbacks from typed IDs;
genuine source names that happen to resemble a fallback stay literal.

## Shared wide-layout preference

The header's native checkbox switch offers **Normal / Large**, or
**Normaal / Breed** in Dutch, before the account/language controls. It is visible
in every view, has a translated accessible name and shows its status on hover
or focus. Mon temps and a selected personal project's Hours panel implement
wide layouts. Project lists, Budget, Unit and Programmes keep their normal
layout and width, with a neutral localized status when wide mode is selected.
Normal is the default. All views share the browser's `standard` or `wide`
preference under `odoo-time-analysis.mon-temps.layout`. A legacy saved `auto` value
becomes `wide` in memory without writing during initialization. Invalid stored
values or blocked reads use Normal; blocked writes leave the in-memory choice
usable. Storage never involves Odoo or private configuration.

Wide mode activates at 1600 CSS viewport pixels. Media-query changes follow
resize/zoom, with viewport-width fallback when media queries are unavailable.
A selected wide preference remains selected below that width, while the
effective display safely returns to normal. The localized status describes
the active view's layout or required width. There is no
separate automatic mode or 2000px threshold.

Active wide Mon temps removes the main content's usual 1880px maximum.
Four visual columns show recommendations, capacity/planning, the graph and the
project legend from left to right. Compared with the previous wide layout,
recommendations are 30% narrower and capacity/planning is 50% narrower; the
graph retains its width and the legend uses the remaining space. Recommendation
and capacity content stays stacked within its column.
Normal mode retains its original vertical flow. Views outside Mon temps and
selected personal Project Hours retain the normal main-content cap.

In active wide mode, the graph starts directly below the period. A compact
120px summary shares its grid cell, visually showing actual hours above planned
hours with smaller labels and values. The metric notes remain available to
assistive technology; the overlay ignores pointer events so chart interaction
continues underneath. The original planned-then-actual DOM order and normal or
standalone presentation remain unchanged.

The three hosts stay inside the static `personalTimeLayout` wrapper. Nested
grids split the graph and legend while preserving the graph card's positioned
box for tooltips; only its body uses `display: contents`. Layout changes update
attributes, CSS and the status message, without rebuilding the
rendered personal content or requesting data. The loaded-personal resize path
also avoids a full render because its SVG and CSS adapt themselves. Controls,
focus, recommendation tolerance, disclosures and cached data retain identity;
period scope and all calculations remain independent of this preference.

In a selected personal project's Hours panel, wide mode also removes the main
content cap. The overview's four macro cards and three usage cards stack in a
fixed 528.75px left column, exactly 125% of a 423px macro card at the normal
1880px cap. The four macro cards use a 91.2px minimum height instead of 182.4px,
with smaller type, gaps and padding; longer content can still increase their
height. A 28px gap separates the overview from the personal, project and
convention bar comparisons in the remaining top-row width.

The actual and planned monthly area charts form an equal-width pair below that
top row, spanning the full content width with a 28px gap. If only one chart is
present, it spans the whole row. Compact one-column 220px legends sit to the
right of the bar and monthly plots and scroll within bounded heights for
larger teams.

The `project-hours-layout` wrappers retain the normal vertical presentation
outside active wide mode. A `project-hours-monthly` wrapper groups the existing
monthly sections; in wide mode the graph wrapper uses `display: contents` so
the pair occupies both top-grid columns. Attributes and CSS switch the layout without
refetching or rebuilding controls, disclosures or cached data. Mounted chart
ResizeObservers queue SVG geometry updates in animation frames and preserve the
focused month. Notifications coalesce to the latest width; cleanup cancels a
pending frame and retired callbacks cannot redraw detached content. This avoids
changing the observed chart height during observer delivery. Without animation
frame support the existing synchronous fallback remains. Separately,
the dashboard's resize handler avoids rebuilding a mounted personal Hours
panel. Monthly geometry keeps its 1200px default limit, with an optional 4096px
limit only under the exact selected Hours layout and active wide ancestor.
Both initial drawing and resize checks share that limit, so ultrawide charts
use their available width without enlarging the labels or graph height.

## Line and area chart colour preference

The top toolbar's native **Paramètres / Instellingen** disclosure contains three
radio choices with decorative palette previews: **Dico vibes**,
**Classique / Klassiek** and **Vibrant Emotions**. Dico vibes is the default
fifteen-colour palette; Classique retains the previous twenty colours, and
Vibrant Emotions has ten colours. The shared `chart-palette.js`
Browser/CommonJS module repeats the selected array after its own length and
stores only the selected enum under `odoo-time-analysis.chart-palette` in browser
storage. Initialization reads once without writing. Invalid or inaccessible
storage uses Dico vibes; a blocked write leaves the in-memory selection usable.
No Odoo operation or private-configuration change is involved.

Changing the choice recolours mounted project SVG areas/person lines and
Unit/programme concurrency charts in place, with subscriptions released during
chart cleanup. Legacy canvas monthly, cumulative and planned/actual person
lines also repaint, together with their line-legend swatches. Palette changes
retain controls, focus, tooltip and table state, geometry, data and existing
animation state. Pies, horizontal bars, Sankeys, project clouds and calendar
colours are independent, as are semantic project-total, convention,
dated-planning and milestone styles. Escape closes the settings disclosure and
returns focus to its summary; an outside pointer press also closes it.
While open, the settings disclosure stacks above the sticky navigation/date
bar so the bar cannot obscure or intercept its palette options.

## Personal planned/actual macro

`personal-time.js` aggregates by stable project ID, retaining signed actual
credits. Only projects with nonzero planned hours or nonzero actual hours
through today in the selected scope appear in the macro and its legend. Zero-hour
records, future-only actuals and totals cancelling to zero do not establish
activity; duplicate names gain an ID suffix. Planning is prorated by slot
duration over each selected UTC calendar year, including disjoint years without
filling their gaps. A custom scope instead uses inclusive Brussels start/end
dates: actuals follow those calendar dates through Brussels today, and planning
uses exact elapsed-time overlap between Brussels midnights, including the full
end date. A DST day contributes 23 or 25 elapsed hours to a continuous slot's
overlap fraction.
Available year enumeration is capped at 150. `PersonalTime.normalizeScope`
accepts iterable years or `{startDate, endDate}` and rejects incomplete,
invalid or reversed custom ranges.

The sticky scope bar places **Période personnalisée** at the far right. Its two
native calendar fields apply automatically when both dates are valid; an
incomplete/invalid edit leaves the previous valid scope active with a short
message. Year chips are unpressed while a custom range is active. Clicking a
year selects that year and restores year mode; **Revenir aux années** restores
the remembered year selection. The scope is kept only in browser memory.

Positive planned hours determine sector angles. Every sector has the same outer
radius, starts at the center, and has no donut hole. Colored area equals the
clamped actual/planned ratio; its radius is the square root of that ratio.
Overruns/negative actuals retain signed numeric evidence while geometry remains
within the planned disk. Unknown/zero plans remain in the legend without a
sector when actual hours are nonzero. Project colors remain unique and stable across local hide/show and year
or date-range changes; hiding projects recalculates the visible planned shares.

The legend shows positive planned totals first, then separate unknown-planning
and planning-correction groups, with **Hors planning** last below a horizontal
divider. This final group contains known nonpositive plans with nonzero signed
actual hours. Its subtotal includes only shown projects, consistently with the
top metrics; unknown plans are never classified as unplanned. French name/ID
ordering applies within each group, independently of visibility.
The **Mes projets** legend mirrors overrun labels with a neutral
**Plus que x h prévues disponibles d’ici au [date]** badge when both values are
known and actual hours are below a positive full-period plan. Its deadline is
the selected period's inclusive end, independently of project-date clipping.
Hidden entries retain this detail; signed credits retain their separate
correction notice. The badge does not compare actuals with the calendar ring's
elapsed expectation.
The calendar reference ring uses Brussels today as a date-only ordinal. Its
fraction is selected days before today divided by total selected days minus
one, clamped to [0, 1]; this anchors the first selected date at the center and the
last selected date at the rim. A one-day range is complete on that day.
Leap days count and unselected gaps do not advance
the reference. Ring radius is the square root of that fraction times the pie
radius. It is a uniform calendar reference, independent of planning-slot dates
and hidden projects, drawn outside hover transforms with no pointer capture.

## Personal work capacity and total planning

Between recommendations and the pie, **Capacité de travail et planning** shows
three scoped metric cards: **Heures de travail disponibles**, **Heures totales
planifiées** and **Pourcentage des heures planifiées**, in that order. Total
planning uses all successfully loaded own scoped slots
over the complete selected years or custom date range, including future
allocations and hidden pie projects. It is not cut off at today's date.
Failed/unknown planning remains unknown.
Year mode preserves the existing UTC slot allocation; custom dates preserve
the existing inclusive Brussels overlap calculation.

The third card shows **100 × planned / available** for that same scope, using
the same large value typography as the other cards. Below 85%, the value and
note are orange; the note explains that full planning is not required but the
low ratio should be checked with the Unit Manager. From 85% through 100%, the
note explains that normal headroom includes illness absences. Above 100%, the
value and note are orange with **Vous êtes planifié au-delà de 100%. A clarifier
avec votre Unit Manager**. The notes use the user's supplied French wording.
Only machine-roundoff tolerance applies at either boundary. If decimal
formatting would hide a real threshold crossing, the rate reads **< 85 %**
or **> 100 %**. Signed corrections and rates above 100% are preserved.
Unavailable/loading/failed data or a nonpositive denominator shows
**Indisponible**, with a neutral explanation rather than either advice note
or a false low-coverage warning. Estimated
capacity retains its existing estimate disclosure and can supply the rate.

Available work is the attendance calendar's scheduled hours minus intersecting
global holidays/collective closures and the new year's approved paid leave
entitlements. Work intervals and closure intervals are unioned, so overlaps and
holidays on nonworking days are not double-counted. Calendar timezone, dated
attendance and Odoo's Gregorian ordinal alternating-week parity are respected.
Employee-linked calendar absences and `hr.leave` requests are excluded; the
measure does not change with submitted/taken leave. It excludes unpaid grants,
prior-year carryover and unconfirmed/nonannual categories. The current source
policy recognizes annual, personal compensatory and seniority categories
(confirmed types 1/3/17); the category names are read in their canonical locale.
Paid accrual allocations and incomplete source evidence cannot fabricate zero
entitlement or a complete capacity.

This entitlement-based measure is distinct from scheduling availability after
registered personal calendar absences. The production source excludes those
resource-linked closure rows; adding them while also subtracting annual rights
would double-count absence and change the capacity definition.

Part-time is already represented by the employee's attendance hours; the
work-time percentage is descriptive and is never multiplied a second time.
The currently readable calendar is the schedule basis. Using it for another
year is marked estimated; employment dates or historical contract changes are
not inferred from that current calendar.

A successful empty future collective-calendar read uses the current year's
net available day/hour count, explicitly estimated, without recomputing that
future year's weekday count. With a published future calendar but missing new
annual rights, current-year rights are reused with an estimate note. Denied or
invalid evidence never triggers these missing-data fallbacks. Partial custom
ranges allocate annual rights by their fraction of gross scheduled working
hours, explicitly estimated; noncontiguous years are summed separately. If any
selected year's capacity is unknown, the combined capacity stays unknown.

A native **Voir le calcul par année** disclosure exposes scoped scheduled,
closure, entitlement and available hours, with full-year reference notes and
estimate reasons. Its open/focus state survives rendering. The cards remain
compact, use three equal columns on desktop and become one column on phones.

## Personal pace recommendations

**Recommandations pour respecter le planning 2026 (interpolation linéaire)** appears
above the Mon temps pie with four ordered columns: **Arrêter (ou clarifier)** in red,
**Ralentir** in orange, **Augmenter** in green and **Continuer** in black. It uses every scoped personal
project, independently of pie-legend hiding. A native 0–100% tolerance slider
defaults to 15% and updates only the recommendation view in page memory.
The heading names the selected years in ascending order, or the French start/end
dates of a custom range. It updates in place while retaining the slider and focus.

Scoped planning is allocated separately to each calendar-year portion using
the same slot-duration contract as the macro: UTC boundaries for year mode,
Brussels midnight boundaries for a custom range. Each amount is then spread
linearly over that portion's intersection with the project's inclusive dates.
Expected hours are the sum of these allocation-weighted fractions through
inclusive Brussels today. This avoids weighting unplanned prior-year days as
equivalent to a funded year. The macro ring retains its separate first/last-day
visual anchors; it is not this allocation-weighted pace measure.

Actuals retain the original scoped through-today totals, including corrections
outside project dates. Variance is actual minus expected; its percentage is
defined only when expected is positive. Variance above the positive tolerance
band yields Ralentir, below the negative band Augmenter, and the inclusive band
Continuer. Orange/green entries show the signed hour gap and a maximum/target
weekly average, ending at the last selected date within the project. Weekly
hours equal `max(scoped planned - actual, 0) * 7 / remaining selected days`.
Those days are strictly after today, clipped to project dates and exclude
unselected-year gaps. This is a calendar average, not working-day capacity.
Continuer normally shows project names only. Arrêter takes exclusive priority
over all three tolerance categories whenever any confirmed condition applies:

- The project's valid end date is on or before Brussels today. An absent start
  date does not invalidate known expiry; known reversed dates do.
- Complete readable personal planning contains no positive allocation from
  Brussels midnight today through the inclusive project end. This inspects all
  cached accessible personal slots, including unselected years, independently
  of interpolation. A current-day or tiny positive allocation prevents this
  reason. Missing, failed, partial or uncertain future planning cannot establish
  absence; this check applies only from project start through its final day.
- Known project-wide employee hours since project start through today meet or
  exceed a known positive **Budget personnel BW** convention-hour allowance.
  This is a lifetime, all-employees comparison excluding confirmed Ormitters,
  independent of the user's scoped personal planning and monetary budgets.

Stop rows show only the short project name and applicable short labels:
**Projet terminé**, **Non planifié** and **Budget BW consommé**, joined inline
when several apply. Dates, the signed pace gap or its unavailable explanation,
and lifetime convention/consumption details remain in the native tooltip and
accessibility description. There is no weekly target or conflicting increase
advice. A known stop reason survives unavailable personal interpolation without
fabricated zero. Only personally active projects in the selected
scope enter the view; these checks do not add out-of-scope or zero-activity
projects. Stop conditions are independent of the tolerance slider.
Arrêter, Ralentir and Augmenter order entries by descending absolute known
hour variance, then French short-title/ID ties; unavailable Arrêter gaps follow
known ones. Continuer retains the normal title ordering.
Category headings are 15px, weight 800, with a two-pixel underline in each
category's color. The macro card uses its available content width, with natural
wrapping and the existing stacked phone layout.

Unknown/negative planning, negative net actuals, invalid dates, unverified
annual allocation or nonzero planning with no project-date overlap have no
quantified pace advice; native expandable reasons identify affected projects
without an independently known stop condition.
Future/inactive periods are disclosed, while ended periods and already-booked
pre-start work have no future weekly target. Known zero planning with positive
actuals is explicit **Hors planning** with a finite signed gap, undefined
percentage and zero remaining-hour allowance when active. Source values stay
unchanged. The range input retains focus across updates, has a label/value and
percentage accessibility text, and announces category counts politely. The
four columns become two from 761px through 1050px and one at 760px or below.

Optional personnel-budget evidence uses the exact numeric
`project.project.budget_staffing_convention_hours` field. The backend reads
employee-linked `account.analytic.line.unit_amount` only for involved exact
project IDs with positive readable budgets and valid starts, including archived
records. Returned lines are checked against each project's start and inclusive
Brussels today; post-end charges remain included. Nonemployee analytic costs
are outside this hours cohort. Strict typed private/public HR function evidence
excludes AI Consultant/AI Consultant Ormit and the explicit named Ormitter
exception described below; unknown or malformed classification for other people,
duplicate source IDs, denied reads or malformed relevant amounts/dates leave
the affected aggregate unavailable. Signed corrections and compensated sums
retain source precision for exhaustion comparison. Only scalar totals/statuses
reach the personal catalogue; colleague rows and identities stay server-side.
This comparison covers accessible records, not proof that permission-hidden
records do not exist. Missing/empty/nonpositive convention hours cannot establish
budget exhaustion, and optional failure preserves personal timesheets/planning.

## Personal project browser

The personal horizontal comparison and pie-legend below-plan badges explicitly show
`scoped planned - scoped actual` as available planned hours through the end
of the selected period. Its deadline is the inclusive custom-range end or
December 31 of the latest selected year, even when project dates clip the
graph's calendar reference. An invalid scope retains an explicit unavailable
date. This balance differs from the recommendations' expected-to-date gap;
project-wide and lifetime convention badges preserve their own references.

**Projets** uses the same personal summary and normalized scope as the macro,
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

The shared server classifier has one explicit historical exception for the exact
full name **Viktor de Groote**, after NFKC Unicode, case and whitespace
normalization. A retained employee/resource label or resolved HR name establishes
`isSubcontractor: true` with `subcontractorClassification: "named-override"`,
even when HR evidence is absent or has another function. Readable function/source
fields remain genuine; no Odoo function or employee ID is invented. The same
classification feeds hours, planning, contributor/assignment presence and the
strict personnel-hours scalar. Unknown-person warnings omit confirmed exception
records. Records without a retained name or resolved matching profile cannot use
this exception; descriptions and partial names are not identity evidence.

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

In the first two pairs, plans cover the selected years or inclusive custom
period, using the same slot overlap calculation as the macro; actuals
retain signed credits through inclusive Brussels today. Their headings name
the period directly, for example **Mes heures en 2026** or **Mes heures du
1er août 2026 au 31 décembre 2026**, rather than relying on a small subtitle.
The own-hour pair is hidden only when both scoped planned and actual hours are
confirmed numeric zero. Missing/unknown values, signed corrections and any
nonzero value retain it; project/lifetime comparisons and history remain visible.
`barGeometry` maps positive planned totals
to 75% width, actuals to `clamp(75 * actual / planned, 0, 100)` percent, and the
date tick to `75 * calendarFraction` percent. The fraction counts only selected
calendar days within the inclusive project start/end dates, excluding unselected
years and pre-start/post-end days. A December 2025 start adds only December to
the reference when 2025 is selected. Effective dates are shown; invalid/missing
project dates or an empty intersection omit the tick with an unavailable notice.
Custom scopes use the same project-date intersection for their reference.
Recorded scoped hours retain their original selected-period totals. The tick is linear rather than
the macro ring's square-root radius. Actuals beyond four-thirds of plan keep
their numeric total with a capped-bar badge. A smaller known actual total in
the personal pair shows **Plus que x h prévues disponibles d’ici au [date]**;
the all-employees pair retains **−x h en-dessous du prévu**. Both compare with
the full displayed planned total, not the linear expectation at the date tick.
Equal, zero or unavailable plans do not create a shortfall badge. The lifetime pair uses **en-dessous de la
convention** against its own positive reference. Zero planning with positive
actuals uses a full **Hors planning** bar and no date tick. Unknown planning or
negative plans have no positive comparison scale; negative actuals draw no
positive fill while retaining their signed number. **Mon temps · 02 / Suivi
par projet** remains hidden in the personal view.

Only the personal actual bar colors its interval beyond the today reference
orange and its interval beyond the full scoped planned total red. Earlier
actual hours keep the normal gradient. All segments retain gradients and the
shared fill reveal, with a **Surpointage** callout above a nonempty warning
range. A missing today reference cannot create an orange threshold; a known
full-plan overrun can still be red. Positive actuals with known zero planning
remain **Hors planning**, drawn red. Project-wide and lifetime contributor bars
retain their existing colors and gradients.

The third pair uses the exact project's numeric
`project.project.budget_staffing_convention_hours` field as **Budget personnel BW**
convention hours. Its decimal-hour scalar retains source precision; translated
or English labels do not select the field, and displayed hour/minute strings are
not parsed. Monetary/other fields and staffing/planning totals are not substitutes. Its caption shows
the project's full start/end dates and **hors période sélectionnée**. Actuals retain
only dates inclusively within that interval and through Brussels today,
independently of selected years or a custom range. Missing, invalid or reversed dates make these
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

**Convention et planning** above the bars has four large cards, independent of
year/custom-date scope and the graphs' Ormitter checkbox. All four exclude known
Ormitter records; unknown functions remain with an exclusion-coverage notice.
The cards show:

- Positive **Budget personnel BW** convention hours. A readable nonpositive
  value is **Non renseigné**, while unavailable data stays unavailable.
- Recorded signed actual hours from project start through inclusive Brussels
  today. This **depuis le début du projet** measure includes post-end charges;
  the existing lifetime bar retains its separate project-end cutoff. Known
  actuals survive unavailable planning or project-end metadata.
- Remaining planned hours, including collective TH hours, from tomorrow's
  Brussels midnight through the inclusive project-end calendar date. The TH
  portion is emphasized separately in orange/bold, with partial/unavailable
  attribution disclosed rather than invented zero hours and an italic
  **À partir du…** start-date note.
- Signed projected excess/shortfall against the convention:
  `recorded actual + remaining planned (TH included) - convention`. Positive
  values say **planifiées en trop par rapport à la convention**, negative
  **en moins par rapport à la convention**; unavailable inputs cannot
  produce a projection. Differences within 0.005h display as balanced zero,
  without changing calculation precision.

The circled **i** beside the heading exposes the projection formula, future
coverage warnings, TH/resource disclosures and other source notes in a popup.
It supports hover, keyboard focus, click/touch and Escape while retaining
interactive native details and their open/focus state. The project period and
captions inside the cards remain visible.

Below the four macro cards, three compact text-only cards replace the former
two comparison paragraphs: **Mes heures · planning**, **Total · planning** and
**Total · convention**. The Dutch labels are **Mijn uren · planning**,
**Totaal · planning** and **Totaal · overeenkomst**. They show a signed
over-/under-consumption sentence, balanced consumption or an unavailable
comparison, without a large value or percentage. Only over-consumption uses
orange emphasis; under-consumption remains neutral blue. Differences within
0.005h display as balanced without changing calculation precision.

`ProjectPlanning.summarize` adds independent `personalToDate` actual/planned
hours and statuses, signed difference and combined status. Actuals use the
verified numeric own employee/resource IDs on already-loaded raw records;
an explicit employee ID takes precedence over resource fallback. Planning uses
the confirmed person snapshot before technical owner fields, excluding verified
TH and unlinked resources. An unknown snapshot never borrows a mutable technical
employee link; a potentially own nonzero elapsed allocation with uncertain
ownership leaves personal planning unavailable. Both sides retain fixed
Ormitter exclusion independently of graph filters.

All three cards use actuals from project start through inclusive Brussels today.
The existing total-planning reference remains prorated directly from dated slots
within project dates, with TH included; the personal reference uses the same
date overlap for eligible own allocations. The convention reference remains
linear over inclusive project days. These comparisons are distinct from
projected end-of-project excess and keep independent source availability.
Signed corrections and post-end actuals retain their existing behavior;
unknown personal data, planning or convention cannot create a fabricated
shortfall or suppress an independently known comparison.

In Normal mode, the compact grid has three columns down to 520px, then stacks.
Its minimum card heights are 91.2px on desktop, 80px up to 1000px and 74px up to
520px, half the normal primary-card minima. Wide Project Hours stacks these
cards and also reduces the primary-card minimum to 91.2px, as described above.
Text can expand naturally without clipping.

Future allocation uses exact elapsed-time overlap between Brussels midnights,
with the original UTC source-slot duration as denominator. Its lower bound is
the later of tomorrow and project start; its upper bound is midnight after
project end. DST changes retain their 23/25-hour durations, and no final-day
UTC tail creates future hours after the last project calendar date. A known
closed project has zero future hours even when historical planning is denied.
Signed allocations are retained; unknown/invalid applicable data is not clamped
into a reassuring amount. Projection assumes the remaining plan is consumed,
including positions still to fill; it is not an extrapolation of historical pace.
In Normal mode, the grid has four columns, then two up to 1000px and one up to
520px, with large values, rounded pale cards and orange excess styling. Card minimum heights are
182.4px on desktop, 160px at the two-column breakpoint and 148px on phones,
20% below their previous sizes. Reduced spacing preserves the existing font
sizes; long captions can expand naturally without clipping.

**TH** means a collective source resource with a readable, unique exact-ID name
beginning `TH_` (case-insensitive, with a nonempty suffix). Its technical HR link
may be empty or point to an employee; that link does not establish a real person.
The marker takes precedence over a positive original slot employee ID and
produces a `to-hire` snapshot. Missing/denied/duplicate resource names leave TH
and person attribution unknown for resource-linked slots rather than proving
zero TH hours. A literal label supplied by the browser is never source evidence.

Technical `linkStatus`/`employeeId` remain separate from `isToHire`. The service
accepts only approved employee relations and exact involved resource/employee
IDs. On the inspected schema, `resource.resource.employee_id` is one-to-many to
`hr.employee`: an empty typed list proves no technical link, one unique ID can
prove a link, and multiple/malformed/contradictory IDs leave that link unknown.
Readable non-TH names and valid exact ownership can establish person snapshots;
an empty employee search alone cannot establish an unlinked resource. Immutable
snapshots precede legacy employee/function enrichment. The earlier requirement
that TH have an empty HR relation was superseded by linked collective source
evidence.
This identity rule affects the planning-information block; raw allocations,
actuals and the existing hour-chart calculations are preserved.

The future planning/projection cards keep TH hours included; the emphasized TH
share identifies **postes à pourvoir**, rather than subtracting them from the
projection. Native disclosures still identify the source TH resources/hours and
confirmed unlinked non-TH resources separately; **Ressources TH · durée totale
du projet** explicitly names that disclosure's full-life scope. The older full-life total and
confirmed-only minus-TH helper fields retain their existing source calculation;
they are no longer the macro cards' main metrics.

Future coverage asks whether at least one confirmed person has positive planned
hours touching each Brussels calendar day from today (or a later project start)
through project end. It merges day intervals, so separate shifts do not invent
overnight gaps; weekends and holidays are not excluded. TH and confirmed
unlinked non-TH resources do not cover a person-day. Unknown identities prevent
definite claims
where they could fill a gap. Relevant negative/null person or unknown allocations
make coverage indeterminate even when positive allocations otherwise cover all
days, because corrections may cancel that evidence. Dates/amounts are never
repaired into complete coverage. Ended projects have no future period to cover.
Only continuous gaps lasting at least one calendar month become alerts. The
threshold is the gap-start date advanced one month with its day clamped to that
month's length, compared with the gap's exclusive end; it is not a fixed 30 days.
Short gaps remain distinct from complete coverage and produce no alert, so a
single final day such as eXtRAI's May 31 does not raise a month-long warning.
Confirmed substantial gaps expose inclusive dates/calendar-day counts directly
and in native details. Open state and keyboard focus survive redraws.

**Projets · 02 / Heures réalisées · jusqu’à aujourd’hui** stacks actual employee hours in colored
areas with a thicker signed net-total line. Positive and negative contributions
stack separately above and below zero, preserving signed corrections. The
timeline starts at the project start and ends at Brussels today, without
selected-year or custom-date filtering. Actuals after the project end remain included.
Employee identity/color is shared with the bars; known Ormitters use the same
default-off inclusion choice. Zero months remain visible, and the current month
is partial.

A solid red **Planning daté** line overlays the actual chart, using the same
employee cohort or selected employee, actual chart month bins and current-day
cutoff. Allocations follow their source slot dates and UTC duration/month
overlap; this is distinct from either existing dotted linear reference.
Unavailable planning leaves actual history readable and does not draw zero.

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

**Projets · 03 / Planning mensuel · durée du projet** stacks scheduled hours by
employee/resource over the full inclusive project dates, including future
months and planning-only people. It shares the monthly/cumulative and Ormitter
preferences with actual history, but keeps its own employee/resource selection.
Colors use the same exact identity keys as the bars. Confirmed TH, unlinked and
unknown resources retain distinct, explicitly labelled buckets; source identity
ambiguity cannot borrow another employee's hours. Positive/negative allocations
stack separately, zero months remain, and cumulative totals reconcile with
monthly sums. Valid empty planning is zero; failed/malformed sources are
unavailable. Dates are bounded before constructing the series.

Its separate dotted convention reference uses the same precise hour allowance
as actual history, distributed linearly across every inclusive project day.
Monthly amounts follow each month's overlapping day count; cumulative amounts
reach the full convention allowance at project end, including future months.
This reference remains project-wide when one employee/resource is selected or
Ormitter inclusion changes; only the planned employee areas and total follow
those filters. Legend, month details and exact-value columns retain the
reference. A missing/nonpositive allowance omits the curve with an empty-budget
notice; unreadable or invalid evidence uses an unavailable notice instead.
Both notices are translated in French and Dutch, without a fabricated zero line.

Both monthly charts have separate SVG/radio/tooltip IDs, open-table/focus state
and reveal/lifecycle keys, so rendering or leaving the view cleans each chart's
observers and document handlers independently.

Projets 02 actual history and Projets 03 planning share the selected line/area
palette. New exact string employee/resource identities receive successive
ordinal slots, looping through either fifteen Dico vibes colours or twenty
Classique colours. A chart-only cache retains those ordinals across both charts,
palette changes, filters, monthly/cumulative modes and language rerenders.
Areas, selected-person actual and planned-reference lines, legend samples,
avatar borders and month-tooltip dots use the same identity colour. Horizontal
bar colours are independent. Fixed total (`#183b53`), convention (`#8496a2`),
dated planning (`#cf3347`) and black milestone styles remain unchanged.

The actual-history month tooltip omits people whose displayed value is exactly
known zero. Negative values and unknowns remain. Its exact-values table omits a
month only when every displayed numeric/reference cell is known zero, including
the dated-planning and any convention/individual reference. Cumulative mode
checks displayed prefix sums. Opposing nonzero contributions, unknown cells or
a nonzero reference preserve the row. These are presentation filters: chart
months, totals and source series remain intact; the planned-area chart is not
filtered by this rule.

Both actual and planned project-hours charts overlay dated Odoo milestones as
solid black vertical lines, independent of employee, Ormitter and monthly/
cumulative choices. Strict calendar dates must lie within the chart's visible
start/through period and month axis. Each marker occupies its calendar-day
position inside the corresponding month interaction bucket, including partial
first/last and single-month charts. A separate lower x axis shows milestone
names on up to two balanced lines at 9px, tilted at -30 degrees. It sits closer
below the fixed month ticks; the month/current-month caption follows all
milestone names at the bottom. Its compact footer grows independently of the
hour plot. Measured per-line rotated bounds, shifted boundary anchors, leaders
and extra lanes separate crowded/same-date names. Each lane uses the nearest
free interval with 6px gaps between projected boxes, and lane heights follow
their actual projected extents. Extreme
axis titles are ellipsized; full source names remain in SVG titles/accessibility
labels, the month tooltip and the compact native disclosure below the chart.
The overlay does not intercept month interactions or change hour totals/scales.
Missing milestone access is disclosed separately; confirmed-empty data adds no
markers or empty disclosure.

All areas and lines share a one-second reveal on first display and each mode,
employee selection or Ormitter inclusion switch. Scope changes, resizing and
unchanged rerenders do not replay it; reduced-motion preference displays the final chart immediately.

Project actuals are grouped by exact employee ID, otherwise resource ID, with an
explicit **Employé non identifié** bucket when neither is available. Zero net
contributors are omitted. Their signed amounts use at most two decimal places
and sum to the displayed actual total. Reconciled positive contributions stack
within the actual bar in proportion to their hours, retaining the outer bar's
cap and stable identity colors across year/inclusion changes.
Scoped project and lifetime convention segments are ordered by descending
actual hours. Each uses its own period's values,
with existing localized name/ID tie order; legends remain alphabetical.
Photos or initials and names sit in bubbles inside sufficiently wide segments, with avatar-only
bubbles on narrower segments; a keyed contributor list
always exposes all amounts. Optional profiles are joined by exact IDs, with no
remote photo requests. Any negative contribution uses a neutral net bar plus
the signed list and an explanation, rather than positive areas for credits.
An inconsistent supplied breakdown also avoids stacking and is disclosed.

Only the scoped **Heures du projet** actual comparison allows several employee
legend buttons to exclude/reinclude their actual hours. Excluded names are
struck through and `aria-pressed` reports inclusion. Counted positive employee
segments keep their colors/gradients; their excluded sum follows as a grey
hatched **Heures ignorées** remainder. Counted plus ignored reconciles to the
original actual total, so the bar's outer width/cap stays unchanged. The planned
bar and today marker retain the complete project reference. With negative or
unreconciled contributions, the signed list/counts disclose exclusions without
inventing positive hatched areas. These per-project choices are independent of
Ormitter inclusion, personal/lifetime comparisons and monthly employee filters.
When exclusions are active, the comparison badge explicitly identifies the full
actual total, including ignored hours, as its unchanged comparison reference.

Visible bar fills animate together from the left over one second on render,
without changing their final hour-based widths or the date tick. A reduced-motion
preference displays the final bars immediately.

## Project budget cost bases

The purchase Sankey has a separate supplier-purchase basis below the first
budget-consumption comparison: posted supplier invoices and credit notes,
represented by each exact project analytic allocation from known project start
through Brussels today. It keeps direct convention-rubric and internal-category
identities; labels or account-code prefixes never invent a mapping. Right-hand
entries with identical full description/document-fallback names merge with
summed signed amounts within their currency/purchase-or-correction diagram.
Complete `NF/FK MM-YYYY: INITIALS` names also merge across months by exact
initials, tolerating optional source asterisks. Multiple months display the
chronological range `NF/FK MM-YYYY --> MM-YYYY: INITIALS`; a single month keeps
its source label. The range follows label months rather than accounting dates.
Original invoice allocations remain separate in the detail table and preserve
their category/code connections. Employee Hours, unbilled orders and other document types do not
enter this graph, independently of the personnel and annual supplier controls.

Within each currency, positive invoice amounts form the purchase diagram;
negative invoice corrections and credit notes form a separate dashed correction
diagram. Both diagrams share the same amount-to-thickness scale, with a small
minimum visible width for tiny allocations. Gross purchases, signed corrections
and net costs reconcile. Missing amounts remain in the full detail table and
make the affected totals unavailable. Unverified currency identities are kept
separate; missing category/code mappings remain explicit. Source status and
translated issue notices describe incomplete coverage without inventing zeros.

Inline and fullscreen diagrams always use a single right-hand purchase column,
including dense lists. Its 1300-unit SVG width, direct code-to-purchase curves,
name/amount width, financial groups and exact connections remain identical on
expansion. Fullscreen proportionally fits the existing SVG without regrouping
or moving its nodes, gradients or controls. Closing clears fitted dimensions;
currency/correction diagrams retain their shared physical scale.

The right column automatically tightens its spacing, then its typography,
toward twice the left category column's connector/text extent. Font size stays
between 8 and 10 SVG units (6–7.5pt before proportional fitting), with line height
12.8–16 and connector gaps 2–18. Individual gaps also reserve one unit between
label frames. The target excludes canvas padding, headings and the middle
column. Dense lists may exceed it once minimum sizes are reached; every
purchase and its full inline amount remain available without changing the
financial ribbon scale.

The finance response preserves a full lifetime consumption basis and a separate
`lifetime.expensesOnly` basis. Both use signed recorded costs through Brussels
today, exact project/analytic-account identity and the monetary amount's verified
currency relation. The expense-only basis includes posted expense entries and
excludes only verified employee Hours costs classified as personnel. An invoice
does not become personnel cost because it also carries an employee or hour unit;
Ormit and other subcontractor invoices remain expenses. This monetary choice
does not change the project's employee-hour graphs or estimate monetary rates.

Each budget line's `isBwPersonnel` marker uses its normalized source category
label, including an optional display code. Exact recognized personnel labels
produce true, readable other labels false, and missing labels null. Account
codes, employee names and broad occurrences of the word personnel do not prove
BW personnel identity; external-staff categories are not inferred to be BW costs.

**Afficher les coûts de personnel BW** starts unchecked in **Budget · 01 /
Convention**. The default consumption total and horizontal actual bars use the
expense-only basis. The compared **Budget conventionnel** also excludes signed
confirmed personnel allocations from the selected convention; the ratio and
calculated balance use this matching reference. Exact unique line identities,
known classifications and amounts, and compatible confirmed currency are
required, and the summed line allocations must match the selected budget total.
When no convention is available, the macro-only reference deducts its
known monetary personnel budget from its known convention total. Unverifiable
filtered budgets remain unavailable rather than implying zero personnel.
Confirmed personnel rubric comparisons are hidden; surviving posted expenses
with the same rubric ID remain separate expense detail, without restoring that
personnel budget comparison. Checking the control restores the full budget,
cost basis and personnel rubrics. Original source values and macro cards retain
both the convention and personnel budgets in both states. Missing expense-only
data is unavailable rather than silently displaying full costs.

**Budget · 02 / Budgets annuels** always excludes confirmed BW personnel
categories from compared budgeted, billed and committed totals, thin code bars
and expense details, independently of the checkbox. The annual scope note states
this explicitly. Readable other categories and unknown labels remain; source
parent net/reconciliation evidence stays separate. The existing unchecked Ormit
supplier-cost exclusion still applies independently to all annual periods.
Both choices are remembered per project, leave hours/year/date controls
independent and recalculate from cached data without another request.

The three annual total bars expose their exact displayed amount and currency
through the same tooltip as category bars. Native total buttons support hover,
focus, click/tap pinning, blur and Escape, including zero/unavailable amounts
and cards without category codes. Focus is restored by budget and measure on
rerender; category arrow navigation and invoice-dialog actions stay separate.

## Unité DiCo catalogue and calendar

The **Unité DiCo** tab uses the project's responsible department, exactly
`hr.department` ID `206`, **RESEARCH & DEVELOPMENT / DIGITAL CONSTRUCTION UNIT**.
The fixed technical relation is `project.project.lead_unit_id`, validated as
many-to-one `hr.department`; labels and alternative unit fields do not select
the source.
It includes accessible archived and zero-hour projects independently of the
connected person's employee hours or planning. Normalized exact **Interne** and
**Overhead** names, including a displayed numeric project-code prefix, are
excluded; unrelated names containing those words remain projects.

`UnitDico.normalizeProjects` validates positive exact project IDs, deduplicates
them and retains source-name catalogue ordering. The DiCo and programme project
card grids sort a separate copy by the short title displayed on each card,
using the current FR/NL locale, natural numbers and case/accent-insensitive
comparison, then exact ID for ties. Numeric source prefixes do not determine
card order. Timeline chronology and similarity inputs retain their ordering. Photos
remain optional validated raster data URLs with initials fallbacks. Project-ID
colors stay stable across ordering and selection and identify Unit avatar
borders and duration bars.

Personal, Unit and programme-associated project grids use the shared outline
card presentation. White fronts show the manager portrait and a bold short
project title with black type and a turquoise `#00bfb6` underline. The short title
is the first nonnumeric bracketed acronym from `project.name`, without brackets;
otherwise the remaining title is used. A source numeric code of at least five
digits comes from a bracketed or leading token. A missing code stays empty;
the Odoo record ID is never substituted.

Hover or keyboard focus fades the front and reveals a mini manager portrait
beside the unbracketed code, the full remaining title and visible **Début** /
**Fin** dates. A decorative turquoise SVG outline traces around the card in
650ms; project cards do not rotate or contain moving color orbs. Long full
titles have a three-line clamp, or two lines in compact Unit cards. Dates use
strict date-only validation, and unavailable text can wrap in either language.
Source case and the complete name remain in the native tooltip and radio label.
Both portraits reuse existing bounded raster-photo metadata and image-error
initials, without another read. The manager's full name remains available in
the mini portrait's title and accessible description; missing manager metadata
uses the localized unavailable fallback.

The outer native tooltip and single accessible description retain strict source
dates and the complete convention macro budget (`total_budget_convention`),
including personnel. Budget is not a visible project-detail row. Scoped years
and the budget-panel personnel choice do not alter this scalar. Unknown dates
or amounts remain explicitly unavailable; known amounts with unknown currency
disclose it. Desktop Unit cards are 112px high; personal cards use 190px, or 180px
at phone viewport width. Touch/no-hover project cards instead show the front
and details together without animation, with a minimum height of 190px. Reduced
motion makes hover/focus transitions immediate. Bounded faces and ellipsis keep
sibling sizes consistent. Visual faces and the SVG are decorative; the native
radio retains its full project name, selection and single metadata description.
The small top-right project-radio circles are visually clipped while the real
native inputs retain label selection, keyboard focus and accessible state.
This applies to project cards in personal, Unit and programme-associated grids
and to the three larger programme selectors.

`UnitDico.buildTimeline` uses date-only `startDate` / `endDate` endpoints and
inclusive calendar-day geometry. A valid end date in year 2999 excludes that
project from calendar rows and both axis bounds, but preserves its radio choice.
An entirely excluded catalogue displays an explicit empty-calendar message.
Its axis runs from the earliest readable start
to the latest readable end across projects with non-reversed dates, including
individually readable endpoints of incomplete periods. A fully dated project
gets one colored bar; same-day projects occupy one day. Missing, invalid or
reversed periods remain in the selector and calendar list with an explicit
notice and no invented duration. If the endpoints cannot define a coherent
axis, the scale stays unavailable. Ongoing/unknown-end rows precede completed
rows; within each group, start date sorts first with unknown starts last, then
localized name order and exact ID. Compact 25px rows show only
`ProjectCard.nameParts(...).shortName`, using the existing acronym/prefix fallback;
full source names and dates remain in button tooltips and accessible labels.

Every shared calendar offers **Vue complète** (default) and **Vue +/-3 ans**.
The latter fixes the inclusive visible axis to Brussels today minus/plus three
calendar years, clamping leap-day anniversaries to February 28. Complete bars
are clipped to that window; wholly outside calendar rows are omitted with a
count note, while every project card and unknown/reversed-date row remains.
Original project dates and source membership are unchanged. The page remembers
one calendar-view choice across personal, Unit and programme overviews,
independently of year/custom-date scope.

The current Europe/Brussels calendar day determines completion and the dotted
black today reference. A valid, non-reversed end strictly before today greys
the bar and row dot; a project ending today retains its stable project color.
Completion does not recolor the selector cards. The today position uses the same
inclusive day denominator as bar starts and is omitted outside the original
axis bounds, with an explicit caption instead of extending the project scale.
Each untransformed duration button is observed independently; its decorative
inner fill animates from left to right for 0.5 seconds on first intersection
within that render. Reduced motion or unavailable observers show full bars.
Each fill uses a pronounced left-to-right linear gradient: a 50% white overlay
at its start, the source color at the midpoint and a 30% black overlay at its end.
This shared style also applies to completed bars over their grey base.

Unit and selected-programme overviews add **Projets simultanés** below the
calendar. `UnitDico.buildConcurrency` measures the **maximum actually simultaneous
projects within each calendar month**, rather than counting every project that
touches that month. Start dates add one and the day after an inclusive end removes
one; grouped same-day changes prevent artificial intermediate peaks. Only complete,
valid project intervals contribute, using the calendar's existing catalogue,
Interne/Overhead and year-2999 exclusions, bounds, ticks and today reference.
Missing/reversed periods disclose partial coverage. Individually readable endpoints
can extend the full-view scale, but never create a counted project interval.
Zero-gap months remain present; future months use the selected calendar view,
independently of personal scope. Near-view month maxima use only each visible
month fragment and include projects already active at the left edge. If all
known complete projects are outside that window, the visible count is known
zero with a finite zero-baseline scale; wholly unknown periods cannot prove
zero. With no complete interval or coherent scale, the count remains unavailable.
More than 2,400
calendar months is explicitly unavailable, without substituting a coarser grain.

The monthly step area and line use a zero baseline and integer count ticks,
exposing exact values through hover/focus/tap month controls and an expandable
table. Left/right arrows and
Home/End move through months; Escape dismisses the tooltip. Matching gutters and
linked horizontal scrolling keep the area chart aligned with the lifetime calendar.
The line and both gradient stops use the selected line/area palette's first
hue, with the existing 0.55 and 0.08 stop opacities. A palette change updates
those attributes without replacing month controls, pinned details, the open
values table or the calendar; cleanup retires its subscription.

The personal **Projets** overview reuses this calendar below its radio grid.
Its membership follows the same nonzero planned/actual year/custom-date scope
as those choices; full mode retains complete project dates and near mode clips
only the displayed calendar.
Optional exact-ID catalogue metadata supplies those endpoints. Missing dates
preserve the project and hours, with the same explicit no-duration notice.
Name/bar selection enters the existing Hours/Budget view, and leaving the
overview releases its observer. Unit DiCo membership remains scope-independent.

The calendar view uses full project lives or its explicit rolling window,
independently of year chips or the custom personal date range. The time axis adapts its month/year tick interval
to the span, and dense/mobile timelines scroll inside their container with
sticky names. Radio tiles, row names and duration bars open the existing
project detail; project selection is separate from personal grid membership.

## Programme selector

The separate **Programmes** dashboard tab has three fixed identities, independent
of accessible projects, personal year/custom-date scope and legacy steering
configuration:

| Programme | Subtitle | Canonical / French catchphrase | Responsible person |
| --- | --- | --- | --- |
| DC1 | Backbone | To Structure / Structurer | Pauline Dewez |
| DC2 | Insight | To Act / Agir | Timothée Lonfils |
| DC3 | Manufacturing | To Make / Fabriquer | François Denis |

Its larger radio cards use the same white faces, turquoise title underline and
650ms traced SVG outline reveal as project cards, with programme-specific
detail content. French
catchphrases appear in the badge, tooltip and accessible description while
canonical definitions, names and DC identities stay intact. Fronts show
only the responsible portrait/initials and DC code; backs show the catchphrase
badge beside a mini portrait, then code, a bold one-line subtitle and responsible
name. They contain no invented project dates or budget metadata. Cards have
a fixed 230px height in three columns, or 210px in one column up to 700px wide,
with front and details together inside that same height on touch/no-hover
devices. Touch portraits are 40px, versus 64px desktop. Native radios remain
accessible but visually clipped, with selected/focus outlines. Reduced motion
removes reveal transitions.

Fixed names/text stay available while optional portraits load or fail.
User-record visibility, missing metadata and ambiguous exact-name matches can
leave initials; the programme itself remains selectable. Selection remembers
the canonical DC identity in page memory and loads its separate project
catalogue. The three programme cards remain visible above either the selected
programme's compact project choices/calendar/concurrency or its Hours/Budget
project detail. Back restores the programme overview below those same cards.

Programme membership is the dashboard's fixed user-supplied business-code list
in [programme-service.js](../../programme-service.js): 10 DC1, 8 DC2 and 5 DC3
references. It is independent of department 206, employee involvement, dates
and inferred Odoo programme fields. Exact accessible source matches determine
displayed projects; absent or ambiguous references are disclosed without
invented rows. The count badge compares displayed matches with the expected
reference count. The confirmed **in-beTwin** business code is `56261849`.
Programme project lives use the same compact cards, full/near calendar scale,
completed-last grey gradients, today marker, half-second reveals and monthly
maximum overlap as Unit DiCo. Interne/Overhead and chart-only year-2999
exclusions remain shared. Programme changes replace every lower section and
clear the programme project selection; cached data may be reused. A project
choice/name/bar opens the shared Hours/Budget detail; Back restores the
programme project radio. These choices and catalogues remain separate from
personal/Unit selections and the older configured steering portfolio.

## DiCo steering

The DiCo steering views introduce cumulative project-authoritative actuals, convention envelopes, programme assignments and reconciled financial/people/WP diagnostics. Projets, Unité DiCo and the fixed Programmes selector are available without steering configuration. The older portfolio retains its unit and leader/contributor views and programme-assignment calculations. See [steering measures](PILOTAGE.md#measures-and-controls).

## Refresh

- Last refreshed: 2026-10-23
- Tag source basis: project-tags.js, project-description.js, project-tag-scan.js,
  project-tag-view.js, project-similarity.js/css, programme-service.js and
  data/project-tags.json, including the separately
  validated Buildwise enrichment metadata.
- Purchase source basis: project-purchase-service.js, project-purchase-flow.js/css,
  project-finance-service.js, project-budget.js, project-browser.js,
  tests/project-purchase-flow.test.js and finance/budget/project integration tests.
- Additional source basis: i18n.js, i18n-*-messages.js, language-client.js,
  language-preferences.js, chart-palette.js and the palette/settings,
  calendar/exclusion/zero-value renderer tests.
- Source basis: personal-time.js, personal-time.css, tests/personal-recommendations.test.js, tests/personal-personnel-budget.test.js, project-planning-service.js, project-planning.js, tests/project-planning.test.js, project-card.js/css, programme-browser.js/css, programme-service.js, unit-dico-service.js, unit-dico.js/css, project-monthly.js, project-browser.js/css, project-budget.js, project-finance-service.js, index.html personal/lifetime/planning/programme scope/rendering and chart controls, steering-client.js navigation and server.js identity/contributor/assignment/convention/date/programme metadata/month allocation.
- Limitations: business meanings and completeness of supplied exports were not validated.

## Hours and project detail behavior retained from main

Date-level actual/foreseen comparisons use selected years and the Brussels day boundary; planning allocation uses Odoo UTC month boundaries. Signed actual credits are retained. The primary Mon temps view includes the signed-in person's hours regardless of employee function and hides the Me/Whole Project and legacy Ormitter switches. Legacy imports and unit loaders retain consultant classification and their Me/Whole Project controls; a connected-unit portfolio uses Whole Project scope, with Me disabled to avoid treating every contributor as the signed-in person. Project budget, task/WP and milestone evidence is shared project data.
