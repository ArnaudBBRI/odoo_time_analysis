const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../steering");
const service = require("../steering-service");
const UI = require("../steering-client");
const { fixtureRpc, config } = require("./steering-fixture");

test("scoped portfolio preserves actual authority, nulls, leader identity and zero-hour projects", async () => {
  const rpc = fixtureRpc(), result = await service.load(config, rpc, 7);
  assert.equal(result.projects.length, 2);
  const p = result.projects[0];
  assert.equal(p.hours.actual, 120); assert.equal(p.hours.remainingConvention, -20); assert.equal(p.hours.remainingPlan, -40);
  assert.equal(p.isLeader, true); assert.equal(result.projects[1].isLeader, false);
  assert.equal(p.hours.horizonCoversEnd, false);
  assert.equal(result.projects[1].hours.convention, 0);
  assert.equal(result.unitSummary.metrics.actual.value, 120);
  assert.equal(result.programmeSummaries[0].metrics.actual.value, 120);
  const projectRead = rpc.calls.find(call => call.model === "project.project" && call.method === "search_read");
  assert.deepEqual(projectRead.domain, config.unitDomain);
  for (const call of rpc.calls.filter(call => call.method === "search_read" && !["project.project", "budget.line"].includes(call.model))) assert.deepEqual(call.domain, [["project_id", "in", [11, 12]]]);
  assert.ok(!rpc.calls.some(call => call.model === "account.analytic.line" || call.method === "read_group"));
});

test("no collection before confirmed scope; unknown and dotted scope fields fail closed", async () => {
  const rpc = fixtureRpc();
  const disabled = await service.load({}, rpc, 7);
  assert.equal(disabled.enabled, false); assert.equal(rpc.calls.filter(c => c.method !== "fields_get").length, 0);
  assert.equal((await service.metadata({ ...config, unitDomain: [["unknown", "=", 4]] }, rpc)).enabled, false);
  assert.equal((await service.metadata({ ...config, unitDomain: [["x_unit_id.name", "in", ["DiCo"]]] }, rpc)).enabled, true);
  assert.equal((await service.metadata({ ...config, unitDomain: ["|", ["x_unit_id", "=", 4]] }, rpc)).enabled, false);
});

test("detail distinguishes partial timesheets from reconciled Progress and gates WP", async () => {
  const rpc = fixtureRpc(), result = await service.load(config, rpc, 7, 11), p = result.project;
  assert.equal(p.diagnostic.visibleActual, 30); assert.equal(p.diagnostic.visibleCoverage, 25);
  assert.equal(p.diagnostic.progressStatus, "reconciled"); assert.equal(p.people[0].actual, 120);
  assert.equal(p.workPackages.status, "available"); assert.equal(p.workPackages.rows[0].convention, 100);
  const groups = rpc.calls.filter(call => call.method === "read_group");
  assert.equal(groups.length, 2);
  for (const call of groups) {
    assert.equal(call.model, S.PROGRESS_MODEL); assert.deepEqual(call.domain, [["project_id", "in", [11]]]);
    assert.deepEqual(call.kwargs.fields, ["effective_hours:sum", "allocated_hours:sum", "convention_time:sum"]);
    assert.equal(call.kwargs.lazy, false);
    assert.ok(!JSON.stringify(call).includes("cost"));
  }
  const divergent = (await service.load(config, fixtureRpc({ divergent: true }), 7, 11)).project;
  assert.equal(divergent.diagnostic.progressStatus, "not-reconciled");
  assert.ok(divergent.people.every(p => p.actual === null)); assert.equal(divergent.population, null); assert.equal(divergent.workPackages.status, "unavailable");
});

test("permission failure leaves source unknown without erasing other sections", async () => {
  const result = await service.load(config, fixtureRpc({ denied: "planning.slot" }), 7, 11);
  assert.equal(result.project.hours.planned, null); assert.equal(result.project.hours.remainingPlan, null);
  assert.equal(result.project.hours.actual, 120); assert.equal(result.project.population, null);
  assert.ok(!JSON.stringify(result).includes("secret upstream"));
});

test("multiple programme assignments are excluded from programmes and retained in unit", async () => {
  const result = await service.load({ ...config, programmes: [...config.programmes, { id: "second", name: "Deuxième", projectIds: [11, 11] }] }, fixtureRpc(), 7);
  assert.equal(result.projects[0].assignment.status, "multiple");
  assert.equal(result.unitSummary.metrics.actual.value, 120);
  assert.ok(result.programmeSummaries.every(p => p.metrics.actual.value === null));
  assert.throws(() => service.validateProgrammes([{ id: "x", name: "X", projectIds: ["11"] }]));
});

test("dated planning and staffing split calendar duration; missing dates stay unknown", () => {
  const split = S.splitPeriod("2026-01-01 00:00:00", "2026-01-03 00:00:00", 48, Date.parse("2026-01-02T00:00:00Z"));
  assert.equal(split.elapsed, 24); assert.equal(split.future, 24);
  assert.equal(S.splitPeriod(false, false, 48, Date.now()).elapsed, null);
  assert.equal(S.splitPeriod("2026-01-02", "2026-01-01", 48, Date.now()).future, null);
  assert.equal(S.ratio(10, 0), null);
  assert.equal(S.timestamp("2026-02-30"), null);
});

test("budget periods/currencies remain separate; command and consumption never add", () => {
  const parent = { id: 1, budget_template: "annual", date_from: "2026-01-01", date_to: "2026-12-31", budget_line_ids: [2, 3], currency_id: [1, "EUR"], sum_of_budgeted_amount: 100, sum_accounts_60: 1000, sum_accounts_61: 0, sum_accounts_63: 0, sum_accounts_64: 0, sum_accounts_65: 0 };
  const lines = { status: "available", rows: [
    { id: 2, x_plan8_id: [6, "6000 Personnel"], currency_id: [1, "EUR"], budget_amount: 1000, achieved_amount: 200, committed_amount: 500, on_approval: 10, balance: 500 },
    { id: 3, x_plan8_id: [7, "7000 Recettes"], currency_id: [1, "EUR"], budget_amount: 1100, achieved_amount: 100, committed_amount: 0, on_approval: 0, balance: 1000 }
  ] };
  const [budget] = S.buildBudgets([parent], lines, "2026-06-01T00:00:00Z");
  assert.equal(budget.totals.budgeted, 1000); assert.equal(budget.totals.committed, 500); assert.equal(budget.totals.consumed, 200); assert.equal(budget.quality, "reconciled");
  const projects = [{ id: 1, hours: { actual: 10, convention: 20 }, budgets: [budget], qualities: [], warnings: [] }, { id: 2, hours: { actual: 30, convention: 100 }, budgets: [{ ...budget, start: "2027-01-01", end: "2027-12-31" }], qualities: [], warnings: [] }, { id: 3, hours: { actual: null, convention: 1000 }, budgets: [{ ...budget, currencyId: 2, currency: "USD" }], qualities: [], warnings: [] }];
  const summary = S.consolidate(projects);
  assert.equal(summary.budgets.length, 3); assert.equal(summary.metrics.actual.value, 40); assert.equal(summary.metrics.actual.covered, 2);
  assert.equal(summary.metrics.consumption.value, 33.3333); assert.deepEqual(summary.metrics.consumption.projectIds, [1, 2]);
  assert.equal(S.buildBudgets([parent], { ...lines, rows: [lines.rows[0]] }, "2026-01-01T00:00:00Z")[0].totals.budgeted, null);
  const missingControl = S.buildBudgets([{ ...parent, sum_accounts_60: undefined }], lines, "2026-01-01T00:00:00Z")[0];
  assert.equal(missingControl.quality, "not-checkable");
  const duplicates = S.consolidate([{ ...projects[0], budgets: [budget, budget] }]);
  assert.equal(duplicates.budgets[0].totals.budgeted, null); assert.deepEqual(duplicates.budgets[0].ambiguousProjectIds, [1]);
});

test("WP periods, identities and unmapped hours must all pass", async () => {
  const original = (await service.load(config, fixtureRpc(), 7, 11)).project;
  const dataset = { progress: { rows: [{ project_id: [11, "P"], effective_hours: 120, allocated_hours: 80, convention_time: 100 }] }, tasks: { status: "available", rows: [{ id: 40, project_id: [11, "P"], is_work_package: true }] }, wpProgress: { status: "available", rows: [{ project_id: [11, "P"], task_id: [40, "WP"], effective_hours: 120, allocated_hours: 80, convention_time: 100 }] } };
  assert.equal(S.buildWorkPackages(original, dataset, "task_id", { is_work_package: { type: "boolean" } }, true).status, "unavailable");
  dataset.tasks.rows[0].date_start = "2026-01-01"; dataset.tasks.rows[0].date_end = "2026-12-31";
  dataset.wpProgress.rows.push({ project_id: [11, "P"], task_id: false, effective_hours: 1, allocated_hours: 0, convention_time: 0 });
  assert.match(S.buildWorkPackages(original, dataset, "task_id", { is_work_package: { type: "boolean" } }, true).reason, /non affectées/);
});

test("filters include unknown dates, exact leader identity and programme anomalies; render escapes names", async () => {
  const result = await service.load(config, fixtureRpc(), 7);
  assert.deepEqual(UI.filterProjects(result.projects, { leader: true }).map(p => p.id), [11]);
  assert.deepEqual(UI.filterProjects(result.projects, { programme: "__unassigned" }).map(p => p.id), [12]);
  assert.equal(UI.filterProjects(result.projects, { period: "2027" }).length, 1);
  assert.equal(UI.filterProjects([{ ...result.projects[0], start: null, end: null }], { period: "2027" }).length, 1);
  assert.match(UI.projectTable([{ ...result.projects[0], name: '<script>bad</script>' }], []), /&lt;script&gt;/);
  assert.match(UI.cards(result.unitSummary), /data-contributors="11,12"/);
  assert.match(UI.detailBody((await service.load(config, fixtureRpc(), 7, 11)).project, "resources"), /WP 40/);
});
