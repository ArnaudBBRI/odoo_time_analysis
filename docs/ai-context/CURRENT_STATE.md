# Current State

## Functional State

- DiCo steering adds project/programme/unit macro summaries, meta coverage/source diagnostics, contributor drill-down, upcoming known deadlines and Summary/Resources/Budgets/Reliability project tabs. The connected-project-leader shortcut matches the session UID against a configured user relation and resets other filters.
- Steering reads live using the signed-in account, without persisted history or source writes. Authoritative cumulative project hours, visible timesheets and reconciled Progress/WP evidence are distinct; annual/convention financial periods and currencies are kept separate. The confirmed DiCo filter and programme reference are server-side local configuration; steering remains disabled by default until that filter is confirmed.

- Time-view UI is simplified to the connected Lead Unit and Refresh. Removed Ready/loaded banners, connector status/test controls, hidden credentials and unused client API helpers; only loading/errors remain visible. Removed the export/Internal subtitle and the pilotage activation/configuration banner; steering controls and data behavior are preserved. The page heading and browser title are now Odoo Unit Dashboard.

- The dashboard automatically resolves the connected person's Lead Unit and selects project.project.lead_unit_id. It retrieves accessible archived/zero-hour projects and all contributors' hours by exact project IDs; ownership-field/team selectors are removed.
- Project drilldown uses the selected project's already loaded summaries. Missing planning remains unknown while owned projects stay visible.

- The browser dashboard implements personal/project actual and planned hours, remaining hours, monthly/cumulative charts and task deadline markers. Top-level workbook upload controls are currently commented out; XLSX parsers remain implemented.
- Authentication adds a responsive Buildwise welcome page at / and /login, using an official local logo and source-backed blue/turquoise styles.
- Odoo email/password login creates an HttpOnly/SameSite session. The dashboard and all connector routes require the session. Queries are bound to that user's identity and Odoo permissions; request or config credentials cannot replace it.
- Logout, fixed expiry, replacement-login rotation, origin checks and login rate limiting are implemented. Passwords are retained only in server memory for XML-RPC calls; a server restart clears sessions.
- HTTP serving is limited to application pages and the logo. config.local.json is now excluded from Docker build contexts.
- README, example configuration, technical wiki, decisions, known issues and change log reflect the new behavior.

## In Progress

- Authentication was published as 2a5596f. Connected-Lead-Unit portfolio, steering modules and dashboard simplification are complete on branch docker; the user requested commit and push on 2026-10-05.
- DiCo steering implementation and simulated checks are complete locally, uncommitted. Real DiCo configuration, programme mapping and live Odoo validation remain pending. See [Pilotage](../wiki/PILOTAGE.md).
- No PR was requested or created; no related GitHub Issue was supplied.
- Pre-existing untracked framework/governance files remain untouched. DECISIONS.md, previously a template, now records the approved authentication choice.

## Known Limitations

- Real Buildwise password/XML-RPC compatibility and real-account data access remain unverified by the agent. SSO/MFA flows are not implemented.
- Sessions/counters are local to one process. HTTPS termination and SESSION_COOKIE_SECURE=true require deployment configuration; proxy users can share an IP counter.
- No comprehensive workbook/chart regression suite, dedicated lint/typecheck setup or CI workflow is defined.
- Live imports, sample workbook contents and Docker build/runtime were not verified. See [Known Issues](KNOWN_ISSUES.md) and [Decisions](DECISIONS.md).
- Steering requires metadata-confirmed direct project relations; unsupported models remain unavailable. No live Progress/WP or budget control verification was possible without a real account. No dedicated lint/typecheck or build command exists for these dependency-free Node/browser modules.

## Project Maturity

A runnable dashboard, authenticated local connector and authentication integration suite are implemented. Production deployment and real-account verification remain unestablished.

## Last Verified

- Date: 2026-10-05 (Europe/Brussels).
- Branch: docker; HEAD: 2a5596f. Compared with main and checked actual Git status; pre-existing local changes preserved.
- node --test tests/auth.test.js tests/portfolio-ui.test.js tests/steering.test.js tests/steering-http.test.js: 30 tests passed using Node v24.10.0 and isolated simulated Odoo fixtures.
- Coverage includes credential rejection/XML-RPC faults, route protection, user isolation, credential overrides, secret non-disclosure, static-file restrictions, CSRF/logout, upstream failure, rotation, expiry, Secure cookie behavior and rate limiting.
- node --check server.js and inline JavaScript parsing for index.html/login.html: passed.
- node --check steering.js, steering-service.js and steering-client.js: passed. Steering browser checks passed at 1440px and 390px: unit → programme → project, four tabs, leader focus, keyboard navigation, shared filters, refresh and failed-refresh retry; no JavaScript errors or mobile page overflow. Screenshots use labelled fictional fixtures, not live business data.
- Welcome-page visual checks at desktop/mobile widths and password visibility toggle: passed; mobile overflow check returned false at 390px.
- Docker Compose configuration and local Markdown links checked; no Docker build was performed.
- No dedicated lint/typecheck command exists. Functional Odoo, workbook and deployment checks remain unverified.

## Session handoff

- Objective: preserve connected-person Lead Unit/time behavior and implement the approved DiCo project/programme/unit steering plan plus the connected-project-leader shortcut.
- Completed: existing Lead Unit flow plus steering calculations, scoped read API, programme configuration, macro/meta views, four-tab detail, coverage/reconciliation controls, 30 passing combined tests, labelled desktop/mobile browser verification and documentation.
- Local changes: existing time/auth/Lead Unit changes remain; new steering modules/assets/tests and related docs are uncommitted. Unrelated framework files and private configuration are preserved.
- Preview: local Node server on http://127.0.0.1:8767/ for review; main runtime default remains port 8765. Preview was restarted with the final source after verification.
- Next action: confirm the actual DiCo field/ID in pilotage.unitDomain and unitConfirmed; define programme/project IDs; verify projectLeaderField and the resource/budget/Progress/WP models with a real Odoo account. Also verify the connected Lead Unit flow. No implementation work remains for the local approved scope; live schema/runtime validation is pending.
- Blockers: none for local implementation; real Odoo settings and deployment behavior remain verification limits.
