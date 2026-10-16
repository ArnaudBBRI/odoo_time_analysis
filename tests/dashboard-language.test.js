"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const I18n = require("./i18n-fixture");

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const seam = "const originalFetch = window.fetch.bind(window);";

function hoursResult(projectId = 101) {
  const name = `[${projectId}] Source project name`;
  const line = (employeeId, hours, extra = {}) => ({ projectId, project: name, employeeId,
    employee: "Same source name", date: "2026-10-10", hours, isSubcontractor: false,
    subcontractorClassification: "employee-function", ...extra });
  const slot = (employeeId, hours, extra = {}) => ({ projectId, project: name, employeeId,
    employee: "Same source name", start: "2026-10-01T00:00:00Z", end: "2026-11-01T00:00:00Z", hours,
    isSubcontractor: false, subcontractorClassification: "employee-function", ...extra });
  return { ok: true, project: { id: projectId, name, startDate: "2026-01-01", endDate: "2027-12-31" },
    employee: { ids: [11], resourceIds: [111], name: "Same source name" },
    timesheets: { lines: [line(11, 8), line(22, 4), line(33, 20, { isSubcontractor: true }),
      line(null, 2, { resourceId: 333, employee: "Source resource" }), line(44, -1)] },
    planning: { slots: [slot(11, 100), slot(22, 50), slot(33, 30, { isSubcontractor: true })] },
    lifetime: { startDate: "2026-01-01", endDate: "2027-12-31", conventionHours: 200 },
    contributors: [{ employeeId: 11, name: "Same source name", resourceIds: [111] },
      { employeeId: 22, name: "Same source name", resourceIds: [222] },
      { employeeId: 33, name: "Source consultant", resourceIds: [3333] }],
    planningError: null, warnings: [], hasOrmitters: true };
}

function loadDashboard() {
  assert.ok(script); assert.equal(script.split(seam).length, 2);
  const elements = new Map(), renders = { project: [], unit: [], programme: [], macro: [], years: [], static: [] }, requests = [];
  const document = { getElementById(id) {
    if (!elements.has(id)) elements.set(id, { value: "", textContent: "", hidden: false, checked: false,
      classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, replaceChildren() {}, querySelectorAll() { return []; } });
    return elements.get(id);
  } };
  const context = { DashboardI18n: I18n, document, renders,
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : ["2026-10-16T10:00:00Z"])); }
      static now() { return Date.parse("2026-10-16T10:00:00Z"); } },
    fetch(url) { requests.push(url); throw new Error("This controller test does not authorize any network access"); }
  };
  context.window = {
    PersonalTime: require("../personal-time"), ProjectMonthly: require("../project-monthly"),
    DashboardLanguage: { applyStatic() { renders.static.push(I18n.language()); } },
    ProjectBrowser: { render(container, options) { renders.project.push({ language: I18n.language(), container, options }); }, cleanup() {} },
    UnitDico: { render(container, result, options) { renders.unit.push({ language: I18n.language(), container, result, options }); }, cleanup() {} },
    ProgrammeBrowser: { PROGRAMMES: require("../programme-browser").PROGRAMMES,
      render(container, result, options) { renders.programme.push({ language: I18n.language(), container, result, options }); } }
  };
  const instrumented = script.replace(seam, `
    renderYearFilters = () => globalThis.renders.years.push(I18n.language());
    renderPersonalTimeMacro = () => globalThis.renders.macro.push(I18n.language());
    globalThis.dashboard = { state, els, applyDashboardLanguage, setProjectCalendarView,
      setPersonalProjectEmployeeInclusion, renderPersonalProjects, getDetailProjectCatalogue,
      getSelectedDetailProjectId, getPersonalTimeScope, summarizePersonalProjectHours };
    return;
    ${seam}`);
  vm.runInNewContext(instrumented, context, { filename: "index.html" });
  const dashboard = context.dashboard, { state } = dashboard;
  const first = hoursResult(101), second = hoursResult(102), projects = [first.project, second.project];
  state.years = [2026, 2027]; state.selectedYears = new Set([2026, 2027]);
  state.customDateRange = { startDate: "2026-09-01", endDate: "2026-12-31" };
  state.personalTimeResult = { ok: true, employee: first.employee, projects,
    timesheets: { lines: [first.timesheets.lines[0], second.timesheets.lines[0]] },
    planning: { slots: [first.planning.slots[0], second.planning.slots[0]] }, planningError: null };
  state.unitDicoResult = { ok: true, projects };
  state.programmeProjectsCache.set("DC3", { result: { ok: true, projects }, loading: false, error: "" });
  state.selectedProgrammeId = "DC3";
  state.selectedPersonalProjectId = 102; state.selectedUnitProjectId = 101; state.selectedProgrammeProjectId = 101;
  for (const result of [first, second]) state.personalProjectHoursCache.set(String(result.project.id), { result, loading: false, error: "" });
  state.personalProjectMonthlyMode.set("101", "cumulative");
  state.personalProjectMonthlyEmployee.set("101", "employee:11");
  state.personalProjectPlannedMonthlyEmployee.set("101", "employee:22");
  state.personalProjectOrmitters.set("101", false);
  state.personalProjectIgnoredEmployees.set("101", new Set(["employee:22"]));
  state.personalProjectIgnoredEmployees.set("102", new Set(["resource:333"]));
  state.projectCalendarView = "near";
  state.dashboardView = "programmes";
  return { dashboard, renders, requests, first, second };
}

const serializeChoices = state => JSON.stringify({
  view: state.dashboardView, personal: state.selectedPersonalProjectId, unit: state.selectedUnitProjectId,
  programme: state.selectedProgrammeId, programmeProject: state.selectedProgrammeProjectId,
  years: [...state.selectedYears], custom: state.customDateRange, timeline: state.projectCalendarView,
  modes: [...state.personalProjectMonthlyMode], monthly: [...state.personalProjectMonthlyEmployee],
  plannedMonthly: [...state.personalProjectPlannedMonthlyEmployee], ormitters: [...state.personalProjectOrmitters],
  ignored: [...state.personalProjectIgnoredEmployees].map(([id, values]) => [id, [...values]])
});

test("switching French and Dutch repaints cached project and programme views without losing choices or refetching", () => {
  I18n.setLanguage("fr");
  const { dashboard, renders, requests, first } = loadDashboard(), { state } = dashboard;
  const scope = state.customDateRange, cached = state.personalProjectHoursCache.get("101");
  const initialSource = JSON.stringify(first), choices = serializeChoices(state);
  try {
    for (const language of ["fr", "nl", "fr"]) {
      I18n.setLanguage(language); dashboard.applyDashboardLanguage();
      assert.equal(serializeChoices(state), choices);
      assert.equal(state.personalProjectHoursCache.get("101"), cached);
      assert.equal(dashboard.getPersonalTimeScope(), scope);
      const project = renders.project.at(-1), programme = renders.programme.at(-1);
      assert.equal(project.language, language); assert.equal(programme.language, language);
      assert.equal(project.options.selectedId, 101); assert.equal(programme.options.selectedId, "DC3");
      assert.equal(project.options.scope, scope); assert.equal(project.options.monthlyMode, undefined);
      assert.equal(project.options.detail.monthlyMode, "cumulative");
      assert.equal(project.options.detail.monthlyEmployeeId, "employee:11");
      assert.equal(project.options.detail.plannedMonthlyEmployeeId, "employee:22");
      assert.deepEqual([...project.options.detail.ignoredEmployeeIds], ["employee:22"]);
      assert.equal(project.options.calendarView, "near");
      assert.equal(project.options.projects[0].name, first.project.name);
      assert.equal(project.options.detail.monthly.employees[0].name, "Same source name");
    }
    assert.deepEqual(renders.static, ["fr", "nl", "fr"]);
    assert.deepEqual(renders.years, ["fr", "nl", "fr"]); assert.deepEqual(renders.macro, ["fr", "nl", "fr"]);
    assert.equal(JSON.stringify(first), initialSource); assert.deepEqual(requests, []);
  } finally { I18n.setLanguage("fr"); }
});

test("calendar view callbacks validate choices and share one retained view across personal, unit and programme calendars", () => {
  const { dashboard, renders, requests } = loadDashboard(), { state } = dashboard;
  state.dashboardView = "projects"; state.selectedPersonalProjectId = null; state.projectCalendarView = "full";
  dashboard.renderPersonalProjects();
  const full = renders.project.at(-1).options;
  assert.equal(full.calendarView, "full"); full.onCalendarViewChange("near");
  assert.equal(state.projectCalendarView, "near");
  assert.equal(renders.project.at(-1).options.focusCalendarView, "near"); assert.equal(state.focusCalendarView, null);
  const count = renders.project.length;
  for (const invalid of ["near", "other", "NEAR", null, {}, "full;fetch"]) dashboard.setProjectCalendarView(invalid);
  assert.equal(renders.project.length, count);
  state.dashboardView = "unit-dico"; state.selectedUnitProjectId = null; dashboard.renderPersonalProjects();
  assert.equal(renders.unit.at(-1).options.calendarView, "near");
  renders.unit.at(-1).options.onCalendarViewChange("full");
  assert.equal(state.projectCalendarView, "full"); assert.equal(renders.unit.at(-1).options.focusCalendarView, "full");
  state.dashboardView = "programmes"; state.selectedProgrammeProjectId = null; dashboard.renderPersonalProjects();
  assert.equal(renders.unit.at(-1).options.calendarView, "full");
  renders.unit.at(-1).options.onCalendarViewChange("near");
  assert.equal(state.projectCalendarView, "near"); assert.equal(state.selectedProgrammeId, "DC3");
  assert.deepEqual(requests, []);
});

test("employee exclusions use exact project identities while planning, monthly filters and source totals stay intact", () => {
  const { dashboard, renders, requests, first } = loadDashboard(), { state } = dashboard;
  dashboard.renderPersonalProjects();
  const before = dashboard.summarizePersonalProjectHours(first, false), originalIgnored = state.personalProjectIgnoredEmployees.get("101");
  const modes = JSON.stringify([...state.personalProjectMonthlyMode]), monthly = JSON.stringify([...state.personalProjectMonthlyEmployee]),
    plannedMonthly = JSON.stringify([...state.personalProjectPlannedMonthlyEmployee]), scope = state.customDateRange;
  renders.project.at(-1).options.onEmployeeInclusionChange("employee:11", false);
  assert.deepEqual([...state.personalProjectIgnoredEmployees.get("101")], ["employee:22", "employee:11"]);
  assert.deepEqual([...originalIgnored], ["employee:22"], "The cached input set is not mutated in place");
  renders.project.at(-1).options.onEmployeeInclusionChange("employee:22", true);
  assert.deepEqual([...state.personalProjectIgnoredEmployees.get("101")], ["employee:11"]);
  assert.equal(renders.project.at(-1).options.detail.project.actual, before.actual);
  assert.equal(renders.project.at(-1).options.detail.project.planned, before.planned);
  assert.deepEqual([...renders.project.at(-1).options.detail.ignoredEmployeeIds], ["employee:11"]);
  assert.equal(JSON.stringify([...state.personalProjectMonthlyMode]), modes);
  assert.equal(JSON.stringify([...state.personalProjectMonthlyEmployee]), monthly);
  assert.equal(JSON.stringify([...state.personalProjectPlannedMonthlyEmployee]), plannedMonthly);
  assert.equal(state.personalProjectOrmitters.get("101"), false); assert.equal(state.customDateRange, scope);
  const count = renders.project.length;
  for (const [id, included] of [["Same source name", false], [11, false], ["employee:999", false],
    ["employee:33", false], ["employee:11", "false"], [null, false]]) dashboard.setPersonalProjectEmployeeInclusion(id, included);
  assert.equal(renders.project.length, count, "Names, foreign identities, excluded Ormitters and nonbooleans cannot affect a selection");
  state.selectedProgrammeProjectId = 102; dashboard.renderPersonalProjects();
  renders.project.at(-1).options.onEmployeeInclusionChange("employee:22", false);
  assert.deepEqual([...state.personalProjectIgnoredEmployees.get("102")], ["resource:333", "employee:22"]);
  assert.deepEqual([...state.personalProjectIgnoredEmployees.get("101")], ["employee:11"]);
  state.selectedProgrammeProjectId = 101; state.personalProjectOrmitters.set("101", true); dashboard.renderPersonalProjects();
  renders.project.at(-1).options.onEmployeeInclusionChange("employee:33", false);
  assert.ok(state.personalProjectIgnoredEmployees.get("101").has("employee:33"));
  assert.equal(state.personalProjectOrmitters.get("101"), true, "Employee exclusions never toggle the independent Ormitter preference");
  assert.deepEqual(requests, []);
});

test("language repaint translates existing application feedback without applying invalid date inputs or changing cached state", () => {
  I18n.setLanguage("fr");
  const { dashboard, requests } = loadDashboard(), { state, els } = dashboard;
  const scope = state.customDateRange, choices = serializeChoices(state), cached = state.personalProjectHoursCache.get("101");
  els.customDateStart.value = "2027-01-01"; els.customDateEnd.value = "2026-01-01";
  els.customDateError.textContent = "La date de fin doit être égale ou postérieure à la date de début.";
  els.timesheetDebugStatus.textContent = "La fiche projet est indisponible avec vos accès Odoo.";
  els.statusText.textContent = "Planning indisponible";
  try {
    I18n.setLanguage("nl"); dashboard.applyDashboardLanguage();
    assert.equal(els.customDateError.textContent, "De einddatum moet op of na de begindatum liggen.");
    assert.equal(els.timesheetDebugStatus.textContent, "De projectfiche is niet beschikbaar met uw Odoo-toegangsrechten.");
    assert.equal(els.statusText.textContent, "Planning niet beschikbaar");
    assert.equal(state.customDateRange, scope); assert.equal(serializeChoices(state), choices);
    assert.equal(state.personalProjectHoursCache.get("101"), cached);
    assert.equal(els.customDateStart.value, "2027-01-01"); assert.equal(els.customDateEnd.value, "2026-01-01");
    const sourceText = "Source project name <script>literal</script> · custom source details";
    els.statusText.textContent = sourceText;
    I18n.setLanguage("fr"); dashboard.applyDashboardLanguage();
    assert.equal(els.customDateError.textContent, "La date de fin doit être égale ou postérieure à la date de début.");
    assert.equal(els.timesheetDebugStatus.textContent, "La fiche projet est indisponible avec vos accès Odoo.");
    assert.equal(els.statusText.textContent, sourceText, "Unknown source text is preserved exactly");
    assert.equal(serializeChoices(state), choices); assert.deepEqual(requests, []);
  } finally { I18n.setLanguage("fr"); }
});
