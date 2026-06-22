# Odoo Time Dashboard

`index.html` is a self-contained browser dashboard for Odoo timesheet and planning exports. Open it in a browser and upload the XLSX files through the inputs at the top of the page.

## Local Server Quick Start

To use the Odoo API features, start the local server from this repository folder:

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

## Optional Local Config

To avoid re-entering the same Odoo values every time, copy `config.example.json` to `config.local.json` and fill in your own values:

```json
{
  "odooUrl": "https://odoo.buildwise.be/",
  "database": "buildwiseprd",
  "username": "your.odoo.login@example.com",
  "apiKey": "paste-your-api-key-here",
  "employeeName": "First Last"
}
```

`config.local.json` is ignored by Git and is not served as a static file by `server.js`. The browser only receives the non-secret fields and whether an API key exists; the API key stays on the local server side.

When `apiKey` is present in `config.local.json`, you can leave the dashboard's API key field empty. Typing a value in the field still overrides the config value for that request.

## Running With The Odoo API Connector

The XLSX workflow still works by opening `index.html` directly. The Odoo API connection test needs the local proxy server in `server.js`, because browsers usually cannot call Odoo XML-RPC directly from a local page.

The connection test asks for:

- **Odoo URL**: the base URL of your Odoo instance, for example `https://example.odoo.com`. A copied `/web` URL is also accepted.
- **Database**: the Odoo database name.
- **Username**: your Odoo login email or username.
- **API key**: the key generated from your Odoo account security settings.

When typed in the browser, the API key is not saved by the dashboard. It is only sent to the local server for the current API request, and the local server forwards it to Odoo as the XML-RPC password. If you choose to store it in `config.local.json`, keep that file private.

The Buildwise connector fields are prefilled with:

- **Odoo URL**: `https://odoo.buildwise.be/`
- **Database**: `buildwiseprd`

Use **Timesheet Debug** to enter an employee name and fetch matching API data. One click fetches:

- `account.analytic.line` timesheet records for actual hours.
- `planning.slot` planning records for planned hours.

The fetched actual hours feed the `Actual time` personal pie. The fetched planning slots feed the `Planned time` personal pie and the remaining-hours table.

Click a project name in the remaining-hours table to fetch detailed project data for that project. One click fetches:

- `account.analytic.line` timesheet records for everyone who encoded hours on that project.
- `planning.slot` planning records for everyone planned on that project.

The fetched project timesheets feed the per-project contribution pie, monthly line chart, and cumulative line chart. The fetched project planning feeds the per-project `Planned vs actual` chart. Only one project detail section is shown at a time; clicking another project replaces the previous one.

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
