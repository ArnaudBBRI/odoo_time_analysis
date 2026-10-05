# Known Issues

## Verification Gaps

- Live Odoo responses, access rights, and custom model behavior were not tested
  during framework adoption. Safety checks must remain offline.
- Browser rendering and the user's existing dashboard changes were not fully
  exercised by this task.
- The remaining-table improvement has offline calculation/markup coverage, but
  the local browser preview was blocked by the browser URL policy. Visual layout
  remains unverified in this session.
- Employee-function filtering has offline mocked API/dashboard coverage; live
  `hr.employee`/`hr.employee.public` permissions and field availability remain
  unverified. Classification uses current functions, not a historical timeline.
- Unknown employee functions and workbook aggregates remain included with UI
  notices. Task actuals are unavailable if known subcontractor hours cannot be
  assigned to tasks and the only alternative is an inclusive task aggregate.
- Already-loaded browser data does not gain role metadata after a server
  restart. Reload/refetch it. Me / Whole Project now controls relevant hour
  views together; Dico changes the overview's project list. Scope and filtering
  availability are explicitly labeled.
- Sticky controls and scope calculations passed final offline review;
  rendered menu dimensions/interactions remain unverified. Missing fetched
  employee identity or insufficient export records show shared baseline data
  with a notice. Whole-project overview requires readable timesheet/planning
  responses for every listed project; failures are shown and can be retried.
- Optional hook installation does not prove automatic execution or assistant
  instruction loading; environments may require their own hook trust setting.

## Areas Requiring Care

- Preserve preexisting uncommitted work in `index.html`.
- Odoo budget and work-package fields are discovered dynamically; schema changes
  can affect interpretation. Review response fixtures before changing mappings.
- Managed framework files now include project-specific safety additions.
  Future upstream installers report these differences as conflicts. Merge
  deliberately and retain [PROJECT_RULES.md](PROJECT_RULES.md); see
  [FRAMEWORK_ADOPTION.md](FRAMEWORK_ADOPTION.md).
