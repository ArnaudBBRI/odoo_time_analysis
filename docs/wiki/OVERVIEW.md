# Overview

The Odoo Time Dashboard compares actual timesheet hours with planned hours.
[index.html](../../index.html) contains its browser interface, styles, XLSX
reader, data transformations, and canvas charts in one file.

Two input paths exist:

- Open `index.html` directly and select local Odoo pivot-style XLSX exports.
  The browser reads the files and builds personal/project charts locally.
- Run [server.js](../../server.js) and open `http://127.0.0.1:8765/` to use
  the Odoo XML-RPC connector through local HTTP endpoints.

The dashboard includes personal actual/planned pies, remaining-hours tables,
project contribution/monthly/cumulative/planned-versus-actual charts, task
deadlines, milestones, work-package progress, and budget bar charts. It also
has a responsible-unit project listing and local chart PNG export. A sticky menu
combines year filters, Ormitters inclusion, and the default-Me / Whole Project
toggle for relevant hour views. Shared tasks, milestones/deadlines, and currency
budgets retain their baseline. Employee legend toggles control visible series.

The backend reads Odoo records and normalizes them for the browser. A guard
rejects RPC operations outside its read-only allowlist before network access. Local editable hour
overrides are held in browser memory. The repository has no package manifest,
bundler, database layer, or application deployment pipeline. See
[Build](BUILD.md), [Data Flow](DATA_FLOW.md), and
[PROJECT_RULES.md](../ai-context/PROJECT_RULES.md).

## Refresh

- Last refreshed: 2026-10-05.
- Source basis: `index.html`, `server.js`, `README.md`, and repository inventory.
- Limitations: includes the current working-tree dashboard; its preexisting
  edits and rendered behavior were not fully tested. Live Odoo was not contacted.
