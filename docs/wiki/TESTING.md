# Testing

No automated test files, test runner, package scripts or CI checks are defined in the inspected repository. No dedicated lint or typecheck configuration is present.

## Lightweight checks

```powershell
node --check server.js
docker compose config --quiet
```

These validate server syntax and Compose configuration. They do not verify Odoo authentication, workbook parsing, data correctness or rendering.

## Manual functional checks

- Open index.html and import personal timesheets and planning; inspect project totals and year filters.
- Load project actual/planning exports and deadline files; inspect charts and shared legend toggles.
- Run node server.js; check /, /api/config, blocked private configuration and invalid API methods.
- With authorized credentials, test the connection, fetch personal data and drill down into a project. Confirm Odoo permissions and warnings.
- Build and run Docker separately when container behavior needs validation.

## Coverage gaps

The embedded XLSX and XML-RPC parsers, planning allocation, schema fallbacks, project matching and charts have no repository-defined regression suite. Example XLSX files exist, but are not wired into automated tests.

## Refresh

- Last refreshed: 2026-10-05
- Source basis: repository file inventory, server.js, index.html and Docker configuration.
- Limitations: manual functional checks above are suggested checks, not claims that they were performed.
