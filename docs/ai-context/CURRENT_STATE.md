# Current State

## Functional State

- The browser dashboard implements personal/project actual and planned hours, remaining hours, monthly/cumulative charts and task deadline markers. Top-level workbook upload controls are currently commented out; XLSX parsers remain implemented.
- Authentication adds a responsive Buildwise welcome page at / and /login, using an official local logo and source-backed blue/turquoise styles.
- Odoo email/password login creates an HttpOnly/SameSite session. The dashboard and all connector routes require the session. Queries are bound to that user's identity and Odoo permissions; request or config credentials cannot replace it.
- Logout, fixed expiry, replacement-login rotation, origin checks and login rate limiting are implemented. Passwords are retained only in server memory for XML-RPC calls; a server restart clears sessions.
- HTTP serving is limited to application pages and the logo. config.local.json is now excluded from Docker build contexts.
- README, example configuration, technical wiki, decisions, known issues and change log reflect the new behavior.

## In Progress

- Authentication implementation and local verification are complete on branch docker, based on a4ac55e. The user authorized committing and pushing these changes. Git records the resulting publication status.
- No PR was requested or created; no related GitHub Issue was supplied.
- Pre-existing untracked framework/governance files remain untouched. DECISIONS.md, previously a template, now records the approved authentication choice.

## Known Limitations

- Real Buildwise password/XML-RPC compatibility and real-account data access remain unverified by the agent. SSO/MFA flows are not implemented.
- Sessions/counters are local to one process. HTTPS termination and SESSION_COOKIE_SECURE=true require deployment configuration; proxy users can share an IP counter.
- No comprehensive workbook/chart regression suite, dedicated lint/typecheck setup or CI workflow is defined.
- Live imports, sample workbook contents and Docker build/runtime were not verified. See [Known Issues](KNOWN_ISSUES.md) and [Decisions](DECISIONS.md).

## Project Maturity

A runnable dashboard, authenticated local connector and authentication integration suite are implemented. Production deployment and real-account verification remain unestablished.

## Last Verified

- Date: 2026-10-05 (Europe/Brussels).
- Branch: docker; base HEAD: a4ac55e. Compared with main and checked actual Git status.
- node --test tests/auth.test.js: 10 tests passed using Node v24.10.0 and isolated simulated Odoo fixtures.
- Coverage includes credential rejection/XML-RPC faults, route protection, user isolation, credential overrides, secret non-disclosure, static-file restrictions, CSRF/logout, upstream failure, rotation, expiry, Secure cookie behavior and rate limiting.
- node --check server.js and inline JavaScript parsing for index.html/login.html: passed.
- Welcome-page visual checks at desktop/mobile widths and password visibility toggle: passed; mobile overflow check returned false at 390px.
- Docker Compose configuration and local Markdown links checked; no Docker build was performed.
- No dedicated lint/typecheck command exists. Functional Odoo, workbook and deployment checks remain unverified.

## Session handoff

- Objective: Odoo-account authentication with a Buildwise welcome/login page; approved by the user with "go".
- Completed: implementation, 10 passing integration tests, visual checks and documentation.
- Publication scope: server.js, index.html, login.html, the logo asset, authentication tests, config.example.json, .dockerignore and related docs. Existing unrelated framework files are excluded.
- Preview: local Node server on http://127.0.0.1:8767/ for review; main runtime default remains port 8765. Preview was restarted with the final source after verification.
- Next action: user can verify a real Odoo account and review the published changes; no implementation work remains pending for the approved scope.
- Blockers: none for local implementation; real Odoo settings and deployment behavior remain verification limits.
