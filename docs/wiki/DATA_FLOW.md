# Data Flow

## XLSX import

1. A file input reads the workbook as an ArrayBuffer in the browser.
2. The embedded ZIP reader extracts stored or deflated entries; DOMParser reads workbook relationships, shared strings and worksheet cells.
3. Import-specific parsers identify month headers, indentation, measures, planning end dates or task deadline counts.
4. Dataset builders create project/employee rows and monthly values, excluding total and Internal rows where applicable.
5. Year selection drives summaries, remaining-hour tables and canvas rendering. Project legends share employee visibility across their line charts.

Uploaded workbooks are parsed in the browser; the import functions do not upload them to the proxy server. Data is held in page memory, so a reload requires importing or fetching again.

## Odoo connector

1. The page requests /api/config to populate non-secret connector fields.
2. Personal fetch requests timesheets and planning concurrently. Project drilldown does the same for a selected project and replaces the previous detail view.
3. The server uses the signed-in session credentials, authenticates and queries Odoo through XML-RPC. Request/config credentials cannot replace the user.
4. Planning queries inspect available fields and try supported employee/project domains. Queries paginate and normalize records into monthly summaries.
5. The browser converts responses to its chart datasets and rerenders. Debug output exposes query results and warnings to the user.

The public welcome page posts email/password to /api/auth/login. Successful Odoo authentication creates a random session token in an HttpOnly cookie. Its credentials remain in server memory for subsequent calls. Logout, expiry and replacement login invalidate the session; restarting clears all sessions. API requests without a session return 401 and the dashboard redirects to /login on the next request. No passwords are persisted to disk/browser storage. The server does not implement a persistent timesheet database or cache.

## Refresh

- Last refreshed: 2026-10-05
- Source basis: index.html import and fetch functions, server.js handlers and summary helpers.
- Limitations: live Odoo and dataset rendering were not verified; simulated authentication and welcome-page rendering were checked.
