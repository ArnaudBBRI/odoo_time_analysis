# Current State

## Functional State

- Published on 2026-10-28 at the user's explicit request: `force-diagrams`
  commits `40b1f57` and `0652030` were fast-forwarded into `main` from
  `81f03b1` and pushed to `origin/main`. The checkout is `main`; the local
  feature branch is retained. Remote ancestry, clean working tree and whitespace
  were verified. No runtime code changed during publication, so the recorded
  **1229/1229** offline result remains applicable; tests were not repeated.
  This documentation checkpoint records the completed publication. No Odoo
  access, server restart or configuration change was needed.

- Completed locally on 2026-10-26 on user-requested branch `force-diagrams`
  from `main` at `81f03b1`: **Carte des proximités technologiques** now offers
  **Organisme / Financier** beside Thématiques and Programmes. **Partenaires**
  is temporarily hidden and its reads are suspended. The new mode dynamically
  reads metadata-confirmed `organism_id` for exact visible Unit DiCo projects,
  then resolves bounded exact `res.partner` names on every catalogue load or
  refresh. The existing browser catalogue cache retains the map between
  refreshes; no historical project/body table or disk/shared cache is used.
  Denied, incomplete or contradictory optional evidence disables only this
  mode. Projects without a funding body retain a distinct colour and weak
  placement without a cloud. Programme-mode **Autres projets** likewise keeps
  its existing bubble colour, legend and forces without a cloud. Tag evidence,
  replay, cached FR/NL focus and reduced-motion behavior remain intact; a
  retained partner mode/focus returns to themes. Full offline **1229/1229**,
  renderer/language **67/67** and service/HTTP **50/50** tests pass; all **10**
  changed JavaScript files pass syntax checks and `git diff --check` passes.
  Independent review finds no blocker. Offline Edge checks pass for French
  desktop and Dutch 390px, including keyboard controls, exact graph roundtrips,
  colours/counts, cached language state and long labels without page overflow
  or console errors. Fictional screenshots are saved outside the repository;
  browser resources are closed. No separate build/lint/typecheck command exists.
  Follow-up live guarded reads on 2026-10-26 confirm **50/50** accessible unit
  projects have financing bodies across seven exact body records; two distinct
  source IDs share the name Bureau de Normalisation and remain separate groups.
  The option was already visible in code, but the running server predated the
  backend update. Restarted that verified local process as hidden standard-user
  Node PID **31728**, loopback **8765**: welcome **200**, anonymous unit endpoint
  **401**, empty stderr. Focused visibility/service checks pass **69/69**.
  Reload and sign in again, then refresh Unit DiCo. At the user's request,
  implementation/tests are committed as **`40b1f57`**, with this companion
  documentation checkpoint `0652030`; both are now published on `origin/main`
  as recorded above. No Odoo write,
  Docker or dependency/configuration change occurred; earlier discovery memory
  is preserved.

- Read-only financing discovery completed on 2026-10-26 on `categories`, based
  on `main` at `81f03b1`. Live guarded Odoo reads confirm exact Lead Unit `206`
  has **50 accessible projects: 45 active and 5 archived**. All 50 have
  `funding_type_id` labels (**27 distinct**); no `organism_id` fallback or
  `no info` result was needed. eXtRAI `54252043` is `JRDIC` with Innoviris.
  Financing labels are preserved, including `COOCK - DO NOT USE`. The complete
  project/code/type/organism table was prepared for user review. Follow-up reads
  of the same 50 IDs confirm `bw_partner_ids` (15 populated, 35 empty) and
  `technical_committee_ids` (45 populated, 5 empty). All 25 linked partner names
  and 18 committee names resolved through exact-ID reads, including archived
  relations; empty lists are shown as `no info`. Stored `Overhead` committee
  labels are retained. Both complete tables were prepared for review. No app code,
  configuration or Odoo data changed; financing-directive research is not yet
  started. No tests/build were needed for these reads.

- Completed on 2026-10-26 on user-requested branch `sankey` from `main`
  (`fe0eb37`): fullscreen purchase/correction/currency Sankeys support
  pointer-anchored mouse-wheel zoom (0.5–8 times fitted size) and right-button
  drag panning with pointer capture. Inline scrolling/context menus stay native.
  Close, hide, resize and rerender reset the view; pointer cancellation/window
  blur release capture. Fullscreen shows only diagrams and the exit button;
  surrounding text, totals, details and extra controls are hidden and restored
  on close, with hidden controls excluded from the keyboard loop. Tooltips,
  existing FR/NL labels and source geometry/data remain intact. All **137/137**
  focused Sankey/Budget/i18n/dashboard-language tests pass (**58/58** Sankey,
  six new regressions),
  with independent review and syntax/whitespace checks. Offline Microsoft Edge
  checks verify genuine wheel anchoring, captured dragging beyond the plot,
  gesture-limited context-menu suppression, clipping, keyboard tooltips and
  focus-scroll reset, FR/NL, independent diagrams and resize/close/reopen reset.
  Desktop and 390px checks confirm diagram-only fullscreen, hidden-control focus
  exclusion, and full inline metadata/open-detail restoration on exit.
  No browser warnings/errors; screenshot saved and browser resources released.
  At the user's explicit request, feature commit `fef2dcc` was fast-forwarded
  into `main` and pushed to `origin/main`; checkout is `main`, and `sankey` is
  retained. No separate build/lint/typecheck command exists; full suite not
  repeated. No Odoo, main-server or private config change.

- Completed on 2026-10-23 at the user's explicit request: `main` was
  fast-forwarded to `2e7746d` and pushed to `origin/main`, including the tested
  app commit `3c66e67` and its companion documentation. Removed merged local
  branches `codex/project-card-outline` and `codex/fr-nl-dashboard`; removed
  the remote feature branch. The remote FR/NL branch was already absent.
  Ancestry and remote refs were verified; the checkout is now on `main`.
  The full **1204/1204** offline test result remains applicable because the
  merge introduced no runtime changes; this follow-up only updates project
  memory. No Odoo access, data change or server restart was needed.

- Completed on 2026-10-23 at the user's explicit request: accumulated app,
  curated tag catalogue and test changes are committed as `3c66e67` and pushed
  to `origin/codex/project-card-outline`, with upstream tracking established.
  Companion documentation records the delivered features and verification.
  The full offline suite passes **1204/1204** in **32.52s**; all **63** changed
  JavaScript files pass syntax checks. Independent scope/packaging reviews find
  no commit blocker; private configuration and raw local reports remain ignored.
  Staged whitespace checks pass after removing one extra EOF blank line in a
  test. No separate build/lint/typecheck command exists. No Odoo access or data
  change was needed for publication. Earlier local/uncommitted notes below are
  historical for the changes included in this feature commit.

- Completed on 2026-10-23: Sankey purchase columns automatically tighten spacing
  (18 to 2 SVG units), then font size (10 to 8, equivalent to 7.5–6pt before
  proportional fitting), toward twice the left connector/text extent. Line
  height follows 16–12.8 units with collision-safe label clearance. Sparse
  diagrams retain current maxima; dense diagrams may exceed the target at
  minimum sizes. Every purchase, grouping, link and amount scale is preserved.
  All **112/112** focused Sankey/Budget tests pass (**52/52** Sankey cases,
  six new regressions), with independent review, syntax and whitespace checks.
  Fictional browser verification confirms sparse maxima, a 40-purchase exact
  2:1 fit, 90-purchase minimum-size overflow without label collisions, FR/NL,
  exact keyboard isolation, unchanged expanded geometry, resizing and restore.
  No browser warnings/errors. Screenshot saved; preview/viewport resources
  released. No separate build/lint/typecheck command exists; full suite not
  repeated for this isolated layout change. Refresh Budget to review.
  No Odoo, main-server, configuration or publication change.

- Completed on 2026-10-23: restored exactly one right-hand purchase column in
  every Sankey, including dense fullscreen diagrams. The rejected split/gap/
  bottom-routing experiment, second heading and geometry switching are removed.
  Grouping, amounts, links, gradients, controls and common physical scale remain.
  Fullscreen fits the existing SVG and closing clears only fitted dimensions.
  All **106/106** focused Sankey/Budget tests pass (**46/46** Sankey cases).
  Independent review/static checks and a fictional 90-purchase/five-credit browser
  check verify unchanged paths/viewBoxes, one purchase x-coordinate, all 95
  details, isolated exact amount, 1280px/2560px fitting and native restore with
  no errors/overflow. Screenshot saved; viewport and preview resources released.
  Full suite not repeated for this renderer-only reversion; previous 1205-case
  result is historical. No separate build/lint/typecheck command exists.
  Refresh Budget to review. No Odoo, main-server, configuration or publication change.

- Completed on 2026-10-23: Viktor de Groote is explicitly classified as an
  Ormitter by exact normalized full name, including retained timesheet/resource
  labels after HR removal or denied function access. `named-override` provenance
  preserves genuine function/source fields and leaves them blank when absent.
  Shared actual/planning/assignment/contributor behavior and strict personnel
  totals use the exception; other unknown/malformed records remain unchanged.
  All **1205/1205** full offline tests pass in **46.02s**, including six new
  regressions; focused classification/hours/personnel **78/78**, independent
  review, syntax, documentation links and whitespace pass. The app was restarted
  as a standard user in session **37191**, loopback **8765**; workspace-matching
  login **200**, protected asset **303** and anonymous API **401** verified.
  Refresh/sign in again to reload records. No live Odoo read/write, private
  configuration, dependency, commit or publication change. A retained/resolved
  full name is required; no erased records or identities are reconstructed.
  No separate build/lint/typecheck command exists.

- Completed on 2026-10-23: DiCo and programme project-card grids now sort
  alphabetically by their displayed short names, ignoring numeric source
  prefixes and case/accents, with natural numeric ordering and exact-ID ties.
  A sorted copy leaves source/catalogue, calendar and similarity order intact.
  All **175/175** focused Unit/similarity/sticky-scope/language tests pass.
  Independent FR/NL unit/programme fixtures confirm displayed-name ordering,
  selection/focus and unchanged source data/calendar chronology. Syntax and
  whitespace pass. Refresh either view to review. No Odoo/main-server change;
  full suite not repeated. No separate build/lint/typecheck command exists.

- Completed on 2026-10-23: the main Projects tab, matching page heading and
  browser title now read **Mes Projets / Mijn projecten**. Other project/chart
  headings retain their existing wording. All **117/117** focused sticky-scope/
  dashboard-language/i18n tests pass; syntax, whitespace and independent scope
  review pass. Refresh to review. No Odoo or main-server change; full suite not
  repeated for this label-only change. No separate build/lint/typecheck command.

- Completed on 2026-10-23: the three large programme selectors now share project
  cards' white/turquoise outline reveal, replacing the old flip/orb presentation.
  Their 230px desktop and 210px phone sizes remain, with larger portraits/type;
  programme details retain catchphrase, DC code, subtitle and responsible name.
  Native selection/descriptions/focus remain intact. Touch/no-hover shows both
  faces together within the larger card, using a 40px portrait; reduced motion
  stays supported. All **182/182** focused card/programme/project/Unit/language
  tests pass, along with independent review and static checks. Fictional FR
  desktop and NL 390px browser checks verify retained sizes, keyboard selection/
  reveal, detail bounds and no errors/overflow. Screenshot saved; viewport reset
  and preview resources released. Physical touch hardware/full suite not tested
  for this refinement; no separate build/lint/typecheck command. Refresh
  Programmes to review. No Odoo, main-server, configuration, dependency, commit
  or publication change.

- Completed on 2026-10-23: the open header Settings disclosure now stacks above
  the sticky navigation/date bar, keeping every palette visible and clickable.
  The higher layer applies only while open. All **108/108** focused settings/
  sticky-scope tests pass; independent review and a fictional browser check
  verify overlap hit-testing, last-option selection and Escape focus restoration
  without errors/overflow. Screenshot saved; preview resources released.
  Syntax/CSS balance, documentation links and whitespace pass. Full suite not
  repeated for this CSS-only fix; no separate build/lint/typecheck command.
  Refresh to review. No Odoo, main-server, configuration or publication change.

- Completed on 2026-10-23: **Vibrant Emotions** is a third line/area palette in
  header Settings, with the user's exact ten colours, repeating after ten,
  a matching preview and the same proper name in FR/NL. Dico vibes remains the
  default. Existing immediate repaint and browser-local enum persistence cover
  the new choice. All **170/170** focused palette/settings/language/project/Unit
  tests pass (**15/15** palette/settings cases). Independent review, syntax,
  documentation links and whitespace pass. Fictional FR/NL browser checks
  verify selection, twenty-person repetition, unchanged chart paths, saved
  restoration after reload and no errors/overflow. Screenshot saved; preview
  resources released. Full suite not repeated; no separate build/lint/typecheck
  command exists. Refresh and choose Settings > Vibrant Emotions. No Odoo,
  main-server, private configuration, dependency, commit or publication change.

- Historical experiment, reverted on 2026-10-23: expanded two-bank Sankeys routed far-bank flows
  through internal gaps between near-bank purchase rows wherever their whole
  thickness fits. Complete bars and 16px label frames retain 1px clearance;
  thicker ribbons receive fitting gaps first, near their targets. Only overflow
  uses the lower route, and only that overflow reserves additional height.
  Amounts, grouping, links, colours, normal geometry and in-place interactions
  remain intact. All **113/113** focused Sankey/Budget tests pass (**53/53**
  Sankey cases, four new regressions). Independent review/static checks and
  fictional FR/NL expansion, 1280px-to-2560px resize, isolated exact-value tooltip
  and Escape restoration pass, with all 95 details and no errors/overflow.
  The 90-purchase example sends **32/45** far links through gaps and reduces
  expanded height from **1264.96** to **1161.60** at the same **1820px** width.
  Screenshot saved; temporary viewport and preview resources released. Full
  suite not repeated for this renderer-only change; prior 1195-case result is
  historical. No separate build/lint/typecheck command exists. Refresh Budget
  and expand the Sankey. No main-server restart, Odoo request/write, private
  configuration change, dependency installation, commit or publication.

- Completed on 2026-10-23: the permanent top toolbar now has a native
  **Paramètres / Instellingen** menu with palette previews and two radio choices:
  **Dico vibes** (the new fifteen-colour default) and **Classique / Klassiek**
  (the previous twenty colours). Each palette repeats after its own length.
  Only the selected enum is saved in browser-local storage; initialization
  performs no write, and blocked storage keeps a usable session choice.
  Project actual/planned areas and person lines, Unit/programme concurrency
  areas/lines, and legacy imported-data line charts update immediately.
  Mounted SVG attributes/styles and legacy line swatches repaint in place,
  preserving focus, selections, pinned tooltips, open tables, source data,
  geometry and reveal state. Existing bar/pie/Sankey/cloud/calendar and semantic
  reference/milestone colours remain independent. Cleanup disposes chart
  subscriptions. The new shared module is an authenticated browser asset.
  All **1195/1195** final full offline tests pass in **32.90 seconds**; focused
  palette/settings/project-renderer/unit sets pass **5/10/84/67** cases.
  Independent review, syntax, CSS balance, relative documentation links and
  whitespace pass. Fictional browser checks verify default fifteen-colour
  Dico, immediate twenty-colour Classic with unchanged geometry, persistence
  after reload, return to Dico, FR 2560px wide graphs and NL 390px settings
  without overflow/errors; Escape restores focus. Screenshots saved, temporary
  viewport reset and preview tab/server released. The local app was restarted
  as standard-user PID **36916**, session **3291**, loopback **8765** to serve the
  new module: workspace-matching login **200**, protected palette asset **303**,
  anonymous unit API **401**. Sign in again if prompted. No Odoo request/write,
  private configuration change, dependency installation, commit or publication
  occurred. No separate build/lint/typecheck command exists; prior work remains.

- Historical experiment, reverted on 2026-10-23: expanded purchase Sankeys split a grouped purchase
  stack exceeding twice the convention-category node/gap extent into two
  ordered columns. The height-minimizing contiguous cut includes safe lower
  ribbon-routing space; a split that would not shorten the diagram is omitted.
  The later gap-routing refinement above replaces the original lower-only
  routes; width grows while the existing name/amount space stays intact. Nodes,
  ribbons and gradients move in place, keeping identities, hover/focus, amounts,
  grouping, detail rows and common currency/correction scales. Restore returns
  the exact inline geometry. All **109/109** focused Sankey/Budget tests pass in
  **0.25 seconds**, including six new Sankey cases (**49/49** Sankey cases).
  Independent review, syntax, local documentation links and whitespace pass.
  Fictional FR/NL browser checks at 1280px and live resize to 2560x1440 verify
  two purchase columns, one credit column, far-ribbon isolation, native restore,
  all **95** detail allocations and no errors/overflow. The 90-purchase diagram
  changes from **1300x2050.29** to **1820x1264.96** (about **38% shorter**).
  Screenshot saved, viewport reset and temporary preview tab/server released.
  Full suite not rerun; no separate build/lint/typecheck command exists. Refresh
  Budget and expand the Sankey to review. No main-server restart, Odoo request/
  write, private configuration change, commit or publication occurred.

- Completed on 2026-10-23: annual Budget total bars **Budgeted / Consumed /
  Committed** now expose exact localized amounts and currency through the same
  tooltip as category bars. Native buttons support hover, focus, tap/click
  pinning, blur and Escape, with focus restored by budget/measure on rerender.
  The tooltip is mounted even without category codes, so zero/unavailable
  totals remain accessible. Existing filtered amounts, signed geometry,
  category navigation and bill dialogs are preserved. All **60/60** budget
  renderer tests pass in **0.24 seconds**, including four new regression cases;
  independent review, syntax, CSS balance, local links and whitespace pass.
  Fictional FR/NL desktop browser checks confirm exact decimal amounts, Escape
  and keyboard access to a zero total without categories, with no errors or
  horizontal overflow. Screenshot saved; temporary preview tab/server released.
  The broader full suite was not rerun for this local renderer fix. No separate
  build/lint/typecheck command exists. Refresh Projects > Budget to review;
  no main-server restart, Odoo request/write, configuration change, commit or
  publication occurred. Prior local work remains intact.

- Completed on 2026-10-22: **Projets · 02 / 03** milestone labels now tilt at
  **30°**, keeping compact two-line names, full source titles, exact-date leaders
  and solid black markers. Rotated text bounds pack nearby dates into separated
  lanes without changing hours, plot scales or source data. The follow-up replaces
  the initial thirteen-colour set with the user's exact **twenty-colour palette**
  recorded in DECISIONS.md, assigning new identities in the supplied order and
  looping from the first colour after twenty. Exact employee identities
  retain matching area, legend, avatar, selected-line and tooltip colours across
  both charts, filters, cumulative mode and FR/NL. Horizontal bars and fixed
  total/convention/planning reference styles retain their existing palettes.
  The palette replacement passes **81/81** renderer tests, including **61** actors
  across repeated cycles, filtering/reordering and paired chart cues; syntax,
  local links and whitespace pass. Its fictional FR 2560px browser check shows
  all twenty colours, unchanged 30° labels and no errors. The preceding
  **1165/1165** full offline run passed in **34.69 seconds**, including
  **91/91** focused renderer/milestone cases; it was not rerun for the palette-only
  replacement. The earlier independent **108-case / 2664-label**
  rotated-bounds audit found no overlap or clipping, including dense same-date
  names. Earlier fictional browser checks passed for FR 2560px, NL 1600px, NL 390px and
  twelve crowded milestones at 1600px, with the previous palette, 30° labels,
  working employee/month details and no errors or horizontal overflow.
  Screenshots saved; temporary preview tab/server released. Syntax, local links
  and whitespace checks pass. No separate build/lint/typecheck command exists.
  Refresh Projects > Hours to review; no main-server restart, Odoo request/write,
  private configuration change, commit or publication occurred.

- Completed on 2026-10-22: the shared Normal/Large switch also controls selected
  **Projects > Hours**. The top wide row keeps a 528.75px stacked overview and
  bar graphs in the remaining space. The four primary macro cards now measure
  **91.19px** high (half their normal **182.39px**) with compact text and natural
  growth for longer notes. Actual and planned area charts occupy a separate
  full-width row in equal columns, retaining compact 220px right legends.
  A single area chart spans the whole row. The header switch stays visible and
  usable in every view; unsupported Budget/list/unit/programme views retain
  normal width and show a neutral FR/NL hint when Wide is selected. Normal remains the
  default; the 1600px boundary and shared browser preference are preserved.
  Monthly SVG geometry now uses the actual plot width up to 4096px only in this
  wide Hours context, retaining the normal 1200px limit. Frame-batched redraws
  coalesce the latest width and cancel on cleanup, fixing a ResizeObserver
  notification warning discovered during browser verification.
  All **1162/1162** final full offline tests pass in 33.85 seconds; **118/118**
  controller/scope/language and **79/79** renderer cases pass, with independent
  review, inline/module syntax, CSS balance, **100** relative documentation
  links and whitespace checks. Fictional FR/NL browser checks confirm the exact
  **423 → 528.75px** card/left-column ratio and **220px** legends. The latest FR
  2560px and NL 1600px checks show all four cards at 91.19px and equal area panels
  of **1193/1193px** and **714.61/714.61px** respectively, spanning both top-row
  tracks. At 3440px the panels are **1633/1633px**. The 1600px boundary, normal
  1280px fallback, always-visible switch in Budget/list, native click/Space there,
  neutral translated hints, open tables,
  native switch/Space operation and repeated same-DOM 3440→1280→3440 resizing
  pass with retained choices and no final browser errors or horizontal overflow.
  Screenshots saved and temporary preview resources released. Refresh selected
  Projects > Hours to review. No main-server restart, Odoo request/write,
  private configuration change, commit or publication occurred; prior local
  work is preserved. No separate build/lint/typecheck command exists.

- Completed on 2026-10-22: **Mon temps** now has a binary **Normal / Large**
  header switch (**Normaal / Breed** in Dutch), replacing the initial dropdown.
  The rounded thumb/glow follows the user's reference in the app's teal palette;
  a native checkbox/switch retains Space-key operation, visible focus and a
  translated accessible name. It initially appeared only in Mon temps, before the account
  controls. Normal is the default; the browser remembers only `standard`/`wide`.
  A previously saved `auto` becomes `wide` in memory without an initialization
  write. Wide uses the available
  window width for four visual columns: recommendations narrowed by **30%**,
  capacity/planning by **50%**, the graph at its previous wide-layout width,
  and the project legend in the remaining space. Groups and metrics stack
  vertically. Wide needs at least **1600 CSS px**, retaining the checked choice
  with safe vertical fallback below that width. Other menus retain their normal width.
  Layout changes only update presentation, preserving controls, disclosures,
  focus, calculations and caches. The existing personal resize path no longer
  rebuilds responsive SVG content; legacy canvas behavior remains intact.
  Actual hours now appear above planned hours in a compact **120px** summary
  sharing the chart row. The pie starts directly below the period, **175px**
  higher than before; normal/standalone presentation and calculations stay intact.
  Notes remain accessible and the summary passes pointer input through to sectors.
  The header/summary refinement passes all **1152/1152** full offline tests in
  32.76 seconds and **57/57** focused layout/renderer tests. Independent review,
  inline/module syntax, CSS checks, **100** relative documentation links and
  whitespace pass. At 2560px the tracks measure **532 / 380 / 874 / 584px**;
  the previous graph track is preserved, with its 540px SVG cap unchanged.
  Fictional browser checks confirm mouse/Space switching, Normal at 2560px,
  French 2560px and Dutch 1600px four-column layouts, actual-above-planned
  placement, a 26-project long legend without shifting the graph downward,
  chart tooltips/Escape, hide-all/restore, live 1600→1280→3440 resizing with
  open details and the checked choice retained, and the 390px Dutch fallback without
  errors/overflow. Screenshots saved; preview
  tab/server released. Refresh Mon temps to review; no main-server restart,
  Odoo request/write, private config change, commit or publication occurred.
  No separate build/lint/typecheck command exists; prior local work is preserved.

- Completed on 2026-10-22: Sankey NF/FK entries with the same exact initials now
  merge across label months, summing amounts and showing the chronological range
  (for example **NF/FK 10-2024 --> 02-2025: MLU**). Single-month groups retain their
  original label. Valid full references tolerate source asterisks; other names,
  malformed dates and different initials keep separate identities. Stable family
  and ribbon keys preserve focus when months are added and cannot collide with
  arbitrary source labels. Raw allocation rows, category/code links, gradients,
  currency boundaries and separate signed-correction diagrams remain intact.
  All **43/43** Sankey and **1141/1141** full offline tests pass, along with
  independent review, syntax, **159** relative documentation links and whitespace.
  A fictional French browser check confirms the range and **6200 EUR** sum with
  both contributing code connections. Screenshot saved and preview tab/server
  released. Refresh Budget to load it; no main-server restart, Odoo request/write,
  private config edit, commit or publication occurred. Prior local work is intact.

- Completed on 2026-10-22: three compact text cards now sit directly below the
  four project-hours macro figures: **Mes heures · planning**, **Total · planning**
  and **Total · convention**, with Dutch equivalents. Their minimum heights are
  half the macro cards (91.2/80/74px across desktop/tablet/phone); they stack on
  phones and retain the pale borders and orange excess treatment. Each states
  signed under/over usage through today, balance or unavailable data. The two
  existing global comparisons keep their calculations; personal usage is added
  to the same pure calculator using exact session employee/resource identities,
  authoritative planning snapshots and the existing dated-slot proration.
  TH/Ormitter exclusion, signed credits, Brussels/DST boundaries and independent
  source statuses are covered. All three use project-start-to-today values,
  independent of selected graph periods and local graph filters. No percentage
  or large extra macro figure is introduced. All **1136/1136** full offline tests
  and **124/124** focused tests pass, along with independent review, six-file
  syntax, **156** local documentation links and whitespace checks. Fictional FR
  desktop and NL 390px browser checks confirm the half-height sizing, translated
  results and contained layout without errors. Proof screenshots saved; preview
  tab/server released. No separate build/lint/typecheck command exists. Refresh
  the Hours view to review; no main-server restart, Odoo request/write, private
  config change, commit or publication occurred. Prior local work is preserved.

- Completed on 2026-10-22: the unit proximity graph now visibly settles under
  deterministic physical attraction, repulsion and collision separation over
  **2.2 seconds**, then stops. Theme and programme modes keep separate final
  layouts; **850ms** transitions start at current displayed positions and restore
  each saved target exactly, including after rapid reversals. Programme centres
  group their projects while Other projects keep weaker tag-based positioning.
  Bubbles and moving cloud envelopes share the active grouping colours; an
  explicit legend explains them and overlapping memberships use multicolour
  bubbles. Link identities, shared tags, similarity weights, colours and widths
  remain unchanged; both visible and hit-test endpoints follow moving bubbles.
  Replay, reduced motion, cleanup/cancellation and retained FR/NL focus/details
  are covered. Cached/language rerenders do not replay the introduction.
  Distance-weighted physical playback prevents late collision snaps: actual
  **36-project / 266-link** 60Hz checks peak at **11.08 / 6.97 px per frame**
  for theme/programme replay. Both final layouts have no pinned boundary nodes,
  bubble/label overlaps or clipping. All **1123/1123** final offline tests and
  **46/46** focused tests pass, with independent review, syntax, **156** local
  documentation links and whitespace checks. Isolated desktop FR and 390px NL
  browser checks pass in both modes; screenshots saved and temporary preview
  tab/server released. No separate build/lint/typecheck command exists; Docker
  and live Odoo checks were unnecessary. Refresh to load the frontend change;
  the main server was not restarted. No Odoo/config change, commit or publication;
  unrelated local work remains preserved.

- Completed earlier on 2026-10-22: the initial cloud-only toggle below is
  superseded by the animated layouts above. A compact **Thématiques / Programmes** radio toggle
  above the unit graph changes only its cloud layer, legend and caption.
  The **36** bubbles and **266** links retain their exact DOM identities,
  coordinates, colours, widths, weights and active emphasis. Theme mode remains
  the default; programme clouds reuse the existing fixed DC1/DC2/DC3 reference
  lists. A pure optional unit-API projection intersects already-visible exact
  IDs with the same ambiguity-safe matcher as the programme view; no new RPC.
  Current plotted membership is **7 / 7 / 5**, plus **17 Autres projets**.
  Untagged projects stay omitted and isolated projects retain their panel.
  Mode/toggle focus survives cached/language refreshes; missing mapping disables
  programme mode without blocking the graph. Fixed-position programme envelopes
  overlap and may enclose nonmembers; the caption explains this and legend
  counts/tooltips expose exact plotted members. Full **1109/1109** tests,
  independent source/data/geometry review, syntax, local links and whitespace
  pass. Desktop FR round-trip and 390px NL browser checks pass; screenshots
  saved and task-owned preview resources released. No Docker/live Odoo check
  or separate build/lint/typecheck command. Standard-user backend restarted as
  PID **48048**, session **30928**, loopback **8765**: workspace login **200**,
  anonymous unit API **401**, protected graph asset **303**. Sign in again to
  review. No Odoo call/write, private-config edit, commit or publication;
  unrelated local work is preserved.

- Completed on 2026-10-22: the tag explorer now orders tags by descending
  number of associated visible projects. Equal counts use the localized label,
  then canonical ID; duplicate source tags and hidden projects cannot inflate
  popularity. All **27/27** renderer/unit-map tests, syntax and whitespace pass.
  No browser/full-suite rerun; refresh loads the frontend change without an
  Odoo call, backend restart, config edit, commit or publication.

- Completed on 2026-10-22: the product-data / data-governance cloud now uses
  warm terracotta **#a36a4d**, distinct from the BIM/prefabrication blue
  **#556a99**. The current other four community colours and graph topology are
  preserved; legend, bubbles, guides and within-community links inherit the
  cloud colour. All **27/27** renderer/unit-map tests, independent palette review,
  syntax and whitespace pass. Browser/full-suite checks were not repeated for
  this colour-only refinement. Refresh loads it; no Odoo call, backend restart,
  config edit, commit or publication.

- Completed on 2026-10-22: the similarity map replaces its all-project disclosure
  with **Explorer par tag** / **Verkennen op tag**. It lists unique canonical
  tags used by visible projects, now sorted by popularity with localized ties. Selecting a tag
  lists every exact matching project in the right panel and highlights its
  projects/shared-tag links, including singleton/isolate results. Project opening
  remains explicit. Selected tag, expanded disclosure and tag/result focus survive
  cached/language rerenders; Escape, stale exits and cleanup retain safe behavior.
  The desktop info column is **345px**, up from **230px** (+50%); narrow layouts
  keep the existing stacked panel and locally scrolling graph. All **118/118**
  affected renderer/unit/language tests, independent review, syntax and whitespace
  pass. Isolated IAB checks at desktop 1280px FR and 390px NL confirm the tag
  list, BIM's 19 results, contained layout, no label collisions or runtime errors.
  Proof screenshots saved; task-owned preview tab/server released. Full suite
  was not repeated; no separate build/lint/typecheck command exists. Refresh
  loads the frontend change. No Odoo call/write, main-server restart, config
  edit, commit or publication; prior local work is preserved.

- Completed on 2026-10-22: leaving a project bubble/label or graph link restores
  all project colours and the initial link emphasis. Project details and their
  actions stay available. Cleared emphasis survives cached/language rerenders;
  fresh keyboard focus still highlights its project/relation. Stale leave events
  cannot clear a newer selection, and retired controls remain inert.
  All **91/91** affected renderer/unit/language tests pass; independent review,
  syntax and whitespace pass. Full suite was not repeated (previous
  **1091/1091** is historical).
  No separate build/lint/typecheck command exists; browser QA was not repeated.
  Refresh loads this frontend change; no Odoo call, backend restart, config edit,
  commit or publication occurred. Prior local work is preserved.

- Completed on 2026-10-22: user-requested Buildwise showroom enrichment for
  all **32** completed missing/short-description results. Inventoried **520**
  French/Dutch project URLs, including **229** French parent pages; candidate
  narratives and official supplements supplied **22** accepted source responses.
  **18** projects gained reviewed canonical tags, bringing coverage to **36/50**;
  **14** remain untagged (8 not found, 4 ambiguous, 2 insufficient).
  The [web-enrichment report](PROJECT_TAG_WEB_ENRICHMENT.md) lists every result,
  source, caveat and eight public/local date discrepancies. Original Odoo
  description findings, source fields and completion times are preserved; the
  original 18 tagged rows are unchanged. Local public summaries, source hashes
  and **80** per-tag evidence entries remain outside the session DTO. Completed
  rows still never automatically rescan; no Odoo call/write or guard change.
  Independent data/source reconciliation and review pass. The enlarged map has
  **36 bubbles, 266 links, five communities and zero isolates**. Geometry uses
  available width, separates bubbles/labels and adds subtle guides for displaced
  labels; actual SVG/PNG and measured bold text bounds show no overlap/clipping.
  Full suite **1091/1091** passes with `node --test --test-concurrency=4`;
  syntax, 154 local documentation links and whitespace pass. No separate
  build/lint/typecheck command exists. Browser/Docker/live-Odoo QA was not
  repeated; native UI input remains stopped after earlier detected user activity.
  Standard-user backend restarted as PID **51044**, session **95924**, loopback
  **8765**: workspace login **200**, anonymous unit API **401**, protected graph
  asset **303**. Sign in again and review the enriched map/report. No private
  config edit, commit or publication; unrelated local work is preserved.

- Completed on 2026-10-22: interactive **Carte des proximités technologiques**
  in the unit overview, immediately above **Unité DiCo · 02 / Calendrier des
  projets**. Equal-size bubbles, rarity-weighted exact canonical tag links,
  soft communities, hover/keyboard shared-tag details and explicit project
  opening reuse the existing detail view. Untagged projects are omitted;
  tagged isolates remain in a specialties panel. Personal/programme views stay
  opted out; FR/NL cached rerenders retain active project/relation and focus.
  The existing unit API projects only exact session-visible IDs and used FR/NL
  definitions from the matching saved source namespace. Full snapshots, source
  metadata and hidden projects remain private. Optional local-data failures
  preserve the calendar; no description reads, rescans or Odoo writes were added.
  Full suite **1083/1083** passes with `node --test --test-concurrency=4`;
  a default-parallel attempt first had one isolated server startup timeout.
  Independent review and numerical reconciliation confirm **18 projects,
  62 links, four communities and two isolates**, with no estimated label overlap.
  Actual SVG/PNG at 1600x936 was visually checked. Isolated browser checks at
  553px and 390px in French confirm no page overflow, no label collisions,
  all graph entries, no runtime errors and correct project detail/emphasis.
  Dutch controller/renderer tests pass; a fresh Dutch browser check was not
  completed after Computer Use detected user activity. Native UI input stopped.
  Syntax, 97 local documentation links and whitespace pass; no separate
  build/lint/typecheck command exists. No Docker/live Odoo check was required.
  The local backend restarted as standard-user Node PID **43204**, loopback
  **8765**, terminal session **17520**: login **200** matches workspace bytes,
  anonymous unit API **401**, protected map asset **303** to login. Sign in
  again and review the map. The task-owned preview server was stopped; a loaded
  preview tab was left untouched after detected user activity. No private config
  change, commit or publication occurred; prior local changes are preserved.

- Completed on 2026-10-22: shipped local tag catalogue in
  `data/project-tags.json`, canonical English/French/Dutch labels and a manual
  read-only new-project scanner. All **50** currently accessible exact unit-206
  projects were scanned, including **5 archived**: **18** have reviewed tags,
  **31** have no usable summary and **1** is very short (eDIH WallonIA Hub,
  **76** meaningful characters; threshold **200**). FireBIM has links only.
  The [full report](PROJECT_TAG_SCAN.md) lists every project, tags and source
  links. All 51 older versions across the 32 flagged projects were checked and
  contained no additional narrative. Exact project/version ownership was verified
  through the existing guarded reads; no Odoo write or guard change occurred.
  Completed entries, including missing/short results, never automatically rescan
  after source edits. Failures and uncertain extraction remain retryable.
  Raw source summaries stay out of the catalogue; CLI candidate reports default
  to `.local/`, excluded from Git/Docker. Canonical output path checks protect
  configuration/catalogue from junction aliases. No production route/UI change,
  backend restart, private-config change, commit or publication occurred.
  Full suite **1059/1059** passed before final scanner edge-case refinements;
  all **32/32** final tag/extraction/scanner/bundled-data tests pass afterward,
  including real standard-user Windows junction tests. Independent review,
  syntax, 50-source version/hash/count reconciliation, report coverage,
  90 local documentation links, packaging exclusions and whitespace pass.
  The bundled-data scan skips all 50 before description reads. No separate
  build/lint/typecheck command exists; Docker runtime was not run. Review the
  report/catalogue; future manual scans prepare only previously unseen projects.

- Read-only investigation completed on 2026-10-22: eXtRAI (project **2083**,
  code **54252043**) exposes its macro-info narrative through
  `project.project.description_version_ids` ->
  `bw.project.description.version.description` (HTML). The latest linked version
  **2511**, dated **2026-03-31 12:44:04**, contains the user's supplied paragraph.
  The standard `project.project.description` contains the generic template and
  is not the requested source. Exact-ID/ownership checks and the existing guarded
  RPC were used with the configured account. The production DTO/UI remains
  unchanged; technical tags were suggested only, with no Odoo write, app change,
  backend restart, config change or commit. No test rerun for this diagnostic.

- Completed on 2026-10-22: milestone markers are solid black and both project
  hour charts have a compact lower x axis: 9px titles on two balanced lines,
  tilted at -75 degrees. Month ticks and plot stay fixed; the month/current-month
  caption now follows all milestone names. Measured multiline bounds and extra
  lanes handle long/crowded names. All **145/145** affected tests and
  independent review, syntax/local-link/whitespace checks pass. Full names stay
  available in SVG title/ARIA, month details and the native list. Offline SVG/PNG
  rendering of the actual renderer was visually checked and saved. Browser QA
  was not repeated after the earlier Computer Use URL policy stop; no live
  browser/source interaction occurred for this refinement.
  Refresh to review; no backend restart, Odoo access, config change or commit.

- Completed on 2026-10-22: corrected both scoped **Heures du projet en [année]**
  and lifetime convention segments to descending booked hours, largest on the
  left, using each period's own values. Name/ID ties, colours, focus, alphabetical legends
  and ignored/signed fallbacks are preserved. All **141/141** affected project/
  monthly/milestone/i18n tests pass, including updated descending-order cases.
  Scoped independent review and syntax/whitespace checks pass; browser visual
  checks were not repeated. Refresh loads the change; no backend restart, Odoo
  access, config change, commit or publication occurred.

- Completed on 2026-10-22: Sankey right-column names and inline amounts now use
  10px text instead of 10.5px in embedded and expanded views. Scoped CSS review,
  **38/38** purchase-flow tests and whitespace checks pass. No new tests were
  needed for this small style change; browser visual checks were not repeated.
  Refresh loads it; no backend restart, Odoo access, config change or commit.

- Completed on 2026-10-21: both project-hours charts now show dated Odoo
  milestones as vertical dashed markers, with exact dates/names in month
  tooltips and a compact list. An independent exact-project cache keeps optional
  milestone reads from blocking hours. Date clipping, narrow layouts, both chart
  modes and FR/NL browser checks pass. The final full suite passed **1026/1026**;
  all **141/141** chart/monthly/i18n checks also pass after the final defensive
  month-axis guard. Independent review confirmed exact relations, optional/stale
  cache handling, one2many field support and exclusion of audit timestamps from
  scheduled dates. Static syntax, local links and whitespace pass; no separate
  build/lint/typecheck command exists. Screenshot saved and previews released.
  The local backend was restarted as standard-user Node PID **31108**, port
  **8765** (login 200, unauthenticated milestones 401). Refresh/sign in to review.
  No live Odoo read/write, config change, commit or publication occurred.

- Completed on 2026-10-21: horizontal people segments in the scoped project-hours
  and lifetime convention comparisons now run from smallest to largest actual
  contribution, independently using each comparison's own hours. Equal values
  retain the existing name/ID order. Alphabetical legends, identity colours,
  source totals, ignored-hours tail and signed/incomplete fallbacks are preserved.
  All **136/136** affected project-browser/monthly/i18n tests pass, with existing
  regressions covering ascending ties and opposite annual/lifetime rankings.
  Independent review and fictional browser checks confirm rendered order,
  cross-bar colours and tooltip values; browser logs are empty. Screenshot saved
  and preview resources released. Syntax/local links/whitespace pass. No separate
  build/lint/typecheck command exists; previous full-suite results are historical.
  Refresh to review; no Odoo call, backend restart, config change, commit or
  publication occurred. All prior local work remains intact.

- Completed on 2026-10-21: Sankey right-hand entries with identical full
  description/document-fallback names now merge with signed summed amounts,
  within each currency and purchase/correction diagram. Original allocations
  and their table rows remain intact; category/internal-code connections and
  ribbon thicknesses are conserved. Same-code merges keep their palette colour;
  mixed-code merges use a stable name-derived colour with matching incoming
  gradients. Name-derived keys retain focus across reorder/membership changes.
  All **184/184** affected tests pass, including exact-name/fallback matching,
  totals, signed zero/currency separation, conservation, retained rows and
  mixed-code gradients. Independent review and fictional desktop/390px FR/NL
  checks confirm one 6,200 EUR example node with separate 1,450/4,750 EUR code
  flows and three original table rows. Browser logs are empty; screenshot saved
  and preview resources released. Syntax/local links/whitespace pass; no separate
  build/lint/typecheck command exists. Earlier full-suite results predate this
  frontend refinement. Refresh to review; no Odoo call, backend restart, config
  change, commit or publication occurred.

- Completed on 2026-10-21: purchases without an internal code now share one
  middle node per currency/purchase-or-credit diagram, retaining all purchase
  leaves, source identities, mapping warnings and totals. The FR/NL heading now
  names the Sankey diagram. A second square beside expand hides/shows its body
  while retaining the title/controls, graph and open details. Hidden state
  survives direct/budget/project cached refresh and language rerenders; hiding
  from fullscreen closes native modality, clears emphasis and focuses the
  toggle. Expanding a hidden diagram reveals it first. All **178/178** affected
  model/renderer/budget/project/i18n tests, independent review and fictional
  desktop/390px FR/NL browser checks pass, including grouped 530/-50 EUR nodes,
  hidden keyboard navigation, refresh persistence and complete inline amounts.
  Browser logs are empty; screenshots saved and preview resources released.
  Syntax, local links and whitespace pass; no separate build/lint/typecheck
  command exists. Refresh loads this frontend change. No Odoo call, backend
  restart, config change, commit or publication occurred; earlier full-suite
  results below remain historical. Next action: review the local Budget view.

  Follow-up completed: full internal-code source labels now appear on grouped
  code/ribbon hovers as well as individual purchases. Available labels are
  deduplicated across the same exact code identity; mixed-code and unassigned
  aggregates do not inherit an arbitrary description. Supplier/document/purchase
  details remain individual-only. All **180/180** affected tests, independent
  review and fictional browser grouped-node/ribbon checks pass; screenshot
  saved, browser logs empty and preview resources released. Syntax, local links
  and whitespace pass. Refresh loads the correction without a backend restart
  or Odoo call; changes remain local/uncommitted.

- Completed on 2026-10-21: each convention category in the purchase Sankey now
  has its own stable colour, keyed by exact category identity using the existing
  HSL scheme. Allocation gradients start at the matching category colour;
  internal-code/purchase colours remain intact. The subsequent compact-layout
  follow-up halves right-column gaps from 36 to 18 SVG units, with centred
  16-unit label frames retaining the 10.5px font and complete inline amounts.
  All **175/175** affected tests, independent review and fictional embedded/
  expanded/40-entry browser colour/gradient/non-overlap checks pass; browser
  logs are empty. Screenshot saved and preview resources released. Syntax,
  local links and whitespace pass. Refresh to review; no Odoo call, backend
  restart, config change, commit or publication occurred. Previous full-suite
  results below predate this frontend refinement.

- Completed on 2026-10-21: right-hand purchase/credit names and localized EUR
  amounts now share one line at 10.5px. A bounded flex row preserves the entire
  amount and ellipsizes only an overflowing name; full source text remains in
  the accessible name, tooltip and detail table. Ribbons joining different
  endpoint colours use matching source-to-target SVG gradients, retained by
  foreground hover/focus; equal endpoint colours stay solid. All **174/174**
  affected purchase/budget/project/i18n tests pass. Independent review and
  fictional desktop/390px, expanded/embedded and FR/NL browser checks confirm
  intact amounts, including a 50-W name with 1,234,567.89 EUR, and no browser
  warnings/errors. Screenshot saved; preview tab/viewport/helper released.
  Syntax, local links and whitespace pass. No separate build/lint/typecheck
  command exists; earlier full-suite results below predate this display change.
  Refresh loads the change; no backend restart, Odoo call, config change,
  commit or publication occurred. Next action: refresh and review Budget.

- Completed on 2026-10-21: expanded purchase diagrams now fit the limiting
  available width or height proportionally, centred rather than stretched to
  viewport width. The available height accounts for the preceding title,
  financial notices and totals. All diagrams retain one shared physical scale
  so purchase/credit ribbon widths remain comparable. Resize recalculates the
  fit; restoring/cleanup clears inline sizes, observers and resize listeners.
  All **172/172** affected tests pass, including fit/aspect/scale and cleanup
  regressions. Independent review and fictional desktop/short-landscape/390px/
  40-entry browser checks confirm complete diagrams within the available frame,
  preserved aspect ratios, equal purchase/credit scale, retained tooltips and
  normal embedded sizing on return. Browser logs are empty. Screenshot saved;
  preview resources released. Syntax, local links and whitespace pass. Refresh
  loads this frontend-only correction; no backend restart, Odoo call, config
  change or publication occurred. Earlier full-suite results remain historical.
  Next action: refresh and review the fitted expanded graph.

- Completed on 2026-10-21: requested top-left square expand control opens the
  purchase Sankey in a viewport-filling native dialog with a sticky restore
  control. The same graph/amounts/details remain intact; toggle and Escape close
  it, return focus and restore the embedded view. Parent refresh captures focus
  before modal teardown, preserving the selected ribbon after native reparenting.
  All **170/170** affected model/renderer/integration/i18n tests pass, including
  modal focus boundaries, cancellation, stale callbacks and navigation cleanup.
  Independent review and fictional 1280px/390px browser checks confirm full
  viewport bounds, sticky control, retained ribbon interactions, bounded phone
  tooltips, FR/NL labels, Tab wrapping and Escape/toggle restoration, with no
  console warnings/errors. Screenshots are saved; preview resources released.
  Syntax, local links and whitespace pass. This frontend-only follow-up loads
  on refresh; backend/runtime PID **56096** and all data scopes remain unchanged.
  No Odoo call, private-config change, restart, commit or publication occurred.
  The prior 989-test full-suite result below predates this display refinement.
  Next action: refresh and review the expand control in Budget.

- Completed on 2026-10-21 (approved plan): purchase Sankey directly below the
  first budget-consumption comparison, using exact convention categories,
  internal codes and individual project allocations from posted supplier
  invoices/credit notes. Scope is project start through inclusive Brussels today;
  existing lifetime/annual calculations and earlier local experiments remain
  intact. Native SVG preserves the current palette, one-ribbon hover/focus,
  bounded tooltips, separate signed corrections on a shared currency scale and
  a complete accessible detail table. All interface text is FR/NL; missing
  mappings, amounts, currency/document access remain explicit.
  The final offline suite passes **989/989** in 73.85 seconds, including new
  source, HTTP, model/geometry and renderer/navigation regressions. The focused
  frontend/integration suite passes **166/166** and finance source/HTTP tests
  **85/85**. Independent review found no remaining actionable issue. Fictional
  1280px/390px browser checks confirm native SVG focus, Escape, desktop fit,
  bounded phone tooltips/scrolling, 40 retained entries, detail-state refresh,
  translated labels/literal source text and navigation cleanup; no page
  overflow or browser warnings/errors. Screenshots and test logs are saved in
  the chat visualization directory. Preview tab/viewport/helper are released.
  An initial programme fixture-startup timeout passed on exact retry and the
  final unchanged full run. Syntax and whitespace checks pass; there is no
  separate build/lint/typecheck setup. The verified old workspace server was
  replaced with hidden standard-user Node PID **56096**, loopback **8765**:
  welcome **200**, anonymous finance **401**, stderr empty. Sign in again after
  this reload. No live Odoo call, private-config modification, commit, push or
  publication occurred; actual purchase-document access remains unverified.
  Next action: user visual review of the local Budget view.

- Completed on 2026-10-20 (approved plan) on `codex/project-card-outline`,
  preserving the earlier local card experiment: planned section 03 now includes
  the convention's dotted monthly/cumulative linear hours reference over the
  full project lifetime, including future months. It remains project-wide when
  filtering people/resources or toggling Ormitters; unavailable/nonpositive
  budgets are disclosed in FR/NL without inventing zero. Actual section 02 now
  explicitly says **Heures réalisées · jusqu’à aujourd’hui** (also translated
  into Dutch). Small project-card circles are visually clipped while native
  keyboard/label selection and Back focus restoration remain intact; the three
  large programme selectors retain visible circles. The full offline suite
  passes **949/949** in 57.29 seconds; model **46/46**, renderer **74/74**,
  independent review, 30-script syntax, eight-document link and whitespace
  checks pass. Fictional desktop/390px UI checks confirm the final convention
  total and TH-filter invariance, FR/NL rendering, all three project-card
  contexts, programme isolation, no page overflow or console warnings/errors.
  Screenshots are saved; preview tab/viewport/helper are released and its exact
  owned fixture is removed after the unexpected shutdown. Rechecked saved
  files and test log on resumption. The local server was stopped and has been
  relaunched as hidden standard-user Node PID **15228**, loopback 8765 (welcome
  200, current public translation catalogue, empty stderr). Sign in again after
  restart. No live Odoo access or private-config changes occurred; changes remain
  local/uncommitted and unpublished. Next action: user visual review.

- Completed on 2026-10-16 on `codex/project-card-outline`, after the successful
  publication/checkpoint push (`main` / `origin/main`: `32d7211`, feature parent
  `104b533`): shared project cards show the short name/manager portrait at rest,
  then trace a turquoise outline and reveal full name, source number and strict
  start/end dates on hover or keyboard focus. The three programme selectors
  retain their explicit flip variant. Native selection, cached metadata and
  FR/NL labels remain intact; touch cards show details statically and reduced
  motion removes transitions. The full offline suite passes **940/940** in
  55.69 seconds; all **178/178** affected tests pass again after the final SVG
  viewport correction. Independent review and fictional desktop/390px browser
  checks confirm hover/focus, programme isolation, no overflow or console
  warnings/errors, and a complete outline at both card sizes. A controlled
  fixture also exercises touch/reduced-motion CSS and Dutch missing-date text;
  this is not real-device/OS emulation. Syntax/link/whitespace checks pass.
  Screenshot saved; preview tab/viewport/helper/fixture released. Existing
  server welcome is 200; refresh loads this frontend-only update without a
  restart. No Odoo access, private-config change or new publication occurred;
  this experiment remains local/uncommitted. Next action: user visual review.

- Publication completed on 2026-10-16 after the user's explicit request to
  commit all changes and push `main`: feature commit `104b533` contains the
  reviewed 57-file FR/NL/project-controls implementation, tests and docs.
  Local `main` fast-forwarded from `dad8b58`; the push succeeded and the remote
  `refs/heads/main` was verified at `104b533d039a8f4d6f352fb098905bcf1c054b2c`.
  Existing final **936/936** offline tests apply to the unchanged source snapshot;
  publication review found no secrets/private files or Odoo guard changes.
  The next experiment uses branch `codex/project-card-outline` for a different
  project-card presentation inspired by the supplied Uiverse reference. That
  implementation plan is now approved and completed on that branch, separately
  from the published main snapshot. This checkpoint records the publication.

- Completed on 2026-10-16 (approved plan) on `codex/fr-nl-dashboard`, created
  from clean `main` at `dad8b58`: complete French/Dutch presentation, header
  selector and credential-independent local language preference; full versus
  rolling Brussels today +/-3-year calendars; multiple actual-contributor
  exclusions with a hatched ignored-hours remainder; and confirmed-zero actual
  monthly tooltip/table filtering. Calendar left labels show only short names
  across personal, unit and programme views, retaining full names on hover and
  for assistive technology. Cached selections, reference planning/total extent,
  signed corrections, unknown sources and Odoo's read-only guard are preserved.
  The final offline suite passes **936/936 tests** in 55.75 seconds. Independent
  review, fictional desktop/390px UI checks, syntax/documentation-link and
  whitespace checks pass. UI checks confirm language persistence, exclusions,
  shared calendar/count axes and no page overflow or console warnings/errors.
  Additional regressions cover config-only language/manual login, partial-write
  cleanup, live validation repaint and generated-name provenance. The preview
  tab, viewport, helper and verified temporary fixture are released; screenshots
  are saved. Hidden standard-user Node PID **33592** now serves the checkout on
  loopback 8765 (welcome 200, public preferences/current assets verified,
  anonymous project-hours 401, empty stderr). Sign in again after restart.
  No live Odoo access, private-config modification, commit, push or PR occurred
  during that implementation task. Publication is now recorded above.

- Published on 2026-10-15 after the user's explicit commit/push request:
  nine commits on `origin/codex/project-budgets`, from `658a865` through
  `0ca12c5`, separate French login feedback, BW personnel-cost exclusions,
  project cards/DiCo timelines, Programmes, personal recommendations,
  annual capacity/coverage, project planning charts, test-fixture lifecycle
  and shared dashboard integration. Source/test working-file bytes were
  preserved during the split. The final publication verification passes
  **870/870 offline tests** in 52.25 seconds, plus syntax, documentation-link
  and whitespace checks. Independent publication review found no credentials,
  private exports or Odoo read-only guard regressions in the intended files.
  Private configuration remains ignored. Documentation is included in the
  following publication checkpoint; no Odoo writes or backend restart occurred.

- Completed on 2026-10-15 (approved plan): Project Hours overview moves
  supplemental convention/planning notes into an accessible circled-i popup
  and replaces them with actual-to-date gaps against dated planning and the
  convention's linear reference. Personal actual bars gain orange/red gradient
  overruns only; whole-project/lifetime bars retain their current presentation.
  Actual history gains a solid red scheduled-planning line. A new full-project
  monthly/cumulative planned-area chart includes future planning and explicit
  TH/resource groups. Existing cached project data is sufficient; no extra
  endpoint or Odoo write is required. All **870/870 offline tests** pass in
  51.60 seconds, including 32 project-planning, 40 project-monthly, 63 renderer
  and 95 controller cases. Independent review and fictional desktop/390px
  browser checks confirm gradients, accessible popup/Escape/focus behavior,
  dated red line, future-only/TH resources, independent employee filters and
  synchronized cumulative/Ormitter controls. No page overflow or browser
  warnings/errors were observed. Syntax, documentation-link and whitespace
  checks pass. An earlier isolated fixture-start timeout passed on targeted
  retry and the final complete run. Screenshots are saved; preview tab,
  viewport, helper and fixture are released. Existing welcome returns 200;
  refreshing loads this frontend change without restarting the backend.
  Feature code is committed and published as recorded above; no live Odoo
  access occurred during this implementation.

- Completed on 2026-10-15: added the requested orange overplanning message
  to the third coverage card when the unrounded ratio exceeds 100%. Exactly
  100% remains normal; real excess hidden by decimal rounding reads > 100%.
  The supplied French wording, upper-bound tolerance and stale-warning cleanup
  pass **23/23 renderer tests**. Independent review and fictional browser checks
  confirm the exact note, orange value/text and no overflow or console warnings
  or errors. Syntax/documentation-link/whitespace checks pass. Screenshot saved;
  preview tab, helper and verified temporary fixture released. Files remained
  intact after the reported interruption; the stopped workspace server was
  relaunched hidden as standard-user Node PID **27580**, loopback 8765, with
  welcome 200 and empty stderr. Sign in again after restart. Scope, source reads
  and annual-capacity calculations are unchanged; work remains uncommitted.

- Completed on 2026-10-15: the user requested a separate third capacity card,
  **Pourcentage des heures planifiées**, to the right of available/planned
  hours, with a large percentage and the supplied French explanatory note.
  The low-ratio note advises checking with the Unit Manager; the normal note
  explains why 100% planning is not expected. Calculations, scopes, strict
  85% threshold and entitlement policy remain unchanged. **146/146 affected
  offline tests** and syntax/documentation-link/whitespace checks pass.
  Fictional desktop/800px/390px verification confirms equal matching cards,
  large figures, both exact notes, phone stacking and no page overflow or
  console warnings/errors. The screenshot is saved; preview tab, viewport,
  helper and verified temporary fixture are released. No Odoo access or backend
  restart was needed; the existing welcome returns 200. Refresh loads the
  local/uncommitted frontend update on `codex/project-budgets`.

- Completed on 2026-10-15: the requested follow-up clarification reconciles
  the registered-calendar deduction by confirmed absence category, using only
  exact own resource intervals and their own approved request/type links.
  Calendar working-hour intersections reconcile without category overlaps;
  paid annual categories match the entitlement reference. Case-specific
  sensitive aggregates stay in the private answer/receipt, not repository
  documentation. No free-text reasons, payroll or Odoo writes were accessed;
  no production code or capacity policy changed. Registered dates can include
  future absences and must not be described as leave already taken.

- Completed on 2026-10-15: approved a compact planning-coverage percentage
  in the Mon temps capacity panel, with an orange textual warning below 85%
  of available hours. **146/146 focused offline tests**, independent review,
  desktop/390px browser checks, syntax, documentation-link and whitespace
  checks pass. Decimal exact-85% cases tolerate only machine roundoff; genuine
  shortfalls, unknown/zero sources, estimates and reactive scopes are covered.
  Browser checks confirm orange low coverage, removal above 85%, readable
  mobile cards and no horizontal page overflow or console warnings/errors.
  The screenshot and private Sources receipt are saved; preview tab, viewport,
  helper and verified temporary fixture are released. No backend restart is
  needed; welcome returns 200.
  Targeted guarded own-account reads reproduce the user's Planning numerator
  and denominator exactly: registered personal calendar intervals explain the
  latter, whereas this dashboard subtracts new annual paid entitlements.
  HR and Planning resource calendars agree. No absence categories/reasons,
  leave requests, payroll or Odoo writes were read/performed. The existing
  entitlement-based capacity definition is retained. Work stays local.

- Completed on 2026-10-14: clarified that the capacity panel's total personal
  planning covers complete selected years or the custom range, including
  future allocations and hidden projects. The existing arithmetic already
  covered that scope; no cutoff or source behavior was changed. The first
  recommendation heading and helper now say **Arrêter (ou clarifier)**.
  Independent review and **143/143 focused offline tests** pass, including a
  controller regression for current/future years, unassigned and uncatalogued
  allocations. Fictional browser checks confirm complete 2026 and combined
  2026/2027 totals, matching capacity scope, the renamed heading and no desktop
  overflow or console warnings/errors. The screenshot is saved; the synthetic
  tab, helper and verified temporary fixture are released.
  Syntax/documentation-link/whitespace checks pass. The earlier
  full 838-test result remains historical; no backend restart or Odoo reads
  were needed. After the reported interruption, the files are intact and the
  existing server's welcome still returns 200. Work is local/uncommitted.

- Completed on 2026-10-14: **Capacité de travail et planning** is between Mon
  temps recommendations and the pie, with scoped available-work hours/days and
  total personal planning. The approved policy excludes unpaid grants and
  prior-year carryover; annual rights ignore requests/consumption balances.
  Calendar attendance already incorporates part-time. Global closures are
  unioned/intersected, paid categories require typed/canonical confirmation,
  and accrual/identity/source ambiguity remains unavailable. Missing future
  calendars reuse current-year net days/hours explicitly estimated; published
  future calendars with missing rights reuse current rights. Custom ranges
  use an explicit work-hour entitlement prorata. Planning totals include all
  own scoped slots, independently of hidden pie slices; year/refresh caching
  rejects stale responses. Native year details preserve open/focus state.
  Guarded live own-account aggregates and the reloaded endpoint reconcile.
  Final **838/838 offline tests** pass in 97.00 seconds, plus independent review,
  fictional desktop/390px, syntax, documentation-link and whitespace checks.
  Test-only startup now allows 15 seconds and cleans failed fixture resources;
  two lifecycle regressions cover the previously observed five-second timeout.
  The workspace server was reloaded as hidden standard-user Node PID **32300**
  on loopback 8765; welcome and assets match, authenticated capacity returns
  200, anonymous capacity 401 and stderr is empty. Sign in again after restart.
  Current own contract reads are denied and `hr.version` unavailable; schedule
  changes/employment dates are not inferred, and other-year use is estimated.
  No leave requests/payroll/Odoo writes or private configuration changes were
  performed. Synthetic tabs, viewport, preview helpers/fixtures and the temporary
  verification session are released. Work remains local/uncommitted on
  `codex/project-budgets`.

- Completed on 2026-10-13: the four Project Hours macro cards use 20% lower
  minimum heights and less spacing, retaining readable fonts and natural
  expansion for notes. Positive excess now says **planifiées en trop par
  rapport à la convention**. Projection arithmetic and source reads are
  unchanged. Independent review and **57/57 project-browser tests** pass;
  fictional desktop/tablet/390px checks confirm readability and no overflow.
  Syntax, documentation-link and whitespace checks pass. This frontend-only
  change loads on refresh; the existing workspace welcome responds with 200.
  Synthetic preview tab, viewport, helper and fixture directory are released.
  Work remains local/uncommitted.

- Completed on 2026-10-13: recommendations now have four exclusive columns,
  **Arrêter / Ralentir / Augmenter / Continuer**, with Arrêter first in red.
  Stop rows now use only short project name plus compact inline reasons;
  detailed evidence remains in the native tooltip/accessibility description.
  The heading names selected years or French custom dates and updates in place.
  Compact-row/title checks pass on desktop and 390px without horizontal
  overflow; the existing local server responds with 200 and needs only refresh.
  Stop takes priority for confirmed absent personal planning from Brussels today
  through project end, a known end date on/before today, or lifetime BW employee
  actuals reaching a positive convention **Budget personnel BW**. All applicable
  reasons are shown; no weekly target conflicts with stop advice. Independent
  stop evidence remains visible when personal interpolation is unavailable.
  The optional `/my-time` `personnelBudget` aggregate reads only exact involved
  positive-budget project IDs and identified employee time, from each known
  project start through inclusive Brussels today, retaining signed corrections.
  Known Ormitters are excluded; typed HR evidence, duplicates, schema/access
  failures and unknown functions cannot fabricate confirmed BW consumption.
  Colleague records/identities stay backend-only. Scope membership and the
  explicit personal available-hour badges remain unchanged.
  The previous full **769/769 offline tests** and independent review pass;
  the latest frontend compaction passes **166/166 affected tests**. 18-script syntax,
  documentation links and whitespace checks pass. Fictional desktop/tablet/
  390px checks verify four/two/one columns without overflow, all stop reasons,
  Ormitter exclusion and invariant stop membership with retained slider focus.
  The backend is loaded in hidden standard-user Node PID **22588** at
  `127.0.0.1:8765`; welcome matches the checkout (200), anonymous project-hours
  returns 401 and stderr is empty. Sign in again after this launch. All changes
  remain local/uncommitted; no real Odoo access/write or private config change.
  Synthetic preview tabs, viewport, helpers and fixture directories are released.

- Earlier on 2026-10-13: personal below-plan badges in Project Hours and the
  Mon temps pie legend now say available planned hours through the selected
  period's end, independently of the project's clipped calendar reference.
  Recommendations use the explicit French linear-interpolation title. Red rows
  with bold stop-booking advice require successful complete accessible personal
  planning and no positive allocation from inclusive Brussels today to project
  end, including unselected years; uncertain inputs cannot prove absence.
  They retain the signed pace gap and tolerance group, replacing weekly advice.
  Final **731/731 offline tests**, independent review, 18-script syntax and
  local documentation-link/whitespace checks pass. Fictional desktop and 390px
  checks verify signed wording, red/bold styling, retained slider focus, unchanged
  nonpersonal comparisons and selected annual/multi-year/custom end dates.
  These frontend changes load on refresh; no workspace-server restart or real
  Odoo request/write was performed. Work remains local/uncommitted.
  Synthetic preview tab/viewport/helper/fixture resources are released. The
  existing workspace Node PID 21280 remains on 127.0.0.1:8765; read-only HTTP
  checks confirm the matching welcome page (200) and anonymous hours refusal
  (401). A duplicate startup attempt exited on the occupied port without
  replacing that process or its sessions. Refresh loads the new frontend.

- Project Hours now shows explicit French year/custom-range titles and hides
  the personal comparison only when both scoped planned and actual hours are
  known zero. **Convention et planning**, above the horizontal bars, now shows
  four large rounded cards: convention hours, signed actuals since project
  start through Brussels today, remaining planning from tomorrow with its TH
  portion, and projected actual-plus-remaining minus convention. Remaining
  planning uses Brussels midnight bounds through the project end; post-end
  actual imputations remain included. The four cards exclude known Ormitters
  independently of year/custom scope and the graphs' inclusion checkbox.
  A readable unique `TH_` resource-name
  marker identifies a collective placeholder even if Odoo links it to an
  employee; technical linkage alone does not prove a real person. It identifies
  TH/other unlinked resources,
  warns on projected convention differences and shows future Brussels calendar-day gaps
  without confirmed person planning. Unknown identities and relevant negative
  corrections disclose indeterminate coverage rather than false completeness.
  Only continuous gaps of at least one clamped calendar month produce alerts;
  their exact dates are visible. Short gaps do not imply a full-coverage claim.
  **Mon temps / Recommandations** is a compact red/orange/green/black table above
  the pie, with live 15% tolerance, expected-to-date annual planning and
  remaining weekly targets clipped to selected/project dates. Arrêter/Ralentir/Augmenter
  sort by descending absolute hour variance, with stable short-name/ID ties;
  larger category headings have matching horizontal rules. The macro description
  uses the full available header width and wraps naturally on mobile. Slider
  focus and the pie remain stable. All 721 offline tests and desktop/tablet/390px
  fictional checks pass. The user's 2026-10-13 restart is verified; sign in again.
- **Programmes** is available after Unit DiCo with three larger DC1/DC2/DC3
  portrait cards (Backbone / Insight / Manufacturing). Their catchphrases and
  responsible names appear on the animated backs. Selecting a programme keeps
  all three cards above its fixed associated project list, shared compact project
  cards, lifetime calendar and monthly simultaneous-project chart. Switching
  programmes replaces the entire lower view; existing Hours/Budget details and
  Back focus are available without hiding the programme selector. Membership is
  the user's fixed 10/8/5 business-code list, including **in-beTwin 56261849**,
  resolved through bounded read-only project lookups with missing/ambiguous
  coverage disclosed. Programme overviews ignore year/custom-date scope, and
  lower project details retain the existing scope rules. Responsible portraits
  are optional exact-name/unique-ID reads; unavailable photos keep initials.
- Welcome-page config-file login failures now appear in bold orange
  (`#b45309`, weight 700). Pending retries remain neutral; manual submission
  clears the config notice. The action is labelled **Utiliser le fichier de
  configuration**. Existing message text and authentication behavior
  are retained. Refresh loads this frontend-only refinement.
- **Unit DiCo · 03 / Projets simultanés** is implemented below the unit calendar:
  a stepped monthly area/line of the maximum projects overlapping on any day
  of each month, over the identical lifetime date scale. It uses the same source
  exclusions, includes future and zero-gap months, and omits incomplete/reversed
  project periods with a coverage note. Monthly hover/focus/tap details, roving
  arrow-key navigation and an optional exact-values table are included. The
  two plots share gutters and synchronized horizontal scrolling. Focused tests,
  independent review and fictional desktop/390px checks pass. This chart makes
  no new source read.
- Both project timelines now place projects ending before Brussels today at
  the bottom, preserving start/name/ID order within each completion group.
  **Projets** adds the same compact lifetime calendar below its personal radio
  grid. Membership follows the shared year/custom-date activity scope; duration
  bars retain full source dates. Both timelines use a clearly visible left-to-right
  light-to-dark linear gradient over each project color, including grey ended bars.
  Shared rendering preserves grey ended bars,
  the dotted today marker, 0.5s viewport reveal, chart-only 2999 exclusion,
  click-to-detail, focus restoration and observer cleanup. Personal catalogue
  dates are optional guarded reads for exact involved IDs; missing/denied dates
  preserve projects, managers and hours without inventing periods.
- Both personal and Unit DiCo radio grids now use flip cards instead of sibling
  blur. Fronts now show only the leader portrait and bold unbracketed short title
  in black on white, with a rotating `#00bfb6` border accent. White backs display
  the source project number, short title, manager name and smaller italic full
  title over softly floating `#00bfb6`, `#0087b7` and `#ffce00` colors. A mini
  manager portrait remains beside the number; the example's green icon is omitted.
  Shared helpers
  parse only the existing name, preserve source case, avoid duplicate fallback
  titles and never substitute an Odoo ID for a missing project number. Long
  titles use ellipsis, with the complete source name in the native radio label
  and tooltip. Dates and the complete convention macro budget are retained
  in the native tooltip and accessible description rather than visible back
  rows. Manager portraits/initials reuse the existing DTO. Hover/focus turns
  the card over in 550ms while retaining native selection and one accessible
  metadata description. Hidden backs pause their 4.8s color animations; the
  visible front border rotates in 5s. Touch/no-hover CSS displays both faces
  without rotation; reduced motion disables the flip transition and all new
  decorative animations. Cards have fixed heights within each
  grid: 112px Unit, 190px personal desktop and 180px personal phone, with bounded
  faces. Touch/no-hover cards use twice that height. Full date/budget values
  remain in the label tooltip. Back number headers reserve radio space.
  Budget metadata is optional, exact-ID, full-life and personnel-inclusive,
  independent of scope/personnel choices. Missing dates/amounts remain explicit,
  and known amounts with unknown currency disclose that condition.
- **Unit DiCo** is the third sticky tab after Mon temps and Projets. It reads all
  accessible projects with exact `project.project.lead_unit_id` department 206,
  including archived/zero-hour projects, excluding Interne/Overhead. Compact
  manager-photo radio tiles precede **Unit DiCo · 02 / Calendrier des projets**:
  stable colored bars span full project dates on the earliest-start/latest-end
  axis, independent of personal year/custom scope. Projects ending in year 2999
  are omitted from timeline rows and both axis bounds while retaining their
  radio choices; an entirely excluded catalogue has an explicit empty calendar.
  Rows are now 25px tall with one-line names and full name/date tooltips. Bars
  ending before Brussels today and their row dots are grey; today's dotted black
  reference shares the original inclusive date scale. Each bar's inner fill
  animates over 0.5s on first vertical/horizontal viewport reveal per render.
  Reduced motion or absent observers display complete bars, and navigation releases
  observers before hiding/replacing their host. Radio colors remain unchanged.
  Missing or reversed dates
  retain selectable projects with explicit notices instead of invented bars.
  Radio/name/bar selection opens the existing Hours/Budget view; Back restores
  radio focus. Unit selection remains independent of personal membership. Shared
  exact-project caches reload safely after refresh/navigation, and departing
  project hosts release monthly observers and native bill modals.
- Budget convention comparisons now exclude recorded BW personnel costs by
  default. **Afficher les coûts de personnel BW** is unchecked initially;
  checking it restores the full lifetime source and **Frais de personnel**
  comparison. While unchecked, the top convention reference sums the selected
  convention's verified non-personnel allocations, rounded once after confirming
  identity, classification, currency and agreement with the source line total.
  Bar, ratio and balance use this filtered reference. If only project macro
  budget data is available, its known personnel amount is subtracted in the same
  confirmed currency; unverifiable filtered budgets stay unavailable. Macro
  cards and source DTOs retain their original values. Every actual horizontal
  amount and rubric uses the selected independently aggregated cost source.
  Posted supplier expenses, including Ormit Talent and subcontracting,
  remain included even when carrying employee/hour dimensions. Annual graphs,
  code companions and expense details always omit confirmed BW personnel
  categories, with an explicit note above them. The separate annual Ormitter
  filter remains independent. Choices are remembered per project without new
  reads; unknown categories, currencies and source completeness remain explicit.
  Contradictory or invalid expense identities mark lifetime coverage partial.
- The shared sticky period bar now offers a right-aligned **Période
  personnalisée** editor with native start/end date inputs. Both Brussels
  calendar dates are included; valid changes apply immediately and incomplete,
  invalid or reversed drafts retain the last applied scope with a short message.
  Clicking a year restores year mode; the editor also has a return-to-years
  button. Escape/outside dismissal retains the applied range, and keyboard
  navigation to Budget closes the editor without focusing a hidden control.
  The same custom range governs Mon temps, personal project membership, scoped
  employee totals and project-clipped date ticks. Planning is prorated to local
  midnight boundaries, including DST; existing year planning stays UTC-based.
  Lifetime, monthly history and finance periods retain their independent scopes.
  **Mes projets** legend entries and selected-project comparisons now show a
  neutral **−x h en-dessous du prévu** badge below the full displayed positive
  plan; lifetime comparisons explicitly name the convention. Missing values do
  not produce a deficit.
- The selected **Projets** view now switches between **Heures / Budget** at the
  top. Budget replaces the hours graphs and hides the selected-year controls.
  **Budget · 01 / Convention** shows project macro information, workflow status,
  lifetime recorded costs versus a selected convention, and exact-rubric
  comparisons using the selected personnel-cost basis. Multiple convention
  versions require a choice and are never
  summed. Unmapped personnel/expense costs remain separately visible in the
  total when included by the selected basis. **Budget · 02 / Budgets annuels**
  shows every accessible annual period,
  including future years, as adjacent Budgeted/Billed/Committed vertical bars
  with thinner code companions, stable code colors, exact pointer/keyboard/tap
  details and shared signed scales per confirmed currency. Dense plots scroll
  within their cards. Annual plot/axis height is now 225px (25% taller), and
  macro cards/metadata use another 20% less spacing after the earlier compaction.
  Clicking a thin code bar opens a native **Factures et écritures** popup with
  signed category allocations, supplier/reference labels and Settlements New
  descriptions. Close/Escape/backdrop return focus to the bar; rerenders release
  modal state before detaching its host. Budgeted/Engaged measures stay distinct
  from associated billed entries.
  Annual details omit only confirmed all-five-zero rows, retaining negatives,
  pending-only activity and unknown amounts.
- Annual graphs share a default-off **Exclure les coûts des Ormitters** choice
  remembered separately per project. Canonical Ormit Talent/commercial-root
  identities, exact annual-line periods/categories/currencies and billed
  reconciliation govern exclusion. Confirmed purchase evidence is checked
  independently; unverified outstanding supplier commitments remain unavailable.
  Budget allocations, pending approval and reported Odoo balances stay unchanged
  by this supplier filter. The independent BW personnel choice governs convention
  actuals. Supplier descriptions or GL codes alone do
  not identify Ormit costs. Popups use narrowly projected posted expense
  allocations, exclude verified Ormit costs when requested, and separate unknown
  suppliers; full accounting records and timesheet descriptions are not exposed.
- The new finance route reads exact project/analytic-account records using the
  signed-in account and the existing Odoo guard. Lifetime consumption includes
  signed posted expenses by default, with independently available recorded
  monetary Hours costs when requested, through Brussels
  today, including late/early project entries with disclosure. It excludes
  payments and balance-sheet movements, uses the monetary field's confirmed
  currency binding, and never estimates rates. Annual 6xxx expenses remain
  separate from 7xxx income, 9xxx adjustments and parent net totals. Billed and
  committed overlap and are never added. Missing amounts, inaccessible lines,
  currencies and reconciliation gaps remain explicit. Finance caching/retry,
  refresh generations, panel/convention focus and responsive detail tables are
  independent of the existing hours data and filters.

- DiCo steering adds project/programme/unit macro summaries, meta coverage/source diagnostics, contributor drill-down, upcoming known deadlines and Summary/Resources/Budgets/Reliability project tabs. The connected-project-leader shortcut matches the session UID against a configured user relation and resets other filters.
- Steering reads live using the signed-in account, without persisted history or source writes. Authoritative cumulative project hours, visible timesheets and reconciled Progress/WP evidence are distinct; annual/convention financial periods and currencies are kept separate. The confirmed DiCo filter and programme reference are server-side local configuration; steering remains disabled by default until that filter is confirmed.

- The dashboard starts on **Mon temps**. Persistent sticky navigation contains Mon temps, Projets and the existing steering shortcuts. Personal years stay in that bar; irrelevant personal/project and consultant-hour switches are hidden in Mon temps.
- Mon temps resolves the signed-in user's exact employee/resource IDs server-side and reads personal hours across accessible projects, without a Lead Unit restriction. Account and employee overrides are ignored. Unsupported identity mapping fails closed; unavailable planning remains unknown.
- **Vue macro** is the first personal section: scoped planning determines equal-radius pie angles; signed actual hours through today in Europe/Brussels determine colored area (square-root radius). Stable project colors, radial tint bands, overrun/shortfall badges, accessible rounded tooltips and a strike-through hide/show legend are implemented. Hidden slices reform a full disk. Projects with both scoped totals at zero are omitted, including zero-hour/future-only actual records. Zero/unknown planning stays in the legend without an invented slice only when actual hours are nonzero.
- The legend puts positive planned totals first, with alphabetical order inside each group. A thick calendar reference circle uses the same area scale, from the center on the first scoped date to the rim on the final scoped date (1 January/31 December in year mode). It counts selected Brussels calendar days, including leap days, excludes unselected gaps and remains independent of hidden projects and planning-slot dates. A one-day custom scope reaches its endpoint on that day.
- **Hors planning** groups known unplanned projects with nonzero actual hours below a horizontal divider, with a visible-project signed actual subtotal. Unavailable planning stays labelled separately. **Mon temps 02 / Suivi par projet** is hidden.
- **Projets** initially shows a responsive native-radio grid of the person's projects with nonzero planned or actual hours in the shared year/custom-date scope. It includes projects hidden from the macro and works without DiCo configuration. Choosing a project opens its name and three comparisons: own employee hours, scoped all-employee project hours, then convention/actual hours over the project dates. Returning restores keyboard focus to its radio. Scope changes remove hours selections that are no longer involved; an open independent budget remains selected.
- The first two project comparisons use full selected UTC-year planning and signed actual hours through inclusive Brussels today. Planned bars occupy 75% of each track; actual bars use the same hour scale, capped at 100% with visible full totals. Their linear date tick counts only selected calendar days within inclusive project start/end dates, with the effective reference period shown. Missing/invalid project dates or no overlap leave this reference unavailable. Recorded hours are retained. Known consultant hours are excluded by default; unknown functions remain included with disclosure. Missing planning stays unknown, and zero-plan actuals are labelled Hors planning without an invented date/ratio scale.
- **Convention · durée du projet** reads only the metadata-confirmed numeric `project.project.budget_staffing_convention_hours` field for **Budget personnel BW**, independently of translated labels. Actuals use inclusive project `date_start` / `date` boundaries through Brussels today, independently of year chips. A positive budget supplies the 75% convention baseline and linear project-date tick. An explicitly empty/nonpositive budget replaces the top bar with a short MIS update message; inaccessible, missing or malformed fields show an unavailable message. Both retain a clearly labelled unscaled actual distribution. Missing/invalid/reversed dates leave actuals unavailable; no all-history period is invented. Budget/date reads are optional and isolated, with no staffing/planning/monetary substitutes. The project-only Ormitter choice affects both project-wide actual comparisons; convention hours remain the source scalar with full decimal precision.
- The selected project title is four CSS pixels smaller and all comparison/skeleton bars are 37.8px high (10% thinner). Lifetime contributor focus/tooltips retain their comparison, while colors remain shared by exact employee ID.
- Project bars fill together over one second when rendered, with fixed date ticks and final widths. Reduced-motion preferences show final bars immediately; refreshing loads this CSS-only refinement without a server restart.
- The project-wide comparison defaults to **hors Ormitters** and offers an unchecked **Inclure les heures des Ormitters** checkbox only when full-history nonzero hours or a confirmed staffing assignment identifies an Ormitter. Its per-project in-memory choice updates cached planned/actual totals locally; the personal comparison and legacy inclusion control remain independent. The title switches to **Ormitters inclus** when checked.
- Project actuals are grouped by exact employee ID (resource ID only when no employee is present), with unique stable colors and a subtle light-to-dark gradient within each employee segment of the proportional stacked bar. Two-decimal contributor hours reconcile exactly to the displayed total. Safe optional profile photo/name bubbles sit inside their matching segments; narrower segments show avatar-only bubbles, and tiny segments retain the matching contributor list and keyboard/tap details. Missing photos use initials. Negative employee nets use a neutral net bar and signed breakdown rather than positive surfaces.
- The selected view names its bar section **Projets · 01 / Vue d’ensemble** and
  adds **Projets · 02 / Évolution mensuelle**. Signed employee areas stack with
  the bar colors; a thicker net total draws on top and a dotted convention reference
  uses precise daily proration. Actuals run from exact project start through
  Brussels today, including recorded hours after project end, independently of
  year filters. The current month is partial and zero months remain visible.
  Missing end/budget omits only the reference; missing start leaves the timeline
  unavailable. Negative corrections stack below zero with a visible note. The
  graph offers a second synchronized Ormitter checkbox using the same default-off
  per-project setting, beside **Par mois / Cumulé**. Monthly is the default;
  cumulative prefixes employee hours, net total and convention allowance, which
  plateaus after project end. Each project's mode is remembered in browser memory.
  Areas and reference lines reveal together for one second on first viewport
  entry and every actual mode/inclusion change; year/resize/unchanged rerenders
  do not replay. Reduced motion is respected. Rounded hover/keyboard/touch month details and a
  contained scrollable exact-value table expose the numbers on desktop/mobile.
- Employee names in Projets · 02 are now filter buttons. Selecting one shows
  only their solid actual-hours line and dotted linear planned-hours reference,
  retaining monthly/cumulative mode. Clicking the selected name again or
  **Tous les employés** restores the stacked project chart. Details/table follow
  the selected employee; bars retain their existing scope. Each project remembers
  its employee selection, and excluding a selected Ormitter clears it.
  The reference uses full-project planning, including future allocations clipped
  to project dates, with exact employee/unique resource identity. Missing or
  unresolved planning remains unavailable; known empty planning remains zero.
  Employee selection changes replay the same one-second animation and preserve focus.
- A single authenticated exact-project read supplies classified raw hours, the connected employee identity, contributor profiles and confirmed Ormitter presence. Assignment enrichment uses only metadata-confirmed direct project/employee relations in `bw.staffing.convention`, with exact-ID postfilters. Optional assignment/photo failures retain hours and disclose incomplete presence checks. Client caching is by exact project ID; changing years recalculates locally, refresh invalidates pending generations, and late responses cannot overwrite another selected project's detail.
- Project tiles show optional manager photos from exact, metadata-confirmed `project.project.user_id` and `res.users.image_128` read-only lookups. Missing permissions, metadata or photos retain the hours and use initials instead. Only bounded validated raster data is exposed; external URLs and SVG are rejected. Existing personal detail APIs and internal DiCo portfolio shortcuts remain available separately.

- The browser dashboard implements personal/project actual and planned hours, remaining hours, monthly/cumulative charts and task deadline markers. Top-level workbook upload controls are currently commented out; XLSX parsers remain implemented.
- Authentication adds a responsive Buildwise welcome page at / and /login, using an official local logo and source-backed blue/turquoise styles.
- Odoo email/password login and the optional **Utiliser le fichier de configuration** button create the same HttpOnly/SameSite session. Config login reads the private username/API token on the server and requires a loopback socket and Host. Compact welcome-page information covers missing/invalid config and rejected tokens. The dashboard and all connector routes require the session; request/config overrides cannot replace its identity or Odoo permissions.
- Logout, fixed expiry (eight hours by default), replacement-login rotation, origin checks and shared login rate limiting are implemented. Manual passwords are retained only in server memory for XML-RPC calls; configured tokens remain in the private file and session memory. A server restart clears sessions. Credential-bearing RPC errors and malformed-config errors avoid secret reflection, and RPC redirects are rejected.
- HTTP serving uses an explicit application-page/asset whitelist; personal chart assets require authentication. config.local.json is excluded from Docker build contexts.
- README, example configuration, technical wiki, decisions, known issues and change log reflect the new behavior.

## In Progress

- The approved 2026-10-21 purchase Sankey is completed and verified as recorded
  in Functional State. Local Budget visual review is the next action; actual
  account/schema permissions remain a verification limit. Earlier uncommitted
  project-card/planning changes on `codex/project-card-outline` are preserved.

- Completed four-card macro refinement on 2026-10-13, started 2026-10-12: convention, actuals since
  project start through Brussels today, future planning from tomorrow with
  remaining TH subtotal, and actual-plus-future minus convention. All macro
  fields exclude known Ormitters independently of the graph checkbox. Future
  slots use Brussels project-day bounds and UTC-duration proration; actuals
  retain post-end imputations. Coverage alerts now require one continuous
  calendar month and show exact qualifying dates. Four large rounded cards and
  responsive 4/2/1 layout are implemented; 24 helper and 55 renderer tests pass.
  Root index wiring is fixed to the macro cohort. All 721 full offline tests,
  independent review, desktop/tablet/mobile visuals and documentation checks
  pass. Macro values remain fixed when years or graph Ormitters change; long
  gap dates/details appear and the short final-day eXtRAI gap is suppressed.
  Targeted source aggregates as of 2026-10-12 reconcile: convention 3890.3967h,
  actual 995h, remaining 3483.9288h including 370h TH, projected excess 588.5321h.
  This frontend-only change reuses existing cached project data. The explicit
  user restart on 2026-10-13 is verified as hidden standard-user PID 21280 on
  loopback port 8765. Preview resources are released; changes remain uncommitted.
- Completed 2026-10-12 correction: eXtRAI's TH resource is represented by a linked
  employee record. The old empty-link requirement therefore hid two allocations
  (261.71h in 2027, 370h total) and incorrectly counted placeholder coverage as
  a person. The corrected optional identity service prioritizes an exact readable
  TH resource-name marker over technical employee linkage. Guarded live reads
  confirm lifetime planning 4352.34h, confirmed TH 370h and planning without TH
  3982.34h. Macro description width, descending absolute recommendation gaps
  and stronger category separators are implemented; 150 focused frontend tests
  pass. All 707 final offline tests, 44 independent backend checks, 54 renderer
  checks after the clarified TH wording, desktop/390px visuals, syntax,
  whitespace and local documentation links pass. Native slider focus/order
  remain stable and linked placeholders do not fill real-person coverage gaps.
  The necessary workspace restart is verified as hidden standard-user PID
  36104 on loopback port 8765. Preview resources are released.
  Odoo remains read-only and work stays local/uncommitted.
- Completed 2026-10-12 follow-up: explicit French selected-period hour headings,
  French navigation/catchphrase presentation, full-project history labels and a
  compact three-column **Recommandations** block above the personal pie are
  implemented and verified. Recommendations use a live 15% default
  tolerance against each selected year's date-clipped expected-to-date hours,
  with remaining weekly targets bounded by scope/project dates. The requested
  targeted guarded eXtRAI read reproduces 664.6 planned/739 actual hours in
  2026, and 852.7549616648411 cumulative expected hours through September from
  2561.07 lifetime planned hours over 304/913 project days. This is the documented
  lifetime-versus-selected-year basis, not an arithmetic discrepancy. Source
  calculator semantics are retained. Fictional desktop/390px checks confirm
  native slider focus, immediate grouping without pie/RPC redraw and explicit
  year/custom-range titles. All 700 integrated offline tests pass.
  The additional project-hours follow-up now adds lifetime convention/planning
  information, confirmed TH exclusions and future real-person coverage, and
  hides only known-zero personal comparisons. Optional exact-resource identity
  metadata preserves unknown links; live metadata confirms the singular
  `resource.resource.employee_id` field is one2many. Planning desktop/390px
  checks confirm TH totals, gap dates, zero-personal hiding/restoration and
  Ormitter refresh with retained details/focus. Independent review, syntax,
  whitespace and local links pass. The backend restart is verified as hidden
  standard-user PID 11028 on loopback port 8765. Preview resources are released.
  No Odoo write or Git mutation occurred; changes remain uncommitted.
- The **Programmes** selector and associated project views are complete locally.
  All **648/648 offline tests**, independent review, synthetic desktop/390px
  layout/selection/detail checks and syntax/link/diff checks pass. Loading
  portrait and project-list actions retain keyboard focus and reject duplicate
  activation. The necessary workspace restart is verified as hidden standard-user
  Node PID **30696** on port **8765**; sign in again. The only live source read
  during this iteration was the requested targeted in-beTwin number lookup.
  Changes remain uncommitted; no Odoo write or publication was performed.
- The latest animated project-card design is complete locally in both grids:
  white/black portrait/short-title fronts with a rotating turquoise border;
  white floating-color backs with number, short title, manager and italic full
  title. Fixed sizes, ellipsis, mini portraits, native radios and date/budget
  tooltips/descriptions are retained. All 186 focused tests, independent review
  and fictional desktop/390px layout checks pass. Syntax, local links and diff
  checks pass. Refresh loads this frontend refinement; no workspace restart,
  new Odoo access or publication was needed. Changes remain uncommitted.
- Recovery verification after the unexpected Codex exit is complete on
  2026-10-10. All 586 offline tests in 20 files pass; source/asset integration,
  syntax, documentation links and conflict-marker checks pass. The saved
  changes are intact on `codex/project-budgets`; no repair was required.
  Workspace server PID 27424 survived and is still responding on port 8765,
  without restarting or clearing sessions. New modules/tests and existing
  refinements remain local and uncommitted.
- The Unit DiCo simultaneous-project chart is complete locally. All 175 focused
  UI tests pass, including 14 new calculation/interaction cases. Independent
  review and a 400-case daily-count oracle pass; fictional desktop/390px checks
  verify alignment, linked scrolling, month tooltips/keys and the exact-values
  table without page overflow or warning/error logs. The requested workspace
  restart is verified on port 8765. No new source access, backend/dependency
  change or publication; code/tests/docs remain uncommitted.
- Stronger linear gradients are complete locally for both shared timelines.
  Fictional desktop checks confirm colored/grey fills, unchanged 14px bar height,
  reveal animation and today marker; no browser warning/error logs. Independent
  review found no issues. This CSS-only change needs a page refresh; focused/full
  tests were not rerun. Changes remain uncommitted.
- Requested flip cards and blue hover backs are complete locally in both grids.
  All 308 focused tests pass, independent review found no issues, and fictional
  desktop/390px checks confirm flip/color, readable details, sharp siblings,
  native selection/Back focus and no page overflow or warning/error logs.
  The workspace server was restarted and verified on port 8765. All code/tests/
  docs remain uncommitted, without live source access or publication.
- Completed-last ordering and the personal project timeline are complete
  locally. All 259 focused UI/backend/authentication/read-only tests pass;
  independent review and fictional browser checks pass. The workspace server
  was restarted to load the new personal catalogue dates and is verified on
  port 8765. Code/tests/docs remain uncommitted, with no live source access.
- The requested compact Unit DiCo timeline, per-bar viewport reveal, grey ended
  projects and dotted today marker are complete locally. All 104 focused tests
  pass; independent review and fictional desktop/390px scrolling checks pass.
  The user's immediate restart was completed with a verified hidden workspace
  server on port 8765. Changes remain uncommitted; no source access or publication.
- The earlier hover-blur refinement has been replaced by the requested flip
  cards. Historical checks below describe that earlier implementation only.
- The requested Unit DiCo year-2999 timeline exclusion is complete locally.
  All 92 focused renderer/controller tests pass, including four new regression
  cases for both bounds, exact ending year, selectable excluded projects and
  an entirely excluded calendar. This frontend-only refinement preserves the
  catalogue and existing uncommitted work; no new source access or publication.
- The requested French BW checkbox label and personnel-free convention budget
  reference are complete locally. This supersedes the earlier choice to retain
  the full displayed convention reference while personnel costs are hidden.
  All 509 offline tests in 18 files pass, including the final rounding fix and
  Unit DiCo teardown regression. Fictional browser checks verify both checkbox
  states, matching bar/ratio/balance, unchanged raw macro cards and retained
  control focus. No new source reads, Odoo writes or publication occurred for
  this follow-up. The earlier Unit DiCo catalogue read remains the only new
  source verification in this iteration.
- The approved Unit DiCo catalogue/timeline is complete locally on
  `codex/project-budgets`, preserving earlier uncommitted budget/date work.
  All 503 full-suite tests passed; the additional host teardown regression
  passes with all 39 project-renderer tests. Independent source/controller
  review and fictional desktop/390px checks passed. A guarded live catalogue
  read returned 50 accessible projects, including Extrai, all with valid date
  pairs. Source record-rule visibility does not prove organization-wide
  completeness. No Odoo write, config change, commit, push or stash occurred.
- The BW personnel budget update approved with **go** on 2026-10-10 is complete
  locally on `codex/project-budgets` at published HEAD `ba96523`. All 451 offline
  tests, syntax/whitespace, independent financial review and fictional desktop/
  phone checks pass. The verified workspace server was restarted to load the
  service projection. This change and the earlier custom-date refinement remain
  uncommitted; no push, stash, private-config access or live Odoo request occurred.
- The custom-date and below-planned-label update approved with **go** on
  2026-10-10 is complete locally on `codex/project-budgets`, based on published
  HEAD `ba96523`. All 429 offline tests, syntax/whitespace, independent review
  and desktop/mobile fictional-data checks pass. Changes are uncommitted;
  no push, stash, private-config access or live Odoo request occurred.
- Publication completed on 2026-10-09 after the user's **commit push** request:
  feature commit `482271c` (**Add project budget dashboard with bill drill-down**)
  was pushed normally to the confirmed public `ArnaudBBRI/odoo_time_analysis`
  repository on `codex/project-budgets`. The branch tracks its matching origin
  branch; the remote feature SHA and clean working tree were verified. A
  source-specific supplier display suffix was replaced with fictional test
  identifiers, then all 408 offline tests passed again. Private configuration,
  credentials and real bill/personnel records are excluded. No PR was created.
- The bill-detail refinement approved with **go** on 2026-10-09 is complete
  locally: scoped allocated expense popups, preserved supplier filter, 25%
  taller annual plots and another 20% tighter macro card/metadata spacing.
  All 408 offline tests, independent review, desktop/390px modal interactions,
  source/privacy checks and a targeted live Extrai read pass. Runtime reload
  is verified. The budget feature is committed/pushed as `482271c`; no Odoo
  writes occurred.
- The user-approved annual-budget refinement is complete locally on 2026-10-09: thinner
  per-code companion bars, a default-off Ormit Talent cost exclusion shared by
  all annual graphs, a roughly 25% more compact top summary, and removal of
  confirmed all-zero annual detail rows. All 386 offline tests, independent
  review, desktop/mobile interactions and targeted live Extrai checks pass on
  `codex/project-budgets`. Runtime reload is verified; this refinement is included
  in published feature commit `482271c`.
  The cost preference is independent of hours inclusion and selected years.
  Unavailable supplier/commitment attribution remains explicit. No Odoo writes
  are approved.
- Budget discovery completed on 2026-10-09 on the user-requested new branch
  `codex/project-budgets`, created from published dashboard/state commit
  `288ef6d`. The user now requests a top Heures/Budget switch, convention macro
  information and lifetime consumption by rubric, plus all annual years as
  adjacent Budgeted/Consumed/Committed vertical bars. The proposed first
  implementation was approved by the user's **go** and is complete locally,
  including recorded personnel costs in lifetime consumption. No new commit,
  push, stash or Odoo write was performed for this iteration.
- Guarded live metadata and exact-project reads verified convention/annual
  budget workflow states, monetary line measures and project macro budget fields.
  The user's **Project > Dashboard > Settlements New** URL identifies
  `account.analytic.line`; its settlement, validation, invoice/payment statuses,
  financial fields and project-account records are readable for the configured
  account. Exact analytic-account scoping retains financial entries that lack
  a direct `project_id`. A follow-up read confirmed existing monetary costs on
  timesheet entries, although budget `achieved_amount` omits them. The lifetime
  consumption now includes these recorded personnel costs alongside expenses;
  annual charts retain the billed/invoiced measure. Personnel costs are never
  inferred from hours or an invented hourly rate.
- The approved **Mon temps** iteration and requested **Projets** grid/comparisons
  and stacked monthly/cumulative graph with employee isolation are committed in
  `724fde1` and pushed to `origin/codex/mon-temps-macro` on 2026-10-09,
  including the project-date-clipped scoped references. All 303 offline tests and desktop/mobile browser checks pass. The
  reported Extrai budget lookup remains corrected and verified against its
  live read-only value. Broader live-account verification remains pending.
- Completed config-token login, dashboard changes, tests and documentation are
  included in `724fde1` (**Add personal and project time dashboards**). The user
  requested commit/push and explicitly approved publishing this payload,
  including recorded Extrai budget/date facts, to the public
  `ArnaudBBRI/odoo_time_analysis` repository on `codex/mon-temps-macro`.
  No PR was created, and remote `main` was not pushed.
- The user-requested merge of exact commit `52e377e` is complete as `bf7d5f0`. That commit is the empty index parent of the earlier password-login stash, so the merge records ancestry without applying the stashed feature work.
- Main already includes PR #1's Docker/authentication/steering integration at `5d5aa26`. Real DiCo configuration, programme mapping and live Odoo validation remain pending. See [Pilotage](../wiki/PILOTAGE.md).

## Known Limitations

- Configured-account XML-RPC authentication and Extrai budget/date access succeeded in the targeted read-only diagnostic. Manual password compatibility and broader real-account data access remain unverified. SSO/MFA flows are not implemented.
- Real manager/employee photo availability, broader employee/planning permissions and staffing-assignment schema/access remain unverified. Targeted Extrai personal planning/actual reads succeeded for the configured account; the active browser identity was not independently compared with that account. Optional enrichment preserves hours; unavailable assignments cannot confirm Ormitter presence and unavailable planning remains unknown.
- **Budget personnel BW** source/type/unit and configured-account access are confirmed for Extrai (`54252043`, project ID `2083`): `budget_staffing_convention_hours` contains `3890.3967484570226` decimal hours (`3890:24` when rounded to hours/minutes). Other projects' budget-field access remains unverified; unsupported metadata or denied reads remain unavailable. All 50 projects in the configured account's exact-unit catalogue had coherent date pairs during the Unit DiCo check; other accounts and organization-wide completeness remain unverified.
- Sessions/counters are local to one process. HTTPS termination and SESSION_COOKIE_SECURE=true require deployment configuration; proxy users can share an IP counter.
- Config tokens are plaintext local secrets. The local-login guard checks socket peer and Host; a reverse proxy must preserve its public Host and use manual login rather than present remote traffic as a local caller. The configured token authenticated during the targeted diagnostic; Docker/proxy compatibility remains unverified.
- No comprehensive workbook/chart regression suite, dedicated lint/typecheck setup or CI workflow is defined.
- Live imports, sample workbook contents and Docker build/runtime were not verified. See [Known Issues](KNOWN_ISSUES.md) and [Decisions](DECISIONS.md).
- Steering requires metadata-confirmed direct project relations; unsupported models remain unavailable. No live Progress/WP or budget control verification was possible without a real account. No dedicated lint/typecheck or build command exists for these dependency-free Node/browser modules.

## Project Maturity

A runnable dashboard, authenticated local connector and authentication integration suite are implemented. Production deployment and real-account verification remain unestablished.

## Last Verified

- 2026-10-21 expanded-fit correction: **172/172** affected tests pass;
  independent review and fictional desktop, short/wide, phone and 40-entry
  browser checks confirm proportional fitting, shared physical currency scale,
  resize/restore cleanup and empty console logs. Syntax/local links/whitespace
  pass. Frontend only; no server restart or Odoo access.

- 2026-10-21 full-screen follow-up: **170/170** affected tests pass, with
  independent review and fictional desktop/390px native dialog/focus/hover/
  translation checks. Syntax, documentation links and whitespace pass. No
  backend restart or live Odoo access; the prior full suite remains historical.

- 2026-10-21 purchase Sankey: **989/989** final offline tests (73.85 s),
  **166/166** focused frontend/integration and **85/85** finance source/HTTP;
  independent review, fictional desktop/phone/dense-list interactions, all
  root/inline JavaScript syntax and whitespace pass. Initial programme fixture
  startup timeout passed isolated retry and final full run. Reloaded workspace
  server PID **56096**, welcome 200, anonymous finance 401 and empty stderr.
  No live Odoo calls or private-config changes; no separate build/lint/typecheck
  command exists. Earlier check results below are historical.

- Four-card macro refinement on 2026-10-12/13: **721/721** full offline tests
  pass, with no failures/cancellations/skips (61.87s). Pure calculation tests
  pass **24/24**, renderer **55/55**, and independent review found no remaining
  calculation issue. Four desktop cards are equal 274x228px; 900px uses two
  386x200px columns and 390px uses one 301x185px column without overflow.
  Fictional checks confirm fixed no-Ormitter macro values when graph inclusion
  or year scope changes, signed projection, emphasized remaining TH, suppression
  of a one-day gap, and exact 81-day gap dates with native disclosure. Browser
  logs have no warnings/errors. All 18 scripts parse, eight documentation files
  have valid local links, and whitespace checks pass; no separate build/lint/
  typecheck command exists. The guarded eXtRAI source check was explicitly
  scoped through 2026-10-12 and produced 995h actual / 3483.9288h remaining /
  370h remaining TH / 588.5321h projected excess; May 31, 2028 stays a short
  suppressed gap. The user-requested launch on 2026-10-13 is hidden standard-user
  PID 21280: loopback 8765, matching welcome 200, anonymous session/project-hours
  401 and empty stderr. The prior listener was already absent; cause unknown.
- Read-only eXtRAI coverage explanation on 2026-10-12: the single uncovered
  calendar date is **2028-05-31**. The latest confirmed-person planning slots
  end on **2028-05-30 at 16:57 Europe/Brussels**, while the project end date
  includes May 31. This is a binary date-union check, independent of the
  4352.34h total / 3982.34h without TH. No source calculation was changed.
  Independent code review found no intrinsic interval/counting error. The
  summary warning currently prints the whole inspected window rather than
  the exact gap date, which is available in its expandable detail; this wording
  can confuse volume and coverage. No application code, tests or runtime change.
- Linked-TH and recommendation refinement on 2026-10-12: **707/707** full offline
  tests pass (54.39s, zero failures/cancellations/skips). Independent backend
  checks pass **44/44**; the final TH explanatory-text clarification passes
  **54/54** renderer tests. Desktop/390px fictional checks verify exact linked-TH
  subtraction, real-person gaps, descending orange/green hour gaps, larger
  separators, native slider focus and responsive full-width macro copy. The
  desktop description occupies one 1025.8px line; mobile wraps without overflow.
  All 18 scripts parse, eight checked documentation files have valid local
  links and whitespace checks pass. No separate build/lint/typecheck command
  exists. Targeted guarded live eXtRAI reads confirm two linked-TH slots,
  261.71h in 2027, 370h lifetime, 4352.34h total and 3982.34h without TH;
  the TH is not classified as Ormitter. Welcome/session/project-hours checks
  pass after the standard-user restart and stderr is empty. No Odoo/Git write.
- French hour-period titles, recommendations and project planning information
  on 2026-10-12: **700/700** full offline tests pass, with zero failures,
  cancellations or skips (48.27s, sequential Node test runner). The preceding
  667-case run found one obsolete English Ormitter-label assertion, corrected
  to the French label without weakening behavior checks. A failed-bootstrap
  auth fixture now cleans its own child/mock/directory to prevent leaked handles.
  Independent final helper/renderer/monthly checks pass **93/93**; all 18 root
  and inline scripts parse, eight checked documentation files have no missing
  local links, and `git diff --check` passes. No separate build/lint/typecheck
  command is defined. Fictional desktop/390px checks confirm live slider/focus,
  no pie/RPC redraw, period titles, lifetime totals, confirmed TH subtraction,
  actual gap dates, inclusion toggles and zero-only hiding. Browser warnings
  and errors are absent. Targeted guarded aggregate eXtRAI reads and resource
  link metadata are verified; broad live TH coverage is not. The restarted
  server has welcome 200 matching this checkout, anonymous session/project-hours
  401, anonymous protected planning asset 303, and empty stderr.
- Programme selection/project membership on 2026-10-11: final **648/648** full
  offline tests pass (zero failures/skips, approximately 27.6s) using permitted
  fixture-loopback access. The initial selector's 627 and the pre-final-focus-fix
  647 totals below/in the wiki are historical. New targeted checks include
  **38/38** service/HTTP/read-only cases and **52/52** shared Unit renderer cases;
  160 frontend checks passed before the last shared loading-focus regression.
  Tests cover fixed 10/8/5 mapping, code collision/permission coverage, strict
  session-bound requests, response isolation/cache reuse, retained top cards,
  matching monthly counts/date bounds, project details/Back and observer cleanup.
  Independent review reports no remaining findings. Synthetic desktop/390px
  checks verify all three programme lists/charts, selected radio persistence,
  230px/210px programme and 112px compact cards, contained horizontal plots,
  native Back/refresh focus and no browser warning/error logs. Script parsing
  covers 16 modules/inline scripts; eight documentation files have no missing
  local links; diff-check passes. No dedicated build/lint/typecheck command exists.
  Workspace welcome is 200, anonymous session/new endpoint are 401, stderr is
  empty and PID 30696 listens only on 127.0.0.1:8765. All synthetic preview tabs,
  listeners/helpers and three exact temporary fixture folders were released.
  A separate user-requested guarded live read verified **in-beTwin 56261849**;
  other membership/portrait permissions were verified only with fixtures.
- Animated project cards on 2026-10-11: **186/186 focused tests** pass with no
  failures or skips across shared cards, personal grid, Unit renderer and
  dashboard controller. Tests verify the front-only short title, ordered back
  number/short/manager/full-name content, source immutability, safe text/photos,
  native selection/focus and retained date/budget tooltips/descriptions.
  Independent review found no actionable issues. Fictional desktop/390px
  browser checks confirm the exact white/black/three-color palette, changing
  border/orb transforms, paused hidden-back animations, fixed 190px/180px/112px
  heights, bounded visible content and no horizontal page overflow. Clipped
  decorative pseudo-elements/orbs can enlarge face scroll metrics, so content
  bounds and document width are checked instead. Native selection and Back focus
  remain verified. Syntax/local-link/scoped diff checks pass; no dedicated
  build/lint/typecheck command exists and the full-suite result remains historical.
  Temporary preview resources were released; proof screenshots use fictional
  data outside Git. No live Odoo/private configuration access, workspace restart
  or Git mutation was required.
- Uniform project cards on 2026-10-11: **186 focused tests** pass across shared
  cards, personal grid, Unit renderer and dashboard controller. New cases cover
  acronym/code/title parsing, missing-name/code fallbacks, source case and literal
  safe text in both grids. Independent source/CSS review and fictional browser
  checks confirm 190px personal desktop cards, 180px at 390px width and 112px
  Unit cards, two-line italic clamping, equal sizes, clear back radios and no
  page/face overflow. Native selection opens the project; Back restores the
  exact radio focus. All 14 scripts parse, eight documentation files have no
  broken local links and scoped diff checks pass. The full-suite result below
  remains historical; no dedicated build/lint/typecheck command exists.
  Temporary preview resources and viewport override were released; proof
  screenshots use fictional data outside Git. No private configuration, live
  Odoo access, workspace restart or Git mutation was required.
- Config-login notice and label refinements on 2026-10-11: a fictional missing-config
  browser check confirms the error text uses `rgb(180, 83, 9)` / weight 700,
  with no page overflow. The **Utiliser le fichier de configuration** button
  is visible at desktop and fits the 390px layout without horizontal overflow.
  Independent review confirms HTTP/application/network
  failures and retry/manual reset paths; orange contrast on white is 5.02:1.
  Inline/module syntax, local documentation links and the login diff check pass.
  The existing welcome config-button VM fixture now supports the DOM `dataset`
  property; its named test passes all three parent/subtest cases. No new test
  or full-suite run was needed for these small visual changes; no dedicated
  build/lint/typecheck command exists. No private config or live Odoo was read,
  and the workspace server was not restarted. Changes remain uncommitted.
- Flip-card identity refinement on 2026-10-10: **178 focused tests** pass across
  shared cards, personal grid, Unit renderer and dashboard controller. Coverage
  includes first bracket/fallback names, bounded portrait formats and failures,
  literal safe text, native metadata descriptions and both grids. Fictional
  desktop and 390px browser checks show `[Autogrout]` with the loaded mini
  portrait on each flipped back; all metadata fits with no page overflow.
  All 14 module/inline scripts parse, eight documentation files have no broken
  local links and `git diff --check` passes. The earlier full-suite result below
  remains historical; no new full-suite run or dedicated build/lint/typecheck
  command applies. Preview tabs/viewport were released; proof images are outside
  Git. No private configuration or live Odoo access was needed.
- Workspace server started again on 2026-10-10 after the user's latest restart
  request: previous PID 27424/port 8765 was no longer running when inspected.
  Hidden standard-user Node PID **18456** runs the exact workspace `server.js`;
  welcome returns 200, anonymous session returns 401 and stderr is empty.
  Logs are `odoo-dashboard-current-20261010-card-identity.out.log` / `.err.log`
  in the user's Temp directory. A fresh login is required after restart.
- Recovery audit on 2026-10-10 after an unexpected Codex exit: **586/586 tests
  pass across all 20 offline test files**, with no failures, cancellations or
  skips. Authentication, source/finance/catalogue fixtures and read-only guards
  use isolated fictional localhost sources, without reading private config or
  contacting live Odoo. Independent source review confirms concurrency/gradient/
  flip-card/personal-calendar implementation, script/style includes, protected
  assets and DTO enrichment are intact; no partial edits or actionable issue
  found. All 14 module/inline scripts parse, eight documentation files have no
  broken local links, no merge conflict markers were found and `git diff --check`
  passes. No dedicated build/lint/typecheck command exists; Docker and fresh
  live-account/visual checks were not performed for this recovery audit.
  Exact workspace Node PID **27424** remains alive: welcome 200, anonymous
  session 401 and zero-byte stderr. No restart, code repair or Git mutation was
  needed. Branch remains `codex/project-budgets`, HEAD `ba96523`, three commits
  ahead of local main, with the saved uncommitted/untracked work preserved.
- Unit DiCo concurrency chart on 2026-10-10: **175 focused UI tests** pass
  (50 Unit renderer/calculation and 125 project-card/browser/dashboard-controller
  checks). Fourteen new Unit cases cover true monthly maxima, inclusive overlaps,
  clipped/leap months, zero gaps, future dates, exclusions/deduplication, unknown
  coverage, exact shared axes, accessibility/keyboard details and scroll cleanup.
  Independent review found no blocking issues; 400 deterministic randomized
  interval sets match a brute-force daily-count oracle. Fictional desktop/390px
  browser checks confirm identical plot left/width, synchronized scroll positions,
  monthly focus/tooltips, Home/arrow navigation and an expandable numeric table;
  document/viewport widths match and no warning/error logs were observed.
  All 14 module/inline scripts parse, eight documentation files have no broken
  local links and `git diff --check` passes. No full-suite rerun or dedicated
  build/lint/typecheck command applies. Preview resources were cleaned up and
  proof images remain outside Git in the user's Temp directory.
- Workspace server restarted on 2026-10-10 at the user's request after the new
  Unit chart: hidden standard-user Node PID **27424**, welcome 200, anonymous
  session 401 and empty startup stderr. Logs use
  `odoo-dashboard-current-20261010-concurrency` in the user's Temp directory.
- Timeline gradients on 2026-10-10: fictional desktop browser checks verify the
  shared 50% white-to-base-to-30% black overlay in personal Projets and Unit DiCo,
  including grey completed bars. Source colors, 14px bar height, viewport reveal
  and dotted today marker remain intact; no warning/error logs. Independent
  CSS review found no issues. `git diff --check` and documentation link checks
  pass. Existing focused/full test results below are historical; this reversible
  CSS-only refinement did not rerun tests or require a server restart. Temporary
  preview resources were cleaned up; screenshots remain outside Git.
- Project flip cards on 2026-10-10: **308 focused tests** pass (162 shared-card/
  renderer/controller, 43 optional source-date/budget and 103 authentication/
  Unit HTTP/read-only checks). Tests cover native identity/content/focus,
  safe text and descriptions, strict dates, zero/signed/invalid budgets,
  unknown currencies, exact metadata scope/projection and independent denial
  recovery. Independent review found no actionable issues. Fictional desktop
  browser checks confirm fronts, #4a85b3 hover backs, no sibling filtering,
  click-to-detail and restored radio focus. At 390px, Unit cards stay 86px and
  personal cards 165px, all metadata fits, and document/viewport widths match.
  No warning/error logs. Touch/no-hover and reduced-motion paths were reviewed
  in CSS; actual device/preference emulation was not available. Screenshots
  remain outside Git; preview tab/process/fixture were closed and removed.
  All 14 module/inline scripts parse, eight documentation files have no broken
  local links, and `git diff --check` passes.
  The historical full-suite result remains 509; no full-suite rerun or dedicated
  build/lint/typecheck command applies to this check.
- Workspace server restarted on 2026-10-10 to load card assets/full-budget
  catalogue metadata: hidden standard-user Node PID **32456**, welcome 200,
  anonymous session 401 and empty startup stderr. Logs use
  `odoo-dashboard-current-20261010-flip-cards` in the user's Temp directory.
- Shared personal/Unit calendars on 2026-10-10: **259 focused tests** pass
  (154 renderer/controller, 81 authentication/HTTP and 24 optional-date/read-only
  checks). Eleven new UI and twelve new optional-date cases cover ended-last
  order, Brussels boundaries, immutable bounds, scoped membership with full
  dates, selection/focus, observer cleanup and exact optional source recovery.
  Independent review found no issues. Fictional desktop browser checks confirm
  the personal chart below radios, 25px rows, grey ended rows last, full-life
  dates while only 2025 activity is selected, bar-to-detail/Back navigation,
  Unit completion grouping and no warning/error logs. Screenshots are outside
  Git; the temporary preview tab/process/fixture was closed and removed.
  The historical full-suite result remains 509; the full suite was not rerun.
  All 13 module/inline scripts parse, eight documentation files have no broken
  local links, and `git diff --check` passes.
  No dedicated build/lint/typecheck command exists.
- Workspace server restarted on 2026-10-10 to load optional personal catalogue
  dates: hidden standard-user Node PID **18416**, welcome 200, anonymous session
  401, empty startup stderr. Logs use `odoo-dashboard-current-20261010-personal-timeline`
  in the user's Temp directory. Signing in again loads the new response.
- Compact Unit DiCo timeline on 2026-10-10: **104 focused offline tests** pass
  (31 Unit renderer/geometry and 73 dashboard controller cases), covering
  Brussels dates, strict completion, inclusive marker alignment, per-bar reveal,
  reduced-motion/failure fallbacks and observer cleanup/late callbacks. Browser
  checks confirm 25px rows, pending off-screen bars, 0.5s fills, complete final
  durations, grey completed projects and aligned black dotted references.
  At 390px, initially hidden horizontal bars wait and reveal on scrolling;
  sticky names and today stay aligned, without page overflow or warning/error
  logs. Independent review passed. The prior 509 full-suite result remains
  historical; the full suite was not rerun for this frontend refinement.
  Fictional screenshots are outside Git; temporary viewport/tab/process/fixture
  were reset, closed and removed.
  Module/inline syntax, whitespace and eight local documentation link checks
  pass; no dedicated build/lint/typecheck command exists.
- Immediate user-requested server restart on 2026-10-10: the port 8765 listener
  was already absent. Started hidden standard-user workspace Node PID **31328**;
  welcome returns 200, anonymous session returns 401 and startup stderr is empty.
  Logs: `odoo-dashboard-current-20261010-timeline.out.log` / `.err.log` in the
  user's Temp directory. The current timeline is loaded; sign-in is required.
- Project-grid hover refinement on 2026-10-10: fictional browser checks verify
  personal and Unit DiCo hovered tiles stay sharp while other tiles blur, and
  entering a grid gap restores all tiles. Existing backgrounds/colors and
  dimensions are preserved; keyboard focus stays readable and Unit radio
  selection/Back still work. CSS review confirms fine-pointer/hover gating and
  reduced-motion transition removal. No automated tests were added or rerun
  for this styling-only change; the prior 92 focused tests and 509 full-suite
  results remain historical. Screenshots use fictional data outside Git.
  Syntax/whitespace and eight local documentation link checks pass; the preview
  emitted no warning/error logs. Temporary tabs and its isolated process/fixture
  were closed and removed. No dedicated build/lint/typecheck command exists.
- Unit DiCo year-2999 refinement on 2026-10-10: all **92 focused offline tests**
  pass (21 Unit renderer and 71 dashboard controller cases), with zero failures
  or skips. Both timeline bounds exclude those projects; adjacent ending years,
  invalid-date notices, radio selection and empty-calendar focus are covered.
  Independent review, module/inline syntax, whitespace and eight documentation
  link checks pass. No dedicated build/lint/typecheck command exists.
  The previously verified full suite contained 509 passing tests before these
  four new cases; it was not rerun for this frontend-only filter.
- Final Unit DiCo/French budget-reference iteration on 2026-10-10: all **509
  offline tests in 18 files** pass with zero failures/skips, including 54 budget
  UI and 39 project-renderer cases. The default reference excludes only verified
  personnel allocations from the selected version, preserves supplier budgets,
  handles signed/zero/sub-cent amounts and fails closed for incomplete sources.
  Checking the French control restores full values; source DTOs, macro cards,
  annual exclusions and Ormit preferences remain independent. Fictional browser
  verification showed 400/190 EUR and 47.5% without personnel versus 1,000/530 EUR
  and 53% with personnel, with matching balances and retained checkbox focus.
  No warning/error logs. Syntax, whitespace and eight documentation link checks
  pass; no dedicated build/lint/typecheck command exists. Labelled screenshots
  are outside Git; temporary tabs/processes are closed.
- User-requested restart on 2026-10-10: prior PID 20956 and its listener were
  already absent; cause is unknown. Started hidden standard-user Node PID
  **31392** on loopback port 8765. Welcome returns 200; anonymous session,
  Unit DiCo and finance routes return 401; startup stderr is empty. Logs:
  `odoo-dashboard-current-20261010-b831.out.log` / `.err.log` in the user's Temp
  directory. Signing in again is required.
- Unit DiCo on 2026-10-10: all **503 offline tests in 18 files** passed with no
  failures/skips; the additional native-modal/monthly-observer teardown test
  passed in the 39-case project renderer suite. Fixed-unit/session/override
  isolation, pagination beyond 1,000 projects, optional date/photo denial,
  sanitized failures, strict lifetime dates, radio/timeline access, focus,
  shared-cache races and return-to-tab reloads are covered. Syntax/whitespace
  and independent review passed. Fictional desktop/390px checks verified compact
  tiles, Hours/Budget entry, Back focus, hidden overview scope controls and
  contained timeline scrolling without page overflow or warning/error logs.
  The source field and department relation were verified by guarded metadata
  and exact Extrai reads. A subsequent exact-unit catalogue read returned 50
  accessible projects, all with coherent date pairs and no date warnings;
  only aggregate verification facts were output, without saved project records.
- Reloaded the verified workspace server from PID **35388** to **20956**,
  hidden under the standard-user account on loopback port 8765. Welcome returns
  200; anonymous session and Unit DiCo routes return 401; startup stderr is
  empty. Logs: `odoo-dashboard-unit-20261010-a9f5.out.log` / `.err.log` in the
  user's Temp directory. Restart clears sessions. No Odoo writes occurred.
- BW personnel refinement on 2026-10-10: all **451 offline tests in 15 files**
  passed (zero failures/skips), including 63 finance, 49 budget UI, 38 project
  renderer and 60 dashboard-controller cases. New checks cover independent
  expense-only currency/completeness, mixed exact rubrics, retained Ormit supplier
  invoices, signed credits, verified empty versus unavailable costs, conflicting
  identities, exact personnel-category markers, toggle/focus/source-budget
  invariance, permanent annual exclusions and independent cached preferences.
  Module/inline syntax and whitespace pass; no dedicated build/lint/typecheck
  command exists.
- Fictional-data browser checks passed at desktop and 390px phone width:
  unchecked/restored BW cost totals and rubric, unchanged convention reference,
  both supplier-filter combinations, annual personnel omission, popup/Escape
  focus and contained mobile layout. No page overflow or warning/error logs.
  Saved a labelled fictional preview outside Git, reset the viewport, closed
  the tab and confirmed preview PID 14672 stopped.
- Restarted verified hidden standard-user Node PID **28592** as **35388** on
  loopback port 8765 to load the new finance service. Welcome returns 200;
  anonymous session and finance return 401. Startup stderr is empty. Logs use
  `odoo-dashboard-bw-20261010-093bbb.out.log` / `.err.log` in the user's Temp
  directory. Restart cleared sessions. No private config or live Odoo read/write
  was needed.
- Custom scope/shortfall refinement on 2026-10-10: all **429 offline tests** in
  fifteen files passed, including 45 personal scope/calendar, 38 renderer and
  59 controller cases. Coverage includes inclusive endpoints, partial slots,
  Brussels DST, leap/one-day scopes, signed/unknown hours, atomic invalid drafts,
  exact contributor totals, project membership, independent lifetime/monthly/
  finance caches and hidden-editor Escape handling. Module/inline JavaScript
  syntax and whitespace passed; no separate build/lint/typecheck command exists.
- Fictional desktop/390px browser checks verified visible calendar input
  controls, immediate partial-year recalculation, reversed-date retention,
  input/year focus, reset, keyboard transition into Budget and shortfall labels.
  No page overflow or warning/error logs were observed. The independent lifetime
  comparison stayed unchanged. Saved a fictional preview, reset the viewport,
  closed the tab and stopped its isolated process. The workspace server remains
  PID **28592**, loopback port 8765, with welcome HTTP 200. A page refresh loads
  this frontend-only update without clearing sessions.
- User-requested server restart on 2026-10-10: no listener existed on port 8765
  and the previously recorded PID 8344 was absent. Started the current branch
  as hidden standard-user Node PID **28592**, then verified the loopback
  listener, welcome 200 and anonymous session/finance 401 responses. Startup
  output is clean; logs use `odoo-dashboard-20261010-4fdea427.out.log` and
  `.err.log` in the user's Temp directory. No Odoo request, code change or test
  rerun was needed. A new server process requires signing in again.
- Budget publication on 2026-10-09: independent publication review and staged
  whitespace checks passed. After replacing the source-specific supplier fixture
  suffix, all 408 offline tests passed again. Feature commit `482271c` was pushed
  to `origin/codex/project-budgets`; its remote SHA matches exactly. The feature
  push left a clean working tree. This factual publication record is committed
  separately; no production code changed after the final test run.
- Bill-detail refinement on 2026-10-09: all **408 offline tests in 15 files**
  passed with `node --test --test-isolation=none` (zero failures/skips). This
  includes 51 pure finance, 40 budget UI, 35 project-renderer and 5 finance HTTP
  tests. Independent review found no remaining actionable issue after fixing
  filtered exact-zero allocations with unknown suppliers. Five JS sources and
  the dashboard inline script parsed; whitespace and 33 changed-page local
  documentation links passed. No separate build/lint/typecheck command exists.
- Guarded configured-account live read of exact Extrai verified 126 accessible
  annual expense lines reconcile across two budgets. All 16 matching posted
  allocations have descriptions and document labels, with no personnel fields
  projected. Only status/count/reconciliation flags were printed; no descriptions,
  monetary values or credentials were persisted. Separate reads and record rules
  still limit completeness beyond the account's visibility.
- Fictional native-dialog browser checks passed at default desktop and 390px:
  exact category/credit values, distinct Budgeted/Engaged measure context,
  filtered bill rows, long-description/supplier wrapping, Tab containment,
  Close/Escape/backdrop and exact-trigger return. No page/dialog overflow or
  warning/error logs. Plot height 225px and macro padding 12px desktop/9.6px
  mobile were measured. Screenshot proof is outside the repository; the viewport
  was reset and temporary preview tab/process closed/stopped.
- Restarted the verified workspace server as standard-user Node PID **8344**
  in persistent terminal session `41992` at http://127.0.0.1:8765/ after stopping
  PID 44188/session `90098`. Welcome returns 200; anonymous session/finance calls
  return 401. Restart cleared in-memory sessions.

- Budget implementation on 2026-10-09: all **357 offline tests in 15 files**
  passed with `node --test --test-isolation=none` (zero failures/skips). Coverage
  includes protected finance assets/routes, caller/session isolation, exact
  project/account/category identities, pagination beyond 1,000 records, missing
  and signed amounts, metadata currency binding, verified Hours/time category,
  early/late costs, annual expense/income separation, future versions,
  unavailable sources, panel caching/refresh/retry and focus. Independent finance
  review passed. Initial sandbox-denied localhost test connections were resolved
  using approved isolated-network execution; tests never contacted live Odoo.
- Targeted guarded live verification of the new service succeeded for Extrai:
  one convention and the 2026/2027 annual budgets are readable, both annual
  controls reconcile, recorded personnel costs are included, exact-rubric
  expense costs match billed amounts, and the expense/personnel decomposition
  reconciles. Live metadata binds analytic `amount` to `currency_id` (project
  company currency); move-linked `company_currency_id` is empty on time entries
  and is not a substitute. Hours and its Working Time category are confirmed.
  No new monetary values, employee costs or credentials are stored in docs.
  Broader record-rule completeness and the exact Odoo dashboard filters remain
  unverified; no Odoo data was modified.
- Fictional full-app browser checks passed at normal desktop and 390px width:
  project selection, Heures/Budget switching, hidden/restored year controls,
  lifetime/rubric totals, all-year shared-scale bars, future status, expandable
  horizontally contained tables and focus/expansion across responsive redraws.
  No page overflow or warning/error logs. Labelled synthetic screenshots are
  outside the repository. Inline/module/server syntax, whitespace and changed
  documentation links passed; no dedicated build/lint/typecheck command exists.
- Restarted the verified workspace server as standard-user Node PID **44696**
  in persistent terminal session `34274` at http://127.0.0.1:8765/.
  Welcome returned 200; anonymous session and finance calls returned 401.
  Startup output is clean. Restart cleared the previous in-memory sessions.

- Budget-source discovery on 2026-10-09 used existing guarded authentication,
  `fields_get` and exact-project/account `search_read` operations only.
  Extrai's referenced convention and annual budgets, including a future annual
  budget under validation, were readable. Metadata confirms parent workflow
  states distinct from monetary `on_approval`, and Settlement New's separate
  deductibility, analytic validation, invoice posting and payment states.
  The targeted analytic-account sample was below its explicit 1,000-row cap;
  registry/action/view discovery was unavailable, but known-model metadata and
  project records succeeded. No authenticated Odoo browser tab was available;
  the exact dashboard UI filters, attachments and broader-account completeness
  remain unverified. Application source is unchanged; tests were not rerun.
  The previous 303-test offline baseline remains the latest result.
- Budget semantics follow-up on 2026-10-09: live field help defines
  `achieved_amount` as billed/invoiced, and `committed_amount` as already billed
  plus confirmed purchases. Signed monetary timesheet costs are readable; they
  lack explicit convention-rubric/account-type classification in the targeted
  sample. Financial expense rubric totals match budget achieved amounts.
  Asset/liability/cash/off-balance analytic movements also exist and cannot be
  treated as consumption. No individual costs or credentials were displayed,
  no scripts were retained, no Odoo write occurred and no tests were rerun.
- Scoped project-date correction on 2026-10-09: all 303 offline tests in twelve
  files passed (zero failures/skips), including 33 personal-calendar, 31 renderer,
  48 controller/scope and 27 monthly-calculation cases. December starts, project
  end caps, first/last/single-day anchors, disjoint selected years, leap/Brussels
  boundaries and unavailable date references are covered. Scoped raw totals and
  independent lifetime/monthly summaries remain unchanged. Module/inline syntax
  and whitespace passed; no build/lint/typecheck command exists.
- Fictional desktop/390px checks confirmed the 2026-only reference starts on
  1 January 2026, while adding 2025 moves it to 1 December 2025. The known-empty
  prior-year plan keeps the planned total unchanged; recorded actuals increase.
  Both scoped bars share the clipped tick/caption, while the lifetime/monthly
  view stays independent. Mobile captions wrap without page overflow, final bar
  transforms complete, and there are no warning/error logs. Saved a synthetic
  preview and closed/stopped it.
- Targeted existing-guard Odoo reads confirmed Extrai (`54252043`, project ID
  `2083`) runs from 2025-12-01 through 2028-05-31. The configured account has no
  own planning allocation overlapping 2025, with actual work in December and
  accessible 2026 planning. This explains unchanged selected-year planning for
  that account; its identity was not independently compared to the browser
  login. Credentials were kept internal; configuration, server state and Odoo
  records were not changed.
- The workspace server remained available as PID `33396`, terminal session
  `25141`; `/login` returned HTTP 200. This frontend correction needs a page
  refresh and did not require a restart or clear sessions.

- Employee filter on 2026-10-09: all 291 offline tests in twelve files passed
  (zero failures/skips), including 28 renderer, 27 monthly-calculation and 47
  controller/scope cases. Coverage includes exact employee/resource ownership,
  clipped future planning, monthly/cumulative reference precision and plateau,
  unavailable versus zero planning, selected-only lines/details/table, reset,
  focus/replay, per-project preferences and exclusion/stale-selection clearing.
  Module/inline JavaScript syntax, whitespace and 33 local documentation links
  passed. No build/lint/typecheck command exists.
- Isolated fictional browser checks passed on desktop and at 390px: selected
  actual/planned lines share the employee bar color, aggregate/convention lines
  disappear in the selected view, monthly/cumulative changes preserve selection,
  employee changes/reset preserve focus and replay the reveal, and excluding
  the selected Ormitter restores the remaining stack. Tooltip/table values
  match the selected identity; the mobile table has no page overflow. No warning
  or error logs. Saved a synthetic preview and closed/stopped the isolated
  preview; no live Odoo or private-config access was used.
- The recorded server was absent on 2026-10-09. Started the workspace server
  as Node PID `33396` in persistent terminal session `25141`;
  `http://127.0.0.1:8765/login` returned HTTP 200. Its previous stop cause remains
  unknown; starting a new process clears prior sessions.

- Stacked area/cumulative refinement on 2026-10-08: all 275 offline tests in
  twelve files passed (zero failures/skips), including 23 renderer, 17 monthly
  calculation and 46 scope/controller cases. Signed stack extents, one-month
  areas/reference lines, cent reconciliation, convention plateau, cached mode
  independence, exact focus and revision-based replay are covered. Syntax,
  whitespace and 32 local documentation links passed. No build/lint/typecheck
  command exists.
- Isolated fictional browser checks passed on desktop and at 390px: matching
  employee colors, stacked signed areas, independent dotted convention, exact
  cumulative totals/table, unchanged personal hours and synchronized inclusion.
  Switching modes repeatedly and changing inclusion replayed the one-second
  reveal; keyboard focus stayed on the triggering control. The cumulative table
  scrolls within its panel without page overflow; no warning/error logs.
  Saved a synthetic preview, reset the viewport and closed/stopped the preview.
  No live Odoo or private-config access was used for this refinement.
- On the latest restart request, port 8765 was idle and the previously recorded
  process was absent. Started the updated workspace server as Node PID `23452`
  in persistent terminal session `25621`; `/login` returned HTTP 200. No cause
  for the earlier process stopping was established. Restart clears sessions.
- Employee bubble placement on 2026-10-08: all 21 renderer tests passed,
  including matching segment ownership, safe photos and accessible names.
  Syntax and whitespace checks passed. Isolated fictional browser checks at
  desktop and 390px confirmed contained name/avatar pills, avatar-only narrow
  segments, tiny-segment list access, unchanged 37.8px bars/gradients, and
  actual-only convention layout without overflow or warning/error logs.
  The workspace server responded; no restart or live Odoo access was needed.
- Monthly graph on 2026-10-08: the final complete offline run passed all
  271 tests in twelve files (zero failures/skips), including 82 focused
  monthly/renderer/controller cases and 16 isolated monthly calculations.
  Coverage includes exact IDs, signed/zero months, Brussels cutoff, leap and
  partial months, convention precision, after-end actuals, authenticated asset
  serving, cached year independence, synchronized inclusion, matching colors,
  keyboard/pinned-tooltip focus and reveal lifecycle. Syntax, whitespace and
  34 changed documentation links passed. No build/lint/typecheck command exists.
- Isolated fictional-data browser checks confirmed all lines share a one-second
  clip reveal on first viewport entry; year/inclusion rerenders keep it complete.
  Employee colors match bars, inclusion controls synchronize while Mes heures
  stays unchanged, signed corrections render below zero, and month pin/Escape
  details work. At 390px, axis labels remain 11px, and opening the 22-month
  exact-value table scrolls inside its panel without widening the page after
  the scoped grid min-width fix. No warning/error logs. Saved synthetic previews
  outside the repository, reset the viewport, closed the preview tab and stopped
  the isolated preview. No live Odoo or private-config access in this iteration.
- On the user's server status checks, prior background processes were no longer
  running. Started the latest workspace server in persistent terminal session
  `51776`, Node PID `27588`, at `http://127.0.0.1:8765/`. Welcome returned
  HTTP 200 and anonymous session HTTP 401. The terminal contains startup output;
  no process-stop cause was established. Restart cleared existing sessions.
- Budget-source correction on 2026-10-08: the actual source is
  `project.project.budget_staffing_convention_hours` (float; API label **Budget
  Staffing Convention (Hours)**), not an exact French metadata label. The
  corrected helper read Extrai (`54252043`, ID `2083`) as available with
  `3890.3967484570226` hours, dates `2025-12-01` / `2028-05-31` and no warnings.
  Only existing guarded reads/authentication used the configured account;
  credentials were not displayed, config was not changed, and Odoo was not
  modified. Empty and unavailable budgets now have distinct UI messages.
- All eleven offline test files passed (250 tests, zero failures/skips),
  including 61 focused comparison/scope cases and 12 lifetime HTTP fixtures.
  Coverage includes the confirmed English-labelled technical field, raw decimal
  precision, ignored French/monetary/staffing decoys and explicit empty versus
  missing/denied/malformed/nonfinite values. Syntax and whitespace pass;
  changed documentation links were checked. No build/lint/typecheck command
  exists for these dependency-free modules.
- Fictional browser verification confirmed the English-labelled field renders
  `3 890,4 h`, its convention bar occupies 75%, actuals remain proportional,
  and the empty-budget case retains the MIS message and actual contributors.
  No page overflow or warning/error logs. Saved a synthetic preview outside
  the repo; preview tab/process were closed/stopped after verification.
- Restarted the verified workspace server as hidden standard-user Node PID
  35220 at `http://127.0.0.1:8765/`. Welcome returned HTTP 200, anonymous
  session HTTP 401 and startup stderr was empty. Logs are
  `odoo-dashboard-20261008-budget-602ed787.out.log` and `.err.log` in the
  user's temporary directory. Restart cleared local sessions.
- Employee-gradient refinement on 2026-10-08: the segment CSS now overlays
  subtle white-to-black shading on each existing employee base color. Fictional
  browser inspection confirmed gradients in scoped and lifetime stacks, stable
  colors/shares, no overflow and no warning/error logs. Saved a synthetic preview
  outside the repo. Independent style review and whitespace checks passed.
  No JavaScript/data changes or new tests; the 244-test baseline below remains
  the latest automated result. Refresh loads this stylesheet without restarting
  the workspace server or clearing sessions.
- Lifetime comparison on 2026-10-08: all eleven offline test files passed
  with `node --test --test-isolation=none` (244 tests, zero failures/skips).
  Focused comparison/scope suites passed 59 tests; eight lifetime HTTP fixtures
  cover exact normalized budget labels, numeric types, unrelated rows, missing,
  ambiguous/monetary/zero values, invalid dates and budget denial retaining dates.
  Controller/DOM cases cover inclusive project boundaries, Brussels cutoff,
  year independence, nullable dates, shared Ormitter choice, colors and focus.
  JavaScript syntax, inline scripts, whitespace and changed Markdown links pass.
- Fictional-data browser checks passed at desktop and 390px phone width:
  lifetime values/tick stay fixed across selected years, budget remains fixed
  with Ormitter inclusion, and missing budget removes only its upper bar while
  retaining actual contributors and the MIS message. Confirmed title 28px
  desktop / 19px phone and all tracks approximately 37.8px high. No page overflow
  or warning/error logs. Saved synthetic screenshots outside the repo; viewport
  reset, preview tab closed and preview process PID 44332 confirmed stopped.
- Restarted the verified workspace server as hidden standard-user Node PID
  27924 at `http://127.0.0.1:8765/`. Welcome returned HTTP 200, anonymous
  session HTTP 401 and startup stderr was empty. Logs are
  `odoo-dashboard-20261008-lifetime-62424d4c.out.log` and `.err.log` in the
  user's temporary directory. No live Odoo request or private-config inspection
  occurred. Restart cleared sessions; no build/lint/typecheck command exists.
- Ormitter/contributor extension on 2026-10-08: all eleven offline test files
  passed with `node --test --test-isolation=none` (231 tests, zero failures/skips).
  Focused comparison/scope suites passed 54 tests. Coverage includes independent
  per-project inclusion, historical/zero-hour-assignment eligibility, unavailable
  assignment disclosure, exact employee/resource IDs, cent reconciliation,
  signed corrections, stable unique colors, capped stack shares, safe raster
  profiles, denied optional reads and keyboard/touch details. Syntax, whitespace
  and changed Markdown file-link checks passed. No build/lint/typecheck command
  exists for these dependency-free modules.
- Isolated fictional-data browser checks passed at normal desktop and 390px
  phone width: default exclusion, project-only toggle/title/totals, unchanged
  personal hours, shared years and stable colors, assigned-only checkbox,
  absent checkbox without Ormitters, full-width caps, wide-segment callouts and
  narrow-segment legend details. No page overflow or warning/error logs.
  Saved synthetic screenshots outside the repo; viewport reset, preview tab
  closed and preview process PID 27928 confirmed stopped.
- Restarted the verified workspace server as hidden standard-user Node PID
  43840 at `http://127.0.0.1:8765/`. Welcome returned HTTP 200, anonymous
  session HTTP 401 and startup stderr was empty. Logs are
  `odoo-dashboard-20261008-contributors-ec823da9.out.log` and `.err.log` in
  the user's temporary directory. No live Odoo request or private-config access
  occurred; sessions were cleared by the restart.
- Ormitter clarification on 2026-10-08: project-wide title now explicitly says
  **hors Ormitters**. Read-only code review confirmed classified Ormitter
  actuals and planning are already excluded independently of the global
  inclusion toggle. Both focused comparison/scope suites passed (46 tests,
  zero failures); the full-suite baseline remains 217 tests below. No backend
  behavior changed; refreshing loads the new browser-module title.
- Bar-animation refinement on 2026-10-08: isolated fictional-data browser
  checks confirmed all four fills share a one-second animation, progress from
  the left, and finish at their existing target widths. Date ticks remain fixed.
  Reduced-motion CSS was reviewed; whitespace checks passed. No JavaScript or
  data logic changed, so the previous 217-test result below remains the latest
  automated suite; it was not rerun for this CSS-only change.
- Project comparisons on 2026-10-08: all eleven offline test files passed
  with `node --test --test-isolation=none` (217 tests, zero failures/skips).
  Coverage includes exact project/employee identities, consultant exclusion,
  UTC selected-year planning, Brussels actual cutoff, classification warnings,
  task-linked planning postfilters, unavailable/zero/negative planning,
  proportional bar caps, linear date ticks, retry and obsolete responses.
  JavaScript syntax, whitespace and changed documentation links passed.
- Synthetic browser verification passed at normal desktop and 390px phone
  width. Checked own versus all-employee totals with consultant and future
  actual exclusions, exact 75% planned widths, proportional/capped actuals,
  shared year updates, the past-period tick at 75%, Hors planning and keyboard
  focus. No page overflow or warning/error logs. Saved fictional previews
  outside the repo; the temporary preview tab/process were closed/stopped.
- Restarted the verified workspace server as hidden standard-user Node PID
  28320 at `http://127.0.0.1:8765/`. Welcome returned HTTP 200, anonymous
  session HTTP 401 and startup stderr was empty. No live Odoo request or
  private-config inspection/change occurred. No dedicated build/lint/typecheck
  command exists for these dependency-free modules.
- Hors planning/project-grid iteration on 2026-10-08: all eleven offline test
  files passed (202 tests, zero failures). Coverage includes grouped signed
  totals, hidden legacy personal sections, shared-year project filtering,
  native radio selection/back focus, optional manager lookup failures,
  exact-ID filtering and bounded raster-photo validation. Only synthetic
  credentials/config and mocked localhost Odoo were used.
- Isolated browser checks passed at normal desktop and 390px phone width:
  Hors planning divider/subtotal, hidden Mon temps 02, DiCo-independent grid,
  manager initials fallback, empty selected view, scope-driven removal and
  back-button focus. No horizontal page overflow or warning/error logs.
  Saved labelled synthetic screenshots outside the repo; the test tab closed
  and the temporary preview process is no longer running. Live manager photos
  were not verified. JavaScript syntax and whitespace checks passed.
- On the user's restart request, port 8765 was already idle. Started the
  latest workspace server as hidden standard-user Node PID 24844 at
  `http://127.0.0.1:8765/`. Welcome returned HTTP 200, anonymous session
  HTTP 401 and startup stderr was empty. No private config was inspected or
  changed and no live Odoo request was made.
- Planned-first/calendar-ring refinement on 2026-10-08: the full offline suite
  passed 188 tests (zero failures), including 23 personal chart cases and all
  prior scoped-list cases. New checks cover summary/render sorting, endpoint
  dates, dates outside scope, leap days, nonconsecutive years, Brussels
  midnight, area-scale geometry and a fixed ring through hide/hover actions.
  Browser verification passed with labelled fictional data at normal desktop
  and 390px phone width: planned projects precede actual-only projects, ring
  updates with years and stays fixed on hide, past scopes reach the rim,
  tooltip works, no overflow and no warning/error logs. JavaScript syntax and
  whitespace checks passed. No server restart is needed for these assets;
  refreshing the dashboard loads them without clearing sessions.
- Scoped-list clarification on 2026-10-08: projects whose selected-year
  planned and actual-through-today totals are both zero are omitted. Added
  three regressions for old-year-only, zero-hour, future-only, cancelled and
  unavailable-plan inactive records; nonzero plans/actuals and signed credits
  remain visible. Focused personal chart and sticky/scope suites passed
  (48 tests, zero failures); syntax and whitespace passed. The broader
  180-test result below predates this bounded filter refinement. The running
  server serves assets from disk with no-store, so a page refresh loads it
  without a server restart or session loss.
- Mon temps verification on 2026-10-08 (Europe/Brussels): all ten regression
  files passed with `node --test --test-isolation=none` (180 tests, zero
  failures), including 52 authentication/API cases, 30 sticky/scope cases
  and 15 personal chart/data/DOM cases. Only fictional credentials, temporary
  config and mocked localhost Odoo were used. Coverage includes own-account
  isolation, employee/resource planning, cross-year UTC allocation, signed
  corrections, future actual exclusion, duplicate names/codes, consultant
  inclusivity, planned-angle geometry, area fill, stable colors and legend
  changes without connector requests.
- Isolated browser checks passed at normal desktop size and 390px phone
  width: Mon temps default, sticky navigation across Projets/Mon temps, year
  totals, full-disk reformation, strike-through legend, equal outer radii,
  sector highlight and rounded tooltip, hidden irrelevant switches and no
  page overflow. Browser warning/error logs were empty. Saved labelled
  synthetic previews outside the repo; the preview process and tab were
  stopped after verification.
- Server/client JavaScript syntax, inline scripts and whitespace checks
  passed; affected documentation links were checked. No dedicated build,
  lint or typecheck command exists.
- Restarted the real workspace server as hidden standard-user Node process
  PID 25880 on `127.0.0.1:8765`. Welcome returned HTTP 200 with config login
  available; anonymous session returned HTTP 401. No private config was
  inspected or changed and no live Odoo request was made.
- Config-login verification on 2026-10-08 (Europe/Brussels): `main` at
  `bf7d5f0`, with the feature changes uncommitted. All nine regression files
  passed: 150 tests, including 42 authentication tests. Tests used synthetic
  config and mocked Odoo; the authentication child process blocks non-fixture
  fetch targets. Coverage includes token privacy, exact credential reuse,
  missing/invalid/rejected config, local peer/Host/origin guards, redirect
  refusal, shared rate limiting and session behavior. The first full run found
  one safe error-wording mismatch; restoring a fixed access-denied message
  resolved it and the complete suite passed.
- Server syntax, inline JavaScript parsing for index.html/login.html, changed
  documentation links and whitespace checks passed. No dedicated build,
  lint or typecheck commands exist.
- Isolated welcome-page browser verification passed for missing config,
  rejected token and successful config login to `/dashboard`. Desktop and
  390px mobile checks passed, with no horizontal overflow or JavaScript
  errors. Only fictional credentials and a localhost mock were used.
- Restarted the workspace server as hidden standard-user Node process PID
  11800 on `127.0.0.1:8765`. The updated welcome page returned HTTP 200,
  anonymous `/api/auth/session` returned HTTP 401 with
  `authenticationRequired: true`, and GET `/api/auth/login-config` returned
  HTTP 405. Startup stderr was empty. No private config was read or changed,
  and no real Odoo request was made.
- Previous verification: 2026-10-06 (Europe/Brussels).
- Branch: docker; HEAD: 2a5596f. Compared with main and checked actual Git status; pre-existing local changes preserved.
- All nine unit/integration suites passed: 125 tests, including main’s read-only, remaining-hours, sticky-scope and subcontractor suites. Tests use isolated mocked Odoo sources.
- Coverage includes credential rejection/XML-RPC faults, route protection, user isolation, credential overrides, secret non-disclosure, static-file restrictions, CSRF/logout, upstream failure, rotation, expiry, Secure cookie behavior and rate limiting.
- node --check server.js and inline JavaScript parsing for index.html/login.html: passed.
- node --check steering.js, steering-service.js and steering-client.js: passed. Steering browser checks passed at 1440px and 390px: unit → programme → project, four tabs, leader focus, keyboard navigation, shared filters, refresh and failed-refresh retry; no JavaScript errors or mobile page overflow. Screenshots use labelled fictional fixtures, not live business data.
- Welcome-page visual checks at desktop/mobile widths and password visibility toggle: passed; mobile overflow check returned false at 390px.
- Docker Compose configuration and local Markdown links checked; no Docker build was performed.
- No dedicated lint/typecheck command exists. Functional Odoo, workbook and deployment checks remain unverified.

## Session handoff

- Current task completed locally on 2026-10-26: `force-diagrams` was created
  from `main` at `81f03b1`, carrying the pre-existing uncommitted project-memory
  update without altering it. The Programme layout no longer draws an Other
  cloud, while keeping those bubble colours and forces. The follow-up hides
  Partenaires and suspends its reads, adding **Organisme / Financier** from
  dynamic exact `organism_id`/bounded body-name reads with each Unit catalogue
  request. Existing in-memory catalogue reuse avoids extra calls on mode or
  language changes; explicit refresh gets current data, without a fixed table.
  Full **1229/1229**, renderer/language **67/67**, service/HTTP **50/50**, syntax
  and whitespace pass. Independent review and offline French desktop/Dutch390px
  Edge checks pass, including keyboard/focus, graph roundtrips, colours/counts
  and contained scrolling; screenshots are outside the repo and resources closed.
  Implementation/tests are committed as **`40b1f57`** at the user's request;
  this companion documentation records the verification and discovery context.
  Both commits were fast-forwarded into `main` and pushed to `origin/main` on
  2026-10-28 at the user's explicit request. Checkout is `main`; the local
  `force-diagrams` branch is retained. Publication introduced no runtime changes;
  prior test results remain applicable and were not repeated. Follow-up guarded
  live verification confirms available financing bodies for **50/50** projects
  (seven exact body IDs, including two namesakes). Focused checks pass **69/69**.
  Reloaded the previously stale local server as hidden standard-user PID
  **31728**, port **8765**; welcome **200**, anonymous unit API **401**, stderr
  empty. Next action is reload/sign in again and refresh Unit DiCo for review.
  Merge and publication are complete. No Odoo write, Docker or
  configuration change occurred.

- Previous read-only discovery on 2026-10-26: `categories` was created from `main` at `81f03b1`.
  The user requested a financing-type inventory before researching directives.
  Guarded live reads of all accessible unit-206 projects, including archived
  records, found 50 unique projects, all with financing types; 27 distinct
  labels, no fallbacks/missing information. Subsequent partner/technical-committee
  inventories use the same 50 project IDs: 15/45 populated respectively, with
  all related names resolved. The three requested tables are ready for review.
  This factual discovery memory is preserved in the force-diagrams documentation;
  app code/configuration and Odoo were unchanged by that discovery. Next action
  is user review of the inventory before selecting financing directives to
  investigate. No publication was requested.

- Current task completed and published on 2026-10-26: fullscreen-only wheel
  zoom/right-drag panning and diagram-only presentation were committed on
  `sankey` as `fef2dcc`, fast-forwarded into `main` from `fe0eb37`, then pushed
  to `origin/main` at the user's explicit request. Checkout is `main`; local
  branch `sankey` is retained. The source/test/documentation commit is published;
  this checkpoint records its completed publication.
  Combined focused suite **137/137** (0.23s), independent review, syntax and
  whitespace checks pass. Offline Edge verifies anchoring, outside-plot capture
  and gesture-only context suppression, clipping, independent diagrams, keyboard
  tooltips, reset and FR/NL without warnings/errors. Screenshot saved; browser
  resources released. Desktop/390px checks verify diagram-only fullscreen and
  restored inline metadata/details. Refresh Budget and expand a Sankey to review.
  No live Odoo/server/private-config changes or dependency installation.
  Earlier publication entries describe the inherited main baseline.

- Latest publication completed on 2026-10-23: the user requested merge/push to
  main and cleanup of the feature and FR/NL branches. `origin/main` now contains
  feature/documentation tip `2e7746d` via a conflict-free fast-forward from
  `32d7211`. Both local branches are removed; the remote feature branch was
  deleted and the FR/NL remote branch was already absent. Checkout is `main`.
  All feature code remains identical to the previously tested **1204/1204**
  snapshot; only this project-memory checkpoint follows the merge. Private
  configuration and raw reports remain ignored; no Odoo or runtime change.
  Earlier feature-branch publication notes below are historical.

- Previous publication completed on 2026-10-23: the user requested commits/push.
  App/tests/catalogue commit `3c66e67` is published on the matching tracked
  `origin/codex/project-card-outline` branch, based on `32d7211`.
  Companion documentation captures this checkpoint and prior feature work.
  Final full offline suite **1204/1204** (32.52s), **63** syntax checks,
  independent scope/private-file reviews and staged whitespace checks pass.
  Private config/raw reports stay ignored. No Odoo read/write or server restart
  occurred during publication. Earlier uncommitted/unpublished milestone notes
  describe their implementation-time state and are superseded by this entry.

- Previous follow-up completed on 2026-10-23: right-hand Sankey text/spacing adapt
  toward twice the left connector/text extent, with 8–10 SVG-unit fonts,
  12.8–16 line height, 2–18 nominal gaps and collision-safe frame clearance.
  Sparse maxima remain; minimum-size overflow is allowed. Single column,
  financial scale and fullscreen geometry lifecycle remain intact. Focused
  **112/112**, independent review/static checks and fictional browser checks
  pass. Screenshot saved and preview/viewport resources released. Refresh
  Budget; no Odoo/server change. Full suite not repeated for this layout change.

- Previous follow-up completed on 2026-10-23: Sankeys retain one right-hand purchase
  column inline and fullscreen; split/routing/geometry-switch code removed.
  Focused **106/106**, independent review/static checks and dense fictional
  fitting/isolation/restore browser checks pass. Screenshot saved; viewport and
  preview resources released. Refresh Budget; no Odoo/server change. Full suite
  not repeated for this reversion.

- Previous follow-up completed on 2026-10-23: Viktor de Groote has a precise local
  `named-override` Ormitter classification across hours/planning/contributors
  and strict personnel totals, preserving genuine source evidence. Full offline
  **1205/1205**, focused **78/78**, review and static checks pass. App restarted
  in session **37191**, port **8765**; local login/access guards verified.
  Refresh/sign in again. No live Odoo/configuration/dependency/publication change.

- Previous follow-up completed on 2026-10-23: DiCo/programme project-card grids
  sort by visible short name, independent of source-code prefixes. Focused
  **175/175** tests and static checks pass; calendar/map source ordering stays
  intact. Refresh either view; no Odoo/server change.

- Previous follow-up completed on 2026-10-23: main Projects navigation, view heading
  and document title renamed **Mes Projets / Mijn projecten**. Focused **117/117**
  tests and static/scope review pass. Refresh; no Odoo/server change.

- Previous follow-up completed on 2026-10-23: programme selectors now use the same
  outline reveal as project cards while retaining 230/210px dimensions and
  programme-specific content. All **182/182** focused cases, independent review,
  static checks and fictional FR desktop/NL phone selection/fit checks pass.
  Screenshot saved; viewport and preview resources released. Refresh Programmes.
  Full suite/physical touch not repeated; no Odoo/server/configuration change.

- Previous follow-up completed on 2026-10-23: open Settings stacks above sticky
  date/navigation controls; all palette rows remain clickable. Focused
  **108/108** tests, independent review/static checks and fictional overlap/
  selection/Escape checks pass. Screenshot saved; preview resources released.
  Refresh to review. Full suite not repeated; no Odoo/server/configuration change.

- Previous follow-up completed on 2026-10-23: Settings includes Vibrant Emotions
  with the exact ten colours and cyclic reuse, matching preview, immediate
  repaint and persisted enum. Dico remains the default. All **170/170** focused
  cases pass; independent review/static checks and fictional FR/NL browser
  selection, unchanged paths and reload persistence pass. Screenshot saved;
  preview resources released. Refresh and choose the palette in Settings.
  Full suite not repeated; no Odoo/main-server/configuration/publication change.

- Previous follow-up completed on 2026-10-23: expanded Sankey far-bank flows use
  safe gaps between near-bank rows first, retaining lower fallback only for
  ribbons that cannot fit. Whole-stroke/bar/label clearance, amounts, grouping,
  inline restoration and interactions pass **113/113** focused tests, including
  **53/53** Sankey cases. Fictional FR/NL resize/isolation/restore checks pass;
  the 90-purchase example uses gaps for 32/45 far flows and is 103.36px shorter.
  Screenshot saved; temporary viewport and preview resources released. Review
  and static checks pass; full suite not repeated. Refresh Budget and expand.
  No main-server/Odoo/configuration/dependency/publication change.

- Previous follow-up completed on 2026-10-23: header Settings offers default
  Dico vibes (15 colours) and previous Classic (20), with native FR/NL radios,
  previews and browser-local enum persistence. Active project, Unit/programme
  and legacy line/area charts repaint without replacing controls, focus,
  tooltips, tables, geometry or data. Other chart families and semantic styles
  retain their colours. Final full **1195/1195**, focused **5/10/84/67**, review,
  static and fictional FR wide/NL phone switching/persistence checks pass.
  Screenshots saved; viewport reset and preview resources released. Standard-user
  app restart verified as PID **36916**, session **3291**, port **8765**; sign in
  again if prompted. No Odoo/configuration/dependency/publication change.

- Previous follow-up completed on 2026-10-23: expanded Sankeys split tall grouped
  purchase lists into two columns at a strict 2:1 node/gap threshold when the
  resulting total height improves. The gap-routing refinement above replaces
  the original lower-only routes. Inline text width,
  amount scales, grouping and all connections remain intact. Existing SVG DOM
  controls/gradients update in place and restore exactly. Focused **109/109**
  Sankey/Budget cases, independent review/static checks and fictional FR/NL
  expansion/resize/isolation/restore checks pass. The 90-item example is about
  38% shorter; screenshot saved, viewport reset and preview resources released.
  Full suite not rerun; no main-server/Odoo/configuration/publication change.

- Previous follow-up completed on 2026-10-23: annual Budget total bars now share
  category tooltips for exact localized amounts/currency. Native total buttons
  support hover/focus/tap, pin/unpin, blur/Escape and keyed rerender focus;
  zero/unavailable/no-category cases retain accessible amounts. Category arrows,
  bill dialogs, financial filters and source data remain intact. All **60/60**
  focused budget tests, independent review/static checks and fictional FR/NL
  desktop exact-value/Escape/keyboard checks pass. Screenshot saved; preview
  resources released. Full suite not rerun for this renderer-only fix. Refresh
  Projects > Budget; no main-server/Odoo/configuration/Git publication change.

- Previous follow-up completed on 2026-10-22: Projects area charts 02/03 use a
  dedicated twenty-colour palette in the user's exact order, looping after
  twenty new identities. Matching employee cues remain stable across both
  charts, filters, cumulative mode and FR/NL; bars and reference styles retain
  their prior colours. Milestone titles use 30° two-line labels with measured
  bounds, separated lanes, exact-date leaders and complete accessible titles.
  The replacement passes **81/81** renderer cases, exact order/repeat checks
  across **61** actors, syntax, links, whitespace and FR 2560px browser verification
  with all twenty colours and no errors. The previous full **1165/1165**, focused
  **91/91**, independent **108-case / 2664-label** geometry audit and FR/NL
  wide/phone/dense checks remain the broader baseline; no full rerun for this
  palette-only change. Screenshots saved and temporary preview resources released.
  Refresh Projects > Hours; main server, Odoo and private configuration remain
  untouched, with no commit or publication.

- Previous follow-up completed on 2026-10-22: the shared header switch stays
  visible and usable on every view; unsupported views keep normal layout with a
  neutral FR/NL hint. Selected Projects > Hours has a 528.75px overview with four
  half-height primary cards (91.19px), bar graphs alongside, and a separate
  full-width 50/50 actual/planned area-chart row. All legends stay compact on the
  right. Normal card width is 423px; the requested column ratio is exactly 125%.
  Wide-only actual-width SVG geometry and frame-batched,
  cancellable redraws retain employee/month focus and open tables through
  switching/resizing without dashboard rebuilding or requests. Final full
  **1162/1162**, focused **118/118 + 79/79**, independent review/static checks
  and fictional FR/NL wide/narrow/interaction checks pass. The observed RO
  warning is fixed and repeated resize checks are error-free. Screenshots saved;
  preview resources released. Refresh Projects > Hours; main server, Odoo and
  private configuration remain untouched, with no commit or publication.

- Previous follow-up completed on 2026-10-22: Mon temps has a binary Normal/Large
  header switch in FR/NL, with native keyboard/focus semantics and a single
  1600px boundary. Legacy saved Automatic migrates to Wide without an init write.
  Actual then planned hours share the chart row in a compact 120px summary,
  bringing the pie 175px higher. The wide view keeps
  four visual columns: recommendations 30% narrower, capacity/planning 50%
  narrower, graph width retained, and the project legend in the remaining space.
  Nested grids preserve the existing positioned tooltip card and live DOM;
  long legends do not push the chart downward. Normal remains default; the browser stores only
  the selected binary enum. Wide requires 1600 CSS px and narrower windows
  fall back safely. Switching/resizing preserves live DOM, focus, details and
  cached data without requests. All **1152/1152** full and **57/57** focused
  tests, independent review/static checks and FR/NL wide/narrow/live-resize,
  long-legend, tooltip and filtering browser checks pass. Proof screenshots
  saved and previews released. Refresh
  Mon temps; main server, Odoo and private config remain untouched.

- Previous follow-up completed on 2026-10-22: NF/FK Sankey purchases group across
  months by exact initials and show an earliest/latest label-month range with
  summed amounts. Original rows, code/category connections and currency/credit
  isolation remain intact; typed family/ribbon keys prevent source-name collisions.
  All **43/43** scoped and **1141/1141** full tests, independent review, syntax,
  links and whitespace pass. Fictional browser range/sum proof saved; temporary
  preview resources released. Refresh Budget; main server and Odoo/config/Git
  state were untouched by this presentation refinement.

- Previous follow-up completed on 2026-10-22: three half-height project-hours usage
  cards under the four macros, with personal/planning, total/planning and total/
  convention comparisons in FR/NL. Personal values reuse raw exact-own source
  identities and the existing dated interpolation; global comparisons, fixed
  cohort and graph-filter independence are preserved. All **1136/1136** full and
  **124/124** focused tests pass, with independent review, syntax/link/whitespace
  checks and fictional desktop FR/mobile NL browser verification. Screenshots
  saved and previews released. Refresh Hours to review; main server untouched,
  with no Odoo/config/Git mutation or publication.

- Previous follow-up completed on 2026-10-22: animated physical project map with
  separately cached theme/programme targets, smooth exact restoration, matching
  bubble/cloud colours and unchanged **266** tag links across **36** projects.
  Replay, reduced motion, cancellation and retained focus/details are verified;
  arc-length playback removes late collision snaps. Final **1123/1123** full and
  **46/46** scoped tests, independent geometry/source review, syntax, links and
  whitespace pass. Desktop FR/390px NL browser checks pass; proof screenshots
  saved and isolated preview tab/server released. Refresh/sign in if needed to
  review; the main server remains untouched by this frontend-only refinement.
  No new Odoo access, config edit, Git mutation or publication occurred.

- Previous follow-up completed on 2026-10-22: the original cloud-only toggle
  (superseded by the animation above) changes
  only background zones/legend/caption, preserving all 36 bubbles/266 links and
  active details. Pure visible-ID programme projection reuses the fixed lists
  without new Odoo calls; plotted counts **7/7/5 + 17 other**. Overlapping hulls
  are labelled approximate, with exact legend member tooltips. Full **1109/1109**
  tests, independent review, static checks and desktop FR/mobile NL checks pass.
  Backend PID **48048**, session **30928**, port **8765** restarted and protected
  probes pass. Sign in again; temporary previews released. No Odoo/config/Git
  mutation or publication. All implementation changes remain local/uncommitted.

- Previous follow-up completed on 2026-10-22: tag explorer sorts by visible-project
  popularity descending, with localized alphabetical ties. All **27/27** affected
  tests and syntax/whitespace pass; refresh to review. No browser/full-suite rerun,
  Odoo call or backend restart. Work remains local/uncommitted.

- Previous follow-up completed on 2026-10-22: product-data/governance cloud changed
  from blue-grey to terracotta **#a36a4d**; BIM/prefabrication stays blue.
  All **27/27** renderer/unit-map tests, independent review and syntax/whitespace
  pass. Refresh loads it; no browser/full-suite rerun or backend/Odoo change.

- Previous follow-up completed on 2026-10-22: **Explorer par tag** replaces the
  project list with localized used tags and exact related-project results in a
  345px desktop info column (+50%). Tag/open/focus state survives cached/language
  rerenders, and existing hover reset/explicit opening remain covered. All
  **118/118** affected tests, independent review/static checks and desktop FR /
  390px NL isolated browser checks pass. Temporary preview resources released.
  Refresh to review; no Odoo call, main-server restart, config edit or publication.
  Changes remain local/uncommitted; previous full-suite results are historical.

- Previous follow-up completed on 2026-10-22: similarity-map pointer leave restores
  all graph colours while retaining usable project details. Cached/language
  refresh keeps that cleared state; fresh keyboard exploration still highlights.
  Stale leave/cleanup guards and **91/91** affected tests pass, with independent
  review, syntax and whitespace checks. No fresh browser/full-suite run. Refresh to review; no
  backend restart, Odoo call or publication. All work remains local/uncommitted.

- Previous follow-up completed on 2026-10-22: Buildwise public-source enrichment
  adds **18** tag sets for the **32** Odoo-description gaps, giving **36 tagged /
  14 unresolved**. See [complete report](PROJECT_TAG_WEB_ENRICHMENT.md).
  All original Odoo facts and the original 18 tag sets are preserved; **22**
  response hashes and **80** tag-evidence entries reconcile. No automatic
  rescan or Odoo call/write was added. Current map **36/266/5** (projects/links/
  communities) has collision-free labels/bubbles and guides for displaced names.
  Full **1091/1091** tests, independent review, actual SVG/PNG, syntax, 154 local
  links and whitespace pass. No fresh browser/Docker/live-Odoo QA. Backend
  PID **51044**, session **95924**, port **8765** restarted and protected probes
  pass; sign in again. All changes remain local/uncommitted and unpublished.

- Previous follow-up completed on 2026-10-22: Unit-only interactive similarity
  map above calendar 02, using saved tags and exact session-visible projects.
  No description rescans or Odoo writes. Full **1083/1083** tests, independent
  review/static/source checks pass. FR browser checks at 553/390 and full actual
  SVG pass; fresh NL browser QA stopped after detected user activity, with NL
  tests passing. Local server PID **43204**, session **17520**, port **8765**
  restarted; sign in again to review. Optional data failures retain the calendar.
  All work remains local/uncommitted; no private-config change or publication.

- Previous follow-up completed on 2026-10-22: permanent shipped project-tag
  catalogue and guarded manual scanner, with all **50** accessible unit-206
  projects scanned (**18 tagged, 31 missing, 1 short**). Includes archived
  projects; missing/short completion is permanent by request. No Odoo writes.
  See [scan report](PROJECT_TAG_SCAN.md) and [workflow](../../data/README.md).
  Full suite **1059/1059** passed before final scanner refinements; final focused
  **32/32** pass, including 50-project no-rescan and real junction safety checks.
  Source reconciliation/static checks pass. No UI/backend runtime change,
  private config change, commit or publication. Next: review the stored tags and
  description-gap report; no mandatory implementation work remains for this task.

- Previous follow-up completed on 2026-10-22: verified eXtRAI's supplied narrative
  in its latest linked description version, **2511** (2026-03-31), via guarded
  exact-project reads. Source is `bw.project.description.version.description`,
  linked by `project.project.description_version_ids`; the standard project
  description is the generic template. Suggested technical tags only; no feature
  implementation, tests, Odoo write, config edit or runtime change.

- Previous follow-up completed on 2026-10-22: compact black milestone axis with
  9px two-line names at -75 degrees and the month caption below all titles.
  Month ticks/plot stay fixed; measured bounds, dense lanes and conditional
  height retain fit. **145/145** affected tests and independent/static checks
  pass. Offline SVG/PNG visual proof saved; no fresh browser QA after the earlier
  Computer Use URL policy stop. Refresh to review; all work
  remains local/uncommitted, with no Odoo access or backend restart.

- Previous follow-up completed on 2026-10-22: both scoped project-hours and lifetime
  convention bars now sort largest-to-smallest, using their own period totals.
  **141/141** affected tests, scoped independent review, syntax and whitespace
  pass. Browser visual checks were not repeated. Refresh to review; all changes
  remain local/uncommitted, with no backend restart or Odoo access.

- Previous follow-up completed on 2026-10-22: reduced Sankey right-column text
  from 10.5px to 10px, shared by names/amounts and embedded/expanded modes.
  Scoped independent review, **38/38** purchase-flow tests and whitespace pass;
  no repeated browser visual check. Temporary preview released. Refresh to
  review. Changes remain local/uncommitted; no backend restart or Odoo access.

- Previous follow-up completed on 2026-10-21: project-hour milestone overlays, optional
  exact-ID source/cache, strict date clipping and FR/NL details implemented.
  Fictional desktop/390px checks pass; screenshot saved and preview released.
  Final full suite **1026/1026** and final chart/monthly/i18n **141/141** pass.
  Independent source review findings are fixed and verified with regressions;
  static syntax/links/whitespace pass. Local backend restarted as Node PID
  **31108** on loopback **8765**, login 200 and anonymous milestones 401.
  Next action: refresh/sign in and review real-project milestone markers.
  Changes remain local/uncommitted; no live Odoo source access or write occurred.

- Previous follow-up completed on 2026-10-21: scoped project-hours and lifetime
  convention bars sort their people segments by ascending actual contribution,
  using their own period totals. Legends and all prior scopes/colours/fallbacks
  remain intact. **136/136** affected tests, independent review, static and
  fictional browser order/colour/tooltip checks pass. Screenshot saved; preview
  resources released. Changes remain local/uncommitted. Refresh to review;
  no Odoo call, backend restart, config change or publication.

- Previous follow-up completed on 2026-10-21: identical full right-hand purchase
  names merge with summed amounts and separate code connections. Original rows,
  currency/purchase-credit boundaries and monetary/ribbon totals remain intact;
  mixed-code incoming gradients match the stable merged-node colour. **184/184**
  affected tests, independent review, static and fictional desktop/390px FR/NL
  checks pass. Screenshot saved; preview resources released. Changes remain
  local/uncommitted. Refresh to review; no Odoo call, backend restart, config
  change or publication.

- Previous follow-up completed on 2026-10-21: blank internal codes share one
  middle node per diagram; the heading names Sankey and a square hide/show
  toggle sits beside expand. Collapsed state survives cached/language refresh;
  fullscreen hide closes safely and expand reveals hidden content. Full source
  code labels also appear on grouped hovers, while purchase-specific details
  remain individual-only. **180/180**
  affected tests, independent review, static and fictional desktop/390px FR/NL
  browser checks pass. Screenshots saved; preview resources released. Changes
  remain local/uncommitted. Refresh to review; no Odoo call, backend restart,
  config change or publication.

- Previous follow-up completed on 2026-10-21: convention category identities each
  determine a stable colour and matching allocation-gradient start. Internal
  code colours stay intact. Right-column gaps are now halved to 18 units and
  label frames reduced to 16 units, retaining full amounts and readable text.
  **175/175** affected tests, independent review, static checks and fictional
  embedded/expanded/40-entry browser verification pass; screenshot saved and
  preview resources released. Changes remain local/uncommitted. Refresh to
  review; no backend restart, Odoo call, config change or publication.

- Previous follow-up completed on 2026-10-21: right-hand names and complete EUR
  amounts share one line; differently coloured endpoints use matching gradients
  during normal display and foreground emphasis. **174/174** affected tests,
  independent review, syntax/local links/whitespace and fictional desktop/phone,
  embedded/expanded, wide-name/large-amount and FR/NL checks pass. Screenshot
  saved; preview resources released. Changes remain local/uncommitted; refresh
  to review. No backend restart, Odoo call, config change or publication.

- Previous correction completed on 2026-10-21: expanded purchase Sankey scales
  to whichever available dimension is limiting, preserving proportions and
  one physical scale across purchase/credit diagrams. **172/172** affected
  tests, independent review, static and fictional multi-viewport/dense-list UI
  checks pass. Screenshot saved and preview resources released. Refresh to
  review; no backend/data/config/restart/publication change. Earlier full-screen
  geometry descriptions below are superseded by this fit behavior.

- Previous follow-up completed on 2026-10-21: the purchase graph now has its
  requested top-left expand square and viewport-filling dialog, with sticky
  restore, Escape/toggle close and preserved focus/data on return or refresh.
  **170/170** affected tests, independent review, static and fictional
  desktop/390px browser checks pass. Screenshot evidence is saved; preview
  resources are released. Refresh the current local dashboard to review;
  backend PID **56096** is unchanged. All earlier local changes remain
  uncommitted; no Odoo access/config change/restart/publication occurred.

- Original objective completed on 2026-10-21: the approved purchase Sankey is
  implemented in the shared Budget panel on `codex/project-card-outline`, HEAD
  `32d7211`, with all earlier local experiments preserved. See Functional State
  for scope and verification. Final **989/989** offline tests, independent review,
  static and fictional desktop/390px/dense-list UI checks pass. New source
  modules, fixtures/tests and documentation remain local/uncommitted. Preview
  resources are released and screenshot/test evidence is in the chat
  visualization directory. Current server is hidden standard-user Node PID
  **56096** at `http://127.0.0.1:8765/` (welcome 200, anonymous finance 401,
  empty stderr); sign in again after reload. No live Odoo access, private-config
  change or publication occurred. Next: user review of Budget after sign-in.
  Previous runtime/next-action entries below are historical.

- Latest objective completed and rechecked on 2026-10-20 after an unexpected
  exit: planned-chart full-life convention, actual02 today title and hidden
  small project radios are implemented in FR/NL on `codex/project-card-outline`.
  Full **949/949** offline tests, independent/static and fictional desktop/390px
  browser checks pass. Preserve both this task and the October 16 outline-card
  experiment; neither has been committed/pushed. Preview resources are released
  and screenshots saved. Server relaunched as hidden standard-user PID **15228**
  at `http://127.0.0.1:8765/` (welcome 200, empty stderr); user must sign in again.
  No live Odoo call or private-config modification occurred. Next: user review.
  Earlier runtime and pending-verification notes below are historical.

- Publication and branch creation are complete: remote `main` verified at
  `32d7211174202470bfc14cc8ef98860e7f7f75c5`; active branch is
  `codex/project-card-outline` from that checkpoint. The user approved the
  outline-card plan, now completed locally. Full suite **940/940**, post-SVG-fix
  affected tests **178/178**, independent/static checks and fictional desktop/
  390px browser checks pass. Preview resources are released and screenshot is
  saved. Refresh loads the frontend change; no backend restart or Odoo access
  occurred. Main still contains the prior 936-test snapshot; this card
  experiment remains uncommitted/unpublished pending user review.

- On 2026-10-16 the user explicitly requested commit-all, push to `main`, then
  a new card-design branch. Feature `104b533` is published and remote-verified;
  the 936-test source snapshot is unchanged. The next branch has now been
  created as recorded above and the approved card plan is completed locally.
  Keep white/black/turquoise project
  cards with short name/portrait at rest and animated outline/full metadata
  on hover/focus; the implemented scope preserves the separate programme cards.

- Current objective completed on 2026-10-16 on `codex/fr-nl-dashboard`:
  FR/NL selector/persistence, calendar full/near mode and short left labels,
  multiple employee exclusions with explicit ignored hours, and zero monthly
  details cleanup. Final **936/936** offline tests and independent/static/UI
  checks pass. Runtime PID **33592** serves loopback 8765; sign in again after
  restart. Preview resources are released, private config is untouched and
  Odoo was not contacted. These changes are now published as recorded above.
  Earlier handoff entries below are historical;
  their former runtime/uncommitted/next-action notes are superseded here.

- Publication is complete for the nine feature/integration commits ending at
  `0ca12c5` on `origin/codex/project-budgets`; the documentation checkpoint
  records the completed features and this publication. The user's requested
  feature split preserves original source/test content and passes a new full
  870-test run. Private configuration is ignored and no PR was requested or
  created. Next action is user review of the published branch; historical
  local/uncommitted notes below describe earlier implementation milestones.

- Approved Project Hours graph update is complete and published. All 870 offline
  tests, independent review, fictional desktop/390px UI checks and static
  syntax/link/whitespace checks pass. Macro notes use an accessible circled-i;
  two explicit to-date comparisons replace them. Personal bars show gradient
  orange/red overruns; actual history includes a solid red dated-planning line.
  The new full-project planning area includes future/TH resources, independent
  employee selection and shared monthly/cumulative/Ormitter controls. Preview
  resources are released and screenshots saved. Next action is user review
  after refresh. Existing server welcome is 200; implementation required no
  backend restart or live Odoo access. Authorized commits/push are recorded above.

- The >100% orange coverage advice is complete: 23 renderer tests, independent
  review, fictional visual and static checks pass; screenshot saved and preview
  released. After interruption the files were verified intact and the stopped
  workspace server relaunched as hidden Node PID 27580 on loopback 8765
  (welcome 200, empty stderr). Next action is user review after signing in
  again. No backend code or Odoo data changed; work remains uncommitted.

- The requested third-card presentation of planning coverage is complete.
  All 146 affected tests, responsive/browser and static checks pass; screenshot
  saved and preview resources released. This refines the approved percentage
  feature without changing its math. Next action is user review after refresh;
  work remains local/uncommitted.

- Completed the requested category-level explanation of the Planning capacity
  difference through guarded own-record reads. Private results are confined
  to the answer/receipt; production capacity remains entitlement-based.
  No implementation, restart or tests were needed for this clarification.

- The 2026-10-15 coverage-percentage task is approved and implemented in the
  renderer, including strict 85% comparisons with machine-roundoff tolerance.
  146 focused tests, independent review, responsive and static checks pass.
  Screenshot and private Sources receipt are saved; preview resources are
  released. Next action is user review. The own-account calendar
  reconciliation succeeded; retain the annual entitlement-based capacity
  rather than switching to booked absences. Refresh loads the frontend change.

- The complete-planning scope clarification and **Arrêter (ou clarifier)**
  rename are implemented; 143 focused tests and independent review pass.
  Fictional browser checks and static checks pass; the preview tab, helper and
  verified temporary fixture are released. Files are intact after
  the reported interruption; the existing server responds with 200. Next
  action is user review; refresh loads the frontend changes.

- Completed the approved 2026-10-14 work-capacity task, excluding unpaid leave:
  both scoped metrics, exact own-calendar/annual-entitlement reads, explicit
  future/custom estimates and persistent calculation details are implemented.
  Final 838 offline tests and live aggregate/endpoint checks pass. Runtime PID
  32300 serves the checkout on loopback 8765; sign in again after reload. No
  Odoo writes/private configuration edits occurred; work is local/uncommitted.
  Next action is user review; other-account/part-time permissions remain
  unverified beyond synthetic cases and employment history stays unknown.

- Completed the Project Hours macro-card follow-up on 2026-10-13: positive
  excess wording names the convention and card minimum heights are 20% lower.
  Latest 57 renderer tests, independent review and fictional responsive checks
  pass without changing calculations or backend. Refresh loads this local,
  uncommitted frontend update on `codex/project-budgets`.

- Completed the compact recommendation follow-up on 2026-10-13: stop summaries
  show project plus short joined reasons, the heading follows selected years/
  custom dates, and detailed evidence remains accessible. Latest 166 focused
  tests and fictional browser title/compact-row checks pass; no backend change.
  Refresh loads this frontend-only update. Work stays local/uncommitted.

- Completed the exclusive Arrêter follow-up on 2026-10-13, including optional
  project-wide BW convention/actual evidence, strict source guards and explicit
  expiry/no-personal-plan/budget-exhaustion reasons. Final 769 offline tests,
  independent review, fictional desktop/tablet/mobile and syntax/link/diff
  checks pass. Runtime PID 22588 serves the checkout on loopback 8765 after a
  verified idle-port launch; sign in again. Work is local/uncommitted on
  `codex/project-budgets`. Next action is user review of the four columns with
  accessible real data; broad source permission/completeness remains unverified.

- Completed the 2026-10-13 planning-wording follow-up: personal bar/pie available
  hours are explicitly distinguished from expected-to-date recommendation gaps;
  confirmed exhausted personal planning produces red/bold stop advice without a
  contradictory weekly target. Current-day/unselected-year allocations and
  unavailable/partial/negative inputs are guarded. Final 731 offline tests and
  independent review pass; fictional desktop/390px, syntax, links and whitespace
  checks pass. Changes are frontend-only, local/uncommitted, with no Odoo calls
  or production runtime changes. Its red-row placement was superseded by the
  exclusive Arrêter follow-up above.

- Completed four-card macro refinement on 2026-10-13: fixed-cohort frontend
  helper/UI and controller wiring, calendar-month-only warnings and exact gap
  dates are verified. All 721 offline tests, independent review, fictional
  desktop/tablet/mobile, guarded 2026-10-12 source aggregates and documentation
  checks pass. Preview resources are released. The user's restart is verified
  as hidden standard-user PID 21280 on loopback 8765; sign in again. Work remains
  local/uncommitted. No new endpoint, Odoo write or private config change occurred.
- Completed correction on 2026-10-12: linked eXtRAI TH detection is fixed and live
  aggregates reconcile (2027 261.71h, total TH 370h, total planning 4352.34h,
  planning without TH 3982.34h). Full-width macro description, largest-hour-gap
  recommendation order and stronger separators are implemented. All 707 final
  offline tests, independent review, fictional desktop/mobile and documentation
  checks pass. Preview resources are released. The necessary backend restart
  is verified as hidden standard-user PID 36104 on 127.0.0.1:8765; sign in again.
  Changes remain local/uncommitted and the read-only RPC guard is intact.
- Completed follow-up on 2026-10-12: French period
  headings, compact personal recommendations and lifetime convention/planning
  information with confirmed TH attribution and future person-coverage warnings
  are implemented and verified. Exact eXtRAI aggregate reconciliation
  is complete (year 2026 plan 664.6, actual 739; lifetime plan 2561.07; September
  reference 852.7549616648411). New recommendation arithmetic/DOM/controller
  tests, all 700 final offline cases, independent review and synthetic
  desktop/mobile checks pass. Syntax, whitespace and local documentation links
  pass. Preview helpers/tabs/fixtures are released. The necessary workspace
  restart is verified as hidden standard-user PID 11028 at 127.0.0.1:8765;
  sign in again. Work stays local/uncommitted on `codex/project-budgets`.
- Previous follow-up completed on 2026-10-11: **Programmes** keeps its three larger
  responsible cards above the selected programme's fixed 10/8/5 project cards,
  lifetime calendar and monthly count. in-beTwin's business code **56261849** was
  found in the user's requested read-only lookup and added to DC2. Canonical
  session-bound requests and strict code matching disclose unavailable or
  ambiguous references, with no department/year filter or broad fallback.
  Existing project details/Back, per-programme cache/response isolation, observer
  cleanup and loading-action keyboard focus are verified. All 648 offline tests,
  independent review, synthetic desktop/390px and syntax/link/diff checks pass.
  Preview resources are released. The workspace restart is verified as PID
  30696 on 127.0.0.1:8765; sign in again. Work remains local/uncommitted on
  `codex/project-budgets`; no Odoo write, commit, push or publication was performed.
- Previous follow-up completed on 2026-10-11: both grids use the newly requested
  white/black animated card design with a turquoise border, manager portrait and
  short title on the front; number, short title, manager and italic long title
  over three soft floating colors on the back. Uniform sizes and radio/focus
  behavior remain. Dates/budget are kept in native tooltips/descriptions.
  All 186 focused tests, independent review, fictional desktop/390px checks and
  syntax/link/diff checks pass. Refresh loads the change. Work remains local and
  uncommitted on `codex/project-budgets`, with no new Odoo access, workspace
  restart or publication.
- Previous follow-up completed on 2026-10-11: both project grids have uniform card
  sizes, bold short titles without brackets, separate source project numbers
  and smaller italic full titles with ellipsis. Existing portraits, blue flip
  backs and native selection remain. All 186 focused tests, independent review,
  fictional desktop/390px checks and syntax/link/diff checks pass. Refresh loads
  the change. Code/tests/docs remain uncommitted on `codex/project-budgets`,
  without new Odoo access, a workspace restart or publication.
- Previous follow-up completed on 2026-10-11: config-file login failures use bold
  orange text and the button reads **Utiliser le fichier de configuration**;
  retries and manual login reset the notice state. Fictional desktop/390px
  verification, independent review, three existing welcome-fixture cases and
  syntax/link/diff checks pass. The fixture includes normal DOM dataset support.
  Refresh the
  welcome page to load the change; no workspace restart or new source access.
  The earlier full/focused test results below are unchanged historical checks.
- Previous follow-up completed on 2026-10-10: flipped cards in both project grids
  retain the first bracketed project name and mini manager portrait/initials.
  All 178 focused tests and fictional desktop/390px checks pass; compact Unit
  cards and personal metadata fit without overflow. No new source reads were
  added. The user's latest restart is verified as workspace PID 18456 on port
  8765 (welcome 200, anonymous session 401, empty stderr); sign in again.
  Work remains uncommitted on `codex/project-budgets`.
- Recovery check completed on 2026-10-10 after the unexpected Codex exit:
  all saved refinements and new modules/tests are intact. Full offline suite
  **586/586** passes; independent source/asset review, script parsing, local-link,
  conflict-marker and diff checks pass. The workspace server survived as PID
  27424 on port 8765 (welcome 200, anonymous session 401, empty stderr); it was
  not restarted. No implementation repair, new source read or Git mutation was
  required. Work remains local/uncommitted on `codex/project-budgets` at
  `ba96523`; user review/publication remains the next step.
- Previous follow-up completed on 2026-10-10: Unit DiCo adds a monthly maximum
  simultaneous-project area chart under the timeline, with the same full-life
  date scale/exclusions and honest missing-date coverage. Linked horizontal
  scrolling, roving monthly details and a numeric table are complete. All 175
  focused UI tests, independent review/400-case count oracle and fictional
  desktop/390px checks pass. The user's requested restart is verified as PID
  27424 on port 8765. Temporary previews are closed/removed; changes remain
  uncommitted without new source access or publication.
- Previous follow-up completed on 2026-10-10: both timeline graphs now use a much
  stronger light-to-dark linear gradient, including grey completed bars.
  Fictional browser checks and independent CSS review pass; no tests were rerun
  for this CSS-only change. Refresh loads the style without restarting. Temporary
  preview resources were cleaned up; changes remain uncommitted.
- Previous follow-up completed on 2026-10-10: both radio grids replace blur with
  metadata flip cards and #4a85b3 backs. Full convention macro budgets are optional
  exact-ID source reads with honest currency/unknown handling, independent of
  scope and personnel choices. All 308 focused tests and independent review pass;
  fictional desktop/390px browser checks pass. The workspace server is verified
  as PID 32456 on port 8765. Temporary previews were closed, and code/tests/docs
  remain uncommitted without live source access or publication.
- Previous follow-up completed on 2026-10-10: both timelines place completed
  projects last, and the personal Projets overview includes the shared chart
  below radios. Personal scope governs membership while full project dates
  govern durations; optional exact-ID reads preserve unknown dates and hours.
  All 259 focused tests, independent review and fictional browser checks pass.
  The workspace server was restarted and verified as PID 18416 on port 8765.
  Temporary previews were closed; changes remain uncommitted without live
  source access or publication.
- Previous follow-up completed on 2026-10-10: compact 25px Unit DiCo timeline,
  individual 0.5s viewport bar fill, grey projects ending before Brussels today
  and dotted black today marker. All 104 focused tests, independent review and
  fictional desktop/390px scrolling checks pass. Year-2999 exclusion, source
  bounds, radio colors and selection remain intact. Observer cleanup covers
  rerender/tab exit/detail; fallback and reduced motion keep durations visible.
  The user's immediate server restart is verified as PID 31328 on port 8765.
  Code/tests/docs remain uncommitted; no source access or publication occurred.
- Previous follow-up completed on 2026-10-10: personal and Unit DiCo radio grids
  apply hover-only sibling blur, preserving colors/dimensions and selection.
  Fictional browser checks and independent CSS review pass; touch gating,
  visible keyboard focus and reduced motion are handled. CSS and docs remain
  uncommitted; no automated test rerun, source access or workspace-server restart
  was needed. Refresh loads the new styles without clearing the user's session.
- Previous follow-up completed on 2026-10-10: projects ending in year 2999 are
  excluded from the Unit DiCo timeline and both scale bounds, while retaining
  their radio choices and Hours/Budget access. All 92 focused tests pass,
  including four new renderer regressions; independent review, syntax,
  whitespace and local documentation links pass. The earlier full suite had
  509 passing tests and was not rerun for this filter. Changes remain uncommitted;
  no source access, server restart or publication occurred for this follow-up.
- Previous follow-up completed on 2026-10-10: French **Afficher les coûts de
  personnel BW** checkbox and personnel-free convention budget reference,
  matching ratio/balance and checked restoration. Immutable macro/source facts,
  supplier costs and permanent annual exclusions remain intact. All 509 offline
  tests, syntax/whitespace/local links and fictional browser checks pass. The
  user-requested server restart is verified as hidden standard-user PID 31392
  on loopback port 8765; sessions need a new login. Changes are uncommitted;
  no new Odoo request or publication occurred for this follow-up.
- Unit DiCo is implemented after explicit plan approval, with fixed department
  206 catalogue, compact tiles, lifetime timeline and shared project detail.
  Guarded live verification found 50 accessible projects including Extrai and
  coherent dates; this is the configured account's visibility, not a business
  completeness assertion. 503 initial full-suite tests and the additional renderer
  teardown regression passed. Desktop/mobile fictional checks and independent
  review passed. The later French BW checkbox and filtered convention-reference
  follow-up are complete, with all 509 final regression tests passing.
  Changes remain uncommitted on `codex/project-budgets` at `ba96523`.
- Earlier objective completed on 2026-10-10 after **go**: default expense-only
  convention actuals, unchecked **Show BW personnel costs** restore control,
  hidden personnel comparison and permanent annual personnel-category exclusion
  with independent supplier filtering. Its earlier full displayed convention
  reference was superseded by the user's later personnel-allocation exclusion.
  All 451 initial offline tests, syntax/whitespace, independent
  review and desktop/390px fictional checks pass. The earlier custom-date and
  shortfall work remains intact. Branch `codex/project-budgets` stays at `ba96523`
  with both refinements uncommitted. No Odoo call, config change, commit, push,
  stash or PR creation occurred.
- Current objective completed on 2026-10-10 after **go**: custom inclusive
  Brussels start/end scope in the sticky bar and neutral below-planned badges
  in the personal project legend and project comparisons. Native date inputs
  retain draft/focus state; custom/year modes are mutually exclusive. Project
  date ticks clip the same scope, while lifetime/monthly/budget remain independent.
  All 429 offline tests, syntax/whitespace, independent review and desktop/390px
  fictional checks pass. Branch `codex/project-budgets` remains at published
  `ba96523` with these code/tests/docs changes uncommitted. No new Odoo request,
  configuration change, commit, push, stash or PR creation occurred.
- Current bill-detail refinement is complete after explicit plan approval:
  thin annual bars open native allocated-expense popups with source descriptions,
  supplier filtering, signed credits and reconciliation disclosure. Annual plots
  are 25% taller; macro cards/metadata use another 20% less spacing. All 408
  offline tests, independent review, source/privacy and desktop/mobile checks
  pass. Exact Extrai annual expense lines and all matching bill descriptions are
  readable/reconciled for the configured account. Prior code-bar/Ormit exclusions
  remain implemented. No separate build/lint/typecheck command exists. No Odoo
  write or PR creation occurred. Feature commit `482271c` is published on
  `origin/codex/project-budgets`; all 408 tests passed again after fixture cleanup.
- Current objective completed on 2026-10-09: implemented the Heures/Budget switch,
  convention macro/lifetime consumption and annual grouped vertical bars on
  `codex/project-budgets`, created from `288ef6d` and now tracking its matching
  origin branch after publication of feature commit `482271c`.
  User **go** approved the plan and recommended lifetime inclusion of recorded
  personnel costs. Code, tests and documentation are committed and pushed.
  Initial 357-test, desktop/390px and targeted live finance checks passed; the
  latest full suite now passes all 408 tests. Annual consumption remains billed;
  committed includes billed spending and must not be added to it.
- Current refinement completed on 2026-10-09: scoped bar date references now
  intersect selected years with project start/end dates, show the effective
  period, and preserve recorded hours and independent lifetime/monthly scopes.
  Extrai's December 2025 start and empty own 2025 plan were confirmed by guarded
  reads for the configured account. Employee isolation remains implemented.
  All 303 offline tests and desktop/390px fictional browser checks pass.
- Previous dashboard objective completed: user-approved **Mon temps** personal
  macro chart, default view, named sections and sticky navigation on
  `codex/mon-temps-macro`, including scoped-list filtering, planned-first
  order, calendar reference ring and Hors planning group/divider. Mon temps 02
  is hidden. Projets now provides the scoped personal radio grid, optional
  manager photos with fallback. The selected view now contains the personal
  and all-employee planned/actual bars plus a third project-date convention
  comparison with missing-budget MIS message and retained actual bar.
  All 303 offline tests and responsive
  browser checks pass, and the workspace server runs the latest endpoint/code.
  The one-second bar-fill refinement is browser-verified; refresh loads its CSS
  without restarting the server or clearing sessions.
  The project-wide comparison now offers conditional unchecked Ormitter
  inclusion and exact-employee actual segments, optional photos/names and a
  matching list. Negative employee nets use a signed breakdown and neutral
  net bar. The latest 139 frontend tests and desktop/mobile browser checks pass.
  The project title is four pixels smaller and bars are 10% thinner.
  Employee segments now retain subtle light-to-dark shading; the CSS-only
  refinement is browser-verified and loads on refresh without a server restart.
  The reported Extrai budget bug is fixed by using the confirmed technical
  field, preserving decimal precision and separating empty/unavailable messages.
  Projets · 02 now adds monthly/cumulative employee areas and total/convention
  lines from project start through today, shared inclusion/colors, replay animation and
  accessible month details/table; all checks pass.
  Employee photo/name bubbles now sit directly inside their matching bar
  segments with responsive avatar-only fallback; the old overhead spacing is
  removed. All 31 renderer tests and desktop/390px browser checks pass.
- Previous objective completed locally: exact `52e377e` merge and config-token
  login with compact welcome-page information; those changes are preserved.
- Publication on 2026-10-09: dashboard commit `724fde1` was pushed to
  `origin/codex/mon-temps-macro` after explicit approval of the public destination
  and payload. Local `main` was also observed fast-forwarded to that commit;
  remote `main` was not pushed. The feature branch tracks its matching remote.
  The parent merge `bf7d5f0` retains `5d5aa26` and `52e377e` ancestry.
  The earlier 24-hour password-login work remains in `stash@{0}`
  (`password-login work before pulling main (2026-10-06)`). Private config is
  untouched, and sessions retain main's eight-hour default.
- Current verified runtime: http://127.0.0.1:8765/ runs this branch as
  standard-user Node after restart on 2026-10-23, attached to terminal session
  **37191**. Login is 200 with matching workspace bytes,
  anonymous unit API is 401 and protected palette asset redirects 303 to login.
  The previous task-owned listener in session **3291** was stopped before
  replacement. Sign in again; no live Odoo call was used for these probes.
- Next action: refresh/sign in again to reload Viktor de Groote's records with
  the Ormitter exception, then review the larger outline-style
  programme cards, including keyboard focus and translated details. Open the top-toolbar Settings menu
  to review default Dico vibes or select Classic or Vibrant Emotions for line/area charts. The
  preference survives reload; charts repaint immediately. Select Projects > Budget to review
  the restored single purchase column with adaptive font/spacing in the expanded Sankey for all lists, and
  exact-amount tooltips on the three annual total bars, including keyboard access.
  Select Projects > Hours to review
  the selected-palette area charts 02/03 and flatter 30° milestone labels. Use the
  Normal/Large header switch to review the half-height macro cards, overview/bar
  row and independent equal-width area charts with compact right legends. The
  switch now remains visible on every view. It retains Mon temps' four columns,
  separate project legend and raised pie
  with actual/planned summary, including keyboard operation and resizing. The grouped NF/FK month
  ranges and summed amounts remain available in the Budget Sankey. The three compact usage cards below
  the project-hours macro figures retain their personal/planning and project-wide
  planning/convention comparisons. The unit similarity map above
  calendar 02 also retains animated settling, replay, matching colours,
  theme/programme layout restoration and the tag explorer, together with the enriched local tags and
  [public-source/gap report](PROJECT_TAG_WEB_ENRICHMENT.md). Earlier visual
  review remains available for the lower milestone title axis, descending project/convention bars and prior
  local refinements on `codex/project-card-outline` after refreshing/signing in.
  Earlier published dashboard features remain on `main` as recorded above;
  this map and the accumulated refinements are now committed in `3c66e67` and
  published on `origin/main`, together with documentation tip `2e7746d`.
  Previously targeted configured-token authentication
  and targeted Extrai budget/date/personal planning reads are verified;
  staffing-assignment, profile-photo access, broader personal/project access and
  deployment remain unverified.
- Blockers: none for this implementation. Broader financial completeness,
  precise settlement-dashboard filters, invoice allocation rules, attachment
  access and deployment behavior remain verification limits.
