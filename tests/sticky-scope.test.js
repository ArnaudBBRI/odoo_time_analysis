const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { domFixture } = require("./dom-fixture");

const source = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const projectName = "[10001] Example project";
const emptyProjectName = "[10002] Zero-hour project";
const employeeName = "Alex Example";

function loadDashboard(mockFetch, { allowedRoutes = ["/api/odoo/project-timesheets", "/api/odoo/project-planning"],
  legacyScope = true, personalTime = false, dateControls = false, programmeDOM = false, capacity = false } = {}) {
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "Dashboard inline script must exist");
  const bootstrap = "const originalFetch = window.fetch.bind(window);";
  assert.equal(script.split(bootstrap).length, 2, "Test seam must precede the sole bootstrap");
  assert.ok(script.includes('window.addEventListener("dashboard:viewchange", handleDashboardViewChange);'),
    "The dashboard must bind its shared view-change handler");
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
      fetchEmployeeTimesheets, fetchDicoProjects, fetchPersonalTime, renderPersonalTimeMacro, renderPersonalRecommendations,
      renderPersonalCapacity, getPersonalCapacityYears,
      refreshYears, toggleSelectedYear, selectAllYears,
      getPersonalTimeScope, getPersonalTimeScopeLabel, renderYearFilters,
      setCustomDatePanelOpen, applyCustomDateRange, clearCustomDateRange, initializeCustomDateRangeControls,
      getScopedPersonalProjects, renderPersonalProjects, choosePersonalProject, clearPersonalProject,
      getSelectedDetailProjectId, setSelectedDetailProjectId, getDetailProjectCatalogue, fetchUnitDicoProjects,
      fetchProgrammeCatalogue, fetchProgrammeProjects, renderProgrammes, chooseProgramme,
      summarizePersonalProjectHours, summarizeLifetimeProjectHours, loadPersonalProjectHours, loadPersonalProjectMilestones, setPersonalProjectOrmitters, hasProjectOrmitters,
      summarizePersonalProjectPlanningMonthly, setPersonalProjectPlannedMonthlyEmployee,
      loadPersonalProjectFinance, setPersonalProjectView, setPersonalProjectConvention, setPersonalProjectExcludeOrmitterCosts, setPersonalProjectShowBwPersonnelCosts, updatePersonalProjectFilterVisibility,
      applyViewChange: handleDashboardViewChange,
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
  const scopeRoot = dateControls || programmeDOM ? domFixture() : null;
  const requests = [];
  const context = { DashboardI18n: require("./i18n-fixture"),
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
          querySelectorAll() { return []; }, replaceChildren() {}
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
  if (scopeRoot) {
    context.document = scopeRoot.ownerDocument;
    const classToggle = (element, name, active) => active ? element.classList.add(name) : element.classList.remove(name);
    context.document.getElementById = id => {
      if (!elements.has(id)) {
        const element = context.document.createElement(id.startsWith("customDate") && /Start|End/.test(id) ? "input" : "div");
        element.value = "";
        element.classList.toggle = (name, active) => classToggle(element, name, active);
        elements.set(id, element);
      }
      return elements.get(id);
    };
    const control = context.document.getElementById("customDateControl");
    control.append(...["customDateToggle", "customDatePanel"].map(id => context.document.getElementById(id)));
    context.document.getElementById("customDatePanel").append(...["customDateStart", "customDateEnd", "customDateReset"].map(id => context.document.getElementById(id)));
  }
  if (personalTime) {
    const module = require("../personal-time");
    context.personalRenders = [];
    context.recommendationRenders = [];
    context.projectBrowserRenders = [];
    context.projectBrowserCleanups = [];
    context.unitDicoRenders = [];
    context.unitDicoCleanups = [];
    context.programmeRenders = [];
    context.projectHostEvents = [];
    context.window = { PersonalTime: { ...module,
      summarizeProjects(data, years, now = new Date("2026-10-05T10:00:00Z")) { return module.summarizeProjects(data, years, now); },
      calendarProgress(years, now = new Date("2026-10-05T10:00:00Z")) { return module.calendarProgress(years, now); },
      render(container, projects, options) { context.personalRenders.push({ container, projects, options }); },
      renderRecommendations(container, model, options) { context.recommendationRenders.push({ container, model, options }); }
    }, ProjectMonthly: require("../project-monthly"),
    ProjectBrowser: {
      render(container, options) {
        context.projectHostEvents.push({ type: "project-render", container });
        context.projectBrowserRenders.push({ container, options });
        if (programmeDOM) return require("../project-browser").render(container, options);
      },
      cleanup(container) {
        context.projectBrowserCleanups.push(container);
        if (programmeDOM) require("../project-browser").cleanup(container);
      }
    }, UnitDico: { ...require("../unit-dico"),
      render(container, result, options) {
        context.projectHostEvents.push({ type: "unit-render", container });
        context.unitDicoRenders.push({ container, result, options });
        if (programmeDOM) return require("../unit-dico").render(container, result, options);
      },
      cleanup(container) {
        context.projectHostEvents.push({ type: "unit-cleanup", container });
        context.unitDicoCleanups.push(container);
        if (programmeDOM) require("../unit-dico").cleanup(container);
      }
    }, ProgrammeBrowser: { ...require("../programme-browser"),
      render(container, result, options) {
        context.programmeRenders.push({ container, result, options });
        if (programmeDOM) return require("../programme-browser").render(container, result, options);
      }
    } };
  }
  if (capacity && personalTime) {
    context.capacityRenders = [];
    context.capacitySummaries = [];
    context.window.WorkCapacity = { summarize(result, scope) {
      context.capacitySummaries.push({ result, scope });
      return { status: "available", availableHours: result.fixtureHours, availableDays: 200, years: [], warnings: [] };
    } };
    context.window.PersonalCapacity = { render(container, model, options) { context.capacityRenders.push({ container, model, options }); } };
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

function unitDicoResult(ids = [201, 202]) {
  return { ok: true, unit: { id: 206, name: "RESEARCH & DEVELOPMENT / DIGITAL CONSTRUCTION UNIT" },
    responsibleField: "lead_unit_id", asOf: "2026-10-05T10:00:00Z", warnings: [],
    projects: ids.map(id => ({ id, name: `Example unit project ${id}`, startDate: "2025-12-01", endDate: "2028-05-31", manager: null })) };
}

function unitProjectHoursResult(id = 201) {
  const result = projectHoursResult(id);
  result.hasOrmitters = true;
  result.lifetime = { startDate: "2025-12-01", endDate: "2028-05-31", conventionHours: 100, conventionStatus: "available" };
  return result;
}

function programmeResult(photo = null) {
  return { ok: true, programmes: require("../programme-browser").PROGRAMMES.map((programme, index) => ({ ...programme,
    manager: { ...programme.manager, id: index + 10, photoDataUrl: photo } })) };
}

function programmeProjectsResult(id, ids = id === "DC1" ? [301, 302, 303] : id === "DC2" ? [401, 402] : []) {
  const programme = require("../programme-browser").PROGRAMMES.find(row => row.id === id);
  const periods = id === "DC1" ? [["2026-01-01", "2026-03-31"], ["2026-02-01", "2026-04-30"], ["2010-01-01", "2999-12-31"]] :
    [["2026-06-01", "2026-06-30"], ["2026-07-01", "2026-07-31"]];
  return { ok: true, programme: { id, code: id, subtitle: programme?.subtitle }, coverage: { expected: ids.length, accessible: ids.length }, warnings: [],
    projects: ids.map((projectId, index) => ({ id: projectId, name: `[${id} ${index + 1}] [${100000 + projectId}] Synthetic programme project ${projectId}`,
      startDate: periods[index % periods.length][0], endDate: periods[index % periods.length][1], manager: { name: "Alex Example", photoDataUrl: null } })) };
}

test("Programmes opens fixed choices immediately and lazily caches one session-bound photo catalogue without a date scope", async () => {
  const data = programmeResult(), pending = [];
  const { dashboard, requests, context } = loadDashboard(() => new Promise(resolve => pending.push(resolve)),
    { personalTime: true, allowedRoutes: ["/api/odoo/programmes-catalogue"] });
  dashboard.state.personalTimeResult = personalResult(); dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.selectedYears = new Set([2025, 2026]); dashboard.state.customDateRange = { startDate: "2026-10-01", endDate: "2026-10-05" };
  const personal = dashboard.state.personalTimeResult, years = dashboard.state.selectedYears, range = dashboard.state.customDateRange;
  dashboard.renderProgrammes(); assert.equal(requests.length, 0);
  dashboard.applyViewChange({ detail: { view: "programmes" } });
  assert.equal(dashboard.state.programmeLoading, true); assert.equal(dashboard.state.programmeResult, null);
  assert.equal(dashboard.els.filterBar.hidden, true); assert.equal(context.programmeRenders.at(-1).container, dashboard.els.programmesContent);
  assert.deepEqual(requests, [{ url: "/api/odoo/programmes-catalogue", payload: {} }]);
  const duplicate = dashboard.fetchProgrammeCatalogue(); assert.equal(requests.length, 1, "Concurrent entry and explicit refresh share the pending read");
  pending[0](response(data)); await duplicate; await new Promise(setImmediate);
  assert.equal(dashboard.state.programmeLoading, false); assert.equal(dashboard.state.programmeError, "");
  assert.deepEqual(Array.from(dashboard.state.programmeResult.programmes, row => row.id), ["DC1", "DC2", "DC3"]);
  assert.equal(dashboard.state.personalTimeResult, personal); assert.equal(dashboard.state.selectedPersonalProjectId, 101);
  assert.equal(dashboard.state.selectedYears, years); assert.equal(dashboard.state.customDateRange, range);
  dashboard.applyViewChange({ detail: { view: "time" } }); dashboard.applyViewChange({ detail: { view: "programmes" } });
  await dashboard.fetchProgrammeCatalogue(); assert.equal(requests.length, 1, "Reopening Programmes reuses its independent catalogue");
});

test("Programmes selection accepts only canonical choices and loads membership without opening a project detail", async () => {
  const { dashboard, requests, context } = loadDashboard(({ payload }) => response(programmeProjectsResult(payload.programmeId)),
    { personalTime: true, allowedRoutes: ["/api/odoo/programme-projects"] });
  dashboard.state.dashboardView = "programmes"; dashboard.state.selectedPersonalProjectId = 101; dashboard.state.selectedUnitProjectId = 201;
  dashboard.renderProgrammes(); context.programmeRenders.at(-1).options.onSelect("DC2");
  assert.equal(dashboard.state.selectedProgrammeId, "DC2"); dashboard.renderProgrammes();
  await new Promise(setImmediate);
  assert.equal(context.programmeRenders.at(-1).options.selectedId, "DC2");
  for (const id of ["dc2", "DC4", 101, null, {}, "__unassigned"]) dashboard.chooseProgramme(id);
  dashboard.state.years = [2025, 2026]; dashboard.toggleSelectedYear(2025); dashboard.renderProgrammes();
  assert.equal(dashboard.state.selectedProgrammeId, "DC2", "An unrelated year selection does not change the selected programme");
  dashboard.state.programmeResult = programmeResult();
  dashboard.applyViewChange({ detail: { view: "time" } }); dashboard.applyViewChange({ detail: { view: "programmes" } });
  assert.equal(dashboard.state.selectedProgrammeId, "DC2"); assert.equal(dashboard.state.selectedPersonalProjectId, 101);
  assert.equal(dashboard.state.selectedUnitProjectId, 201);
  assert.deepEqual(requests, [{ url: "/api/odoo/programme-projects", payload: { programmeId: "DC2" } }]);
  assert.equal(context.projectBrowserRenders.length, 0); assert.ok(context.unitDicoRenders.length > 0);
});

test("an unavailable programme photo catalogue retains choices and their selected identity through retry", async () => {
  let result = { ok: false, error: "PRIVATE_SOURCE_ERROR" };
  const { dashboard, requests, context } = loadDashboard(() => response(result),
    { personalTime: true, allowedRoutes: ["/api/odoo/programmes-catalogue"] });
  dashboard.state.dashboardView = "programmes"; dashboard.state.selectedProgrammeId = "DC3";
  await dashboard.fetchProgrammeCatalogue();
  assert.equal(dashboard.state.programmeResult, null); assert.equal(dashboard.state.programmeLoading, false);
  assert.match(dashboard.state.programmeError, /portraits.*indisponibles/i); assert.doesNotMatch(dashboard.state.programmeError, /PRIVATE_SOURCE_ERROR/);
  assert.equal(dashboard.state.selectedProgrammeId, "DC3");
  const render = context.programmeRenders.at(-1); assert.equal(render.options.selectedId, "DC3");
  assert.equal(render.options.error, dashboard.state.programmeError);
  result = programmeResult(); await render.options.onRetry();
  assert.equal(dashboard.state.programmeError, ""); assert.equal(dashboard.state.programmeLoading, false);
  assert.equal(dashboard.state.selectedProgrammeId, "DC3"); assert.equal(requests.length, 2);
  assert.equal(context.programmeRenders.at(-1).options.selectedId, "DC3");
});

test("a failed forced programme refresh preserves already loaded portraits and the selected choice", async () => {
  let result = programmeResult("data:image/png;base64,aW1hZ2U=");
  const { dashboard, context } = loadDashboard(() => response(result),
    { personalTime: true, allowedRoutes: ["/api/odoo/programmes-catalogue"] });
  dashboard.state.dashboardView = "programmes"; await dashboard.fetchProgrammeCatalogue(); dashboard.state.selectedProgrammeId = "DC1";
  const previous = dashboard.state.programmeResult; result = { ok: false, error: "PRIVATE_SOURCE_ERROR" };
  await dashboard.fetchProgrammeCatalogue(true);
  assert.equal(dashboard.state.programmeResult, previous); assert.equal(dashboard.state.selectedProgrammeId, "DC1");
  assert.equal(dashboard.state.programmeLoading, false); assert.match(dashboard.state.programmeError, /portraits.*indisponibles/i);
  assert.doesNotMatch(dashboard.state.programmeError, /PRIVATE_SOURCE_ERROR/);
  assert.equal(context.programmeRenders.at(-1).result, previous);
});

test("obsolete programme reads cannot replace a newer catalogue or stop its loading state", async () => {
  const pending = [];
  const { dashboard, requests } = loadDashboard(() => new Promise(resolve => pending.push(resolve)),
    { personalTime: true, allowedRoutes: ["/api/odoo/programmes-catalogue"] });
  dashboard.state.dashboardView = "programmes"; const first = dashboard.fetchProgrammeCatalogue();
  const second = dashboard.fetchProgrammeCatalogue(true); assert.equal(requests.length, 2);
  pending[0](response(programmeResult())); await first;
  assert.equal(dashboard.state.programmeResult, null); assert.equal(dashboard.state.programmeLoading, true);
  pending[1](response(programmeResult("data:image/png;base64,aW1hZ2U="))); await second;
  assert.equal(dashboard.state.programmeLoading, false);
  assert.equal(dashboard.state.programmeResult.programmes[0].manager.photoDataUrl, "data:image/png;base64,aW1hZ2U=");
});

test("invalid programme catalogue identities cannot install data and their failure leaves fixed choices selectable", async () => {
  for (const programmes of [{}, [], [{ id: "unknown" }], [programmeResult().programmes[0], programmeResult().programmes[0], programmeResult().programmes[2]]]) {
    const { dashboard, context } = loadDashboard(() => response({ ok: true, programmes }),
      { personalTime: true, allowedRoutes: ["/api/odoo/programmes-catalogue"] });
    dashboard.state.dashboardView = "programmes"; dashboard.state.selectedProgrammeId = "DC2"; await dashboard.fetchProgrammeCatalogue();
    assert.equal(dashboard.state.programmeResult, null); assert.equal(dashboard.state.programmeLoading, false);
    assert.ok(dashboard.state.programmeError); assert.equal(dashboard.state.selectedProgrammeId, "DC2");
    assert.equal(context.programmeRenders.at(-1).options.selectedId, "DC2"); assert.equal(typeof context.programmeRenders.at(-1).options.onRetry, "function");
  }
});

test("programme cards remain above their associated project cards, lifetime calendar and monthly count while a new programme replaces all three", async () => {
  const { dashboard, context, requests } = loadDashboard(({ payload }) => response(programmeProjectsResult(payload.programmeId)),
    { personalTime: true, programmeDOM: true, allowedRoutes: ["/api/odoo/programme-projects"] });
  dashboard.state.dashboardView = "programmes"; dashboard.state.programmeResult = programmeResult(); dashboard.renderProgrammes();
  dashboard.renderPersonalProjects();
  const selector = dashboard.els.programmesContent, projects = dashboard.els.programmeProjectsContent;
  const choices = selector.querySelectorAll("[data-programme-choice]"); assert.equal(choices.length, 3);
  assert.equal(projects.children.length, 0, "Project membership is not fetched or invented before a programme is selected");
  const choose = id => { const radio = choices.find(choice => choice.value === id); radio.checked = true; radio.focus(); radio.dispatch("change"); };
  choose("DC1"); await new Promise(setImmediate);
  assert.deepEqual(projects.querySelectorAll("[data-unit-project-choice]").map(radio => radio.value), ["301", "302", "303"]);
  assert.ok(projects.querySelectorAll("[data-unit-project-choice]").every(radio => radio.name === "programme-project"));
  assert.match(projects.textContent, /DC1 · 01 \/ Projets · Backbone/); assert.match(projects.textContent, /3 \/ 3 projets référencés/);
  assert.equal(projects.querySelectorAll("[data-unit-timeline-start]")[0].getAttribute("data-unit-timeline-start"), "2026-01-01");
  assert.equal(projects.querySelectorAll("[data-unit-timeline-end]")[0].getAttribute("data-unit-timeline-end"), "2026-04-30");
  assert.deepEqual(projects.querySelectorAll("[data-unit-timeline-project]").map(row => row.getAttribute("data-unit-timeline-project")), ["301", "302"],
    "Year-2999 project cards remain selectable without stretching the reused charts");
  assert.match(projects.querySelectorAll(".unit-dico-concurrency")[0].textContent, /DC1 · 03 \/ Projets simultanés/);
  assert.equal(projects.querySelectorAll("[data-unit-concurrency-month]").length, 4);
  assert.deepEqual(projects.querySelectorAll("[data-unit-concurrency-month]").map(month =>
    Number(month.getAttribute("aria-label").match(/: (\d+) projets/)?.[1])), [1, 2, 2, 1]);
  assert.equal(projects.querySelectorAll("[data-unit-concurrency-start]")[0].getAttribute("data-unit-concurrency-start"), "2026-01-01");
  assert.equal(projects.querySelectorAll("[data-unit-concurrency-end]")[0].getAttribute("data-unit-concurrency-end"), "2026-04-30");
  choose("DC2");
  assert.equal(projects.querySelectorAll("[data-unit-project-choice]").length, 0, "Old programme projects disappear while the new membership loads");
  await new Promise(setImmediate);
  assert.deepEqual(projects.querySelectorAll("[data-unit-project-choice]").map(radio => radio.value), ["401", "402"]);
  assert.match(projects.textContent, /DC2 · 01 \/ Projets · Insight/); assert.match(projects.textContent, /DC2 · 02 \/ Calendrier des projets/);
  assert.equal(projects.querySelectorAll("[data-unit-timeline-start]")[0].getAttribute("data-unit-timeline-start"), "2026-06-01");
  assert.equal(projects.querySelectorAll("[data-unit-timeline-end]")[0].getAttribute("data-unit-timeline-end"), "2026-07-31");
  assert.match(projects.querySelectorAll(".unit-dico-concurrency")[0].textContent, /DC2 · 03 \/ Projets simultanés/);
  assert.equal(projects.querySelectorAll("[data-unit-concurrency-month]").length, 2);
  assert.deepEqual(projects.querySelectorAll("[data-unit-concurrency-month]").map(month =>
    Number(month.getAttribute("aria-label").match(/: (\d+) projets/)?.[1])), [1, 1]);
  assert.equal(projects.querySelectorAll("[data-unit-concurrency-start]")[0].getAttribute("data-unit-concurrency-start"), "2026-06-01");
  assert.equal(projects.querySelectorAll("[data-unit-concurrency-end]")[0].getAttribute("data-unit-concurrency-end"), "2026-07-31");
  assert.deepEqual(selector.querySelectorAll("[data-programme-choice]"), choices, "Only the lower project host is replaced");
  assert.equal(context.projectBrowserRenders.length, 0); assert.equal(dashboard.els.filterBar.hidden, true);
  choose("DC1"); await new Promise(setImmediate);
  assert.equal(requests.length, 2, "Returning to a loaded programme reuses its membership catalogue");
  assert.deepEqual(projects.querySelectorAll("[data-unit-project-choice]").map(radio => radio.value), ["301", "302", "303"]);
});

test("concurrent programme membership reads are deduplicated and inactive responses cache without replacing the active overview", async () => {
  const pending = [];
  const { dashboard, requests, context } = loadDashboard(({ payload }) => new Promise(resolve => pending.push({ id: payload.programmeId, resolve })),
    { personalTime: true, allowedRoutes: ["/api/odoo/programme-projects"] });
  dashboard.state.dashboardView = "programmes"; dashboard.chooseProgramme("DC1");
  const duplicate = dashboard.fetchProgrammeProjects("DC1"); dashboard.chooseProgramme("DC1"); assert.equal(requests.length, 1);
  dashboard.chooseProgramme("DC2"); assert.equal(requests.length, 2); assert.equal(context.unitDicoRenders.at(-1).options.loading, true);
  const renders = context.unitDicoRenders.length;
  pending[0].resolve(response(programmeProjectsResult("DC1"))); await duplicate; await new Promise(setImmediate);
  assert.equal(dashboard.state.programmeProjectsCache.get("DC1").result.programme.id, "DC1");
  assert.equal(context.unitDicoRenders.length, renders, "A late DC1 response cannot redraw the active DC2 host");
  assert.equal(dashboard.state.programmeProjectsCache.get("DC2").loading, true);
  pending[1].resolve(response(programmeProjectsResult("DC2"))); await new Promise(setImmediate);
  assert.equal(context.unitDicoRenders.at(-1).result.programme.id, "DC2");
  dashboard.chooseProgramme("DC1"); assert.equal(context.unitDicoRenders.at(-1).result.programme.id, "DC1"); assert.equal(requests.length, 2);
});

test("programme membership failures stay unavailable, retain the selector and retry into a verified empty catalogue", async () => {
  let result = { ok: false, error: "PRIVATE_PROGRAMME_SOURCE" };
  const { dashboard, context } = loadDashboard(() => response(result),
    { personalTime: true, programmeDOM: true, allowedRoutes: ["/api/odoo/programme-projects"] });
  dashboard.state.dashboardView = "programmes"; dashboard.renderProgrammes(); dashboard.chooseProgramme("DC3"); await new Promise(setImmediate);
  const cached = dashboard.state.programmeProjectsCache.get("DC3"); assert.equal(cached.result, null); assert.equal(cached.loading, false);
  assert.doesNotMatch(cached.error, /PRIVATE_PROGRAMME_SOURCE/); assert.match(cached.error, /indisponibles.*Réessayez/);
  assert.equal(dashboard.els.programmesContent.querySelectorAll("[data-programme-choice]").length, 3);
  assert.equal(dashboard.els.programmeProjectsContent.querySelectorAll("[data-unit-project-choice]").length, 0);
  assert.equal(dashboard.els.programmeProjectsContent.querySelectorAll("svg").length, 0, "Failure cannot display an invented zero count");
  result = programmeProjectsResult("DC3"); await context.unitDicoRenders.at(-1).options.onRetry();
  assert.equal(dashboard.state.programmeProjectsCache.get("DC3").result, result);
  assert.equal(dashboard.state.selectedProgrammeId, "DC3"); assert.match(dashboard.els.programmeProjectsContent.textContent, /Aucun projet DC3 accessible/);
  assert.equal(dashboard.els.programmesContent.querySelectorAll("[data-programme-choice]").length, 3);
});

test("wrong programme identities and malformed project IDs never become a verified programme catalogue", async () => {
  const invalid = [
    { ...programmeProjectsResult("DC1"), programme: { id: "DC2" } }, { ...programmeProjectsResult("DC1"), projects: {} },
    { ...programmeProjectsResult("DC1"), projects: [{ id: "301", name: "String ID" }] },
    { ...programmeProjectsResult("DC1"), projects: [{ id: 0, name: "Zero ID" }] },
    { ...programmeProjectsResult("DC1"), projects: [{ id: 301 }, { id: 301 }] }
  ];
  for (const data of invalid) {
    const { dashboard, context } = loadDashboard(() => response(data), { personalTime: true, allowedRoutes: ["/api/odoo/programme-projects"] });
    dashboard.state.dashboardView = "programmes"; dashboard.chooseProgramme("DC1"); await new Promise(setImmediate);
    const cached = dashboard.state.programmeProjectsCache.get("DC1"); assert.equal(cached.result, null); assert.equal(cached.loading, false);
    assert.ok(cached.error); assert.equal(context.unitDicoRenders.at(-1).result, null); assert.equal(dashboard.state.selectedProgrammeId, "DC1");
  }
});

test("a forced response for an inactive programme cannot clear another programme's hours and finance caches", async () => {
  let resolve;
  const { dashboard, requests } = loadDashboard(() => new Promise(done => { resolve = done; }),
    { personalTime: true, allowedRoutes: ["/api/odoo/programme-projects"] });
  dashboard.state.dashboardView = "programmes"; dashboard.state.selectedProgrammeId = "DC1";
  const read = dashboard.fetchProgrammeProjects("DC1", true);
  dashboard.state.selectedProgrammeId = "DC2";
  const hours = { result: unitProjectHoursResult(401) }, finance = { result: projectFinanceResult(401) };
  dashboard.state.personalProjectHoursCache.set("401", hours); dashboard.state.personalProjectFinanceCache.set("401", finance);
  const hourGeneration = dashboard.state.personalProjectHoursGeneration, financeGeneration = dashboard.state.personalProjectFinanceGeneration;
  resolve(response(programmeProjectsResult("DC1"))); await read;
  assert.equal(requests.length, 1); assert.equal(dashboard.state.programmeProjectsCache.get("DC1").result.programme.id, "DC1");
  assert.equal(dashboard.state.personalProjectHoursCache.get("401"), hours); assert.equal(dashboard.state.personalProjectFinanceCache.get("401"), finance);
  assert.equal(dashboard.state.personalProjectHoursGeneration, hourGeneration); assert.equal(dashboard.state.personalProjectFinanceGeneration, financeGeneration);
});

test("programme project choices enter shared Hours/Budget details while keeping the programme selector and Back focus", async () => {
  const { dashboard, requests, context } = loadDashboard(({ url, payload }) => response(url.endsWith("programme-projects") ?
    programmeProjectsResult(payload.programmeId) : url.endsWith("project-hours") ? unitProjectHoursResult(payload.projectId) : projectFinanceResult(payload.projectId)),
    { personalTime: true, programmeDOM: true, allowedRoutes: ["/api/odoo/programme-projects", "/api/odoo/project-hours", "/api/odoo/project-finance"] });
  dashboard.state.dashboardView = "programmes"; dashboard.renderProgrammes(); dashboard.chooseProgramme("DC1"); await new Promise(setImmediate);
  const selector = dashboard.els.programmesContent.children[0]; context.projectHostEvents.length = 0;
  const choice = dashboard.els.programmeProjectsContent.querySelectorAll('[data-unit-project-choice="301"]')[0];
  choice.checked = true; choice.dispatch("change"); await new Promise(setImmediate);
  assert.equal(dashboard.state.selectedProgrammeProjectId, 301); assert.equal(dashboard.state.selectedPersonalProjectId, null);
  assert.equal(context.projectHostEvents[0].type, "unit-cleanup"); assert.equal(context.projectHostEvents[1].type, "project-render");
  assert.equal(context.projectBrowserRenders.at(-1).container, dashboard.els.programmeProjectsContent);
  assert.equal(context.projectBrowserRenders.at(-1).options.selectedId, 301); assert.equal(dashboard.els.filterBar.hidden, false);
  assert.equal(dashboard.els.programmesContent.children[0], selector); assert.equal(dashboard.els.programmesContent.querySelectorAll("[data-programme-choice]").length, 3);
  dashboard.choosePersonalProject(401); assert.equal(dashboard.state.selectedProgrammeProjectId, 301, "Another programme's project cannot enter this selection");
  context.projectBrowserRenders.at(-1).options.onViewChange("budget"); await new Promise(setImmediate);
  assert.equal(dashboard.els.filterBar.hidden, true); assert.equal(context.projectBrowserRenders.at(-1).options.panel, "budget");
  context.projectBrowserRenders.at(-1).options.onBack();
  assert.equal(dashboard.state.selectedProgrammeProjectId, null); assert.equal(dashboard.state.selectedProgrammeId, "DC1");
  assert.equal(dashboard.els.programmesContent.children[0], selector); assert.equal(context.unitDicoRenders.at(-1).options.focusProjectId, 301);
  assert.equal(dashboard.els.programmeProjectsContent.ownerDocument.activeElement,
    dashboard.els.programmeProjectsContent.querySelectorAll('[data-unit-project-choice="301"]')[0]);
  assert.deepEqual(requests.map(request => request.url), ["/api/odoo/programme-projects", "/api/odoo/project-hours", "/api/odoo/project-finance"]);
});

test("programme membership keeps its full-life catalogue across date scope changes and releases the lower chart host on departure", async () => {
  const { dashboard, requests, context } = loadDashboard(({ payload }) => response(programmeProjectsResult(payload.programmeId)),
    { personalTime: true, allowedRoutes: ["/api/odoo/programme-projects"] });
  dashboard.state.dashboardView = "programmes"; dashboard.state.programmeResult = programmeResult(); dashboard.chooseProgramme("DC2"); await new Promise(setImmediate);
  const result = dashboard.state.programmeProjectsCache.get("DC2").result;
  dashboard.state.years = [2025, 2026]; dashboard.toggleSelectedYear(2025);
  dashboard.state.customDateRange = { startDate: "2020-01-01", endDate: "2020-01-02" }; dashboard.renderPersonalProjects();
  assert.equal(context.unitDicoRenders.at(-1).result, result); assert.equal(dashboard.els.filterBar.hidden, true); assert.equal(requests.length, 1);
  const cleanups = context.unitDicoCleanups.length; dashboard.applyViewChange({ detail: { view: "time" } });
  assert.equal(context.unitDicoCleanups.length, cleanups + 1); assert.equal(context.unitDicoCleanups.at(-1), dashboard.els.programmeProjectsContent);
  assert.equal(context.projectBrowserCleanups.at(-1), dashboard.els.programmeProjectsContent);
  assert.equal(dashboard.state.programmeProjectsCache.get("DC2").result, result);
  dashboard.applyViewChange({ detail: { view: "programmes" } }); await new Promise(setImmediate);
  assert.equal(context.unitDicoRenders.at(-1).result, result); assert.equal(requests.length, 1); assert.equal(dashboard.state.selectedProgrammeId, "DC2");
});

test("Unit DiCo catalogue starts lazily with an empty session-bound payload and stays independent of personal filters", async () => {
  const data = unitDicoResult();
  const { dashboard, requests, context } = loadDashboard(() => response(data),
    { personalTime: true, allowedRoutes: ["/api/odoo/unit-dico-projects"] });
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.selectedYears = new Set([2025, 2026]);
  dashboard.state.customDateRange = { startDate: "2026-10-01", endDate: "2026-10-05" };
  const personal = dashboard.state.personalTimeResult, years = dashboard.state.selectedYears, range = dashboard.state.customDateRange;
  dashboard.renderPersonalProjects(); assert.equal(requests.length, 0);
  dashboard.applyViewChange({ detail: { view: "unit-dico" } });
  assert.equal(dashboard.state.unitDicoLoading, true);
  assert.equal(dashboard.els.filterBar.hidden, true, "The full-lifetime overview does not display scoped year/date controls");
  await new Promise(setImmediate);
  assert.deepEqual(requests, [{ url: "/api/odoo/unit-dico-projects", payload: {} }]);
  assert.equal(dashboard.state.unitDicoResult, data);
  assert.equal(context.unitDicoRenders.at(-1).container, dashboard.els.unitDicoContent);
  assert.equal(context.unitDicoRenders.at(-1).result.projects.length, 2, "Projects with no personal hours remain in the fixed unit catalogue");
  assert.equal(dashboard.state.personalTimeResult, personal); assert.equal(dashboard.state.selectedPersonalProjectId, 101);
  assert.equal(dashboard.state.selectedYears, years); assert.equal(dashboard.state.customDateRange, range);
  dashboard.applyViewChange({ detail: { view: "time" } });
  dashboard.applyViewChange({ detail: { view: "unit-dico" } });
  await dashboard.fetchUnitDicoProjects();
  assert.equal(requests.length, 1, "Reopening the tab and repeated requests reuse the catalogue");
  assert.equal(dashboard.state.unitDicoLoading, false);
});

test("Unit DiCo rejects a wrong unit, relation, catalogue or project identity and exposes a working retry", async () => {
  const wrongResults = [
    { ...unitDicoResult(), unit: { id: 205 } },
    { ...unitDicoResult(), responsibleField: "other_unit_id" },
    { ...unitDicoResult(), projects: {} },
    { ...unitDicoResult(), projects: [{ id: "201", name: "String ID" }] },
    { ...unitDicoResult(), projects: [{ id: -1, name: "Bad ID" }] }
  ];
  for (const wrong of wrongResults) {
    let data = wrong;
    const { dashboard, requests, context } = loadDashboard(() => response(data),
      { personalTime: true, allowedRoutes: ["/api/odoo/unit-dico-projects"] });
    dashboard.state.dashboardView = "unit-dico";
    await dashboard.fetchUnitDicoProjects();
    assert.equal(dashboard.state.unitDicoResult, null);
    assert.equal(dashboard.state.selectedUnitProjectId, null);
    assert.match(dashboard.state.unitDicoError, /indisponibles.*Réessayez/);
    assert.equal(context.unitDicoRenders.at(-1).options.error, dashboard.state.unitDicoError);
    data = unitDicoResult([]);
    await context.unitDicoRenders.at(-1).options.onRetry();
    assert.equal(dashboard.state.unitDicoResult, data);
    assert.equal(dashboard.state.unitDicoError, "");
    assert.equal(dashboard.state.unitDicoLoading, false); assert.equal(requests.length, 2);
  }
});

test("an obsolete Unit DiCo response cannot install a catalogue or stop a newer refresh", async () => {
  const pending = [];
  const { dashboard, requests } = loadDashboard(() => new Promise(resolve => pending.push(resolve)),
    { personalTime: true, allowedRoutes: ["/api/odoo/unit-dico-projects"] });
  dashboard.state.dashboardView = "unit-dico";
  const first = dashboard.fetchUnitDicoProjects();
  await dashboard.fetchUnitDicoProjects(); assert.equal(requests.length, 1, "Concurrent non-forced requests share the in-flight read");
  const second = dashboard.fetchUnitDicoProjects(true);
  pending[0](response(unitDicoResult([201]))); await first;
  assert.equal(dashboard.state.unitDicoResult, null);
  assert.equal(dashboard.state.unitDicoLoading, true, "The old finally block cannot clear the newer loading state");
  const latest = unitDicoResult([202]); pending[1](response(latest)); await second;
  assert.equal(dashboard.state.unitDicoResult, latest); assert.equal(dashboard.state.unitDicoLoading, false);
  assert.equal(requests.length, 2);
});

test("Unit DiCo selection opens existing hours and finance for a unit-only project while preserving personal selection", async () => {
  const { dashboard, requests, context } = loadDashboard(({ url, payload }) => response(
    url.endsWith("project-finance") ? projectFinanceResult(payload.projectId) : unitProjectHoursResult(payload.projectId)),
  { personalTime: true, allowedRoutes: ["/api/odoo/project-hours", "/api/odoo/project-finance"] });
  dashboard.state.personalTimeResult = personalResult(); dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.unitDicoResult = unitDicoResult(); dashboard.state.dashboardView = "unit-dico";
  dashboard.renderPersonalProjects();
  context.unitDicoRenders.at(-1).options.onSelect(201);
  await new Promise(setImmediate);
  assert.equal(dashboard.state.selectedUnitProjectId, 201); assert.equal(dashboard.state.selectedPersonalProjectId, 101);
  let view = context.projectBrowserRenders.at(-1);
  assert.equal(view.container, dashboard.els.unitDicoContent); assert.equal(view.options.selectedId, 201);
  assert.equal(view.options.detail.project.actual, 28); assert.equal(dashboard.els.filterBar.hidden, false);
  assert.deepEqual(requests[0], { url: "/api/odoo/project-hours", payload: { projectId: 201 } });
  view.options.onViewChange("budget"); await new Promise(setImmediate);
  view = context.projectBrowserRenders.at(-1);
  assert.equal(view.options.panel, "budget"); assert.equal(view.options.finance.result.project.id, 201);
  assert.equal(dashboard.els.filterBar.hidden, true);
  assert.deepEqual(requests[1], { url: "/api/odoo/project-finance", payload: { projectId: 201 } });
  view.options.onViewChange("hours"); await new Promise(setImmediate);
  assert.equal(dashboard.els.filterBar.hidden, false); assert.equal(requests.length, 2, "Panel switches reuse exact-ID caches");
  dashboard.choosePersonalProject(101); dashboard.choosePersonalProject(999);
  await dashboard.loadPersonalProjectHours(999); await dashboard.loadPersonalProjectFinance(999);
  assert.equal(dashboard.state.selectedUnitProjectId, 201); assert.equal(requests.length, 2, "Personal-only/unrelated IDs cannot enter unit selection");
  context.projectBrowserRenders.at(-1).options.onBack();
  assert.equal(dashboard.state.selectedUnitProjectId, null); assert.equal(dashboard.state.selectedPersonalProjectId, 101);
  assert.equal(context.unitDicoRenders.at(-1).options.focusProjectId, 201);
  assert.equal(dashboard.els.filterBar.hidden, true);
});

test("Unit DiCo membership and timeline keep all projects when the shared hours scope changes", () => {
  const { dashboard, requests, context } = loadDashboard(undefined, { personalTime: true, dateControls: true });
  dashboard.state.personalTimeResult = personalResult(); dashboard.state.unitDicoResult = unitDicoResult();
  dashboard.state.dashboardView = "unit-dico"; dashboard.state.selectedUnitProjectId = 201;
  dashboard.state.personalProjectHoursCache.set("201", { result: unitProjectHoursResult(), loading: false, error: "" });
  dashboard.renderPersonalProjects();
  const catalogue = dashboard.state.unitDicoResult;
  dashboard.state.selectedYears = new Set([2024]); dashboard.renderPersonalProjects();
  assert.equal(dashboard.state.selectedUnitProjectId, 201);
  assert.equal(context.projectBrowserRenders.at(-1).options.detail.project.actual, 0);
  assert.equal(context.projectBrowserRenders.at(-1).options.projects.length, 2);
  dashboard.els.customDateStart.value = "2026-10-01"; dashboard.els.customDateEnd.value = "2026-10-05";
  dashboard.applyCustomDateRange(); dashboard.renderPersonalProjects();
  assert.equal(dashboard.state.selectedUnitProjectId, 201); assert.equal(dashboard.state.unitDicoResult, catalogue);
  assert.equal(context.projectBrowserRenders.at(-1).options.detail.project.actual, 28);
  dashboard.clearPersonalProject(); assert.equal(context.unitDicoRenders.at(-1).result, catalogue);
  assert.equal(requests.length, 0, "Scope changes recalculate hours without replacing or fetching the full-lifetime catalogue");
});

test("Unit DiCo detail uses exact-ID local hour, monthly and finance preferences without affecting another project", () => {
  const { dashboard, requests, context } = loadDashboard(undefined, { personalTime: true });
  dashboard.state.personalTimeResult = personalResult(); dashboard.state.unitDicoResult = unitDicoResult();
  dashboard.state.dashboardView = "unit-dico"; dashboard.state.selectedUnitProjectId = 201;
  for (const id of [201, 202]) {
    dashboard.state.personalProjectHoursCache.set(String(id), { result: unitProjectHoursResult(id), loading: false, error: "" });
    dashboard.state.personalProjectFinanceCache.set(String(id), { result: projectFinanceResult(id), loading: false, error: "" });
  }
  dashboard.renderPersonalProjects(); const latest = () => context.projectBrowserRenders.at(-1).options;
  assert.equal(latest().detail.includeOrmitters, false);
  latest().onIncludeOrmittersChange(true); latest().onMonthlyModeChange("cumulative");
  latest().onMonthlyEmployeeChange("employee:11");
  assert.equal(latest().detail.includeOrmitters, true); assert.equal(latest().detail.monthlyMode, "cumulative");
  assert.equal(latest().detail.monthlyEmployeeId, "employee:11");
  latest().onViewChange("budget"); latest().onShowBwPersonnelCostsChange(true);
  latest().onExcludeOrmitterCostsChange(true); latest().onConventionChange(501);
  assert.equal(latest().finance.showBwPersonnelCosts, true); assert.equal(latest().finance.excludeOrmitterCosts, true);
  assert.equal(latest().finance.selectedConventionId, "501");
  dashboard.choosePersonalProject(202);
  assert.equal(latest().detail.includeOrmitters, false); assert.equal(latest().detail.monthlyMode, "monthly");
  assert.equal(latest().finance.showBwPersonnelCosts, false); assert.equal(latest().finance.excludeOrmitterCosts, false);
  dashboard.choosePersonalProject(201);
  assert.equal(latest().panel, "budget"); assert.equal(latest().finance.showBwPersonnelCosts, true);
  latest().onViewChange("hours"); assert.equal(latest().detail.monthlyEmployeeId, "employee:11");
  assert.equal(latest().detail.monthlyMode, "cumulative"); assert.equal(latest().detail.includeOrmitters, true);
  assert.equal(dashboard.state.personalProjectOrmitters.has("101"), false);
  assert.equal(dashboard.state.personalProjectShowBwPersonnelCosts.has("101"), false);
  assert.equal(requests.length, 0, "All active unit callbacks reuse cached exact-project records");
});

test("leaving Unit DiCo details tears down their host and reopening keeps their selected project", async () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true });
  dashboard.state.personalTimeResult = personalResult(); dashboard.state.unitDicoResult = unitDicoResult();
  dashboard.state.dashboardView = "unit-dico"; dashboard.state.selectedUnitProjectId = 201;
  dashboard.state.personalProjectHoursCache.set("201", { result: unitProjectHoursResult(), loading: false, error: "" });
  dashboard.renderPersonalProjects();
  dashboard.applyViewChange({ detail: { view: "time" } });
  assert.equal(context.projectBrowserCleanups.at(-1), dashboard.els.unitDicoContent,
    "Hidden detail modal/observer/tooltip handlers must be released before switching views");
  assert.equal(dashboard.state.selectedUnitProjectId, 201);
  dashboard.applyViewChange({ detail: { view: "unit-dico" } }); await new Promise(setImmediate);
  assert.equal(context.projectBrowserRenders.at(-1).container, dashboard.els.unitDicoContent);
  assert.equal(context.projectBrowserRenders.at(-1).options.selectedId, 201);
  assert.equal(requests.length, 0);
});

test("leaving the Unit DiCo overview releases timeline reveal observers without changing its catalogue", async () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true });
  dashboard.state.personalTimeResult = personalResult(); dashboard.state.unitDicoResult = unitDicoResult();
  dashboard.state.dashboardView = "unit-dico";
  const catalogue = dashboard.state.unitDicoResult;
  dashboard.renderPersonalProjects();
  assert.equal(context.unitDicoCleanups.length, 0);
  dashboard.applyViewChange({ detail: { view: "time" } });
  assert.deepEqual(context.unitDicoCleanups, [dashboard.els.unitDicoContent]);
  assert.equal(dashboard.state.unitDicoResult, catalogue); assert.equal(dashboard.state.selectedUnitProjectId, null);
  dashboard.applyViewChange({ detail: { view: "unit-dico" } }); await new Promise(setImmediate);
  assert.equal(context.unitDicoRenders.at(-1).result, catalogue);
  assert.equal(context.unitDicoCleanups.length, 1, "Reopening the overview remounts its own chart rather than cleaning another host");
  assert.equal(requests.length, 0);
});

test("opening a Unit DiCo project cleans the overview timeline before the shared detail replaces its host", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true });
  dashboard.state.personalTimeResult = personalResult(); dashboard.state.unitDicoResult = unitDicoResult();
  dashboard.state.dashboardView = "unit-dico";
  dashboard.state.personalProjectHoursCache.set("201", { result: unitProjectHoursResult(), loading: false, error: "" });
  dashboard.renderPersonalProjects(); context.projectHostEvents.length = 0;
  context.unitDicoRenders.at(-1).options.onSelect(201);
  const events = context.projectHostEvents;
  assert.equal(events[0].type, "unit-cleanup"); assert.equal(events[1].type, "project-render");
  assert.ok(events.every(event => event.container === dashboard.els.unitDicoContent));
  assert.equal(context.projectBrowserRenders.at(-1).options.selectedId, 201);
  assert.equal(dashboard.state.selectedUnitProjectId, 201); assert.equal(requests.length, 0);
  context.projectBrowserRenders.at(-1).options.onBack();
  assert.equal(context.projectHostEvents.at(-1).type, "unit-render");
  assert.equal(context.unitDicoRenders.at(-1).options.focusProjectId, 201);
});

test("forced Unit DiCo refresh preserves a valid selection while replacing cached detail generations", async () => {
  const pending = [];
  const { dashboard, requests, context } = loadDashboard(({ url }) => url.endsWith("unit-dico-projects") ? new Promise(resolve => pending.push(resolve)) : response(unitProjectHoursResult()),
    { personalTime: true, allowedRoutes: ["/api/odoo/unit-dico-projects", "/api/odoo/project-hours"] });
  dashboard.state.personalTimeResult = personalResult(); const original = unitDicoResult();
  dashboard.state.unitDicoResult = original; dashboard.state.dashboardView = "unit-dico"; dashboard.state.selectedUnitProjectId = 201;
  const staleHours = { result: unitProjectHoursResult(), loading: false, error: "" };
  dashboard.state.personalProjectHoursCache.set("201", staleHours);
  dashboard.state.personalProjectFinanceCache.set("201", { result: projectFinanceResult(), loading: false, error: "" });
  const previousHoursGeneration = dashboard.state.personalProjectHoursGeneration;
  const previousFinanceGeneration = dashboard.state.personalProjectFinanceGeneration;
  const refresh = dashboard.fetchUnitDicoProjects(true);
  assert.equal(dashboard.state.unitDicoResult, original); assert.equal(dashboard.state.selectedUnitProjectId, 201);
  assert.equal(dashboard.state.unitDicoLoading, true);
  pending[0](response(unitDicoResult())); await refresh; await new Promise(setImmediate);
  assert.equal(dashboard.state.selectedUnitProjectId, 201);
  assert.ok(dashboard.state.personalProjectHoursGeneration > previousHoursGeneration);
  assert.ok(dashboard.state.personalProjectFinanceGeneration > previousFinanceGeneration);
  assert.notEqual(dashboard.state.personalProjectHoursCache.get("201"), staleHours);
  assert.equal(dashboard.state.personalProjectFinanceCache.size, 0);
  assert.equal(context.projectBrowserRenders.at(-1).options.detail.loading, false);
  assert.deepEqual(requests.map(request => request.url), ["/api/odoo/unit-dico-projects", "/api/odoo/project-hours"]);
});

test("Unit DiCo refresh clears only a project absent from its new catalogue and returns to the overview", async () => {
  const { dashboard, context, requests } = loadDashboard(() => response(unitDicoResult([202])),
    { personalTime: true, allowedRoutes: ["/api/odoo/unit-dico-projects"] });
  dashboard.state.personalTimeResult = personalResult(); dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.unitDicoResult = unitDicoResult(); dashboard.state.dashboardView = "unit-dico"; dashboard.state.selectedUnitProjectId = 201;
  await dashboard.fetchUnitDicoProjects(true);
  assert.equal(dashboard.state.selectedUnitProjectId, null); assert.equal(dashboard.state.selectedPersonalProjectId, 101);
  assert.equal(context.unitDicoRenders.at(-1).result.projects[0].id, 202);
  assert.equal(dashboard.els.filterBar.hidden, true); assert.equal(requests.length, 1);
});

test("a pending Unit DiCo refresh restarts the active personal detail and ignores its previous cache generation", async () => {
  const pending = { unit: [], hours: [] };
  const { dashboard, context, requests } = loadDashboard(({ url }) => new Promise(resolve => {
    pending[url.endsWith("unit-dico-projects") ? "unit" : "hours"].push(resolve);
  }), { personalTime: true, allowedRoutes: ["/api/odoo/unit-dico-projects", "/api/odoo/project-hours"] });
  dashboard.state.personalTimeResult = personalResult(); dashboard.state.unitDicoResult = unitDicoResult();
  dashboard.state.dashboardView = "unit-dico"; dashboard.state.selectedUnitProjectId = 201;
  dashboard.state.personalProjectHoursCache.set("201", { result: unitProjectHoursResult(), loading: false, error: "" });
  const refresh = dashboard.fetchUnitDicoProjects(true);
  dashboard.applyViewChange({ detail: { view: "projects" } }); dashboard.choosePersonalProject(101);
  assert.equal(pending.hours.length, 1);
  const previousGeneration = dashboard.state.personalProjectHoursGeneration;
  pending.unit[0](response(unitDicoResult())); await refresh;
  assert.ok(dashboard.state.personalProjectHoursGeneration > previousGeneration);
  assert.equal(pending.hours.length, 2, "Refreshing the shared cache restarts the current personal detail read");
  pending.hours[0](response(projectHoursResult())); await new Promise(setImmediate);
  assert.equal(dashboard.state.personalProjectHoursCache.get("101").result, null);
  assert.equal(dashboard.state.personalProjectHoursCache.get("101").loading, true, "The stale response cannot end the replacement load");
  pending.hours[1](response(projectHoursResult())); await new Promise(setImmediate);
  assert.equal(dashboard.state.selectedPersonalProjectId, 101); assert.equal(dashboard.state.selectedUnitProjectId, 201);
  assert.equal(context.projectBrowserRenders.at(-1).container, dashboard.els.personalProjectsContent);
  assert.equal(context.projectBrowserRenders.at(-1).options.detail.loading, false);
  assert.equal(context.projectBrowserRenders.at(-1).options.detail.project.actual, 28);
  assert.deepEqual(requests.map(request => request.url), ["/api/odoo/unit-dico-projects", "/api/odoo/project-hours", "/api/odoo/project-hours"]);
});

test("reentering Unit DiCo after a personal refresh reloads its remembered hours or budget while reusing the catalogue", async () => {
  for (const panel of ["hours", "budget"]) {
    const { dashboard, context, requests } = loadDashboard(({ url, payload }) => response(
      url.endsWith("my-time") ? personalResult() : url.endsWith("project-finance") ? projectFinanceResult(payload.projectId) : unitProjectHoursResult(payload.projectId)),
    { personalTime: true, allowedRoutes: ["/api/odoo/my-time", "/api/odoo/project-hours", "/api/odoo/project-finance"] });
    dashboard.state.personalTimeResult = personalResult(); const catalogue = unitDicoResult();
    dashboard.state.unitDicoResult = catalogue; dashboard.state.selectedUnitProjectId = 201;
    dashboard.state.personalProjectView.set("201", panel); dashboard.state.dashboardView = "time";
    dashboard.state.personalProjectHoursCache.set("201", { result: unitProjectHoursResult(), loading: false, error: "" });
    dashboard.state.personalProjectFinanceCache.set("201", { result: projectFinanceResult(201), loading: false, error: "" });
    await dashboard.fetchPersonalTime();
    assert.equal(dashboard.state.personalProjectHoursCache.size, 0); assert.equal(dashboard.state.personalProjectFinanceCache.size, 0);
    assert.equal(dashboard.state.unitDicoResult, catalogue); assert.equal(dashboard.state.selectedUnitProjectId, 201);
    dashboard.applyViewChange({ detail: { view: "unit-dico" } }); await new Promise(setImmediate);
    const rendered = context.projectBrowserRenders.at(-1).options;
    assert.equal(rendered.selectedId, 201); assert.equal(rendered.panel, panel);
    if (panel === "hours") assert.equal(rendered.detail.loading, false);
    else assert.equal(rendered.finance.result.project.id, 201);
    assert.deepEqual(requests.map(request => request.url), ["/api/odoo/my-time", `/api/odoo/project-${panel === "hours" ? "hours" : "finance"}`]);
    dashboard.applyViewChange({ detail: { view: "unit-dico" } }); await new Promise(setImmediate);
    assert.equal(requests.length, 2, "Repeated entry reuses the replacement detail cache");
  }
});

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
  dashboard.state.dashboardView = "projects";
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
  assert.match(dashboard.state.personalProjectFinanceCache.get("101").error, /Le budget du projet.*indisponible.*Réessayez/);
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

test("BW personnel display defaults off, stays local per project and survives finance refresh independently", async () => {
  const { dashboard, requests, context } = loadDashboard(({ url, payload }) => response(
    url.endsWith("my-time") ? dashboard.state.personalTimeResult : projectFinanceResult(payload.projectId)),
  { personalTime: true, allowedRoutes: ["/api/odoo/project-finance", "/api/odoo/my-time"] });
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.personalTimeResult.projects.push({ id: 102, name: emptyProjectName });
  dashboard.state.personalTimeResult.timesheets.lines.push(line(11, 1, false, employeeName, emptyProjectName));
  dashboard.state.dashboardView = "projects";
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.personalProjectView.set("101", "budget");
  dashboard.setPersonalProjectShowBwPersonnelCosts(true);
  assert.equal(dashboard.state.personalProjectShowBwPersonnelCosts.size, 0, "No choice is stored before finance data exists");
  await dashboard.loadPersonalProjectFinance(101);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.showBwPersonnelCosts, false);
  const source = dashboard.state.personalProjectFinanceCache.get("101").result;
  context.projectBrowserRenders.at(-1).options.onShowBwPersonnelCostsChange(true);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.showBwPersonnelCosts, true);
  assert.equal(dashboard.state.personalProjectOrmitters.has("101"), false);
  assert.equal(dashboard.state.personalProjectExcludeOrmitterCosts.has("101"), false);
  dashboard.setPersonalProjectShowBwPersonnelCosts("true");
  dashboard.setPersonalProjectShowBwPersonnelCosts(true);
  dashboard.setPersonalProjectExcludeOrmitterCosts(true);
  dashboard.state.selectedYears = new Set([2025, 2026]);
  dashboard.renderPersonalProjects();
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.showBwPersonnelCosts, true);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.excludeOrmitterCosts, true);
  assert.equal(dashboard.state.personalProjectFinanceCache.get("101").result, source);
  assert.equal(requests.length, 1, "Checkbox and period changes use the existing finance result");
  dashboard.state.selectedPersonalProjectId = 102;
  dashboard.state.personalProjectView.set("102", "budget");
  await dashboard.loadPersonalProjectFinance(102);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.showBwPersonnelCosts, false);
  dashboard.state.selectedPersonalProjectId = 101;
  await dashboard.fetchPersonalTime();
  await new Promise(setImmediate);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.showBwPersonnelCosts, true);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.excludeOrmitterCosts, true);
  assert.deepEqual(requests.map(request => request.url), ["/api/odoo/project-finance", "/api/odoo/project-finance", "/api/odoo/my-time", "/api/odoo/project-finance"]);
  dashboard.setPersonalProjectShowBwPersonnelCosts(false);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.showBwPersonnelCosts, false);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.excludeOrmitterCosts, true);
  dashboard.state.selectedPersonalProjectId = null;
  dashboard.setPersonalProjectShowBwPersonnelCosts(true);
  assert.equal(dashboard.state.personalProjectShowBwPersonnelCosts.has("null"), false);
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
  assert.match(menu.replace(/<span[^>]*>|<\/span>/g, ""), /data-view="time" aria-current="page">(?:<span[^>]*>)?Mon temps(?:<\/span>)?<\/button>/);
  assert.match(menu.replace(/<span[^>]*>|<\/span>/g, ""), /data-view="projects">Mes Projets<\/button>\s*<button type="button" data-view="unit-dico">Unité DiCo<\/button>/);
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

test("Mon temps recommendations react locally to tolerance, data and scope while preserving the pie and legend state", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true, allowedRoutes: [] });
  dashboard.renderPersonalTimeMacro(); assert.equal(dashboard.els.personalTimeRecommendations.hidden, true);
  const result = personalResult(); result.projects[0].startDate = "2026-01-01"; result.projects[0].endDate = "2026-12-31";
  // Keep a future personal allocation so this controller case exercises the
  // tolerance groups; exhausted planning now correctly takes stop priority.
  result.planning.slots[0].end = "2027-01-01 00:00:00";
  result.planning.slots[0].endMonth = "2026-12";
  dashboard.state.personalTimeResult = result; dashboard.state.hiddenPersonalProjects.add(101);
  dashboard.renderPersonalTimeMacro();
  assert.equal(dashboard.els.personalTimeRecommendations.hidden, false); assert.equal(dashboard.state.personalTimeRecommendationTolerance, 15);
  const initial = context.recommendationRenders.at(-1), pieRenders = context.personalRenders.length;
  assert.equal(initial.container, dashboard.els.personalTimeRecommendations); assert.equal(initial.model.rows.length, 1,
    "Hiding a pie sector does not remove that project's recommendation");
  assert.equal(initial.model.rows[0].category, "slow");
  initial.options.onToleranceChange(100);
  assert.equal(dashboard.state.personalTimeRecommendationTolerance, 100); assert.equal(context.recommendationRenders.at(-1).model.rows[0].category, "continue");
  assert.equal(context.personalRenders.length, pieRenders, "A slider movement updates only the recommendation host");
  initial.options.onToleranceChange(-10); assert.equal(dashboard.state.personalTimeRecommendationTolerance, 0);
  initial.options.onToleranceChange(Infinity); assert.equal(dashboard.state.personalTimeRecommendationTolerance, 0);
  dashboard.state.customDateRange = { startDate: "2026-10-01", endDate: "2026-10-02" }; dashboard.renderPersonalRecommendations();
  assert.equal(context.recommendationRenders.at(-1).model.rows[0].actual, 0); assert.equal(context.recommendationRenders.at(-1).model.rows[0].periodEnded, true);
  dashboard.state.customDateRange = null; result.timesheets.lines[0].hours = 3; dashboard.renderPersonalRecommendations();
  assert.equal(context.recommendationRenders.at(-1).model.rows[0].actual, 3); assert.ok(dashboard.state.hiddenPersonalProjects.has(101));
  assert.equal(context.personalRenders.length, pieRenders); assert.equal(requests.length, 0);
  assert.ok(source.indexOf('id="personalTimeRecommendations"') < source.indexOf('id="personalTimeContent"'),
    "The recommendation host precedes the personal pie");
});

test("personal work capacity caches by scoped years and includes hidden projects in total planning", async () => {
  const { dashboard, context, requests } = loadDashboard(request => response({ ok: true, fixtureHours: request.payload.years[0] }),
    { personalTime: true, capacity: true, allowedRoutes: ["/api/odoo/my-work-capacity"] });
  dashboard.renderPersonalTimeMacro();
  assert.equal(dashboard.els.personalTimeCapacity.hidden, true);
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.hiddenPersonalProjects.add(101);
  dashboard.renderPersonalTimeMacro();
  assert.equal(context.capacityRenders.at(-1).options.loading, true);
  await new Promise(setImmediate);
  assert.deepEqual(requests.map(request => request.payload), [{ years: [2026] }]);
  assert.equal(context.capacityRenders.at(-1).model.plannedHours, 6);
  assert.equal(context.capacityRenders.at(-1).model.availableHours, 2026);
  assert.equal(dashboard.els.personalTimeCapacity.hidden, false);
  dashboard.state.hiddenPersonalProjects.clear(); dashboard.renderPersonalTimeMacro();
  assert.equal(requests.length, 1, "Pie visibility never reloads HR sources or changes total planning");
  assert.equal(context.capacityRenders.at(-1).model.plannedHours, 6);
  dashboard.state.selectedYears = new Set([2027]); dashboard.renderPersonalTimeMacro();
  await new Promise(setImmediate);
  assert.deepEqual(requests.at(-1).payload, { years: [2027] });
  assert.equal(context.capacityRenders.at(-1).model.plannedHours, 0);
  dashboard.state.selectedYears = new Set([2026]); dashboard.renderPersonalTimeMacro();
  assert.equal(requests.length, 2);
  assert.equal(context.capacityRenders.at(-1).model.availableHours, 2026);
});

test("capacity planning covers complete selected years, including future and uncatalogued personal allocations", async () => {
  const { dashboard, context } = loadDashboard(() => response({ ok: true, fixtureHours: 1700 }),
    { personalTime: true, capacity: true, allowedRoutes: ["/api/odoo/my-work-capacity"] });
  const result = personalResult();
  const allocation = (id, hours, start, end, projectId = 101) => ({
    ...slot(11, hours), id, projectId, project: projectId === 101 ? projectName : null,
    start, end, startMonth: start.slice(0, 7), endMonth: end.slice(0, 7)
  });
  result.planning.slots = [
    allocation(1, 100, "2026-01-01 00:00:00", "2027-01-01 00:00:00"),
    allocation(2, 50, "2026-11-01 00:00:00", "2026-12-01 00:00:00"),
    allocation(3, 15, "2026-12-01 00:00:00", "2027-01-01 00:00:00", null),
    allocation(4, 120, "2027-06-01 00:00:00", "2027-07-01 00:00:00"),
    allocation(5, 50, "2027-08-01 00:00:00", "2027-09-01 00:00:00", 999),
    allocation(6, 900, "2025-01-01 00:00:00", "2026-01-01 00:00:00"),
    allocation(7, 1000, "2028-01-01 00:00:00", "2029-01-01 00:00:00")
  ];
  dashboard.state.personalTimeResult = result;
  dashboard.state.hiddenPersonalProjects.add(101);
  for (const [years, expected] of [[[2026], 165], [[2027], 170], [[2026, 2027], 335]]) {
    dashboard.state.selectedYears = new Set(years);
    dashboard.renderPersonalTimeMacro();
    await new Promise(setImmediate);
    assert.equal(context.capacityRenders.at(-1).model.plannedHours, expected,
      "Planning includes the entire selected years, without a cutoff at today's date");
    assert.deepEqual([...context.capacitySummaries.at(-1).scope], years,
      "Available capacity and complete planning use the same selected years");
  }
});

test("custom capacity scopes fetch each intersecting year and keep denied capacity independent of unknown planning", async () => {
  const { dashboard, context, requests } = loadDashboard(() => { throw new Error("private-upstream-secret"); },
    { personalTime: true, capacity: true, allowedRoutes: ["/api/odoo/my-work-capacity"] });
  dashboard.state.personalTimeResult = { ...personalResult(), planning: null };
  dashboard.state.customDateRange = { startDate: "2026-12-01", endDate: "2027-01-15" };
  dashboard.renderPersonalTimeMacro(); await new Promise(setImmediate);
  assert.deepEqual(requests[0].payload, { years: [2026, 2027] });
  const view = context.capacityRenders.at(-1);
  assert.equal(view.model.plannedHours, null);
  assert.equal(view.model.availableHours, null);
  assert.equal(view.options.loading, false);
  assert.match(view.options.error, /indisponibles/);
  assert.doesNotMatch(view.options.error, /private-upstream-secret/);
  dashboard.renderPersonalTimeMacro(); assert.equal(requests.length, 1, "Failed optional reads do not retry on every pie render");
  assert.ok(context.personalRenders.length > 0, "Optional HR failure preserves personal time");
  dashboard.state.personalTimeResult.planning = { ...personalResult().planning, ok: false };
  dashboard.renderPersonalTimeMacro();
  assert.equal(context.capacityRenders.at(-1).model.plannedHours, null, "A failed source flag cannot establish complete planning");
  dashboard.state.personalTimeResult.planning.ok = true;
  dashboard.state.personalTimeResult.planningError = "Planning unavailable";
  dashboard.renderPersonalTimeMacro();
  assert.equal(context.capacityRenders.at(-1).model.plannedHours, null);
});

test("stale capacity responses cannot replace a different selected scope or survive explicit refresh", async () => {
  const pending = [];
  const { dashboard, context } = loadDashboard(request => new Promise(resolve => pending.push({ request, resolve })),
    { personalTime: true, capacity: true, allowedRoutes: ["/api/odoo/my-work-capacity"] });
  dashboard.state.personalTimeResult = personalResult(); dashboard.renderPersonalTimeMacro();
  dashboard.state.selectedYears = new Set([2027]); dashboard.renderPersonalTimeMacro();
  pending[1].resolve(response({ ok: true, fixtureHours: 1700 })); await new Promise(setImmediate);
  pending[0].resolve(response({ ok: true, fixtureHours: 1500 })); await new Promise(setImmediate);
  assert.equal(context.capacityRenders.at(-1).model.availableHours, 1700);
  dashboard.state.selectedYears = new Set([2028]); dashboard.renderPersonalTimeMacro();
  dashboard.state.personalCapacityGeneration += 1; dashboard.state.personalCapacityCache.clear();
  pending[2].resolve(response({ ok: true, fixtureHours: 999 })); await new Promise(setImmediate);
  assert.equal(dashboard.state.personalCapacityCache.size, 0, "Old generation cannot repopulate refreshed source cache");
  assert.notEqual(context.capacityRenders.at(-1).model.availableHours, 999);
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

test("custom range pickers apply atomically, preserve input focus and restore year selection", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true, dateControls: true });
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.years = [2025, 2026];
  dashboard.state.selectedYears = new Set([2025, 2026]);
  dashboard.initializeCustomDateRangeControls();
  dashboard.renderYearFilters();
  dashboard.els.customDateToggle.dispatch("click");
  assert.equal(dashboard.els.customDatePanel.hidden, false);
  assert.equal(dashboard.els.customDateStart.value, "2025-01-01");
  assert.equal(dashboard.els.customDateEnd.value, "2026-12-31");
  assert.equal(dashboard.state.customDateRange, null, "Opening the pickers leaves the year scope active");
  const start = dashboard.els.customDateStart, end = dashboard.els.customDateEnd;
  start.value = "2026-10-01"; end.value = "2026-10-05";
  end.focus(); end.dispatch("change");
  const validRange = dashboard.state.customDateRange;
  assert.equal(validRange.startDate, "2026-10-01");
  assert.equal(validRange.endDate, "2026-10-05");
  dashboard.renderYearFilters();
  assert.equal(dashboard.els.scopeText.textContent, "01/10/2026 – 05/10/2026");
  assert.equal(dashboard.els.customDateToggle.getAttribute("aria-pressed"), "true");
  assert.ok(dashboard.els.yearChips.children.every(button => button.getAttribute("aria-pressed") === "false"));
  assert.equal(context.document.activeElement, end, "Applying a range keeps the same date input focused");
  assert.equal(dashboard.els.customDatePanel.hidden, false, "Fast successive changes keep the editor open");
  const renders = context.renderCalls;
  end.dispatch("change");
  assert.equal(context.renderCalls, renders, "An unchanged range does not rerender charts");
  for (const [from, to, notice] of [["2026-10-06", "2026-10-05", /postérieure/],
    ["", "2026-10-05", /Choisissez/], ["2026-02-30", "2026-10-05", /Vérifiez/]]) {
    start.value = from; end.value = to; start.dispatch("change");
    assert.equal(dashboard.state.customDateRange, validRange, "Draft errors must retain the last applied scope");
    assert.equal(context.renderCalls, renders);
    assert.match(dashboard.els.customDateError.textContent, notice);
    assert.equal(start.getAttribute("aria-invalid"), "true");
  }
  dashboard.toggleSelectedYear(2025);
  dashboard.renderYearFilters();
  assert.equal(dashboard.state.customDateRange, null);
  assert.deepEqual([...dashboard.state.selectedYears], [2025], "A year click leaves custom mode and selects that year alone");
  assert.equal(dashboard.els.customDatePanel.hidden, true);
  assert.equal(dashboard.els.customDateError.textContent, "");
  assert.equal(dashboard.els.customDateToggle.getAttribute("aria-pressed"), "false");
  assert.equal(requests.length, 0);
});

test("custom picker dismissal and reset support keyboard and preserve the applied scope", () => {
  const { dashboard, context } = loadDashboard(undefined, { personalTime: true, dateControls: true });
  dashboard.state.personalTimeResult = personalResult();
  dashboard.initializeCustomDateRangeControls();
  dashboard.setCustomDatePanelOpen(true);
  dashboard.els.customDateStart.value = "2026-10-01"; dashboard.els.customDateEnd.value = "2026-10-05";
  dashboard.applyCustomDateRange(); dashboard.renderYearFilters();
  let prevented = false;
  context.document.dispatch("keydown", { key: "Escape", preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(dashboard.els.customDatePanel.hidden, true);
  assert.equal(context.document.activeElement, dashboard.els.customDateToggle);
  assert.ok(dashboard.state.customDateRange, "Closing the editor keeps the applied date filter");
  dashboard.setCustomDatePanelOpen(true);
  context.document.dispatch("pointerdown", { target: dashboard.els.customDateStart });
  assert.equal(dashboard.state.customDatePanelOpen, true);
  context.document.dispatch("pointerdown", { target: dashboard.els.scopeText });
  assert.equal(dashboard.state.customDatePanelOpen, false);
  dashboard.setCustomDatePanelOpen(true);
  dashboard.els.customDateReset.dispatch("click");
  assert.equal(dashboard.state.customDateRange, null);
  assert.equal(context.document.activeElement, dashboard.els.customDateToggle);
  const year = dashboard.els.yearChips.children.find(button => button.textContent === "2026");
  year.focus(); dashboard.renderYearFilters();
  assert.equal(context.document.activeElement.getAttribute("data-scope-year"), "2026", "Year rerenders retain keyboard focus");
});

test("custom dates share macro, project membership, clipped date ticks and exact employee totals without fetching", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true, dateControls: true });
  const personal = personalResult(), result = projectHoursResult();
  const own = [line(11, 8), { ...line(11, 4), date: "2026-09-30" },
    { ...line(11, 2), date: "2026-10-01" }, { ...line(11, 100), date: "2026-10-06" }];
  const ownSlots = [{ ...slot(11, 240), start: "2026-09-30T00:00:00Z", end: "2026-10-10T00:00:00Z" }];
  personal.timesheets.lines = own;
  personal.planning.slots = ownSlots;
  personal.projects.push({ id: 102, name: emptyProjectName });
  personal.timesheets.lines.push({ ...line(11, 6, false, employeeName, emptyProjectName), date: "2026-09-30" });
  result.timesheets.lines = [...own, { ...line(22, 15), date: "2026-10-04" }];
  result.planning.slots = [...ownSlots, { ...slot(22, 24), start: "2026-10-03T00:00:00Z", end: "2026-10-04T00:00:00Z" }];
  result.lifetime = { startDate: "2026-10-03", endDate: "2027-01-31", conventionHours: 500 };
  dashboard.state.dashboardView = "projects";
  dashboard.state.personalTimeResult = personal;
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.state.personalProjectHoursCache.set("101", { result, loading: false, error: "" });
  dashboard.renderPersonalProjects();
  const baseline = context.projectBrowserRenders.at(-1).options.detail;
  const monthly = JSON.stringify(baseline.monthly), lifetime = JSON.stringify(baseline.lifetime);
  dashboard.els.customDateStart.value = "2026-10-01"; dashboard.els.customDateEnd.value = "2026-10-05";
  dashboard.applyCustomDateRange();
  dashboard.renderPersonalTimeMacro(); dashboard.renderPersonalProjects();
  const macro = context.personalRenders.at(-1), view = context.projectBrowserRenders.at(-1).options;
  assert.equal(macro.projects.length, 1, "No planned or actual hours in the range means no legend/grid project");
  assert.equal(macro.projects[0].planned, 120, "Boundary slots are prorated to five inclusive Brussels days");
  assert.equal(macro.projects[0].actual, 10);
  assert.equal(macro.options.scope, dashboard.state.customDateRange);
  assert.deepEqual(Array.from(view.projects, project => project.id), [101]);
  assert.equal(view.detail.personal.planned, 120);
  assert.equal(view.detail.personal.actual, 10);
  assert.equal(view.detail.project.planned, 144);
  assert.equal(view.detail.project.actual, 25);
  assert.equal(view.detail.project.employees.reduce((total, person) => total + person.actual, 0), 25);
  assert.equal(view.detail.calendarScope.startDate, "2026-10-03", "The linear tick excludes pre-project days");
  assert.equal(view.detail.calendarScope.endDate, "2026-10-05");
  assert.equal(view.detail.calendarFraction, 1);
  assert.equal(view.scopeLabel, "01/10/2026 – 05/10/2026");
  assert.equal(JSON.stringify(view.detail.monthly), monthly);
  assert.equal(JSON.stringify(view.detail.lifetime), lifetime);
  assert.equal(requests.length, 0);
});

test("custom empty ranges clear a scoped hours selection but retain an independent budget and its cache", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true, dateControls: true });
  dashboard.state.dashboardView = "projects";
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.selectedPersonalProjectId = 101;
  const finance = projectFinanceResult();
  dashboard.state.personalProjectFinanceCache.set("101", { result: finance, loading: false, error: "" });
  dashboard.els.customDateStart.value = "2040-06-01"; dashboard.els.customDateEnd.value = "2040-06-30";
  dashboard.applyCustomDateRange(); dashboard.renderPersonalTimeMacro(); dashboard.renderPersonalProjects();
  assert.equal(dashboard.state.selectedPersonalProjectId, null);
  assert.equal(context.personalRenders.at(-1).projects.length, 0);
  assert.equal(context.projectBrowserRenders.at(-1).options.projects.length, 0);
  dashboard.state.selectedPersonalProjectId = 101; dashboard.state.personalProjectView.set("101", "budget");
  dashboard.renderPersonalProjects(); dashboard.renderYearFilters();
  assert.equal(dashboard.state.selectedPersonalProjectId, 101);
  assert.equal(context.projectBrowserRenders.at(-1).options.finance.result, finance);
  assert.equal(dashboard.els.filterBar.hidden, true);
  assert.equal(requests.length, 0, "Date filters reuse full-history caches and leave finance unchanged");
});

test("an accessible empty personal history still offers custom dates and keeps them on refresh", async () => {
  const empty = personalResult(); empty.timesheets.lines = []; empty.planning.slots = [];
  const { dashboard, requests } = loadDashboard(() => response(empty), {
    allowedRoutes: ["/api/odoo/my-time"], personalTime: true, dateControls: true
  });
  await dashboard.fetchPersonalTime(); dashboard.renderYearFilters();
  assert.equal(dashboard.state.years.length, 0);
  assert.equal(dashboard.els.customDateControl.hidden, false);
  assert.ok(dashboard.els.filterBar.className.includes("visible"));
  dashboard.setCustomDatePanelOpen(true);
  assert.equal(dashboard.els.customDateStart.value, "2026-01-01");
  dashboard.els.customDateStart.value = "2026-02-01"; dashboard.els.customDateEnd.value = "2026-02-28";
  dashboard.applyCustomDateRange(); const range = dashboard.state.customDateRange;
  await dashboard.fetchPersonalTime();
  assert.equal(dashboard.state.customDateRange, range);
  assert.equal(requests.length, 2, "Only explicit data refreshes fetch, not range changes");
});

test("keyboard navigation into an independent budget closes the range editor without stealing dialog Escape", () => {
  const { dashboard, context } = loadDashboard(undefined, { personalTime: true, dateControls: true });
  dashboard.state.dashboardView = "projects";
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.selectedPersonalProjectId = 101;
  dashboard.initializeCustomDateRangeControls();
  dashboard.setCustomDatePanelOpen(true);
  dashboard.els.customDateStart.focus();
  const before = context.document.activeElement;
  dashboard.state.personalProjectView.set("101", "budget");
  dashboard.updatePersonalProjectFilterVisibility();
  assert.equal(dashboard.els.filterBar.hidden, true);
  assert.equal(dashboard.state.customDatePanelOpen, false);
  assert.equal(dashboard.els.customDateToggle.getAttribute("aria-expanded"), "false");
  assert.equal(context.document.activeElement, before, "Closing for navigation does not focus a hidden trigger");
  context.document.dispatch("keydown", { key: "Escape", preventDefault() { assert.fail("A hidden editor must not intercept other dialogs"); } });
  dashboard.state.personalProjectView.set("101", "hours");
  dashboard.updatePersonalProjectFilterVisibility();
  assert.equal(dashboard.els.filterBar.hidden, false);
  assert.equal(dashboard.els.customDatePanel.hidden, true);
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
  assert.doesNotMatch(dashboard.els.remainingDataScope.textContent, /exclues|Tout le projet/);
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

test("personal calendar receives exact-ID lifetime dates without expanding the scoped activity catalogue", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true });
  const data = personalResult(), sharedName = "Same project name";
  data.projects = [
    { id: 101, name: sharedName, startDate: "2025-12-01", endDate: "2028-05-31", manager: { name: "First manager" } },
    { id: 102, name: sharedName, startDate: "2020-01-01", endDate: "2026-10-04", manager: { name: "Second manager" } },
    { id: 103, name: "No activity", startDate: "1800-01-01", endDate: "3000-12-31" },
    { id: 104, name: "No readable dates" },
    { id: 105, name: "Placeholder", startDate: "1900-01-01", endDate: "2999-12-31" }
  ];
  data.timesheets.lines = [
    { ...line(11, 8), project: sharedName, projectId: 101 },
    { ...line(11, 4), project: sharedName, projectId: 102 },
    { ...line(11, 2), project: "No readable dates", projectId: 104 },
    { ...line(11, 3), project: "Placeholder", projectId: 105 }
  ];
  data.planning.slots = [];
  const before = JSON.stringify(data);
  dashboard.state.personalTimeResult = data; dashboard.state.dashboardView = "projects";
  dashboard.renderPersonalProjects();
  const view = context.projectBrowserRenders.at(-1).options, byId = new Map(Array.from(view.projects, project => [project.id, project]));
  assert.deepEqual(Array.from(byId.keys()).sort(), [101, 102, 104, 105]);
  assert.equal(view.timelineRenderer, context.window.UnitDico, "The personal overview uses the same renderer as Unit DiCo");
  for (const id of [101, 102, 105]) {
    const original = data.projects.find(project => project.id === id), scoped = byId.get(id);
    assert.equal(scoped.startDate, original.startDate); assert.equal(scoped.endDate, original.endDate);
    assert.equal(scoped.manager, original.manager || null);
  }
  assert.equal(byId.get(104).startDate, null); assert.equal(byId.get(104).endDate, null);
  assert.match(byId.get(101).name, /ID 101/); assert.match(byId.get(102).name, /ID 102/);
  const timeline = context.window.UnitDico.buildTimeline(view.projects, "2026-10-05");
  assert.deepEqual(timeline.rows.map(row => row.id), [101, 104, 102]);
  assert.equal(timeline.startDate, "2020-01-01"); assert.equal(timeline.endDate, "2028-05-31");
  assert.equal(JSON.stringify(data), before); assert.equal(requests.length, 0);
});

test("personal project cards preserve exact-ID full convention budgets independently of period and personnel choices", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true, dateControls: true });
  const data = personalResult(), sharedName = "Shared project name";
  data.projects = [
    { id: 101, name: sharedName, totalBudget: { amount: 24567.89, currencyId: 1, currency: "EUR" } },
    { id: 102, name: sharedName, totalBudget: { amount: 0, currencyId: 2, currency: "USD" } },
    { id: 103, name: "No readable budget" },
    { id: 104, name: "No scoped activity", totalBudget: { amount: 999999, currencyId: 1, currency: "EUR" } }
  ];
  data.timesheets.lines = [
    { ...line(11, 8), project: sharedName, projectId: 101 },
    { ...line(11, 4), project: sharedName, projectId: 102, date: "2025-06-01" },
    { ...line(11, 2), project: "No readable budget", projectId: 103 }
  ];
  data.planning.slots = [];
  const original = JSON.stringify(data), latest = () => context.projectBrowserRenders.at(-1).options;
  dashboard.state.personalTimeResult = data; dashboard.state.dashboardView = "projects";
  dashboard.state.personalProjectFinanceCache.set("101", { result: { project: { id: 101 }, conventions: [{ budgetedTotal: 1 }] } });
  for (const includePersonnel of [false, true]) {
    dashboard.state.personalProjectShowBwPersonnelCosts.set("101", includePersonnel);
    dashboard.renderPersonalProjects();
    assert.deepEqual(Array.from(latest().projects, project => project.id).sort(), [101, 103]);
    assert.equal(latest().projects.find(project => project.id === 101).totalBudget, data.projects[0].totalBudget,
      "The card uses the full project macro, independently of the budget graph's personnel basis");
    assert.equal(latest().projects.find(project => project.id === 103).totalBudget, null);
  }
  dashboard.state.selectedYears = new Set([2025]); dashboard.renderPersonalProjects();
  assert.deepEqual(Array.from(latest().projects, project => project.id), [102]);
  assert.equal(latest().projects[0].totalBudget, data.projects[1].totalBudget,
    "Shared display names cannot swap currencies or turn a confirmed zero into missing data");
  dashboard.els.customDateStart.value = "2026-10-05"; dashboard.els.customDateEnd.value = "2026-10-05";
  dashboard.applyCustomDateRange(); dashboard.renderPersonalProjects();
  assert.deepEqual(Array.from(latest().projects, project => project.id).sort(), [101, 103]);
  assert.equal(latest().projects.find(project => project.id === 101).totalBudget.amount, 24567.89,
    "Custom dates affect membership, not the lifetime convention total");
  assert.equal(JSON.stringify(data), original); assert.equal(requests.length, 0,
    "Hover details reuse the catalogue without per-project finance requests");
});

test("personal calendar membership follows year and custom scopes while dates retain each project's full life", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true, dateControls: true });
  const data = personalResult();
  data.projects = [
    { id: 101, name: projectName, startDate: "2025-12-01", endDate: "2028-05-31" },
    { id: 102, name: emptyProjectName, startDate: "2026-01-01", endDate: "2029-12-31" }
  ];
  data.timesheets.lines.push({ ...line(11, 4, false, employeeName, emptyProjectName), date: "2025-06-01" });
  dashboard.state.personalTimeResult = data; dashboard.state.dashboardView = "projects";
  const latest = () => context.projectBrowserRenders.at(-1).options;
  dashboard.renderPersonalProjects();
  assert.deepEqual(Array.from(latest().projects, project => project.id), [101]);
  assert.equal(latest().projects[0].startDate, "2025-12-01"); assert.equal(latest().projects[0].endDate, "2028-05-31");
  dashboard.state.selectedYears = new Set([2025]); dashboard.renderPersonalProjects();
  assert.deepEqual(Array.from(latest().projects, project => project.id), [102]);
  assert.equal(latest().projects[0].startDate, "2026-01-01", "Project metadata cannot hide real personal activity from a selected year");
  assert.equal(latest().projects[0].endDate, "2029-12-31");
  dashboard.els.customDateStart.value = "2025-06-01"; dashboard.els.customDateEnd.value = "2025-06-01";
  dashboard.applyCustomDateRange(); dashboard.renderPersonalProjects();
  assert.deepEqual(Array.from(latest().projects, project => project.id), [102]);
  const timeline = context.window.UnitDico.buildTimeline(latest().projects, "2026-10-05");
  assert.equal(timeline.startDate, "2026-01-01"); assert.equal(timeline.endDate, "2029-12-31");
  dashboard.els.customDateStart.value = "2040-06-01"; dashboard.els.customDateEnd.value = "2040-06-30";
  dashboard.applyCustomDateRange(); dashboard.renderPersonalProjects();
  assert.equal(latest().projects.length, 0);
  assert.equal(requests.length, 0, "Membership changes reuse the authenticated personal response without chart-specific reads");
});

test("personal project selection shares years and managers, fetching hours only after selection", async () => {
  const { dashboard, requests, context } = loadDashboard(() => response(projectHoursResult()),
    { personalTime: true, allowedRoutes: ["/api/odoo/project-hours"] });
  const result = personalResult();
  result.projects[0].manager = { id: 501, name: "Project manager", photoDataUrl: null };
  result.projects.push({ id: 102, name: emptyProjectName, manager: null });
  result.timesheets.lines.push({ ...line(11, 4, false, employeeName, emptyProjectName), date: "2025-06-01" });
  install(dashboard);
  dashboard.state.dashboardView = "projects";
  dashboard.state.personalTimeResult = result;
  dashboard.state.selectedYears = new Set([2026]);
  dashboard.state.hiddenPersonalProjects.add(101);
  dashboard.renderPersonalProjects();
  assert.equal(requests.length, 0, "Rendering the project grid stays local");
  let rendered = context.projectBrowserRenders.at(-1).options;
  assert.deepEqual(rendered.projects.map(project => project.id), [101]);
  assert.equal(rendered.timelineRenderer, context.window.UnitDico);
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
  dashboard.state.dashboardView = "projects";
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
  dashboard.state.dashboardView = "projects";
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
  dashboard.state.dashboardView = "projects";
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
  dashboard.state.dashboardView = "projects";
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
  dashboard.state.dashboardView = "projects";
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
  dashboard.state.dashboardView = "projects";
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

test("planned monthly history includes future-only people, shares scope controls and keeps its employee filter independent", () => {
  const { dashboard, context, requests } = loadDashboard(undefined, { personalTime: true });
  const result = projectHoursResult();
  result.hasOrmitters = true;
  result.lifetime = { conventionHours: 100, conventionStatus: "available", startDate: "2026-01-01", endDate: "2027-12-31" };
  result.planning.slots.push({ ...slot(44, 18, false, "Future colleague"),
    start: "2027-03-01 00:00:00", end: "2027-04-01 00:00:00", startMonth: "2027-03", endMonth: "2027-04" });
  dashboard.state.dashboardView = "projects";
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.personalProjectHoursCache.set("101", { result, loading: false, error: "" });
  dashboard.state.selectedPersonalProjectId = 101;
  const latest = () => context.projectBrowserRenders.at(-1).options;
  dashboard.renderPersonalProjects();
  assert.equal(latest().detail.plannedMonthly.months.at(-1).key, "2027-12",
    "The planned chart includes future project months despite selecting 2026");
  assert.equal(latest().detail.plannedMonthly.total.reduce((sum, hours) => sum + hours, 0), 24);
  assert.equal(latest().detail.monthly.planning.reduce((sum, hours) => sum + hours, 0), 6,
    "The actual-chart planning reference stops today, independently of its full future chart");
  assert.ok(latest().detail.plannedMonthly.employees.some(employee => employee.id === "employee:44"));
  assert.equal(latest().detail.monthly.employees.some(employee => employee.id === "employee:44"), false);
  latest().onPlannedMonthlyEmployeeChange("employee:44");
  assert.equal(latest().detail.plannedMonthlyEmployeeId, "employee:44");
  assert.equal(latest().detail.monthlyEmployeeId, null);
  latest().onMonthlyEmployeeChange("employee:11");
  assert.equal(latest().detail.monthlyEmployeeId, "employee:11");
  assert.equal(latest().detail.plannedMonthlyEmployeeId, "employee:44");
  latest().onMonthlyModeChange("cumulative");
  assert.equal(latest().detail.plannedMonthly.mode, "cumulative");
  assert.equal(latest().detail.plannedMonthly.total.at(-1), 24);
  assert.equal(latest().detail.monthly.planning.at(-1), 6);
  latest().onIncludeOrmittersChange(true);
  assert.equal(latest().detail.plannedMonthly.total.at(-1), 48);
  latest().onPlannedMonthlyEmployeeChange("employee:22");
  assert.equal(latest().detail.plannedMonthlyEmployeeId, "employee:22");
  latest().onIncludeOrmittersChange(false);
  assert.equal(latest().detail.plannedMonthlyEmployeeId, null);
  assert.equal(latest().detail.monthlyEmployeeId, "employee:11");
  assert.equal(requests.length, 0, "The added graph and all controls reuse cached records");
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
  dashboard.state.dashboardView = "projects";
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
  dashboard.state.dashboardView = "projects";
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
  dashboard.state.dashboardView = "projects";
  dashboard.state.personalTimeResult = personalResult();
  dashboard.state.selectedPersonalProjectId = 101;
  await dashboard.loadPersonalProjectHours(101);
  let view = context.projectBrowserRenders.at(-1).options;
  assert.equal(view.detail.personal, null);
  assert.equal(view.detail.project, null);
  assert.match(view.detail.error, /Les heures du projet.*indisponibles.*Réessayez/);
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
  assert.match(mine.overview[3].scopeLabel, /^Moi/);
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
  assert.match(whole.overview[3].scopeLabel, /^Tout le projet/);
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
  assert.equal(mine.title, "Mon planning projet");
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
  assert.match(overview.scopeLabel, /référence.*tous les employés/i);
  assert.match(overview.message, /Chargez vos heures/);
  assert.doesNotMatch(overview.scopeLabel, /^Moi/);
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
  assert.match(overview.message, /heures non affectées.*Moi/i);
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
  assert.match(overview.scopeLabel, /^Tout le projet/);
  assert.match(overview.message, /heures non affectées.*Moi/i);
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
  assert.match(dashboard.buildSubcontractorHoursNote(), /^Filtre indisponible/i);
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

function projectMilestonesResult(id = 101, extra = {}) {
  return { ok: true, projectIds: [id], available: true,
    milestones: [{ id: 81, name: "Source milestone", date: "2026-06-15", isReached: false }], ...extra };
}

test("project milestones load independently and share exact-ID cached data in personal, unit and programme hours", async () => {
  let finishMilestones;
  const { dashboard, requests, context } = loadDashboard(({ url, payload }) => url.endsWith("project-milestones")
    ? new Promise(resolve => { finishMilestones = resolve; }) : response(projectHoursResult(payload.projectId)),
  { personalTime: true, allowedRoutes: ["/api/odoo/project-hours", "/api/odoo/project-milestones"] });
  dashboard.state.personalTimeResult = personalResult(); dashboard.state.dashboardView = "projects";
  dashboard.state.selectedPersonalProjectId = 101;
  await dashboard.loadPersonalProjectHours(101);
  let view = context.projectBrowserRenders.at(-1).options;
  assert.equal(view.detail.project.actual, 28, "A slow milestone read cannot delay the hour charts");
  assert.equal(view.detail.loading, false); assert.equal(view.detail.milestones, null);
  await dashboard.loadPersonalProjectHours(101); await dashboard.loadPersonalProjectMilestones(101);
  assert.equal(requests.length, 2, "Both optional and required reads share their own in-flight/cache entries");
  assert.ok(requests.every(request => JSON.stringify(request.payload) === '{"projectId":101}'));
  finishMilestones(response(projectMilestonesResult())); await new Promise(setImmediate);
  const cached = dashboard.state.personalProjectMilestonesCache.get("101").result;
  assert.equal(cached.available, true); assert.equal(cached.milestones[0].name, "Source milestone");
  for (const kind of ["projects", "unit-dico", "programmes"]) {
    dashboard.state.dashboardView = kind;
    dashboard.state.unitDicoResult = unitDicoResult([101]); dashboard.state.selectedUnitProjectId = 101;
    dashboard.state.selectedProgrammeId = "DC1"; dashboard.state.selectedProgrammeProjectId = 101;
    dashboard.state.programmeProjectsCache.set("DC1", { result: programmeProjectsResult("DC1", [101]), loading: false, error: "" });
    dashboard.renderPersonalProjects();
    assert.equal(context.projectBrowserRenders.at(-1).options.detail.milestones, cached, kind);
    dashboard.state.selectedYears = new Set([2025, 2026]); dashboard.renderPersonalProjects();
    await dashboard.loadPersonalProjectHours(101);
    assert.equal(context.projectBrowserRenders.at(-1).options.detail.milestones, cached);
  }
  assert.equal(requests.length, 2, "Shared contexts and local date changes reuse the milestone cache");
});

test("milestone failures and mismatched project responses stay optional and an explicit hours retry refreshes them", async () => {
  let attempt = 0;
  const { dashboard, requests, context } = loadDashboard(({ url }) => url.endsWith("project-hours") ? response(projectHoursResult())
    : ++attempt === 1 ? Promise.reject(new Error("Private upstream failure"))
    : response(projectMilestonesResult(attempt === 2 ? 102 : 101)),
  { personalTime: true, allowedRoutes: ["/api/odoo/project-hours", "/api/odoo/project-milestones"] });
  dashboard.state.personalTimeResult = personalResult(); dashboard.state.dashboardView = "projects";
  dashboard.state.selectedPersonalProjectId = 101;
  for (let pass = 0; pass < 3; pass += 1) {
    await dashboard.loadPersonalProjectHours(101, pass > 0); await new Promise(setImmediate);
    const view = context.projectBrowserRenders.at(-1).options;
    assert.equal(view.detail.project.actual, 28); assert.equal(view.detail.error, "");
    assert.equal(view.detail.milestones.available, pass === 2);
    assert.equal(view.detail.milestones.milestones.length, pass === 2 ? 1 : 0);
  }
  assert.equal(requests.length, 6);
  await dashboard.loadPersonalProjectHours(999); await dashboard.loadPersonalProjectMilestones(999);
  assert.equal(requests.length, 6, "Unknown project IDs cannot trigger milestone reads");
});

test("milestone responses cannot cross project selections or repopulate refreshed cache generations", async () => {
  const pending = new Map();
  const { dashboard, context } = loadDashboard(({ url, payload }) => url.endsWith("project-milestones")
    ? new Promise(resolve => pending.set(payload.projectId, resolve))
    : response(url.endsWith("my-time") ? personalResult() : projectHoursResult(payload.projectId)),
  { personalTime: true, allowedRoutes: ["/api/odoo/project-hours", "/api/odoo/project-milestones", "/api/odoo/my-time"] });
  const personal = personalResult(); personal.projects.push({ id: 102, name: emptyProjectName });
  personal.timesheets.lines.push(line(11, 1, false, employeeName, emptyProjectName));
  dashboard.state.personalTimeResult = personal; dashboard.state.dashboardView = "projects";
  dashboard.choosePersonalProject(101); dashboard.choosePersonalProject(102); await new Promise(setImmediate);
  pending.get(101)(response(projectMilestonesResult(101))); await new Promise(setImmediate);
  assert.equal(dashboard.state.personalProjectMilestonesCache.get("101").result.available, true);
  assert.equal(context.projectBrowserRenders.at(-1).options.selectedId, 102);
  assert.equal(context.projectBrowserRenders.at(-1).options.detail.milestones, null);
  await dashboard.fetchPersonalTime();
  pending.get(102)(response(projectMilestonesResult(102))); await new Promise(setImmediate);
  assert.equal(dashboard.state.personalProjectMilestonesCache.size, 0);
  const replacement = dashboard.loadPersonalProjectMilestones(101);
  pending.get(101)(response(projectMilestonesResult(101, { milestones: [] }))); await replacement;
  assert.equal(dashboard.state.personalProjectMilestonesCache.get("101").result.available, true);
  assert.equal(dashboard.state.personalProjectMilestonesCache.get("101").result.milestones.length, 0);
});
