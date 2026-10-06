const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const projectName = "[10001] Example project";
const sharedEmployeeName = "Alex Example";
const selectedKeys = ["2026-10", "2026-11"];
const today = new Date(2026, 9, 5, 12);
const periodStart = new Date(2026, 0, 1);
const periodEnd = new Date(2027, 0, 1);

function loadDashboard() {
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "Dashboard inline script must exist");
  const bootstrap = "const originalFetch = window.fetch.bind(window);";
  assert.equal(script.split(bootstrap).length, 2, "Test seam must precede the sole bootstrap");
  const instrumented = script.replace(bootstrap, `
    renderPieChart = () => {};
    renderLegend = () => {};
    state.hoursScope = "me";
    globalThis.dashboard = {
      state, els, monthFromKey, personKey, projectColorKey,
      setIncludeOrmittersHours, buildSubcontractorHoursNote,
      buildRemainingHoursScopeInfo, renderRemainingHoursScope, renderEmployeePanel,
      renderEmployeeRemainingTable,
      buildEmployeeDatasetFromApi,
      buildPersonalPlanDatasetFromApi, buildProjectDatasetFromApi,
      buildProjectPlanDatasetFromApi, buildDicoProjectListFromApi,
      aggregateNamedRows, buildRemainingToDateTotals, renderKpis,
      sumActualHoursForProject, sumPlannedHoursForProject,
      sumActualHoursForEmployee, sumPlannedHoursForEmployee,
      buildScopedWorkPackageDataset, projectMacroOverrideKey
    };
    return;
    ${bootstrap}`);
  const elements = new Map();
  const context = {
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { classList: { toggle() {} } });
        return elements.get(id);
      }
    },
    fetch() { throw new Error("Offline dashboard tests must never make network requests"); }
  };
  vm.runInNewContext(instrumented, context, { filename: "index.html" });
  context.dashboard.state.years = [2026];
  context.dashboard.state.selectedYears = new Set([2026]);
  return context.dashboard;
}

function makeLine(id, employeeId, hours, isSubcontractor, month = "2026-10") {
  return {
    id, employeeId, employee: sharedEmployeeName,
    project: projectName, projectId: 101, date: `${month}-05`, month, hours,
    task: "Work package", taskId: 201,
    employeeFunction: isSubcontractor ? "AI Consultant Ormit" : "Engineer",
    employeeFunctionSource: "hr.employee.job_title", isSubcontractor,
    subcontractorClassification: "employee-function"
  };
}

function makeSlot(id, employeeId, hours, isSubcontractor, month = "2026-10") {
  return {
    id, employeeId, resourceId: employeeId + 1000, employee: sharedEmployeeName,
    project: projectName, projectId: 101,
    start: `${month}-01T00:00:00`, end: `${month}-02T00:00:00`,
    startMonth: month, endMonth: month, hours, task: "Work package", taskId: 201,
    employeeFunction: isSubcontractor ? "AI Consultant" : "Engineer",
    employeeFunctionSource: "hr.employee.job_id", isSubcontractor,
    subcontractorClassification: "employee-function"
  };
}

function projectMonths(october, november = 0) {
  return [
    { month: "2026-10", projects: [{ name: projectName, hours: october }] },
    ...(november ? [{ month: "2026-11", projects: [{ name: projectName, hours: november }] }] : [])
  ];
}

function employeeMonths(october, november = 0) {
  return [
    { month: "2026-10", employees: [{ name: sharedEmployeeName, hours: october }] },
    ...(november ? [{ month: "2026-11", employees: [{ name: sharedEmployeeName, hours: november }] }] : [])
  ];
}

function fixtures() {
  const lines = [makeLine(1, 11, 8, false), makeLine(2, 22, 12, true), makeLine(3, 22, 24, true, "2026-11")];
  const slots = [makeSlot(1, 11, 20, false), makeSlot(2, 22, 30, true), makeSlot(3, 22, 40, true, "2026-11")];
  const common = { employeeName: sharedEmployeeName, projectCode: "10001", projectName };
  return {
    personalActual: { ...common, monthly: projectMonths(20, 24), employeeMonthly: projectMonths(8), lines },
    personalPlan: { ...common, monthly: projectMonths(50, 40), employeeMonthly: projectMonths(20), slots },
    projectActual: { ...common, monthly: employeeMonths(20, 24), employeeMonthly: employeeMonths(8), lines },
    projectPlan: { ...common, monthly: employeeMonths(50, 40), employeeMonthly: employeeMonths(20), slots },
    dico: {
      projects: [{ id: 101, name: projectName }],
      actualMonthly: projectMonths(20, 24), plannedMonthly: projectMonths(50, 40),
      employeeActualMonthly: projectMonths(8), employeePlannedMonthly: projectMonths(20),
      actualTotalHours: 44, plannedTotalHours: 90, lines, slots, warnings: []
    }
  };
}

function entries(dashboard, dataset) {
  return dashboard.aggregateNamedRows(dataset.rows, selectedKeys);
}

function assertMonthScope(dataset) {
  assert.deepEqual(Array.from(dataset.months, (month) => month.key), selectedKeys,
    "Excluded-only months must remain selectable");
}

function installDatasets(dashboard, data = fixtures()) {
  dashboard.state.employee = dashboard.buildEmployeeDatasetFromApi(data.personalActual);
  dashboard.state.personalPlan = dashboard.buildPersonalPlanDatasetFromApi(data.personalPlan);
  dashboard.state.projects = [dashboard.buildProjectDatasetFromApi(data.projectActual)];
  dashboard.state.plans = [dashboard.buildProjectPlanDatasetFromApi(data.projectPlan, dashboard.state.projects[0])];
  dashboard.state.dicoProjects = dashboard.buildDicoProjectListFromApi(data.dico);
  return data;
}

function syntheticExtraiFixtures() {
  const data = fixtures();
  // Synthetic regression values; this suite never accesses project records.
  const name = "[54252043] Extrai mock";
  const regularActual = { ...makeLine(101, 11, 80, false), project: name };
  const consultantActual = { ...makeLine(102, 22, 449, true), project: name };
  const regularPlan = { ...makeSlot(101, 11, 20, false), project: name };
  const consultantPlan = { ...makeSlot(102, 22, 100, true), project: name };
  const projectSummary = (hours) => [{ month: "2026-10", projects: [{ name, hours }] }];
  const employeeSummary = (hours) => [{ month: "2026-10", employees: [{ name: sharedEmployeeName, hours }] }];
  data.personalActual = {
    monthly: projectSummary(80), employeeMonthly: projectSummary(80), lines: [regularActual]
  };
  data.personalPlan = {
    monthly: projectSummary(20), employeeMonthly: projectSummary(20), slots: [regularPlan]
  };
  data.projectActual = {
    projectCode: "54252043", projectName: name,
    monthly: employeeSummary(529), employeeMonthly: employeeSummary(80),
    lines: [regularActual, consultantActual]
  };
  data.projectPlan = {
    projectCode: "54252043", projectName: name,
    monthly: employeeSummary(120), employeeMonthly: employeeSummary(20),
    slots: [regularPlan, consultantPlan]
  };
  data.dico = {
    projects: [{ id: 301, name }], actualMonthly: projectSummary(529), plannedMonthly: projectSummary(120),
    employeeActualMonthly: projectSummary(80), employeePlannedMonthly: projectSummary(20),
    actualTotalHours: 529, plannedTotalHours: 120,
    lines: [regularActual, consultantActual], slots: [regularPlan, consultantPlan], warnings: []
  };
  return data;
}

test("Ormitters inclusion starts unchecked and remains an enabled user option", () => {
  const dashboard = loadDashboard();
  assert.equal(dashboard.state.includeOrmittersHours, false);
  const checkbox = source.match(/<input\b(?=[^>]*\bid="includeOrmittersHours")[^>]*>/)?.[0];
  assert.ok(checkbox, "The inclusion option must be present");
  assert.match(checkbox, /\btype="checkbox"/);
  assert.doesNotMatch(checkbox, /\b(?:checked|disabled)(?:\s|=|>)/);
  assert.match(source, /Include Ormitters hours/);
});

test("personal actual and planned totals exclude classified subcontractors while retaining inclusive source and months", () => {
  const dashboard = loadDashboard();
  const data = fixtures();
  const actual = dashboard.buildEmployeeDatasetFromApi(data.personalActual);
  const planned = dashboard.buildPersonalPlanDatasetFromApi(data.personalPlan);
  assert.equal(actual.sourceResult, data.personalActual);
  assert.equal(planned.sourceResult, data.personalPlan);
  assertMonthScope(actual);
  assertMonthScope(planned);
  assert.equal(entries(dashboard, actual)[0].value, 8);
  assert.equal(entries(dashboard, planned)[0].value, 20);
  assert.deepEqual(Array.from(actual.lines, (line) => line.employeeId), [11]);
  assert.deepEqual(Array.from(planned.slots, (slot) => slot.employeeId), [11]);
  assert.equal(actual.lines[0].employeeFunction, "Engineer");
  assert.equal(planned.slots[0].subcontractorClassification, "employee-function");
  assert.equal(data.personalActual.lines.length, 3, "Filtering must not mutate original records");
});

test("project monthly chart inputs and raw macro inputs exclude by classified record rather than duplicate employee name", () => {
  const dashboard = loadDashboard();
  const data = fixtures();
  const actual = dashboard.buildProjectDatasetFromApi(data.projectActual);
  const planned = dashboard.buildProjectPlanDatasetFromApi(data.projectPlan, actual);
  assert.equal(actual.sourceResult, data.projectActual);
  assert.equal(planned.sourceResult, data.projectPlan);
  assertMonthScope(actual);
  assertMonthScope(planned);
  assert.equal(entries(dashboard, actual)[0].value, 8);
  assert.equal(entries(dashboard, planned)[0].value, 20);
  assert.deepEqual(Array.from(actual.lines, (line) => line.employeeId), [11]);
  assert.deepEqual(Array.from(planned.slots, (slot) => slot.employeeId), [11]);
  assert.equal(actual.lines[0].employeeFunctionSource, "hr.employee.job_title");
  assert.equal(planned.slots[0].resourceId, 1011);
  assert.equal(planned.slots[0].taskId, 201);
  const employeeKey = dashboard.personKey(sharedEmployeeName);
  assert.equal(dashboard.sumActualHoursForProject(actual, periodStart, periodEnd), 8);
  assert.equal(dashboard.sumPlannedHoursForProject(planned, periodStart, periodEnd), 20);
  assert.equal(dashboard.sumActualHoursForEmployee(actual, employeeKey, periodStart, periodEnd), 8);
  assert.equal(dashboard.sumPlannedHoursForEmployee(planned, employeeKey, periodStart, periodEnd), 20);
});

test("Dico uses the same exclusion for listed totals, chart rows and retained date records", () => {
  const dashboard = loadDashboard();
  const data = fixtures();
  const dico = dashboard.buildDicoProjectListFromApi(data.dico);
  assert.equal(dico.sourceResult, data.dico);
  assertMonthScope(dico);
  assert.equal(dashboard.aggregateNamedRows(dico.actualRows, selectedKeys)[0].value, 8);
  assert.equal(dashboard.aggregateNamedRows(dico.plannedRows, selectedKeys)[0].value, 20);
  assert.equal(dico.actualTotalHours, 8);
  assert.equal(dico.plannedTotalHours, 20);
  assert.deepEqual(Array.from(dico.lines, (line) => line.employeeId), [11]);
  assert.deepEqual(Array.from(dico.slots, (slot) => slot.employeeId), [11]);
});

test("through-today comparisons and summary metrics use the filtered dataset", () => {
  const dashboard = loadDashboard();
  installDatasets(dashboard);
  const totals = dashboard.buildRemainingToDateTotals(dashboard.state.employee, dashboard.state.personalPlan, today);
  const comparison = totals.get(dashboard.projectColorKey(projectName));
  assert.equal(comparison.actualToDate, 8);
  assert.equal(comparison.foreseenToDate, 20);
  const employeeEntries = entries(dashboard, dashboard.state.employee);
  dashboard.renderKpis(employeeEntries, dashboard.state.projects.map((project) => ({ project, entries: entries(dashboard, project) })));
  assert.equal(dashboard.els.myHours.textContent, "8");
  assert.equal(dashboard.els.myProjectCount.textContent, "1");
  assert.equal(dashboard.els.projectHours.textContent, "8");
  assert.equal(dashboard.els.employeeCount.textContent, "1");
});

test("checking the inclusion option restores all API hours locally and toggling back is reversible", () => {
  const dashboard = loadDashboard();
  const data = installDatasets(dashboard);
  dashboard.setIncludeOrmittersHours(true);
  assert.equal(dashboard.state.includeOrmittersHours, true);
  assert.equal(entries(dashboard, dashboard.state.employee)[0].value, 44);
  assert.equal(entries(dashboard, dashboard.state.personalPlan)[0].value, 90);
  assert.equal(entries(dashboard, dashboard.state.projects[0])[0].value, 44);
  assert.equal(entries(dashboard, dashboard.state.plans[0])[0].value, 90);
  assert.equal(dashboard.state.dicoProjects.actualTotalHours, 44);
  assert.equal(dashboard.state.dicoProjects.plannedTotalHours, 90);
  assert.equal(dashboard.state.projects[0].lines.length, 3);
  assert.equal(dashboard.state.plans[0].slots.length, 3);
  assert.equal(dashboard.state.employee.sourceResult, data.personalActual);
  dashboard.setIncludeOrmittersHours(false);
  assert.equal(entries(dashboard, dashboard.state.employee)[0].value, 8);
  assert.equal(entries(dashboard, dashboard.state.plans[0])[0].value, 20);
  assert.equal(dashboard.state.projects[0].lines.length, 1);
  assert.equal(data.projectActual.lines.length, 3);
});

test("inclusion toggle preserves scope, selections, chart visibility, local overrides and file-backed datasets", () => {
  const dashboard = loadDashboard();
  installDatasets(dashboard);
  const exportedDataset = { type: "project", source: "file", name: "Export", rows: [], months: [] };
  dashboard.state.projects.push(exportedDataset);
  const selectedYears = dashboard.state.selectedYears = new Set([2026]);
  const years = dashboard.state.years = [2025, 2026, 2027];
  const hiddenSeries = dashboard.state.hiddenSeries = new Map([["monthly", new Set([sharedEmployeeName])]]);
  const overrides = dashboard.state.projectMacroOverrides = new Map([["user value", { actualHours: 17 }]]);
  dashboard.state.activeProjectKey = "selected-project";
  dashboard.state.expandedProjectPieKey = "expanded-project";
  const projectBudgets = dashboard.state.projectBudgets = new Map([["budget", { amount: 10000 }]]);
  dashboard.setIncludeOrmittersHours(true);
  assert.equal(dashboard.state.selectedYears, selectedYears);
  assert.equal(dashboard.state.years, years);
  assert.equal(dashboard.state.hiddenSeries, hiddenSeries);
  assert.equal(dashboard.state.projectMacroOverrides, overrides);
  assert.equal(dashboard.state.projectMacroOverrides.get("user value").actualHours, 17);
  assert.equal(dashboard.state.activeProjectKey, "selected-project");
  assert.equal(dashboard.state.expandedProjectPieKey, "expanded-project");
  assert.equal(dashboard.state.projects[1], exportedDataset);
  assert.equal(dashboard.state.projectBudgets, projectBudgets);
});

test("all-subcontractor responses remain valid empty datasets with usable selected months and zero macros", () => {
  const dashboard = loadDashboard();
  const data = fixtures();
  for (const result of [data.personalActual, data.projectActual]) {
    result.lines = result.lines.filter((line) => line.isSubcontractor);
    result.employeeMonthly = [];
  }
  for (const result of [data.personalPlan, data.projectPlan]) {
    result.slots = result.slots.filter((slot) => slot.isSubcontractor);
    result.employeeMonthly = [];
  }
  installDatasets(dashboard, data);
  for (const dataset of [dashboard.state.employee, dashboard.state.personalPlan, dashboard.state.projects[0], dashboard.state.plans[0]]) {
    assert.ok(dataset, "Zero employee hours are valid loaded data");
    assert.equal(dataset.rows.length, 0);
    assertMonthScope(dataset);
  }
  assert.equal(dashboard.state.employee.lines.length, 0);
  assert.equal(dashboard.state.plans[0].slots.length, 0);
  assert.equal(dashboard.sumActualHoursForProject(dashboard.state.projects[0], periodStart, periodEnd), 0);
  assert.equal(dashboard.sumPlannedHoursForProject(dashboard.state.plans[0], periodStart, periodEnd), 0);
  assert.equal(dashboard.buildRemainingToDateTotals(dashboard.state.employee, dashboard.state.personalPlan, today).size, 0);
  dashboard.setIncludeOrmittersHours(true);
  assert.equal(dashboard.state.projects[0].lines.length, 2);
  assert.equal(dashboard.state.plans[0].slots.length, 2);
});

test("work-package consumption cannot fall back to inclusive aggregates when all task-linked actuals are excluded", () => {
  const dashboard = loadDashboard();
  const data = fixtures().projectActual;
  data.lines = [makeLine(2, 22, 12, true)];
  data.monthly = employeeMonths(12);
  data.employeeMonthly = [];
  const actual = dashboard.buildProjectDatasetFromApi(data);
  const workPackages = { rows: [{ id: 201, name: "Work package", hoursSpent: 12, plannedHours: 100 }] };
  const scoped = dashboard.buildScopedWorkPackageDataset(workPackages, actual);
  assert.equal(scoped.rows.length, 1);
  assert.equal(scoped.rows[0].hoursSpent, 0);
  assert.equal(scoped.rows[0].consumptionPercent, 0);
  dashboard.state.projects = [actual];
  dashboard.setIncludeOrmittersHours(true);
  assert.equal(dashboard.buildScopedWorkPackageDataset(workPackages, dashboard.state.projects[0]).rows[0].hoursSpent, 12);
});

test("work-package actuals sum only surviving task records and respect the selected years", () => {
  const dashboard = loadDashboard();
  const data = fixtures().projectActual;
  data.lines.push(makeLine(4, 11, 99, false, "2025-10"));
  const actual = dashboard.buildProjectDatasetFromApi(data);
  const scoped = dashboard.buildScopedWorkPackageDataset({ rows: [{ id: 201, name: "Work package", hoursSpent: 999, plannedHours: 100 }] }, actual);
  assert.equal(scoped.rows[0].hoursSpent, 8);
  assert.equal(scoped.rows[0].consumptionPercent, 8);
});

test("unknown employee functions remain included instead of being guessed from employee names", () => {
  const dashboard = loadDashboard();
  const data = fixtures().projectActual;
  const unknown = makeLine(4, 33, 5, false);
  unknown.employee = "AI Consultant Ormit";
  unknown.employeeFunction = "";
  unknown.employeeFunctionSource = "";
  unknown.subcontractorClassification = "unknown";
  data.lines = [unknown];
  data.monthly = [{ month: "2026-10", employees: [{ name: unknown.employee, hours: 5 }] }];
  data.employeeMonthly = data.monthly;
  const actual = dashboard.buildProjectDatasetFromApi(data);
  assert.equal(actual.lines.length, 1);
  assert.equal(actual.lines[0].employeeId, 33);
  assert.equal(entries(dashboard, actual)[0].value, 5);
  dashboard.state.projects = [actual];
  assert.match(dashboard.buildSubcontractorHoursNote(), /unclassified hours remain included/);
});

test("scope notices distinguish classified, unknown, planning-role and workbook inputs", () => {
  const dashboard = loadDashboard();
  installDatasets(dashboard);
  assert.match(dashboard.buildSubcontractorHoursNote(), /actual and planned hours are excluded/);
  assert.doesNotMatch(dashboard.buildSubcontractorHoursNote(), /unclassified|workbook|restart/);
  const unknown = makeLine(4, 33, 5, false, "2025-10");
  unknown.subcontractorClassification = "unknown";
  dashboard.state.projects[0].sourceResult.lines.push(unknown);
  assert.doesNotMatch(dashboard.buildSubcontractorHoursNote(), /unclassified/,
    "Records outside selected years must not create an unknown-function warning");
  unknown.date = "2026-10-05";
  assert.match(dashboard.buildSubcontractorHoursNote(), /unclassified hours remain included/);
  dashboard.state.plans[0].sourceResult.slots[0].subcontractorClassification = "planning-role";
  assert.match(dashboard.buildSubcontractorHoursNote(), /Planning roles are used/);
  dashboard.state.projects.push({ source: "file", rows: [], months: [] });
  assert.match(dashboard.buildSubcontractorHoursNote(), /functions are unavailable in workbook exports; their hours remain included/);
  dashboard.setIncludeOrmittersHours(true);
  assert.match(dashboard.buildSubcontractorHoursNote(), /actual and planned hours are included/);
});

test("legacy API summaries stay visible with an explicit refresh notice when role fields are unavailable", () => {
  const dashboard = loadDashboard();
  const data = fixtures().projectActual;
  delete data.employeeMonthly;
  data.lines.forEach((line) => {
    delete line.isSubcontractor;
    delete line.employeeFunction;
    delete line.subcontractorClassification;
  });
  dashboard.state.projects = [dashboard.buildProjectDatasetFromApi(data)];
  assert.equal(entries(dashboard, dashboard.state.projects[0])[0].value, 44);
  assert.match(dashboard.buildSubcontractorHoursNote(), /restart (?:the )?server/i);
  assert.match(dashboard.buildSubcontractorHoursNote(), /unclassified hours remain included/);
});

test("a stale API keeps unchanged totals for both checkbox states and leads with an honest unavailable notice", () => {
  const dashboard = loadDashboard();
  const data = fixtures();
  for (const result of [data.personalActual, data.personalPlan, data.projectActual, data.projectPlan]) {
    delete result.employeeMonthly;
    for (const record of [...(result.lines || []), ...(result.slots || [])]) {
      delete record.isSubcontractor;
      delete record.employeeFunction;
      delete record.subcontractorClassification;
    }
  }
  delete data.dico.employeeActualMonthly;
  delete data.dico.employeePlannedMonthly;
  installDatasets(dashboard, data);
  for (const include of [false, true, false]) {
    dashboard.setIncludeOrmittersHours(include);
    assert.equal(entries(dashboard, dashboard.state.employee)[0].value, 44);
    assert.equal(entries(dashboard, dashboard.state.personalPlan)[0].value, 90);
    assert.equal(entries(dashboard, dashboard.state.projects[0])[0].value, 44);
    const notice = dashboard.buildSubcontractorHoursNote();
    assert.match(notice, /^Filter unavailable/i);
    assert.match(notice, /all hours(?: in those datasets)? remain included/i);
    assert.match(notice, /restart (?:the )?server/i);
    assert.doesNotMatch(notice, /actual and planned hours are excluded/,
      "A stale backend must never claim the filter was applied");
    assert.equal(dashboard.buildRemainingHoursScopeInfo().filteringAvailable, false);
  }
});

test("personal Remaining scope has no consultant delta while project and all-Dico scope restore 449 synthetic hours", () => {
  const dashboard = loadDashboard();
  const data = installDatasets(dashboard, syntheticExtraiFixtures());
  dashboard.state.dicoProjects = null;
  const personal = dashboard.buildRemainingHoursScopeInfo();
  assert.match(personal.label, /Me/);
  assert.equal(personal.filteringAvailable, true);
  assert.equal(personal.actualSubcontractorHours, 0);
  assert.equal(personal.plannedSubcontractorHours, 0);
  const personalExcluded = entries(dashboard, dashboard.state.employee)[0].value;
  const projectExcluded = entries(dashboard, dashboard.state.projects[0])[0].value;
  dashboard.setIncludeOrmittersHours(true);
  assert.equal(entries(dashboard, dashboard.state.employee)[0].value - personalExcluded, 0);
  assert.equal(entries(dashboard, dashboard.state.projects[0])[0].value - projectExcluded, 449);

  dashboard.state.dicoProjects = dashboard.buildDicoProjectListFromApi(data.dico);
  dashboard.state.hoursScope = "whole";
  const allDico = dashboard.buildRemainingHoursScopeInfo();
  assert.match(allDico.label, /Whole Project.*all employees/i);
  assert.equal(allDico.filteringAvailable, true);
  assert.equal(allDico.actualSubcontractorHours, 449);
  assert.equal(allDico.plannedSubcontractorHours, 100);
  const includedDico = dashboard.state.dicoProjects.actualTotalHours;
  dashboard.setIncludeOrmittersHours(false);
  assert.equal(includedDico - dashboard.state.dicoProjects.actualTotalHours, 449);
  assert.equal(dashboard.buildRemainingHoursScopeInfo().actualSubcontractorHours, 449,
    "The explanatory delta must survive either checkbox state");
});

test("Remaining scope consultant counts use selected years and include valid zero-hour data", () => {
  const dashboard = loadDashboard();
  const data = syntheticExtraiFixtures();
  const earlierLine = { ...makeLine(103, 22, 77, true, "2025-10"), project: data.dico.projects[0].name };
  const futureSlot = { ...makeSlot(103, 22, 55, true, "2027-10"), project: data.dico.projects[0].name };
  data.dico.lines.push(earlierLine);
  data.dico.slots.push(futureSlot);
  installDatasets(dashboard, data);
  dashboard.state.hoursScope = "whole";
  let info = dashboard.buildRemainingHoursScopeInfo();
  assert.equal(info.actualSubcontractorHours, 449);
  assert.equal(info.plannedSubcontractorHours, 100);
  dashboard.state.years = [2025, 2026, 2027];
  dashboard.state.selectedYears = new Set([2025]);
  info = dashboard.buildRemainingHoursScopeInfo();
  assert.equal(info.actualSubcontractorHours, 77);
  assert.equal(info.plannedSubcontractorHours, 0);
  dashboard.state.selectedYears = new Set([2027]);
  info = dashboard.buildRemainingHoursScopeInfo();
  assert.equal(info.actualSubcontractorHours, 0);
  assert.equal(info.plannedSubcontractorHours, 55);
  dashboard.state.selectedYears = new Set([2024]);
  info = dashboard.buildRemainingHoursScopeInfo();
  assert.equal(info.filteringAvailable, true);
  assert.equal(info.actualSubcontractorHours, 0);
  assert.equal(info.plannedSubcontractorHours, 0);
  dashboard.renderRemainingHoursScope();
  assert.match(dashboard.els.remainingDataScope.textContent, /0/);
  assert.doesNotMatch(dashboard.els.remainingDataScope.textContent, /unavailable/i);
});

test("loaded empty employee summaries report zero consultant hours rather than an unavailable filter", () => {
  const dashboard = loadDashboard();
  dashboard.state.employee = dashboard.buildEmployeeDatasetFromApi({
    employeeName: "Regular employee", monthly: projectMonths(0), employeeMonthly: [], lines: []
  });
  dashboard.state.personalPlan = dashboard.buildPersonalPlanDatasetFromApi({
    employeeName: "Regular employee", monthly: projectMonths(0), employeeMonthly: [], slots: []
  });
  for (const include of [false, true]) {
    dashboard.setIncludeOrmittersHours(include);
    const info = dashboard.buildRemainingHoursScopeInfo();
    assert.equal(info.filteringAvailable, true);
    assert.equal(info.actualSubcontractorHours, 0);
    assert.equal(info.plannedSubcontractorHours, 0);
    dashboard.renderRemainingHoursScope();
    assert.match(dashboard.els.remainingDataScope.textContent, /Regular employee/);
    assert.match(dashboard.els.remainingDataScope.textContent, /0/);
    assert.doesNotMatch(dashboard.buildSubcontractorHoursNote(), /^Filter unavailable/i);
  }
});

test("Remaining consultant counters match visible external projects, ignore Internal and net signed actual credits", () => {
  const dashboard = loadDashboard();
  const internalActual = { ...makeLine(2, 22, 40, true), project: "Internal" };
  const internalPlan = { ...makeSlot(2, 22, 60, true), project: "Interne" };
  const actualResult = {
    employeeName: "Regular employee", lines: [makeLine(1, 11, 30, false), internalActual],
    monthly: [{ month: "2026-10", projects: [{ name: projectName, hours: 30 }, { name: "Internal", hours: 40 }] }],
    employeeMonthly: projectMonths(30)
  };
  const planResult = {
    employeeName: "Regular employee", slots: [makeSlot(1, 11, 100, false), internalPlan],
    monthly: [{ month: "2026-10", projects: [{ name: projectName, hours: 100 }, { name: "Interne", hours: 60 }] }],
    employeeMonthly: projectMonths(100)
  };
  dashboard.state.employee = dashboard.buildEmployeeDatasetFromApi(actualResult);
  dashboard.state.personalPlan = dashboard.buildPersonalPlanDatasetFromApi(planResult);
  const renderTable = () => dashboard.renderEmployeeRemainingTable(
    entries(dashboard, dashboard.state.employee), entries(dashboard, dashboard.state.personalPlan), selectedKeys
  );
  const scope = dashboard.buildRemainingHoursScopeInfo();
  assert.equal(scope.actualSubcontractorHours, 0);
  assert.equal(scope.plannedSubcontractorHours, 0);
  renderTable();
  const excludedTable = dashboard.els.employeeRemainingTable.innerHTML;
  dashboard.setIncludeOrmittersHours(true);
  renderTable();
  assert.equal(dashboard.els.employeeRemainingTable.innerHTML, excludedTable,
    "Internal-only consultants must not change the external-project table");

  actualResult.lines.push(makeLine(3, 22, 14, true), makeLine(4, 22, -4, true), makeLine(5, 22, 999, true, "2025-10"));
  planResult.slots.push(makeSlot(3, 22, 60, true), makeSlot(4, 22, 888, true, "2025-10"));
  actualResult.monthly[0].projects[0].hours = 40;
  planResult.monthly[0].projects[0].hours = 160;
  dashboard.setIncludeOrmittersHours(false);
  assert.equal(dashboard.buildRemainingHoursScopeInfo().actualSubcontractorHours, 10);
  assert.equal(dashboard.buildRemainingHoursScopeInfo().plannedSubcontractorHours, 60);
  assert.equal(entries(dashboard, dashboard.state.employee)[0].value, 30);
  dashboard.setIncludeOrmittersHours(true);
  assert.equal(dashboard.buildRemainingHoursScopeInfo().actualSubcontractorHours, 10);
  assert.equal(entries(dashboard, dashboard.state.employee)[0].value, 40);
  assert.equal(entries(dashboard, dashboard.state.personalPlan)[0].value, 160);
});

test("Dico-only data renders the Remaining panel and its scope without personal actuals or planning", () => {
  const dashboard = loadDashboard();
  dashboard.state.dicoProjects = dashboard.buildDicoProjectListFromApi(syntheticExtraiFixtures().dico);
  dashboard.renderEmployeePanel([], [], selectedKeys);
  assert.equal(dashboard.els.employeePanel.hidden, false);
  assert.equal(dashboard.els.employeeActualBlock.hidden, false);
  assert.equal(dashboard.els.employeePlanBlock.hidden, false);
  assert.equal(dashboard.els.employeeRemainingBlock.hidden, false);
  assert.equal(dashboard.els.employeeRemainingTableWrap.hidden, false);
  assert.match(dashboard.els.employeeRemainingTable.innerHTML, /Extrai mock/);
  assert.match(dashboard.els.employeeRemainingMeta.textContent, /1 project/);
  assert.match(dashboard.els.remainingDataScope.textContent, /Dico.*baseline.*all employees/i);
  assert.match(dashboard.els.remainingDataScope.textContent, /449/);
});

test("unlinked task aggregates do not claim filtered consumption when subcontractor actuals cannot be assigned", () => {
  const dashboard = loadDashboard();
  const data = fixtures().projectActual;
  data.lines.forEach((line) => { line.task = ""; line.taskId = null; });
  dashboard.state.projects = [dashboard.buildProjectDatasetFromApi(data)];
  const tasks = { rows: [{ id: 201, name: "Work package", hoursSpent: 44, plannedHours: 100 }] };
  const scoped = dashboard.buildScopedWorkPackageDataset(tasks, dashboard.state.projects[0]);
  assert.equal(scoped.hoursFilteringUnavailable, true);
  assert.equal(scoped.rows[0].hoursSpent, null);
  assert.equal(scoped.rows[0].consumptionPercent, null);
  assert.equal(scoped.rows[0].plannedHours, 100, "Work-package budget is independent of employee planning forecasts");
  dashboard.setIncludeOrmittersHours(true);
  const included = dashboard.buildScopedWorkPackageDataset(tasks, dashboard.state.projects[0]);
  assert.equal(included.hoursFilteringUnavailable, false);
  assert.equal(included.rows[0].hoursSpent, 44);
});

test("unlinked subcontractor actuals from earlier years cannot be prorated into selected-year task consumption", () => {
  const dashboard = loadDashboard();
  const data = fixtures().projectActual;
  const subcontractorLine = makeLine(2, 22, 12, true, "2025-10");
  subcontractorLine.task = "";
  subcontractorLine.taskId = null;
  data.lines = [subcontractorLine];
  data.monthly = [{ month: "2025-10", employees: [{ name: sharedEmployeeName, hours: 12 }] }];
  data.employeeMonthly = [];
  const actual = dashboard.buildProjectDatasetFromApi(data);
  const tasks = { rows: [{
    id: 201, name: "Work package", hoursSpent: 12, plannedHours: 100,
    startDate: "2025-01-01", endDate: "2026-12-31"
  }] };
  const scoped = dashboard.buildScopedWorkPackageDataset(tasks, actual);
  assert.equal(scoped.hoursFilteringUnavailable, true);
  assert.equal(scoped.rows.length, 1);
  assert.equal(scoped.rows[0].hoursSpent, null);
  assert.equal(scoped.rows[0].consumptionPercent, null);
  assert.ok(scoped.rows[0].plannedHours > 0, "The selected year still has a task budget");
});

test("unavailable task consumption does not retain dated tasks wholly outside the selected scope", () => {
  const dashboard = loadDashboard();
  const data = fixtures().projectActual;
  data.lines.forEach((line) => { line.task = ""; line.taskId = null; });
  const actual = dashboard.buildProjectDatasetFromApi(data);
  const tasks = { rows: [
    { id: 201, name: "Past work package", hoursSpent: 44, plannedHours: 100, startDate: "2025-01-01", endDate: "2025-12-31" },
    { id: 202, name: "Current work package", hoursSpent: 44, plannedHours: 100, startDate: "2026-01-01", endDate: "2026-12-31" }
  ] };
  const scoped = dashboard.buildScopedWorkPackageDataset(tasks, actual);
  assert.equal(scoped.hoursFilteringUnavailable, true);
  assert.deepEqual(Array.from(scoped.rows, (row) => row.id), [202]);
  assert.equal(scoped.rows[0].hoursSpent, null);
});

test("known task-linked actuals in the selected year survive a task date range outside that year", () => {
  const dashboard = loadDashboard();
  const actual = dashboard.buildProjectDatasetFromApi(fixtures().projectActual);
  const tasks = { rows: [{
    id: 201, name: "Work package", hoursSpent: 44, plannedHours: 100,
    startDate: "2025-01-01", endDate: "2025-12-31"
  }] };
  const scoped = dashboard.buildScopedWorkPackageDataset(tasks, actual);
  assert.equal(scoped.hoursFilteringUnavailable, false);
  assert.equal(scoped.rows.length, 1);
  assert.equal(scoped.rows[0].hoursSpent, 8);
  assert.equal(scoped.rows[0].plannedHours, 0);
  assert.equal(scoped.rows[0].consumptionPercent, null);
});

test("macro override keys distinguish subcontractor inclusion modes without erasing saved values", () => {
  const dashboard = loadDashboard();
  installDatasets(dashboard);
  const excludedKey = dashboard.projectMacroOverrideKey(dashboard.state.projects[0], "project", "2026");
  dashboard.state.projectMacroOverrides.set(excludedKey, { actualHours: 17 });
  dashboard.setIncludeOrmittersHours(true);
  const includedKey = dashboard.projectMacroOverrideKey(dashboard.state.projects[0], "project", "2026");
  assert.notEqual(includedKey, excludedKey);
  assert.equal(dashboard.state.projectMacroOverrides.get(excludedKey).actualHours, 17);
  dashboard.setIncludeOrmittersHours(false);
  assert.equal(dashboard.projectMacroOverrideKey(dashboard.state.projects[0], "project", "2026"), excludedKey);
});
