# Decisions

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
