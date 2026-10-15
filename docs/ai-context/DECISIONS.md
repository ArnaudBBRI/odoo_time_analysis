# Decisions

## 2026-10-15: Compare actual project hours with dated planning

- Approved plan: move all supplemental notes below the four macro cards into
  a circled-i popup beside **Convention et planning**, accessible by hover,
  keyboard and click. Keep card captions and project period visible.
- Replace the old note area with two actual-to-date gaps: versus planning due
  through today, using dated slot overlap, and versus convention hours linearly
  interpolated through today. Keep the macro's established BW/TH cohort and
  independence from year filters and the graphs' Ormitter checkbox.
- Only the **Mes heures** actual bar gains orange after its today reference,
  then red beyond the scoped planned total, retaining gradients and adding a
  **Surpointage** callout. Project-wide and lifetime bars keep their visuals.
- Actual history gains a solid red dated-planning series, distinct from the
  existing dotted linear references. New **Projets · 03 / Planning mensuel**
  uses stacked areas across full project dates, including future and TH plans.
  Reuse colors and the shared monthly/cumulative and Ormitter controls; each
  chart has an independent employee/resource filter and accessible details.
- Reuse cached read-only project data. Keep unknown planning distinct from
  zero, signed corrections visible, and dates/identities/animation lifecycles
  scoped correctly to each graph. No Odoo write or new source query is needed.

## 2026-10-15: Warn when personal planning exceeds 100%

- The user adds a second orange state to the percentage card: strictly above
  100%, show **Vous êtes planifié au-delà de 100%. A clarifier avec votre Unit
  Manager**. Keep the existing low warning below 85% and normal note from 85%
  through 100%, including both endpoints.
- Apply only machine-roundoff tolerance. A genuine excess that would round to
  100% displays **> 100 %**. Unknown sources cannot retain overplanning advice.
  This changes presentation thresholds only, without new Odoo reads.

## 2026-10-15: Give planning coverage its own metric card

- The user replaces the inline planning-percentage note with a third matching
  card, **Pourcentage des heures planifiées**, to the right of available and
  planned hours. Its value uses the same large typography as the other cards.
- Below 85%, retain orange emphasis and the supplied French note advising
  checking the low ratio with the Unit Manager. At/above 85%, use the supplied
  explanation that normal planning headroom includes illness absences.
- Keep the existing ratio, scope, threshold tolerance and unavailable states;
  this presentation change does not alter the annual-capacity definition or
  perform additional Odoo queries. Responsive layouts retain readable cards.

## 2026-10-15: Warn on planning coverage below 85% of available work

- Approved: show scoped planned hours divided by available hours as a compact
  percentage in the existing planned-hours card. A planning level below 100%
  is not itself exceptional; warn in orange with explicit text only below 85%.
- Use the same complete scope and existing entitlement-based capacity. Do not
  reduce available hours to a fixed billable target. Preserve signed planning
  and values above 100%; unknown/nonpositive capacity gives no usable rate.
- Compare unrounded rates with only machine-roundoff tolerance; decimal
  formatting cannot suppress real shortfalls or flag mathematically exact 85%.
- The user's Odoo Planning denominator is reproducible by subtracting registered
  personal calendar intervals instead of annual leave entitlements. That is a
  different operational definition; do not switch the dashboard's approved
  annual-capacity policy or infer categories/reasons from calendar intervals.

## 2026-10-14: Make complete planning scope explicit

- The capacity panel compares available hours with all personal planning over
  the complete selected years or custom range, including future allocations
  and hidden projects. The existing calculation already used that scope;
  clarify its caption and retain the established allocation boundaries.
- Rename the first recommendation column **Arrêter (ou clarifier)**, including
  its helper text, without changing recommendation classifications.

## 2026-10-14: Compare personal annual work capacity with total planning

- Approved request: place two compact, scoped available/planned-hour metrics
  between Mon temps recommendations and the pie. Exclude unpaid leave.
- Use the person's attendance calendar and public/collective closures, minus
  approved new annual paid entitlements; ignore requests/consumption balances
  and keep carryover outside this annual-rights definition. The source's
  confirmed annual, compensatory and seniority categories govern this version.
- Attendance already incorporates part-time. Unknown/ambiguous identity or
  source evidence remains unavailable; no payroll/history inference or Odoo
  write is permitted. The currently linked calendar is the schedule basis.
- Missing future calendars reuse current-year net available days/hours, with
  explicit estimates. Missing future rights with a published calendar reuse
  current rights. Denied reads cannot prove missing publication. Custom ranges
  use a disclosed work-hour prorata of annual entitlements, not request dates.
- Total personal planning includes hidden pie projects. Cache annual sources
  by scope/refresh generation, keep optional failures independent of existing
  time charts, and expose an accessible per-year calculation.

## 2026-10-13: Shorten Project Hours macro cards and clarify excess planning

- Request: label positive excess as **planifiées en trop par rapport à la
  convention**, and make the four hours cards 20% shorter.
- Reduce minimum heights and spacing at desktop/tablet/phone breakpoints while
  preserving font sizes and natural expansion for longer notes. Keep the
  established actual-plus-remaining-minus-convention calculation unchanged.

## 2026-10-13: Compact stop recommendations and name their period

- Request: make recommendations more compact, show stop rows as short project
  name plus reason, and include selected years in the linear-planning heading.
- Stop summaries use Projet terminé, Non planifié and Budget BW consommé;
  multiple applicable reasons share one inline row. Detailed evidence remains
  in the native tooltip/accessibility description. Dates, stop classification,
  arithmetic and sorting retain their established contracts.
- The heading updates in place for sorted selected years or French custom-range
  dates. Reduce padding/list spacing while preserving font readability, the
  four/two/one-column layout and native slider focus.

## 2026-10-13: Give stop-booking conditions their own recommendation column

- Request: replace red comments inside Ralentir with a first, red **Arrêter**
  column, also covering projects ended by today and projects whose Buildwise
  personnel-hour allowance is fully consumed. Keep Ralentir, Augmenter and
  Continuer after it, with responsive four/two/one-column presentation.
- Stop priority is exclusive and independent of the tolerance slider. Combine
  all known reasons once per scoped active project: valid project end on or
  before Brussels today, no confirmed positive personal allocation today
  through project end across all accessible years, or exhausted positive
  **Budget personnel BW** convention hours. Current-day planning prevents the
  no-planning reason; uncertain planning does not establish absence.
- Personnel exhaustion means all employees' identified hours from project
  start through today, excluding confirmed Ormitters, compared with the numeric
  convention-hour field. It does not use the user's individual planning,
  selected years, monetary personnel costs or projected future consumption.
  Include post-end charges consistently with the lifetime macro actual card.
- Evidence is an optional session-bound aggregate for exact personally involved
  project IDs. Only positive readable conventions and valid starts trigger
  employee-linked analytic-line reads; typed private/public HR function reads
  exclude Ormitters without guessing. Unknown/malformed/duplicate/denied source
  evidence remains unavailable. Colleague records and identities stay backend
  only; personal records and catalogue membership stay intact.
- Known stop reasons remain useful when interpolation is unavailable: disclose
  the missing pace gap instead of showing zero. Retain known signed gaps and
  show bold reasons without a weekly target or conflicting increase advice.
  Sort known absolute gaps descending, unavailable stop gaps last, then stable
  French title/ID ties. Do not add out-of-scope or zero-activity projects.
- Accessible-record limitations remain explicit; no historical-role inference,
  Odoo write or permission bypass is authorized. This supersedes the previous
  decision to keep stop warnings inside the three tolerance groups.

## 2026-10-13: Distinguish available scoped hours from pace and exhausted planning

- Request: replace the personal bar's ambiguous below-plan badge with French
  available planned hours through the selected period's end, and title the
  recommendations explicitly as linear planning interpolation.
- Personal bar and pie-legend balances remain `scoped planned - scoped actual`;
  their deadline is the inclusive custom end or December 31 of the latest selected year,
  independently of the project's clipped calendar reference. Unknown dates
  stay explicit. Other project/convention comparisons retain their own labels.
- A red, bold stop-booking recommendation requires confirmed readable personal
  planning with no positive allocation from inclusive Brussels today through
  the project end. Inspect all cached personal slots, including unselected
  years, and retain the signed pace gap. This iteration originally kept the
  three tolerance groups; the separate Arrêter column above supersedes that
  grouping decision.
  Current-day allocations prevent the warning; missing/partial/error data and
  uncertain relevant allocations do not establish absence. The advice replaces
  the weekly target so the same row cannot ask both to stop and to increase.
- Source scope is all accessible personal planning returned by the existing
  paginated read-only endpoint; access restrictions remain a completeness limit.
  This local advisory wording does not change source hours or any Odoo data.

## 2026-10-12: Show four project macro cards and material planning gaps

- Request: above Project Hours, show four large cards for convention hours,
  recorded hours since project start, future planned hours with an emphasized
  TH share, and projected convention excess/shortfall. Use the supplied card
  layout as visual guidance, with a responsive four/two/one-column grid.
- Cohort: all macro figures exclude known Ormitters independently of the graph
  checkbox and year/custom scope. Preserve the existing graphs' inclusion and
  date contracts. Unknown functions remain disclosed rather than guessed.
- Actual/future boundary: recorded actuals include project start through
  inclusive Brussels today, including post-end charges because the card says
  since start through today. Future planning begins tomorrow at Brussels
  midnight, clips to Brussels project-start/end calendar dates and uses each
  raw UTC slot's elapsed duration for proration. Today's planning is not added
  on top of today's actuals. DST applies, no final-day UTC tail is counted, and
  a finite closed project has known-zero future hours even if past planning is
  unavailable.
- Projection: `actual + remaining planned (TH included) - convention` assumes
  the remaining plan will be consumed. Show signed excess/shortfall and leave
  unavailable inputs explicit. TH are positions still to fill; keep their hours
  included and highlight the known future share, with partial attribution
  disclosed. The prior visible total/minus-TH metrics are superseded; their
  legacy helper fields remain available without altering source calculations.
- Alerts: retain the calendar-day real-person coverage method from today, but
  alert only on continuous gaps of at least one calendar month. Compare the
  exclusive gap end with the start's clamped next-month anniversary, not a
  fixed 30-day count. Preserve short-gap evidence and avoid describing it as
  complete coverage. One final day such as eXtRAI's May 31 is not an alert.
- Source/interaction: derive the cards locally from the existing cached exact
  project response. Keep native gap/resource details and focus/open state;
  no new endpoint, source query, Odoo write or private-record logging is needed.

## 2026-10-12: Recognize collective TH resources independently of HR links

- Trigger: eXtRAI's missing TH hours came from a collective `TH_` resource that
  Odoo represents with a positive employee link. An empty HR relation is not
  the business criterion for a placeholder and must not gate its recognition.
- Rule: a unique readable exact-ID source resource name with a case-insensitive
  `TH_` prefix and nonempty suffix establishes the collective marker. Keep the
  technical employee link/status in the DTO, but classify the slot as `to-hire`
  before considering its positive employee ID. It cannot prove real-person
  future coverage. Denied/missing/duplicate resource-name evidence leaves the
  business identity unknown, while source hours remain intact.
- Scope: retain exact project/resource reads, signed full-life proration,
  current Ormitter inclusion and confirmed-only subtraction. Add no broad
  fallback, source write or private-record logging. This supersedes the initial
  empty-employee-relation assumption in the planning decision below.
- Presentation: let the Mon temps macro use the available content width.
  Give recommendation categories stronger headings and colored underlines;
  put the largest absolute hour gaps first in Ralentir/Augmenter, with stable
  French short-title/ID ties. Keep natural narrow-screen wrapping and existing
  focus/threshold behavior.

## 2026-10-12: Expose lifetime project planning and confirmed person coverage

- Request: above the project Hours bars, show convention hours, total lifetime
  planning, planning without collective `TH_` resources, convention mismatches
  and future periods with no person planned. Hide the own scoped comparison
  only when both its planned and actual values are confirmed numeric zero.
- Scope: prorate signed source slots over inclusive project dates in UTC,
  independently of year/custom scope. Reuse the existing exact-project read
  and shared Ormitter inclusion choice. Preserve valid source/hour graph values.
- Initial identity rule: snapshot original slot ownership before legacy
  enrichment. The first implementation required both the TH source name and
  a readable empty typed employee relation; linked collective evidence
  disproved that premise, superseded by the TH decision above. The inspected
  singular `resource.resource.employee_id` field is one-to-many to `hr.employee`,
  so technical link cardinality still needs validation. An empty HR search
  cannot establish an unlinked resource.
- Trust: remove only confirmed TH hours and label partial subtraction explicitly.
  Disclose other unlinked resources separately. Missing/invalid planning and
  unavailable identities do not become confirmed zeros; nonpositive readable
  convention hours remain unfilled and produce no comparison delta.
- Coverage: merge positive confirmed-person allocations by Brussels calendar
  day from today/project start through project end. Report inclusive gap dates
  and day counts without inventing a working calendar or overnight gaps. TH
  and confirmed unlinked non-TH resources do not cover person-days. Unknown
  allocations
  that could fill gaps, and relevant negative/null person or unknown corrections,
  make coverage indeterminate; positive coverage alone cannot overrule possible
  cancellations. Ended projects have no future target period.
- Interaction/source: use compact French metrics and native expandable details,
  retaining focus/open state on local inclusion redraws. Optional guarded reads
  use only involved exact IDs and preserve hours on denial. Odoo stays strictly
  read-only; no new write, broad source query or private record logging is added.

## 2026-10-12: Keep French presentation and make hour periods explicit

- Request: use French throughout the dashboard interface, with scoped years or
  custom dates directly in own-hour comparison headings rather than a subtle
  period subtitle. Translate navigation to **Unité DiCo** and responsible-person
  terms; preserve source project/person names and canonical identities.
- Programme catchphrases: display **Structurer**, **Agir** and **Fabriquer** in
  place of the supplied English catchphrases while retaining canonical labels
  and fixed DC mappings. Source business names remain literal.
- Distinct measures: scoped bars retain selected-period totals; employee
  history/reference retains full project life and future planning. Make this
  reference basis explicit in its French labels and provenance. The targeted
  eXtRAI discrepancy was reproduced as a period-basis difference, not a
  calculation error. Do not alter valid values to force both views to agree.

## 2026-10-12: Add personal pace advice with a live tolerance

- Request: three compact columns above the Mon temps pie: orange **Ralentir**,
  green **Augmenter**, black **Continuer**, with 15% default live tolerance.
  Show signed hour gaps and remaining weekly targets on orange/green entries;
  keep Continuer to project names only.
- Baseline: distribute each selected year/custom-year portion's actual scoped
  planning allocation linearly within its project-date intersection, then sum
  expected hours through inclusive Brussels today. Keep actual totals intact,
  including late corrections. The pie's existing calendar ring stays unchanged.
- Targets: compare actual minus expected with the symmetric tolerance band.
  Divide nonnegative remaining scoped hours by selected/project calendar weeks
  strictly after today, excluding gaps. This is pacing against a calendar
  assumption, not measured delivery or working-day capacity.
- Trust: leave unknown or negative net totals, invalid dates, unreconciled
  annual planning and nonzero allocations outside project-date calendar portions
  without quantified advice. Disclose named reasons and future/ended dates;
  never invent a future target after the deadline or a percentage of zero.
- Interaction/source: use all scoped personal projects independently of pie
  hiding. Keep the native slider/focus in place, expose percentage units and
  polite counts, and make exclusion reasons expandable for keyboard/touch.
  Reuse cached personal reads; threshold changes require no Odoo request or write.

## 2026-10-11: Show fixed programme projects with shared lifetime charts

- Request: keep all three DC cards visible, and show the selected programme's
  associated project cards, timeline and monthly simultaneous-project chart
  below them, using the Unit DiCo presentation. Selecting another programme
  changes all lower sections together.
- Membership: use the user's supplied fixed business-code references: 10 DC1,
  8 DC2 and 5 DC3, maintained in `programme-service.js`. Do not infer an Odoo
  programme field, require department 206 or restrict by personal year/activity
  scope. A targeted read confirmed **in-beTwin** as business code `56261849`;
  the other full-list source matches have not been broadly live-verified.
- Identity and coverage: accept only canonical DC IDs at the authenticated
  endpoint. Query fixed codes, require exact unique source-code/record matches,
  and disclose missing, ambiguous or partly unreadable references. Add no
  placeholder projects or broad fallback queries. Optional exact-ID dates,
  budget and manager metadata cannot enlarge membership. Odoo remains read-only.
- Presentation: reuse `UnitDico.render` with programme labels while preserving
  compact project cards, whole-life scale, ended-last grey gradients, today
  line, reveal and monthly maximum-overlap logic. Keep shared pseudo-project
  and chart-only year-2999 exclusions. Programme cards remain above the lower
  content even during existing Hours/Budget project drilldown and Back.
- State: remember separate programme/project selection and per-programme
  caches. Programme changes clear the selected programme project; obsolete
  reads cannot repaint a different programme. Cleanup releases old chart/detail
  lifecycles. This supersedes the initial selection-only iteration below.

## 2026-10-11: Activate an independent three-programme card selector

- Request: make the **Programmes** tab available with three larger radio cards,
  using the same white animated appearance as the redesigned project cards.
  Fronts show the DC code and responsible portrait; backs show the catchphrase,
  DC code, responsible name and italic subtitle.
- Definitions: DC1 / Backbone / To Structure / Pauline Dewez; DC2 / Insight /
  To Act / Timothée Lonfils; DC3 / Manufacturing / To Make / François Denis.
  Keep these fixed identities independent of date filters, accessible projects
  and the older configured steering programme mapping. This activation does
  not confirm or enable that portfolio's source/domain configuration.
- Source: obtain only optional responsible portraits through metadata-confirmed
  fixed exact-name `res.users` reads, requiring a unique normalized identity
  before a separate exact-ID photo read. Preserve approved names and initials
  when identity, permission or image data is unavailable. The authenticated
  catalogue accepts only `{}` and rechecks the session UID; add no Odoo writes.
- Interaction: select only the DC radio in page memory for this iteration;
  programme project drilldown is not yet implemented. Lazy cached portrait
  enrichment, generic retry, obsolete-response rejection and preserved radio
  focus keep the three choices usable while photos load or fail.
- Presentation: use 230px cards in three columns and 210px cards in one column
  at phone/narrow widths up to 700px. Reuse shared card motion, touch and
  reduced-motion behavior through presentation overrides without adding fake
  project date/budget metadata to programme tooltips or descriptions.

## 2026-10-11: Use white animated project cards with manager identity

- Request: restyle both project grids using
  [the supplied visual example](https://uiverse.io/ElSombrero2/tricky-robin-67)
  as inspiration. Keep the manager portrait in place of the example logo and
  the short project title in place of its hover instruction. Implement the
  effect locally rather than copying the example's content.
- Front: use white with black type, the existing portrait/initials chip and
  one bold unbracketed short title. A five-second rotating turquoise `#00bfb6`
  border accent runs while the front is visible.
- Back: keep white with black type; place subtly floating `#00bfb6`, `#0087b7`
  and `#ffce00` color orbs behind a translucent white content panel. Show a mini
  portrait beside the source project number without brackets, followed by the
  short title, manager name and smaller italic full title. Add no green icon.
  Missing manager data is explicit, and a missing project code stays empty.
- Retained behavior: preserve fixed 190px personal cards (180px at phone
  width), 112px Unit cards, ellipsis, source-name parsing/case and safe bounded
  portraits. Keep source dates and full convention budget in the native
  tooltip and single accessible radio description without visible back rows.
  Reuse the existing DTOs; add no source reads or backend changes.
- Input and motion: preserve native radio selection and focus. Hover/focus
  reveals the back and runs its gentle background motion. Touch/no-hover
  layouts show both faces at twice the fixed height; reduced motion removes
  all card animation and the flip transition. This supersedes the earlier
  three-row front and blue metadata-back presentation; earlier dated decisions
  remain historical.

## 2026-10-11: Give project cards equal sizes and structured front titles

- Request: keep equal card sizes in both project grids and separate the acronym,
  project number and full title for readable fronts.
- Naming: parse only the existing `project.name` through shared helpers. Show
  the first nonnumeric bracketed acronym in bold without brackets, a bracketed
  or leading numeric code of at least five digits, and the remaining full title
  in smaller italic text with a two-line ellipsis. Without an acronym, show the
  remaining text in bold and omit its duplicate italic row. Reserve a blank
  number row when no source code exists; never substitute an Odoo record ID.
- Sizes: use fixed 190px personal cards (180px at phone width) and 112px Unit
  cards, with bounded front/back content and ellipsis. Touch/no-hover layouts
  show both faces at twice the corresponding card height.
- Retained behavior: keep the blue flip/back metadata, unbracketed acronym or
  fallback with a separate number row, mini leader portrait or initials, native
  radio selection, complete source-name/date/budget tooltips and source case.
  Reuse existing names and manager metadata without any new Odoo read.
  This supersedes the earlier bracketed-header and minimum-height presentation;
  the earlier decisions below remain historical.

## 2026-10-10: Preserve project identity on flipped cards

- Request: keep the bracketed project shorthand, such as **[Autogrout]**, and a
  mini leader portrait visible on the back of both project grids.
- Display: retain the first bracketed token anywhere in the project name,
  falling back to the complete name. Pair it with the existing manager photo or
  initials above dates and total budget. The Unit back remains compact; narrow
  personal metadata uses horizontal rows.
- Source and input: reuse the existing manager DTO with bounded PNG/JPEG/WebP
  data-URL validation and broken-image initials. Add no Odoo reads and preserve
  native radio identity, selection and its single accessible description.

## 2026-10-10: Add monthly simultaneous-project counts below the Unit calendar

- Request: an area/line chart of simultaneous Unit DiCo projects by month,
  aligned to the lifetime timeline's date scale.
- Measure: the maximum number actually overlapping on any day of each month,
  using inclusive project start/end dates. Distinct non-overlapping projects
  within one month are not counted together. Keep zero-gap and future months.
- Scope: reuse timeline membership, date bounds and Interne/Overhead/year-2999
  exclusions. Only complete coherent dates contribute; disclose omitted dates,
  unavailable scales and periods exceeding 2,400 monthly bins.
- Interaction: retain an integer zero-baseline stepped area, month tooltip,
  keyboard navigation and optional exact-values table. Shared gutters and linked
  horizontal scrolling keep calendars aligned; no extra source read is needed.

## 2026-10-10: Strengthen gradients in both project timelines

- Request: make each duration bar's linear gradient clearly visible.
- Display: share a left-to-right 50% white overlay, unchanged project color at
  the midpoint and 30% black overlay at the end. Completed bars retain their
  grey base. Date geometry, compact sizing and half-second reveal stay intact.

## 2026-10-10: Replace project-grid blur with metadata flip cards

- Request: remove sibling blur in both project radio grids and use a flip
  interaction inspired by [the supplied example](https://uiverse.io/vamsidevendrakumar/soft-shrimp-94).
  Fronts retain the project leader avatar/name; backs show start/end dates and
  total budget on the requested `#4a85b3` background.
- Budget: use the complete `project.project.total_budget_convention` macro
  amount, including personnel, independently of year/custom-date scope and the
  selected Budget panel's personnel choice. Do not sum annual allocations or
  substitute personnel hours. Missing dates/amounts remain unavailable; a known
  amount with unknown currency is disclosed explicitly.
- Input: preserve native radio selection, reveal details on keyboard focus,
  describe metadata through the radio's accessible description, show both faces
  without rotation on touch/no-hover devices, and remove transition for reduced
  motion. Unit cards remain substantially smaller than personal cards.
- Source: add only optional exact-catalogue-ID scalar reads, with fixed unit
  filtering, strict types/currency binding and independent denial recovery.
  This supersedes the earlier hover-blur choice; the lifetime charts stay intact.

## 2026-10-10: Share project lifetime calendars and place completed projects last

- Request: move ended projects to the bottom of the timeline and add the same
  chart below personal Projets radio choices.
- Membership: personal calendar rows use the same year/custom-date activity
  scope as the radio grid, while each duration retains the full project dates.
  Unit DiCo retains its independent responsible-department catalogue.
- Display: reuse one calendar renderer, with ongoing/unknown-end projects
  before projects ending before Brussels today. Preserve start/name/ID ordering
  within each group, compact rows, grey completed bars, the today marker,
  half-second reveal and chart-only year-2999/pseudo-project exclusion.
- Dates: optionally enrich only the personal catalogue's involved project IDs
  with confirmed source dates; inaccessible dates preserve projects and hours.

## 2026-10-10: Compact and animate the Unit DiCo lifetime timeline

- Request: approximately halve timeline row height, reveal each duration bar
  left to right over 0.5 seconds when it reaches the screen, grey projects ending
  before today and add a dotted black vertical today reference across the bars.
- Display: use 25px single-line rows, retaining full project names and exact
  dates in tooltips/accessible labels. Keep the existing project-date axis and
  year-2999 exclusion. Use the current Europe/Brussels day, independently of
  the catalogue read timestamp; projects ending today retain their color.
  If today lies outside the source date scale, disclose that in the caption
  without stretching the axis. Radio tiles retain their current colors.
- Lifecycle: observe each untransformed clickable bar and animate its inner
  fill once per render. Release observers on rerender, tab exit or project-detail
  entry; reduced motion and unavailable observers display complete bars.

## 2026-10-10: Hover blur for both project radio grids

- Request: use the [supplied Uiverse example](https://uiverse.io/kamehame-ha/chilly-snake-91)
  as the interaction reference for personal and Unit DiCo project tiles, while
  preserving their existing colors.
- Display: keep the hovered tile sharp and soften other tiles with a 4px blur
  and 250ms fade. Clear the blur when no tile is hovered, including grid gaps.
  Preserve tile dimensions and current hover colors; no scale effect is added.
- Input: enable only for hover-capable fine pointers, retain a sharp tile for
  visible keyboard focus, and remove the transition for reduced motion. This
  CSS-only refinement leaves selection behavior and source access intact.

## 2026-10-10: Align the convention budget reference with the personnel choice

- Approval: the user requested the French checkbox label **Afficher les coûts
  de personnel BW** and clarified that, while unchecked, the **Budget
  conventionnel** horizontal comparison must also exclude **Frais de personnel**
  allocations. This supersedes the earlier decision below to retain the full
  displayed convention reference when personnel actuals were hidden.
- Reference: use the selected convention's own exact personnel rubric
  allocations, preserving signed values and its confirmed currency. When only
  the project macro is available, deduct its known monetary personnel budget
  from its convention total in the same confirmed currency. Do not substitute
  annual categories, hours-derived rates, another convention or an estimated
  personnel allocation. An unverifiable filtered reference stays unavailable.
- Display: the default comparison, ratio and calculated balance use both the
  personnel-excluded budget reference and existing expense-only consumption.
  Checking the control restores the complete reference and recorded costs.
  Project macro cards and cached source values retain the original information;
  the comparison names its selected personnel basis.
- Boundaries: annual BW personnel exclusions and the independent Ormit supplier
  filter remain unchanged. This refinement reuses cached finance data without
  additional Odoo reads, writes or automatic publication.

## 2026-10-10: Unit DiCo project catalogue and lifetime timeline

- Approval: the user approved **Unit DiCo** as the third sticky tab after
  **Mon temps** and **Projets**, with a compact manager-photo radio grid and
  a colored project-duration timeline. Choosing a project opens the existing
  Hours/Budget detail; Back returns to the unit overview.
- Membership: use the project's **Unit responsable** relation to exactly
  `hr.department` ID `206`, **RESEARCH & DEVELOPMENT / DIGITAL CONSTRUCTION
  UNIT**, as supplied by the user. This catalogue includes accessible archived
  and zero-hour projects and does not require the signed-in person to have hours
  or planning on them. Exclude only the normalized exact **Interne** and
  **Overhead** pseudo-project names; do not substitute employee department
  membership, fuzzy names or the older configurable steering filter.
- Source confirmation: guarded metadata and exact-project reads on 2026-10-10
  confirmed `project.project.lead_unit_id` as a many-to-one `hr.department`
  relation labelled **Lead Unit**, with the user's Extrai example linked to
  department `206`. Use this fixed technical relation for the macro's requested
  **Unit responsable** membership. This does not derive membership from the
  connected person's Lead Unit or enable the older configurable steering view;
  broad catalogue completeness and other accounts' permissions remain unverified.
- Scope: the overview and timeline use full project dates independently of year
  chips or the custom personal range. Scale the horizontal axis from the earliest
  valid start to the latest valid end across included projects. Keep projects
  with missing or invalid dates selectable and disclose them without inventing
  a duration bar. Unit selection/catalogue state remains separate from personal
  project membership.
- Timeline refinement: the user requested removing projects ending in year
  2999 from the horizontal chart. Exclude valid 2999 endings from its rows and
  both axis bounds, while retaining those projects in the radio catalogue and
  existing Hours/Budget navigation. No other ending year is excluded.
- Safety: authenticate catalogue reads with the current session and validate
  responsible-unit metadata before an exact-department project query. Optional
  manager data uses only exact returned project/user IDs. The existing Odoo
  read-only guard, source permissions and private configuration remain intact;
  no automatic commit, push or publication is authorized.

## 2026-10-10: Default budget comparisons exclude BW personnel costs

- Approval: the user's **go** approved excluding BW employee costs from the
  default convention comparison, with **Show BW personnel costs** restoring
  them, and keeping annual comparisons permanently without BW personnel
  categories. Initially the top source convention budget remained unchanged;
  the checkbox changed the displayed consumption basis and rubric visibility.
  The later decision **Align the convention budget reference with the personnel
  choice** supersedes that displayed-reference rule and translates the control.
- Lifetime basis: retain full consumption and add an independently aggregated
  expense-only projection from the same exact-project records. Exclude only
  confirmed employee Hours costs classified as personnel; posted expense costs,
  including Ormit/subcontract invoices with employee or Hours dimensions, remain
  expenses. Recompute compatible currency, exact rubric totals, unassigned costs,
  quality and out-of-period notices for this projection. Never derive it by
  subtracting rounded totals or estimating rates.
- Annual basis: remove only confirmed BW personnel categories from all three
  compared measures and their code bars/details, with an explicit scope note.
  Classify categories by exact normalized source label, including an optional
  displayed code, rather than interpreting account codes as personnel. Preserve
  unknown classification and source net/reconciliation information. The existing
  default-off Ormit supplier-cost exclusion remains independent.
- State and safety: remember the BW choice per project independently of hours,
  year/date, convention selection and Ormit preferences; reuse cached DTOs and
  preserve control focus. No additional RPC reads, Odoo writes, automatic
  commit, push or publication are authorized.

## 2026-10-10: Custom personal date scope and symmetric hour shortfall

- Approval: the user's **go** approved a far-right custom start/end calendar
  control and a **−x h en-dessous du prévu** label against the displayed plan.
  Applying a complete valid range is immediate; incomplete, invalid or reversed
  edits preserve the last valid scope. Clicking a year returns to year mode,
  while an explicit reset restores the remembered year selection.
- Scope: the inclusive Brussels dates apply consistently to Mon temps totals,
  the calendar ring, the personal project grid and the first two selected-project
  comparisons. Actuals remain capped at Brussels today; future planning in the
  selected period remains included. Prorate custom planning by actual elapsed
  time between local midnights, including DST transitions. Preserve the existing
  UTC-year planning calculation when year mode is active.
- Reference: the new shortfall mirrors the existing overrun against the full
  positive displayed planned total, rather than elapsed expectations at today's
  linear tick. Show it in the Mon temps **Mes projets** legend as well as the
  selected-project comparisons. The independent lifetime pair names its
  convention reference.
  Unknown, zero or negative plans cannot create a fictitious shortfall.
- Boundaries: lifetime hours, monthly/cumulative employee history and annual
  budgets retain their independent periods. Reuse cached read-only data; no Odoo
  mutation, automatic commit, push or publication is authorized.

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
