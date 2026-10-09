# Known Issues

## Active Issues

- DiCo steering is implemented but disabled until the actual responsible-unit field/DiCo ID is confirmed in `config.local.json`. Programme membership and the actual project-leader field require business verification; no production IDs are invented.
- Steering uses metadata-confirmed direct project relations. Analytic-account fallback and task-linked planning are not implemented in the new service; unsupported sections are unavailable rather than queried broadly.
- Live project/Progress/staffing/budget/WP permissions and consistency are not verified. Separate reads are not transactional; source visibility and budget personnel-cost completeness remain limitations. Nonzero annual 9xxx adjustments are displayed but cannot be automatically reconciled.

- The user confirmed the project field as Lead Unit; the browser showed its technical name lead_unit_id. Automatic user-to-unit mapping follows exact UID/user_id and supported unit/department relations, but its full live behavior remains to be verified. Missing or multiple units fail explicitly without a broad project query.

## Fragile Areas

- Bill popups show category-allocated posted expense entries, not invoice grand
  totals. Document references alone do not establish invoice type. Optional
  description enrichment is a separate read, so changing source records can
  leave text unavailable; account record rules still limit completeness. Missing
  descriptions preserve known amounts. Unknown suppliers, duplicate category
  periods and reconciliation gaps remain disclosed rather than complete lists.
- Annual Ormit Talent exclusions are checked against readable settlement and
  supplier records, with exact line-period/category/currency reconciliation.
  Filtered commitments remain unavailable when purchase evidence is denied or
  ambiguous, Ormit orders cannot be attributed, or an affected line's outstanding
  commitment differs from billed costs. Separate reads and record rules limit
  completeness. Budget allocations, pending approval and reported Odoo balances
  are deliberately not adjusted by this supplier filter.
- Budget discovery on 2026-10-09: legacy `/api/odoo/project-budgets` infers
  fields/types, drops zero-budget lines with actual consumption, converts signed
  amounts to absolute values and missing measures to zero, adds consumed/ordered/
  pending amounts, and excludes future annual budgets. Do not reuse its totals
  for financial comparisons. The new project-finance service avoids those
  assumptions; the legacy endpoint remains unchanged. The stronger
  steering path still does not expose the confirmed parent workflow `state`.
- Settlements New uses `account.analytic.line`. Exact project analytic-account
  scoping is required: financial entries in the targeted sample lacked a direct
  `project_id`. Deductibility, analytic validation, invoice posting, payment and
  budget workflow states are independent. Invoice totals/residuals can repeat
  across analytic allocations; quantities can be hours or other units.
  Budget achieved consumption is explicitly billed/invoiced and omits existing
  monetary timesheet costs in the targeted sample. Those costs are readable but
  lack explicit convention rubrics. The implemented lifetime total includes
  recorded personnel costs, keeps unmapped rubrics separate and does not infer
  rates or category mappings. Analytic `amount.currency_field` must determine
  currency: the live move-linked `company_currency_id` is empty on time entries.
  Asset/liability/cash/off-balance entries are not expense consumption. Source
  visibility and separate-read consistency still limit business completeness.
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
