# Known Issues

## Active Issues

- Programme and financing-organism modes have their own physical grouping layouts, but
  named-group convex envelopes remain approximate and can still overlap or
  enclose nonmembers. Unassigned programme/organism projects keep a distinct
  bubble colour and weaker tag-based positioning without a background cloud.
  Current plotted programme memberships remain DC1=7, DC2=7, DC3=5 and
  Other=17. The UI labels contours as indicative and exposes exact member
  counts/names in legend tooltips. Distances and boundaries are presentation,
  not additional tag evidence. Programme membership still reflects curated
  lists rather than an authoritative Odoo field.
- **Partenaires** is temporarily hidden and its source reads are suspended.
  **Organisme** uses current `project.project.organism_id` links and exact
  `res.partner` names fetched with each Unit DiCo catalogue load/refresh. It
  inherits Odoo record visibility and separate-read consistency limits;
  unreadable/incomplete metadata disables only that option. The existing
  browser catalogue cache can retain values until explicit refresh. No fixed
  project-to-financing-body table is used, and no funding type or partner-list
  inference fills missing evidence. Guarded live verification on 2026-10-26
  confirms bodies for all 50 accessible unit projects; seven exact body IDs
  include two separate Bureau de Normalisation records with the same name.
  These retain separate groups rather than merging by name. Other-account
  visibility and broad live browser behavior remain to be reviewed.

- The 2026-10-22 Digital Construction Odoo snapshot has 31 projects without a
  usable macro-info narrative and one very short narrative (eDIH WallonIA Hub,
  76 meaningful characters). On explicit request, public Buildwise evidence
  supplied tags for 18 of these 32 projects, bringing the tagged total to 36.
  Fourteen remain untagged: eight without a verified matching page, four with
  ambiguous identity/phase/year and two with insufficient project specificity.
  The [web-enrichment report](PROJECT_TAG_WEB_ENRICHMENT.md) lists sources and
  remaining gaps; the [original Odoo report](PROJECT_TAG_SCAN.md) retains the
  underlying description findings. Public/local BIMup dates differ and the
  discrepancy is recorded without changing Odoo-derived fields.
  Coverage is the configured account's accessible exact
  unit-206 catalogue, including archived projects; other units are outside this
  scan. Completed missing/short results remain frozen by the user's requested
  policy, so future source edits require an explicit local retagging decision.
  The unit map omits untagged projects and currently uses exact shared canonical
  tags; broader parent/subtype relations (for example ML within AI) are not
  inferred. Synonym canonicalization was manual during the saved scan.

- Purchase Sankey document/schema access is verified with fictional fixtures,
  not live Odoo accounts. It requires readable exact `account.move` document
  types/posting states; missing permission/schema stays unavailable or partial.
  Its supplier-purchase scope starts at the known project start, while the
  existing lifetime bar also retains earlier costs and other expense types.
  Separate source reads and record rules limit completeness. A small minimum
  visible ribbon width preserves tiny allocations; tooltips/tables retain exact
  monetary values. Physical touchscreen behavior remains unverified.

- Work capacity uses the currently linked attendance calendar; denied contract
  history cannot establish employment dates or past/future schedule changes.
  Other-year schedule use is labelled estimated. Future publication is inferred
  from readable collective-calendar rows, not a formal completeness flag.
  Custom-date leave distribution is a prorata estimate without request dates.
- The dashboard's entitlement-based annual capacity can differ from Odoo
  Planning availability after registered personal calendar absences. A targeted
  own-account reconciliation reproduced the reported Planning figure exactly;
  this is a definition difference, not evidence of a fixed billable-hours cap.
  Absence categories/reasons were not inspected or added to the production
  source. Planning coverage intentionally uses the approved annual capacity.
- Annual capacity currently recognizes confirmed Buildwise paid categories
  1/3/17; unpaid/other categories and prior-year carryover are excluded by the
  approved annual-rights policy. Paid accrual grants remain unavailable because
  a full-year entitlement cannot be derived safely from earned-to-date amounts.
  Multiple linked employee identities fail closed until the active identity can
  be established. Broader account/part-time access coverage uses offline fixtures.

- The older DiCo steering portfolio remains disabled until its domain is
  confirmed in `config.local.json`; programme membership and the project-leader
  field still require business verification. This is distinct from the new
  **Unit DiCo** catalogue requested against the user-confirmed responsible
  department `206`, and the new **Programmes** selector with the user's fixed
  10/8/5 project lists. These independent views do not enable the older steering
  configuration or establish an authoritative Odoo programme-membership field.
- Programme membership currently lives in a server-owned hardcoded business-code
  list. Project numbers are resolved from whole bracketed/leading numeric tokens
  in accessible project names/display names; no dedicated source code field was
  inferred. Missing or conflicting references are disclosed and remain excluded.
  Only in-beTwin **56261849** was verified in the targeted live lookup during
  this iteration; other list/portrait access coverage uses synthetic fixtures.
  Responsible portraits require one exact name/unique user identity; missing,
  ambiguous or denied reads retain initials.
- Steering uses metadata-confirmed direct project relations. Analytic-account fallback and task-linked planning are not implemented in the new service; unsupported sections are unavailable rather than queried broadly.
- Live project/Progress/staffing/budget/WP permissions and consistency are not verified. Separate reads are not transactional; source visibility and budget personnel-cost completeness remain limitations. Nonzero annual 9xxx adjustments are displayed but cannot be automatically reconciled.

- The user confirmed the project field as Lead Unit; the browser showed its technical name lead_unit_id. Automatic user-to-unit mapping follows exact UID/user_id and supported unit/department relations, but its full live behavior remains to be verified. Missing or multiple units fail explicitly without a broad project query.

## Fragile Areas

- On Windows, an isolated authentication child fixture can still sporadically
  miss its 15-second startup deadline under a full-suite run. On 2026-10-15,
  the exact failed case and the subsequent unchanged 870-test suite passed;
  production authentication and test timeouts were not changed. Treat repeated
  startup failures as infrastructure evidence to investigate, not as proof of
  an application assertion failure.
- Project-hours coverage remains binary by touched calendar day, not planned-
  hour sufficiency or working-day capacity. Only continuous gaps of at least
  one clamped calendar month are alerted, now with their exact dates. The
  verified eXtRAI gap on May 31, 2028 is suppressed because it is one day.
  The lack of a long-gap alert does not establish staffing capacity adequacy.
- The four macro cards always exclude known Ormitters, independently of the
  graph inclusion checkbox or year/custom scope. Actuals run from project start
  through today, including post-end charges; existing lifetime bars retain
  their project-end cutoff. Remaining planning starts at Brussels tomorrow
  midnight and ends at midnight after the project end. It assumes uniform
  allocation over each UTC slot duration, so it is a projection rather than
  measured future consumption. TH stays included and its remaining portion is
  explicit. Unknown functions retain hours with exclusion-coverage warnings.
  Future coverage is measured by calendar day in Brussels;
  it does not infer an employee work calendar or remove weekends/holidays.
  Only confirmed non-TH person-linked positive allocations cover a day.
  A readable unique TH resource-name marker identifies a collective placeholder
  even when Odoo links it to an employee record. Denied/ambiguous resource names
  preserve hours and disclose uncertain TH identity/person coverage; technical
  employee linkage alone cannot rule out a TH placeholder.
  Future negative/null person or unknown allocations also prevent a confident
  complete-coverage claim, even when positive intervals cover the full period.
  Live metadata confirms `resource.resource.employee_id` is one2many, despite
  its singular technical name. Targeted eXtRAI reads confirm its linked TH
  placeholder, but broad live identity/coverage validation remains unavailable.
  Optional reads and project dates are not transactional.
- Personal recommendation targets use each selected year's prorated planning
  and date-clipped progress independently, with calendar weeks remaining in the
  selected/project interval. They are scheduling guidance under a linear
  assumption, not an inferred working-week capacity. Missing/reversed dates,
  negative nets and inconsistent annual attribution disclose unavailable advice.
  Zero planning with positive actual hours is explicitly outside planning.
  Hiding a pie legend item does not change the underlying recommendation list.
  The exclusive red Arrêter group checks three independent reasons: a known
  project end on/before Brussels today, confirmed absent personal planning from
  inclusive today through project end, or known BW employee actuals reaching a
  positive canonical convention-hours budget. Missing personal pace does not
  discard another confirmed stop reason. Unselected future years and current-day
  planning prevent a false absence claim. Optional consumption is limited to
  readable employee-linked time from project start through today, including
  post-end charges; nonemployee accounting quantities are excluded. Known
  Ormitters are excluded using strict typed current HR functions. Unknown or
  malformed/duplicate evidence leaves consumption unavailable. Odoo record
  visibility, historical function changes and separate read/cache freshness
  remain completeness limits; no real-source validation of this new aggregate
  has been performed in this iteration.
- Catalogue flip-card budgets use optional exact-ID project convention macro
  reads, separately from dates/managers and budget details. Missing/denied
  fields stay unknown; conflicting monetary currency bindings disclose unknown
  currency. New batched budget permission coverage was verified only with
  fictional fixtures, not broadly against live Odoo.
- Personal overview lifetime dates are optional, separately read metadata for
  exact involved IDs. Missing/denied dates retain selectable projects with a
  no-duration notice; live permission coverage for this new batched read has
  not been checked. Neither chart infers missing project endpoints from hours.
- Bill popups show category-allocated posted expense entries, not invoice grand
  totals. Document references alone do not establish invoice type. Optional
  description enrichment is a separate read, so changing source records can
  leave text unavailable; account record rules still limit completeness. Missing
  descriptions preserve known amounts. Unknown suppliers, duplicate category
  periods and reconciliation gaps remain disclosed rather than complete lists.
- Annual Ormit Talent exclusions are checked against readable settlement and
  supplier records, with exact line-period/category/currency reconciliation.
  Filtered commitments remain unavailable when purchase evidence is denied or
  ambiguous, Ormit orders cannot be attributed, or an affected line's outstanding
  commitment differs from billed costs. Separate reads and record rules limit
  completeness. Budget allocations, pending approval and reported Odoo balances
  are deliberately not adjusted by this supplier filter.
- Budget discovery on 2026-10-09: legacy `/api/odoo/project-budgets` infers
  fields/types, drops zero-budget lines with actual consumption, converts signed
  amounts to absolute values and missing measures to zero, adds consumed/ordered/
  pending amounts, and excludes future annual budgets. Do not reuse its totals
  for financial comparisons. The new project-finance service avoids those
  assumptions; the legacy endpoint remains unchanged. The stronger
  steering path still does not expose the confirmed parent workflow `state`.
- Settlements New uses `account.analytic.line`. Exact project analytic-account
  scoping is required: financial entries in the targeted sample lacked a direct
  `project_id`. Deductibility, analytic validation, invoice posting, payment and
  budget workflow states are independent. Invoice totals/residuals can repeat
  across analytic allocations; quantities can be hours or other units.
  Budget achieved consumption is explicitly billed/invoiced and omits existing
  monetary timesheet costs in the targeted sample. Those costs are readable but
  lack explicit convention rubrics. The implemented lifetime total includes
  recorded personnel costs, keeps unmapped rubrics separate and does not infer
  rates or category mappings. Analytic `amount.currency_field` must determine
  currency: the live move-linked `company_currency_id` is empty on time entries.
  Asset/liability/cash/off-balance entries are not expense consumption. Source
  visibility and separate-read consistency still limit business completeness.
- Sessions and login counters are held per Node process. Multi-replica/shared sessions, SSO and two-factor flows are not implemented; real Buildwise password/XML-RPC compatibility remains unverified.
- Compose publishes its port without a loopback-only host binding. HTTPS and SESSION_COOKIE_SECURE=true must be configured for deployment beyond localhost. Behind a proxy, users may share the same rate-limit counter.
- Embedded XLSX parsing depends on pivot structure and browser decompression support. No automated parser regression tests or browser compatibility matrix is defined.
- XML-RPC parsing and planning schema/domain fallbacks are implemented locally, without an automated regression suite.
- Employee searches use ilike; an ambiguous name can combine multiple employees. Use a sufficiently specific name and inspect debug results.

## Resolved In Current Local Changes

- Private config exclusion: .dockerignore now excludes config.local.json; rebuild old images to apply it.
- HTTP access: session authentication now protects the dashboard/APIs, and repository files are no longer served.

## Verification Limits

DiCo steering: 30 combined local tests passed on 2026-10-05, including the existing authentication/Lead Unit suites and 11 new calculation/HTTP tests. Browser verification passed with explicitly labelled fictional fixtures for desktop/mobile navigation, all four project tabs, leader focus, keyboard tabs, filters, refresh and error/retry; no 390px page overflow or JavaScript errors. These checks do not establish live Odoo correctness.

Repository inspection and ten simulated authentication tests were performed on 2026-10-05; welcome-page desktop/mobile layout was checked. Live Odoo access, browser imports, sample workbook contents and Docker image execution were not verified. No GitHub Issue references were supplied for these follow-up items.
