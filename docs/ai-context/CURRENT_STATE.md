# Current State

## Functional State

- DiCo steering adds project/programme/unit macro summaries, meta coverage/source diagnostics, contributor drill-down, upcoming known deadlines and Summary/Resources/Budgets/Reliability project tabs. The connected-project-leader shortcut matches the session UID against a configured user relation and resets other filters.
- Steering reads live using the signed-in account, without persisted history or source writes. Authoritative cumulative project hours, visible timesheets and reconciled Progress/WP evidence are distinct; annual/convention financial periods and currencies are kept separate. The confirmed DiCo filter and programme reference are server-side local configuration; steering remains disabled by default until that filter is confirmed.

- The dashboard starts on **Mon temps**. Persistent sticky navigation contains Mon temps, Projets and the existing steering shortcuts. Personal years stay in that bar; irrelevant personal/project and consultant-hour switches are hidden in Mon temps.
- Mon temps resolves the signed-in user's exact employee/resource IDs server-side and reads personal hours across accessible projects, without a Lead Unit restriction. Account and employee overrides are ignored. Unsupported identity mapping fails closed; unavailable planning remains unknown.
- **Vue macro** is the first personal section: full-year planning determines equal-radius pie angles; signed actual hours through today in Europe/Brussels determine colored area (square-root radius). Stable project colors, radial tint bands, overrun badges, accessible rounded tooltips and a strike-through hide/show legend are implemented. Hidden slices reform a full disk. Projects with both scoped totals at zero are omitted, including zero-hour/future-only actual records. Zero/unknown planning stays in the legend without an invented slice only when actual hours are nonzero.
- The legend puts positive planned totals first, with alphabetical order inside each group. A thick calendar reference circle uses the same area scale, from the center on the first selected 1 January to the rim on the final 31 December. It counts selected Brussels calendar days, including leap days, excludes unselected gaps and remains independent of hidden projects and planning-slot dates.
- **Hors planning** groups known unplanned projects with nonzero actual hours below a horizontal divider, with a visible-project signed actual subtotal. Unavailable planning stays labelled separately. **Mon temps 02 / Suivi par projet** is hidden.
- **Projets** initially shows a responsive native-radio grid of the person's projects with nonzero planned or actual hours in the shared year scope. It includes projects hidden from the macro and works without DiCo configuration. Choosing a project opens its name and three comparisons: own employee hours, scoped all-employee project hours, then convention/actual hours over the project dates. Returning restores keyboard focus to its radio. Scope changes remove selections that are no longer involved.
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
- Odoo email/password login and the optional **Use config file** button create the same HttpOnly/SameSite session. Config login reads the private username/API token on the server and requires a loopback socket and Host. Compact welcome-page information covers missing/invalid config and rejected tokens. The dashboard and all connector routes require the session; request/config overrides cannot replace its identity or Odoo permissions.
- Logout, fixed expiry (eight hours by default), replacement-login rotation, origin checks and shared login rate limiting are implemented. Manual passwords are retained only in server memory for XML-RPC calls; configured tokens remain in the private file and session memory. A server restart clears sessions. Credential-bearing RPC errors and malformed-config errors avoid secret reflection, and RPC redirects are rejected.
- HTTP serving uses an explicit application-page/asset whitelist; personal chart assets require authentication. config.local.json is excluded from Docker build contexts.
- README, example configuration, technical wiki, decisions, known issues and change log reflect the new behavior.

## In Progress

- The approved **Mon temps** iteration and requested **Projets** grid/comparisons
  and stacked monthly/cumulative graph with employee isolation are complete locally on `codex/mon-temps-macro` at
  `bf7d5f0`, including the project-date-clipped scoped references. All 303 offline tests and desktop/mobile browser checks pass. The
  reported Extrai budget lookup remains corrected and verified against its
  live read-only value. Broader live-account verification remains pending.
- Completed config-token login, tests and documentation remain preserved as uncommitted changes on this new branch. No commit, push or stash was requested for this dashboard iteration.
- The user-requested merge of exact commit `52e377e` is complete as `bf7d5f0`. That commit is the empty index parent of the earlier password-login stash, so the merge records ancestry without applying the stashed feature work.
- Main already includes PR #1's Docker/authentication/steering integration at `5d5aa26`. Real DiCo configuration, programme mapping and live Odoo validation remain pending. See [Pilotage](../wiki/PILOTAGE.md).

## Known Limitations

- Configured-account XML-RPC authentication and Extrai budget/date access succeeded in the targeted read-only diagnostic. Manual password compatibility and broader real-account data access remain unverified. SSO/MFA flows are not implemented.
- Real manager/employee photo availability, broader employee/planning permissions and staffing-assignment schema/access remain unverified. Targeted Extrai personal planning/actual reads succeeded for the configured account; the active browser identity was not independently compared with that account. Optional enrichment preserves hours; unavailable assignments cannot confirm Ormitter presence and unavailable planning remains unknown.
- **Budget personnel BW** source/type/unit and configured-account access are confirmed for Extrai (`54252043`, project ID `2083`): `budget_staffing_convention_hours` contains `3890.3967484570226` decimal hours (`3890:24` when rounded to hours/minutes). Other projects' field access and project-date completeness remain unverified; unsupported metadata or denied reads remain unavailable.
- Sessions/counters are local to one process. HTTPS termination and SESSION_COOKIE_SECURE=true require deployment configuration; proxy users can share an IP counter.
- Config tokens are plaintext local secrets. The local-login guard checks socket peer and Host; a reverse proxy must preserve its public Host and use manual login rather than present remote traffic as a local caller. The configured token authenticated during the targeted diagnostic; Docker/proxy compatibility remains unverified.
- No comprehensive workbook/chart regression suite, dedicated lint/typecheck setup or CI workflow is defined.
- Live imports, sample workbook contents and Docker build/runtime were not verified. See [Known Issues](KNOWN_ISSUES.md) and [Decisions](DECISIONS.md).
- Steering requires metadata-confirmed direct project relations; unsupported models remain unavailable. No live Progress/WP or budget control verification was possible without a real account. No dedicated lint/typecheck or build command exists for these dependency-free Node/browser modules.

## Project Maturity

A runnable dashboard, authenticated local connector and authentication integration suite are implemented. Production deployment and real-account verification remain unestablished.

## Last Verified

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

- Current refinement completed on 2026-10-09: scoped bar date references now
  intersect selected years with project start/end dates, show the effective
  period, and preserve recorded hours and independent lifetime/monthly scopes.
  Extrai's December 2025 start and empty own 2025 plan were confirmed by guarded
  reads for the configured account. Employee isolation remains implemented.
  All 303 offline tests and desktop/390px fictional browser checks pass.
- Current objective completed locally: user-approved **Mon temps** personal
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
- Local state on 2026-10-09: `codex/mon-temps-macro` at `bf7d5f0`, whose parents
  are `5d5aa26` and `52e377e`. Changes remain uncommitted; nothing
  was pushed. The earlier 24-hour password-login work remains in `stash@{0}`
  (`password-login work before pulling main (2026-10-06)`). Private config is
  untouched, and sessions retain main's eight-hour default.
- Runtime: http://127.0.0.1:8765/ runs the branch as PID 33396 in persistent
  terminal session `25141`. Startup output is in that terminal. Earlier
  background launches were observed stopped; their stop cause is unknown.
  Restart clears existing sessions.
  Isolated synthetic preview processes are no longer running.
- Next action: refresh the dashboard and review the corrected project-date
  reference with real accessible data; further feature priorities await the user's request.
  Changes are uncommitted and no PR was created. Configured-token authentication
  and targeted Extrai budget/date/personal planning reads are verified;
  staffing-assignment, profile-photo access, broader personal/project access and
  deployment remain unverified.
- Blockers: none for local implementation; real Odoo settings and deployment behavior remain verification limits.
