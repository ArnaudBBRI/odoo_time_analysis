# Known Issues

## Active Issues

- DiCo steering is implemented but disabled until the actual responsible-unit field/DiCo ID is confirmed in `config.local.json`. Programme membership and the actual project-leader field require business verification; no production IDs are invented.
- Steering uses metadata-confirmed direct project relations. Analytic-account fallback and task-linked planning are not implemented in the new service; unsupported sections are unavailable rather than queried broadly.
- Live project/Progress/staffing/budget/WP permissions and consistency are not verified. Separate reads are not transactional; source visibility and budget personnel-cost completeness remain limitations. Nonzero annual 9xxx adjustments are displayed but cannot be automatically reconciled.

- The user confirmed the project field as Lead Unit; the browser showed its technical name lead_unit_id. Automatic user-to-unit mapping follows exact UID/user_id and supported unit/department relations, but its full live behavior remains to be verified. Missing or multiple units fail explicitly without a broad project query.

## Fragile Areas

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
