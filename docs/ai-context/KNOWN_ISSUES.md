# Known Issues

## Active Issues

### Actual-time label has no date cutoff

- Evidence: index.html labels the personal pie Actual time (as of today), while aggregateNamedRows sums selected month keys without comparing record dates to today.
- Impact: future-dated source records can contribute to actual totals.
- Workaround: supply exports or API data consistent with the intended reporting cutoff.
- Follow-up: clarify the label or define and implement a date cutoff if required.

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

Repository inspection and ten simulated authentication tests were performed on 2026-10-05; welcome-page desktop/mobile layout was checked. Live Odoo access, browser imports, sample workbook contents and Docker image execution were not verified. No GitHub Issue references were supplied for these follow-up items.
