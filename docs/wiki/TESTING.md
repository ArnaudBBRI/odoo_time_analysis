# Testing

## Latest verification (2026-10-26 dynamic financing-organism grouping)

The full offline suite passes **1229/1229** with
`node --test --test-concurrency=4 --test-reporter=spec` in **46.12 seconds**.
Renderer/animation/physics/Unit/i18n tests pass **67/67** and service/HTTP tests
pass **50/50**. All **10** changed JavaScript files pass `node --check`, and
`git diff --check` passes. Independent review finds no blocker.

Fixtures verify hidden Partenaires and suspended partner reads, retired-mode
focus fallback, exact current `organism_id` and bounded body-name reads,
changed financing bodies/names/new projects on refresh, known empty versus
unavailable metadata, record scope, native controls, immutable tag evidence,
exact saved layouts, cached FR/NL focus and reduced motion. Offline headless
Edge with fictional 12-project/five-body data verifies French desktop1440px
and Dutch390px layouts, native keyboard changes, bubble/cloud colours, counts,
missing-body bubbles without clouds, exact thematic roundtrips and cached
language state. Long source labels wrap without page overflow; mobile chart
scrolling remains contained. No console warnings/errors or network requests;
screenshots were inspected and browser resources closed. Subsequent guarded
live verification on 2026-10-26 confirms available financing bodies for all
**50/50** accessible unit projects, across seven exact body IDs. Two distinct
Bureau de Normalisation IDs share a name and retain separate groups. Focused
visibility/service checks pass **69/69**. The previously stale local server was
restarted as standard-user PID **31728** on loopback **8765**: welcome **200**,
anonymous unit API **401**, empty stderr. No Odoo write or Docker check was
performed. No separate build, lint or typecheck command exists.

## Latest verification (2026-10-26 partner proximity grouping)

The full offline suite passes **1220/1220** with
`node --test --test-concurrency=4 --test-reporter=spec`. The affected
similarity/Unit/service/HTTP/i18n/authentication/read-only/controller set passes
**301/301**. All **10** changed JavaScript files pass `node --check`, and
`git diff --check` passes. No separate build, lint or typecheck command exists.

New fixtures cover removal of the Programme Other polygon while retaining its
bubble colour, legend and weak force group; exact `bw_partner_ids` metadata;
bounded exact partner-name reads; overlapping partner memberships and segmented
fills; multi-row layouts for more than three groups; absent/foreign/unsolicited,
denied, incomplete, duplicate and contradictory evidence; caller override and
session visibility isolation; FR/NL labels/focus retention; reduced motion; and
unchanged Odoo mutation guards. HTTP tests use fictional isolated localhost RPC
sources. No live Odoo, browser or Docker verification was performed.

## Latest verification (2026-10-26 fullscreen Sankey navigation and presentation)

`node --test --test-reporter=spec tests/project-purchase-flow.test.js
tests/project-budget.test.js tests/i18n.test.js tests/dashboard-language.test.js`
passes **137/137** in **0.23 seconds**, including **58/58** Sankey cases and
six new regressions. They cover fullscreen-only wheel handling, repeated
pointer anchoring, wheel-unit normalization, zoom bounds, right-button capture,
pan cancellation/window blur, release-outside context-menu suppression,
independent diagrams, unchanged geometry/data,
tooltips, French/Dutch catalogue coverage, hidden metadata/control exclusion
from the keyboard loop, inline instruction/detail restoration and
resize/close/hide/rerender cleanup. Independent code review finds no blocker;
both changed JavaScript files pass syntax checks and whitespace checks pass.
Offline headless Microsoft Edge checks with fictional 40/90-purchase, credit
and multi-currency fixtures verify genuine wheel anchoring, clipping, captured
right-drags outside the plot and their delayed context-menu suppression, ordinary
outside right-clicks, keyboard tooltips and focus scrolling, independent diagrams,
FR/NL labels and resize/close/reopen resets. Desktop and 390px checks confirm
only the diagrams and exit button are visible, the first plot starts about 50px
from the top, hidden controls are excluded from Tab/Shift+Tab, and inline content
and open details restore after exit. No browser warnings/errors;
screenshot saved and browser resources released. Bundled Chromium was absent;
installed Edge ran as a standard user outside the Windows sandbox.
No separate build, lint or typecheck command exists. Full suite, live Odoo and
Docker checks were not run for this frontend-only change.

## Latest verification (2026-10-23 publication of accumulated app features)

The full offline `node --test --test-concurrency=4 --test-reporter=spec` suite
passes **1204/1204** in **32.52 seconds**, without failures, cancellations or
skips. All **63** changed JavaScript files pass `node --check`. The staged app
patch passes whitespace checks after removing one extra EOF blank line in a
test; independent scope/packaging reviews find no blocker. Private configuration
and raw local reports remain outside the commit set. No separate build, lint
or typecheck command exists; no live Odoo or Docker verification was performed.
Prior per-feature browser evidence below remains the visual verification basis.

## Latest verification (2026-10-23 adaptive Sankey purchase density)

All **112/112** focused Sankey/Budget cases pass in **0.22 seconds**, including
**52/52** Sankey cases and six new regressions. These verify unchanged sparse
maxima, spacing before font reduction, the actual 2:1 connector/text target,
minimum-size overflow, collision-free label frames, conserved ribbon widths,
rendered purchase/credit styles and single-column fullscreen lifecycle.
Independent review and syntax/whitespace checks pass.

Fictional browser checks confirm 8 purchases retain 10px/16px typography;
40 purchases use 9.390625px text and a 640-unit right extent against 320 left;
90 purchases stop at 8px/12.8px with all 90 detail rows and separated labels.
The dense SVG height is 1376 units. FR/NL text, exact 10 EUR keyboard isolation,
identical fullscreen paths/viewBox, resizing from 1600x1100 to 1280x900,
proportional fitting and Escape restoration pass without console warnings or
errors. Screenshot saved; viewport, temporary tab and preview server released.
No full-suite repeat was needed for this isolated layout change. No separate
build/lint/typecheck command exists. No Odoo or main-server change.

## Latest verification (2026-10-23 restore one Sankey purchase column)

All **106/106** focused Sankey/Budget cases pass in **0.20 seconds**, including
**46/46** Sankey cases. The original 43 cases remain; three dense single-column
regressions replace ten experimental split/routing cases. Checks cover unchanged
normal/fullscreen viewBoxes and DOM geometry, exact grouped values, native
hover/focus, shared currency/correction scale and FR/NL resize/refresh/close cleanup.
Fictional browser verification with 90 purchases and five credits confirms one
purchase stack at x=990 per SVG, three column headings, identical paths on
expansion, all 95 detail rows, isolated 12 EUR detail, fitting at 1280px and after
resize to 2560x1440, and Escape restoration without errors/overflow. Screenshot
saved; viewport and preview resources released. Independent review, syntax,
documentation links and whitespace pass. Full suite not repeated for this
renderer-only reversion; the earlier 1205-case result is historical. No separate
build/lint/typecheck command exists. No Odoo or main-server change.

## Latest verification (2026-10-23 named Ormitter exception)

All **1205/1205** full offline tests pass in **46.02 seconds**; the focused
classification/hours/personnel set passes **78/78**. Six new regression cases
cover retained names after HR deletion or denial, resource-only planning,
conflicting functions with preserved evidence, exact normalized full-name
matching and near misses, signed inclusive/exclusive totals, honest unknown
warnings, strict personnel totals and backend-only colleague privacy. Existing
malformed/duplicate source validation and read-only RPC protections pass.
Independent review, syntax, documentation links and whitespace pass.
The app was restarted as a standard user in terminal session **37191** on
loopback **8765**: login **200** matches workspace bytes, a protected asset
redirects **303** to login and an anonymous API is **401**. No live Odoo call,
configuration change or dependency installation occurred. No separate build,
lint or typecheck command exists. Actual missing/deleted Odoo identities were
not read; the exception requires an available retained or resolved full name.

## Latest verification (2026-10-23 alphabetical project cards)

All **175/175** focused Unit/similarity/sticky-scope/dashboard-language tests
pass in **0.47 seconds** after sorting DiCo/programme card copies by their
displayed short titles. Existing timeline, selection and map behavior remains
covered. Independent FR/NL unit/programme fixtures confirm natural-number and
case/accent ordering, ID ties, native selection/focus, immutable source data
and unchanged calendar chronology. Syntax and whitespace pass; full suite not repeated for this display
ordering change. No separate build/lint/typecheck command exists.

## Latest verification (2026-10-23 programme outline cards)

All **182/182** focused card/programme/project-browser/Unit/language tests pass
in **0.56 seconds**. Existing programme/card cases now verify shared decorative
outline semantics while preserving bespoke content, native selection/focus,
safe photos/initials, translations and loading/error/retry behavior. Independent
review finds no project-content or responsive cascade regression.
Fictional browser checks compare 230px programme cards with 190px project cards,
verify keyboard selection/reveal and complete detail bounds, and retain 210px
single-column cards at Dutch 390px width without overflow/errors. Screenshot
saved; viewport and preview resources released. Syntax/CSS balance, relative
documentation links and whitespace pass. Physical touch hardware was not used.
Full suite not repeated; no separate build/lint/typecheck command exists.
No Odoo, main-server, configuration or dependency change.

## Latest verification (2026-10-23 Settings overlap)

All **108/108** focused settings/sticky-scope tests pass in **0.49 seconds**.
A fictional browser fixture with the actual sticky navigation/year bar verifies
that Settings wins hit-testing in their overlapping region, the last palette
can be selected, and Escape closes and restores summary focus. No errors or
horizontal overflow. Screenshot saved; preview resources released. Independent
review, inline-script syntax, CSS balance, documentation links and whitespace
pass. Full suite not repeated for this CSS-only fix; no separate build/lint/
typecheck command exists. No Odoo or main-server change.

## Latest verification (2026-10-23 Vibrant Emotions palette)

All **170/170** focused palette/settings/language/project-renderer/Unit tests
pass in **0.70 seconds**, including **15/15** palette/settings cases extended
for the third choice. These verify the exact ten colours, cycling, immutable
arrays, stored enum restoration, matching previews, native selection/focus,
FR/NL names, blocked storage and immediate chart/legend repainting.
Fictional browser checks verify selection, twenty-person colour repetition,
unchanged path geometry, persistence after reload, Dutch restoration and no
overflow or console errors. Screenshot saved; preview tab/server released.
Independent review, JavaScript/inline-script syntax, documentation links and
whitespace pass. Full suite not repeated for this palette-only addition; no
separate build/lint/typecheck command exists. No Odoo or main-server change.

## Latest verification (2026-10-23 Sankey gap routing)

All **113/113** focused Sankey/Budget tests pass in **0.21 seconds**, including
**53/53** Sankey cases and four new routing regressions. Stroke envelopes clear
near-bank bars and complete 16px labels, internal gaps fill before overflow,
oversized ribbons retain a safe lower route, and mixed-code merged purchases
keep their flows and amounts. Existing inline geometry, gradients, hover,
focus, FR/NL lifecycle and common currency/correction scale checks pass.

Fictional FR/NL browser checks at 1280px and live resize to 2560x1440 retain
two purchase columns, one credit column, all 95 detail rows, exact isolated-flow
tooltips and Escape restoration. In the 90-purchase sample, 32 of 45 far ribbons
pass between near-column labels; height falls from 1264.96 to 1161.60 at the
same 1820px width. No horizontal overflow or console errors. Screenshot saved;
temporary viewport and preview resources released. Independent review, syntax,
documentation links and whitespace pass. The full suite was not repeated for
this renderer-only refinement; its prior 1195-case result is historical.
No separate build/lint/typecheck command exists. No Odoo or main-server change.

## Latest verification (2026-10-23 toolbar chart palettes)

All **1195/1195** final full offline tests pass in **32.90 seconds**. Focused
palette/settings/project-renderer/Unit sets pass **5/10/84/67** cases. Twenty new
cases cover exact fifteen/twenty-colour cycling, browser-only enum persistence,
no initialization writes, blocked storage and disposed subscriptions; native
FR/NL settings, previews, keyboard/outside dismissal and legacy line-only
repaints; and direct SVG area/line/legend/avatar/tooltip updates with retained
DOM, focus, pinned details, open tables, geometry, source data and reveal state.
Unit/programme gradient updates and lifecycle cleanup also retain calendar
colours. Existing semantic references, black milestones and other chart
families remain verified. Older controller fixtures without a browser global
are supported by guarded palette initialization. Authentication tests verify
the new module redirects anonymously and is served for a mocked session.

Fictional browser checks confirm default Dico's fifteen colours, immediate
Classic switching with identical path/viewBox geometry, persistence after
reload and return to Dico. The menu remains open on selection; Escape closes
and restores summary focus. FR 2560px wide charts and NL 390px settings fit
without horizontal overflow or console errors. Screenshots saved; temporary
viewport reset and preview tab/server released. Independent review, syntax,
CSS balance, relative links and whitespace pass. The standard-user app restart
is verified on loopback 8765 (PID 36916): workspace-matching login 200, palette
asset 303 to login, anonymous unit API 401. No live Odoo call, private config
change or dependency installation occurred. No separate build/lint/typecheck
command exists.

## Latest verification (2026-10-23 expanded Sankey purchase columns)

All **109/109** focused Sankey/Budget tests pass in **0.25 seconds**, including
**49/49** Sankey cases and six new regressions. They cover the strict 2:1
grouped node/gap threshold; contiguous groups, tiny/dominant amounts, an
unhelpful tall-middle fallback, conserved allocations and disjoint routing
lanes. Existing paths, nodes, text frames and gradients retain identity through
expansion/restore, with updated endpoints, labels and unchanged raw details.
Far-ribbon hover isolation, exact focus keys, FR/NL, resize/cleanup and common
physical scaling across mixed-width currency/correction diagrams pass.

Fictional browser checks confirm two purchase columns and one unchanged credit
column at 1280px, resizing the expanded dialog to 2560x1440 without overflow or
console errors. The 90-purchase SVG changes from **1300x2050.29** to
**1820x1264.96**, about **38% shorter**, retaining 97 nodes, 102 ribbons and all
95 raw purchase/credit detail rows. Far-ribbon keyboard isolation works and
Escape restores the exact original viewBox; Dutch re-expansion also passes.
Screenshot saved, temporary viewport reset and preview tab/server released.
Independent review, syntax, relative documentation links and whitespace pass.
The full suite was not repeated; no separate build/lint/typecheck command
exists. Odoo, private configuration and the main server were untouched.

## Latest verification (2026-10-23 annual total amount tooltips)

All **60/60** budget renderer tests pass in **0.24 seconds**, including four new
regression cases. They cover exact decimal totals/currency for all three
measures, hover/leave, focus/blur, click pin/unpin and Escape; no category dialog
is opened by a total. Zero, signed, unavailable and no-category totals, separate
annual tooltip IDs, updated amounts after keyed focus restoration, personnel/
Ormit filtering, FR/NL formatting and immutable source data are verified.
Existing category navigation and bill-dialog tests remain passing.

Fictional FR/NL desktop browser checks show the exact consumed/committed decimal
amounts and currency, working Escape and native Enter access to a zero total
without category codes, with no errors or horizontal overflow. Screenshot saved;
temporary preview tab/server released. Independent review, JavaScript syntax,
CSS brace balance, relative documentation links and whitespace checks pass.
The full suite was not repeated for this renderer-only fix. No separate build,
lint or typecheck command exists; Odoo, configuration and the main server were
untouched.

## Latest verification (2026-10-22 twenty-colour repeating palette)

All **81/81** renderer tests pass in **0.56 seconds**. The revised palette case
checks the exact supplied twenty-colour order and **61** identities, including
wraparound at identities 21, 41 and 61, matching actual/planned areas, legends
and avatar borders, stable cached colours after filtering/reordering/restoring,
and unchanged horizontal-bar colours. Existing selection/reference/tooltip,
cumulative-mode and FR/NL colour checks pass. No new test file was needed.

A fictional FR 2560px browser preview confirms all twenty supplied colours,
unchanged 30-degree milestone labels and no JavaScript errors. Screenshot saved;
the temporary preview tab and verified task-owned server were closed. Syntax,
relative Markdown links and whitespace checks pass. The previous **1165/1165**
full-suite run below remains the broader baseline; it was not repeated for this
palette-only change. No separate build/lint/typecheck command exists, and the
main server, Odoo and private configuration were untouched.

## Latest verification (2026-10-22 area-chart palette and flatter milestones)

All **1165/1165** full offline tests pass in **34.69 seconds**. The affected
renderer/milestone set passes **91/91** (81 renderer and 10 milestone cases).
Palette checks cover all thirteen specified colours, distinct overflow colours
after thirteen employees, matching areas/legends/avatars/selected actual and
planned-reference lines/tooltips, exact-identity stability across both charts,
filters, cumulative mode and FR/NL, and unchanged horizontal-bar colours.

Milestone tests independently rotate text corners at **30°** and assert separate
bounded labels, full source names, exact-date leaders and unchanged input,
series and plot values. Dense same-date Unicode/long-name fixtures exercise
actual/planned and monthly/cumulative modes across narrow and wide plots. An
independent **108-case / 2664-label** audit finds no overlap or clipping, with
10px gutters and at least 6px separation; ordinary narrow labels remain compact.

Fictional browser checks confirm thirteen colours and 30° titles in FR 2560px,
NL 1600px and NL 390px. Twelve crowded milestones at a 1600px viewport remain
inside both plots, with leaders and complete details. Employee selection,
selected lines, monthly tooltips and Escape remain usable. Browser error lists
are empty and the phone page has no horizontal overflow. Screenshots saved and
temporary preview tab/server released. Inline/module syntax, relative Markdown
links and whitespace checks pass. No separate build/lint/typecheck command
exists; Odoo, private configuration and the main server were untouched.

## Latest verification (2026-10-22 compact Project Hours and paired area charts)

All **1162/1162** full offline tests pass in 33.85 seconds; controller/scope/
language cases pass **118/118** (16 switch cases), and renderer cases **79/79**.
The new switch regression covers visibility and enabled native changes across
unsupported views, neutral FR/NL status, retained focus/preference/cache and
unchanged active-layout flags without render or network side effects. Renderer
checks retain exact actual/planned section identities in one monthly group,
including the single-chart case and existing controls/lifecycles.

Fictional browser checks measure all four primary cards at **91.19px**, against
**182.39px** in the normal fallback, with TH and date notes intact in FR and NL.
At 2560px the monthly panels are **1193/1193px**; at 1600px **714.61/714.61px**;
at 3440px **1633/1633px**. Each pair starts on one row across the full content
width, independently of the 528.75px overview/bar grid above, with a 28px gap
and compact 220px right legends. Normal mode stacks the charts vertically.
Repeated same-DOM 3440→1280→3440 resizing retains the open exact-value table,
returns the card heights/layout correctly and reports no browser errors or
horizontal overflow. Budget and project-list switches remain visible; native
click/Space changes retain the choice and show the neutral localized hint.
Screenshots saved and temporary previews released. Syntax, CSS balance, 100
relative Markdown links, source review and whitespace checks pass. No separate
build/lint/typecheck command exists; no Odoo/main-server/configuration change.

## Latest verification (2026-10-22 selected Project Hours wide layout)

The final full offline suite passes **1161/1161** in 35.77 seconds. The affected
controller/scope/language set passes **117/117** (15 switch cases); the renderer
set passes **79/79**. Added cases protect exact Hours/view flags, shared choice,
project-specific FR/NL status, real selection/panel/Back/scope invalidation,
mounted-only resize handling, retained DOM/focus/disclosures/cache evidence,
wrapper/legend interactions and normal versus opt-in wide geometry bounds.

Browser resizing exposed synchronous ResizeObserver drawing changing the observed
chart height. The verified repair coalesces notifications into one animation
frame, uses the latest width/current cap and cancels pending work on cleanup.
The lifecycle test covers no synchronous writes, frame ID zero, reverted widths,
employee/month focus, an open table, no replay, rerender cancellation and late
retired callbacks. Repeated real 3440→1280→3440 round trips now retain the table
and employee choice without browser errors; SVG viewBox width matches the plot.

Fictional browser checks confirm the normal **423px** macro-card baseline and
**528.75px** overview column (125%), **220px** right legends, monthly plot widths
of about **606/1563/2443px** at 1600/2560/3440px and steady graph/text height.
Normal keeps the 1880px main cap. Dutch 1600px and 390px fit without horizontal
overflow. Budget and the project list hide the switch and return to normal;
Hours restores the choice. Native mouse/Space switching, legend selection,
month tooltips/Escape and open exact-value tables remain usable. Screenshots
saved and temporary previews released. Independent review, inline/module syntax,
CSS balance, 100 relative Markdown links and whitespace pass. No separate
build/lint/typecheck command is defined. Odoo, private configuration and the
main server were untouched.

## Latest verification (2026-10-22 header layout switch and compact pie summary)

All **1152/1152** full offline tests pass in 32.76 seconds, with **57/57** focused
layout/renderer cases passing. Ten switch cases cover actual header placement,
native checkbox/switch semantics, checked-state changes, a single inclusive
1600px boundary, legacy `auto` migration without an initialization write,
blocked storage, localization, view containment and retained DOM/data/focus.
One added renderer case protects stable planned/actual metric identities,
signed visible totals, normal ordering, accessible notes and tooltip ownership.

Fictional browser checks confirm mouse and Space activation, normal 1880px
content cap, French 2560px and Dutch 1600px wide layouts, unchanged track/pie
widths, and actual-above-planned placement inside the chart row. The pie starts
175px higher relative to its column. A 26-project legend does not lower it;
tooltips/Escape, hiding all projects and restoring them remain usable.
An open capacity disclosure and checked Wide preference survive a same-DOM
1600→1280→3440 resize sequence. Dutch 390px falls back without overflow; all
browser error lists are empty. Screenshots saved and previews released.
Independent review, inline/module syntax, CSS balance, 100 relative Markdown
links and whitespace checks pass. No separate build/lint/typecheck command is
defined. Main server, private configuration and Odoo remained untouched.

## Latest verification (2026-10-22 four-column superwide refinement)

All **1150/1150** full offline tests pass in 33.85 seconds, with **55/55** focused
layout/renderer cases passing. The nine layout-controller cases now assert
four-column French/Dutch status messages. Independent review, inline/module
syntax, CSS balance, 100 relative documentation links and whitespace checks pass.

Fictional browser checks measure recommendation/capacity/graph/legend tracks of
approximately **532/380/874/584px** at a 2560px CSS viewport, matching the requested
30%/50% reductions and retained graph width. The pie keeps its existing 540px
maximum. Manual 1600px, automatic 3440px, Dutch 2560px, the unchanged Standard
1880px cap, and Dutch 390px fallback fit without horizontal overflow or errors.
A 26-project legend stays beside the graph without changing its vertical start;
intrinsic first rows prevent a tall spanning legend from displacing the pie.
Chart tooltip positioning, legend hide/show and an open capacity disclosure
through a same-DOM 3440→1280→3440 resize round trip pass. Screenshots were saved
and temporary preview resources released. No main-server restart, configuration
change, Odoo request or data calculation change was involved.

## Latest verification (2026-10-22 opt-in superwide Mon temps)

The final full offline suite passes **1150/1150** in 31.94 seconds; the affected
set passes **210/210**, including nine new layout-controller tests. They cover
the Standard default, exact manual/automatic viewport boundaries, one-time
initialization, enum-only storage and blocked storage, modern/legacy/missing
media APIs, navigation containment, French/Dutch hints and retained live
controls, focus, disclosures, tolerance and cached evidence. The existing
debounced resize path is verified to avoid rebuilding loaded personal content
while retaining its legacy rendering behavior elsewhere.

Fictional browser checks use actual iframe CSS viewports. French Standard at
2560px remains vertical with the main width capped at 1880px; manual wide at
2560px gives three aligned hosts approximately 760/760/874px wide and a 2560px
main container. Automatic mode at 3440px uses three columns and the full main
width. Resizing the same DOM from 3440 to 1280 and back changes effective layout
while keeping the capacity disclosure open. Dutch wide at 2560px is translated;
at 390px it safely falls back to the vertical layout without horizontal overflow.
All browser error lists are empty. Screenshots were saved and preview resources
released; the main server, configuration and Odoo were untouched.

Inline script/two-file JavaScript syntax, CSS balance/cascade, 160 relative
Markdown links and whitespace checks pass. The preference adds no network
request, backend field or data recalculation.

## Latest verification (2026-10-22 NF/FK month-range grouping)

All **43/43** Sankey cases and **1141/1141** full offline tests pass. New cases
cover chronological cross-year ranges, repeated months, exact initials, optional
source asterisks, document fallback, invalid/partial references, currency/credit
isolation and signed zero corrections. Mixed-code gradients, conserved ribbon
thickness, original detail rows, hover totals, immutable inputs and focus when a
range extends remain verified. A literal internal-key-like source name cannot
collide with the typed NF/FK ribbon namespace. Independent review, syntax,
159 relative Markdown links and whitespace checks pass. Fictional French browser
verification shows the range, 6200 EUR sum and both code connections; screenshot
saved and preview resources released. No main-server restart or Odoo access.

## Latest verification (2026-10-22 compact project-hours usage cards)

The final full offline suite passes **1136/1136** in 33.7 seconds, and the final
focused browser/helper/planning/dashboard-language set passes **124/124**.
Syntax checks for six changed/new JavaScript files, relative Markdown links and
whitespace checks pass.
New calculation tests distinguish personal and project-wide raw cohorts,
employee/resource and immutable snapshot precedence, TH exclusion, uncertain
ownership, known zero versus denied sources, signed corrections, post-end
actuals, Brussels 23/25-hour proration and nonfinite arithmetic. Renderer tests
cover exactly three cards after the four primary metrics, independent source
failures and stale deltas, the 0.005h balance tolerance, French/Dutch text and
unchanged macro results when graph scope or contributor filters change.

Isolated fictional browser checks pass in French at 1280px and Dutch at 390px,
with no errors or page overflow. Desktop primary/compact cards measure
182.39/91.19px; compact phone cards measure 74px against the primary 148px
minimum. A longer remaining-planning primary card expands naturally to 172px.
The fixture shows +5 personal, -15 total-planning and +5 convention hours with
the appropriate localized signed statements. Screenshots were saved and the
preview tab/server were released. The main server, private configuration and
Odoo sources were untouched; no new RPC or backend contract was introduced.
See [Current State](../ai-context/CURRENT_STATE.md) for final task checks.

## Latest verification (2026-10-22 animated physical project map)

The final full offline suite passes **1123/1123** with
`node --test --test-concurrency=4` in 33.8 seconds; the final affected set passes
**46/46**. Syntax checks for five changed/new JavaScript files, 156 relative
Markdown links and whitespace checks pass.

The five pure solver tests in
[`tests/project-similarity-physics.test.js`](../../tests/project-similarity-physics.test.js)
pass independently. They cover deterministic independent physical frames,
unchanged graph evidence and inputs, exact final snapshots, genuine force
trajectories, separate cohesive programme targets, weakly grouped Other nodes,
bounds, visible separation, label clearance and empty/hidden-ID handling.

Numerical checks against the actual saved catalogue retain 36 nodes, 266 edges
and thematic community sizes 12/8/7/7/2. Both final layouts have zero pinned
boundary nodes, bubble overlaps, label/label or label/bubble overlaps and clipping.
Named programme mean radii are approximately 66/63/56px, compared with 164px for
Other projects. Five offline pure-layout timing samples per mode remain below
200ms on this workstation. SVG/PNG inspection confirms the distinct layouts and
matching active bubble/cloud colours. Exact cached targets and node DOM identity
survive a mode round trip; link endpoints follow their existing project IDs.

Physical replay timing uses cumulative maximum particle displacement and
smoothstep easing rather than equal time for unequal solver segments. This
gives the final contact-relaxation movement enough time to remain smooth within
the 2.2-second replay. Actual 36-project animation-clock regressions at 60Hz
limit maximum node displacement to 11.08px per frame in themes and 6.97px in
programme mode, including the final quarter of the animation.

Isolated browser checks pass for the French 1280px theme/programme round trip
and Dutch 390px layouts in both modes, with no errors, label collisions or page
overflow. Screenshots were saved and the preview tab/server were closed. The
main server was untouched. No live Odoo request or Docker runtime was needed;
no separate build/lint/typecheck command exists. The independent numerical
checks use the offline DOM fixture. See
[Current State](../ai-context/CURRENT_STATE.md) for the task outcome.

## Latest verification (2026-10-22 programme cloud toggle)

The final full offline suite passes **1109/1109** with
`node --test --test-concurrency=4`. Projection tests cover shared reference
resolution, ambiguity, fixed lists, detached outputs, two-session visibility,
ignored caller overrides, unchanged RPC counts and optional-failure recovery.
Renderer/parent cases retain exact circle/link DOM identities and attributes,
model, layout and active tag/details across cloud toggles and round trips.
Overlap/singleton/Other groups, hidden/unplotted IDs, empty/unavailable mapping,
retired handlers and FR/NL mode/focus restoration are covered. Independent
source/data/geometry review and numerical reconciliation pass: 36 nodes,
266 edges, programme membership 7/7/5 plus17 Other. Existing hulls overlap and
may enclose nonmembers; exact legend membership and caption clarify this.
Desktop French round-trip and Dutch390px isolated IAB checks pass with no page
overflow or label collisions. Screenshots saved and preview resources released.
Syntax, local links and whitespace pass. No live Odoo call or Docker runtime;
no separate build/lint/typecheck command exists. The standard-user backend was
restarted and anonymous route/asset protection rechecked.

## Latest verification (2026-10-22 tag popularity order)

All **27/27** renderer/unit-map tests pass. The ordering regression puts a
popular Z-labelled tag before rarer alphabetic predecessors, checks localized
equal-count ties in French/Dutch, and prevents duplicate tags or hidden-project
rows from inflating popularity. Syntax and whitespace pass. No browser/full-suite
rerun was needed for the ordering change; refresh loads it without a restart.

## Latest verification (2026-10-22 tag explorer)

All **118/118** affected renderer, unit integration, unit, dashboard-language,
i18n and language-client tests pass. New cases cover unique localized used tags,
hidden/unused-definition exclusion, exact multi-project and isolated matches,
tag-specific link emphasis, explicit project opening, Escape/stale exits/cleanup,
removed tags and disclosure/tag/result focus across parent/language rerenders.
CSS retains the contained SVG scroller and stacking with a 345px desktop panel.
Independent review, syntax and whitespace pass. Isolated IAB checks confirm the
French desktop tag explorer and Dutch 390px stacked results, including BIM's
19 matches, zero label collisions, no page overflow and no runtime errors.
Screenshots saved and preview resources released. No full-suite rerun, Odoo call
or main-server restart; no separate build/lint/typecheck command exists.

## Latest verification (2026-10-22 similarity hover reset)

All **91/91** affected renderer, unit-map integration, unit and dashboard-language
tests pass. Pointer leave restores initial node/link opacity without removing
project actions; cached/language rerenders preserve that reset. Regressions
cover direct bubble transitions, stale leave after newer pointer/keyboard
selection, cleanup and renewed keyboard emphasis. Syntax and whitespace pass.
No fresh browser/full-suite run; the full result below predates this change.
No separate build/lint/typecheck command exists. Refresh loads the frontend fix.

## Latest verification (2026-10-22 public-source tag enrichment)

The final full offline suite passes **1091/1091** with
`node --test --test-concurrency=4`. Enrichment validation requires complete
per-tag Buildwise source evidence; partial/duplicate evidence and unrelated
URLs fail. Permanent completion and no-description-read scanner tests still
pass after local enrichment. Session projection tests prove public summaries,
URLs and hashes remain private. The original Odoo-described subset retains its
18-node/62-link semantic baseline; all enriched links independently reconcile
with exact shared tags. The current 36-node/266-link map has finite bounded
positions, separated bubbles, collision-free label boxes, deterministic input
order and noninteractive guides for displaced names. Actual SVG/PNG was visually
inspected; bold glyph widths including text stroke were measured separately.
Independent source/data review reconciled 22 response hashes, 80 tag-evidence
entries and preservation of all original Odoo fields and 18 original tag sets.
Syntax, 154 local documentation links and whitespace pass. No separate
build/lint/typecheck command exists; no fresh browser, Docker or live Odoo test
was needed. See [Current State](../ai-context/CURRENT_STATE.md) and the
[source report](../ai-context/PROJECT_TAG_WEB_ENRICHMENT.md).

## Latest verification (2026-10-22 unit similarity map)

The full suite passes **1083/1083** with `node --test --test-concurrency=4`.
An earlier default-parallel attempt had one isolated fixture startup timeout;
the bounded-concurrency rerun passed. Tests cover optional namespaced tag
projection, two session visibility scopes, unused-definition removal, protected
assets and no-description-read guarantees. Renderer/model and parent tests cover
weighted overlaps, exact filtering, deterministic geometry, local scrolling,
FR/NL project/relation focus, incident-edge emphasis, explicit navigation,
cleanup and Unit-only insertion before the unchanged calendar. Actual catalogue
geometry reconciles to 18 projects, 62 links, four communities and two isolates.
Independent review is clear. See [Current State](../ai-context/CURRENT_STATE.md)
for executed browser/runtime checks. No separate build/lint/typecheck command
exists; no Docker runtime or live Odoo access was needed for this feature.

## Project-tag catalogue checks

On 2026-10-22 the full suite passed **1059/1059** before final scanner edge-case
refinements; the final focused suite below passed **32/32** afterward. A real
standard-user Windows directory junction verified protected report paths. Initial
sandboxed HTTP/junction attempts were restricted by the sandbox; successful
runs used standard-user execution with loopback/temp-filesystem access. No live
Odoo is used by these tests. The separately authorized live read-only scan was
reconciled for all 50 source-version IDs, text hashes and meaningful counts.

```powershell
node --test tests/project-tags.test.js tests/project-description.test.js tests/project-tag-scan.test.js tests/project-tags-data.test.js
```

These offline tests cover completed-scan retention, source namespaces, localized
canonical tags, extraction of actual narrative sections, template/link-only
quality, latest owned versions, archived scope, access failures, inert CLI import,
protected output paths and the actual shipped catalogue. The bundled-data scan
test allows only metadata and project listing calls, proving saved projects skip
description/version reads. Test results from the latest run are recorded in
[Current State](../ai-context/CURRENT_STATE.md). Live scan coverage and gaps are
recorded separately in the [scan report](../ai-context/PROJECT_TAG_SCAN.md).

## Latest verification (2026-10-22 compact two-line milestone axis)

All **145/145** affected project-browser/monthly/milestone/i18n tests pass,
including **9/9** milestone cases. Cases check black solid markers, 9px two-line
labels at -75 degrees, the month caption below every name, long/same-date/crowded
titles at 280/390/800/1200 widths, multiline rotated bounds/right-edge padding,
lane spacing, compact ordinary footer height, safe full titles, unchanged hour
geometry and no extra height for empty sources. Independent review, syntax/
local-link/whitespace checks pass. An offline SVG/PNG generated through the
actual renderer was visually inspected and saved; browser QA was not repeated
after the earlier Computer Use URL policy stop. Refresh loads it without a backend
restart or Odoo access. No full-suite rerun or separate build/lint/typecheck
command; the earlier full result below remains historical.

## Latest verification (2026-10-22 descending project/convention hour segments)

All **141/141** affected project-browser/monthly/milestone/i18n tests pass.
The existing 14-person case now asserts descending hours with stable name/ID
ties; the lifetime case checks descending annual and lifetime segments using
each period's own values, with exact identity colours and focus. Independent scoped review,
syntax and whitespace pass. No browser visual check or full-suite rerun was
performed for this ordering correction; the full result below is historical.
Refresh loads it without restarting the backend or accessing Odoo.

## Latest verification (2026-10-21 project-hour milestones)

The full automated suite passes **1026/1026** with simulated Odoo; no live source
access was performed. The chart/monthly/i18n subset also passes **141/141** after
the final defensive month-axis guard. New cases cover exact-project independent
cache/loading/stale-response handling, confirmed-empty versus unavailable data,
strict relation metadata and returned ownership, union/deduplication, supported
one-to-many fields, read-only RPC and sanitized failures. Scheduled dates cannot
fall back to creation/modification timestamps. Chart cases cover partial/leap/
single months, strict current/future clipping, safe labels, nonblocking month
interactions, both modes/employee filters and FR/NL rerenders. Independent review
and fictional desktop/390px browser checks pass; logs are empty, screenshot saved
and preview resources released. Syntax, inline script parsing, local links and
whitespace pass. No separate build/lint/typecheck command exists. The local app
was restarted; login returns 200 and anonymous milestone access remains 401.

## Latest verification (2026-10-21 ascending horizontal hour segments)

All **136/136** affected project-browser/project-monthly/i18n tests pass.
Existing contributor cases now assert ascending actual-hour order with ties;
the lifetime fixture uses different annual/lifetime rankings and verifies
independent ordering with stable colours and focus. Negative, incomplete,
ignored-hour and immutable-source checks continue to pass. Independent review
and fictional browser checks confirm left-to-right orders of 10/30/90 and
100/200/300 hours, matching identity colours and tooltip values. Browser logs
are empty; screenshot saved and preview resources released. Syntax/local links/
whitespace pass. No separate build/lint/typecheck command exists; earlier full
suite results predate this frontend change. Refresh loads it without a backend
restart or Odoo access.

## Latest verification (2026-10-21 merged right-hand purchase names)

All **184/184** affected purchase/budget/project/i18n tests pass, including
**38/38** purchase model/geometry/renderer cases. New regressions cover exact
full-name/document-fallback grouping, case/long-prefix distinctions, conserved
category/code/node thicknesses, signed sums/zero, currency/credit boundaries,
raw source/detail retention, stable focus/colours and mixed-code gradients.
Independent review found no actionable issue; synthetic layout conservation
checks passed. Fictional desktop/390px FR/NL browser checks confirm one 6,200 EUR
example node with 1,450/4,750 EUR incoming code flows and three separate original
amounts in the table, bounded tooltips and complete inline amounts. Browser logs
are empty; screenshot saved and preview tab/viewport/helper released.
Syntax/local links/whitespace pass. No separate build/lint/typecheck command
exists; earlier full-suite results predate this frontend refinement. Refresh
loads it without a backend restart or Odoo access.

## Latest verification (2026-10-21 full labels on grouped code tooltips)

All **180/180** affected purchase/budget/project/i18n tests pass. Regressions
cover grouped code-node/allocation-ribbon full labels, missing first-row labels,
deduplication, individual-only purchase details, mixed/unassigned exclusions and
literal source-text safety. Independent review and fictional browser checks
confirm the full label on grouped nodes/ribbons with preserved hover emphasis.
Browser logs are empty; screenshot saved and preview resources released.
Syntax/local links/whitespace pass. No separate build/lint/typecheck command
exists; earlier full-suite results predate this frontend correction. Refresh
loads it without a backend restart or Odoo access.

## Latest verification (2026-10-21 missing-code grouping and hide/show control)

All **178/178** affected purchase/budget/project/i18n tests pass. Missing-code
cases verify one middle bucket, distinct leaves/currencies/credit diagrams,
preserved source identities/warnings/totals and incoming/outgoing conservation.
Hide/show cases cover retained graph/details, direct and parent refresh state,
tooltip reset, native fullscreen close/reopen, focus and FR/NL labels/heading.
Independent review and fictional 1280px/390px browser checks confirm grouped
530/-50 EUR nodes, title/control layout, hidden keyboard exclusion, cached and
language-refresh persistence, native modal cleanup and intact inline amounts.
Browser logs are empty. Screenshots saved; preview tab/viewport/helper released.
Syntax/local links/whitespace pass. No separate build/lint/typecheck command
exists; earlier full-suite results predate these frontend changes. Refresh loads
them without a backend restart or Odoo access.

## Latest verification (2026-10-21 convention category colours and compact spacing)

All **175/175** affected purchase/budget/project/i18n tests pass. Category colours
remain stable across purchase/credit/currency diagrams, label changes, source
order and language changes; identical labels with different IDs stay distinct.
Gradient starts match category fills, while internal-code colours stay intact.
The compact-layout rerun retains **175/175** passes; the existing dense case
keeps 90 allocations and conserved ribbon widths with the reduced extent.
Fictional embedded/expanded and 40-entry browser checks confirm non-overlapping
right-hand label frames and intact inline amounts after halving the gaps.
Independent review, fictional browser checks, syntax/local links/whitespace
pass; browser logs are empty. Screenshot saved and preview resources released.
No separate build/lint/typecheck command exists; earlier full-suite results
predate this display refinement. Refresh loads it without a backend restart.

## Latest verification (2026-10-21 inline amounts and endpoint gradients)

All **174/174** affected purchase/budget/project/i18n tests pass. Renderer cases
verify complete localized inline amounts with full accessible/tooltip names,
gradient endpoints and coordinates, retained foreground gradients, solid equal
colours and unique IDs across purchase/credit diagrams, graphs and rerenders.
Independent review found no remaining actionable issue. Fictional 1280px/390px
browser checks confirm one-line names/amounts in embedded and expanded views,
including ellipsis for a 50-W name beside a complete 1,234,567.89 EUR amount,
FR/NL formatting and gradient emphasis. Browser logs are empty. Screenshot
saved; preview tab, viewport override and helper released. Syntax, local links
and whitespace pass. No separate build/lint/typecheck command exists; the full
989-test run below predates these display changes. No Odoo calls or backend
restart were needed; refresh loads the frontend changes.

## Latest verification (2026-10-21 proportional expanded fit)

All **172/172** affected purchase/budget/project/i18n tests pass. Additional
geometry cases cover width- and height-limited rectangles, preserved aspect
ratios, equal physical scales across purchase/credit diagrams and missing
available space. Resize observers/listeners and inline dimensions are released
on restore or cleanup. Independent review found no actionable issue.

Fictional browser checks confirm a height-limited desktop chart of about
531×344px fully within the 1280×720 viewport's remaining frame, proportional
short/wide resizing, width-limited phone diagrams (362×235px in a 390×844 view)
and a complete 40-entry diagram fitting the remaining phone height. Actual
rendered purchase/credit scales match; closing restores the original embedded
minimum width and clears fit dimensions. Tooltip interaction remains intact,
and console logs have no errors or ResizeObserver-loop warnings. Screenshot
saved; preview tab/viewport/helper released. Syntax/local links/whitespace pass;
no backend restart, live Odoo access or configuration change is needed.

## Latest verification (2026-10-21 graph full-screen control)

All **170/170** affected purchase/budget/project/i18n tests pass. Four new modal
cases verify the same graph/amounts and open details survive expansion, toggle/
Escape/native cancellation restore the control, Tab wraps within the dialog,
stale close callbacks cannot close a newer modal, cleanup/rerender release the
native modal and FR/NL labels remain correct. Parent integration tests model
native focus loss while reparenting and verify restoration across refresh and
cleanup on Hours navigation.

Independent review and fictional desktop/390px browser checks confirm viewport
filling, a sticky top-left restore control, retained ribbon tooltips, contained
phone scrolling, translated labels, native Escape, Tab/Shift+Tab focus boundaries
and toggle restoration. Browser warnings/errors are empty. Screenshots are saved
and preview resources released. Syntax, local links and whitespace pass. No
backend restart/source/config change is needed; refresh loads the frontend.
The previous 989-test full-suite result below predates this display refinement;
the relevant suites were rerun for this change. No separate build/lint/typecheck
command exists. Physical touchscreen behavior remains outside these checks.

## Latest verification (2026-10-21 purchase Sankey)

The sequential full offline suite passes **989/989** in 73.85 seconds, with no
failures, cancellations or skips. The focused purchase/budget/project/i18n set
passes **166/166**, including 20 purchase model/geometry/renderer cases; finance
source and authenticated HTTP cases pass **85/85**. Coverage includes exact
posted supplier document types, both category dimensions, inclusive Brussels
cutoffs, duplicate/contradictory allocations, signed credits, shared diagram
scales, unknown amounts/currencies, denied optional reads, literal safe text,
source privacy and unchanged prior finance totals. Budget/project integrations
cover exact placement, independent existing controls, stable focused allocations,
open details and cleanup on Hours navigation.

Independent review found no remaining actionable issue. Fictional desktop and
390px browser checks confirm native SVG focus, Escape/reset, fit without desktop
chart scrolling, bounded mobile tooltips, contained dense scrolling, all 40
entries in the detail table, disclosure persistence after refresh, FR/NL labels
and literal source descriptions. Navigation removes the graph/tooltips, with no
horizontal page overflow or browser warning/error. Screenshot evidence is saved;
the preview tab, viewport and helper are released. This checks click/keyboard and
responsive CSS, not a physical touchscreen device.

An initial full run had one known 15-second programme fixture-startup timeout;
its exact case and the final unchanged complete suite pass. Test commands using
temporary localhost servers required sandbox escalation for local socket access,
not Windows administrator rights. No live Odoo call or private-config change
occurred. Root/inline scripts parse, documentation links and whitespace pass;
there is no separate build, lint or typecheck command. The local dashboard was
reloaded with current backend code; welcome is 200, anonymous finance is 401 and
stderr is empty. Live purchase-document/schema permission coverage is unverified.

## Latest verification (2026-10-20 planned convention reference)

The project-monthly model suite passes **46/46** and the project-browser
renderer suite passes **74/74**. Model cases cover full-project daily convention
proration in monthly/cumulative mode, future months, precise totals, partial and
leap periods, filter independence and unavailable/nonpositive budgets. Renderer
cases retain the dotted project-wide reference when an employee or TH resource
is selected, keep areas and future points, bound responsive geometry, preserve
exact table precision and show translated reference-availability notes. Actual
history headings explicitly state today's cutoff in FR/NL while their caption
retains the actual-through date. Targeted whitespace checks pass.

The outline-only CSS visually clips small project radio circles while retaining
the native inputs and existing label/focus/accessibility semantics; the three
large programme radio controls are unchanged. The sequential full offline suite
passes **949/949 tests** in 57.29 seconds, with no failures, skips or cancellations.
Independent review found no actionable issue. Fictional desktop and 390px
browser checks confirm the full future convention curve, its final cumulative
total through a TH-only filter, FR/NL headings and notes, keyboard selection and
Back focus restoration, clipped personal/unit/programme-project radios, and
unchanged visible programme selectors. There is no horizontal page overflow or
browser warning/error. Screenshot evidence is saved; no live Odoo call is used.
Preview resources and the verified owned fixture are released. After the
unexpected exit, saved code/test evidence was rechecked and the stopped local
server relaunched as a hidden standard-user process (welcome 200, current
public translation catalogue and empty stderr). Sign in again after restart.
All 30 root/inline scripts parse, eight context/wiki pages have no missing local
links, and whitespace checks pass. No separate build/lint/typecheck command exists.
The completed October 16 checks below remain historical evidence.

## Previous verification (2026-10-16 project-card outline)

The sequential offline suite passes **940/940 tests** in 55.69 seconds with no
failures, cancellations or skips. After the final SVG geometry correction,
all **178/178** affected project-card/project-browser/unit-dico/programme-browser/
i18n cases pass again. New cases retain real business codes, strict valid and
unknown dates, literal source text, safe portrait fallbacks, checked state,
native input/listeners, one accessible description and explicit programme
variant isolation.

Fictional desktop and 390px browser checks confirm hover and keyboard reveal
without accidental selection, homogeneous card sizes, full outline closure,
FR/NL labels, unchanged programme flips and first-click project opening.
An isolated copied fixture enables the touch/reduced-motion media rules and
missing Dutch dates to check static details, wrapping, zero-duration transitions
and first-tap selection. This does not emulate actual device input or OS media
preferences. No page overflow or browser warnings/errors were observed.

Visual QA caught normalized stroke truncation from a scaled viewBox with a
non-scaling stroke. The outline now uses viewport-pixel coordinates with
percentage dimensions and a normalized path, preserving the full trace on both
personal and compact cards. The corrected desktop screenshot is saved. Preview
tab, temporary viewport, helper and fixture are released. Syntax, local-link
and whitespace checks pass; no separate build/lint/typecheck command exists.
Existing server welcome remains 200; no restart or live Odoo call was needed.

## Previous verification (2026-10-16 French/Dutch and project controls)

The final sequential offline suite passes **936/936 tests** in 55.75 seconds,
with no failures, cancellations or skips. All Odoo responses are simulated;
language-only config/manual-login and public language asset cases make no live
source calls. Partial-write cleanup preserves the original config and removes
only owned temporary files. Provenance-marker tests keep real names/IDs/hours
unchanged. Cached repaints retain invalid date inputs without applying them.

Independent source review confirms the RPC allowlist/pre-network guard and
capacity/hour/date arithmetic are preserved. Fictional desktop and 390px
browser checks cover FR/NL navigation, saved language after reload/logout,
recommendations/capacity, budget labels, short calendar names and shared rolling
axes, multiple ignored employees, hatched bars and zero-free monthly employee
tooltips. No horizontal page overflow or console warnings/errors were observed.
Screenshots are saved; temporary tab, viewport, helper and fixture are released.
Thirty root/inline scripts parse; context/wiki link and whitespace checks pass.
No separate build, lint or typecheck command is defined.

The restarted standard-user server serves current public assets and valid
language preferences, with welcome 200, protected anonymous API 401 and empty
stderr. Config remains private (authenticated 404 verified in fixtures), and
the user's private file was not modified during verification.

## Language and interactive display regression surfaces (2026-10-16)

The language suites are `i18n`, `language-client`, `language-preferences`,
`language-preferences-http` and `dashboard-language` under `tests/`. Their
fixtures cover FR/NL key/placeholder/source-alias parity, locale formatting,
public preference reads and authenticated/origin-checked writes, language-only
config/manual login, credential/nested-value preservation, invalid/read-only
files, external-edit conflicts and no Odoo calls. Browser-client cases exercise
bootstrap/save races and cached repaints without resetting dashboard state.

`unit-dico.test.js` adds full/default versus rolling Brussels +/-3-year bounds,
leap-day clamping, inclusive clipping, preserved cards/unknown dates, partial
month concurrency and known-zero geometry. Both shared calendar entry points
retain toggle focus and clean observers/synchronized scrolling. A short-name
case covers personal/Unit/programme views in both modes while full names remain
in titles/accessible descriptions. The focused suite passes **65/65** locally.

`project-browser.test.js` and `sticky-scope.test.js` cover independent scoped
actual-contributor exclusions, counted/hatched-ignored reconciliation, unchanged
planning/today and other graphs, signed/unreconciled fallbacks, focus and cached
state. Monthly cases distinguish exact zero from unknown, negative, cancelling
and nonzero-reference cells; they verify monthly/cumulative tooltip/table filters
without dropping source chart months. `steering.test.js` passes **17/17** locally,
including all detail-tab translations, escaped original source labels and live
locale repaint without navigation or refetch. These focused results do not
replace a final complete-suite or responsive browser verification.

## Latest verification (2026-10-15 Project Hours planning graphs)

The final sequential offline suite passes **870/870 tests** in 51.60 seconds,
with no failures, cancellations or skips. The affected suites contain 32
project-planning, 40 project-monthly, 63 project-browser and 95 controller cases.
New coverage checks dated planning through inclusive Brussels today, independent
linear convention references, unknown sources, signed corrections, TH/Ormitter
rules, full project-life future planning, exact resource identities, independent
employee filters and synchronized cached mode/inclusion controls. Renderer cases
cover circled-i hover/click/focus/Escape cleanup, personal-only gradient warning
segments, solid red schedule lines and coexisting accessible monthly charts.

Independent review found no actionable calculator issues. Fictional desktop
and 390px browser checks verify the popup and keyboard refocus, teal/orange/red
personal bar with Surpointage, unchanged project bars, red dated line, future-only
and TH series, independent selection, shared cumulative/Ormitter controls, unique
DOM IDs and no horizontal page overflow or console warnings/errors. Screenshots
are saved and temporary browser/viewport/fixture resources released. Static
checks parse 21 root/inline scripts and validate local links in eight context/wiki
files; whitespace checks pass. No build/lint/typecheck script is defined.

An initial full run had one 15-second child-fixture startup timeout in an existing
authentication test (869/870). That exact case passed immediately in isolation,
then the final unchanged complete suite passed. No authentication or timing
behavior was changed for this task. All source calls use offline fixtures; no
live Odoo access was needed. The existing local welcome returns 200; a refresh
loads these frontend changes without a backend restart.

## Latest verification (2026-10-15 overplanning warning)

The affected renderer suite passes **23/23 tests**. Coverage includes values
below/exactly/above 100%, decimal roundoff, real excess hidden by formatting,
the exact overplanning note and cleanup after normal/low/unknown rerenders.
Existing 85% boundaries, three-card semantics, safe text and disclosure/focus
cases still pass. Scope and backend code are unchanged; broader suite results
below precede this small presentation refinement.
Fictional browser verification confirms the exact high-coverage message and
orange percentage/note, with no horizontal page overflow or console warnings
or errors. Static syntax, local documentation links and whitespace checks pass.

## Latest verification (2026-10-15 planning coverage and third card)

The affected capacity renderer, recommendation and controller suites pass
**146/146 tests**. The renderer's 22 cases cover rates below/exactly/above 85%,
decimal floating-point boundaries, signed/zero/excess planning, unknown or
nonpositive denominators, loading/failure cleanup and reactive aggregate scopes.
Existing native disclosure/focus behavior remains covered. No backend or source
query behavior changed, and no new build/lint/typecheck commands were added.
The presentation follow-up verifies three separately labelled cards in order,
the percentage in its own card, exact low/normal French notes and the neutral
unavailable state. The calculator and scope contracts are unchanged.
Fictional browser checks confirm three equal desktop/tablet cards, stacked
390px phone cards, identical large-value fonts, both exact explanatory notes
and no horizontal page overflow or console warnings/errors. Syntax,
documentation-link and whitespace checks pass; the existing server responds
with 200 and requires only a refresh for this frontend update.

A separate targeted guarded own-account read reconciles the user's 2026
Planning numerator and reproduces its denominator from the union of global
and personal calendar intervals. The HR and resource calendars agree; absence
categories/reasons, leave requests and payroll were not read. This diagnostic
does not change entitlement-based production capacity. Browser/static checks
for this refinement are recorded in current project state; earlier full-suite
results below predate it.

## Latest verification (2026-10-14 complete planning scope clarification)

The three affected renderer/recommendation/controller suites pass **143/143
tests**. A new frozen-date controller case confirms full-year planning of
165 h in 2026, 170 h in 2027 and 335 h for both, including future, unassigned,
uncatalogued and hidden-project allocations while excluding other years.
The capacity calculator receives the same selected-year scope. The displayed
caption and **Arrêter (ou clarifier)** heading/helper are checked; calculation
arithmetic is unchanged. The full-suite result below predates this refinement.
Fictional desktop checks reconcile the displayed 2026 and 2026/2027 totals
with the same capacity scope, confirm the new heading fits its column and find
no horizontal page overflow or console warnings/errors. Syntax, local
documentation links and whitespace checks pass. The existing local server's
welcome remains healthy (200) after the reported interruption.

## Latest verification (2026-10-14 personal work capacity)

The final sequential offline suite passed **838/838 tests** in 97.00 seconds,
with exit code 0 and no failures, cancellations or skips. New coverage includes
22 calculator, 18 source-service, 19 renderer, four authenticated HTTP cases
and three controller cases; the affected controller suite passes 93 cases.
Independent review fixes enforce exact session UID, typed closure/category
evidence, one canonical own HR identity and valid annual-status enums before
any future fallback. Category reads use their canonical locale.

Calculator cases cover full-time, four-day/half-day and alternating-week
schedules, dated attendance, timezone/DST boundaries, unioned closures,
nonworking holidays, signed planning, custom prorata and disjoint years.
Requests/consumed balances cannot change entitlement-based capacity. Unpaid,
prior-year carryover, unknown categories and paid accruals follow the declared
policy; denied/malformed/ambiguous sources cannot fabricate zero or estimates.
HTTP/controller cases cover forged identity/connector fields, changed UID,
bounded years, optional source failure, hidden pie projects, year caching and
stale refresh generations.

Fictional desktop/390px browser checks confirm scoped cards between the
recommendations and pie, future calendar estimates, custom-date prorata,
persistent native calculation details, readable cards and no horizontal page
overflow. Browser warning/error logs are empty. A targeted guarded own-account
read reconciled the live calendar/allocation aggregate; the reloaded workspace
endpoint returns 200, anonymous capacity returns 401, and new served assets
match the checkout. No requests, payroll, private HR exports or Odoo writes were
used. Part-time and other-account coverage remain synthetic.

The five-second isolated server startup deadline caused transient Windows
failures during earlier full runs. Test-only startup now permits 15 seconds;
failed startups clean their spawned child, mock listener and verified temporary
fixture before rejecting. Two mocked lifecycle cases verify both timeout and
early-exit cleanup. Production RPC/auth timing is unchanged. Syntax, local
documentation links and whitespace checks pass; no build/lint/typecheck script
is defined in this repository.

## Previous verification (2026-10-13 compact Project Hours macro cards)

The existing project-browser suite passed **57/57 tests**, with no failures or
skips. Independent review confirmed unchanged projection arithmetic, signs,
precision and unavailable-value handling. The positive caption now says
**planifiées en trop par rapport à la convention**; only wording and card
spacing changed. No full-suite rerun was needed for this cosmetic refinement.

Fictional browser checks measured all four desktop cards at 182.39px (previously
228px), and all four at 900px viewport width at 160px (previously 200px). At
390px, three cards measured 148px; the remaining-planning card expanded to
150.38px to fit its TH and date notes. No card content or horizontal page
overflow occurred. The positive caption, large values and notes remain readable.
Browser warning/error logs are empty. All 18 inspected scripts parse, local
documentation links resolve and whitespace checks pass. Calculations and source
reads are unchanged; the frontend loads on refresh without a server restart.

## Previous verification (2026-10-13 compact recommendation wording)

The affected recommendation, personal-time and controller suites passed
**166/166 tests**, with no failures/skips. These frontend-only refinements do
not change calculations or source reads; the preceding full suite below is
historical. One dynamic-period case verifies year ordering/deduplication,
French custom dates, explicit invalid-period fallback and in-place heading/
slider/focus preservation. Existing stop cases verify concise combined reasons
with detailed tooltip/accessibility evidence, including unavailable pace.

Fictional browser checks confirmed compact stop rows and heading changes from
2026 to 2026 et 2027, then du 1er août 2026 au 31 décembre 2026. Desktop width
and scroll width both stayed 1265px; the recommendation panel measured 232.31px
high. Source arithmetic/classification, existing filters and backend are unchanged.
At 390px, the compact rows and scoped heading remain readable in one column;
document width and scroll width both stay 375px. Browser logs contain no errors.
All 18 inspected scripts parse, documentation links resolve and whitespace
checks pass. The existing workspace server responds with 200; no restart was needed.

## Previous verification (2026-10-13 Arrêter column)

The final sequential offline `node --test` run passed **769/769 tests** in
47.83 seconds, with exit code 0 and no failures, cancellations or skips.
The dedicated strict-HR personnel-budget suite passed **31/31 cases**;
a focused personal/controller run passed **90/90 cases**. Independent source
review found no actionable issue. All these checks use synthetic source data
and preserve the existing read-only RPC boundary.

`tests/personal-recommendations.test.js` now checks four ordered exclusive
groups, combined stop reasons, no weekly target for stop rows, and stop
classification independent of tolerance changes. Cases cover expiry on the
Brussels current date, absent starts versus reversed dates, known positive
project-wide BW convention exhaustion at full precision, and suppression for
unknown/nonpositive budgets or unknown actuals. Stop evidence survives missing
planning, invalid interpolation or unselected-year gaps without fabricating an
expected-hour value or signed pace gap. Scoped membership and zero-activity
omissions remain unchanged. Renderer cases verify known-gap sorting ahead of
unavailable stop comparisons, stable title/ID ties, safe text and persistent
slider focus.

`tests/personal-personnel-budget.test.js` exercises the optional server
aggregate with mocked read-only source functions. It covers canonical numeric
convention hours, exact involved project/employee IDs, inclusive Brussels date
cutoffs, per-project starts, post-end consumption, known Ormitter exclusion,
private/public HR fallback, backend-only colleague totals, signed corrections
and compensated sums. Missing/mistyped metadata, denied reads, unknown functions,
duplicate or malformed source records, empty conventions/catalogues, future
starts and paginated reads cannot fabricate complete values. A route case
preserves own records, planning failure and catalogue metadata when optional
colleague access is denied. These cases do not use private configuration or
real Odoo records.

Final fictional browser checks confirmed four exclusive stop rows: TETRA's
project-wide BW consumption of 1700h against 1000h convention hours excluded
500h of Ormitter time; AIDA ended on the fixture's current Brussels date,
October 13; HARPO had no remaining personal planning; and BIDZ ended on
September 30. Indus remained in Augmenter with 146.5h of BW consumption against
500h of convention hours even with an additional 600h of Ormitter time.
These are fictional regression values, not measurements from those real projects.
Tolerance changes **15 → 100 → 15%** preserved all four stop project IDs and
native slider focus, while only the remaining pace groups could change.

Responsive checks verified four desktop columns at 1265px, two at 900px
(document width 885px), and one at 390px (document width 375px). Column widths
were approximately 282.89, 384.9 and 279px respectively, without horizontal
overflow; the final phone screenshot was visually inspected. The results
below describe earlier completed iterations.

## Earlier verification (2026-10-13 explicit planning wording)

The final sequential offline `node --test` run passed **731/731 tests** in
47.48 seconds, with no failures, cancellations or skips and exit code 0.
Independent focused verification passed 226 cases before the final pie-legend
wording refinement; the final personal-time/recommendation suites passed 68
cases. Renderer coverage includes the selected year/custom-date end independent
of project clipping and explicit invalid-date fallback. Recommendation coverage
includes successful complete source requirements, unselected future years,
current-day allocations, midnight/DST boundaries, tiny positive allocations,
negative/unknown corrections and missing/partial/failed source suppression.
Red stop advice persists in all three tolerance groups and replaces weekly
targets while retaining signed gaps, sorting and native slider focus.

Fictional browser checks verified the exact new French heading, the red HARPO
row with a 750-weight bold sentence, a nonred eXtRAI row with future planning,
and tolerance 15 to 100 and back without losing focus. A synthetic personal
balance of 153.5h displayed deadlines December 31, 2026 and December 31, 2027
when selection changed; a custom January 1 to November 30 period displayed
127.99h through November 30. The pie legend uses the same wording. At 390px,
columns stack and document width/scroll width both stay 375px without overflow.
All 18 scripts parse, local documentation links resolve and whitespace checks
pass. No actual Odoo access or workspace-server restart was needed; browser
fixtures use isolated synthetic config and mocked read-only RPC.

## Earlier verification (2026-10-12 four-card project macro)

The final full offline `node --test` run passed **721/721 tests** in 61.87
seconds, with no failures or skips and exit code 0. The focused planning helper
suite passed **24/24 tests**. Coverage includes signed actual/future/projection
math, both Brussels DST transitions and project endpoints, closed-project zero
future with unavailable planning, retained known actuals, future TH attribution
and continuous calendar-month staffing gaps. These fixtures are synthetic and
preserve the read-only RPC guard; no private configuration or real Odoo write
is used. The preceding TH/700-test iterations below are historical.

## Earlier 2026-10-12 TH verification before the four-card macro

The final full offline `node --test` run passed **707/707 tests** in 54.39
seconds, with no failures or skips. Independent backend checks passed **44
focused tests**. After the French TH note changed to **postes à pourvoir**, all
**54 renderer tests** passed. These synthetic suites preserve the read-only RPC
guard and do not contact real Odoo or read the private configuration.

Fictional desktop checks verified a full-width macro description fitting on one
line, 15px/800-weight category headings and two-pixel colored underlines.
Ralentir gaps **1075.3, 220.1, 31.9h** and Augmenter gaps **232.3, 86.2, 53.1h**
appeared in descending absolute-hour order. Native tolerance changes
**15 → 100 → 15%** reclassified recommendations while retaining slider focus.
At 390px, the description wrapped naturally in 305px, categories stacked, and
document width stayed 375px without overflow. A linked fictional TH resource
still subtracted **240h** and did not cover the **92-day** real-person gap.
Browser logs had no errors. These checks use fictional data; the separate live
eXtRAI confirmation below is limited to the reported project/source question.

The workspace server was restarted as a standard user to load the TH fix.
Loopback port 8765 served the checkout's matching welcome page with 200;
anonymous session/project-hours calls returned 401, and stderr was empty.
All 18 inspected scripts parsed, documentation links resolved and the diff
check passed. Runtime checks establish local startup/access protection, not
broad live source permissions or an authenticated user-browser reconciliation.

## Earlier 2026-10-12 verification before the TH follow-up

After the French/period/recommendation and project-planning changes, full
offline `node --test` passed **700/700 tests** in 48.27 seconds with no failures.
Independent review passed **93 focused tests** and found no actionable issue.
All 18 inspected scripts parsed. This completed iteration is superseded by
the TH follow-up above. These automated checks use synthetic
fixtures, never private configuration or real Odoo writes.

Fictional desktop and 390px browser checks verified the compact three
recommendation groups, default 15% tolerance, native keyboard changes to 100%
and back to 15%, retained slider focus and unchanged pie gradient identities.
Annual/multi-year/custom-date own-hour headings named the selected period
directly; French labels and the document language were checked. On phones the
groups stacked readably, with document width 375px and no horizontal overflow.
Project checks exercised lifetime convention/planning/TH metrics, future gaps,
shared Ormitter inclusion and native disclosure expansion/focus. Confirmed-zero
own comparisons disappeared for an empty scoped period and returned when it
changed; project/lifetime/history sections remained. Browser logs had no errors.

The workspace server was restarted as a standard user after the backend change.
Loopback port 8765 served the matching checkout's welcome page with 200;
anonymous session/project-hours calls returned 401, the protected planning
module redirected with 303, and stderr was empty. This verifies local startup
and access guards, not real-account identity/photo/resource permissions. The
separate narrow eXtRAI aggregate and resource-field metadata confirmations are
described below; they do not establish broad live source compatibility.

## Authentication integration suite

```powershell
node --test tests/auth.test.js tests/portfolio-ui.test.js
```

The Node built-in test runner launches a copy of the application in an isolated temporary directory and a local simulated XML-RPC server. It does not use real credentials or the repository's private configuration.

Authentication tests cover public/protected routes, invalid login and XML-RPC faults, identity overrides, secret non-disclosure, restricted static files, separate users, logout/CSRF, forged cookies, upstream failure, session rotation/expiry, Secure cookies and login rate limiting.

Config-login coverage uses only temporary synthetic config/token fixtures. It
checks the configured account and `api_key` alias, ignored caller overrides,
exact credential reuse, missing/malformed/incomplete config, rejected tokens,
upstream failure, redirect refusal, direct-socket/Host/origin restrictions,
untrusted forwarded headers, shared login limits, session rotation, and secret
absence from responses/logs (including read warnings and later config parse
errors). A browser-script fixture checks the **Utiliser le fichier de
configuration** button, empty JSON request, safe compact messages, blocked
duplicate submissions, and successful dashboard navigation. Its element fixture
includes the DOM `dataset` property used by notice states. No private config is
read or real Odoo contacted.

Owner-team tests cover scoped project-ID queries, no employee-name filtering, zero-hour/empty portfolios, all contributors, ambiguous metadata, task-linked planning, unsupported planning without an unfiltered query, and unknown UI remaining values.

## Personal time macro

```powershell
node --test tests/personal-time.test.js tests/personal-recommendations.test.js tests/project-monthly.test.js tests/project-browser.test.js tests/sticky-scope.test.js tests/auth.test.js
```

The pure/DOM module fixtures cover selected and disjoint UTC-year planning,
inclusive Brussels-date actuals, signed credits, unknown versus zero planning,
ID-separated duplicate names, proportional sector angles, square-root area,
overrun limits, local legend exclusion/restoration, safe project text, and
keyboard/touch details. They also check the divided **Hors planning** group,
signed visible-hours subtotal, separate unknown planning, and calendar-ring
behavior across selected years and legend interactions. Separate project-calendar
cases cover December starts, selected-year
intersections, inclusive endpoints, leap days, disjoint gaps, Brussels boundaries,
one-day scopes and invalid/missing/no-overlap dates without changing the macro.
Custom-scope cases validate inclusive start/end dates, invalid/incomplete or
reversed ranges, exact Brussels-midnight slot proration across both DST changes,
future planning and slots touching excluded boundaries. They also retain signed
actuals through Brussels today, known-zero versus unknown planning, absent or
zero-net projects, legacy UTC-year allocation and range-specific calendar
anchors, project-date clipping and macro ring geometry.

`tests/personal-recommendations.test.js` covers allocation-weighted annual
expected hours, inclusive today, project-date clipping, disjoint selected years,
custom Brussels boundaries and DST. Tolerance-boundary cases retain Continuer
without display rounding driving classification. Unknown/negative totals,
invalid planning/dates, nonzero allocations outside project-date calendar parts,
unreconciled annual plans, unplanned actuals and future/ended periods cannot
manufacture a weekly target or percentage. DOM cases verify safe text, named
native exclusion details, associated label/output, percentage accessibility
text, polite status and a persistent focused slider across live updates.
Controller cases keep threshold changes local to the recommendation host,
retain pie-hidden projects in advice and preserve scope/legend/source values.
Comparison-title cases cover explicit sorted year lists, full French custom
dates and invalid-scope fallbacks; history labels/provenance remain full-life.

A targeted read on 2026-10-12 reproduced the reported eXtRAI comparison:
2026 planned **664.6h**, actual **739h**, with project dates **2025-12-01 to
2028-05-31**. Own planning across project life was **2561.07h**: 2025 **0h**,
2026 **664.6h**, 2027 **1556.21h** and 2028 **340.26h**. The same calculator gives
September 2026's cumulative full-life reference as
`2561.07 * 304 / 913 = 852.7549616648411h`. This verifies a period-basis
difference rather than an arithmetic error. A synthetic regression checks the
same distinction without changing source totals. The narrow account read
returned one employee and matched the reported aggregates; the browser's
identity was not independently compared. This does not establish broad live
planning/permission coverage or transactional consistency between reads.
Legend cases cover symmetric full-period shortfall labels, known numeric
strings, signed credits and hidden entries, while preserving overrun/unplanned
labels and omitting shortfalls for equal, unknown or nonpositive references.
Controller/renderer regressions verify effective date captions and tick positions,
unchanged recorded totals, inclusion of accessible prior-year planning, missing
date-reference notices, and unchanged lifetime/monthly charts with no extra fetch.
Dashboard fixtures cover the default **Mon temps**
view, session-bound empty request, inclusive own roles and exact identities,
local years/legend state, and obsolete refresh responses.
Dashboard custom-range fixtures additionally verify last-valid atomic
application, input/year-button focus, inline validation, Escape/outside dismissal,
year/reset transitions, shared exact totals/membership/ticks without refetch,
empty-range selection clearing, budget independence and retained range on refresh.
Keyboard navigation into Budget closes the hidden range editor without focus
restoration or intercepting the bill dialog's Escape action.
HTTP fixtures cover
private/public/resource identity links, task-linked planning, duplicate labels,
wrong relation metadata, missing identity, and safe actual/planning failures.
Manager HTTP fixtures verify exact project/user-ID metadata reads, optional
name/photo fields, denied metadata, wrong relation types, rejected unsafe
photos and preservation of personal hours.
All fixtures are synthetic; they do not read the private config or contact Odoo.

`tests/project-browser.test.js` covers native named radios, alphabetical
safe-text tiles, exact IDs, back/focus behavior, photo validation and fallback,
and empty/loading/error states. Comparison cases exercise the pure
`barGeometry` 75% baseline, actual cap, linear calendar tick, signed values and
zero/unknown/negative planning, plus numeric DOM labels and retry/focus behavior.
Shortfall cases compare actuals with the full positive displayed plan, retain
signed corrections and fractional hours, omit fictitious gaps for unavailable
or nonpositive plans, and name the independent convention baseline. Custom
captions and employee details describe the selected period while lifetime and
monthly captions retain their own project dates.
Contributor cases cover the conditional unchecked project-only checkbox,
checkbox focus, stable distinct ID colors, capped positive stacks whose shares
reconcile, narrow-segment keyboard access, signed negative net-bar fallback,
missing/inconsistent decomposition, safe avatars/text and touch/Escape tooltips.
Lifetime rendering cases cover the independent project-date tick/caption,
same-ID colors and comparison-specific focus, the single shared checkbox,
missing/nonpositive convention row omission, distinct empty-field MIS and
unavailable-field messages, and explicit
actual-distribution scale, and invalid-date actual unavailability.
The rendering module itself performs no fetch; the page's selection callback
loads one `/api/odoo/project-hours` response for all three comparisons. HTTP fixtures
exercise exact project/session IDs, classification, ignored caller overrides,
missing project, actual failure and partial planning. Optional contributor
fixtures cover exact employee/resource/profile IDs, validated employee/user
photo fallbacks, denied metadata and metadata-confirmed staffing assignments,
including an assigned Ormitter with no hours. Page fixtures cover full-history
caching, local years/inclusion without refetch, personal/legacy independence,
signed contributor reconciliation, two-decimal totals, full-history/assignment
presence and response-generation protection. Lifetime page fixtures check
inclusive project start/end dates, Brussels today, selected-year independence,
signed totals and the same project-only inclusion choice across both project
pairs. HTTP fixtures verify the exact `budget_staffing_convention_hours` source,
labels that differ from the French UI label, preserved decimal precision, no
label/staffing substitutes, incompatible/missing/blank/zero/invalid values,
available/empty/unavailable status, invalid dates and independently readable
dates when the optional budget read is denied.

## Project planning information

```powershell
node --test tests/project-planning.test.js tests/project-planning-service.test.js tests/project-planning-http.test.js tests/project-browser.test.js tests/odoo-read-only.test.js
```

Pure cases cover full-life UTC slot proration, signed totals, exact project and
Ormitter cohorts, confirmed-only TH subtraction, readable empty versus denied
planning, missing/nonpositive convention and no invented convention delta.
New macro cases independently check actuals since project start through today,
post-end actuals, future/closed projects and preserved actuals when project end
or planning is unavailable. Tomorrow-to-end planning uses Brussels midnights
with unchanged UTC slot duration, both DST transitions and no final-day UTC
tail. Remaining TH subtotals exclude their historical portions while retaining
signed corrections and independent attribution status. Projection checks
`actual + remaining (TH included) - convention`, fixed known-Ormitter exclusion
and explicit unknown-function/invalid-input states.
Calendar-day union cases include partial daily shifts, exclusive ends across
Brussels DST, TH/other-unlinked gaps, unknown identities, ended projects and
bounded interval arithmetic for long dates. Negative person or unknown
corrections keep future coverage indeterminate even when positive allocations
cover the entire period; negative confirmed TH cannot cancel person coverage.
Alert cases compare each continuous gap with its clamped next-calendar-month
anniversary, distinguish shorter gaps from complete coverage and never add
separate short gaps together into a month-long warning.

Service/HTTP fixtures check metadata-confirmed relation types and exact resource
IDs, empty/unique/ambiguous employee arrays, raw employee ownership and immutable
snapshots before legacy lookup mutation. Collective TH markers now precede
positive original owners independently of linked/unlinked/unknown technical HR
status. Name denial, missing/duplicate source rows or malformed records cannot
establish a person or confirmed-zero TH attribution. Separate field recovery
retains readable TH names even when an employee relation is denied; an empty
HR search still cannot establish a technical negative link. The
singular `resource.resource.employee_id` one-to-many mapping was additionally
confirmed through a targeted live metadata-only read; no resource/person records
were read for that confirmation.
An isolated HTTP fixture forces the entire optional identity service to fail:
resource-linked slots stay unknown, resource-free explicit person evidence
remains available, hours survive, and the private fixture fault is not reflected.

A subsequent targeted read confirmed eXtRAI's collective TH source was linked
to an employee. Its two slots contribute **261.71h in 2027** and **370h across
project life**. With default Ormitter exclusion, the previous full-life helper
(retained for compatibility) gave
**4352.34h total planning − 370h confirmed TH = 3982.34h outside TH**, with
complete TH attribution. The positive BW convention scalar is
**3890.3967484570226h**. This confirms the reported missing placeholder and the
scoped/full-life distinction for this project; it is not broad source-coverage
verification. No employee/resource IDs or private raw records are recorded here.

Renderer/controller cases check the four-card order and formula, signed
excess/shortfall/zero labels, emphasized future TH portion, independent known
actuals, partial/unavailable notices, literal resource text and exact substantial
gap dates/day details. Loading/failure states preserve existing graphs. Scope
and graph inclusion redraws cannot change the macro's fixed cohort, while native
disclosure focus/open state survives. The own pair is omitted only when both scoped values are
known numeric zero; unknown, negative or nonzero values keep it, and the other
comparisons/history remain. Planning information never enters the Budget panel.
All fixtures remain offline; the browser checks in the latest-verification
section use labelled fictional data. Recommendation DOM coverage additionally
checks descending absolute hour gaps in Ralentir/Augmenter, stable title/ID ties
and unchanged model values during sorting.

## Unit DiCo catalogue and timeline

Shared personal/Unit calendar and optional personal date checks:

```powershell
node --test tests/unit-dico.test.js tests/project-browser.test.js tests/sticky-scope.test.js tests/personal-project-dates.test.js tests/auth.test.js tests/odoo-read-only.test.js
```

The personal date VM fixtures never read private configuration or contact Odoo.
They cover confirmed field types, exact involved-ID scope/projection, strict
dates, duplicate/foreign rows, absent/denied metadata, independent field recovery
and the full personal handler preserving hours and manager enrichment.
Shared calendar cases verify completed-last ordering at Brussels midnight,
unchanged bounds, personal placement below radios, full-lifetime dates with
year/custom activity membership, exact selection, focus and observer cleanup
before overview replacement, Hours/Budget detail or tab departure.

`tests/project-card.test.js` and both grid DOM fixtures cover literal safe
front/back content, strict date parsing, missing/zero/signed/invalid budgets,
unknown currency, accessible radio descriptions and native selection/focus.
Naming cases cover short-title-only fronts and number/short-title/manager/
italic-title back content, bracketed and leading numeric codes, source-case
retention, missing-acronym/code/manager fallbacks, omitted duplicate titles, literal
malicious labels and unchanged native source-name identity/source DTOs. Back
fixtures retain strict dates/budget in tooltips and the single radio description
without visible metadata rows.
Existing portrait cases cover bounded PNG/JPEG/WebP images and broken-image
initials. The earlier structured-title update passed **186 focused tests** on
2026-10-11 before the animated-card redesign, with
`node --test tests/project-card.test.js tests/project-browser.test.js tests/unit-dico.test.js tests/sticky-scope.test.js`.
The animated-card redesign subsequently passed the same **186 focused tests**,
with no failures or skips. This is not a fresh full-suite run. Fictional desktop
checks confirmed equal 190px personal/112px Unit sizes, white/black faces, exact
background colors, a moving turquoise border, moving revealed/paused hidden
background orbs and bounded visible content. At 390px, three personal cards
remain 180px and all 17 Unit cards remain 112px; content fits, codes clear the
stationary radios, long titles use ellipsis/two-line clamping and the document
has no horizontal overflow. Native selection opens detail and Back restores
the focused radio; browser error logs are empty. Independent source review
found no actionable issue. Coarse-pointer and reduced-motion rules were reviewed
in source, not emulated by these viewport checks. Clipped decorative animation
can extend face `scrollHeight`, so overflow checks measure visible content
bounds and document width rather than that decorative scroll extent. No private
configuration, live Odoo reads or workspace-server restart were used.
Controller fixtures preserve full-lifetime budget metadata by exact ID across
year/custom-date scope and independent personnel choices. Optional budget
source cases cover confirmed types/currency bindings, exact IDs and fixed unit,
precision, foreign/duplicate projection, metadata/read denial and independent
amount/currency recovery. Isolated HTTP checks cover the DTO and protected card
assets without live Odoo or private configuration.

```powershell
node --test tests/unit-dico-service.test.js tests/unit-dico.test.js tests/unit-dico-http.test.js tests/sticky-scope.test.js
```

`tests/unit-dico-service.test.js` uses only synthetic metadata/project RPC
adapters. It checks the fixed `lead_unit_id` many-to-one `hr.department`
relation and department `206`, translated-label independence and refusal of
alternate fields, archived/zero-hour membership without hours/finance reads,
exact department/ID postfilters and deduplication. It also covers precise
Interne/Overhead exclusion, readable empty versus unavailable catalogues,
strict dates/leap days/datetimes, reversed periods, optional core/date recovery
scoped by exact IDs and unit, sanitized failures and minimal projected fields.
Retained helper cases confirm the exact `bw_partner_ids` many-to-many type, bounded
partner-ID/name reads, overlapping memberships, foreign/unsolicited filtering,
and fail-closed denial, missing-name, duplicate and contradiction handling.
Normal catalogue loads confirm those reads are suspended. Organism cases verify
the exact `organism_id` many-to-one type, optional exact-ID links/name reads,
known empty relations versus source denial, malformed/incomplete/conflicting
evidence, discarded unsolicited records and dynamic changes to membership,
body names and project catalogues across refreshes. No static mapping is used.

`tests/unit-dico.test.js` exercises the Browser/CommonJS renderer and pure
timeline calculations: exact IDs, safe literal names/warnings, immutable input,
stable ID colors and ordering, independent readable endpoint bounds, inclusive
one-day/leap-day bars, absent/invalid/reversed dates without fabricated
geometry, and adaptive axis density over short and long spans. Year-2999 ending
checks cover exclusion from both bounds and all chart controls, adjacent-year
retention, unchanged selectable catalogues and an explicit all-excluded calendar.
DOM fixtures
check the named native-radio grid before the calendar, optional bounded raster
photos and initials/error fallbacks, name/bar selection callbacks, exact dates,
explicit empty/loading/error/retry states and radio/timeline/action focus
restoration. These fixtures do not read private configuration or contact Odoo;
executed checks are recorded separately in Current State.
Additional deterministic cases cover Brussels winter/summer midnight, strict
completion before today, inclusive marker geometry and out-of-range dates.
Mocked viewport observers verify individual reveals, unchanged clickable
geometry, no replay, cleanup/late-callback protection and reduced-motion or
unavailable/throwing-observer fallbacks. Dashboard controller fixtures check
Unit observer cleanup before project detail and tab departure.

Monthly concurrency fixtures check actual within-month maxima rather than all
projects touching a month, inclusive shared-date overlaps, leap/partial months,
zero gaps and future counts. They also cover exact-ID deduplication, catalogue
exclusions, incomplete/reversed-period disclosure, unavailable versus known zero
and the 2,400-month bound. DOM cases compare both charts' bounds/ticks/today,
step area geometry and table values; pointer/tap details, roving arrows/Home/End,
Escape, month focus restoration and synchronized-scroll cleanup are exercised.
The shared personal calendar is checked to omit the Unit/programme concurrency
chart.

`tests/unit-dico-http.test.js` runs the real server against an isolated fake RPC
source. It checks authentication/origin/method/JSON guards before source calls,
authenticated assets and unserved service code, exact fixed-department/session
visibility despite caller overrides and disabled steering, pagination beyond
1,000 projects, optional dates/managers, exact-ID date recovery, sanitized
critical failures and reauthenticated UID mismatch. Calls are checked for
read-only methods. Financing-body fixtures additionally verify caller-map
rejection, exact visible project links, bounded `res.partner` IDs,
name-permission failure, catalogue preservation and changed memberships/names
on the next catalogue request. No hours or financial models are read for the catalogue.

Unit controller cases in `tests/sticky-scope.test.js` cover lazy catalogue
loading/cache, fixed response identities, working retry and obsolete fetch
tokens; unit-only Hours/Budget selection, independent personal membership,
local year/custom-date recalculation and per-project inclusion/financial/monthly
preferences. Back restores the unit radio, and top-level navigation tears down
the source detail host. Refresh preserves a still-valid selection, replaces
detail generations and clears projects absent from the new catalogue. Pending
unit refresh followed by personal selection restarts the active detail and
rejects its old response; reentering Unit DiCo after personal refresh restores
missing Hours/Budget data without rereading its cached catalogue.

## Fixed programme selector

```powershell
node --test tests/programme-service.test.js tests/programme-http.test.js tests/odoo-read-only.test.js
node --test tests/programme-browser.test.js tests/project-card.test.js tests/project-browser.test.js tests/unit-dico.test.js tests/sticky-scope.test.js
```

Offline service/HTTP cases cover exactly DC1/DC2/DC3, approved responsible-name
variants, unique/ambiguous normalized identities, fixed exact-name domains,
exact-ID photo reads, missing/denied metadata and images, safe raster decoding
and secret non-disclosure. HTTP fixtures check strict `{}` input, methods,
origin/authentication, same-UID reauthentication, session-visible records,
protected browser assets and the unserved service. Only guarded `res.users`
reads occur; no real configuration or Odoo is accessed. The combined backend
programme and read-only-guard run passed **25 tests** on 2026-10-11.
This result predates the subsequent per-programme project catalogue.

Renderer cases cover fixed response identities/order, rejection of replacement
labels or wrong-person portraits, default initials, both safe-photo faces,
front DC-only text, catchphrase/code/manager/italic-subtitle back content and
custom native descriptions without project dates/budgets. Native selection,
focus redraw, malicious labels, nonblocking loading/error and retry are covered.
An additional retry-focus regression checks the focusable pending action,
duplicate-click guard, retained failure focus and selected/first-radio focus
after success; all **9 renderer cases** pass.
Controller fixtures verify immediate fixed choices, lazy empty-payload reads,
in-flight deduplication and page cache, date/legacy-scope independence, canonical
DC selection with a separate membership fetch, retry preserving choices/loaded
portraits, malformed catalogues and obsolete-response rejection.

On 2026-10-11, initial programme/shared-card/controller verification passed
**211 targeted frontend tests** before the retry-focus refinement. The final
full offline `node --test` run after that refinement passed **627 tests**, with
no failures or skips, in about 25.9 seconds. That run predates the following
per-programme project-view iteration.
Temporary loopback fixtures initially hit sandbox `EACCES`; a permitted rerun
outside that tool sandbox passed without requiring Windows administrator rights.
Fictional browser checks at 1280px and 390px confirm exactly three equal cards:
230px in three desktop columns and 210px in one phone column. Six front/back
portraits load; fronts show only DC codes, and backs show the approved
catchphrase/code/responsible/italic-subtitle content with white/black type and
the shared colored flip effect. Native DC2 selection survives Mon temps/tab
navigation. Content fits inside the phone cards with no horizontal document
overflow or warning/error logs. Actual coarse-pointer/reduced-motion behavior
remains source-reviewed rather than viewport-emulated. These results do not
establish live portrait permissions or business-source correctness.

Subsequent project service/HTTP fixtures cover fixed 10/8/5 business-code lists,
strict eight-digit bracket/prefix matching, display-only codes, foreign and
duplicate/conflicting records, canonical programme input, exact-ID optional
dates/full budgets, session visibility and missing/ambiguous/partial coverage.
They verify no unit/employee/year filter, unfiltered fallback or invented
projects. The separately confirmed `in-beTwin` business code is `56261849`;
broader live programme membership remains unverified.
Controller/DOM cases check persistent upper programme cards, correctly named
lower project/calendar/concurrency sections, choice switching replacing all
lower content, per-programme caching/deduplication, active-choice and
stale-entry guards, malformed identity rejection, error/retry/refresh and exact
membership-only Hours/Budget detail with Back focus. Shared chart fixtures
retain labels, lifetime geometry, monthly maximum-overlap calculations and
observer/scroll cleanup.

For this subsequent membership view, the backend run passed **38 tests**.
Shared catalogue loading-focus regression checks passed **52 Unit renderer
tests**, including focusable pending refresh/retry controls and duplicate-click
guards. The earlier **160 targeted frontend** and **647 full-suite** results
predate that final loading-focus refinement.
The 2026-10-11 final full offline `node --test` run passed **648 tests** with no failures
or skips in about 27.6 seconds. Independent review found no remaining
actionable issue.
Fictional desktop checks selected DC1/DC2/DC3 and matched the fixed 10/8/5
memberships. The same three upper cards remained visible, lower project and both
chart headings/counts switched together, and both charts retained a common
full-lifetime date scale. The shared Hours view opened from eXtRAI and Back
restored its native project-radio focus. At 390px, programme cards stayed 210px,
project cards 112px and 746px chart content scrolled within its 316px container
without horizontal document overflow. Actualiser focus remained on its control
after a real browser response. Syntax/local-link/diff checks pass. These checks
use fictional fixtures except the targeted in-beTwin code confirmation; they do
not establish broad live membership or portrait permissions.
The workspace server was restarted with a hidden standard-user Node process
to load the route: welcome returned 200, anonymous session/programme-project
requests returned 401 and stderr was empty. Temporary preview listeners,
fixture folders and the browser tab were cleaned up. No Git mutation occurred.

## Project finance panel

```powershell
node --test tests/project-finance.test.js tests/project-finance-http.test.js tests/project-budget.test.js tests/sticky-scope.test.js tests/project-browser.test.js tests/auth.test.js
```

The budget pure/DOM fixture covers signed positive/negative axes, common exact
currency scales, isolated unknown currencies, zero versus unavailable amounts,
convention macro/source distinction, recorded lifetime cost without billed-total
double counting, exact-ID rubric matching and unassigned personnel costs. It
also verifies explicit multiple-convention selection, future/repeated annual
years, distinct expense/income/adjustment rows, independent annual measures,
partial/reconciliation notices, out-of-date/unvalued-hour disclosure, safe text,
retry, detail expansion/focus and immutable source DTOs.

BW personnel renderer cases cover the default expense-only comparison, restoring
full lifetime totals/rubrics with retained checkbox focus, the French checkbox
label, and immutable source values. The unchecked convention reference uses
selected personnel line allocations rather than the separate macro estimate;
the bar, ratio and balance share that adjusted budget. Cases cover restoring
the full reference, signed/zero allocations, retained Ormit/external supplier
budgets, exact source Boolean precedence, missing/duplicate IDs, unknown
classification or currency, mixed currencies and incomplete allocation totals.
The macro-only fallback requires known monetary personnel and convention values
and confirmed currency. Unverifiable filtered references show an unavailable
notice. Other cases cover same-ID supplier expenses under a hidden personnel rubric, independent
unmapped/out-of-period evidence, missing-projection unavailability and per-basis
currency/partiality. Annual cases permanently omit confirmed personnel totals,
code companions and details across both checkbox combinations, preserve source
DTOs and exact-label/Boolean precedence, and retain external/Ormit/unknown
categories. Known personnel-only sources become zero after exclusion; missing
source totals, currency or retained monetary values remain unavailable.

Annual refinements cover exact-category/currency code grouping, shared code
colors and signed scales, companion amounts larger than net totals, thin-bar
keyboard/tap details and Escape handling, contained scrolling and axis-label
collisions. Supplier exclusion tests preserve allocations/pending/balances,
keep missing filtered values unavailable, retain focus and remove only confirmed
all-five-zero detail rows.

Bill drill-down cases verify exact financial-ID grouping, signed credits,
distinct allocations of one document, duplicate/overlapping entries, source
currency conflicts, unavailable/empty/partial lists, verified supplier filtering
and exact-zero unknown-supplier handling. Native-dialog fixture cases cover
safe literal descriptions, focus containment, Close/Escape/cancel/backdrop,
rerender cleanup and exact-trigger focus return. ProjectBrowser integration
also opens the real budget renderer from a financial fixture and verifies modal
cleanup before refresh or Hours navigation.

Controller/project-renderer cases cover the default Hours view, remembered
Heures/Budget choice, lazy independent exact-project finance cache, in-flight
deduplication, wrong-project/stale-generation rejection, refresh/retry, hidden
year controls and year-independent selected budget view. Hours preferences and
their cache remain separate. BW personnel controller fixtures cover the unchecked
default, exact boolean validation, per-project memory, finance-refresh retention,
independence from hours/Ormit/date/convention settings and no request on switching.
Authentication fixtures check that budget assets
and the finance route require a session and that the service source is not served.
All automated data is fictional; these checks do not establish live financial
completeness.

`tests/project-finance.test.js` uses a synthetic fixed-model RPC fixture to
verify exact project/account/reference scope and read-only methods, independent
source failures, all versions/future years, signed and unavailable measures,
expense/income/adjustment reconciliation, posted expenses and monetary hour costs,
exact units/categories, metadata-bound currencies/conflicts, source deduplication, out-of-period
inclusion and sensitive-field omission. It makes no live Odoo calls.

Expense-only lifetime fixtures independently verify posted expenses, exact
rubric totals and unmapped costs, signed credits, supplier invoices with
employee/Hours dimensions, and per-basis currency/status/out-of-period evidence.
Excluded personnel currency or missing costs cannot invalidate an otherwise
verified expense basis. Genuine unknown classification, unreadable expense
money/currency, invalid dates and inaccessible/shared sources remain partial or
unavailable. Personnel-category fixtures exercise exact normalized labels,
optional displayed codes, readable unrelated/external-service labels and
unavailable labels without code-based inference or additional RPC methods.

Supplier fixtures additionally verify canonical commercial roots, misleading
display/contact names, unavailable/contradictory supplier identities, exact
child periods and signed credits, zero/missing amounts, annual billed
reconciliation, scoped confirmed-purchase absence and unavailable outstanding
Ormit commitments. Future cost records remain available to annual comparisons
without changing lifetime's today cutoff or hour-unit coverage.
Bill fixtures additionally cover optional exact financial description reads,
missing/denied/changed descriptions, inaccessible monetary sources, child periods,
duplicate categories and conflicting entries. Personnel, payments, draft and
foreign-scope descriptions are excluded.

`tests/project-finance-http.test.js` runs the server against an isolated fake RPC
source to verify authentication/origin/method checks, early ID validation,
session identity and ignored caller overrides, exact project/account scoping,
pagination, eligible allocated bill descriptions and privacy, safe asset serving
and sanitized source faults. No live credentials
or private config are used.

## Syntax and configuration

`tests/project-monthly.test.js` covers exact project/employee/resource identities,
duplicate labels, signed monthly reconciliation, continuous zero months,
inclusive Brussels cutoff, leap/calendar days, partial first/current months,
actuals after project end, unknown/invalid dates, precise convention allocation,
cumulative signed prefix sums and convention plateau, and unavailable source
states. Individual planning fixtures cover full inclusive-project slot clipping,
future allocations, source precision, daily linear reference/plateau, exact
employee precedence, unique/ambiguous resource ownership, unmapped resources
with incomplete employee metadata, malformed/unresolved identities, duplicate names,
accessible zero versus unavailable planning, invalid matching slots and
Ormitter inclusion. Chart DOM/controller cases cover matching bar colors, separate positive
and negative stacked areas, thick signed total/independent dotted reference,
synchronized inclusion and per-project monthly/cumulative choices, local year
independence, keyboard/tap details and safe text. Employee-filter cases cover
selected solid actual/dotted planned lines with no project total/convention or
areas, selected-only details/table, known-zero/unavailable messages, exact-ID
name buttons and reset, focus retention, per-project selection, exclusion/stale
identity clearing and no additional fetch. Reveal revisions change for
real mode/inclusion/employee switches and stay fixed for unchanged selections and year
updates. The script follows the existing authenticated static-asset boundary
and is copied into isolated fixture runtimes.

```powershell
node --check server.js
node --check personal-time.js
node --check unit-dico-service.js
node --check unit-dico.js
node --check project-monthly.js
node --check project-browser.js
node --check project-budget.js
node --check project-finance-service.js
docker compose config --quiet
```

Inline JavaScript in index.html and login.html can be parsed with Node vm.Script. Syntax checks do not validate rendering or data calculations.

## Manual checks

## DiCo steering checks

Run `node --test tests/steering.test.js tests/steering-http.test.js` for calculations, scope gates, optional-source denial, Progress/WP reconciliation, separate financial periods, programme anomalies and authenticated user isolation. Optional `tests/steering-browser.js` checks desktop/mobile navigation, tabs, leader focus, filters, refresh, errors/retry and overflow using labelled fictional fixtures; see [test setup](PILOTAGE.md#implementation-and-verification).

## Additional manual checks

- Verify welcome-page layout at desktop and mobile widths, field labels, keyboard focus and password visibility toggle.
- In a selected project, switch Heures/Budget and check remembered choices, hidden year controls, retained Hours settings and retry/focus. Inspect convention macro fields versus the selected source; multiple versions must require a choice. Confirm posted expense/time costs are counted once, unmatched costs remain visible, incomplete sources are disclosed and incompatible currencies cannot imply a ratio. Compare all annual years/versions with shared compatible-currency axes and three separate bars, including signed corrections and zero/unavailable values. Check expense versus income/adjustment tables, source statuses, one-second gradient fills, reduced motion and contained mobile scrolling.
- In **Budget · 01**, confirm **Afficher les coûts de personnel BW** starts
  unchecked and the **Budget conventionnel** bar excludes the selected
  convention's verified personnel allocation alongside the existing expense-only
  actuals. Check the matching ratio/balance and the **hors personnel BW** caption,
  then restore the full budget/costs with the checkbox. Raw macro cards, annual
  personnel exclusion and the separate Ormit supplier choice should retain their
  existing values. Test unavailable filtered allocations without a full-budget
  fallback and keyboard focus across rerenders.
- With fictional personal data, check Hors planning subtotals, Projets year scope, radio keyboard navigation, manager-photo fallbacks and return focus. Selection should load one exact-project response and show personal/all-employee pairs with 75% planned bars and linear date ticks; year changes should make no additional request. Check unknown planning, signed credits, consultant warnings, retry and asynchronous focus. Mon temps · 02 remains hidden.
- Open the third **Unit DiCo** tab with fictional projects, including archived,
  zero-hour, Interne/Overhead and incomplete-date cases. Check the compact manager
  radio grid, full-life earliest-start/latest-end calendar, exact dates, matching
  project colors and notices without invented bars. Select by radio, name and
  duration bar; check the shared Heures/Budget view and Back focus. Switching
  tabs or personal year/custom-date scope must retain independent unit selection
  and full-life overview membership. Verify refresh/retry, keyboard controls,
  contained timeline scrolling and readable sticky names at desktop/mobile widths.
- Open the far-right custom range control, use both native calendars, and check inclusive dates, automatic application, invalid/incomplete edits preserving the prior valid view, Escape/outside dismissal and date-field focus after rerenders. Confirm active-range captions, unpressed year chips, selecting a year and restoring remembered years. Check exact same-day, leap-day, DST and cross-year ranges in both personal views, no activity keeping a project out of the grid, empty data, and no additional hours request. Compare the below-plan label with the full displayed plan; changing dates must leave lifetime/monthly/budget periods independent. Check desktop/mobile layout and horizontal overflow.
- Check the project-only Ormitter checkbox starts unchecked and appears for full-history nonzero hours or confirmed assignments, even outside selected years. Toggling it should update both project comparisons and the stacked-area chart without a request, preserve focus and leave Mes heures unchanged. Check stacked contributor totals/colors, photo/name bubbles inside wide bar segments and avatar-only bubbles on narrower ones, the always-visible keyed list at mobile widths, signed negative net-bar explanations and safe photo fallbacks.
- Check the third convention pair retains the full project-date caption, actual total and date tick when selected years change. Confirm actuals exclude dates outside the project and after Brussels today. With an empty/nonpositive budget, verify the MIS message; with an unreadable field, verify the unavailable-field message. Both cases omit the upper row and retain a distribution-only lower bar without a tick. With invalid dates, verify unavailable actuals. Check the smaller title and thinner bars at desktop/mobile widths, including actual-only callouts and comparison-specific contributor focus.
- Check the four project macro cards: convention, actuals since start through today, remaining planning including TH, and signed `actual + remaining - convention`. Change years and graph Ormitter inclusion: the macro must retain its fixed no-Ormitter cohort. Verify the future start note, bold orange TH share, post-end actuals, closed-project future zero and missing-input notices. Compare Brussels/DST endpoints and confirm only continuous calendar-month staffing gaps alert, with exact dates and native details. Short final-day gaps must not alert or imply complete coverage. Inspect four/two/one-column layouts and retained disclosure focus without extra reads.
- Check the area chart starts in **Par mois** mode and the **Cumulé** control sits beside the conditional Ormitter checkbox, remaining available when there are no Ormitters. Positive employee areas should add up to the thick total; signed credits should stack below zero while the total stays net. Verify monthly/cumulative exact values, retained employee colors, convention as its own dotted line and its cumulative plateau after project end. Both control switches should replay the shared one-second reveal; year chips, resizing and unchanged rerenders should not. Check per-project remembered mode, keyboard/touch details, table values, reduced motion and desktop/mobile overflow.
- Click an employee name to show only that employee's solid actual and dotted planned reference in either mode. Keep all names clickable; switch employees and restore all with a second click or **Tous les employés**. Check selected-only month details/table, retained colors/focus, linear reference using full-project planned hours rather than convention, zero versus unavailable planning, replay on selection changes, per-project memory, and reset when the selected Ormitter is excluded. These actions should use cached data and leave all three bars unchanged.
- With a real Odoo account, sign in, test the connection, fetch employee/project data and sign out. Confirm Odoo permissions and authentication settings.
- Check session-cookie behavior behind the actual HTTPS reverse proxy.
- Build and run Docker separately when container behavior needs validation.
- Check Unit DiCo timeline rows measure approximately 25px and full names/dates
  remain available in tooltips/accessible labels. Ended projects should be grey,
  projects ending today stay colored, and the black dotted today line aligns
  across the axis and tracks without intercepting project selection. Verify
  each bar's 0.5s fill on vertical and horizontal reveal, including bars initially
  beyond the phone viewport, reduced motion and contained horizontal scrolling.
- Below the Unit calendar, check **Unit DiCo · 03 / Projets simultanés** uses the
  identical lifetime scale with monthly maximum counts and a zero baseline.
  Disjoint projects in one month must not imply overlap. Check zero gaps,
  partial-coverage/unavailable notices, future months, tooltips by hover/focus/tap,
  arrows/Home/End/Escape and the expandable monthly values table. At desktop/phone
  widths, confirm matching date positions and horizontal scrolling in either chart
  moves the other; navigation and rerenders must release old listeners. Personal
  scope changes must leave this Unit chart unchanged.
- In personal, Unit and programme-associated project grids, check white
  backgrounds, black type, manager portraits and bold unbracketed short titles
  with a turquoise underline. Hover/focus should trace the `#00bfb6` SVG outline
  in 650ms and reveal the mini portrait, unbracketed source number, full title
  and visible start/end dates, without a flip or moving color orbs. Leaving
  restores the front without sibling filtering. Check long-title clamping,
  empty source-code fallback, explicit missing managers/dates in FR and NL,
  wrapping unknown date values and image-error initials. Native radios remain
  stationary/selectable from either face, retain Back/focus behavior and expose
  one description with the manager, dates and budget; budget stays outside the
  visible details. Verify equal desktop heights (190px personal, 112px Unit)
  and no page/card overflow. On touch/no-hover devices projects show the front
  and details together with a minimum 190px height, including at narrow widths;
  reduced motion makes hover/focus changes immediate. Browser checks must
  distinguish viewport sizing from media capabilities: a fixture that forces
  coarse-pointer/reduced-motion rules is a synthetic media-rule exercise, not
  evidence from a real touch device or emulated operating-system preference.
  Project circles should be visually absent while Tab/arrow selection, whole-card
  clicking and Back focus still work; the three large programme circles remain
  visible.
- Open Programmes with legacy steering disabled: all three DC choices must
  remain available while portraits load, fail or retry. Check fixed subtitles,
  catchphrases and responsible names, safe portraits/initials and absence of
  project dates/budgets in programme descriptions. Fronts show only the DC code
  and portrait; backs reuse the white animated colors with the catchphrase
  badge, code, responsible and italic one-line subtitle. Desktop cards are
  230px in three columns; up to 700px they are 210px in one column. Check native
  radio selection/focus, retained choice after tab navigation and explicit flip
  variant isolation from project cards. The programme touch/no-hover fallback
  retains both faces at twice its fixed height; reduced motion removes the
  flip, border rotation and orb animation. Before
  choosing a programme, only these three cards appear. Choose each DC and
  verify its fixed associated project cards, lifetime timeline and monthly
  concurrency chart below, with every lower section replaced on a DC change.
  The top three cards remain visible. Check source-coverage notices for
  missing/ambiguous matches, exact member selection into Hours/Budget and Back
  focus, refresh/retry and late-response handling. Overview membership and
  lifetimes ignore personal period scope; Hours detail retains its existing
  scoped behavior. Verify no page/card overflow and the shared
  touch/reduced-motion fallback separately from viewport sizing.

## Current coverage and gaps

The welcome page was visually inspected at desktop/mobile widths, including the visibility toggle; mobile horizontal overflow was checked. The personal macro has dedicated calculation/DOM fixtures alongside authenticated HTTP and dashboard integration tests. See [Current State](../ai-context/CURRENT_STATE.md) for the latest executed checks.

There is no dedicated lint/typecheck setup or CI workflow. Legacy XLSX parsing and charts do not have comprehensive regression coverage. Live Odoo, real-account browser login, data imports and Docker build/runtime are not validated by these synthetic suites.

## Refresh

- Last refreshed: 2026-10-26
- Tag source basis: tests/project-tags.test.js, tests/project-description.test.js,
  tests/project-tag-scan.test.js, tests/project-tags-data.test.js,
  tests/project-tags-enrichment.test.js, tests/project-tag-view.test.js and
  tests/project-similarity.test.js, tests/project-similarity-physics.test.js.
- Purchase source basis: project-purchase-service.js, project-purchase-flow.js/css,
  project-finance-service.js, project-budget.js, project-browser.js,
  tests/project-purchase-flow.test.js and finance/budget/project integration tests.
- Additional source basis: tests/i18n.test.js, tests/language-client.test.js,
  tests/language-preferences.test.js, tests/language-preferences-http.test.js,
  tests/dashboard-language.test.js, tests/personal-superwide.test.js, tests/project-hour-usage.test.js,
  tests/project-hour-usage-ui.test.js, tests/unit-dico.test.js and tests/steering.test.js.
- Source basis: tests/personal-time.test.js, tests/personal-recommendations.test.js, tests/personal-personnel-budget.test.js, tests/project-planning.test.js, tests/project-planning-service.test.js, tests/project-planning-http.test.js, project-planning.js, project-planning-service.js, tests/project-card.test.js, tests/programme-browser.test.js, tests/programme-service.test.js, tests/programme-http.test.js, tests/unit-dico-service.test.js, tests/unit-dico.test.js, tests/unit-dico-http.test.js, tests/project-monthly.test.js, tests/project-browser.test.js, tests/project-budget.test.js, tests/sticky-scope.test.js, tests/auth.test.js (including local config-login/manager/contributor/assignment/lifetime/finance fixtures), server.js, project-card.js/css, programme-browser.js/css, programme-service.js, unit-dico-service.js, unit-dico.js/css, project-finance-service.js, personal-time.js, project-monthly.js, project-browser.js/css, project-budget.js/css, index.html, login.html and Docker configuration.
- Limitations: simulated authentication is not proof of compatibility with real Buildwise accounts.

## Merge verification (2026-10-06)

All 125 tests passed with node --test across auth.test.js, portfolio-ui.test.js, steering.test.js, steering-http.test.js, odoo-read-only.test.js, remaining-hours.test.js, sticky-scope.test.js, subcontractor-hours.test.js and subcontractor-roles.test.js. Legacy offline fixtures now instrument the authenticated bootstrap and support the crypto/session dependencies; read_group is tested as read-only. No live Odoo or Docker runtime verification was performed.
