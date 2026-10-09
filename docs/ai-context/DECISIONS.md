# Decisions

## 2026-10-09: Annual category bill drill-down

- Approval: the user's **go** approved bill/entry popups on thin annual code
  bars, a 25% taller plot and another 20% reduction in macro card/metadata
  spacing. Preserve readable typography and the existing annual supplier filter.
- A popup lists signed posted Settlements New expense allocations for the exact
  category, line period and currency. Show the allocated category amount, line
  description and optional supplier/document labels; do not repeat invoice grand
  totals or expose employee timesheet descriptions. Document labels alone do not
  prove an entry is an invoice.
- Budgeted and Engaged clicks show the same billed entries with the selected
  measure separately labelled. Planned allocations and unbilled orders are not
  invented bill records. Gaps and incomplete source/supplier evidence remain
  explicit, and credits remain negative.
- Reuse the authenticated exact-project finance cache for immediate popups.
  Optional description reads are restricted to eligible exact financial IDs and
  isolated from monetary-source failures. Native modal behavior supplies keyboard
  focus containment; close, Escape and backdrop dismissal restore the trigger.
  Panel/project rerenders explicitly release the modal before removing its host.
- No Odoo mutation, publication or automatic commit/push is authorized.

## 2026-10-09: Annual code companions and supplier-cost exclusion

- Approval: the user approved the refinement plan before implementation.
  Each annual Budgeted/Billed/Committed total gets thinner companion bars for
  its own expense categories. Exact category identities and compatible
  currencies govern grouping; colors and ordering stay stable across years.
- The unchecked **Exclude Ormitter costs** choice applies to all annual
  periods of the selected project, independently of hours inclusion and year
  chips. Identify supplier payments through the confirmed **Ormit Talent**
  partner name, with description/financial codes only as corroboration.
  Annual category codes and six-digit financial accounts are distinct;
  never infer their mapping from a prefix or exclude unrelated suppliers.
- Preserve budget allocations, pending approval and source-reported balances.
  Filter billed and committed costs only with exact period/category/currency
  evidence. Reconcile settlements to billed lines first. Committed attribution
  also requires independently readable project purchase evidence; unavailable
  supplier commitments must remain unavailable rather than appear as zero.
- Compact the top summary mainly through spacing, maintaining readable text.
  Annual details omit only lines whose five monetary measures are all known
  zero; retain negative, pending-only and unknown amounts.
- No Odoo mutation, automatic commit, push or publication is authorized.

## 2026-10-09: Separate lifetime and annual project budgets

- Approval: the user's **go** approved the proposed first budget iteration and
  the recommended inclusion of recorded personnel costs in global consumption.
- Interface: Heures/Budget is a top selected-project switch. Budget has its own
  convention macro/lifetime section and all-year annual cards; scoped-year chips
  are hidden there. Multiple convention versions require explicit selection,
  rather than taking the largest or combining versions.
- Lifetime definition: use signed recorded project analytic costs through today,
  combining posted expense types and distinct employee Hours entries whose time
  unit/category and lack of financial-movement linkage are verified. Credits
  reduce costs. Include early/late entries and disclose them. Never add repeated
  invoice totals, payment/balance-sheet movements or billed measures to these
  costs, and never infer a rate from hours.
- Identity and money: exact project analytic-account scoping retains expenses
  lacking direct project IDs. Exact rubric IDs determine matches; unassigned
  personnel costs remain visible without a fabricated personnel-rubric mapping.
  The monetary field's metadata-confirmed currency relation governs its amounts;
  unrelated invoice/move currency fields are not substitutes. Missing binding,
  unreadable amounts or incompatible currencies remain unavailable/partial.
- Annual definition: preserve all accessible periods and source workflow states.
  Compare 6xxx expense budgets, billed consumption and committed amounts;
  disclose 7xxx income, 9xxx adjustments and parent net totals separately.
  Committed already includes billed plus confirmed purchases, so it overlaps
  consumption and is never added to it. Its values may equal billed spending.
- Verification limits: targeted live source checks succeeded for one project;
  available source data does not prove company-wide record-rule completeness.
  D001 remains in force; no Odoo writes or automatic publication are authorized.

## 2026-10-09: Clip scoped bar projections to the project dates

- Request: selecting a project's partial first year must not treat pre-start
  months as elapsed project time. Extrai's confirmed start is 1 December 2025.
- Decision: the first two Projets bar comparisons intersect selected calendar
  years with inclusive project start/end dates for their linear date tick.
  Count eligible Brussels calendar days, exclude unselected gaps, and retain
  zero/full first/last-day anchors. Show the effective reference dates.
- Unknown dates: missing, invalid, reversed or out-of-scope project dates leave
  the reference unavailable; do not silently restore a full-year baseline.
- Hours: retain authoritative selected-year planning and actual records. Adding
  a year with no planning may legitimately leave the planned total unchanged.
  The independent lifetime/monthly views and Mon temps macro retain their scopes.
- Verification: a targeted guarded read-only diagnostic confirmed Extrai's
  project dates and no own planning in 2025 for the configured account, with
  actual work in December. That account was not independently compared with
  the active browser login. No Odoo write or configuration change occurred.

## 2026-10-09: Isolate an employee in the project history graph

- Request: clicking an employee name shows only their actual-hours line in the
  current monthly/cumulative mode and a linear extrapolation of their planned hours.
- Reference: reuse cached raw planning for the exact project/employee, include
  future allocations within inclusive project dates, and prorate intervals
  crossing those boundaries. Spread the resulting signed hours evenly over
  project calendar days, through today; cumulative mode prefixes the reference
  and plateaus at project end. Selected-year chips do not alter this history.
- Identity/completeness: explicit employee IDs outrank resources. Resource-only
  planning needs safe exact ownership; names cannot identify an employee. Missing,
  malformed, ambiguous or unresolved planning remains unavailable instead of a
  guessed zero. An accessible empty plan yields a zero reference.
- Interaction: retain all employee-name buttons for switching. Clicking the
  selected name again or **Tous les employés** restores stacked areas and the
  project total/convention. Selected mode shows only actual/planned lines and
  matching tooltip/table values. Remember selection per project, clear excluded
  or stale identities, replay the one-second reveal and retain keyboard focus.
- Boundary: reuse existing data without another Odoo request or dependency.
  Bars retain their existing scopes. No source write, private-config access,
  commit, push or stash was requested or performed.

## 2026-10-08: Stack employee areas and offer cumulative project history

- Request: replace employee lines with stacked areas, retain the independent
  dotted convention line, and place **Par mois / Cumulé** beside the optional
  Ormitter checkbox. Monthly remains the default; remember the mode by project
  for the current browser session.
- Calculation: cumulative mode prefixes each employee's signed monthly hours,
  the net total and the daily-prorated convention allowance. Actuals continue
  through today; convention accumulation stops at the project end. Existing
  project dates, exact identities, colors and inclusion rules stay authoritative.
- Signed values: stack positive hours above zero and negative corrections below
  it. Keep a thick net-total line and exact details, with a brief correction note
  when the positive boundary differs from the net total.
- Animation: replay the shared one-second reveal on every actual mode or
  inclusion change, including returning to an earlier setting. Year changes,
  resize and unchanged rerenders do not replay. Honor reduced motion and restore
  focus to the control that triggered the update.
- Read boundary: derive all modes locally from cached raw history; no new Odoo
  read, write, private configuration access or dependency is needed. This updates
  the earlier monthly-line presentation and inclusion-animation decision below.

## 2026-10-08: Monthly employee consumption in the project view

- Request: add **Projets · 02 — Évolution mensuelle** below **Projets · 01 —
  Vue d’ensemble**, with one monthly actual-hours line per employee, a thicker
  total and a dotted convention reference. Retain employee colors from the bars.
- Default interpretation: each point is that month's hours, not a running total,
  following the user's explicit per-month request.
- Period: actuals start at the exact project start and stop at inclusive Brussels
  today, independently of selected-year chips. Recorded actuals after the project
  end remain in this start-to-today graph. The convention distributes its precise
  scalar evenly across inclusive project calendar days; each month shows only
  its overlap with that period through today. Current-month actuals and allowance
  are partial. No convention allowance is invented when budget/dates are unknown.
- Identity/population: group by exact employee ID, then resource ID when no
  employee exists. Preserve signed monthly corrections and continuous zero-hour
  months. The graph shares the existing per-project default-off Ormitter choice;
  both synchronized controls update cached data without another request.
- Presentation: reveal all lines together from left to right over one second
  when the graph first becomes visible, respect reduced motion, and avoid replay
  on local year/inclusion changes. Show exact monthly values through accessible
  tooltips and keep readable axes/legend at narrow widths.
- Read boundary: reuse the authenticated full-history response. No new Odoo
  operation, configuration access or dependency installation is needed.

## 2026-10-08: Compare convention and actual hours over project dates

- Context: the user requested a smaller project title, thinner bars and a third
  comparison showing the whole project duration, independent of selected years.
- Convention source: read only metadata-confirmed numeric
  `project.project.budget_staffing_convention_hours` for **Budget personnel BW**.
  The initial French-label lookup missed the real English API label, **Budget
  Staffing Convention (Hours)**. A read-only check of Extrai (code `54252043`,
  project ID `2083`) confirmed the float value `3890.3967484570226`, equivalent
  to `3890:24` when rounded to hours/minutes. Preserve decimal precision for
  calculations; labels, monetary fields and staffing/planning sums cannot
  select a substitute source.
- Period: use exact project `date_start` and `date` boundaries, including both
  endpoint calendar dates. Actual employee hours stop at inclusive Brussels
  today and omit entries outside the project dates. Selected-year controls do
  not alter this comparison. Missing/invalid/reversed dates leave actuals
  unavailable with a date notice rather than inventing an all-history period.
- Display: retain the 75% convention baseline, proportional/capped actuals and
  linear project-calendar tick when the budget is positive. An explicitly empty,
  zero or negative budget replaces the upper bar with a short MIS update message.
  Missing metadata, denied reads and invalid/omitted values show an unavailable
  field message instead. Positive actuals retain a full-width contributor
  distribution explicitly labelled without a convention scale or date tick.
- Population: the existing project-only Ormitter checkbox controls both
  project-wide actual comparisons, while the scalar convention budget stays
  unchanged. Reuse exact employee colors/photos, signed-net handling and
  one-second animation. Scope focus/tooltips to their comparison.
- Read boundary: budget/date enrichment is optional and separated so budget
  denial preserves accessible dates and hours. Preserve all read-only guards,
  session identity, private config and unrelated local changes.

## 2026-10-08: Optional Ormitter hours and employee project contributions

- Context: the user requested optional Ormitter inclusion in the project-wide
  comparison and an actual-hours bar divided by employee.
- Population: retain the unchecked default exclusion. Show the project-only
  checkbox when full-history nonzero actual/planned records or a confirmed
  assignment identifies an Ormitter. Scope its in-memory choice by project ID;
  changing it recalculates cached data without fetching or changing personal
  hours, Mon temps or the legacy inclusion control.
- Assignment evidence: use only metadata-confirmed direct project/employee
  relations in the established `bw.staffing.convention` model and exact-ID
  postfilters. Missing permissions, metadata or functions cannot confirm an
  assignment; disclose incomplete presence checks while preserving hours.
- Contributions: group scoped actuals by exact employee ID, resource ID only
  when no employee ID exists, and a labelled unknown group otherwise. Stable
  unique colors identify employees. Positive net contributions share one
  proportional bar; their rounded two-decimal hours sum exactly to its total.
  Preserve the existing 75% planned scale, 100% actual cap and one-second fill.
- Signed corrections: if any employee has negative net hours, show a neutral
  net actual bar and a signed contributor list that reconciles to the total.
  Do not depict negative contributions as positive surfaces.
- Identity display: show employee photo/name above a segment when space allows
  and keep a matching contributor list for narrow/mobile segments. Read optional
  HR/user photos by exact validated IDs; allow only bounded raster data URLs and
  retain initials when photos are absent. Optional enrichment cannot fail hours.
- Safety: all reads use the signed-in account and existing read-only guard.
  No source write, dependency, private-config access, commit or push is required.

## 2026-10-08: Compare personal and whole-project employee hours

- Context: the user requested the first two graphs in the selected project
  view: personal employee hours followed by all employees aggregated, both
  scoped to the shared selected years.
- Decision: show full-period planned hours above actual hours through inclusive
  today in Europe/Brussels. Planned totals occupy 75% of the available track;
  actual totals share that hour scale and cap at 100%, retaining full signed
  numbers and explicit overrun/cap information.
- Date reference: assume uniform planned consumption across the selected
  calendar years. Position the vertical tick linearly along the planned bar,
  using the same selected-day endpoints/gap handling as the macro, without its
  square-root radial transformation.
- Population: exclude known AI Consultant/AI Consultant Ormit records from
  both comparisons by default; the later project-only checkbox above permits
  explicit inclusion in the whole-project comparison. Preserve unknown-function and
  planning-role fallback policy. Match personal employee IDs exactly, using
  resource IDs only when a record has no employee ID.
- Read boundary: add one authenticated exact-project hours route using existing
  session credentials and read-only RPC protection. Keep Mon temps inclusive
  personal totals unchanged. No private config, Odoo write, dependency,
  commit, push or stash is required by this feature.
- Missing or corrected data: unavailable planning remains null, signed credits
  retain their numeric value, and actual-only zero-plan work is labelled
  Hors planning without a fictitious proportional scale or date tick.

## 2026-10-08: Build the personal Mon temps macro first

- Context: the user approved clear shared French section names and the first
  interactive macro in **Mon temps**, with planned sector shares and actual
  radial filling. Further dashboard redesign is outside this first step.
- Decision: use the authenticated person's exact employee/resource identities,
  independently of Lead Unit project ownership. Keep unit-wide and DiCo
  steering totals separate from personal data.
- Display: a full disk with equal outer radii; planned selected-year hours set
  sector angles, and colored area represents actual/planned consumption through
  inclusive today in Europe/Brussels. Use square-root radii so filled area has
  the correct proportion, with five light-to-dark radial tints.
- Interaction: responsive side legend, stable unique project colors, local
  hide/show with a reformed full circle, hover/focus/tap detail, and an all-hidden
  restore action. Zero/unknown plans, signed credits and overruns remain visible
  numerically; time consumption is not described as delivery progress.
- Scope: shared names are **Vue macro**, **Suivi par projet** and **Fiche projet**.
  Reuse selected-year controls and read-only RPC protection; no dependency,
  private-config change, Odoo write, commit or push is authorized by this feature.
- Scoped list clarification: omit a project when both its selected-year planned
  hours and actual hours through today are zero. Mere zero-hour records or
  future-only actual entries must not keep it in the side list.
- List/date refinement: put positive-planning projects first. Add a thick
  uniform calendar ring across selected years, with exact first-January-1 and
  last-December-31 anchors. Match the actual-fill area scale, count leap days,
  skip unselected gaps and label the reference separately from slot scheduling.
- Approved follow-up: group known unplanned projects with nonzero actual
  hours under **Hors planning**, separated by a horizontal divider, and show
  their signed visible-project actual subtotal. Keep unknown planning distinct.
  Hide **Mon temps 02 / Suivi par projet**.
- Projets follow-up: start with a native-radio project grid using the same
  personal involvement and year scope, independently of macro hide/show and
  DiCo configuration. Show project names and optional manager photos; selecting
  a project opens its name and an intentionally empty view, with a way back.
  Use exact metadata-confirmed manager relations and bounded raster images;
  inaccessible manager data must preserve hours and fall back to initials.

## 2026-10-08: Restore optional local config-token sign-in

- Context: the user requested a **Use config file** welcome-page option after
  merging exact commit `52e377e` into `main`; the earlier 24-hour password-login
  work remains stashed and is not part of this implementation.
- Decision: keep manual email/password login and add an explicit local action
  that authenticates the account named by private config `username` and
  `apiKey` (alias `api_key`). Do not accept caller credentials or target
  overrides on this route. Subsequent reads stay bound to the resulting
  session account and its Odoo permissions.
- Boundary: require a direct loopback socket and loopback Host for configured
  account login. Forwarded headers cannot grant access. Remote/proxy users
  retain the manual flow, avoiding public access to the configured identity.
- Session lifetime: reuse the existing fixed eight-hour default and
  `SESSION_TTL_SECONDS` override; do not reapply the stashed 24-hour design.
- Privacy: a token in `config.local.json` is plaintext. Git/HTTP/Docker
  exclusions do not encrypt it. Never send the token to the browser, responses,
  or logs. Do not read or rewrite the user's private file during development.
- Verification: use only simulated/offline Odoo responses for this change;
  real token validity and account permissions remain unverified. The mandatory
  Odoo read-only policy remains unchanged and no Odoo write is approved.

## 2026-10-05: DiCo project/programme/unit steering

- The user approved the project/programme/unit macro and meta plan, selecting business programmes (not impact pathways), DiCo first and live reads without persisted history. A connected-project-leader shortcut was requested during implementation.
- Keep the existing time/Lead Unit flow and add a separate confirmed DiCo domain. Reuse session credentials and permissions; never use a shared integration identity or write to Odoo.
- Store business programme membership in non-secret local configuration, initially empty. Multiple memberships are excluded from programme sums and preserved once at unit level.
- Share pure calculations between server and browser; keep RPC orchestration server-only. Missing data remain null and unavailable sections do not replace authoritative project totals.
- Use project effective_hours for cumulative actuals. Show visible timesheets separately; Progress and task-aware hours must pass reconciliation before people/WP conclusions are actionable.
- Keep annual/convention periods and currencies separate. Ambiguous multiple parent budgets for the same project/period, unavailable controls and nonzero annual adjustments are excluded from verified financial aggregation.
- Default project leader relation is user_id, validated as a res.users relation; it remains configurable for the actual business schema. Match exact connected UID, not name.
- The supplied historical reliability date 2026-01-01 is unconfirmed for this dashboard and is not applied as a cutoff.
- Real Odoo schema/data verification is pending. No issue, commit, push or PR was requested for this implementation.

## 2026-10-05: Authenticate the dashboard using existing Odoo accounts

- Context: the user requested an email/password welcome page and selected existing Odoo accounts rather than separate dashboard accounts; implementation plan was approved with "go".
- Decision: authenticate through the existing XML-RPC connector using the server-configured instance and database. Bind subsequent connector requests to that user's credentials and Odoo permissions.
- Rationale: reuse the existing account system and avoid maintaining a second user/password store.
- Session design: random HttpOnly/SameSite cookie, fixed eight-hour default expiry, server-memory credential storage, logout and session rotation. Restart clears all sessions; Secure cookies are configurable for external TLS termination.
- Consequences: password-based XML-RPC must be accepted by the actual instance. SSO/MFA and shared sessions across replicas are outside this implementation. The password remains in memory while the session is retained, because subsequent XML-RPC calls require it.
- Visual choice: the user requested the Buildwise website appearance; source styles and official logo are recorded in [Visual Reference](../wiki/BRANDING.md). Proprietary font files are not bundled.
- Related Issue or PR: none supplied or created.

## 2026-10-05: Select projects by the connected person's Lead Unit

- Context: the user clarified that the project field is Lead Unit and it must be that of the connected person; there must be no ownership-field or team selector.
- Decision: fix the project relation to lead_unit_id (confirmed from the live dashboard option), resolve the account/employee by exact UID/user_id, and derive one Lead Unit through direct unit links or the department hierarchy.
- Scope: all accessible projects owned by that unit, including archived/zero-hour projects; actual/planned hours aggregate all contributors. Client overrides cannot select another unit.
- Consequences: missing/multiple units return an explicit error before project querying. No person-name or project-manager fallback is allowed. Real unit membership resolution remains a deployment verification item.

## 2026-10-06: Resolve PR #1 conflicts with main

Preserve authentication and connected-Lead-Unit ownership while integrating main’s budgets, work packages, milestones, scoped hours and strictly read-only RPC boundary. Allow read_group as a read-only aggregate operation required by steering; mutations remain blocked. Unit portfolios start in Whole Project scope and cannot be presented as personal Me data. Detail requests from unit rows use exact project IDs. Local unpublished follow-up changes were not included.

### Decisions carried from main

## D001 - 2026-10-05: Odoo Must Remain Read-Only

- Context: the user explicitly requires that this app never writes anything to
  Odoo and that any necessary write requires explicit approval.
- Decision: apply [PROJECT_RULES.md](PROJECT_RULES.md) to all app code, scripts,
  tests, assistants, tools, and Odoo environments. Keep the outbound RPC boundary
  restricted to the operations already used for reading; reject unknown methods
  before network access. Do not introduce an approval flag or automatic bypass.
- Approval: no Odoo write is approved. A proposed exception needs advance,
  explicit user approval for its operation, environment, and affected records;
  ordinary development approval does not satisfy this requirement.
- Rationale: the dashboard analyzes Odoo data; modifying source records is
  outside its authorized purpose. Offline tests can verify the restriction
  without touching Odoo.
- Consequences: future read methods need review before extending the allowlist;
  write features cannot be implemented or enabled under ordinary task approval.
- Source: user's framework-adoption request in this chat on 2026-10-05.

## D002 - 2026-10-05: Adopt Buildwise Framework 3.0.0

- Decision: install the current upstream framework and initialize its project
  memory and technical wiki for this repository. Keep source-derived facts in
  `docs/wiki/` and user intent/status/decisions in `docs/ai-context/`.
- Rationale: give future sessions durable startup rules and project context.
- Consequences: keep Odoo and Windows constraints in a project-owned policy,
  with explicit startup/governance references and review-template reminders.
  Review managed-file conflicts during future updates to preserve local rules.
- Provenance and update procedure: [FRAMEWORK_ADOPTION.md](FRAMEWORK_ADOPTION.md).
- Source: user's request to apply BW_CODEX_DEV_GUIDE.

## D003 - 2026-10-05: Support Standard-User Windows Operation

- Context: the user has no administrator rights on their Windows PC.
- Decision: use existing runtimes and standard-user commands; any elevated or
  machine-wide operation requires assistance from their IT administrator.
- Consequences: do not suggest elevated shells, service changes, or machine-wide
  installations as routine setup steps.

## D004 - 2026-10-05: Compare Foreseen and Actual Hours Through Today

- Source: user's explicit remaining-hours improvement request.
- Decision: replace the Balance graphic with foreseen (top, light blue) and
  actual (bottom) bars through inclusive today within selected years. Scale each
  pair to its larger amount. Use absolute deviation from foreseen: green up to
  10%, orange above 10% through 25%, red above 25%, including both overruns and
  shortfalls. Keep numeric selected-scope totals and project drilldown.
- Edge cases: actual above zero with zero foreseen is red; both zero values
  show empty bars. Raw API records give date-level actuals and interval-level
  planning. Monthly-only actuals retain the reported current-month total;
  monthly planning uses elapsed calendar days, with a visible fallback note.
- Consequences: retain already-fetched dated records in browser adapters and
  expose them in the Dico read response. No extra Odoo operations or writes are
  needed; D001 remains in force.

## D005 - 2026-10-05: Exclude AI Consultants from Employee Hours Budgets

- Source: user's explicit subcontractor-hours improvement request.
- Decision: treat employees with function `AI Consultant` or `AI Consultant
  Ormit` as subcontractors. Exclude their actual and planned hours across hour
  totals, charts, remaining comparisons, and consumption by default. Provide
  an enabled, unchecked `Include Ormitters hours` option for local inclusion.
- Interpretation: filter planning allocations as well as actuals so employee
  workload comparisons use the same population. Static task foreseen budgets
  and monetary budget records retain their source amounts.
- Classification: exact case/whitespace-normalized function matches using
  current employee job title/job position. Employee IDs determine classification;
  planning resource IDs must be resolved separately. Current HR metadata takes
  precedence over planning role; a planning role is a disclosed fallback.
  Historical roles are unavailable. Unknown functions and metadata-free workbook
  aggregates remain included, with visible notices rather than name guesses.
- Consequences: scoped read-only HR metadata queries and parallel employee-only
  monthly summaries accompany inclusive API responses. Preserve original data
  to toggle without refetching, keep year/project selections, and store manual
  browser overrides separately per inclusion setting. Never restore inclusive
  task consumption after filtering all task-linked records; expose unavailable
  task actuals when subcontractor contributions cannot be assigned to tasks.
- Approval: local implementation and read-only lookups are authorized by this
  feature request. D001 remains in force; no Odoo write is approved.

## D006 - 2026-10-05: Sticky Controls and a Shared Employee Scope

- Source: user's explicit sticky-menu and Me / Whole Project request.
- Decision: keep Ormitters inclusion, year selection, and employee scope in one
  sticky menu. Default to Me and apply its personal population, or the whole
  project population, consistently to relevant actual/planned hour views,
  including the overview, Remaining table, project charts, progress, and exports.
  Selecting Dico changes the overview's project list while retaining this scope.
- Baseline: shared task forecasts/consumption, milestones/deadlines, and monetary
  budgets remain project data in both modes. Missing employee identity or
  insufficient export records use an explicitly disclosed shared baseline.
- Identity: prefer IDs from fetched personal timesheets/planning. Use exact
  resolved employee names only when those records have no IDs; editing the
  search field does not change the fetched identity.
- Consequences: retain source responses and project/year/inclusion selections.
  Read and cache only missing project timesheet/planning responses when Whole
  Project needs a complete overview. Show loading/failure feedback instead of
  labeling personal or partial hours as a whole-project total. Keep manual
  overrides separate by employee/whole-project and subcontractor mode.
- Approval: this local interface/calculation change and its read-only project
  lookups are authorized by the feature request. D001 remains in force.
