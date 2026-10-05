# Testing

## Offline RPC safety tests

[tests/odoo-read-only.test.js](../../tests/odoo-read-only.test.js) uses Node's
built-in test runner. It loads the actual server source in a VM with mocked
server startup, file access, timers, and `fetch`. It opens no sockets, reads no
private config, and contacts no Odoo instance.

The suite checks permitted service/method combinations, nested read methods,
mutation and unknown-method rejection, malformed requests, and rejection before
network access. It also checks existing read helper calls and the absence of
outbound RPC calls during server startup.

```powershell
node --test tests/odoo-read-only.test.js
```

If a restricted Windows sandbox prevents the test runner from spawning its
isolated process, a supporting Node runtime can run the same suite in process:

```powershell
node --test --test-isolation=none tests/odoo-read-only.test.js
```

Check backend syntax separately with `node --check server.js`. These checks
require no package installation or administrator rights. Never test the guard
by attempting a real Odoo mutation; follow
[PROJECT_RULES.md](../ai-context/PROJECT_RULES.md).

## Remaining-hours comparison tests

[tests/remaining-hours.test.js](../../tests/remaining-hours.test.js) loads the
actual dashboard script in a VM before UI startup. It tests through-today
totals, selected years, planning overlap, monthly/DST fallback, threshold
boundaries in both directions, per-project bar widths, zero forecasts, raw API
adapters, and row markup/drilldown. It does not call Odoo or read local config.

```powershell
node --test --test-isolation=none tests/remaining-hours.test.js
```

## Subcontractor-hour tests

[tests/subcontractor-roles.test.js](../../tests/subcontractor-roles.test.js)
contains 17 tests including endpoint subtests. It loads the actual backend in a
VM with mocked startup, file access, and XML-RPC responses. Coverage includes
exact role matching, same-name distinct identities, scoped/public HR fallback,
resource resolution when public metadata hides `resource_id`, denied/missing
metadata warnings, all five hour handlers, inclusive totals, and empty
employee-only summaries. No sockets, private config, or live Odoo are used.

[tests/subcontractor-hours.test.js](../../tests/subcontractor-hours.test.js)
contains 24 browser-script tests. It checks unchecked/enabled inclusion controls,
personal/project/Dico aggregates and raw records, remaining comparisons, local
toggle reversibility, retained scope/months/settings, task zero/unavailable
consumption (including historical aggregates and out-of-scope tasks),
unknown/export/legacy notices, and mode-specific macro overrides.
Additional coverage verifies truthful stale-response notices, personal versus
project-wide scope, consultant-hour counters (years, Internal rows, actual
credits, zero data), and Dico-only Remaining rendering.

```powershell
node --test --test-isolation=none tests/subcontractor-roles.test.js tests/subcontractor-hours.test.js
```

## Sticky employee-scope tests

[tests/sticky-scope.test.js](../../tests/sticky-scope.test.js) loads the actual
browser script in a VM with mocked DOM/renderers and network responses. It
contains 25 tests and checks sticky-control markup/defaults, ID-first Me matching, scoped actual and
planning feeds, shared task inputs, separate macro overrides, consultant-only
project discovery, Dico zero rows/baseline fallback, UTC month planning,
coherent workbook fallback, signed credits, unnamed employee hours, omission
of the unassigned project lookup, legacy capability/monthly fallback, cached
read-only hour requests, failure/concurrency/stale employee/Dico/cache response
handling, and preservation of years/inclusion/chart visibility.

```powershell
node --test --test-isolation=none tests/sticky-scope.test.js
```

## Coverage boundaries

The suites cover the outbound safety boundary, mocked hour handlers, and
dashboard calculations/markup. They do not render the browser layout or
exercise the full XLSX parser, chart drawing, HTTP socket handling, or live Odoo
schema/access compatibility. Results and unavailable checks are recorded in
[CURRENT_STATE.md](../ai-context/CURRENT_STATE.md).

## Refresh

- Last refreshed: 2026-10-05.
- Source basis: all five test files, guarded RPC/function-enrichment/hour
  handlers in `server.js`, and inclusion/employee-scope/cache/task/override
  helpers in `index.html`.
- Limitations: mocks verify this application's dispatch boundary; they do not
  verify a remote server's custom read-method implementation or access rights.
