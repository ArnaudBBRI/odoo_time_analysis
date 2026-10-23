# API

The local server returns JSON. Dashboard and Odoo routes require a valid
`bw_session` cookie. Unauthenticated protected API requests return 401 with
`authenticationRequired: true`; protected pages redirect to `/login`. The
language-preference GET below is public and does not contact Odoo.

## Authentication

| Method | Route | Behavior |
| --- | --- | --- |
| POST | /api/auth/login | Public. JSON email/password; authenticates through configured Odoo XML-RPC, sets HttpOnly/SameSite=Lax cookie, returns ok, email and expiresAt. |
| POST | /api/auth/login-config | Public local-only action. JSON `{}`; uses private config username/API token, creates the same session and returns ok, email and expiresAt. |
| POST | /api/auth/logout | Removes the current session and clears its cookie; returns ok, including when already signed out. |
| GET | /api/auth/session | Protected. Returns ok, email and expiresAt. |

Login returns 400 for invalid input, 401 for rejected credentials, 429 for rate limiting, 502 for upstream/configuration failure and 503 when session capacity is reached. Origin checks reject cross-site POSTs with 403. Incorrect endpoint methods return 405. See [Configuration](CONFIGURATION.md) for HTTPS, lifetime and limits.

Config login requires both a loopback socket peer and loopback Host. Forwarded
headers do not grant access. It ignores caller credentials, URL and database;
only the private file selects that account and target. Failed config login
returns `{ok: false, code, error}` for these cases:

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `CONFIG_MISSING` | `config.local.json` is absent. |
| 400 | `CONFIG_INVALID` | Unreadable/invalid JSON, missing username/token, or invalid connection settings. |
| 401 | `CONFIG_TOKEN_REJECTED` | Odoo rejected the token; it may be invalid or expired. |
| 403 | `CONFIG_LOCAL_ONLY` | Socket peer or Host is not loopback. |

Other failures reuse generic 429/502/503 responses. The welcome page sends no
credential fields and displays localized French/Dutch messages; it never receives the
configured token. Both login methods retain the fixed eight-hour default and
share rate limiting, capacity, replacement-login rotation, logout and expiry.

## Local language preference

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/preferences/language` | Public. Returns only `{ok: true, language: "fr"\|"nl"}`; absent, invalid or unreadable preferences fall back to French. |
| POST | `/api/preferences/language` | Authenticated, using the existing POST origin guard. Accepts exactly `{language: "fr"\|"nl"}` and returns the saved language. |

Other methods return 405 (`LANGUAGE_METHOD`); unauthenticated writes return 401
(`LANGUAGE_SESSION`), and malformed bodies, extra fields or unsupported values
return 400 (`LANGUAGE_INVALID`). Save failures return a sanitized 503 with
`LANGUAGE_CONFIG_INVALID`, `LANGUAGE_CONFIG_CHANGED` or `LANGUAGE_SAVE_FAILED`.
No response exposes credentials, configuration contents or caller-selected paths.

The fixed local store merges only `language` into `config.local.json`, creating
a language-only object when absent. Existing credential values, aliases and
nested configuration are preserved. Malformed/non-object/unreadable files are
not overwritten; nonregular/symbolic-link targets are rejected. A guarded
temporary-file rename checks for an intervening edit. These operations are
local preference writes, with no token requirement or Odoo call. See
[configuration and deployment limits](CONFIGURATION.md#language-preference).

## Browser chart palette

`GET /chart-palette.js` is an authenticated dashboard asset: anonymous requests
redirect to `/login`. Palette settings use only a validated browser-local
`classic`, `dico-vibes` or `vibrant-emotions` preference; no palette API or server configuration
write is involved.

## Connected person's time

`POST /api/odoo/my-time` accepts JSON `{}` and uses the authenticated session
UID. Caller employee, account, unit and target fields cannot change its scope.
The server resolves exact `user_id` relations on accessible private/public
employee records and their resources, including archived links; an exact
`resource.resource.user_id` relation is a fallback. It reads only those own
timesheets/planning records across accessible projects, including all personal
roles. Optional personnel-budget enrichment separately reads project-wide
employee time for the same involved project IDs and returns aggregate evidence
only. No Lead Unit resolution is required; project membership is derived from
these own records rather than a broad catalogue query.

The successful response contains `ok`, `uid`, `employee: {ids, resourceIds,
name}`, `projects: [{id, name, manager, startDate, endDate, totalBudget, personnelBudget}]`, `timesheets`, `planning` and `planningError`.
Timesheets include raw `lines` (`projectId`, `project`, `date`, `hours`), monthly
summaries, counts and totals. Planning includes raw `slots` (`projectId`,
`project`, UTC `start`/`end`, `hours`) and corresponding summaries. Direct
project relations and `task.project_id` are supported. Duplicate project names
gain an ID suffix consistently in the catalogue and records.

Each project's optional `manager` is `null` or `{id, name, photoDataUrl}`.
Optional `startDate` / `endDate` are strict ISO dates or `null`, sourced only
from metadata-confirmed `project.project.date_start` / `date`. A batched read
uses exact involved IDs with archived projects enabled. Denied combined date
reads retry each confirmed field independently; only requested successful
columns and exact returned IDs are projected. Missing metadata or dates cannot
remove projects or fail their hours/planning response.

The optional personal catalogue `personnelBudget` object contains:

- `status`: `available`, `empty` or `unavailable` for the convention hours.
- `conventionHours`: positive finite source-precision hours or `null`, from
  metadata-confirmed numeric `budget_staffing_convention_hours` only.
- `actualHours`: finite signed project-wide employee hours from project start
  through inclusive Brussels today, excluding known Ormitters, or `null`.
- `actualStatus`: `available` or `unavailable`; unknown is never encoded as zero.

Only involved exact positive project IDs with known positive allowances and
valid starts enter the batched paginated analytic-line read. The domain and
postfilters require employee links, per-project starts and today's upper bound;
post-end charges remain included. Known future starts prove zero consumption.
Strict typed HR job title/job relation reads use exact employee IDs, with private
then public fallback. The explicit normalized full-name exception for Viktor
de Groote also confirms exclusion through `named-override`, using only the
already-read relation label. Unknown classification for other people, duplicate/malformed relevant
records or unavailable source/HR reads keep affected actuals unavailable.
Nonemployee analytic expenses are outside this hours comparison. The backend
retains signed corrections and precision; no colleague rows, names or employee
IDs are added to the response. Missing/nonpositive budgets are empty or unknown
and do not authorize an exhaustion conclusion. This optional evidence is bound
to the existing session account's readable records; failures preserve own
hours, planning and existing catalogue metadata.

Both personal and Unit DiCo catalogue projects also expose optional
`totalBudget: {amount, currencyId, currency}`. Its finite numeric amount comes
only from metadata-confirmed `total_budget_convention` (float/integer/monetary),
including personnel. Currency uses only confirmed `currency_id` related to
`res.currency`; a conflicting monetary `currency_field` leaves currency unknown.
Zeros/signed values retain source precision; missing/invalid/unreadable fields
remain null. Batched reads and independent amount/currency recovery project only
exact catalogue IDs and successful requested columns; Unit DiCo additionally
retains department 206 in the query and postfilter. These are scalar project
macro reads, without annual budgets, expense records or hour-budget substitutes.
Metadata reads are limited to exact involved project IDs and the manager IDs
returned by a metadata-confirmed `project.project.user_id` relation to
`res.users`. Names and `image_128` are optional; only validated bounded
PNG/JPEG/WebP content becomes a data URL, otherwise `photoDataUrl` is `null`.
Missing/denied manager metadata does not fail personal time. The Projets grid
reuses this response; selection loads classified project hours separately.

Unresolved own identity returns 422; unavailable actuals return 502. Planning
failure returns 200 with actuals retained, `planning: null` and a generic
`planningError`. Personal timesheet/planning queries and returned records are
scoped by exact own IDs;
there is no unfiltered fallback. Optional personnel evidence adds only exact
involved-project reads and cannot broaden the catalogue. The browser applies the selected-year and
Brussels today cutoff for the macro; this route retains raw record dates.

## Connected person's work capacity

`POST /api/odoo/my-work-capacity` accepts `{years: [2026, 2027]}`: 1–30 integer
years between 1900 and 2200. A session is required. Invalid input returns 400,
other methods 405, and a changed/invalid reauthenticated UID returns 401 before
any HR reads. Caller employee, resource, calendar and connector overrides are
ignored. The existing exact-UID employee resolution supplies the service scope.

The optional response contains `ok`, `referenceYear`, `status`, `schedule`,
`years` and sanitized warning codes. Schedule includes timezone, daily/weekly
hours, work-time rate, alternating-week mode, current `basisYear` and bounded
attendance intervals. Annual rows contain public-closure intervals, confirmed
paid entitlement days/hours, and separate calendar/entitlement statuses:
`available`, `missing` (unpublished future data), or `unavailable` (denied,
ambiguous or malformed evidence). The current Brussels year is always read as
the future estimate reference. Multiple own HR identities remain unavailable,
preventing double-counted entitlements.

Only `fields_get` and paginated `search_read` are used, through the unchanged
read-only guard. Typed own calendars/resources, compatible company-wide or
calendar-specific global closures (`resource_id = false`, `time_type = leave`)
and approved own allocations are read. No leave requests, consumed/remaining
balances, payroll or mutation/accrual-processing methods are queried. Paid
categories 1/3/17 require their canonical names and absence type to be confirmed;
their exact category lookup uses `lang: en_US`. Unpaid and other categories are
excluded with warnings. Prior-year grants are not new annual rights. Paid
accrual grants cannot establish a complete annual entitlement and remain
unavailable. Missing/denied source components preserve the other components;
the optional endpoint cannot prevent existing personal time from loading.

The browser calculates annual/custom capacity with `WorkCapacity.summarize`;
the route does not accept caller-defined entitlement or part-time values.

## Selected project hours

`POST /api/odoo/project-hours` requires JSON `{projectId: <positive integer>}`.
It resolves the exact accessible project ID, including archived projects, and
the session's exact own employee/resource identity. Caller credentials, target
and employee fields cannot replace that identity. Queries and post-filtering
retain only the selected project's records; there is no project-name or
unfiltered fallback.

One response supplies `ok`, `uid`, `project: {id, name}`, `employee`,
`timesheets`, `planning`, `planningError`, `warnings`, `contributors`,
`hasOrmitters` and `lifetime`. Full-history raw lines/slots retain employee/resource
IDs, `isSubcontractor` and `subcontractorClassification`, alongside monthly
summaries and total hours.
The explicit historical name exception reports `named-override` and sets
`isSubcontractor: true`, preserving genuine `employeeFunction` and source values
or leaving them empty when absent; it does not invent an Odoo function.
These records support both **Mes heures** and **Heures du projet · tous les
employés (hors Ormitters)** locally. The browser excludes known consultants by
default, discloses included unknown functions, and applies selected-year/Brussels-date
calculations; server full-history totals are not the displayed scoped totals.

Planning additionally exposes optional resource identity evidence:

- `planning.resources`: `{id, name, employeeId, linkStatus, isToHire}` records.
  `name` and `employeeId` may be `null`; `linkStatus` is `linked`, `unlinked` or
  `unknown`, and `isToHire` is `true`, `false` or `null`.
- Each raw slot has `planningIdentity: {status, employeeId}`. Status is
  `person`, `to-hire`, `unlinked` or `unknown`; only a confirmed person has a
  positive employee ID. This snapshot precedes legacy employee/function
  enrichment and must govern person/TH coverage even if that later lookup
  populates a resource-only slot's top-level `employeeId`.

`project-planning-service.js` scopes optional reads to the exact project's slot
resource IDs. Approved employee relation names/types, exact resource ownership
and original explicit slot owners establish technical links without matching
person names. A unique readable exact-resource name independently identifies a
collective placeholder through a case-insensitive `TH_` prefix with a nonempty
suffix. `isToHire: true` and a `to-hire` slot snapshot take precedence over a
positive employee link; the technical DTO link is retained. Missing/denied or
duplicate resource-name evidence leaves resource-linked slot attribution unknown.
On the inspected schema, `resource.resource.employee_id` is one-to-many to
`hr.employee`; an empty typed list proves no technical linked employee, one
unique ID can prove an owner, and multiple/malformed/conflicting IDs remain
unknown. Optional names and links recover independently; an unreadable HR link
does not discard a verified TH marker. An empty employee search alone cannot
prove an unlinked resource. Source denials preserve planning amounts; explicit
employee evidence with no source resource remains usable. No broad fallback query or
Odoo write is added. These fields support local full-life planning/TH metrics
and calendar-day coverage without a separate planning-information endpoint.
The whole-service failure fallback follows the same rule: resource-linked slot
identities stay unknown, while valid resource-free explicit person IDs survive.

Each contributor has `employeeId`, `resourceIds`, `name`, `photoDataUrl` and
`isSubcontractor`. Optional names/photos are read only for exact IDs found in
project records or confirmed assignments, using `hr.employee` / `hr.employee.public`
and a metadata-confirmed `res.users` photo fallback. Photos are bounded,
validated raster data URLs or `null`; remote URLs and SVG are rejected.
Denied optional profile reads retain hours and initials/name fallbacks.
Invented contributor names additionally carry `nameMessageKey` equal to
`identity.employee` or `identity.employeeUnknown`; invented selected-project
names use `identity.project`. Own line/slot `projectNameMessageKey` provenance
reaches the personal catalogue's `projects[].nameMessageKey`. These optional
presentation markers preserve raw names, exact numeric identities and amounts;
they do not authorize translating real source names or add source reads.

`hasOrmitters` is true for a classified nonzero actual/planned record anywhere
in project history, or a classified assignment through metadata-confirmed
`bw.staffing.convention.project_id` / `employee_id` relations. Assignment reads
use and post-filter the exact project ID, including archived records. Missing
assignment/function permissions produce warnings and do not invent presence.
Assignments alone do not add hours. This flag exposes an unchecked project-only
inclusion checkbox; checking it locally includes Ormitter planned/actual records
in the selected-year project pair and lifetime actual records in the convention
pair, without changing the personal comparison or making another request. Contributor
actuals are grouped and rendered locally as positive stacks or a signed net
breakdown when negative corrections exist.

The browser also derives the four **Convention et planning** macro cards from
this same cached response: convention, recorded actuals since project start
through today, future planning with TH included, and projected excess/shortfall.
Those derived cards exclude known Ormitters independently of the graph checkbox
and selected years/dates. Their Brussels tomorrow-to-project-end planning and
calendar-month gap logic are client calculations, not new API response fields
or a separate source request. See [project macro measures](DOMAIN.md).

`lifetime` contains `{conventionHours, conventionField, conventionStatus,
startDate, endDate}`. The server uses only the confirmed technical field
`project.project.budget_staffing_convention_hours`, with `float` or `integer`
metadata. Its API label can be **Budget Staffing Convention (Hours)**; English,
translated or similarly named labels do not affect field selection. Other
fields, monetary values and staffing/planning totals are not substitutes.
`conventionField` is that technical name when its type is supported, otherwise
`null`. `conventionHours` retains the finite decimal-hour scalar without server
rounding or parsing Odoo's displayed `HH:MM` text.

`conventionStatus` is `available` for a positive value, `empty` for a readable
blank/false/null/nonpositive value, or `unavailable` for missing/incompatible
metadata, denied/missing fields or invalid values. Numeric zero remains zero in
`conventionHours`; absent/unreadable/invalid values remain `null`. The browser
passes this status as `budgetStatus`: empty values use the MIS field-update
message, while unavailable values say the field cannot be read in Odoo.

Project dates come from metadata-confirmed `date_start` / `date` fields of type
`date` or `datetime`, normalized to `YYYY-MM-DD` or `null`. Budget and dates use
independent optional exact-ID reads, so budget denial does not discard readable
dates or required hours. The browser derives convention actuals by clipping raw
records inclusively to these project dates and Brussels today, independently of
selected years. Invalid/missing/reversed dates leave those actuals unavailable.
Only positive convention hours establish a comparison scale; missing/nonpositive
hours instead show the status-specific message and a labelled actual distribution without
a convention scale or date tick. This metadata is supplied by the same request.

Invalid project IDs return 400 before an upstream call; no accessible exact-ID
project result returns 404, unresolved own identity 422, and unavailable project or
actual reads 502. Planning failure returns 200 with actuals retained,
`planning: null` and a generic `planningError`. Authentication/origin/method
guards are shared with other protected routes. The browser caches the response
by project ID; years and inclusion recalculate locally, while refresh/retry can
reload it.

## Unité DiCo projects

`POST /api/odoo/unit-dico-projects` uses JSON `{}` and the authenticated session
identity. Caller credentials, department IDs, project fields, domains and date
filters cannot change its fixed catalogue. It first requires
`project.project.lead_unit_id` metadata to be a many-to-one relation to
`hr.department`, then queries exactly `lead_unit_id = 206` with
`active_test: false`. Translated labels and similarly named fields are not
substitutes. The server postfilters returned rows by that exact department and
positive project ID, deduplicates IDs and excludes normalized exact Interne /
Overhead names, including a displayed numeric-code prefix.

The successful response is `{ok, unit, responsibleField, projects, warnings,
asOf, tagMap, programmeMap}`. `unit` contains the fixed ID `206` and **RESEARCH & DEVELOPMENT / DIGITAL
CONSTRUCTION UNIT**; `responsibleField` is `lead_unit_id`. Each project has
`{id, name, startDate, endDate, manager, totalBudget}`. Accessible archived and zero-hour
projects remain included without employee-membership or year/date restrictions.
Dates use only metadata-confirmed `date_start` / `date` fields and become
`YYYY-MM-DD` or `null`. Optional field denial retains readable core identities
and recovers each date independently with exact catalogue IDs and the same unit
domain; missing, invalid and reversed periods produce warnings rather than
invented dates. A verified empty source returns an empty project array.

`tagMap` is an optional local-snapshot projection with
`{status, scannedAt, tagDefinitions, projects}`. Its `projects` contain only
`{id, tags}` for completed nonempty saved tag sets intersecting the exact current
unit catalogue, after checking the configured Odoo base URL/database namespace.
Definitions contain only used canonical IDs with `{fr, nl}` labels. No saved
project names/codes, other IDs, descriptions, hashes, source URLs or version
metadata are exposed. Missing, invalid or mismatched local data yields
`status: "unavailable"` with empty arrays/definitions, preserving the main
catalogue. A valid empty intersection remains `available`. This adds no Odoo
reads; the complete `data/project-tags.json` remains outside static routes.
`/project-similarity.js` and `.css` are authenticated static renderer assets.

`programmeMap` is an optional pure projection of the existing curated programme
lists onto this session's accessible unit projects:
`{status: "available", programmes: [{id, code, subtitle, projectIds}]}`. The three
DC1/DC2/DC3 rows carry sorted exact matched IDs, using the same whole business-code
and ambiguity exclusions as the programme view. Missing/hidden references and
their source names/codes are not returned; an ID can belong to multiple lists.
Caller-supplied maps/IDs do not alter the result. Projection failures yield
`{status: "unavailable", programmes: []}` without discarding projects or tags.
No additional Odoo request is made.

Optional manager enrichment reuses the exact project/user-ID metadata and bounded
raster-photo checks described for personal projects. Unavailable manager data
keeps the project and yields initials fallbacks. Catalogue reads do not fetch
project hours or finances; selecting a project separately reuses the existing
exact-project detail routes.

Anonymous calls return 401, unsupported methods 405, invalid JSON 400 and
critical metadata/catalogue failures a sanitized 502. Authentication/origin
guards and the read-only RPC allowlist remain shared. The service is independent
of the connected-person Lead Unit portfolio and disabled configurable DiCo
steering; source record rules still govern accessible membership.

## Fixed programme catalogue

`POST /api/odoo/programmes-catalogue` requires an authenticated session and
exactly JSON `{}`. It rejects additional fields or non-object input with 400
before RPC, including caller names, models, credentials, domains and date scope.
The session account is reauthenticated; a changed/rejected UID returns 401
before any user metadata or portrait read. Standard method/origin guards return
405/403, and authentication/transport faults have sanitized responses.

The successful response is `{ok: true, programmes: [...]}` with exactly these
fixed rows:

| id / code / name | subtitle | catchphrase | manager.name |
| --- | --- | --- | --- |
| DC1 | Backbone | To Structure | Pauline Dewez |
| DC2 | Insight | To Act | Timothée Lonfils |
| DC3 | Manufacturing | To Make | François Denis |

Each `manager` also contains `id` (positive integer or `null`) and
`photoDataUrl` (bounded validated PNG/JPEG/WebP data URL or `null`). Optional
enrichment confirms `res.users.id`/`name` metadata, queries fixed whole-name
`=ilike` variants in normal/reversed order with accent folding and archived
users enabled, then requires a unique exact normalized identity. A separate
photo query uses only resolved user IDs and confirmed binary `image_128`, with
exact-ID/name/duplicate checks before safe decoding. Ambiguous names, denied
metadata or unavailable images retain all three definitions and initials;
optional-source failures return a successful fixed catalogue. Record rules
remain those of the current session. No project, employee, planning or financial
records are queried, and legacy steering configuration/year scope do not affect
these definitions. Unexpected endpoint failures outside optional portrait
enrichment return a generic 502 rather than raw source faults.

## Selected programme projects

`POST /api/odoo/programme-projects` requires an authenticated session and exactly
`{"programmeId":"DC1"}`, `DC2` or `DC3`. Missing/unknown/case-changed identities,
non-object input and extra fields return 400 before RPC. Standard method/origin
guards apply. The session account is reauthenticated with the same UID required
before project reads; rejected/mismatched identity returns 401.

The dashboard's fixed source references contain 10 DC1, 8 DC2 and 5 DC3
eight-digit business codes. Confirmed `project.project.id`/`name` metadata and
optional `display_name` allow only bounded code-lookup OR domains. Returned
bracketed or leading codes must match exactly and uniquely; incidental numeric
substrings, contradictory identities and multiple records are excluded. These
memberships do not come from a source programme field, department, personal
hours or year/date filter. Archived records remain readable under account rules.

The successful response contains:

- `ok`, canonical `programme` definition and `asOf` timestamp;
- `projects: [{id, name, startDate, endDate, manager, totalBudget}]`, with the
  same optional exact-ID date/manager/full-convention-budget rules as the other
  catalogues;
- `coverage: {expected, matched, missing, ambiguous, lookupComplete}`; missing
  and ambiguous entries contain the fixed `{code, name}` source references;
- `warnings`, including unreadable lookups, unresolved references and invalid
  source dates.

Confirmed dates use exact matched IDs with independent optional recovery;
currency/budget and managers retain existing safe metadata/photo behavior.
Missing/ambiguous projects are disclosed without fabricated rows. A readable
empty catalogue returns 200 with coverage; unavailable core metadata or all
failed lookups return a generic 502. No hours, planning or financial-detail
records are loaded by this route. Selecting a returned project uses the
existing exact-project detail APIs.

## Project finance

`POST /api/odoo/project-finance` accepts JSON `{ "projectId": 123 }` with a
positive integer ID and uses the authenticated session's Odoo identity. Caller
credential, schema, domain and year overrides are not consumed. It returns:

- `project`: exact ID/name and optional start/end dates; `asOf`: read timestamp;
- `macro`: convention total, personnel money/hours, maximum funding,
  funding type/body, external reference and currency;
- `conventions`: each source budget's ID/name/period, raw workflow code and
  metadata label, currency, totals, exact-ID rubric lines and reconciliation;
- `annual`: all annual source parents, including future years and versions,
  expense totals, separate income/adjustments, parent net, lines and quality;
  `ormitterExclusion` contains independently verified filtered billed/committed
  totals and exact line-ID replacements, the excluded billed amount, status and
  warnings. It does not replace the original source budget. Each expense line
  also has `billDetails`: `status` (`reconciled`, `partial`, `unavailable`),
  `sourceConsumed`, `visibleConsumed`, signed `gap`, `warnings` and `items`.
  Items contain analytic-entry `id`, `date`, optional `description`, signed
  category-allocated `consumed`, `currencyId`/`currency`, optional
  `documentLabel`/`supplierLabel` and verified `isOrmitTalent` (true/false/null);
- `lifetime`: posted expense costs plus recorded monetary hour costs through
  Brussels today, source status/currency, expense/personnel components, exact
  convention-rubric breakdown, unmapped costs, zero-valued hours count and
  before-start/after-end diagnostics;
- `purchases`: an independent supplier-invoice/credit-note projection with
  `status` (`available`, `partial`, `unavailable`), exact project `startDate`,
  Brussels-today `endDate`, machine-readable `issues` and `items`. Each item
  contains analytic allocation `id`, `date`, signed `consumed`, verified
  `currencyId`/`currency`, convention `categoryId`/`category`, internal
  `codeCategoryId`/`codeCategory`/four-digit `code`, optional `description`,
  `supplierLabel`/`documentLabel`, and confirmed `documentType`
  (`in_invoice` or `in_refund`). Unknown measures remain null;
- source `warnings`, without credentials, personnel descriptions or raw
  accounting-document/employee payloads.

The fixed-source service reads metadata-confirmed `project.project`,
`budget.analytic`, referenced `budget.line`, scoped `account.analytic.line` and
optional hour-unit metadata through the existing guard. Annual exclusion also
reads exact referenced `res.partner` identities/commercial parents and confirmed
`purchase.order.line` records scoped by the exact project analytic account.
Financial reads use the
exact project analytic account and refuse shared accounts rather than reporting
another project's costs. The analytic `amount` uses only the exact currency
relation named by that monetary field's `currency_field` metadata. A missing,
unsupported or unreadable binding leaves currency unavailable; an unrelated
transaction/accounting-document currency is not a substitute. No exchange-rate
conversion is performed.

Annual expense totals use 6xxx categories; 7xxx income and 9xxx adjustments stay
separate. Convention rubrics use `x_plan7_id`; annual categories use
`x_plan8_id`. Budget measures preserve sign and missing-versus-zero semantics.
`committed_amount` and `achieved_amount` remain separate overlapping measures,
never a summed consumption estimate. Lifetime costs use negative analytic
`amount` for posted expense types and confirmed monetary hour entries; no hourly
rate is estimated. Costs outside project dates remain included and disclosed.
Partial/unknown sources and incompatible currencies do not become invented zeros.

Ormit Talent is matched by canonical supplier name. Annual exclusion uses the
line's confirmed dates, exact `x_plan8_id` and monetary currency binding, after
settlements reconcile to billed amounts. Descriptions and financial-account
prefixes do not establish supplier identity. Verified absence of accessible Ormit
purchase orders and equality of an affected line's billed/committed measures
permit subtracting its attributed billed costs from committed costs. Unknown
suppliers, ambiguous periods/categories, unreconciled amounts or unexplained
outstanding supplier commitments remain unavailable. Record rules still apply;
these reads cannot prove completeness beyond the connected account's visibility.
Budget allocations, pending approvals and reported balances are unchanged.

Bill items use the same exact child period/category/monetary-currency evidence,
restricted to posted expense allocations. They contain allocated analytic
amounts rather than invoice grand totals; document labels alone do not prove
invoice type. Optional metadata-confirmed `account.analytic.line.name` enrichment
reads only eligible exact financial IDs and rechecks scope/status/currency.
Description failures leave known monetary totals intact. Personnel hour rows,
payments and balance-sheet entries do not enter bill lists. The renderer groups
and deduplicates exact entry IDs, applies the existing supplier filter locally
and discloses overlaps, unknown suppliers and reconciliation gaps. Popups use
the existing cached response; no bill-specific route or source action exists.

Invalid JSON/IDs return 400 before source reads, anonymous calls return 401,
unsupported methods return 405, inaccessible exact projects return 404 and
critical source failures return a sanitized 502. Optional source failures can
return 200 with explicit unavailable/partial sections. Budget controls and
selected years reuse the exact-project browser cache; refresh/retry invalidate
it separately from the hours cache.

Purchase eligibility additionally verifies the exact referenced `account.move`
IDs through metadata-confirmed `state` and `move_type` fields. Only posted
supplier invoices and credit notes qualify, from the known project start through
inclusive Brussels today, including post-project-end charges. Missing document
permission/schema or start dates cannot produce a complete zero. Exact analytic
IDs deduplicate allocations, and conflicting snapshots are excluded with a
partial-source issue. Optional descriptions are read only for confirmed purchase
IDs and checked again against project/account, amount, currency, document and
both category dimensions. The projection never uses invoice grand totals,
employee time descriptions, unbilled orders or estimated rates. Its scope can
differ from `lifetime`, which retains before-start costs and other expense types.
The server-only `project-purchase-service.js` is not served as a frontend asset.

## Connected Lead Unit portfolio

- POST /api/odoo/my-lead-unit: resolves the session user's unit and returns leadUnit id/name.
- POST /api/odoo/team-projects: automatically uses the same connected unit and project.project.lead_unit_id, returning its projects and actual/planned summaries. No query inputs are required; caller teamId/ownerField values are ignored.
- Previous project-owner-fields and owner-teams discovery/list endpoints are removed.

The user is read by exact UID, or through hr.employee/hr.employee.public user_id. Direct Lead Unit/Unit relations take priority; department membership can resolve through a unit relation, is_unit flag or parent department named as a Unit. Failure or multiple distinct units returns 422 before any project query. Projects include accessible archived and zero-hour entries, and no-project results make no timesheet/planning query. Queries scope all contributor records by exact project IDs.

Direct planning project relations and task.project_id are supported. Unsupported planning returns null with planningError and no unfiltered fallback. Existing employee/project connector endpoints remain available for compatibility.

## Dashboard connector

| Method | Route | Query inputs and successful response |
| --- | --- | --- |
| GET | /api/config | Public session connector fields, hasConfig, authenticated and hasApiKey: false; no credential secret. |
| POST | /api/odoo/test-connection | Uses session identity; returns uid and optional serverVersion. |
| POST | /api/odoo/list-databases | Uses session instance URL; returns sorted databases, if Odoo permits listing. |
| POST | /api/odoo/employee-timesheets | employeeName; normalized lines, monthly project totals, lineCount, totalHours, domain and warnings. |
| POST | /api/odoo/employee-planning | employeeName; normalized slots, monthly project totals, slotCount, totalHours, fields, domain and warnings. |
| POST | /api/odoo/project-timesheets | projectCode; project identity, normalized lines, monthly employee totals, counts, hours, domain and warnings. |
| POST | /api/odoo/project-planning | projectCode; project identity, normalized slots, monthly employee totals, counts, hours, fields, domain and warnings. |

Session URL, database, username and credential override any caller-supplied authentication fields and private config credentials. The session credential is preserved exactly through subsequent reads. Invalid query settings/JSON return 400. Rejected Odoo query authentication returns 401; employee fallback lookup can return 404; unexpected database-list structure returns 502. Unhandled errors return 500. JSON bodies are limited to 64 KiB; oversized connections are destroyed.

Odoo calls use /xmlrpc/2/common, /xmlrpc/2/db and /xmlrpc/2/object. Read operations use fields_get and search_read, with default 1,000-record pages. No Odoo write operations are implemented.
XML-RPC transport rejects redirects rather than forwarding credentials to a
redirect target.

## DiCo steering API

Three authenticated POST routes are available under `/api/odoo/pilotage/`: `metadata`, `portfolio`, and `project` (positive integer `projectId`). Reads are scoped to the server-confirmed DiCo domain and session permissions, with per-source availability and reconciliation states. See [route contracts and measures](PILOTAGE.md). Authenticated browser assets `/steering.js`, `/steering-client.js`, and `/steering-client.css` are served; `/steering-service.js` is not.

## Application pages and files

- /, /login and /login.html serve the public welcome page, or redirect signed-in users to /dashboard.
- /dashboard and /index.html serve the protected dashboard.
- /assets/buildwise-logo.svg is public; /favicon.ico returns 204.
- `/i18n.js`, the explicit `/i18n-*-messages.js` catalogues and
  `/language-client.js` are public application assets used by login and the
  dashboard; this is a fixed allowlist, not a general source-file route.
- /personal-time.js, /personal-time.css, /project-card.js, /project-card.css, /project-monthly.js, /project-planning.js, /project-browser.js, /project-browser.css, /project-budget.js, /project-budget.css, /unit-dico.js, /unit-dico.css, /programme-browser.js and /programme-browser.css are authenticated dashboard assets. The server-side /project-planning-service.js, /project-finance-service.js, /unit-dico-service.js and /programme-service.js are not served.
- Other files/routes return 404 after login. Anonymous non-API requests redirect to /login.
- Responses use no-store, nosniff, same-origin referrer policy and a CSP blocking framing and off-origin connections. Inline scripts/styles remain allowed for the current single-file pages.

## Refresh

- Last refreshed: 2026-10-21
- Purchase source basis: project-purchase-service.js, project-purchase-flow.js/css,
  project-finance-service.js, project-budget.js, project-browser.js,
  tests/project-purchase-flow.test.js and finance/budget/project integration tests.
- Additional source basis: language-preferences.js, language-client.js, i18n.js,
  i18n-*-messages.js and tests/language-preferences-http.test.js.
- Source basis: server.js, project-planning-service.js, project-planning.js, tests/project-planning-service.test.js, tests/project-planning-http.test.js, programme-service.js, programme-browser.js, tests/programme-service.test.js, tests/programme-http.test.js, unit-dico-service.js, unit-dico.js, project-finance-service.js, login.html, index.html/steering-client.js browser callers, personal-time.js, project-browser.js, project-budget.js, tests/personal-personnel-budget.test.js, tests/personal-recommendations.test.js and tests/auth.test.js.
- Limitations: automated integration tests use simulated Odoo; broad account/schema compatibility is not established.

## APIs retained from main

`POST /api/odoo/project-milestones` also feeds the shared project-hours area
charts. The exact `projectId` path uses only metadata-confirmed `project_id` or
`project_ids` relations, unions and deduplicates their results, and postfilters
returned rows to that project. It has no name/code fallback. `available: true`
with an empty `milestones` array is a confirmed empty result; unreadable model/
relations or any failed relation read produce unavailable evidence. Milestone
reads remain authenticated, session-scoped, archived-safe and read-only.
Scheduled milestone dates use the explicit deadline/target/due/milestone/date
fields or metadata with milestone/deadline/target/due semantics. Creation,
modification and last-update timestamps cannot supply a milestone date.

Authenticated POST routes /api/odoo/project-workpackages, /api/odoo/project-milestones and /api/odoo/project-budgets return task/WP, milestone and financial details. Unit-row detail calls pass projectId (a positive integer), resolved against project.project.id including archived records; missing IDs fail without a name-search fallback. Existing projectCode lookups remain available for legacy callers. /api/odoo/dico-projects retains the legacy fixed-unit API. The RPC boundary accepts only common.authenticate/version, db.list and object fields_get/search_read/read_group; mutations and unknown operations are blocked before network access.
