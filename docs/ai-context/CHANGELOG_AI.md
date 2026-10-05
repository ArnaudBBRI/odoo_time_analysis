# AI Change Log

## 2026-10-05 — DiCo steering

- Added authenticated on-demand project/programme/unit macro and meta views, configured programme membership, project-leader shortcut, contributor drill-down and four-tab project detail.
- Added strict resource/Progress/WP reconciliation and period/currency-separated financial aggregation with explicit missing-data states.
- Preserved the existing time and connected Lead Unit flow, existing local changes, and private configuration. No Odoo writes, persistence, commit, push or PR.
- Validation: 30 combined Node tests; syntax checks; desktop/mobile rendered verification with fictional fixtures, including keyboard navigation and error/retry. Live Odoo and Docker remain unverified.

This file records meaningful AI-assisted changes and complements Git history.

## Unreleased

### 2026-10-05: Refresh dashboard documentation

- Summary: replaced technical wiki placeholders with source-backed descriptions and expanded README runtime, Docker and data-interpretation guidance.
- Documentation: all ten wiki pages, README, CURRENT_STATE.md and KNOWN_ISSUES.md; governance, roadmap and decision templates were preserved.
- Checks: server and inline browser JavaScript syntax, Compose configuration, local README/wiki links and tracked diff whitespace passed.
- Limitations: no browser functional checks, workbook-content inspection, live Odoo calls or Docker build/runtime validation.
- Follow-up: Docker build-context private-file handling and actual-time label behavior are recorded in KNOWN_ISSUES.md; implementation was not changed.
- Issue or PR: none supplied or created. The user subsequently authorized committing and pushing the refreshed documentation on branch docker.

## 2026-10-05: Add Odoo sign-in and Buildwise welcome page

- Summary: added email/password sign-in through Odoo, fixed-lifetime in-memory sessions, logout/rotation, protected dashboard/API routes, rate limiting and POST origin checks. Connector identity is scoped to the signed-in user.
- UI: French welcome page, official Buildwise SVG logo, website-derived blue/turquoise palette, responsive layout and session identity/logout in the dashboard header. The dashboard retains its existing English content.
- Configuration: optional Secure cookies/TTL, instance-only example config, private-config Docker exclusion and restricted static file serving.
- Checks: 10 simulated-Odoo integration tests passed; server and inline browser JavaScript syntax, Compose configuration, Markdown links and welcome-page visual/mobile overflow checks passed.
- Documentation: README, wiki pages (including a new visual reference), decisions, known issues and current state.
- Limits: real Odoo account compatibility, SSO/MFA, shared sessions across replicas, TLS deployment, workbook imports and Docker build/runtime were not verified or implemented as applicable.
- Publication: the user authorized committing and pushing the authentication changes on branch docker. No PR was requested or created.

## 2026-10-05: Replace person filtering with owner-team portfolios

- Added live ownership-field metadata, team selection and exact team/project-ID domains. Accessible archived and zero-hour projects remain visible; aggregate actual/planned data covers all contributors.
- Project detail uses already loaded ID-scoped summaries. Missing planning is displayed as unknown; unsupported schemas never trigger an unfiltered planning search.
- Validation: 16 server/frontend tests passed, including empty teams, zero-hour projects, ownership ambiguity, task-linked planning, scoped queries and unknown remaining values. Syntax checks passed; real Odoo ownership semantics remain unverified.
- Updated README, wiki, decisions, known issues and current state. Changes remain local and uncommitted.

### Connected Lead Unit clarification

- User clarified ownership is Lead Unit and must be the connected person's unit. Removed both selectors and automatic schema/field browsing.
- Fixed project ownership to lead_unit_id; resolve own unit by UID/user_id and direct-unit or department-parent relations. Reject absent/multiple units and ignore client unit overrides.
- 19 tests passed, including direct/parent resolution, missing/multiple units, empty portfolios, override rejection, planning schema handling and UI model cases. Full live user-unit resolution remains unverified.

### Simplify time-view controls

- Removed loaded/Ready banners, Odoo connection status/test controls, hidden credential fields and unused connector client code.
- Retained connected Lead Unit, Refresh and loading/error feedback. Related UI documentation updated; pre-existing steering work is preserved.
- Further UI cleanup requested by the user: removed the export/Internal subtitle and hidden the pilotage activation/configuration diagnostics. Inline JavaScript and steering-client.js syntax passed; portfolio UI tests passed (2/2).
