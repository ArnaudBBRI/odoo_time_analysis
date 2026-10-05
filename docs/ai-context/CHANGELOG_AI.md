# AI Change Log

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
