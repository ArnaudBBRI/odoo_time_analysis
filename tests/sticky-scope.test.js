const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const projectName = "[10001] Example project";
const emptyProjectName = "[10002] Zero-hour project";
const employeeName = "Alex Example";

function loadDashboard(mockFetch, { allowedRoutes = ["/api/odoo/project-timesheets", "/api/odoo/project-planning"] } = {}) {
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "Dashboard inline script must exist");
  const bootstrap = "els.odooUrl.value = ODOO_DEFAULT_URL;";
  assert.equal(script.split(bootstrap).length, 2, "Test seam must precede the sole bootstrap");
  const instrumented = script.replace(bootstrap, `
    const completeRender = render;
    render = () => { globalThis.renderCalls += 1; };
    setTimesheetDebugStatus = () => {};
    setOdooButtonsDisabled = () => {};
    setDebugOutput = () => {};
    globalThis.dashboard = {
      state, els, monthFromKey, personKey, projectColorKey,
      getPersonalIdentity, recordMatchesPersonalIdentity, scopeProjectHours,
      getScopedOverview, getOverviewProjectNames, ensureWholeProjectHours,
      setHoursScope, setIncludeOrmittersHours,
      buildEmployeeDatasetFromApi, buildPersonalPlanDatasetFromApi,
      buildProjectDatasetFromApi, buildProjectPlanDatasetFromApi,
      buildDicoProjectListFromApi, aggregateNamedRows, buildWholeProjectMacroInfo,
      buildRemainingHoursScopeInfo, buildSubcontractorHoursNote, buildRemainingToDateTotals,
      fetchEmployeeTimesheets, fetchDicoProjects,
      captureRenderFeeds() {
        globalThis.renderFeeds = {};
        renderStatus = () => {};
        renderYearFilters = () => {};
        renderKpis = (...args) => { globalThis.renderFeeds.kpis = args; };
        renderEmployeePanel = (...args) => { globalThis.renderFeeds.overview = args; };
        renderProjectPanels = (...args) => { globalThis.renderFeeds.projects = args; };
        renderExpandedProjectPieOverlay = (...args) => { globalThis.renderFeeds.expanded = args; };
        completeRender();
        return globalThis.renderFeeds;
      }
    };
    return;
    ${bootstrap}`);
  const elements = new Map();
  const requests = [];
  const context = {
    renderCalls: 0,
    Date: class DashboardTestDate extends Date {
      constructor(...args) { super(...(args.length ? args : [new Date(2026, 9, 5, 12).getTime()])); }
      static now() { return new Date(2026, 9, 5, 12).getTime(); }
    },
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, {
          value: "", textContent: "", innerHTML: "", checked: false, hidden: false,
          classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {},
          querySelectorAll() { return []; }
        });
        return elements.get(id);
      }
    },
    async fetch(url, options) {
      assert.ok(allowedRoutes.includes(url),
        `Unexpected network route in offline test: ${url}`);
      assert.equal(options.method, "POST");
      const request = { url, payload: JSON.parse(options.body) };
      requests.push(request);
      if (!mockFetch) throw new Error("Offline scope test did not authorize a mocked request");
      return mockFetch(request);
    }
  };
  vm.runInNewContext(instrumented, context, { filename: "index.html" });
  const dashboard = context.dashboard;
  dashboard.state.years = [2026];
  dashboard.state.selectedYears = new Set([2026]);
  dashboard.els.timesheetEmployeeName.value = employeeName;
  return { dashboard, context, requests };
}

function line(employeeId, hours, isSubcontractor = false, name = employeeName, project = projectName) {
  return {
    id: employeeId, employeeId, employee: name, date: "2026-10-05", month: "2026-10",
    hours, project, projectId: project === projectName ? 101 : 102,
    employeeFunction: isSubcontractor ? "AI Consultant Ormit" : "Engineer",
    isSubcontractor, subcontractorClassification: "employee-function"
  };
}

function slot(employeeId, hours, isSubcontractor = false, name = employeeName) {
  return {
    id: employeeId, employeeId, employee: name, project: projectName, projectId: 101,
    start: "2026-10-01 00:00:00", end: "2026-10-02 00:00:00",
    startMonth: "2026-10", endMonth: "2026-10", hours,
    employeeFunction: isSubcontractor ? "AI Consultant" : "Engineer",
    isSubcontractor, subcontractorClassification: "employee-function"
  };
}

function projectMonthly(hours, name = projectName) {
  return [{ month: "2026-10", projects: [{ name, hours }] }];
}

function employeeMonthly(hours) {
  return [{ month: "2026-10", employees: [{ name: employeeName, hours }] }];
}

function fixtures() {
  const personalLine = line(11, 8);
  const personalSlot = slot(11, 6);
  const lines = [personalLine, line(22, 12, true), line(33, 20, false, "Drew Example")];
  const slots = [personalSlot, slot(22, 24, true)];
  return {
    personalActual: { ok: true, employeeName, monthly: projectMonthly(8), employeeMonthly: projectMonthly(8), lines: [personalLine] },
    personalPlan: { ok: true, employeeName, monthly: projectMonthly(6), employeeMonthly: projectMonthly(6), slots: [personalSlot] },
    projectActual: {
      ok: true, projectCode: "10001", projectName,
      monthly: [{ month: "2026-10", employees: [{ name: employeeName, hours: 20 }, { name: "Drew Example", hours: 20 }] }],
      employeeMonthly: [{ month: "2026-10", employees: [{ name: employeeName, hours: 8 }, { name: "Drew Example", hours: 20 }] }], lines
    },
    projectPlan: { ok: true, projectCode: "10001", projectName, monthly: employeeMonthly(30), employeeMonthly: employeeMonthly(6), slots },
    dico: {
      ok: true, projects: [{ id: 101, name: projectName }, { id: 102, name: emptyProjectName }],
      actualMonthly: projectMonthly(40), plannedMonthly: projectMonthly(30),
      employeeActualMonthly: projectMonthly(28), employeePlannedMonthly: projectMonthly(6),
      actualTotalHours: 40, plannedTotalHours: 30, lines, slots, warnings: []
    }
  };
}

function install(dashboard, data = fixtures()) {
  dashboard.state.employee = dashboard.buildEmployeeDatasetFromApi(data.personalActual);
  dashboard.state.personalPlan = dashboard.buildPersonalPlanDatasetFromApi(data.personalPlan);
  dashboard.state.projects = [dashboard.buildProjectDatasetFromApi(data.projectActual)];
  dashboard.state.plans = [dashboard.buildProjectPlanDatasetFromApi(data.projectPlan, dashboard.state.projects[0])];
  return data;
}

function total(dataset, keys = ["2026-10"]) {
  return dataset.rows.reduce((sum, row) => sum + keys.reduce((amount, key) => amount + (row.values.get(key) || 0), 0), 0);
}

function response(result) {
  return { ok: true, status: 200, json: async () => result };
}

test("sticky menu exposes Me and Whole Project scope and defaults to Me", () => {
  const { dashboard } = loadDashboard();
  assert.equal(dashboard.state.hoursScope, "me");
  assert.equal(dashboard.state.projectHoursCache.size, 0);
  for (const id of ["hoursScopeMe", "hoursScopeWhole", "hoursScopeStatus"]) {
    assert.equal((source.match(new RegExp(`id="${id}"`, "g")) || []).length, 1);
  }
  assert.equal((source.match(/id="yearChips"/g) || []).length, 1, "Year selection has one shared control");
  assert.equal((source.match(/id="remainingYearChips"/g) || []).length, 0);
  const menuStyle = source.match(/\.dashboard-menu\s*\{([^}]*)\}/)?.[1];
  assert.ok(menuStyle, "Sticky dashboard menu styling must exist");
  assert.match(menuStyle, /position:\s*sticky/);
  assert.ok(source.includes("Whole Project"));
});

test("Me identity matches employee IDs before same-name records and supports a renamed employee", () => {
  const { dashboard } = loadDashboard();
  install(dashboard);
  const identity = dashboard.getPersonalIdentity();
  assert.equal(identity.available, true);
  assert.ok(identity.ids.has("11"));
  assert.equal(dashboard.recordMatchesPersonalIdentity(line(11, 8, false, "Renamed employee"), identity), true);
  assert.equal(dashboard.recordMatchesPersonalIdentity(line(22, 12), identity), false,
    "Another employee with an identical display name must not enter Me hours");
  assert.equal(dashboard.recordMatchesPersonalIdentity(line(33, 20, false, "Drew Example"), identity), false);
});

test("Me project actual and planning series contain only the selected employee, while Whole Project preserves datasets", () => {
  const { dashboard } = loadDashboard();
  install(dashboard);
  const actual = dashboard.state.projects[0];
  const planned = dashboard.state.plans[0];
  const mineActual = dashboard.scopeProjectHours(actual);
  const minePlanned = dashboard.scopeProjectHours(planned, "slots");
  assert.equal(total(mineActual), 8);
  assert.equal(total(minePlanned), 6);
  assert.deepEqual(Array.from(mineActual.lines, (record) => record.employeeId), [11]);
  assert.deepEqual(Array.from(minePlanned.slots, (record) => record.employeeId), [11]);
  dashboard.state.hoursScope = "whole";
  assert.equal(dashboard.scopeProjectHours(actual), actual);
  assert.equal(dashboard.scopeProjectHours(planned, "slots"), planned);
  assert.equal(total(actual), 28);
});

test("full render sends scoped overview and project feeds to charts while preserving the shared task baseline", () => {
  const { dashboard } = loadDashboard();
  const data = install(dashboard);
  dashboard.state.dicoProjects = dashboard.buildDicoProjectListFromApi(data.dico);
  const baseline = dashboard.state.projects[0];
  const mine = dashboard.captureRenderFeeds();
  assert.equal(mine.kpis[0][0].value, 8);
  assert.equal(mine.overview[0][0].value, 8);
  assert.equal(mine.overview[1][0].value, 6);
  assert.match(mine.overview[3].scopeLabel, /^Me/);
  const mineSummary = mine.projects[0][0];
  assert.equal(total(mineSummary.project), 8);
  assert.equal(total(mineSummary.plan), 6);
  assert.deepEqual(Array.from(mineSummary.project.lines, (record) => record.employeeId), [11]);
  assert.equal(mineSummary.baselineProject, baseline);
  assert.equal(total(mineSummary.baselineProject), 28);
  assert.equal(mine.expanded[0], mine.projects[0]);

  dashboard.state.hoursScope = "whole";
  const whole = dashboard.captureRenderFeeds();
  assert.equal(whole.kpis[0].reduce((sum, entry) => sum + entry.value, 0), 28);
  assert.equal(whole.overview[0].reduce((sum, entry) => sum + entry.value, 0), 28);
  assert.match(whole.overview[3].scopeLabel, /^Whole Project/);
  assert.equal(whole.projects[0][0].project, baseline);
  assert.equal(total(whole.projects[0][0].project), 28);
  assert.equal(total(whole.projects[0][0].plan), 6);
  assert.equal(whole.projects[0][0].baselineProject, baseline);
});

test("Me project macro uses scoped ID records and keeps its overrides separate from whole-project values", () => {
  const { dashboard } = loadDashboard();
  install(dashboard);
  dashboard.setIncludeOrmittersHours(true);
  const project = dashboard.scopeProjectHours(dashboard.state.projects[0]);
  const plan = dashboard.scopeProjectHours(dashboard.state.plans[0], "slots");
  const mine = dashboard.buildWholeProjectMacroInfo(project, plan, null, true);
  assert.equal(mine.title, "My project plan");
  assert.equal(mine.plannedTotal, 6);
  assert.equal(mine.actualToDate, 8);
  assert.match(mine.overrideKey, /::employee::/);
  assert.match(mine.overrideKey, /::11(?:::|$)/);
  const whole = dashboard.buildWholeProjectMacroInfo(dashboard.state.projects[0], dashboard.state.plans[0], null, false);
  assert.equal(whole.plannedTotal, 30);
  assert.equal(whole.actualToDate, 40);
  assert.notEqual(mine.overrideKey, whole.overrideKey);
});

test("mixed API actuals and workbook planning fall back together instead of comparing Me to a team forecast", () => {
  const { dashboard } = loadDashboard();
  install(dashboard);
  dashboard.state.plans = [{
    source: "file", type: "planned", code: "10001", name: projectName,
    months: [dashboard.monthFromKey("2026-10")], timelineMonths: [dashboard.monthFromKey("2026-10")],
    rows: [{ name: employeeName, values: new Map([["2026-10", 30]]) }]
  }];
  const summary = dashboard.captureRenderFeeds().projects[0][0];
  assert.equal(summary.project.scopeFallback, true);
  assert.equal(summary.plan.scopeFallback, true);
  assert.equal(total(summary.project), 28);
  assert.equal(total(summary.plan), 30);
  assert.equal(summary.baselineProject, dashboard.state.projects[0]);
});

test("selected consultant identity survives default exclusion and its project remains discoverable", () => {
  const { dashboard } = loadDashboard();
  const consultant = line(11, 24, true, employeeName, emptyProjectName);
  dashboard.state.employee = dashboard.buildEmployeeDatasetFromApi({
    employeeName, monthly: projectMonthly(24, emptyProjectName), employeeMonthly: [], lines: [consultant]
  });
  assert.equal(dashboard.state.employee.rows.length, 0);
  assert.ok(dashboard.getPersonalIdentity().ids.has("11"));
  const names = Array.from(dashboard.getOverviewProjectNames(), (entry) => typeof entry === "string" ? entry : entry.name);
  assert.ok(names.includes(emptyProjectName), "Whole Project lookup must retain projects hidden by consultant exclusion");
  const project = dashboard.buildProjectDatasetFromApi({
    projectCode: "10002", projectName: emptyProjectName, monthly: employeeMonthly(32), employeeMonthly: employeeMonthly(8),
    lines: [consultant, line(22, 8, false, employeeName, emptyProjectName)]
  });
  assert.equal(total(dashboard.scopeProjectHours(project)), 0);
  dashboard.setIncludeOrmittersHours(true);
  const included = dashboard.buildProjectDatasetFromApi(project.sourceResult);
  assert.equal(total(dashboard.scopeProjectHours(included)), 24);
});

test("Me Dico overview retains zero projects and Whole Project uses the same Dico project list", () => {
  const { dashboard } = loadDashboard();
  const data = install(dashboard);
  dashboard.state.dicoProjects = dashboard.buildDicoProjectListFromApi(data.dico);
  const mine = dashboard.getScopedOverview();
  assert.equal(mine.keepZeroRows, true);
  assert.equal(total(mine.actual), 8);
  assert.equal(total(mine.planned), 6);
  assert.ok(Array.from(mine.actual.rows, (row) => row.name).includes(emptyProjectName));
  dashboard.state.hoursScope = "whole";
  const whole = dashboard.getScopedOverview();
  assert.equal(total(whole.actual), 28);
  assert.equal(total(whole.planned), 6);
  assert.equal(whole.actual.rows.length, mine.actual.rows.length);
});

test("Me planning allocation uses UTC month boundaries for a slot spanning September and October", () => {
  const { dashboard } = loadDashboard();
  install(dashboard);
  const own = { ...slot(11, 24), start: "2026-09-30 12:00:00", end: "2026-10-01 12:00:00", startMonth: "2026-09", endMonth: "2026-10" };
  const other = { ...slot(22, 99), start: "2026-10-01 00:00:00", end: "2026-10-02 00:00:00" };
  const planned = dashboard.buildProjectPlanDatasetFromApi({
    projectCode: "10001", projectName,
    monthly: [
      { month: "2026-09", employees: [{ name: employeeName, hours: 12 }] },
      { month: "2026-10", employees: [{ name: employeeName, hours: 111 }] }
    ],
    employeeMonthly: [
      { month: "2026-09", employees: [{ name: employeeName, hours: 12 }] },
      { month: "2026-10", employees: [{ name: employeeName, hours: 111 }] }
    ],
    slots: [own, other]
  });
  const scoped = dashboard.scopeProjectHours(planned, "slots");
  assert.equal(scoped.rows.length, 1);
  assert.equal(scoped.rows[0].values.get("2026-09"), 12);
  assert.equal(scoped.rows[0].values.get("2026-10"), 12);
  assert.equal(total(scoped, ["2026-09", "2026-10"]), 24);
  assert.equal(scoped.slots.length, 1);
});

test("signed actual credits survive project adapters, Me rows and Whole Project through-today totals", async () => {
  const data = fixtures();
  const signedLines = [line(11, 10), { ...line(11, -2), id: 112 }];
  data.personalActual = { ...data.personalActual, lines: signedLines };
  data.projectActual = { ...data.projectActual, lines: signedLines, monthly: employeeMonthly(8), employeeMonthly: employeeMonthly(8) };
  const { dashboard } = loadDashboard(({ url }) => response(url.endsWith("project-timesheets") ? data.projectActual : data.projectPlan));
  install(dashboard, data);
  const actual = dashboard.state.projects[0];
  assert.deepEqual(Array.from(actual.lines, (record) => record.hours), [10, -2]);
  assert.equal(total(actual), 8);
  assert.equal(total(dashboard.scopeProjectHours(actual)), 8);
  await dashboard.ensureWholeProjectHours();
  dashboard.state.hoursScope = "whole";
  const overview = dashboard.getScopedOverview();
  assert.equal(total(overview.actual), 8);
  const throughToday = dashboard.buildRemainingToDateTotals(overview.actual, overview.planned, new Date(2026, 9, 5, 12));
  assert.equal(throughToday.get(dashboard.projectColorKey(projectName)).actualToDate, 8);
});

test("unnamed employee records remain in Whole Project planning and actuals while Me retains only its identified employee", async () => {
  const data = fixtures();
  const unknownActual = { ...line(null, 12, false, ""), id: 112, employeeFunction: "", subcontractorClassification: "unknown" };
  const unknownPlan = { ...slot(null, 24, false, ""), id: 112, employeeFunction: "", subcontractorClassification: "unknown" };
  const summary = (own, unnamed) => [{ month: "2026-10", employees: [
    { name: employeeName, hours: own }, { name: "(No employee)", hours: unnamed }
  ] }];
  data.projectActual = { ...data.projectActual, lines: [line(11, 8), unknownActual], monthly: summary(8, 12), employeeMonthly: summary(8, 12) };
  data.projectPlan = { ...data.projectPlan, slots: [slot(11, 6), unknownPlan], monthly: summary(6, 24), employeeMonthly: summary(6, 24) };
  const { dashboard } = loadDashboard(({ url }) => response(url.endsWith("project-timesheets") ? data.projectActual : data.projectPlan));
  install(dashboard, data);
  assert.equal(dashboard.state.projects[0].lines.length, 2);
  assert.equal(dashboard.state.plans[0].slots.length, 2);
  assert.equal(dashboard.state.projects[0].lines[1].employee, "(No employee)");
  assert.equal(dashboard.state.plans[0].slots[1].employee, "(No employee)");
  assert.equal(total(dashboard.scopeProjectHours(dashboard.state.projects[0])), 8);
  assert.equal(total(dashboard.scopeProjectHours(dashboard.state.plans[0], "slots")), 6);
  await dashboard.ensureWholeProjectHours();
  dashboard.state.hoursScope = "whole";
  const overview = dashboard.getScopedOverview();
  assert.equal(total(overview.actual), 20);
  assert.equal(total(overview.planned), 30);
  const throughToday = dashboard.buildRemainingToDateTotals(overview.actual, overview.planned, new Date(2026, 9, 5, 12));
  const comparison = throughToday.get(dashboard.projectColorKey(projectName));
  assert.equal(comparison.actualToDate, 20);
  assert.equal(comparison.foreseenToDate, 30);
  const macro = dashboard.buildWholeProjectMacroInfo(dashboard.state.projects[0], dashboard.state.plans[0], null, false);
  assert.equal(macro.plannedTotal, 30);
  assert.equal(macro.actualToDate, 20);
});

test("Dico without a personal identity preserves baseline totals with an honest all-employees scope", () => {
  const { dashboard } = loadDashboard();
  dashboard.state.dicoProjects = dashboard.buildDicoProjectListFromApi(fixtures().dico);
  const overview = dashboard.getScopedOverview();
  assert.equal(total(overview.actual), 28);
  assert.match(overview.scopeLabel, /baseline.*all employees/i);
  assert.match(overview.message, /Fetch your employee hours/);
  assert.doesNotMatch(overview.scopeLabel, /^Me/);
});

test("unidentifiable workbook series retain their baseline with an explicit scope fallback", () => {
  const { dashboard } = loadDashboard();
  const workbook = {
    source: "file", type: "project", name: projectName,
    months: [dashboard.monthFromKey("2026-10")],
    rows: [{ name: employeeName, values: new Map([["2026-10", 18]]) }]
  };
  dashboard.els.timesheetEmployeeName.value = "";
  const scoped = dashboard.scopeProjectHours(workbook);
  assert.equal(total(scoped), 18);
  assert.equal(scoped.scopeFallback, true);
  assert.equal(workbook.scopeFallback, undefined, "Scope markers must not mutate source exports");
});

test("Whole Project reads only hour endpoints once and then serves the loaded cache", async () => {
  const data = fixtures();
  const { dashboard, requests } = loadDashboard(({ url }) => response(url.endsWith("project-timesheets") ? data.projectActual : data.projectPlan));
  install(dashboard, data);
  await dashboard.ensureWholeProjectHours();
  assert.equal(requests.length, 2);
  assert.equal(dashboard.state.projectHoursCache.size, 1);
  await dashboard.ensureWholeProjectHours();
  assert.equal(requests.length, 2, "Completed full-project reads must be reused");
  dashboard.state.hoursScope = "whole";
  const overview = dashboard.getScopedOverview();
  assert.equal(overview.unavailable, false);
  assert.equal(total(overview.actual), 28);
  assert.equal(total(overview.planned), 6);
});

test("Whole Project loads every inclusive personal project, including a project hidden by consultant filtering", async () => {
  const data = fixtures();
  const hiddenConsultant = line(11, 24, true, employeeName, emptyProjectName);
  data.personalActual.monthly[0].projects.push({ name: emptyProjectName, hours: 24 });
  data.personalActual.lines.push(hiddenConsultant);
  const secondActual = {
    ok: true, projectCode: "10002", projectName: emptyProjectName,
    monthly: employeeMonthly(10), employeeMonthly: employeeMonthly(10),
    lines: [line(33, 10, false, "Drew Example", emptyProjectName)]
  };
  const secondPlan = {
    ok: true, projectCode: "10002", projectName: emptyProjectName,
    monthly: employeeMonthly(5), employeeMonthly: employeeMonthly(5),
    slots: [{ ...slot(33, 5, false, "Drew Example"), project: emptyProjectName }]
  };
  const { dashboard, requests } = loadDashboard(({ url, payload }) => response(
    payload.projectCode === "10002"
      ? (url.endsWith("project-timesheets") ? secondActual : secondPlan)
      : (url.endsWith("project-timesheets") ? data.projectActual : data.projectPlan)
  ));
  install(dashboard, data);
  assert.equal(dashboard.state.employee.rows.length, 1, "The consultant-only personal project is initially hidden");
  await dashboard.ensureWholeProjectHours();
  assert.equal(requests.length, 4);
  assert.deepEqual(Array.from(new Set(requests.map((request) => request.payload.projectCode))).sort(), ["10001", "10002"]);
  dashboard.state.hoursScope = "whole";
  const overview = dashboard.getScopedOverview();
  assert.equal(overview.unavailable, false);
  assert.equal(total(overview.actual), 38);
  assert.equal(total(overview.planned), 11);
  assert.deepEqual(Array.from(overview.projects).sort(), [projectName, emptyProjectName].sort());
});

test("Whole Project skips unassigned hours in its overview and read queue while loading assigned projects", async () => {
  const data = fixtures();
  data.personalActual.monthly[0].projects.push({ name: "(No project)", hours: 9 });
  data.personalActual.employeeMonthly[0].projects.push({ name: "(No project)", hours: 9 });
  data.personalActual.lines.push({ ...line(11, 9), project: "", projectId: null });
  const { dashboard, requests } = loadDashboard(({ url }) => response(url.endsWith("project-timesheets") ? data.projectActual : data.projectPlan));
  install(dashboard, data);
  assert.ok(Array.from(dashboard.getOverviewProjectNames()).includes("(No project)"), "Me retains the unassigned bucket");
  await dashboard.setHoursScope("whole");
  const overview = dashboard.getScopedOverview();
  assert.equal(requests.length, 2);
  assert.ok(requests.every((request) => request.payload.projectCode === "10001"));
  assert.deepEqual(Array.from(overview.projects), [projectName]);
  assert.equal(total(overview.actual), 28);
  assert.ok(!overview.actual.rows.some((row) => row.name === "(No project)"));
  assert.match(overview.message, /Unassigned hours.*Me/i);
});

test("an unassigned-only Whole Project view cannot substitute the Me hours", async () => {
  const { dashboard, requests } = loadDashboard();
  dashboard.state.employee = dashboard.buildEmployeeDatasetFromApi({
    employeeName, monthly: projectMonthly(9, "(No project)"), employeeMonthly: projectMonthly(9, "(No project)"),
    lines: [{ ...line(11, 9), project: "", projectId: null }]
  });
  assert.equal(total(dashboard.getScopedOverview().actual), 9);
  await dashboard.setHoursScope("whole");
  const overview = dashboard.getScopedOverview();
  assert.equal(requests.length, 0);
  assert.equal(overview.projects.length, 0);
  assert.equal(overview.actual, null);
  assert.equal(overview.planned, null);
  assert.match(overview.scopeLabel, /^Whole Project/);
  assert.match(overview.message, /Unassigned hours.*Me/i);
});

test("simultaneous Whole Project requests share one in-progress pair of read calls", async () => {
  const pending = [];
  const data = fixtures();
  const { dashboard, requests } = loadDashboard(({ url }) => new Promise((resolve) => pending.push(() => resolve(response(
    url.endsWith("project-timesheets") ? data.projectActual : data.projectPlan
  )))));
  install(dashboard, data);
  const first = dashboard.ensureWholeProjectHours();
  const second = dashboard.ensureWholeProjectHours();
  assert.equal(requests.length, 2);
  pending.forEach((resolve) => resolve());
  await Promise.all([first, second]);
  assert.equal(dashboard.state.projectHoursCache.size, 1);
  assert.equal(dashboard.state.wholeProjectHoursLoading, false);
});

test("legacy whole-project cache retains monthly totals and exposes unavailable consultant filtering", async () => {
  const data = fixtures();
  const legacyActual = { ...data.projectActual };
  const legacyPlan = { ...data.projectPlan };
  delete legacyActual.employeeMonthly;
  delete legacyActual.lines;
  delete legacyPlan.employeeMonthly;
  delete legacyPlan.slots;
  const { dashboard } = loadDashboard(({ url }) => response(url.endsWith("project-timesheets") ? legacyActual : legacyPlan));
  install(dashboard, data);
  await dashboard.ensureWholeProjectHours();
  dashboard.state.hoursScope = "whole";
  const overview = dashboard.getScopedOverview();
  assert.equal(overview.unavailable, false);
  assert.equal(total(overview.actual), 40);
  assert.equal(total(overview.planned), 30);
  assert.equal(overview.actual.lines, undefined, "Missing raw actuals must allow the disclosed monthly fallback");
  assert.equal(overview.planned.slots, undefined);
  assert.equal(dashboard.buildRemainingHoursScopeInfo().filteringAvailable, false);
  assert.match(dashboard.buildSubcontractorHoursNote(), /^Filter unavailable/i);
  dashboard.setIncludeOrmittersHours(true);
  assert.equal(total(dashboard.getScopedOverview().actual), 40);
  assert.equal(total(dashboard.getScopedOverview().planned), 30);
});

test("failed Whole Project reads never present Me totals as complete project totals", async () => {
  const { dashboard } = loadDashboard(() => response({ ok: false, error: "Mocked project unavailable" }));
  install(dashboard);
  await dashboard.ensureWholeProjectHours();
  dashboard.state.hoursScope = "whole";
  const overview = dashboard.getScopedOverview();
  assert.equal(overview.unavailable, true);
  assert.match(overview.message, /unavailable|failed|Mocked/i);
  assert.ok(!overview.actual || total(overview.actual) === 0,
    "An unavailable whole-project view must not substitute personal hours");
});

test("responses from an obsolete cache generation cannot install into the replacement cache", async () => {
  const pending = [];
  const data = fixtures();
  const { dashboard, requests } = loadDashboard(({ url }) => new Promise((resolve) => pending.push(() => resolve(response(
    url.endsWith("project-timesheets") ? data.projectActual : data.projectPlan
  )))));
  install(dashboard, data);
  const operation = dashboard.ensureWholeProjectHours();
  assert.equal(requests.length, 2);
  dashboard.state.hoursCacheGeneration += 1;
  dashboard.state.projectHoursCache = new Map();
  pending.forEach((resolve) => resolve());
  await operation;
  assert.equal(dashboard.state.projectHoursCache.size, 0);
});

test("an employee response from an obsolete connector generation cannot replace current datasets", async () => {
  const pending = [];
  const data = fixtures();
  const { dashboard } = loadDashboard(({ url }) => new Promise((resolve) => pending.push(() => resolve(response(
    url.endsWith("employee-timesheets") ? data.personalActual : data.personalPlan
  )))), { allowedRoutes: ["/api/odoo/employee-timesheets", "/api/odoo/employee-planning"] });
  install(dashboard, data);
  const previousEmployee = dashboard.state.employee;
  const previousProjects = dashboard.state.projects;
  const fetchOperation = dashboard.fetchEmployeeTimesheets();
  assert.equal(pending.length, 2);
  dashboard.state.hoursCacheGeneration += 1;
  pending.forEach((resolve) => resolve());
  await fetchOperation;
  assert.equal(dashboard.state.employee, previousEmployee);
  assert.equal(dashboard.state.projects, previousProjects);
});

test("a Dico response from an obsolete connector generation cannot replace the current overview", async () => {
  let finishResponse;
  const data = fixtures();
  const { dashboard } = loadDashboard(() => new Promise((resolve) => { finishResponse = () => resolve(response(data.dico)); }),
    { allowedRoutes: ["/api/odoo/dico-projects"] });
  dashboard.state.dicoProjects = dashboard.buildDicoProjectListFromApi(data.dico);
  const previousDico = dashboard.state.dicoProjects;
  const fetchOperation = dashboard.fetchDicoProjects();
  dashboard.state.hoursCacheGeneration += 1;
  finishResponse();
  await fetchOperation;
  assert.equal(dashboard.state.dicoProjects, previousDico);
});

test("installing fetched employee data invalidates old project loads started during that employee fetch", async () => {
  const pending = new Map();
  const data = fixtures();
  const { dashboard } = loadDashboard(({ url }) => new Promise((resolve) => pending.set(url, () => resolve(response(
    url.endsWith("employee-timesheets") ? data.personalActual : url.endsWith("employee-planning") ? data.personalPlan :
      url.endsWith("project-timesheets") ? data.projectActual : data.projectPlan
  )))), { allowedRoutes: [
    "/api/odoo/employee-timesheets", "/api/odoo/employee-planning", "/api/odoo/project-timesheets", "/api/odoo/project-planning"
  ] });
  install(dashboard, data);
  const employeeOperation = dashboard.fetchEmployeeTimesheets();
  const intermediateGeneration = dashboard.state.hoursCacheGeneration;
  const projectOperation = dashboard.ensureWholeProjectHours();
  pending.get("/api/odoo/employee-timesheets")();
  pending.get("/api/odoo/employee-planning")();
  await employeeOperation;
  assert.ok(dashboard.state.hoursCacheGeneration > intermediateGeneration);
  pending.get("/api/odoo/project-timesheets")();
  pending.get("/api/odoo/project-planning")();
  await projectOperation;
  assert.equal(dashboard.state.projectHoursCache.size, 0);
  assert.equal(dashboard.state.employee.sourceResult, data.personalActual);
});

test("scope changes preserve selected years, consultant inclusion and chart visibility", async () => {
  const data = fixtures();
  const { dashboard, context } = loadDashboard(({ url }) => response(url.endsWith("project-timesheets") ? data.projectActual : data.projectPlan));
  install(dashboard, data);
  dashboard.setIncludeOrmittersHours(true);
  const selectedYears = dashboard.state.selectedYears = new Set([2026]);
  const hidden = dashboard.state.hiddenSeries = new Map([["chart", new Set([employeeName])]]);
  const overrides = dashboard.state.projectMacroOverrides = new Map([["saved", { actualHours: 17 }]]);
  await dashboard.setHoursScope("whole");
  assert.equal(dashboard.state.hoursScope, "whole");
  assert.equal(dashboard.state.includeOrmittersHours, true);
  assert.deepEqual(Array.from(dashboard.state.selectedYears), Array.from(selectedYears));
  assert.equal(dashboard.state.hiddenSeries, hidden);
  assert.equal(dashboard.state.projectMacroOverrides, overrides);
  assert.equal(total(dashboard.getScopedOverview().actual), 40);
  await dashboard.setHoursScope("me");
  assert.equal(dashboard.state.hoursScope, "me");
  assert.deepEqual(Array.from(dashboard.state.selectedYears), Array.from(selectedYears));
  assert.equal(dashboard.state.includeOrmittersHours, true);
  assert.equal(total(dashboard.getScopedOverview().actual), 8);
  assert.ok(context.renderCalls > 0);
});
