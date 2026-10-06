# Odoo Time Dashboard

The dashboard compares Odoo timesheets and planning. Run the server, open the Buildwise welcome page, and sign in with your Odoo email and password. The underlying XLSX readers remain available in index.html; the top-level workbook upload controls are currently commented out.

## Local Server Quick Start

The dashboard also includes French DiCo project/programme/unit steering views with coverage diagnostics, separate convention/annual budgets and a connected-project-leader shortcut. They require a confirmed responsible-unit filter in private configuration. See [DiCo steering setup and measures](docs/wiki/PILOTAGE.md); the existing time dashboard remains available when steering is disabled.

Use Node.js 22 to match the Docker runtime. No npm installation or build step is required. To use the Odoo API features, start the local server from this repository folder:

```bash
node server.js
```

Then open:

```text
http://127.0.0.1:8765/
```

Keep the terminal open while using the dashboard. Stop the server with `Ctrl+C`.

If port `8765` is already used, choose another port:

```powershell
$env:PORT=8766
node server.js
```

Then open `http://127.0.0.1:8766/`.

## Docker Quick Start

Build and run the dashboard with Docker Compose:

```bash
docker compose up --build
```

Then open:

```text
http://127.0.0.1:8765/
```

Stop it with `Ctrl+C`, or run it in the background:

```bash
docker compose up --build -d
```

To use private configuration, create `config.local.json` and enable the read-only `volumes` section in `docker-compose.yml`. The file is excluded from the Docker build context.

Stop background containers with `docker compose down`; inspect logs with `docker compose logs -f`. If host port `8765` is occupied, change the host side of the Compose port mapping, for example `8766:8765`.

Compose publishes the port without a loopback-only binding. The dashboard and its APIs require sign-in, and only application pages and the logo are served. Use HTTPS when exposing the application beyond localhost. See [Configuration](docs/wiki/CONFIGURATION.md).

## Sign In With Odoo

The home page uses the Buildwise visual style and asks for your Odoo email and password. A successful login opens `/dashboard`; use **Se déconnecter** to end the session. The server authenticates against the configured Odoo instance, defaulting to `https://odoo.buildwise.be/` and database `buildwiseprd`.

All dashboard API requests use the signed-in user's Odoo credentials and permissions. Request fields and private-config API keys cannot replace that identity. No local dashboard account database is created.

Sessions expire after eight hours by default and are stored in server memory. Restarting the server signs everyone out. The browser receives a random session cookie with `HttpOnly` and `SameSite=Lax`; the password remains in server memory for authenticated XML-RPC calls and is not persisted to disk or browser storage.

For an HTTPS deployment, set `SESSION_COOKIE_SECURE=true` on the server/container. TLS must be provided by the deployment or reverse proxy. If a proxy is used, preserve the public `Host` header so POST origin checks match the browser origin. Set `SESSION_TTL_SECONDS` to change the fixed session lifetime (default `28800`). Invalid/nonpositive lifetimes stop startup.

Ten login attempts per client IP within 15 minutes trigger a temporary block; successful login resets that address's counter. Behind a reverse proxy, users may share its address. Sessions and rate limits are local to one Node process, not shared across replicas.

This flow requires an Odoo password accepted by XML-RPC. SSO-only and two-factor authentication flows are not implemented; compatibility with the actual Buildwise Odoo authentication settings must be checked with a real account. See [Odoo's external API documentation](https://www.odoo.com/documentation/18.0/developer/reference/external_api.html).

## Optional Local Config

To select an Odoo instance, copy `config.example.json` to `config.local.json`:

```json
{
  "odooUrl": "https://odoo.buildwise.be/",
  "database": "buildwiseprd"
}
```

The server reads the instance URL and database for sign-in. Existing username, API key and employee defaults do not override the signed-in user. Employee and project queries are entered in the dashboard.

`config.local.json` is ignored by Git, excluded from new Docker build contexts and inaccessible through the HTTP server. If older images were built with private configuration, rebuild them using the updated exclusions; the change does not remove files from existing images.

## Running With The Odoo Connector

Start the server and sign in before fetching data. No separate API key entry is needed. Fetch actions reuse the Odoo session credentials. The API retains Odoo's permissions; a dashboard login does not grant additional access.

## My Lead Unit Portfolio

Projects load automatically for the signed-in person's **Lead Unit**. There is no field or team selector. Use **Refresh** to reload the portfolio. The time view shows only the connected Lead Unit and useful loading/error messages, without a connection-test panel or a Ready banner.

The project ownership field is `project.project.lead_unit_id`. The server reads the authenticated user by exact UID, using its Lead Unit/Unit relation when available, or an employee record linked through `user_id`. If only department membership is available, it follows the department's explicit unit relation, unit flag or parent hierarchy to a department named as a Unit. It does not look up people by name or accept client overrides of the unit.

All accessible projects whose lead_unit_id matches that unit are listed, including archived and zero-hour projects. Hours cover all contributors on those projects. Clicking a project displays its already loaded ID-scoped detail. Year filters affect hour totals without removing zero-hour owned projects.

If no unique Lead Unit can be resolved, the application reports it and makes no project query. Unsupported planning relations leave planned/remaining values unknown while retaining the projects. Odoo record permissions still apply.

## Files To Provide

### 1. My Timesheet Export

Dashboard input: **My timesheet export**

Example file: `Tableau croisé dynamique Analyse des feuilles de temps (timesheets.analysis.report) (2).xlsx`

Expected structure:

- One Odoo pivot-style XLSX sheet.
- Month columns across the top, for example `janvier 2026`, `février 2026`.
- A measure row containing `Temps passé`.
- Rows are projects for one employee.
- A row named `Interne` or `Internal` may be present; it is treated as holidays and fully excluded from totals and percentages.

Used for:

- The `Actual time` personal pie chart.
- The `My hours` and `My projects` summary metrics.

### 2. Project Timesheet Exports

Dashboard input: **Project exports**

Example file: `Tableau croisé dynamique Analyse des feuilles de temps (timesheets.analysis.report) (3).xlsx`

Expected structure:

- One Odoo pivot-style XLSX sheet per project, or several project sections in one export.
- Month columns across the top.
- A measure row containing `Temps passé`.
- A project row with indented employee rows below it.
- Employee rows contain the actual hours spent by each employee per month.

Used for each project panel:

- Employee contribution pie chart.
- Monthly hours line chart.
- Cumulative hours line chart.

### 3. Planned Project Export

Dashboard input: **Planned project exports**

Example file: `tps_planifie.xlsx`

Expected structure:

- One Odoo planning pivot-style XLSX sheet for a given project.
- The project name appears above the date/month headers.
- Date/month columns are end dates, for example `mars 2026`, `décembre 2026`, `mai 2028`.
- Rows are employees.
- Values are planned hours up to the end date or since the previous end date.

Interpretation:

- If an employee has `678:55` hours planned at `décembre 2026` and no earlier planned value, the dashboard treats that as the total planned effort from the project start through December 2026.
- If the same employee also has a value in an earlier date column, each later value is treated as the planned effort between the previous date and that date.
- Planned progress is assumed linear over the months in each period.

Used for:

- The optional `Planned vs actual` project graph.
- Solid lines are actual cumulative hours.
- Dashed lines are planned cumulative hours.

This file is optional. If no matching planned project export is uploaded, the project panel still shows the existing actual charts.

### 4. My Planning Export

Dashboard input: **My planning export**

Example file: `planning_aca.xlsx`

Odoo source:

- Go to the **Planification** app.
- Open **Analyse > Planning/Convention Analysis**.
- Apply the filter **Employee is in MY_NAME**.
- In the current setup, this was saved as a custom filter named **Mon planning par projet**.
- Export the resulting analysis as XLSX.

Expected structure:

- One Odoo pivot-style XLSX sheet.
- Rows are end dates, for example `décembre 2026`.
- Under each date row, indented subrows are projects.
- The dashboard reads the `Plannifié (heures)` column.
- Values use the same end-date logic as planned project exports: planned hours are allocated linearly between the previous date and the current date.

Used for:

- The `Planned time` personal pie chart next to `Actual time`.
- Comparing personal actual time repartition with personal planned time repartition.

This file can contain older years. The dashboard keeps those years available in the year filter, but when this file is loaded it defaults to the current year.

### 5. Project Task Deadline Export

Dashboard input: **Upload task deadlines** inside an individual project panel

Example file: `extrai_tasks.xlsx`

Odoo source:

- Go to the **Projects** app.
- Open **Tasks**.
- Switch to the **pivot table** view.
- Use rows as **Titre**.
- Use columns grouped per month.
- Export the resulting pivot table as XLSX.

Expected structure:

- One Odoo pivot-style XLSX sheet for tasks.
- Rows are task names or task group labels.
- Columns are task deadline months, for example `mai 2026`, `janvier 2028`, `mars 2028`.
- Cells contain counts under the relevant deadline month.
- The final total column is ignored.

Used for:

- Vertical deadline markers in that project section's line charts.
- The markers appear on monthly hours, cumulative hours, and planned-vs-actual charts when those charts are present.
- One file is uploaded per project panel, so each project can have its own task deadlines.

## Matching And Colors

- Project matching prefers the numeric Odoo project code inside brackets, for example `[54252043]`.
- If no code is available, the dashboard falls back to normalized project names.
- When a project appears in both actual and planned personal pies, both pies use the same color.
- In per-project line-chart legends, clicking an employee name toggles that employee on or off across the monthly, cumulative, and planned-vs-actual charts.

## Year Filtering

- The `All` chip includes all available months from uploaded actual and planning files.
- Individual year chips filter every graph.
- `Interne` / `Internal` rows are excluded before totals and percentages are calculated.

## Data Interpretation And Runtime Limits

- Portfolio actual/planned charts reflect loaded records within the selected year scope; there is no separate cutoff excluding future-dated records.
- Portfolio remaining hours equal planned minus actual for the selected years; negative values indicate actual hours exceeding that plan.
- API planning slots are distributed across months in proportion to elapsed time. This is not a working-day or holiday-calendar calculation.
- XLSX imports run in browser memory and are not uploaded to the server. Reloading requires importing or fetching again.
- The embedded XLSX reader requires a browser with `DecompressionStream` support. No external workbook or chart library is loaded.
- Live API results depend on Odoo permissions and available planning fields. Employee-name searches use partial matching and may return multiple matching employees.

## Technical Documentation

See the [technical wiki](docs/wiki/INDEX.md) for architecture, API routes, configuration, data flow and verification commands. [Current State](docs/ai-context/CURRENT_STATE.md) records completed work and verification limits; [Known Issues](docs/ai-context/KNOWN_ISSUES.md) records observed follow-up items.

## Project details and hour scopes

Unit portfolios aggregate all contributors in the connected Lead Unit. Project rows open shared work-package, milestone and budget details. The consultant-hours toggle includes or excludes AI Consultant / AI Consultant Ormit records. Personal datasets retain Me and Whole Project scopes; unit portfolios use Whole Project and disable Me. Odoo calls are strictly read-only, including aggregate reads; writes and unknown RPC operations are rejected.
