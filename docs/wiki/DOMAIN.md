# Domain

| Concept | Representation in the application |
| --- | --- |
| Actual time | Odoo `account.analytic.line`: date, `unit_amount` hours, employee/project/task relations, and description; also accepted from pivot XLSX. |
| Planned time | Odoo `planning.slot`: start/end, allocated hours or duration/percentage fallback, employee/resource and project-related fields; also accepted from planning XLSX. |
| Project | Odoo `project.project` or an export label. Matching/colors prefer a bracketed numeric code and fall back to normalized names. |
| Employee | Timesheet employee or planning employee/resource display name; project charts group hours by person. |
| Subcontractor hours | Hour records whose current employee job title or job position exactly matches `AI Consultant` or `AI Consultant Ormit`, after case/whitespace normalization. |
| Work package | Detected `project.task` records with dates, planned/spent/remaining hours, and progress fields selected from metadata and known names. |
| Milestone/deadline | Dated `project.milestone` records or per-project task-deadline XLSX counts; drawn as chart markers. |
| Budget | Discovered budget models/lines classified as convention or annual. Amount categories: budgeted, engaged, consumed, ordered, under review. |
| Dico projects | Projects matching `RESEARCH AND DEVELOPMENT / DIGITAL CONSTRUCTION UNIT`; shown with project-level actual/planned totals. |
| Time scope | Available months grouped into selectable years, plus All. |
| Employee scope | Sticky Me / Whole Project control; Me uses identities from fetched personal records, while Whole Project uses all employees' hours on the same listed projects. |
| Remaining-table comparison | Foreseen and actual hours through the end of today within selected years, shown as two horizontal bars. Each pair uses its own larger value as 100% width. |

The browser excludes `Interne`/`Internal` rows from displayed personal totals.
Actual monthly totals accumulate into cumulative project lines. API planning
hours are allocated by interval overlap with each month; pivot planning values
represent effort between successive end-date columns and are distributed
linearly. These calculation rules are implemented in code.

Budget charts include convention and current/past annual budgets; future annual
budgets are excluded. Lines need positive budgeted amounts to render. Personnel
lines are hidden by default, and budget charts default to logarithmic scale.
Local planned/actual hour overrides affect browser progress calculations and
do not submit changes to Odoo. Override keys distinguish employee-only and
subcontractor-inclusive modes and personal/whole-project scope, preserving
separate local values.

`Include Ormitters hours` is enabled and unchecked initially. Classified
subcontractor actual and planning records are excluded from API-backed hour
charts, tables, remaining comparisons, and hour-consumption calculations by
default. Checking it includes them. Current HR function metadata takes precedence
over planning roles; planning roles are a disclosed fallback when HR function
is unavailable. No historical function timeline is read. Unknown functions and
workbook exports remain included, with a scope notice; legacy API results show
a server-restart/refetch notice. Classification uses employee IDs rather than
display-name guesses.

Task consumption sums surviving task-linked actuals in the selected years. An
empty filtered set with original task coverage gives zero consumption. When
excluded actuals have no task links, task actual/consumption values become
unavailable instead of using inclusive aggregates. Static task planned-hour
budgets and monetary budget charts are unchanged by the inclusion checkbox.
The Me / Whole Project control leaves the entire task view, milestones/deadlines,
and currency budgets at the shared project baseline. Year and Ormitters filters
continue to apply where supported.

The remaining-table actual bar uses absolute deviation from foreseen: green up
to 10%, orange above 10% through 25%, red above 25%. A zero forecast with positive
actual hours is red; both zero values yield empty bars. Numeric scope totals and
project drilldown remain separate from the through-today bar amounts.

The sticky menu combines year filters, Ormitters inclusion, and employee scope.
Me is selected initially. Overview pies, Remaining, hour totals, project
contribution/trend/planning charts, progress, and expanded/exported pies use the
selected population. Selecting Dico changes the overview project list and
retains Me / Whole Project. Project detail selection preserves that scope.
Personal identities prefer employee IDs from fetched personal records, using
exact normalized names only when IDs are absent. Missing identity or insufficient
workbook records yield a disclosed shared baseline. Whole Project lazily reads
missing listed projects' actual/planning records and caches them in memory.
If either actual or planning cannot support Me, the project pair uses the shared
baseline together. Signed actual credits and unnamed employee contributions
remain in project totals. The `(No project)` personal bucket is retained in Me
and omitted from the assigned-project Whole Project overview with a notice.

A visible Remaining label identifies scope and reports classified consultant
hours for the selected years, excluding Internal projects and netting actual credits.
Missing employee summaries lead with a highlighted unavailable-filter message
rather than claiming that legacy data has been filtered. Dico-only data can
render the table without personal datasets.

## Refresh

- Last refreshed: 2026-10-05.
- Source basis: normalization, function enrichment, allocation, budget
  classification, and task field helpers in `server.js`; parser, matching,
  inclusion/employee scope, sticky controls, charts, task scoping, and overrides
  in `index.html`.
- Limitations: business meanings/custom-field mappings are source-derived;
  no records, private workbooks, or live schema were checked.
