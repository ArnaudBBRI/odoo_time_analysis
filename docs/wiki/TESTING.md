# Testing

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
errors). A browser-script fixture checks the **Use config file** button, empty
JSON request, safe compact messages, blocked duplicate submissions, and
successful dashboard navigation. No private config is read or real Odoo contacted.

Owner-team tests cover scoped project-ID queries, no employee-name filtering, zero-hour/empty portfolios, all contributors, ambiguous metadata, task-linked planning, unsupported planning without an unfiltered query, and unknown UI remaining values.

## Personal time macro

```powershell
node --test tests/personal-time.test.js tests/project-monthly.test.js tests/project-browser.test.js tests/sticky-scope.test.js tests/auth.test.js
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
Controller/renderer regressions verify effective date captions and tick positions,
unchanged recorded totals, inclusion of accessible prior-year planning, missing
date-reference notices, and unchanged lifetime/monthly charts with no extra fetch.
Dashboard fixtures cover the default **Mon temps**
view, session-bound empty request, inclusive own roles and exact identities,
local years/legend state, and obsolete refresh responses. HTTP fixtures cover
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
node --check project-monthly.js
node --check project-browser.js
docker compose config --quiet
```

Inline JavaScript in index.html and login.html can be parsed with Node vm.Script. Syntax checks do not validate rendering or data calculations.

## Manual checks

## DiCo steering checks

Run `node --test tests/steering.test.js tests/steering-http.test.js` for calculations, scope gates, optional-source denial, Progress/WP reconciliation, separate financial periods, programme anomalies and authenticated user isolation. Optional `tests/steering-browser.js` checks desktop/mobile navigation, tabs, leader focus, filters, refresh, errors/retry and overflow using labelled fictional fixtures; see [test setup](PILOTAGE.md#implementation-and-verification).

## Additional manual checks

- Verify welcome-page layout at desktop and mobile widths, field labels, keyboard focus and password visibility toggle.
- With fictional personal data, check Hors planning subtotals, Projets year scope, radio keyboard navigation, manager-photo fallbacks and return focus. Selection should load one exact-project response and show personal/all-employee pairs with 75% planned bars and linear date ticks; year changes should make no additional request. Check unknown planning, signed credits, consultant warnings, retry and asynchronous focus. Mon temps · 02 remains hidden.
- Check the project-only Ormitter checkbox starts unchecked and appears for full-history nonzero hours or confirmed assignments, even outside selected years. Toggling it should update both project comparisons and the stacked-area chart without a request, preserve focus and leave Mes heures unchanged. Check stacked contributor totals/colors, photo/name bubbles inside wide bar segments and avatar-only bubbles on narrower ones, the always-visible keyed list at mobile widths, signed negative net-bar explanations and safe photo fallbacks.
- Check the third convention pair retains the full project-date caption, actual total and date tick when selected years change. Confirm actuals exclude dates outside the project and after Brussels today. With an empty/nonpositive budget, verify the MIS message; with an unreadable field, verify the unavailable-field message. Both cases omit the upper row and retain a distribution-only lower bar without a tick. With invalid dates, verify unavailable actuals. Check the smaller title and thinner bars at desktop/mobile widths, including actual-only callouts and comparison-specific contributor focus.
- Check the area chart starts in **Par mois** mode and the **Cumulé** control sits beside the conditional Ormitter checkbox, remaining available when there are no Ormitters. Positive employee areas should add up to the thick total; signed credits should stack below zero while the total stays net. Verify monthly/cumulative exact values, retained employee colors, convention as its own dotted line and its cumulative plateau after project end. Both control switches should replay the shared one-second reveal; year chips, resizing and unchanged rerenders should not. Check per-project remembered mode, keyboard/touch details, table values, reduced motion and desktop/mobile overflow.
- Click an employee name to show only that employee's solid actual and dotted planned reference in either mode. Keep all names clickable; switch employees and restore all with a second click or **Tous les employés**. Check selected-only month details/table, retained colors/focus, linear reference using full-project planned hours rather than convention, zero versus unavailable planning, replay on selection changes, per-project memory, and reset when the selected Ormitter is excluded. These actions should use cached data and leave all three bars unchanged.
- With a real Odoo account, sign in, test the connection, fetch employee/project data and sign out. Confirm Odoo permissions and authentication settings.
- Check session-cookie behavior behind the actual HTTPS reverse proxy.
- Build and run Docker separately when container behavior needs validation.

## Current coverage and gaps

The welcome page was visually inspected at desktop/mobile widths, including the visibility toggle; mobile horizontal overflow was checked. The personal macro has dedicated calculation/DOM fixtures alongside authenticated HTTP and dashboard integration tests. See [Current State](../ai-context/CURRENT_STATE.md) for the latest executed checks.

There is no dedicated lint/typecheck setup or CI workflow. Legacy XLSX parsing and charts do not have comprehensive regression coverage. Live Odoo, real-account browser login, data imports and Docker build/runtime are not validated by these synthetic suites.

## Refresh

- Last refreshed: 2026-10-09
- Source basis: tests/personal-time.test.js, tests/project-monthly.test.js, tests/project-browser.test.js, tests/sticky-scope.test.js, tests/auth.test.js (including local config-login/manager/contributor/assignment/lifetime fixtures), server.js, personal-time.js, project-monthly.js, project-browser.js/css, index.html, login.html and Docker configuration.
- Limitations: simulated authentication is not proof of compatibility with real Buildwise accounts.

## Merge verification (2026-10-06)

All 125 tests passed with node --test across auth.test.js, portfolio-ui.test.js, steering.test.js, steering-http.test.js, odoo-read-only.test.js, remaining-hours.test.js, sticky-scope.test.js, subcontractor-hours.test.js and subcontractor-roles.test.js. Legacy offline fixtures now instrument the authenticated bootstrap and support the crypto/session dependencies; read_group is tested as read-only. No live Odoo or Docker runtime verification was performed.
