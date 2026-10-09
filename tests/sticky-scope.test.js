const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const projectName = "[10001] Example project";
const emptyProjectName = "[10002] Zero-hour project";
const employeeName = "Alex Example";

function loadDashboard(mockFetch, { allowedRoutes = ["/api/odoo/project-timesheets", "/api/odoo/project-planning"],
  legacyScope = true, personalTime = false } = {}) {
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "Dashboard inline script must exist");
  const bootstrap = "const originalFetch = window.fetch.bind(window);";
  assert.equal(script.split(bootstrap).length, 2, "Test seam must precede the sole bootstrap");
  const viewChange = script.match(/window\.addEventListener\("dashboard:viewchange", \(event\) => \{([\s\S]*?)\n      \}\);/)?.[1];
  assert.ok(viewChange, "The dashboard must retain a shared view-change handler");
  const instrumented = script.replace(bootstrap, `
    const completeRender = render;
    render = () => { globalThis.renderCalls += 1; };
    setTimesheetDebugStatus = () => {};
    setOdooButtonsDisabled = () => {};
    setDebugOutput = () => {};
    ${legacyScope ? 'state.hoursScope = "me";' : ''}
    globalThis.dashboard = {
      state, els, monthFromKey, personKey, projectColorKey,
      getPersonalIdentity, recordMatchesPersonalIdentity, scopeProjectHours,
      getScopedOverview, getOverviewProjectNames, ensureWholeProjectHours,
      setHoursScope, setIncludeOrmittersHours,
      buildEmployeeDatasetFromApi, buildPersonalPlanDatasetFromApi,
      buildProjectDatasetFromApi, buildProjectPlanDatasetFromApi,
      buildDicoProjectListFromApi, aggregateNamedRows, buildWholeProjectMacroInfo,
      buildRemainingHoursScopeInfo, renderRemainingHoursScope, buildSubcontractorHoursNote, buildRemainingToDateTotals,
      fetchEmployeeTimesheets, fetchDicoProjects, fetchPersonalTime, renderPersonalTimeMacro,
      refreshYears, toggleSelectedYear, selectAllYears,
      getScopedPersonalProjects, renderPersonalProjects, choosePersonalProject, clearPersonalProject,
      summarizePersonalProjectHours, summarizeLifetimeProjectHours, loadPersonalProjectHours, setPersonalProjectOrmitters, hasProjectOrmitters,
      loadPersonalProjectFinance, setPersonalProjectView, setPersonalProjectConvention, setPersonalProjectExcludeOrmitterCosts, updatePersonalProjectFilterVisibility,
      applyViewChange(event) { ${viewChange} },
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
  if (personalTime) {
    const module = require("../personal-time");
    context.personalRenders = [];
    context.projectBrowserRenders = [];
    context.window = { PersonalTime: { ...module,
      summarizeProjects(data, years, now = new Date("2026-10-05T10:00:00Z")) { return module.summarizeProjects(data, years, now); },
      calendarProgress(years, now = new Date("2026-10-05T10:00:00Z")) { return module.calendarProgress(years, now); },
      render(container, projects, options) { context.personalRenders.push({ container, projects, options }); }
    }, ProjectMonthly: require("../project-monthly"),
    ProjectBrowser: { render(container, options) { context.projectBrowserRenders.push({ container, options }); } } };
  }
  vm.runInNewContext(instrumented, context, { filename: "index.html" });
  const dashboard = context.dashboard;
  dashboard.state.years = [2026];
  dashboard.state.selectedYears = new Set([2026]);
  dashboard.els.timesheetEmployeeName = {value: employeeName};
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

function personalResult() {
  const fixture = fixtures();
  return {
    ok: true, uid: 7, employee: { ids: [11], resourceIds: [111], name: employeeName },
    projects: [{ id: 101, name: projectName }],
    timesheets: fixture.personalActual, planning: fixture.personalPlan, planningError: null
  };
}

function projectHoursResult(id = 101) {
  const data = fixtures();
  const name = id === 101 ? projectName : emptyProjectName;
  return {
    ok: true, uid: 7, project: { id, name },
    employee: { ids: [11], resourceIds: [111], name: employeeName },
    timesheets: { ...data.projectActual, lines: data.projectActual.lines.map(row => ({ ...row, projectId: id, project: name })) },
    planning: { ...data.projectPlan, slots: data.projectPlan.slots.map(row => ({ ...row, projectId: id, project: name })) },
    planningError: null, warnings: []
  };
}

function projectFinanceResult(id = 101) {
  return { ok: true, project: { id, name: id === 101 ? projectName : emptyProjectName },
    macro: {}, conventions: [{ id: 501, budgetedTotal: 12000 }],
    annual: [{ id: 601, startDate: "2027-01-01", endDate: "2027-12-31", totals: { budgeted: 4000 } }],
    lifetime: { status: "available", consumed: 3000 } };
}

test("project Budget switch reads lazily, hides irrelevant years and retains independent cached hours", async () => {
  const { dashboard, requests, context } = loadDashboard(({ url }) => response(
    url.endsWith("project-finance") ? projectFinanceResult() : projectHoursResult()),
  { personalTime: true, allowedRoutes: ["/api/odoo/project-hours", "/api/odoo/project-finance"] });
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.dashboardView = "projects";
  dashboard.renderPersonalProjects();
  assert.equal(requests.length, 0);
  dashboard.choosePersonalProject(101);
  await new Promise(setImmediate);
  assert.deepEqual(requests.map(request => request.url), ["/api/odoo/project-hours"]);
  const hours = dashboard.state.personalProjectHoursCache.get("101").result;
  dashboard.setPersonalProjectView("budget");
  dashboard.setPersonalProjectView("budget");
  await new Promise(setImmediate);
  assert.deepEqual(requests.map(request => request.url), ["/api/odoo/project-hours", "/api/odoo/project-finance"]);
  assert.deepEqual(requests[1].payload, { projectId: 101 }, "No selected years or credential override enter the finance request");
  assert.equal(dashboard.els.filterBar.hidden, true);
  const finance = dashboard.state.personalProjectFinanceCache.get("101").result;
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.result, finance);
  dashboard.state.selectedYears = new Set([2025]);
  dashboard.renderPersonalProjects();
  assert.equal(dashboard.state.selectedPersonalProjectId, 101, "An open lifetime budget survives year changes");
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.result, finance);
  dashboard.state.selectedYears = new Set([2026]);
  dashboard.setPersonalProjectView("hours");
  await new Promise(setImmediate);
  assert.equal(dashboard.els.filterBar.hidden, false);
  assert.equal(dashboard.state.personalProjectHoursCache.get("101").result, hours);
  assert.equal(requests.length, 2);
  dashboard.setPersonalProjectView("budget");
  await new Promise(setImmediate);
  dashboard.setPersonalProjectConvention(501);
  dashboard.setPersonalProjectConvention(999);
  assert.equal(dashboard.state.personalProjectConvention.get("101"), "501");
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.selectedConventionId, "501");
  dashboard.clearPersonalProject();
  assert.equal(dashboard.els.filterBar.hidden, false);
  assert.equal(requests.length, 2, "Panel and convention changes reuse the exact-project cache");
});

test("finance in-flight reads share an exact ID, isolate another selection and discard obsolete generations", async () => {
  const pending = new Map();
  const { dashboard, requests, context } = loadDashboard(({ payload }) => new Promise(resolve => pending.set(payload.projectId, resolve)),
    { personalTime: true, allowedRoutes: ["/api/odoo/project-finance"] });
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.personalTimeResult.projects.push({ id: 102, name: emptyProjectName });
  dashboard.state.personalTimeResult.timesheets.lines.push(line(11, 1, false, employeeName, emptyProjectName));
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.personalProjectView.set("101", "budget");
  const first = dashboard.loadPersonalProjectFinance(101);
  await dashboard.loadPersonalProjectFinance(101);
  await dashboard.loadPersonalProjectFinance(999);
  assert.equal(requests.length, 1);
  dashboard.state.selectedPersonalProjectId = 102;
  dashboard.state.personalProjectView.set("102", "budget");
  const second = dashboard.loadPersonalProjectFinance(102);
  pending.get(101)(response(projectFinanceResult(101)));
  await first;
  assert.equal(dashboard.state.selectedPersonalProjectId, 102);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.result, null);
  dashboard.state.personalProjectFinanceGeneration += 1;
  dashboard.state.personalProjectFinanceCache.clear();
  pending.get(102)(response(projectFinanceResult(102)));
  await second;
  assert.equal(dashboard.state.personalProjectFinanceCache.size, 0);
});

test("wrong-project finance stays unavailable, retry recovers, and personal refresh reloads the selected panel", async () => {
  let wrong = true;
  const { dashboard, requests } = loadDashboard(({ url }) => response(url.endsWith("my-time") ? personalResult() :
    projectFinanceResult(wrong ? 999 : 101)),
  { personalTime: true, allowedRoutes: ["/api/odoo/project-finance", "/api/odoo/my-time"] });
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.dashboardView = "projects";
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.personalProjectView.set("101", "budget");
  await dashboard.loadPersonalProjectFinance(101);
  assert.equal(dashboard.state.personalProjectFinanceCache.get("101").result, null);
  assert.match(dashboard.state.personalProjectFinanceCache.get("101").error, /ne correspond pas/);
  wrong = false;
  await dashboard.loadPersonalProjectFinance(101, true);
  assert.equal(dashboard.state.personalProjectFinanceCache.get("101").result.project.id, 101);
  const previousGeneration = dashboard.state.personalProjectFinanceGeneration;
  await dashboard.fetchPersonalTime();
  await new Promise(setImmediate);
  assert.ok(dashboard.state.personalProjectFinanceGeneration > previousGeneration);
  assert.deepEqual(requests.map(request => request.url), ["/api/odoo/project-finance", "/api/odoo/project-finance",
    "/api/odoo/my-time", "/api/odoo/project-finance"]);
  assert.equal(dashboard.state.personalProjectFinanceCache.get("101").result.project.id, 101);
});

test("finance refresh clears a convention preference removed from the source", async () => {
  const data = projectFinanceResult();
  const { dashboard } = loadDashboard(() => response(data), { personalTime: true, allowedRoutes: ["/api/odoo/project-finance"] });
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.selectedPersonalProjectId = 101;
  await dashboard.loadPersonalProjectFinance(101);
  dashboard.setPersonalProjectConvention(501);
  assert.equal(dashboard.state.personalProjectConvention.get("101"), "501");
  data.conventions = [{ id: 502, budgetedTotal: 1000 }];
  await dashboard.loadPersonalProjectFinance(101, true);
  assert.equal(dashboard.state.personalProjectConvention.has("101"), false);
});

test("annual Ormitter costs exclusion is local, remembered per project and independent of hours and years", async () => {
  const { dashboard, requests, context } = loadDashboard(({ payload }) => response(projectFinanceResult(payload.projectId)),
    { personalTime: true, allowedRoutes: ["/api/odoo/project-finance"] });
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.personalTimeResult.projects.push({ id: 102, name: emptyProjectName });
  dashboard.state.personalTimeResult.timesheets.lines.push(line(11, 1, false, employeeName, emptyProjectName));
  dashboard.state.dashboardView = "projects";
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.personalProjectView.set("101", "budget");
  dashboard.setPersonalProjectExcludeOrmitterCosts(true);
  assert.equal(dashboard.state.personalProjectExcludeOrmitterCosts.size, 0, "A missing finance result cannot set a cost preference");
  await dashboard.loadPersonalProjectFinance(101);
  const source = dashboard.state.personalProjectFinanceCache.get("101").result;
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.excludeOrmitterCosts, false);
  context.projectBrowserRenders.at(-1).options.onExcludeOrmitterCostsChange(true);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.excludeOrmitterCosts, true);
  assert.equal(dashboard.state.personalProjectOrmitters.has("101"), false, "The hours inclusion control remains independent");
  dashboard.setPersonalProjectExcludeOrmitterCosts("true");
  dashboard.state.selectedYears = new Set([2025, 2026]);
  dashboard.renderPersonalProjects();
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.excludeOrmitterCosts, true);
  assert.equal(dashboard.state.personalProjectFinanceCache.get("101").result, source);
  assert.equal(requests.length, 1, "A filter reuses supplier attribution already present in the finance cache");
  dashboard.state.selectedPersonalProjectId = 102;
  dashboard.state.personalProjectView.set("102", "budget");
  await dashboard.loadPersonalProjectFinance(102);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.excludeOrmitterCosts, false);
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.renderPersonalProjects();
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.excludeOrmitterCosts, true);
  dashboard.setPersonalProjectExcludeOrmitterCosts(false);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.excludeOrmitterCosts, false);
  assert.equal(requests.length, 2);
});

test("persistent sticky navigation starts on Mon temps and hides legacy population controls", () => {
  const { dashboard } = loadDashboard(undefined, { legacyScope: false });
  assert.equal(dashboard.state.dashboardView, "time");
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
  const menu = source.match(/<section class="dashboard-menu"[\s\S]*?<\/section>/)?.[0];
  assert.match(menu, /<nav id="pilotage-nav"/);
  assert.match(menu, /data-view="time" aria-current="page">Mon temps<\/button>/);
  assert.match(menu, /id="hoursScopeControl"[^>]*hidden/);
  assert.match(menu, /id="hoursInclusionControl"[^>]*hidden/);
  assert.ok(source.indexOf('id="time-view"') > source.indexOf(menu) + menu.length,
    "Shared navigation remains outside the time view when another view opens");
  assert.ok(source.indexOf('id="pilotage-view"') > source.indexOf(menu) + menu.length);
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

test("Mon temps fetches an empty session-bound payload and keeps connected consultant hours inclusive", async () => {
  const result = personalResult();
  result.timesheets.lines[0] = line(11, 8, true);
  result.planning.slots[0] = slot(11, 6, true);
  const { dashboard, requests, context } = loadDashboard(() => response(result), {
    allowedRoutes: ["/api/odoo/my-time"], personalTime: true, legacyScope: false
  });
  install(dashboard);
  dashboard.state.projectHoursCache.set("obsolete", { name: "Old team project" });
  await dashboard.fetchPersonalTime();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/odoo/my-time");
  assert.deepEqual(Object.keys(requests[0].payload), []);
  assert.equal(dashboard.state.personalTimeResult, result);
  assert.equal(dashboard.state.personalTimeLoading, false);
  assert.equal(dashboard.state.hoursScope, "me");
  assert.equal(dashboard.state.projectHoursCache.size, 0);
  assert.equal(dashboard.state.projects.length, 0);
  assert.equal(dashboard.state.portfolioProjects.length, 0);
  assert.equal(dashboard.state.includeOrmittersHours, false);
  assert.equal(total(dashboard.state.employee), 8,
    "A connected consultant sees their own actuals with the old population toggle hidden");
  assert.equal(total(dashboard.state.personalPlan), 6);
  const identity = dashboard.getPersonalIdentity();
  assert.deepEqual([...identity.ids], ["11"]);
  assert.deepEqual([...identity.resourceIds], ["111"]);
  assert.equal(dashboard.recordMatchesPersonalIdentity(line(22, 900, false, employeeName), identity), false);
  assert.equal(dashboard.recordMatchesPersonalIdentity({ employeeId: null, resourceId: 111 }, identity), true);
  assert.equal(dashboard.recordMatchesPersonalIdentity({ employeeId: 22, resourceId: 111 }, identity), false);
  assert.ok(context.personalRenders.length > 0);
  assert.equal(context.personalRenders.at(-1).projects[0].actual, 8);
});

test("Mon temps year selection and legend visibility stay local and exclude shared project metadata years", async () => {
  const result = personalResult();
  result.timesheets.lines.push({ ...line(11, 2), date: "2024-06-01" });
  result.planning.slots.push({ ...slot(11, 365), start: "2027-01-01T00:00:00Z", end: "2028-01-01T00:00:00Z" });
  const { dashboard, requests, context } = loadDashboard(() => response(result), {
    allowedRoutes: ["/api/odoo/my-time"], personalTime: true
  });
  await dashboard.fetchPersonalTime();
  dashboard.state.projects.push({ months: [{ year: 2030, key: "2030-01" }], rows: [] });
  dashboard.state.milestones.set("shared", { months: [{ year: 2031 }] });
  dashboard.refreshYears(false);
  assert.deepEqual([...dashboard.state.years], [2024, 2026, 2027]);
  dashboard.state.selectedYears = new Set([2024, 2026]);
  dashboard.renderPersonalTimeMacro();
  let rendered = context.personalRenders.at(-1);
  assert.equal(rendered.projects[0].actual, 10);
  assert.equal(rendered.projects[0].planned, 6);
  rendered.options.onToggle(101);
  assert.ok(dashboard.state.hiddenPersonalProjects.has(101));
  rendered = context.personalRenders.at(-1);
  assert.equal(require("../personal-time").buildSectors(rendered.projects, rendered.options.hiddenIds).length, 0);
  rendered.options.onShowAll();
  assert.equal(dashboard.state.hiddenPersonalProjects.size, 0);
  dashboard.toggleSelectedYear(2024);
  assert.deepEqual([...dashboard.state.selectedYears], [2026]);
  dashboard.selectAllYears();
  assert.deepEqual([...dashboard.state.selectedYears], [2024, 2026, 2027]);
  assert.equal(requests.length, 1, "Year and legend changes must reuse the loaded personal records");
});

test("an obsolete Mon temps refresh cannot replace a newer connected-person result", async () => {
  const pending = [];
  const { dashboard, requests } = loadDashboard(() => new Promise(resolve => pending.push(resolve)), {
    allowedRoutes: ["/api/odoo/my-time"], personalTime: true
  });
  const firstResult = personalResult();
  const secondResult = personalResult();
  secondResult.uid = 8;
  secondResult.employee = { ids: [22], resourceIds: [222], name: "New connected employee" };
  const first = dashboard.fetchPersonalTime();
  const second = dashboard.fetchPersonalTime();
  assert.equal(requests.length, 2);
  pending[1](response(secondResult));
  await second;
  assert.equal(dashboard.state.personalTimeResult, secondResult);
  pending[0](response(firstResult));
  await first;
  assert.equal(dashboard.state.personalTimeResult, secondResult);
  assert.deepEqual([...dashboard.getPersonalIdentity().ids], ["22"]);
  assert.equal(dashboard.state.personalTimeLoading, false);
});

test("personal project drilldown retains own consultant records and describes an inclusive personal scope", () => {
  const { dashboard } = loadDashboard();
  const fixture = fixtures();
  dashboard.state.personalTimeResult = personalResult();
  const actual = { ...fixture.projectActual, personal: true,
    lines: [line(11, 8, true), line(22, 12, false)] };
  const planning = { ...fixture.projectPlan, personal: true,
    slots: [slot(11, 6, true), slot(22, 24, false)] };
  const project = dashboard.buildProjectDatasetFromApi(actual);
  const plan = dashboard.buildProjectPlanDatasetFromApi(planning, project);
  assert.equal(project.lines.length, 2, "Personal adapters preserve raw records before exact identity scoping");
  assert.equal(plan.slots.length, 2);
  assert.equal(total(dashboard.scopeProjectHours(project)), 8);
  assert.equal(total(dashboard.scopeProjectHours(plan, "slots")), 6);
  assert.equal(dashboard.state.includeOrmittersHours, false);
  dashboard.renderRemainingHoursScope();
  assert.match(dashboard.els.remainingDataScope.textContent, /Mes heures.*quelle que soit ma fonction/);
  assert.doesNotMatch(dashboard.els.remainingDataScope.textContent, /excluded|Whole Project/);
});

test("personal projects sharing a bracketed code keep distinct Remaining totals by Odoo project ID", () => {
  const { dashboard } = loadDashboard();
  const firstName = "[10001] Shared label (ID 101)";
  const secondName = "[10001] Shared label (ID 102)";
  dashboard.state.personalTimeResult = { ...personalResult(), projects: [
    { id: 101, name: firstName }, { id: 102, name: secondName }
  ] };
  const first = { ...line(11, 8, true, employeeName, firstName), projectId: 101 };
  const second = { ...line(11, 5, true, employeeName, secondName), id: 12, projectId: 102 };
  const monthly = [{ month: "2026-10", projects: [{ name: firstName, hours: 8 }, { name: secondName, hours: 5 }] }];
  dashboard.state.employee = dashboard.buildEmployeeDatasetFromApi({ personal: true, employeeName,
    monthly, employeeMonthly: [], lines: [first, second] });
  assert.notEqual(dashboard.projectColorKey(firstName), dashboard.projectColorKey(secondName));
  const totals = dashboard.buildRemainingToDateTotals(dashboard.state.employee, null, new Date(2026, 9, 5, 12));
  assert.equal(totals.size, 2);
  assert.equal(totals.get(dashboard.projectColorKey(firstName)).actualToDate, 8);
  assert.equal(totals.get(dashboard.projectColorKey(secondName)).actualToDate, 5);
});

test("personal project selection shares years and managers, fetching hours only after selection", async () => {
  const { dashboard, requests, context } = loadDashboard(() => response(projectHoursResult()),
    { personalTime: true, allowedRoutes: ["/api/odoo/project-hours"] });
  const result = personalResult();
  result.projects[0].manager = { id: 501, name: "Project manager", photoDataUrl: null };
  result.projects.push({ id: 102, name: emptyProjectName, manager: null });
  result.timesheets.lines.push({ ...line(11, 4, false, employeeName, emptyProjectName), date: "2025-06-01" });
  install(dashboard);
  dashboard.state.personalTimeResult = result;
  dashboard.state.selectedYears = new Set([2026]);
  dashboard.state.hiddenPersonalProjects.add(101);
  dashboard.renderPersonalProjects();
  assert.equal(requests.length, 0, "Rendering the project grid stays local");
  let rendered = context.projectBrowserRenders.at(-1).options;
  assert.deepEqual(rendered.projects.map(project => project.id), [101]);
  assert.equal(rendered.projects[0].manager, result.projects[0].manager);
  dashboard.captureRenderFeeds();
  assert.equal(dashboard.els.employeePanel.hidden, true, "The old Mon temps 02 section stays hidden");
  assert.equal(dashboard.els.projectList.hidden, true);
  assert.equal(dashboard.els.projectDetailTitle.hidden, true);
  const years = dashboard.state.selectedYears;
  dashboard.applyViewChange({ detail: { view: "projects" } });
  assert.equal(dashboard.els.filterBar.hidden, false);
  assert.equal(dashboard.state.selectedYears, years);
  dashboard.choosePersonalProject(101);
  await new Promise(setImmediate);
  assert.equal(dashboard.state.selectedPersonalProjectId, 101);
  assert.ok(context.projectBrowserRenders.some(render => render.options.focusDetail));
  dashboard.clearPersonalProject();
  assert.equal(dashboard.state.selectedPersonalProjectId, null);
  assert.equal(context.projectBrowserRenders.at(-1).options.focusProjectId, 101);
  dashboard.choosePersonalProject(999);
  assert.equal(dashboard.state.selectedPersonalProjectId, null, "A caller cannot select an unrelated project");
  dashboard.choosePersonalProject(101);
  dashboard.state.selectedYears = new Set([2025]);
  dashboard.renderPersonalProjects();
  assert.equal(dashboard.state.selectedPersonalProjectId, null, "Changing years clears a selection absent from the new scope");
  rendered = context.projectBrowserRenders.at(-1).options;
  assert.deepEqual(rendered.projects.map(project => project.id), [102]);
  dashboard.applyViewChange({ detail: { view: "time" } });
  assert.equal(dashboard.els.filterBar.hidden, false);
  assert.deepEqual([...dashboard.state.selectedYears], [2025]);
  dashboard.applyViewChange({ detail: { view: "unit" } });
  assert.equal(dashboard.els.filterBar.hidden, true);
  assert.equal(dashboard.els.hoursInclusionControl.hidden, true);
  assert.equal(dashboard.els.hoursScopeControl.hidden, true);
  assert.equal(requests.length, 1, "Repeated selection and shared year navigation reuse the selected project's cached response");
  assert.deepEqual(requests[0].payload, { projectId: 101 });
});

test("project comparison totals share exact project scope and exclude consultants with own employee priority", () => {
  const { dashboard } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  result.timesheets.lines = [
    line(11, 10), line(11, -2), line(22, 20), line(33, 200, true),
    { ...line(44, 4), subcontractorClassification: "unknown" },
    { ...line(11, 500), date: "2026-10-06" },
    { ...line(11, 500), date: "2025-01-01" },
    line(11, 500, false, employeeName, emptyProjectName),
    { ...line(null, 3), resourceId: 111 }, { ...line(22, 2), resourceId: 111 }
  ];
  result.planning.slots = [
    { ...slot(11, 100), start: "2026-12-01T00:00:00Z", end: "2026-12-02T00:00:00Z" },
    { ...slot(null, 20), resourceId: 111 }, { ...slot(22, 30), resourceId: 111 },
    slot(22, 50), slot(33, 200, true), { ...slot(44, 7), subcontractorClassification: "planning-role" },
    { ...slot(11, 500), projectId: 102 },
    { ...slot(11, 500), start: "2025-01-01T00:00:00Z", end: "2025-01-02T00:00:00Z" }
  ];
  const before = structuredClone(result);
  const mine = dashboard.summarizePersonalProjectHours(result, true, new Date("2026-10-05T12:00:00Z"));
  const whole = dashboard.summarizePersonalProjectHours(result, false, new Date("2026-10-05T12:00:00Z"));
  assert.equal(mine.actual, 11, "Same-name employees and foreign employees with an own resource are excluded");
  assert.equal(mine.planned, 120, "Full selected-year planning includes future slots");
  assert.equal(mine.warnings.length, 0);
  assert.equal(whole.actual, 37, "Signed actuals stop at Brussels today and known consultants are excluded");
  assert.equal(whole.planned, 207);
  assert.ok(whole.warnings.some(warning => /inconnues/.test(warning)));
  assert.ok(whole.warnings.some(warning => /rôle de planning/.test(warning)));
  assert.deepEqual(result, before);
});

test("scoped comparison date references clip selected years to project dates without replacing recorded hours", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  result.lifetime = { startDate: "2025-12-01", endDate: "2028-05-31", conventionHours: 100 };
  result.timesheets.lines.push({ ...line(11, 4), date: "2025-12-15" });
  const personal = personalResult();
  personal.timesheets.lines.push({ ...line(11, 4), date: "2025-12-15" });
  dashboard.state.personalTimeResult = personal;
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.personalProjectHoursCache.set("101", { result, loading: false, error: "" });
  const latest = () => context.projectBrowserRenders.at(-1).options.detail;
  dashboard.renderPersonalProjects();
  const monthly = JSON.stringify(latest().monthly), lifetime = JSON.stringify(latest().lifetime);
  assert.equal(latest().calendarScope.startDate, "2026-01-01");
  assert.equal(latest().calendarScope.endDate, "2026-12-31");
  assert.equal(latest().calendarScope.calendarDays, 365);
  assert.equal(latest().calendarFraction, 277 / 364);
  assert.equal(latest().personal.planned, 6);
  assert.equal(latest().personal.actual, 8);
  dashboard.state.selectedYears = new Set([2025, 2026]);
  dashboard.renderPersonalProjects();
  assert.equal(latest().calendarScope.startDate, "2025-12-01");
  assert.equal(latest().calendarScope.endDate, "2026-12-31");
  assert.equal(latest().calendarScope.calendarDays, 396, "January–November 2025 do not enter the projection period");
  assert.equal(latest().calendarFraction, 308 / 395);
  assert.equal(latest().personal.planned, 6, "An empty 2025 plan legitimately leaves the planned total unchanged");
  assert.equal(latest().personal.actual, 12);
  assert.equal(latest().project.actual, 32);
  assert.equal(JSON.stringify(latest().monthly), monthly, "The project history stays independent of year chips");
  assert.equal(JSON.stringify(latest().lifetime), lifetime);
  result.planning.slots.push({ ...slot(11, 24), start: "2025-12-01T00:00:00Z", end: "2026-01-01T00:00:00Z" });
  dashboard.renderPersonalProjects();
  assert.equal(latest().personal.planned, 30, "Accessible 2025 planning is included when the year is selected");
  dashboard.state.selectedYears = new Set([2026]);
  dashboard.renderPersonalProjects();
  assert.equal(latest().personal.planned, 6);
  result.lifetime.endDate = null;
  dashboard.renderPersonalProjects();
  assert.equal(latest().calendarScope, null);
  assert.equal(latest().calendarFraction, null, "Unknown project dates cannot silently fall back to whole calendar years");
  assert.equal(latest().personal.planned, 6);
  assert.equal(latest().personal.actual, 8);
  assert.equal(requests.length, 0, "Scope changes only recompute the existing cached response");
});

test("project comparison totals preserve unknown planning and prorate disjoint selected leap years", () => {
  const { dashboard } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  result.timesheets.lines = [{ ...line(11, -3), date: "2026-10-05T22:00:00Z" }];
  result.planning = null;
  let summary = dashboard.summarizePersonalProjectHours(result, true, new Date("2026-10-05T12:00:00Z"));
  assert.equal(summary.planned, null);
  assert.equal(summary.actual, 0, "A timestamp on Brussels tomorrow is excluded");
  result.timesheets.lines[0].date = "2026-10-05T21:59:59Z";
  summary = dashboard.summarizePersonalProjectHours(result, true, new Date("2026-10-05T12:00:00Z"));
  assert.equal(summary.actual, -3);
  result.planning = { slots: [] };
  assert.equal(dashboard.summarizePersonalProjectHours(result, true).planned, 0);
  result.planning.slots = [{ ...slot(11, 1096), start: "2024-01-01T00:00:00Z", end: "2027-01-01T00:00:00Z" }];
  dashboard.state.selectedYears = new Set([2024, 2026]);
  assert.equal(dashboard.summarizePersonalProjectHours(result, true).planned, 731);
  result.timesheets.lines = [line(11, 99, true)];
  result.planning.slots = [slot(11, 99, true)];
  summary = dashboard.summarizePersonalProjectHours(result, true);
  assert.equal(summary.actual, 0, "Employee-only comparisons also exclude an own consultant identity");
  assert.equal(summary.planned, 0);
});

test("the project Ormitter checkbox is local, unchecked per project and independent of personal and legacy controls", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  result.hasOrmitters = true;
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.personalProjectHoursCache.set("101", { result, loading: false, error: "" });
  dashboard.state.includeOrmittersHours = true;
  dashboard.renderPersonalProjects();
  let detail = context.projectBrowserRenders.at(-1).options.detail;
  assert.equal(detail.hasOrmitters, true);
  assert.equal(detail.includeOrmitters, false);
  assert.equal(detail.personal.actual, 8);
  assert.equal(detail.project.actual, 28, "The legacy toggle cannot include consultants in this pair");
  const beforePersonal = JSON.stringify(detail.personal);
  dashboard.setPersonalProjectOrmitters(true);
  detail = context.projectBrowserRenders.at(-1).options.detail;
  assert.equal(detail.includeOrmitters, true);
  assert.equal(detail.project.actual, 40);
  assert.equal(detail.project.planned, 30);
  assert.equal(JSON.stringify(detail.personal), beforePersonal);
  assert.equal(dashboard.state.personalProjectOrmitters.get("101"), true);
  assert.equal(dashboard.state.includeOrmittersHours, true);
  dashboard.setPersonalProjectOrmitters(false);
  detail = context.projectBrowserRenders.at(-1).options.detail;
  assert.equal(detail.project.actual, 28);
  assert.equal(detail.project.planned, 6);
  dashboard.state.selectedPersonalProjectId = null;
  dashboard.setPersonalProjectOrmitters(true);
  assert.equal(dashboard.state.personalProjectOrmitters.get("101"), false);
  assert.equal(requests.length, 0, "Toggling recomputes the cached project response without a read");
});

test("unavailable assignments warn only the project pair and unconfirmed presence disables a saved inclusion preference", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  result.hasOrmitters = false;
  result.timesheets.lines = result.timesheets.lines.filter(row => !row.isSubcontractor);
  result.planning.slots = result.planning.slots.filter(row => !row.isSubcontractor);
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.personalProjectHoursCache.set("101", { result, loading: false, error: "" });
  dashboard.state.personalProjectOrmitters.set("101", true);
  const warning = "Certaines affectations ou fonctions sont indisponibles ; la présence d’Ormitters peut être incomplète.";
  for (const upstreamWarning of [
    "Project assignments are unavailable; Ormitter presence is based on confirmed hour records only.",
    "Project assignment functions are unavailable; Ormitter presence is based on confirmed records only."
  ]) {
    result.warnings = [upstreamWarning];
    dashboard.renderPersonalProjects();
    const detail = context.projectBrowserRenders.at(-1).options.detail;
    assert.equal(detail.hasOrmitters, false);
    assert.equal(detail.includeOrmitters, false, "Saved inclusion cannot remain active without confirmed presence");
    assert.deepEqual(Array.from(detail.project.warnings), [warning]);
    assert.equal(detail.personal.warnings.length, 0);
    assert.equal(detail.personal.actual, 8);
    assert.equal(detail.project.actual, 28);
  }
  result.warnings = ["Unrelated upstream diagnostic"];
  assert.equal(dashboard.summarizePersonalProjectHours(result, false).warnings.length, 0);
  assert.equal(requests.length, 0);
});

test("lifetime convention ignores selected years and clips signed actuals to the inclusive project and Brussels today", () => {
  const { dashboard } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  result.lifetime = { conventionHours: 100, conventionField: "x_budget", startDate: "2025-01-01", endDate: "2026-10-04" };
  result.timesheets.lines = [
    { ...line(11, 999), date: "2024-12-31" },
    { ...line(11, 10), date: "2025-01-01" },
    { ...line(22, 20), date: "2025-12-31" },
    { ...line(11, 30), date: "2026-10-04" },
    { ...line(11, -2), date: "2026-10-04" },
    { ...line(11, 999), date: "2026-10-05" },
    { ...line(11, 999), date: "2026-10-04T22:00:00Z" },
    { ...line(33, 5, true), date: "2025-06-01" },
    { ...line(11, 999, false, employeeName, emptyProjectName), date: "2025-06-01" }
  ];
  const now = new Date("2026-10-05T10:00:00Z");
  const summary = dashboard.summarizeLifetimeProjectHours(result, now);
  assert.equal(summary.planned, 100);
  assert.equal(summary.actual, 58);
  assert.equal(summary.employees.reduce((sum, person) => sum + person.actual, 0), 58);
  assert.equal(summary.calendarFraction, 1);
  dashboard.state.selectedYears = new Set([2024]);
  assert.equal(JSON.stringify(dashboard.summarizeLifetimeProjectHours(result, now)), JSON.stringify(summary));
  assert.equal(dashboard.summarizeLifetimeProjectHours(result, new Date("2024-12-31T12:00:00Z")).actual, 0);
  assert.equal(dashboard.summarizeLifetimeProjectHours(result, new Date("2024-12-31T12:00:00Z")).calendarFraction, 0);
  assert.equal(dashboard.summarizeLifetimeProjectHours(result, new Date("2025-01-01T12:00:00Z")).actual, 10);
  assert.equal(dashboard.summarizeLifetimeProjectHours(result, new Date("2025-01-01T12:00:00Z")).calendarFraction, 0);
  const futureEnd = { ...result, lifetime: { ...result.lifetime, endDate: "2026-12-31" },
    timesheets: { lines: [...result.timesheets.lines, { ...line(11, 9999), date: "2026-10-06" }] } };
  assert.equal(dashboard.summarizeLifetimeProjectHours(futureEnd, new Date("2026-10-04T22:00:00Z")).actual, 1057,
    "All of Brussels today is included and tomorrow is excluded even before the project ends");
  dashboard.state.personalProjectOrmitters.set("101", true);
  const included = dashboard.summarizeLifetimeProjectHours(result, now);
  assert.equal(included.actual, 63);
  assert.equal(included.planned, 100, "The literal convention budget never changes with employee inclusion");
});

test("lifetime unknown dates remain unavailable while missing or nonpositive budgets retain valid actuals", () => {
  const { dashboard } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  for (const [startDate, endDate] of [[null, "2026-12-31"], ["2026-02-30", "2026-12-31"], ["2026-12-31", "2026-01-01"]]) {
    result.lifetime = { conventionHours: 100, startDate, endDate };
    const summary = dashboard.summarizeLifetimeProjectHours(result);
    assert.equal(summary.actual, null);
    assert.equal(summary.employees.length, 0);
    assert.equal(summary.calendarFraction, null);
    assert.ok(summary.warnings.length > 0);
  }
  for (const conventionHours of [null, 0, -10]) {
    result.lifetime = { conventionHours, startDate: "2026-01-01", endDate: "2026-12-31" };
    const summary = dashboard.summarizeLifetimeProjectHours(result);
    assert.equal(summary.planned, null);
    assert.equal(summary.actual, 28);
    assert.equal(summary.employees.reduce((sum, person) => sum + person.actual, 0), 28);
  }
  result.lifetime = { conventionHours: 100, startDate: "2024-01-01", endDate: "2024-12-31" };
  assert.equal(dashboard.summarizeLifetimeProjectHours(result, new Date("2024-07-01T12:00:00Z")).calendarFraction, 182 / 365);
  result.lifetime = { conventionHours: 100, startDate: "2026-10-05", endDate: "2026-10-05" };
  assert.equal(dashboard.summarizeLifetimeProjectHours(result, new Date("2026-10-04T12:00:00Z")).calendarFraction, 0);
  assert.equal(dashboard.summarizeLifetimeProjectHours(result, new Date("2026-10-05T12:00:00Z")).calendarFraction, 1);
});

test("lifetime retains confirmed decimal hours and passes empty versus unavailable budget status", () => {
  const { dashboard } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  const rawHours = 3890.3967484570226;
  result.lifetime = { conventionHours: rawHours, conventionField: "budget_staffing_convention_hours",
    conventionStatus: "available", startDate: "2026-01-01", endDate: "2026-12-31" };
  let summary = dashboard.summarizeLifetimeProjectHours(result);
  assert.equal(summary.planned, rawHours, "3890:24 display means decimal hours, not 3890.24");
  assert.equal(summary.budgetStatus, "available");
  for (const status of ["empty", "unavailable"]) {
    result.lifetime.conventionHours = null;
    result.lifetime.conventionStatus = status;
    summary = dashboard.summarizeLifetimeProjectHours(result);
    assert.equal(summary.planned, null);
    assert.equal(summary.actual, 28);
    assert.equal(summary.budgetStatus, status);
    result.lifetime.startDate = null;
    assert.equal(dashboard.summarizeLifetimeProjectHours(result).budgetStatus, status,
      "Date failure cannot turn a read failure into a MIS missing-input message");
    result.lifetime.startDate = "2026-01-01";
  }
});

test("the one cached project toggle governs both whole-project comparisons without changing own hours or fetching", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  result.lifetime = { conventionHours: 100, startDate: "2026-01-01", endDate: "2026-12-31" };
  result.hasOrmitters = true;
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.personalProjectHoursCache.set("101", { result, loading: false, error: "" });
  dashboard.renderPersonalProjects();
  let detail = context.projectBrowserRenders.at(-1).options.detail;
  const own = JSON.stringify(detail.personal);
  assert.equal(detail.project.actual, 28);
  assert.equal(detail.lifetime.actual, 28);
  dashboard.setPersonalProjectOrmitters(true);
  detail = context.projectBrowserRenders.at(-1).options.detail;
  assert.equal(detail.project.actual, 40);
  assert.equal(detail.lifetime.actual, 40);
  assert.equal(detail.lifetime.planned, 100);
  assert.equal(JSON.stringify(detail.personal), own);
  assert.equal(requests.length, 0);
});

test("monthly project history shares cached inclusion, ignores year chips and keeps other project preferences independent", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  result.hasOrmitters = true;
  result.lifetime = { conventionHours: 100, conventionStatus: "available", startDate: "2025-01-01", endDate: "2026-12-31" };
  result.timesheets.lines.push({ ...line(11, 10), date: "2025-06-01" });
  const other = projectHoursResult(102);
  other.hasOrmitters = true;
  other.lifetime = { ...result.lifetime };
  const personal = personalResult();
  personal.projects.push({ id: 102, name: emptyProjectName });
  personal.timesheets.lines.push({ ...line(11, 10), date: "2025-06-01" }, line(11, 1, false, employeeName, emptyProjectName));
  dashboard.state.personalTimeResult = personal;
  dashboard.state.personalProjectHoursCache.set("101", { result, loading: false, error: "" });
  dashboard.state.personalProjectHoursCache.set("102", { result: other, loading: false, error: "" });
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.includeOrmittersHours = true;
  dashboard.renderPersonalProjects();
  let options = context.projectBrowserRenders.at(-1).options;
  assert.equal(options.detail.monthly.status, "available");
  assert.equal(options.detail.monthly.total.reduce((sum, value) => sum + value, 0), 38);
  assert.ok(!options.detail.monthly.employees.some(person => person.isSubcontractor));
  const own = JSON.stringify(options.detail.personal);
  options.onIncludeOrmittersChange(true);
  options = context.projectBrowserRenders.at(-1).options;
  assert.equal(options.detail.monthly.total.reduce((sum, value) => sum + value, 0), 50);
  assert.equal(options.detail.project.actual, 40);
  assert.equal(JSON.stringify(options.detail.personal), own);
  const monthly = JSON.stringify(options.detail.monthly);
  dashboard.state.selectedYears = new Set([2025]);
  dashboard.renderPersonalProjects();
  options = context.projectBrowserRenders.at(-1).options;
  assert.equal(JSON.stringify(options.detail.monthly), monthly, "The chart keeps full project history when shared years change");
  assert.equal(options.detail.project.actual, 10);
  dashboard.state.selectedYears = new Set([2026]);
  dashboard.choosePersonalProject(102);
  options = context.projectBrowserRenders.at(-1).options;
  assert.equal(options.detail.includeOrmitters, false);
  assert.equal(options.detail.monthly.total.reduce((sum, value) => sum + value, 0), 28);
  dashboard.choosePersonalProject(101);
  assert.equal(context.projectBrowserRenders.at(-1).options.detail.includeOrmitters, true);
  assert.equal(requests.length, 0, "All graph changes reuse cached raw project records");
});

test("employee graph selection stays local, survives mode/project changes and clears excluded identities", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  result.hasOrmitters = true;
  result.lifetime = { conventionHours: 100, conventionStatus: "available", startDate: "2025-01-01", endDate: "2026-12-31" };
  const other = projectHoursResult(102);
  other.lifetime = { ...result.lifetime };
  const personal = personalResult();
  personal.projects.push({ id: 102, name: emptyProjectName });
  personal.timesheets.lines.push({ ...line(11, 1), date: "2025-06-01" });
  personal.timesheets.lines.push(line(11, 1, false, employeeName, emptyProjectName));
  dashboard.state.personalTimeResult = personal;
  dashboard.state.personalProjectHoursCache.set("101", { result, loading: false, error: "" });
  dashboard.state.personalProjectHoursCache.set("102", { result: other, loading: false, error: "" });
  dashboard.state.selectedPersonalProjectId = 101;
  const latest = () => context.projectBrowserRenders.at(-1).options;
  dashboard.renderPersonalProjects();
  assert.equal(latest().detail.monthlyEmployeeId, null);
  const bars = JSON.stringify([latest().detail.personal, latest().detail.project, latest().detail.lifetime]);
  latest().onMonthlyEmployeeChange("employee:11");
  assert.equal(latest().detail.monthlyEmployeeId, "employee:11");
  assert.equal(latest().detail.monthlyRevealKey, 1);
  assert.equal(JSON.stringify([latest().detail.personal, latest().detail.project, latest().detail.lifetime]), bars);
  latest().onMonthlyEmployeeChange("employee:11");
  latest().onMonthlyEmployeeChange("employee:999");
  latest().onMonthlyEmployeeChange("employee:22");
  assert.equal(latest().detail.monthlyRevealKey, 1, "Unchanged, invalid and excluded identities do not replay");
  latest().onMonthlyModeChange("cumulative");
  assert.equal(latest().detail.monthlyEmployeeId, "employee:11");
  assert.equal(latest().detail.monthly.employees.find(employee => employee.id === "employee:11").values.at(-1), 8);
  assert.equal(latest().detail.monthlyRevealKey, 2);
  dashboard.renderPersonalProjects();
  assert.equal(latest().detail.monthlyRevealKey, 2, "Unchanged renders do not replay");
  dashboard.state.selectedYears = new Set([2025]);
  dashboard.renderPersonalProjects();
  assert.equal(latest().detail.monthlyEmployeeId, "employee:11");
  assert.equal(latest().detail.monthlyRevealKey, 2, "Year changes keep full-history selection without replay");
  dashboard.state.selectedYears = new Set([2026]);
  dashboard.renderPersonalProjects();
  dashboard.choosePersonalProject(102);
  assert.equal(latest().detail.monthlyEmployeeId, null);
  latest().onMonthlyEmployeeChange("employee:33");
  dashboard.choosePersonalProject(101);
  assert.equal(latest().detail.monthlyEmployeeId, "employee:11", "Each project remembers its selected employee");
  latest().onMonthlyEmployeeChange(null);
  assert.equal(latest().detail.monthlyEmployeeId, null);
  assert.equal(latest().detail.monthlyRevealKey, 3);
  latest().onMonthlyEmployeeChange(null);
  assert.equal(latest().detail.monthlyRevealKey, 3);
  latest().onIncludeOrmittersChange(true);
  latest().onMonthlyEmployeeChange("employee:22");
  assert.equal(latest().detail.monthlyEmployeeId, "employee:22");
  latest().onIncludeOrmittersChange(false);
  assert.equal(latest().detail.monthlyEmployeeId, null, "Excluding the selected Ormitter returns to all visible employees");
  latest().onIncludeOrmittersChange(true);
  assert.equal(latest().detail.monthlyEmployeeId, null, "Re-inclusion does not silently restore an excluded selection");
  latest().onMonthlyEmployeeChange("employee:11");
  result.timesheets.lines = result.timesheets.lines.filter(employee => employee.employeeId !== 11);
  dashboard.renderPersonalProjects();
  assert.equal(latest().detail.monthlyEmployeeId, null, "Changed source records clear a stale selection");
  assert.equal(requests.length, 0, "All selection changes use cached records without an Odoo request");
});

test("monthly and cumulative modes reuse exact cached history and replay only on real project control changes", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  result.hasOrmitters = true;
  result.lifetime = { conventionHours: 100, conventionStatus: "available", startDate: "2025-01-01", endDate: "2026-12-31" };
  result.timesheets.lines.push({ ...line(11, 10), date: "2025-06-01" });
  const other = projectHoursResult(102);
  other.lifetime = { ...result.lifetime };
  const personal = personalResult();
  personal.projects.push({ id: 102, name: emptyProjectName });
  personal.timesheets.lines.push({ ...line(11, 10), date: "2025-06-01" }, line(11, 1, false, employeeName, emptyProjectName));
  dashboard.state.personalTimeResult = personal;
  dashboard.state.personalProjectHoursCache.set("101", { result, loading: false, error: "" });
  dashboard.state.personalProjectHoursCache.set("102", { result: other, loading: false, error: "" });
  dashboard.state.selectedPersonalProjectId = 101;
  const latest = () => context.projectBrowserRenders.at(-1).options;
  dashboard.renderPersonalProjects();
  const initial = latest();
  assert.equal(initial.detail.monthlyMode, "monthly");
  assert.equal(initial.detail.monthly.mode, "monthly");
  assert.equal(initial.detail.monthlyRevealKey, 0);
  const bars = JSON.stringify([initial.detail.personal, initial.detail.project, initial.detail.lifetime]);
  const conventionTotal = initial.detail.monthly.convention.reduce((sum, value) => sum + value, 0);
  initial.onMonthlyModeChange("cumulative");
  let options = latest();
  assert.equal(options.detail.monthlyMode, "cumulative");
  assert.equal(options.detail.monthly.mode, "cumulative");
  assert.equal(options.detail.monthly.total.at(-1), 38);
  assert.equal(options.detail.monthly.convention.at(-1), conventionTotal);
  assert.equal(JSON.stringify([options.detail.personal, options.detail.project, options.detail.lifetime]), bars);
  assert.equal(options.detail.monthlyRevealKey, 1);
  options.onMonthlyModeChange("cumulative");
  options.onMonthlyModeChange("invalid");
  assert.equal(latest().detail.monthlyRevealKey, 1, "No-op/invalid changes do not replay");
  options.onIncludeOrmittersChange(true);
  options = latest();
  assert.equal(options.detail.monthly.total.at(-1), 50);
  assert.equal(options.detail.monthlyMode, "cumulative");
  assert.equal(options.detail.monthlyRevealKey, 2);
  options.onIncludeOrmittersChange(true);
  assert.equal(latest().detail.monthlyRevealKey, 2);
  options.onMonthlyModeChange("monthly");
  options = latest();
  assert.equal(options.detail.monthly.total.reduce((sum, value) => sum + value, 0), 50);
  assert.equal(options.detail.monthlyRevealKey, 3);
  options.onMonthlyModeChange("cumulative");
  options = latest();
  assert.equal(options.detail.monthlyRevealKey, 4, "Returning to an earlier mode replays again");
  const cumulative = JSON.stringify(options.detail.monthly);
  dashboard.state.selectedYears = new Set([2025]);
  dashboard.renderPersonalProjects();
  assert.equal(JSON.stringify(latest().detail.monthly), cumulative);
  assert.equal(latest().detail.monthlyRevealKey, 4, "Year selection does not replay project-history animation");
  dashboard.state.selectedYears = new Set([2026]);
  dashboard.choosePersonalProject(102);
  assert.equal(latest().detail.monthlyMode, "monthly");
  assert.equal(latest().detail.monthlyRevealKey, 0);
  dashboard.choosePersonalProject(101);
  assert.equal(latest().detail.monthlyMode, "cumulative");
  assert.equal(latest().detail.includeOrmitters, true);
  assert.equal(latest().detail.monthlyRevealKey, 4);
  assert.equal(requests.length, 0, "Mode, inclusion and year controls never refetch history");
});

test("project contributor totals reconcile signed actuals by exact employee or resource identity", () => {
  const { dashboard } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  result.timesheets.lines = [
    line(11, 10), line(11, -2), line(22, 20), line(33, 200, true),
    { ...line(null, 4), resourceId: 333, employee: "Resource only" },
    { ...line(null, 3), employee: "" }, line(44, -5),
    line(55, 6), line(55, -6),
    { ...line(11, 999), date: "2026-10-06" },
    { ...line(11, 999), date: "2025-01-01" },
    line(11, 999, false, employeeName, emptyProjectName)
  ];
  let summary = dashboard.summarizePersonalProjectHours(result, false);
  assert.equal(summary.actual, 30);
  assert.equal(summary.employees.reduce((sum, employee) => sum + employee.actual, 0), summary.actual);
  const employees = new Map(summary.employees.map(employee => [employee.id, employee]));
  assert.deepEqual([...employees.keys()].sort(), ["employee:11", "employee:22", "employee:44", "resource:333", "unassigned"]);
  assert.equal(employees.get("employee:11").actual, 8);
  assert.equal(employees.get("employee:22").actual, 20);
  assert.equal(employees.get("employee:44").actual, -5);
  assert.equal(employees.get("resource:333").resourceId, 333);
  assert.equal(employees.get("unassigned").employeeId, null);
  assert.notEqual(employees.get("employee:11").id, employees.get("employee:22").id,
    "Identical names remain separate employees");
  dashboard.state.personalProjectOrmitters.set("101", true);
  summary = dashboard.summarizePersonalProjectHours(result, false);
  assert.equal(summary.actual, 230);
  assert.equal(summary.employees.reduce((sum, employee) => sum + employee.actual, 0), 230);
  assert.equal(summary.employees.find(employee => employee.id === "employee:33").isSubcontractor, true);
  assert.equal(dashboard.summarizePersonalProjectHours(result, true).actual, 8);
});

test("project contributor profiles join exact IDs and Ormitter presence uses full history or confirmed assignment", () => {
  const { dashboard } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  const photo = "data:image/png;base64,c2FmZQ==";
  result.contributors = [
    { employeeId: 11, resourceIds: [111], name: "Profile employee", photoDataUrl: photo, isSubcontractor: true },
    { employeeId: 22, resourceIds: [222], name: "Other employee", photoDataUrl: null, isSubcontractor: false },
    { employeeId: null, resourceIds: [333], name: "Profile resource", photoDataUrl: null, isSubcontractor: false }
  ];
  result.timesheets.lines = [line(11, 0.1), line(11, 0.2), line(11, -0.03),
    { ...line(null, 0.3), resourceId: 333 }];
  result.planning.slots = [];
  const summary = dashboard.summarizePersonalProjectHours(result, false);
  assert.equal(summary.actual, 0.57);
  const own = summary.employees.find(employee => employee.id === "employee:11");
  assert.equal(own.name, "Profile employee");
  assert.equal(own.photoDataUrl, photo);
  assert.equal(own.isSubcontractor, false, "Profile flags cannot override authoritative per-record classification");
  assert.equal(summary.employees.find(employee => employee.id === "resource:333").name, "Profile resource");
  assert.equal(dashboard.hasProjectOrmitters(result), false);
  result.timesheets.lines.push({ ...line(33, 2, true), date: "2025-01-01" });
  assert.equal(dashboard.hasProjectOrmitters(result), true, "An out-of-scope historical Ormitter still makes the option discoverable");
  assert.equal(dashboard.summarizePersonalProjectHours(result, false).actual, 0.57);
  result.timesheets.lines = [line(33, 0, true), { ...line(33, NaN, true) },
    line(33, 10, true, employeeName, emptyProjectName)];
  assert.equal(dashboard.hasProjectOrmitters(result), false);
  result.hasOrmitters = true;
  assert.equal(dashboard.hasProjectOrmitters(result), true, "A confirmed zero-hour assignment is sufficient");
});

test("project detail shares one in-flight read per exact ID and late responses cannot replace another selection", async () => {
  const pending = new Map();
  const { dashboard, requests, context } = loadDashboard(({ payload }) => new Promise(resolve => pending.set(payload.projectId, resolve)),
    { personalTime: true, allowedRoutes: ["/api/odoo/project-hours"] });
  const personal = personalResult();
  personal.projects.push({ id: 102, name: emptyProjectName });
  personal.timesheets.lines.push(line(11, 1, false, employeeName, emptyProjectName));
  dashboard.state.personalTimeResult = personal;
  dashboard.choosePersonalProject(101);
  const duplicate = dashboard.loadPersonalProjectHours("101");
  dashboard.choosePersonalProject(102);
  assert.deepEqual(requests.map(request => request.payload), [{ projectId: 101 }, { projectId: 102 }]);
  pending.get(101)(response(projectHoursResult(101)));
  await new Promise(setImmediate);
  assert.ok(dashboard.state.personalProjectHoursCache.get("101").result);
  assert.equal(dashboard.state.selectedPersonalProjectId, 102);
  let view = context.projectBrowserRenders.at(-1).options;
  assert.equal(view.selectedId, 102);
  assert.equal(view.detail.personal, null);
  pending.get(102)(response(projectHoursResult(102)));
  await new Promise(setImmediate);
  await duplicate;
  view = context.projectBrowserRenders.at(-1).options;
  assert.equal(view.selectedId, 102);
  assert.equal(view.detail.personal.actual, 8);
  assert.equal(view.detail.project.actual, 28);
  assert.equal(view.detail.personal.planned, 6);
  assert.equal(view.detail.project.planned, 6);
  dashboard.state.selectedYears = new Set([2025, 2026]);
  dashboard.renderPersonalProjects();
  await dashboard.loadPersonalProjectHours(102);
  assert.equal(requests.length, 2, "Shared year changes recompute both summaries without fetching again");
  assert.equal(context.projectBrowserRenders.at(-1).options.detail.calendarFraction,
    null, "The fixture has no project dates, so its scoped date reference stays unavailable");
});

test("personal refresh invalidates project responses from an earlier cache generation", async () => {
  let finishProject;
  const { dashboard, requests } = loadDashboard(({ url }) => url.endsWith("my-time") ? response(personalResult()) :
    new Promise(resolve => { finishProject = resolve; }),
  { personalTime: true, allowedRoutes: ["/api/odoo/my-time", "/api/odoo/project-hours"] });
  dashboard.state.personalTimeResult = personalResult();
  const pending = dashboard.loadPersonalProjectHours(101);
  const generation = dashboard.state.personalProjectHoursGeneration;
  await dashboard.fetchPersonalTime();
  assert.ok(dashboard.state.personalProjectHoursGeneration > generation);
  assert.equal(dashboard.state.personalProjectHoursCache.size, 0);
  finishProject(response(projectHoursResult()));
  await pending;
  assert.equal(dashboard.state.personalProjectHoursCache.size, 0, "An old project response cannot repopulate refreshed data");
  assert.deepEqual(requests.map(request => request.url), ["/api/odoo/project-hours", "/api/odoo/my-time"]);
});

test("mismatched project data stays unavailable and retry replaces the failed cache entry", async () => {
  let attempt = 0;
  const { dashboard, requests, context } = loadDashboard(() => response(projectHoursResult(++attempt === 1 ? 102 : 101)),
    { personalTime: true, allowedRoutes: ["/api/odoo/project-hours"] });
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.selectedPersonalProjectId = 101;
  await dashboard.loadPersonalProjectHours(101);
  let view = context.projectBrowserRenders.at(-1).options;
  assert.equal(view.detail.personal, null);
  assert.equal(view.detail.project, null);
  assert.match(view.detail.error, /correspondent pas/);
  await view.onRetry();
  view = context.projectBrowserRenders.at(-1).options;
  assert.equal(view.detail.error, "");
  assert.equal(view.detail.personal.actual, 8);
  assert.equal(requests.length, 2);
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
