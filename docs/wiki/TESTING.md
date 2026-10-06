# Testing

## Authentication integration suite

```powershell
node --test tests/auth.test.js tests/portfolio-ui.test.js
```

The Node built-in test runner launches a copy of the application in an isolated temporary directory and a local simulated XML-RPC server. It does not use real credentials or the repository's private configuration.

Authentication tests cover public/protected routes, invalid login and XML-RPC faults, identity overrides, secret non-disclosure, restricted static files, separate users, logout/CSRF, forged cookies, upstream failure, session rotation/expiry, Secure cookies and login rate limiting.

Owner-team tests cover scoped project-ID queries, no employee-name filtering, zero-hour/empty portfolios, all contributors, ambiguous metadata, task-linked planning, unsupported planning without an unfiltered query, and unknown UI remaining values.

## Syntax and configuration

```powershell
node --check server.js
docker compose config --quiet
```

Inline JavaScript in index.html and login.html can be parsed with Node vm.Script. Syntax checks do not validate rendering or data calculations.

## Manual checks

## DiCo steering checks

Run `node --test tests/steering.test.js tests/steering-http.test.js` for calculations, scope gates, optional-source denial, Progress/WP reconciliation, separate financial periods, programme anomalies and authenticated user isolation. Optional `tests/steering-browser.js` checks desktop/mobile navigation, tabs, leader focus, filters, refresh, errors/retry and overflow using labelled fictional fixtures; see [test setup](PILOTAGE.md#implementation-and-verification).

## Additional manual checks

- Verify welcome-page layout at desktop and mobile widths, field labels, keyboard focus and password visibility toggle.
- With a real Odoo account, sign in, test the connection, fetch employee/project data and sign out. Confirm Odoo permissions and authentication settings.
- Check session-cookie behavior behind the actual HTTPS reverse proxy.
- Build and run Docker separately when container behavior needs validation.

## Current coverage and gaps

The welcome page was visually inspected at desktop/mobile widths, including the visibility toggle; mobile horizontal overflow was checked. The 19 authentication, connected-Lead-Unit and frontend tests passed on 2026-10-05 using Node v24.10.0.

There is no dedicated lint/typecheck setup or CI workflow. XLSX/XML-RPC parsers, planning allocation and charts do not have a comprehensive regression suite. Live Odoo, real-account browser login, data imports and Docker build/runtime were not validated by this suite.

## Refresh

- Last refreshed: 2026-10-05
- Source basis: tests/auth.test.js, server.js, index.html, login.html and Docker configuration.
- Limitations: simulated authentication is not proof of compatibility with real Buildwise accounts.

## Merge verification (2026-10-06)

All 125 tests passed with node --test across auth.test.js, portfolio-ui.test.js, steering.test.js, steering-http.test.js, odoo-read-only.test.js, remaining-hours.test.js, sticky-scope.test.js, subcontractor-hours.test.js and subcontractor-roles.test.js. Legacy offline fixtures now instrument the authenticated bootstrap and support the crypto/session dependencies; read_group is tested as read-only. No live Odoo or Docker runtime verification was performed.
