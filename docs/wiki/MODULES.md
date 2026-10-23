# Modules

Chart palette additions (2026-10-23):

- [chart-palette.js](../../chart-palette.js): shared Browser/CommonJS palette
  state with frozen Dico vibes (fifteen colours, default), Classique (twenty
  colours) and Vibrant Emotions (ten colours) arrays, cyclic slot resolution, validated browser-local enum
  persistence, one-time read-only initialization and disposable subscribers.
- [tests/chart-palette.test.js](../../tests/chart-palette.test.js): exact palette
  order/cycling, frozen arrays, default/stored enum validation, isolated browser
  stores, blocked storage, no initialization writes and subscriber disposal.
- [index.html](../../index.html): native header settings disclosure, translated
  radio options and decorative palette previews, bounded panel placement above
  the sticky navigation/date bar while open,
  Escape/outside-pointer dismissal, and immediate repaint of legacy canvas
  monthly/cumulative/comparison person lines and their existing line legend.
  Pie/bar colours and loaded source data remain independent.
- [project-browser.js](../../project-browser.js): stable exact-ID ordinal slots
  resolve through the current shared palette for actual/planned areas, person
  lines, legend samples, avatar borders and tooltip dots. Mounted SVG styles
  and attributes update without replacing controls, pinned details, open tables,
  geometry or animation state; existing cleanup releases subscriptions.
- [unit-dico.js](../../unit-dico.js): Unit/programme concurrency line and gradient
  stops follow the selected palette's first hue at the existing opacities.
  Attribute-only updates preserve chart interaction and calendar colours;
  palette disposal joins viewport/scroll cleanup, including obsolete callbacks.

Project-tag snapshot additions (2026-10-22):

- [project-tag-view.js](../../project-tag-view.js): pure, fail-closed projection
  of saved tags to exact session-visible unit project IDs and the configured
  source namespace. Only used FR/NL definitions, tagged IDs and timestamp leave
  the server; source narratives and provenance stay local.
- [project-similarity.js](../../project-similarity.js) and
  [project-similarity.css](../../project-similarity.css): Browser/CommonJS weighted
  exact-tag graph, deterministic particle layouts, weighted communities, soft regions,
  hover/focus details, native relation controls and explicit project selection.
  The pure `layout(model, {groups, recordFrames})` solver returns positions,
  labels, regions and optional independent settling frames. Programme groups
  add persistent attraction centres; Other nodes retain weaker central gravity.
  Bounded collision relaxation and glyph-aware label placement use the chart
  width; dashed noninteractive guides connect displaced labels to their bubbles.
  Pointer leave restores normal graph opacity while retaining detail actions;
  cleared emphasis is included in captured state for cached/language rerenders.
  A localized used-tag explorer sorts by visible-project frequency descending
  (localized label/ID ties) and lists exact related projects in the 345px
  desktop info panel; selected tag, disclosure and native tag/result focus are
  captured separately from project/relation exploration.
  A native theme/programme switch retains a target layout for each mode and
  interpolates existing bubbles and link endpoints between them. Bubble fills
  match the active region palette; overlapping programme memberships use a
  segmented gradient. Captions, member-count legends and moving member hulls follow
  the active grouping without changing tag evidence or link weights.
  Initial settling and replay use sampled physical frames over 2.2 seconds;
  mode transitions take 850ms. Cloud points follow every frame and their opacity
  increases during settling; labels and guides fade in during the final 20%.
  Physical playback allocates time by cumulative maximum particle displacement
  and smoothstep easing, preventing the final collision pass from snapping.
  Native animation-frame scheduling respects reduced motion and cancels retired
  callbacks/media-query listeners during cleanup. Retained ready/mode/focus state
  prevents a cached or language rerender from replaying the initial settling.
  Unit-only opt-in in `index.html`/`unit-dico.js` places it before calendar 02;
  nested cleanup and state capture preserve cached/language rerenders.
- [data/project-tags.json](../../data/project-tags.json): shipped canonical tag
  definitions and per-project frozen completion/provenance records, including
  separately reviewed Buildwise public-source enrichment and per-tag evidence.
- [project-tags.js](../../project-tags.js): pure catalogue validation, namespaced
  lookup, completion checks and merge that preserves completed projects. Verified
  public provenance must cover every tag before a missing-description row can
  acquire tags; original Odoo source-quality fields stay separate.
- [project-description.js](../../project-description.js): nonexecuting HTML
  cleanup and bilingual summary extraction; meaningful-character quality checks.
- [project-tag-scan.js](../../project-tag-scan.js): injected-read unit-206 scan
  preparation, permanent-completion skip before version reads, exact ownership
  and latest-version selection with explicit unavailable results.
- [scripts/scan-project-tags.js](../../scripts/scan-project-tags.js): manually
  invoked private-config CLI using the server's unchanged read-only RPC guard
  with HTTP startup stubbed. It writes local pending reports, never the catalogue.
  See [workflow](../../data/README.md); no production route or tag display is added.

Purchase-budget additions (2026-10-21):

- [project-purchase-service.js](../../project-purchase-service.js): optional,
  exact-project supplier-invoice/credit-note projection, strict document/state
  and date eligibility, signed allocations, both category identities and narrow
  description enrichment. Only existing guarded read adapters are used.
- [project-purchase-flow.js](../../project-purchase-flow.js) and
  [project-purchase-flow.css](../../project-purchase-flow.css): Browser/CommonJS
  purchase model and native SVG renderer, separate currency/correction diagrams,
  single-ribbon focus/hover, bounded tooltips, complete accessible table and
  a top-left expand control with a native dialog, proportional width/height fit,
  shared physical diagram scales and resize/restore cleanup. Inline and expanded
  layouts always retain one right-hand purchase stack with direct code-to-purchase
  curves. Fullscreen fits the existing SVG without changing its geometry, nodes,
  paths, gradients or heading count.
  Right-hand labels use a bounded SVG foreignObject flex row with an ellipsized
  name and intact inline amount. Per-diagram spacing (18 to 2 units), then font
  size (10 to 8 units), adapt toward twice the left connector/text extent.
  Collision-aware label frames retain clearance; minimum sizes allow overflow
  without changing ribbon thickness. Differently coloured endpoints receive unique SVG gradients.
  Missing codes share an explicit middle bucket; a square hide/show control
  retains graph state and survives parent cached/language rerenders.
  Right-hand full-name groups and code-to-name ribbons sum allocations while
  retaining raw detail rows; mixed-code nodes receive matching input gradients.
  Complete monthly NF/FK labels share a stable family key by exact initials;
  cross-month groups display the chronological earliest/latest label months.
- [tests/project-purchase-flow.test.js](../../tests/project-purchase-flow.test.js):
  offline model, geometry, interaction, language, missing-data and cleanup cases.
  Existing finance source/HTTP and budget/project renderer suites cover source
  privacy, eligibility, insertion, independent controls and navigation lifecycle.

Project-hours milestone additions (2026-10-21): `index.html` independently caches
exact-project milestone reads; `server.js` restricts that path to verified
project relations. `project-browser.js`/`.css` render solid black dated overlays,
a compact lower axis with measured 9px two-line titles at -30 degrees, a caption
below the names and crowding lanes packed from per-line projected bounds with
6px gaps, month-tooltip evidence and compact accessible lists in both hour charts.
[tests/project-milestones-chart.test.js](../../tests/project-milestones-chart.test.js)
covers strict visible dates, partial/leap/single months, safe labels, optional
sources, rotated footer bounds/crowding, preserved plot dimensions and
project-wide markers across chart controls and FR/NL rerenders.

Both monthly hour charts share a private twenty-colour exact-ID allocator
separate from horizontal bar colours. Areas, selected-person/reference lines,
legend samples, avatar borders and tooltip dots share each assignment, with
successive new identities looping through the ordered palette. Fixed total, convention,
dated-planning and milestone styles are independent.

| File or directory | Responsibility |
| --- | --- |
| [i18n.js](../../i18n.js), `i18n-*-messages.js` | Shared FR/NL keyed catalogues, named-placeholder/source-alias validation, runtime locale formatting and explicit application-message translation. Source names and descriptions remain original. |
| [language-client.js](../../language-client.js) | Welcome/dashboard preference bootstrap, static keyed text/ARIA attributes, immediate locale event, ordered saves and localized persistence feedback. |
| [language-preferences.js](../../language-preferences.js) | Fixed-path language-only config read/merge/create, guarded temporary rename, invalid-file/symlink/conflict refusal and sanitized save errors. |
| [tests/i18n.test.js](../../tests/i18n.test.js), [tests/dashboard-language.test.js](../../tests/dashboard-language.test.js), [tests/language-client.test.js](../../tests/language-client.test.js) | Catalogue/parity/source-alias and formatting checks; preference bootstrap/save ordering; cached locale repaint preserving scope, selections and controls. |
| [tests/language-preferences.test.js](../../tests/language-preferences.test.js), [tests/language-preferences-http.test.js](../../tests/language-preferences-http.test.js) | Language-only config creation/merge and credential preservation; invalid/read-only/conflicting target handling; public-read/authenticated-write, origin/method/body/privacy/no-RPC checks. |
| [work-capacity-service.js](../../work-capacity-service.js) | Optional exact-own calendar, global closure and approved paid annual entitlement reads; strict source evidence and explicit future missing/denied states. |
| [work-capacity.js](../../work-capacity.js) | Shared pure annual/custom work-capacity calculation, interval unions, calendar timezone/week parity, future current-year fallback and explicit estimates. |
| [personal-capacity.js](../../personal-capacity.js), [personal-capacity.css](../../personal-capacity.css) | Scoped available/planned hour cards and persistent accessible year-by-year calculation details. |
| [login.html](../../login.html) | Buildwise welcome page, email/password form, visibility toggle and authentication error messages. |
| [assets/buildwise-logo.svg](../../assets/buildwise-logo.svg) | Official Buildwise logo extracted from its public SVG sprite. |
| [tests/portfolio-ui.test.js](../../tests/portfolio-ui.test.js) | Frontend tests for zero-hour portfolio rows and unknown planning values. |
| [tests/auth.test.js](../../tests/auth.test.js) | Isolated HTTP/XML-RPC authentication integration tests using the Node test runner. |
| [index.html](../../index.html) | Inline connector/import UI, dataset conversion, French/Dutch presentation, always-visible native Normal/Large header switch with a shared browser-local standard/wide preference, legacy auto migration and one 1600px threshold. Wide layouts apply only to Mon temps and selected personal Project Hours; other views retain normal width with neutral localized status. Presentation attributes and mounted-SVG resize preservation retain loaded controls. Also owns year/custom-date filters, legacy charts/tables, cached personal recommendations and live local tolerance, personal/project/lifetime hour summaries, separate Unité DiCo catalogue and selection, persistent Programmes cards with independent portrait/per-programme project caches and stale-response checks, shared exact-project Hours/Budget detail caches/preferences, inclusive project-date clipping, exact-ID contributor reconciliation, local inclusion/monthly-cumulative/employee choices, stale-selection clearing and reveal revisions. |
| [personal-time.js](../../personal-time.js) | Browser/CommonJS personal ID aggregation, Brussels actual cutoff, selected UTC-year planning, per-year/project-calendar pace recommendations with source-plan reconciliation and unavailable guards, greatest-absolute-hour-gap ordering in Ralentir/Augmenter, persistent accessible tolerance controls, planned-first grouped legend/Hors planning subtotal, stable actual/planned metric attributes for CSS presentation, macro calendar/sector geometry, project-date-clipped scoped calendar reference, unique colors, SVG rendering and accessible local interactions. |
| [personal-time.css](../../personal-time.css) | Responsive personal macro/legend/tooltip styling, compact orange/green/black recommendation columns with bold colored underlined headings, natural wrapping, native slider/exclusion reasons, radial-sector hover/focus and reduced-motion behavior. The native header switch uses a dark rounded track, teal glow, moving thumb and visible keyboard focus. At 1600px and the active personal attribute, three existing hosts use nested grids for four visual columns: 30% narrower recommendations, 50% narrower capacity, the previous graph width and the remaining-space project legend. A compact pointer-transparent actual-then-planned summary shares the chart's grid cell, keeping the graph directly below the period and notes accessible. The graph card retains its tooltip containing box; only its body uses `display: contents`. Active wide mode uncaps the main container; the standard wrapper retains normal block flow. |
| [tests/personal-superwide.test.js](../../tests/personal-superwide.test.js) | Extracted real inline layout-controller tests for the native header switch, browser-only enum preference and legacy auto migration, inclusive 1600px threshold, media-query fallback, view containment, translated status and preservation of rendered personal controls/state, including the existing debounced resize path. |
| [tests/personal-recommendations.test.js](../../tests/personal-recommendations.test.js) | Synthetic yearly/custom/DST progress, tolerance boundaries, selected-day weekly targets, negative/unknown/out-of-project planning, future/ended periods, unplanned work, safe recommendation text and persistent native-slider/exclusion-detail accessibility fixtures. |
| [project-card.js](../../project-card.js) | Shared Browser/CommonJS native radio cards and nameParts/createTitle helpers. Project and programme presentations share a decorative SVG outline. Projects reveal a mini portrait, source code, full title and strict start/end dates; programme content retains its catchphrase, code, subtitle and manager without project fields. Safe raster portraits/initials, full-budget formatting and one native metadata description remain shared. |
| [project-card.css](../../project-card.css) | White/black bounded faces, turquoise underline and 650ms traced SVG outline on hover/focus, with visually clipped radios retaining native selection/focus/accessibility. Touch/no-hover cards show static front plus details at a minimum 190px height, respecting larger programme dimensions. Reduced motion removes transitions; dates can wrap. |
| [tests/project-card.test.js](../../tests/project-card.test.js) | Synthetic acronym/code/title parsing and fallback, explicit outline/programme content isolation, decorative SVG and native-radio preservation, safe portrait/error initials, strict localized visible dates, signed/zero/unknown/invalid budget, and literal text/description fixtures. |
| [programme-browser.js](../../programme-browser.js) | Browser/CommonJS fixed DC1/DC2/DC3 definitions, translated catchphrase presentation preserving canonical source labels, strict response-identity normalization, safe optional responsible portraits/initials, explicit programme content in shared outline cards, selection/focus preservation and nonblocking photo loading/error/retry. |
| [programme-browser.css](../../programme-browser.css) | Three-column 230px programme cards with larger portraits/type, selected outline and a one-column 210px layout at widths up to 700px; shared white/turquoise outline reveal, plain detail spacing, visible DC code, bold subtitle and responsible name. Touch/no-hover retains the same card height with a 40px portrait and compact spacing. |
| [programme-service.js](../../programme-service.js) | Fixed programme/responsible definitions and 10/8/5 business-code memberships independent of steering configuration; pure `createProjectMap` onto already-visible unit IDs sharing the exact/ambiguous matcher with selected-programme reads; exact-name responsible identity/photo enrichment; bounded project name/display-name code queries, exact-ID optional dates/full-budget reads and explicit missing/ambiguous/partial coverage. |
| [tests/programme-browser.test.js](../../tests/programme-browser.test.js) | Synthetic fixed-identity normalization, ordered front/back content, safe-photo and malicious-label handling, native selection/focus, custom non-project descriptions and loading/error/retry fixtures. |
| [tests/programme-service.test.js](../../tests/programme-service.test.js) | Offline exact responsible-name/photo scope and failure cases; fixed programme-code membership, strict code identity, foreign/duplicate/contradictory rows, canonical selection, optional date/budget recovery and honest coverage checks. |
| [tests/programme-http.test.js](../../tests/programme-http.test.js) | Isolated authenticated catalogue/assets, strict empty-body/method/origin guards, session-visible portrait scope, ambiguity/fallback, safe raster images, UID reauthentication and read-only RPC verification. |
| [unit-dico-service.js](../../unit-dico-service.js) | Fixed department-206 catalogue through guarded reads, exact department/ID postfilters, archived/zero-hour membership, precise Interne/Overhead exclusion, optional source dates and shared exact-ID full-convention budget/currency enrichment. |
| [unit-dico.js](../../unit-dico.js) | Shared personal/Unit/programme calendar with full/default or rolling +/-3-year views, inclusive clipped geometry, short left names/full accessible source names, stable colors and completed-last reveals. Unit/programme monthly concurrency shares the selected scale, clipped month maxima, known-zero/unknown distinction and synchronized scrolling; FR/NL controls preserve focus/cleanup. |
| [unit-dico.css](../../unit-dico.css) | Dense responsive 112px unit project cards with bounded faces and manager avatars, using the shared outline presentation and a 190px minimum touch/no-hover layout; 25px timeline rows, pronounced light-to-dark gradients with half-second reveals, grey completed bars and dotted today marker. The monthly concurrency area shares calendar gutters/contained scrolling, with a sticky count axis, month controls, tooltips and a bounded values table. |
| [project-monthly.js](../../project-monthly.js) | Browser/CommonJS actual history through Brussels today, dated planning overlays and full-project monthly/cumulative planned-area data including future-only people and explicit TH/resource buckets. Planned convention points use precise daily proration through project end, independent of employee/Ormitter filtering, with explicit budget availability. Exact identities, signed stacks/prefix sums, continuous months, independent unavailable sources, default consultant exclusion and individual dotted linear references are preserved. |
| [project-planning-service.js](../../project-planning-service.js) | Optional exact-project resource identities for project-hours: unique readable TH_ names identify collective placeholders independently of technical HR links and before positive slot employee IDs; metadata-confirmed relation cardinality, separate name/link recovery and immutable pre-enrichment person/TH/unlinked/unknown snapshots. Missing resource names keep business identity unknown without altering hours. |
| [project-planning.js](../../project-planning.js) | Browser/CommonJS fixed no-Ormitter actual/future/projection macro calculations, independent total actual-to-date gaps against dated planning and linear convention, plus nested `personalToDate` from exact own employee/resource IDs. Confirmed planning identity precedes technical fields; TH/unlinked resources are excluded personally and uncertain applicable own allocations remain unavailable. Brussels/DST overlap, signed guards and total TH share remain shared. Person coverage alerts only on calendar-month gaps; legacy lifetime totals/minus-TH fields stay compatible. |
| [project-browser.js](../../project-browser.js) | Localized project details and macro information, four primary metrics followed by three compact personal/planning/convention usage cards with independent availability, signed text, 0.005h balance tolerance and orange over-consumption; personal gradient overpointing, scoped project-actual employee exclusions with a hatched ignored subtotal, and independent actual/planning monthly filters. Presentation wrappers separate overview, bar comparisons, the existing actual/optional-planned monthly pair, plots and legends without replacing their controls. Monthly geometry and ResizeObserver checks retain the normal 1200px limit and opt into 4096px only for an exact selected personal Hours layout with an active wide ancestor. Resize notifications coalesce to the latest width for an animation-frame redraw; cleanup cancels pending work and retired callbacks cannot draw. The actual heading explicitly names today's cutoff. Planned convention curves remain project-wide in geometry/legend/details/table, with FR/NL availability notes. Actual details omit confirmed-zero tooltip people/table months while preserving signed/unknown/reference evidence, data, focus and chart lifecycles. |
| [project-browser.css](../../project-browser.css) | Personal project card sizing (190px, or 180px at phone width before the shared 190px touch minimum), centered portrait/short-title fronts and compact outline-reveal details; four/two/one-column rounded large-value project macro cards with orange TH/excess emphasis, followed by three text-only usage cards with 91.2/80/74px minimum heights and stacking at 520px; smaller selected title, 37.8px comparison bars, contributor bubbles/list/tooltips, readable monthly controls/details, synchronized area/line reveals, reduced motion and focus styles. Active wide personal Project Hours uses a fixed 528.75px overview with stacked macro/usage cards and 91.2px macro minimum heights, a 28px gap and top-row bar comparisons in the remaining space. The graph wrapper uses `display: contents` so the equal-width actual/planned monthly pair spans the full row below; a lone chart spans both columns. Compact 220px legends sit beside plots with contained scrolling. Normal-mode wrappers preserve the existing vertical flow and tooltip containing boxes. |
| [project-budget.js](../../project-budget.js) | Browser/CommonJS monetary panel, safe convention selection and lifetime/rubric comparisons; annual total/code clusters with shared signed exact-currency axes, stable code colors and shared exact-amount hover/focus/tap tooltips, including totals without category codes and keyed total-focus restoration; eager bill-allocation grouping/filtering/reconciliation, native dialog open/cleanup/focus, local exact-ID supplier exclusion, confirmed-zero row filtering and separate expense/income/adjustment tables. |
| [project-budget.css](../../project-budget.css) | Compact financial macro/total cards, convention rubric bars, 225px annual total/thinner code plots with contained scrolling, matching native-button focus styles, shared amount tooltips, supplier checkbox, responsive bill table/cards with sticky modal header, status badges, one-second gradient fills and reduced motion. |
| [project-finance-service.js](../../project-finance-service.js) | Fixed metadata-confirmed financial reads, exact project/account and budget identities, signed/null annual measures and recorded lifetime costs; canonical supplier/commercial-parent resolution, exact annual-line settlement/bill allocation reconciliation, isolated financial-ID description enrichment, independent confirmed-purchase evidence and explicit unavailable filtered commitments. |
| [tests/project-budget.test.js](../../tests/project-budget.test.js) | Fictional pure/DOM cases for signed geometry, exact currency/rubric identities, zero/unavailable/partial amounts, source selection, all annual years/versions, distinct income/expense totals, safe text, retry and focus/expansion. |
| [tests/project-finance.test.js](../../tests/project-finance.test.js) | Synthetic fixed-model RPC checks for scope, budget normalization/reconciliation, posted expense/time-cost classification, signed/null amounts, currencies, units, source failure and sensitive-field omission. |
| [tests/project-finance-http.test.js](../../tests/project-finance-http.test.js) | Isolated HTTP/fake-RPC authentication, origin/method/input guards, exact project/account/session scoping, pagination, eligible financial descriptions/personnel privacy, source-fault sanitization and authenticated assets. |
| [tests/project-browser.test.js](../../tests/project-browser.test.js) | Synthetic project radio/photo/focus, scoped/lifetime comparison geometry, shared Ormitter checkbox, contributor stack/breakdown, selected-employee actual/planned lines, zero/unavailable messages and selection/focus/reveal tests. Planned convention cases retain project-wide values across resource filtering, monthly/cumulative responsive bounds, future months, precise tables, dotted legends/tooltips and missing-reference notes; actual cutoff titles are checked in FR/NL. |
| [tests/project-planning.test.js](../../tests/project-planning.test.js) | Pure actual/future/projection macro calculations, post-end actuals, Brussels/DST planning endpoints, future TH shares, known-zero closed-project futures, calendar-month gap thresholds and signed/unknown guards, plus compatible full-life UTC/minus-TH fields and bounded long-project fixtures. |
| [tests/project-hour-usage.test.js](../../tests/project-hour-usage.test.js) | Independent raw personal/project cohorts, exact owner and immutable snapshot precedence, TH/unlinked exclusion, unknown ownership, zero versus unavailable, signed corrections, inclusive Brussels/DST proration, post-end actuals and finite-arithmetic guards. |
| [tests/project-hour-usage-ui.test.js](../../tests/project-hour-usage-ui.test.js) | Three usage cards' independent availability, stale/nonfinite delta rejection, signed over/under/balanced text and half-centihour tolerance, FR/NL rerenders, and independence from graph scopes/contributor filters. |
| [tests/project-planning-service.test.js](../../tests/project-planning-service.test.js) | Offline exact-ID resource ownership, linked/unlinked/contradictory technical employee lists, TH marker precedence over positive original slot owners, unknown resource-name attribution, source denials and no guessed negative employee link. |
| [tests/project-planning-http.test.js](../../tests/project-planning-http.test.js) | Isolated authenticated project-hours identity DTO, snapshot-before-legacy-enrichment, optional metadata/field denial and resource/employee scope preservation. |
| [tests/unit-dico-service.test.js](../../tests/unit-dico-service.test.js) | Offline fixed unit-field/department scope, exact project identities, archived/zero-hour membership, pseudo-project filtering, strict optional dates/recovery and sanitized source-failure fixtures. |
| [tests/personal-project-dates.test.js](../../tests/personal-project-dates.test.js) | Offline personal catalogue date metadata/type validation, exact-ID projection, field-denial recovery, strict dates and full-handler preservation of hours/managers. |
| [tests/unit-dico.test.js](../../tests/unit-dico.test.js) | Synthetic inclusive lifetime geometry, Brussels date/completion/marker boundaries, viewport reveals, adaptive axes, safe radios/photos and date notices. Monthly concurrency cases cover true simultaneous maxima, inclusive boundaries, zero gaps/future months, exclusions, unavailable/partial dates, matching chart scales, values/keyboard/touch controls and synchronized-scroll cleanup. Palette cases retain month/tooltip/table/focus/geometry identities and calendar colours across switches, and retire subscriptions on rerender, unavailable data and cleanup. |
| [tests/unit-dico-http.test.js](../../tests/unit-dico-http.test.js) | Isolated authenticated catalogue/asset guards, exact session/unit scope, pagination, ignored caller overrides, optional date/manager failures, sanitized faults and read-only request verification. |
| [tests/project-monthly.test.js](../../tests/project-monthly.test.js) | Isolated monthly/cumulative identity, signed reconciliation/prefix sums, date/Brussels boundaries, zero/partial months, full-project individual planning, exact/ambiguous resource mapping, zero/unavailable planning, convention precision/plateau and optional-source fixtures. |
| [server.js](../../server.js) | HTTP routing, restricted application files, in-memory sessions, login rate limiting, origin checks, private configuration, input validation, Odoo authentication, scoped optional contributor/photo/assignment/convention/date reads, paginated queries, XML-RPC encoding/decoding and monthly summaries. |
| [config.example.json](../../config.example.json) | Example connector configuration; copy to private config.local.json. |
| [Dockerfile](../../Dockerfile) | Node 22 Alpine runtime and server startup. |
| [docker-compose.yml](../../docker-compose.yml) | Port publication, environment and optional read-only config mount. |
| Root XLSX files | Example exports for personal and project timesheets, planning and tasks. |
| docs/wiki/ | Technical descriptions grounded in repository files. |
| docs/ai-context/ | Project status, decisions and operational limitations. |
| docs/ai-governance/ | Framework-managed assistant workflow. |

## DiCo steering

The DiCo steering extension separates shared calculations (`steering.js`), read orchestration (`steering-service.js`) and browser rendering (`steering-client.js` / `steering-client.css`). Localized navigation keeps Mon temps, Mes Projets (Mijn projecten), Unité DiCo and the fixed Programmes selector available independently of steering configuration. The older internal steering portfolio retains its unit and leader/contributor views and programme-assignment calculations. [Pilotage](PILOTAGE.md) documents that separate API, configuration, source restrictions and test harnesses.

## Refresh

- Last refreshed: 2026-10-23
- Tag source basis: data/project-tags.json, project-tags.js,
  project-description.js, project-tag-scan.js, scripts/scan-project-tags.js,
  project-tag-view.js, project-similarity.js/css, unit-dico.js and index.html.
- Purchase source basis: project-purchase-service.js, project-purchase-flow.js/css,
  project-finance-service.js, project-budget.js, project-browser.js,
  tests/project-purchase-flow.test.js and finance/budget/project integration tests.
- Additional source basis: i18n.js, i18n-*-messages.js, language-client.js,
  language-preferences.js, chart-palette.js and corresponding
  palette/settings/language/calendar/renderer tests.
- Source basis: personal-time.js/css, tests/personal-recommendations.test.js, project-planning-service.js, project-planning.js, tests/project-planning-service.test.js, tests/project-planning-http.test.js, tests/project-planning.test.js, project-card.js/css, programme-browser.js/css, programme-service.js, tests/programme-browser.test.js, tests/programme-service.test.js, tests/programme-http.test.js, unit-dico-service.js, unit-dico.js/css, project-monthly.js, project-browser.js/css, project-budget.js/css, project-finance-service.js, tests/project-card.test.js, tests/unit-dico.test.js, tests/project-monthly.test.js, tests/project-browser.test.js, tests/project-budget.test.js, steering-client.js, index.html, server.js, Docker files and framework manifest.
- Limitations: example workbook contents were not inspected.

## Integrated project modules

server.js includes metadata-driven work-package, milestone and budget handlers and an explicit read-only RPC allowlist. index.html retains the corresponding project visualizations, selected-year comparisons, subcontractor inclusion and generation-scoped caches. Unit-row drilldowns fetch the shared details by exact project ID after installing already loaded hour summaries.
