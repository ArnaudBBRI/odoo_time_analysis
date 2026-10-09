# API

The local server returns JSON. All dashboard and Odoo routes require a valid bw_session cookie. Unauthenticated API requests return 401 with authenticationRequired: true; protected page requests redirect to /login.

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
credential fields and displays compact French messages; it never receives the
configured token. Both login methods retain the fixed eight-hour default and
share rate limiting, capacity, replacement-login rotation, logout and expiry.

## Connected person's time

`POST /api/odoo/my-time` accepts JSON `{}` and uses the authenticated session
UID. Caller employee, account, unit and target fields cannot change its scope.
The server resolves exact `user_id` relations on accessible private/public
employee records and their resources, including archived links; an exact
`resource.resource.user_id` relation is a fallback. It reads only those own
timesheets/planning records across accessible projects, including all personal
roles. No Lead Unit resolution is required; project membership is derived from
these own records rather than a broad catalogue query.

The successful response contains `ok`, `uid`, `employee: {ids, resourceIds,
name}`, `projects: [{id, name, manager}]`, `timesheets`, `planning` and `planningError`.
Timesheets include raw `lines` (`projectId`, `project`, `date`, `hours`), monthly
summaries, counts and totals. Planning includes raw `slots` (`projectId`,
`project`, UTC `start`/`end`, `hours`) and corresponding summaries. Direct
project relations and `task.project_id` are supported. Duplicate project names
gain an ID suffix consistently in the catalogue and records.

Each project's optional `manager` is `null` or `{id, name, photoDataUrl}`.
Metadata reads are limited to exact involved project IDs and the manager IDs
returned by a metadata-confirmed `project.project.user_id` relation to
`res.users`. Names and `image_128` are optional; only validated bounded
PNG/JPEG/WebP content becomes a data URL, otherwise `photoDataUrl` is `null`.
Missing/denied manager metadata does not fail personal time. The Projets grid
reuses this response; selection loads classified project hours separately.

Unresolved own identity returns 422; unavailable actuals return 502. Planning
failure returns 200 with actuals retained, `planning: null` and a generic
`planningError`. Queries and returned records are scoped by exact own IDs;
there is no unfiltered fallback. The browser applies the selected-year and
Brussels today cutoff for the macro; this route retains raw record dates.

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
These records support both **Mes heures** and **Heures du projet · tous les
employés (hors Ormitters)** locally. The browser excludes known consultants by
default, discloses included unknown functions, and applies selected-year/Brussels-date
calculations; server full-history totals are not the displayed scoped totals.

Each contributor has `employeeId`, `resourceIds`, `name`, `photoDataUrl` and
`isSubcontractor`. Optional names/photos are read only for exact IDs found in
project records or confirmed assignments, using `hr.employee` / `hr.employee.public`
and a metadata-confirmed `res.users` photo fallback. Photos are bounded,
validated raster data URLs or `null`; remote URLs and SVG are rejected.
Denied optional profile reads retain hours and initials/name fallbacks.

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
- /personal-time.js, /personal-time.css, /project-monthly.js, /project-browser.js and /project-browser.css are authenticated dashboard assets.
- Other files/routes return 404 after login. Anonymous non-API requests redirect to /login.
- Responses use no-store, nosniff, same-origin referrer policy and a CSP blocking framing and off-origin connections. Inline scripts/styles remain allowed for the current single-file pages.

## Refresh

- Last refreshed: 2026-10-08
- Source basis: server.js, login.html, index.html/steering-client.js browser callers, personal-time.js, project-browser.js and tests/auth.test.js.
- Limitations: automated integration tests use simulated Odoo; broad account/schema compatibility is not established.

## APIs retained from main

Authenticated POST routes /api/odoo/project-workpackages, /api/odoo/project-milestones and /api/odoo/project-budgets return task/WP, milestone and financial details. Unit-row detail calls pass projectId (a positive integer), resolved against project.project.id including archived records; missing IDs fail without a name-search fallback. Existing projectCode lookups remain available for legacy callers. /api/odoo/dico-projects retains the legacy fixed-unit API. The RPC boundary accepts only common.authenticate/version, db.list and object fields_get/search_read/read_group; mutations and unknown operations are blocked before network access.
