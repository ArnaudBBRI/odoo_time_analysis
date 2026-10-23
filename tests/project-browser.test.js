const assert = require("node:assert/strict");
const test = require("node:test");
const { render, cleanup, barGeometry, monthlyGeometry, periodTitle } = require("../project-browser");
const ChartPalette = require("../chart-palette");
const { domFixture } = require("./dom-fixture");

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ekAAAAASUVORK5CYII=";
const projects = () => [
  { id: 2, name: "Zulu project", manager: { id: 20, name: "Alex Example", photoDataUrl: png } },
  { id: 1, name: "Alpha project", manager: null }
];

function freshBrowser(chartPalette = ChartPalette) {
  const dependency = require("node:module").createRequire(require.resolve("../project-browser"));
  const filename = require.resolve("../project-browser"), context = { module: { exports: {} },
    require: name => name === "./chart-palette" ? chartPalette : dependency(name) };
  require("node:vm").runInNewContext(require("node:fs").readFileSync(filename, "utf8"), context, { filename });
  return context.module.exports;
}

test("personal hours titles name the selected French years and inclusive custom dates", () => {
  const years = new Set([2027, 2026, 2027]);
  assert.equal(periodTitle(undefined, [2026]), "Mes heures en 2026");
  assert.equal(periodTitle(years, [2024]), "Mes heures en 2026 et 2027");
  assert.equal(periodTitle([2024, 2026, 2028]), "Mes heures en 2024, 2026 et 2028");
  assert.equal(periodTitle([2024, 2026, 2028, 2029]), "Mes heures en 2024, 2026, 2028 et 2029");
  assert.deepEqual([...years], [2027, 2026], "Formatting does not mutate the selected years");
  const scope = { startDate: "2026-08-01", endDate: "2026-12-31" };
  assert.equal(periodTitle(scope, [2026]), "Mes heures du 1er août 2026 au 31 décembre 2026");
  assert.equal(periodTitle(scope, [2026], "Heures du projet"), "Heures du projet du 1er août 2026 au 31 décembre 2026");
  assert.equal(periodTitle({ kind: "years", years: [2024, 2026], startDate: "2024-01-01", endDate: "2026-12-31" }),
    "Mes heures en 2024 et 2026", "Disjoint normalized years do not become a continuous date range");
  for (const invalid of [{ startDate: "2026-02-30", endDate: "2026-12-31" },
    { startDate: "2026-12-31", endDate: "2026-08-01" }, { startDate: "2026-08-01" },
    { startDate: "0000-01-01", endDate: "2026-12-31" }, []]) {
    assert.equal(periodTitle(invalid, [2026]), "Mes heures · période sélectionnée");
  }
  assert.equal(periodTitle(["2026", false, "", 2026.5, null, 9999, Infinity]), "Mes heures en 2026");
});

test("Heures/Budget switch replaces hours graphs, retains its focus and reuses the budget host", () => {
  const container = domFixture(), panels = [], renders = [];
  let panel = "hours", finance = { result: { project: { id: 2 } }, loading: false, selectedConventionId: 14, excludeOrmitterCosts: true, showBwPersonnelCosts: true };
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail: monthlyDetail(), panel, finance,
    onViewChange(value) { panels.push(value); panel = value; draw(); },
    onBudgetRetry() { panels.push("retry"); }, onConventionChange(id) { panels.push(id); },
    onExcludeOrmitterCostsChange(value) { panels.push(value); },
    onShowBwPersonnelCostsChange(value) { panels.push(["personnel", value]); },
    budgetRenderer: { render(host, data, options) { renders.push({ host, data, options }); host.replaceChildren(host.ownerDocument.createElement("p")); } } });
  draw();
  assert.equal(container.querySelectorAll("[data-selected-project]")[0].getAttribute("data-project-panel"), "hours");
  assert.equal(container.querySelectorAll('[data-project-view="hours"]')[0].getAttribute("aria-pressed"), "true");
  assert.equal(container.querySelectorAll('[data-project-view="budget"]')[0].getAttribute("aria-pressed"), "false");
  assert.equal(renders.length, 0);
  const budgetButton = container.querySelectorAll('[data-project-view="budget"]')[0];
  budgetButton.focus(); budgetButton.dispatch("click");
  assert.deepEqual(panels, ["budget"]);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-project-view"), "budget");
  assert.equal(container.querySelectorAll('[data-project-view="budget"]')[0].getAttribute("aria-pressed"), "true");
  assert.equal(container.querySelectorAll("[data-selected-project]")[0].getAttribute("data-project-panel"), "budget");
  assert.equal(container.querySelectorAll("[data-project-hours-project]").length, 0);
  assert.equal(container.querySelectorAll(".project-comparison").length, 0);
  assert.equal(container.querySelectorAll("[data-monthly-project]").length, 0);
  assert.match(container.textContent, /Durée totale du projet/);
  assert.equal(renders[0].data, finance.result);
  assert.equal(renders[0].options.selectedConventionId, 14);
  assert.equal(renders[0].options.excludeOrmitterCosts, true);
  assert.equal(renders[0].options.showBwPersonnelCosts, true);
  renders[0].options.onRetry(); renders[0].options.onConventionChange(15); renders[0].options.onExcludeOrmitterCostsChange(false);
  assert.deepEqual(panels, ["budget", "retry", 15, false]);
  renders[0].options.onShowBwPersonnelCostsChange(false);
  assert.deepEqual(panels.at(-1), ["personnel", false]);
  const firstHost = renders[0].host;
  draw();
  assert.equal(renders[1].host, firstHost, "The source-backed renderer can preserve expanded tables and focus");
  container.querySelectorAll('[data-project-view="hours"]')[0].dispatch("click");
  assert.equal(container.querySelectorAll("[data-budget-host]").length, 0);
  assert.ok(container.querySelectorAll("[data-monthly-project]").length > 0);
});

test("Budget control focus is restored after mounting a rerendered project detail", () => {
  const container = domFixture();
  for (const [attribute, value] of [["data-budget-convention-choice", "14"], ["data-budget-details", "annual:21"], ["data-budget-retry", ""], ["data-budget-exclude-ormitter-costs", ""], ["data-budget-show-bw-personnel-costs", ""], ["data-budget-code-detail", "21:consumed:6139"]]) {
    const draw = () => render(container, { projects: projects(), selectedId: 2, panel: "budget", finance: { result: { project: { id: 2 } } },
      budgetRenderer: { render(host) {
        // Real DOM reparenting blurs the old node. Simulate that here so the
        // parent must restore the captured identity after mounting the detail.
        container.ownerDocument.activeElement = null;
        const control = host.ownerDocument.createElement("button"); control.setAttribute(attribute, value); host.replaceChildren(control);
      } } });
    draw(); container.querySelectorAll(`[${attribute}]`)[0].focus(); draw();
    assert.equal(container.ownerDocument.activeElement.getAttribute(attribute), value);
    assert.ok(container.contains(container.ownerDocument.activeElement));
  }
});

test("Budget modal cleanup occurs before host removal and restores its trigger after same-project rerender", () => {
  const container = domFixture(), calls = [];
  const renderer = {
    render(host) {
      const button = host.ownerDocument.createElement("button");
      button.setAttribute("data-budget-code-detail", "60:consumed:903:1");
      host.replaceChildren(button);
    },
    cleanup(host, returnFocus) {
      calls.push({ connected: container.contains(host), returnFocus });
      container.ownerDocument.activeElement = null;
      return "60:consumed:903:1";
    }
  };
  const draw = (selectedId, panel = "budget") => render(container, {
    projects: projects(), selectedId, panel, finance: { result: { project: { id: selectedId } } }, budgetRenderer: renderer
  });
  draw(2); draw(2);
  assert.equal(calls.length, 1); assert.deepEqual(calls[0], { connected: true, returnFocus: false });
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-budget-code-detail"), "60:consumed:903:1");
  assert.ok(container.contains(container.ownerDocument.activeElement));
  draw(2, "hours");
  assert.equal(calls.length, 2); assert.equal(calls[1].connected, true);
  assert.equal(container.querySelectorAll("[data-budget-host]").length, 0);
  draw(2); draw(1);
  assert.equal(calls.length, 3); assert.equal(calls[2].connected, true);
  draw(null);
  assert.equal(calls.length, 4); assert.equal(calls[3].connected, true);
  assert.equal(container.querySelectorAll("[data-budget-host]").length, 0);
});

test("real budget bill modal closes across project refresh and Hours navigation without orphaned focus", async () => {
  const budgetRenderer = require("../project-budget");
  const { load } = require("../project-finance-service");
  const { fixtureRpc, supplierRecords } = require("./project-finance-fixture");
  const finance = await load(11, fixtureRpc({ records: supplierRecords() }), new Date("2026-10-09T12:00:00Z"));
  const container = domFixture();
  const draw = (panel = "budget") => render(container, { projects: [{ id: 11, name: "Projet Alpha" }], selectedId: 11,
    panel, finance: { result: finance }, budgetRenderer });
  draw();
  const trigger = container.querySelectorAll("[data-budget-code-measure]")[1];
  const key = trigger.getAttribute("data-budget-code-detail");
  trigger.focus(); trigger.dispatch("click");
  const modal = container.querySelectorAll("[data-budget-bills-modal]")[0];
  assert.equal(container.ownerDocument.modalElement, modal);
  draw();
  assert.equal(modal.open, false); assert.equal(modal.parentElement, null);
  assert.equal(container.ownerDocument.modalElement, null);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-budget-code-detail"), key);
  assert.ok(container.contains(container.ownerDocument.activeElement));
  container.ownerDocument.activeElement.dispatch("click");
  const next = container.querySelectorAll("[data-budget-bills-modal]")[0];
  draw("hours");
  assert.equal(next.open, false); assert.equal(next.parentElement, null);
  assert.equal(container.ownerDocument.modalElement, null);
  assert.equal(container.querySelectorAll("[data-budget-bills-modal]").length, 0);
  assert.equal(container.ownerDocument.listeners.size, 0);
});

test("leaving a project host explicitly releases its native bill modal and monthly observers", async () => {
  const budgetRenderer = require("../project-budget");
  const { load } = require("../project-finance-service");
  const { fixtureRpc, supplierRecords } = require("./project-finance-fixture");
  const finance = await load(11, fixtureRpc({ records: supplierRecords() }), new Date("2026-10-09T12:00:00Z"));
  const container = domFixture();
  render(container, { projects: [{ id: 11, name: "Projet Alpha" }], selectedId: 11,
    panel: "budget", finance: { result: finance }, budgetRenderer });
  container.querySelectorAll("[data-budget-code-measure]")[1].dispatch("click");
  const modal = container.querySelectorAll("[data-budget-bills-modal]")[0];
  assert.equal(modal.open, true);
  cleanup(container);
  assert.equal(modal.open, false);
  assert.equal(container.ownerDocument.modalElement, null);
  assert.equal(container.ownerDocument.listeners.size, 0);
  cleanup(container);

  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  container.ownerDocument.defaultView = { IntersectionObserver: Observer, ResizeObserver: Observer,
    matchMedia: () => ({ matches: false }) };
  render(container, { projects: [{ id: 19991, name: "Lifecycle fixture" }], selectedId: 19991, detail: monthlyDetail() });
  const section = container.querySelectorAll("[data-monthly-project]")[0];
  const revision = section.getAttribute("data-monthly-reveal");
  assert.ok(observers.length >= 2);
  cleanup(container);
  assert.ok(observers.every(observer => observer.disconnected));
  assert.equal(container.ownerDocument.listeners.size, 0);
  observers.forEach(observer => observer.callback([{ isIntersecting: true, contentRect: { width: 390 } }]));
  assert.equal(section.getAttribute("data-monthly-reveal"), revision, "Callbacks on a hidden host cannot restart its animation");
  cleanup(container);
});

function monthlySummary() {
  return { status: "available", mode: "monthly", startDate: "2026-01-01", throughDate: "2026-03-05", endDate: "2026-12-31",
    months: [{ key: "2026-01", label: "janvier 2026" }, { key: "2026-02", label: "février 2026" }, { key: "2026-03", label: "mars 2026" }],
    employees: [{ id: "employee:1", name: "Alex Example", values: [10, -2, 5], photoDataUrl: png },
      { id: "employee:2", name: "Drew Example", values: [0, 7, -1], photoDataUrl: null }],
    total: [10, 5, 4], convention: [8.1234567890123, 8, 8], budgetStatus: "available", warnings: [] };
}

function monthlyDetail() {
  const monthly = monthlySummary();
  return { monthly, hasOrmitters: true, includeOrmitters: false,
    personal: { planned: 10, actual: 2 },
    project: { planned: 30, actual: 19, employees: monthly.employees.map(employee => ({ ...employee,
      actual: employee.values.reduce((sum, value) => sum + value, 0) })) } };
}

function employeePlanningDetail() {
  const detail = monthlyDetail();
  Object.assign(detail.monthly.employees[0], { plannedHours: 120, plannedStatus: "available", plannedReference: [10.1234567890123, 10, 2], plannedWarning: null });
  Object.assign(detail.monthly.employees[1], { plannedHours: 0, plannedStatus: "available", plannedReference: [0, 0, 0], plannedWarning: null });
  return detail;
}

function planningInfoFixture(extra = {}) {
  return { status: "available", startDate: "2025-12-01", endDate: "2028-05-31", conventionHours: 120,
    conventionStatus: "available", totalPlanned: 150, knownToHireHours: 20, toHireStatus: "complete",
    plannedWithoutKnownToHire: 130, toHireResources: [{ id: 201, name: "TH_DiCo", hours: 20 }], unlinkedResources: [],
    actualHours: 40, actualStatus: "available", actualThroughDate: "2026-10-12", remainingPlannedHours: 110,
    plannedToDateHours: 50, plannedToDateStatus: "available", planningToDateDifference: -10,
    conventionToDateHours: 60, conventionToDateStatus: "available", conventionToDateDifference: -20,
    personalToDate: { actualHours: 10, actualStatus: "available", plannedHours: 15, plannedStatus: "available",
      difference: -5, status: "available" },
    remainingPlannedStatus: "available", remainingStartDate: "2026-10-13", remainingToHireHours: 20,
    remainingToHireStatus: "complete", projectedHours: 150, projectionDifference: 30, projectionStatus: "available",
    coverage: { status: "complete", startDate: "2026-10-12", endDate: "2028-05-31", gaps: [], gapDays: 0 },
    difference: 30, warnings: [], ...extra };
}

test("a known-zero personal pair is omitted while full-project comparisons, history and planning information remain", () => {
  const container = domFixture(), detail = monthlyDetail();
  detail.personal = { planned: 0, actual: "0" }; detail.planningInfo = planningInfoFixture();
  render(container, { projects: projects(), selectedId: 2, detail, years: [2026] });
  assert.deepEqual(container.querySelectorAll("[data-comparison]").map(node => node.getAttribute("data-comparison")), ["project", "lifetime"]);
  assert.equal(container.querySelectorAll("[data-monthly-project]").length, 1);
  const monthlyCharts = container.querySelectorAll(".project-hours-monthly")[0];
  assert.equal(monthlyCharts.children.length, 1);
  assert.equal(monthlyCharts.children[0], container.querySelectorAll('[data-monthly-kind="actual"]')[0],
    "A missing planned series leaves the single existing actual chart available for full width");
  const overview = container.querySelectorAll(".project-browser-overview")[0];
  assert.deepEqual(overview.children.map(node => node.className), ["project-browser-section-title", "project-planning-info"]);
  assert.equal(container.querySelectorAll(".project-hours-graphs")[0].querySelectorAll(".project-hours-comparisons").length, 1);
  for (const personal of [undefined, null, {}, { planned: null, actual: 0 }, { planned: 0, actual: null },
    { planned: false, actual: 0 }, { planned: 0.001, actual: 0 }, { planned: 0, actual: -1 }, { planned: 0, actual: 1 }]) {
    detail.personal = personal; render(container, { projects: projects(), selectedId: 2, detail });
    assert.equal(container.querySelectorAll('[data-comparison="personal"]').length, 1, "Unknown and nonzero personal totals remain inspectable");
  }
});

test("hours layout keeps overview and graph rails independent while exact legend controls and focus survive redraws", () => {
  const container = domFixture(), detail = pairedMonthlyDetail(), changes = [];
  detail.planningInfo = planningInfoFixture();
  const original = structuredClone(detail);
  let monthlyEmployeeId = null;
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail: { ...detail, monthlyEmployeeId },
    onEmployeeInclusionChange(id, included) { changes.push([id, included]); },
    onMonthlyEmployeeChange(id) { monthlyEmployeeId = id; changes.push(id); draw(); } });
  try {
    draw();
    const selected = container.querySelectorAll("[data-selected-project]")[0];
    const layout = selected.querySelectorAll("[data-project-hours-project]")[0];
    assert.equal(layout.getAttribute("data-project-hours-project"), "2");
    assert.deepEqual(layout.children.map(node => node.className),
      ["project-browser-section project-browser-overview", "project-hours-graphs"]);
    const overview = layout.children[0], graphs = layout.children[1];
    assert.ok(overview.querySelectorAll("[data-project-planning-info]").length);
    assert.equal(overview.querySelectorAll("[data-comparison]").length, 0);
    assert.deepEqual(graphs.children.map(node => node.className),
      ["project-hours-comparisons", "project-hours-monthly"]);
    const monthlyCharts = graphs.children[1];
    assert.deepEqual(monthlyCharts.children.map(node => node.getAttribute("data-monthly-kind")), ["actual", "planned"]);
    assert.deepEqual(monthlyCharts.children, container.querySelectorAll("[data-monthly-kind]"),
      "The spanning group contains each existing monthly section exactly once in normal reading order");
    const comparison = graphs.querySelectorAll('[data-comparison="project"]')[0];
    const plot = comparison.querySelectorAll(".project-hours-plot")[0];
    assert.deepEqual(plot.children.map(node => node.className), ["project-hours-chart", "project-hours-legend"]);
    assert.equal(plot.children[0].querySelectorAll(".project-hours-pair").length, 1);
    assert.equal(plot.children[1].querySelectorAll(".project-hours-employees").length, 1);
    assert.equal(plot.children[1].querySelectorAll("[data-employee-total]").length, 1);
    const tooltip = selected.querySelectorAll(".project-hours-employee-tooltip")[0];
    assert.equal(tooltip.parentElement, selected, "Employee tooltip keeps the detail coordinate system");
    const employee = plot.children[1].querySelectorAll('[data-employee-id="employee:1"]')[0];
    assert.equal(employee.getAttribute("aria-describedby"), tooltip.id);
    employee.focus(); employee.dispatch("click"); draw();
    assert.deepEqual(changes, [["employee:1", false]]);
    assert.equal(container.ownerDocument.activeElement.getAttribute("data-employee-id"), "employee:1");
    assert.equal(container.ownerDocument.activeElement.getAttribute("data-employee-kind"), "legend");
    for (const section of container.querySelectorAll("[data-monthly-kind]")) {
      const monthlyPlot = section.querySelectorAll(".project-monthly-plot")[0];
      assert.deepEqual(monthlyPlot.children.map(node => node.className), ["project-monthly-legend", "project-monthly-chart-wrap"],
        "Normal legend-first reading order remains intact");
      assert.equal(monthlyPlot.children[1].querySelectorAll("[data-monthly-chart]").length, 1);
      assert.equal(section.querySelectorAll("[data-monthly-tooltip]")[0].parentElement, section);
    }
    const actual = container.querySelectorAll('[data-monthly-kind="actual"]')[0];
    const choice = actual.querySelectorAll('[data-monthly-employee-choice="employee:1"]')[0];
    choice.focus(); choice.dispatch("click");
    assert.equal(container.ownerDocument.activeElement.getAttribute("data-monthly-employee-choice"), "employee:1");
    assert.ok(container.querySelectorAll(".project-hours-monthly")[0].contains(container.ownerDocument.activeElement));
    assert.equal(container.querySelectorAll('[data-monthly-kind="actual"]')[0].getAttribute("data-monthly-selected-employee"), "employee:1");
    assert.deepEqual(changes, [["employee:1", false], "employee:1"]);
    assert.deepEqual(detail, original);
  } finally { cleanup(container); }
});

test("four macro cards separate convention, actuals, remaining TH planning and the signed final projection", () => {
  const container = domFixture(), detail = monthlyDetail(); detail.planningInfo = planningInfoFixture();
  const original = structuredClone(detail);
  render(container, { projects: projects(), selectedId: 2, scope: { startDate: "2026-08-01", endDate: "2026-12-31" }, detail });
  const info = container.querySelectorAll("[data-project-planning-info]")[0];
  assert.deepEqual(info.querySelectorAll("[data-planning-metric]").map(node => node.getAttribute("data-planning-metric")), ["convention", "actual", "remaining", "projection"]);
  assert.deepEqual(info.querySelectorAll("dd").map(node => node.textContent), ["120 h", "40 h", "110 h", "+30 h"]);
  assert.match(info.querySelectorAll('[data-planning-metric="actual"]')[0].querySelectorAll("dt")[0].textContent, /déjà prestées.*depuis le début du projet.*Hors Ormitters.*12\/10\/2026/);
  assert.equal(info.querySelectorAll('[data-planning-metric="actual"]')[0].querySelectorAll("em").length, 1, "The fixed actual-hours exclusion has a small italic note");
  assert.equal(info.querySelectorAll('[data-planning-remaining-to-hire]')[0].tagName, "strong");
  assert.match(info.querySelectorAll('[data-planning-metric="remaining"]')[0].textContent, /restantes planifiées.*dont 20 h à recruter \(TH\)/);
  assert.match(info.querySelectorAll(".project-planning-info-period")[0].textContent, /01\/12\/2025.*31\/05\/2028.*durée totale du projet.*indépendamment de la période sélectionnée.*hors Ormitters/);
  assert.equal(info.querySelectorAll("[data-planning-convention-difference]").length, 0, "The obsolete full-plan delta does not compete with the final projection");
  assert.equal(info.querySelectorAll('[data-planning-metric="without-th"]').length, 0);
  assert.equal(info.querySelectorAll('[data-planning-metric="planned"]').length, 0);
  assert.equal(info.querySelectorAll('[data-planning-metric="projection"]')[0].getAttribute("data-planning-projection-direction"), "over");
  assert.match(info.textContent, /Écart projeté = heures déjà prestées \+ heures restantes planifiées \(TH inclus\) − convention/);
  assert.equal(info.querySelectorAll('[data-planning-coverage="complete"]').length, 1);
  assert.match(info.querySelectorAll('[data-planning-details="to-hire"]')[0].textContent, /TH_DiCo · 20 h/);
  assert.deepEqual(detail, original);
  for (const [projectionDifference, text, direction] of [[-30, "−30 h", "under"], [0.0049, "0 h", "balanced"],
    [0.005, "0 h", "balanced"], [0.0051, "+0,01 h", "over"], [null, "Indisponible", "unknown"]]) {
    detail.planningInfo = planningInfoFixture({ totalPlanned: 999, difference: 879, projectionDifference });
    render(container, { projects: projects(), selectedId: 2, detail });
    const projected = container.querySelectorAll('[data-planning-metric="projection"]')[0];
    assert.equal(projected.querySelectorAll("dd")[0].textContent, text);
    assert.equal(projected.getAttribute("data-planning-projection-direction"), direction);
    if (direction === "under") assert.match(projected.querySelectorAll("dt")[0].textContent, /en moins/);
  }
});

test("unknown TH attribution and future identity coverage never render a fictitious zero or confirmed empty planning", () => {
  const container = domFixture(), detail = monthlyDetail();
  detail.planningInfo = planningInfoFixture({ toHireStatus: "unavailable", knownToHireHours: null,
    plannedWithoutKnownToHire: null, remainingToHireHours: null, remainingToHireStatus: "unavailable",
    toHireResources: [], coverage: { status: "unavailable", gaps: [] } });
  render(container, { projects: projects(), selectedId: 2, detail });
  let info = container.querySelectorAll("[data-project-planning-info]")[0];
  assert.match(info.querySelectorAll('[data-planning-remaining-to-hire]')[0].textContent, /Part des heures TH indisponible/);
  assert.equal(info.querySelectorAll('[data-planning-metric="remaining"]')[0].querySelectorAll("dd")[0].textContent, "110 h", "Unknown attribution does not erase a known total planning amount");
  assert.equal(info.querySelectorAll('[data-planning-coverage="unavailable"]').length, 1);
  assert.match(info.textContent, /Couverture future indéterminée/);
  assert.equal(info.querySelectorAll('[data-planning-coverage="gaps"]').length, 0);
  assert.equal(info.querySelectorAll('[data-planning-details="to-hire"]').length, 0);
  detail.planningInfo = planningInfoFixture({ toHireStatus: "partial", remainingToHireStatus: "partial", coverage: { status: "unavailable" } });
  render(container, { projects: projects(), selectedId: 2, detail }); info = container.querySelectorAll("[data-project-planning-info]")[0];
  assert.match(info.querySelectorAll('[data-planning-remaining-to-hire]')[0].textContent, /dont 20 h à recruter \(TH\) identifiées/);
  assert.match(info.querySelectorAll('[data-planning-to-hire-coverage="partial"]')[0].textContent, /seules les heures TH confirmées/);
  detail.planningInfo = planningInfoFixture({ conventionHours: null, conventionStatus: "empty", difference: null });
  render(container, { projects: projects(), selectedId: 2, detail });
  assert.equal(container.querySelectorAll('[data-planning-metric="convention"]')[0].querySelectorAll("dd")[0].textContent, "Non renseigné");
});

test("macro projection uncertainty preserves known actual consumption without inventing remaining hours or a final gap", () => {
  const container = domFixture(), detail = monthlyDetail();
  detail.planningInfo = planningInfoFixture({ status: "partial", endDate: null, remainingPlannedHours: null,
    remainingPlannedStatus: "unavailable", remainingToHireHours: null, remainingToHireStatus: "unavailable",
    projectedHours: null, projectionDifference: null, projectionStatus: "unavailable", coverage: { status: "unavailable" } });
  render(container, { projects: projects(), selectedId: 2, detail });
  assert.deepEqual(container.querySelectorAll(".project-planning-info-value").map(node => node.textContent), ["120 h", "40 h", "Indisponible", "Indisponible"]);
  assert.match(container.querySelectorAll(".project-planning-info-period")[0].textContent, /Dates du projet indisponibles/);
  assert.equal(container.querySelectorAll('[data-planning-projection-direction="unknown"]').length, 1);
  detail.planningInfo = planningInfoFixture({ actualHours: 900, actualStatus: "unavailable", remainingPlannedHours: 800,
    remainingPlannedStatus: "unavailable", projectionDifference: 1580, projectionStatus: "unavailable" });
  render(container, { projects: projects(), selectedId: 2, detail });
  assert.deepEqual(container.querySelectorAll(".project-planning-info-value").map(node => node.textContent), ["120 h", "Indisponible", "Indisponible", "Indisponible"], "Unavailable source status wins over a stale numeric value");
});

test("future gaps report their exact month-long periods rather than the whole examined window", () => {
  const container = domFixture(), detail = monthlyDetail();
  detail.planningInfo = planningInfoFixture({ coverage: { status: "gaps", startDate: "2026-10-12", endDate: "2028-05-31",
    gapDays: 65, gaps: [{ startDate: "2026-11-01", endDate: "2026-11-30", days: 30 },
      { startDate: "2027-03-01", endDate: "2027-04-04", days: 35 }] } });
  render(container, { projects: projects(), selectedId: 2, detail });
  const info = container.querySelectorAll("[data-project-planning-info]")[0];
  const warning = info.querySelectorAll('[data-planning-coverage="gaps"]')[0].textContent;
  assert.match(warning, /aucune personne réellement planifiée du 01\/11\/2026 au 30\/11\/2026 \(30 jours calendaires\).*01\/03\/2027 au 04\/04\/2027 \(35 jours calendaires\)/);
  assert.equal(warning.includes("12/10/2026"), false);
  assert.equal(warning.includes("31/05/2028"), false);
  const gaps = info.querySelectorAll('[data-planning-details="gaps"]')[0];
  assert.equal(gaps.tagName, "details"); assert.equal(gaps.open, false);
  assert.deepEqual(gaps.querySelectorAll("li").map(node => node.textContent), ["Du 01/11/2026 au 30/11/2026 · 30 jours calendaires.", "Du 01/03/2027 au 04/04/2027 · 35 jours calendaires."]);
  detail.planningInfo = planningInfoFixture({ coverage: { status: "no-substantial-gaps", startDate: "2026-10-12", endDate: "2028-05-31",
    gaps: [], gapDays: 0, shortGaps: [{ startDate: "2028-05-31", endDate: "2028-05-31", days: 1 }] } });
  render(container, { projects: projects(), selectedId: 2, detail });
  assert.match(container.querySelectorAll('[data-planning-coverage="no-substantial-gaps"]')[0].textContent, /Aucune période.*d’au moins un mois/);
  assert.equal(container.querySelectorAll('[data-planning-details="gaps"]').length, 0);
  assert.equal(container.querySelectorAll('[data-planning-coverage="gaps"]').length, 0);
  assert.equal(container.textContent.includes("sur toute la période"), false, "A tolerated short gap is not presented as complete person coverage");
  detail.planningInfo = planningInfoFixture({ coverage: { status: "complete", startDate: null, endDate: null } });
  render(container, { projects: projects(), selectedId: 2, detail });
  assert.match(container.querySelectorAll('[data-planning-coverage="complete"]')[0].textContent, /Aucune période future à couvrir/);
});

test("planning details preserve disclosure state and keyboard focus through inclusion redraws", () => {
  const container = domFixture(), detail = monthlyDetail(); detail.planningInfo = planningInfoFixture();
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail,
    onIncludeOrmittersChange(value) { detail.includeOrmitters = value; draw(); } });
  draw();
  let disclosure = container.querySelectorAll('[data-planning-details="to-hire"]')[0]; disclosure.open = true;
  disclosure.querySelectorAll("summary")[0].focus(); draw();
  disclosure = container.querySelectorAll('[data-planning-details="to-hire"]')[0]; assert.equal(disclosure.open, true);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-planning-detail-control"), "to-hire");
  const toggle = container.querySelectorAll("[data-include-ormitters]")[0]; toggle.focus(); toggle.checked = true; toggle.dispatch("change");
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-include-ormitters"), "");
  assert.equal(container.querySelectorAll('[data-planning-details="to-hire"]')[0].open, true);
  assert.match(container.querySelectorAll(".project-planning-info-period")[0].textContent, /hors Ormitters/);
  assert.equal(container.querySelectorAll(".project-planning-info-period")[0].textContent.includes("Ormitters inclus"), false, "The graph switch never changes the fixed macro cohort");
  container.querySelectorAll('[data-planning-detail-control="to-hire"]')[0].focus();
  detail.planningInfo.toHireResources = []; draw();
  assert.equal(container.ownerDocument.activeElement.className, "project-browser-title");
});

test("planning resource names and notices render literally and do not leak into budget views", () => {
  const container = domFixture(), detail = monthlyDetail();
  detail.planningInfo = planningInfoFixture({ toHireResources: [{ id: 201, name: "<script>TH_DiCo</script>", hours: 20 }],
    unlinkedResources: [{ id: 202, name: '<img src=x onerror="PRIVATE_SCRIPT()">', hours: 5 }], warnings: ["<script>Notice</script>"] });
  render(container, { projects: projects(), selectedId: 2, detail });
  const info = container.querySelectorAll("[data-project-planning-info]")[0];
  assert.ok(info.textContent.includes("<script>TH_DiCo</script> · 20 h"));
  assert.ok(info.textContent.includes('<img src=x onerror="PRIVATE_SCRIPT()"> · 5 h'));
  assert.equal(info.querySelectorAll("script").length, 0); assert.equal(info.querySelectorAll("img").length, 0);
  render(container, { projects: projects(), selectedId: 2, detail, panel: "budget", budgetRenderer: { render() {} } });
  assert.equal(container.querySelectorAll("[data-project-planning-info]").length, 0);
});

test("planning information loading and unavailable states retain existing graphs without invented totals", () => {
  const container = domFixture();
  for (const loading of [true, false]) {
    render(container, { projects: projects(), selectedId: 2, detail: { loading, error: loading ? "" : "Heures indisponibles" } });
    const info = container.querySelectorAll("[data-project-planning-info]")[0];
    assert.equal(info.getAttribute("data-planning-info-status"), loading ? "loading" : "unavailable");
    assert.equal(info.querySelectorAll("dd").length, 0); assert.equal(container.querySelectorAll("[data-comparison]").length, 3);
  }
});

test("macro information is a hover, focus and touch disclosure with Escape and outside cleanup", () => {
  const container = domFixture(), detail = monthlyDetail(); detail.planningInfo = planningInfoFixture();
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail });
  draw();
  let info = container.querySelectorAll("[data-project-planning-info]")[0];
  let button = info.querySelectorAll("[data-planning-info-control]")[0];
  let popup = info.querySelectorAll("[data-planning-info-popover]")[0];
  let anchor = button.parentElement;
  assert.equal(popup.hidden, true);
  assert.equal(button.getAttribute("aria-controls"), popup.id);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.ok(popup.contains(info.querySelectorAll('[data-planning-coverage="complete"]')[0]));
  assert.ok(popup.contains(info.querySelectorAll('[data-planning-details="to-hire"]')[0]));
  assert.equal(info.children.includes(popup), false, "Notes live beside the title's information control, rather than below the cards");
  anchor.dispatch("pointerenter"); assert.equal(popup.hidden, false);
  anchor.dispatch("pointerleave"); assert.equal(popup.hidden, true);
  const originalFocus = button.focus.bind(button);
  button.focus = () => { if (container.ownerDocument.activeElement !== button) originalFocus(); };
  button.focus(); assert.equal(popup.hidden, false);
  anchor.dispatch("keydown", { key: "Escape" });
  assert.equal(popup.hidden, true); assert.equal(container.ownerDocument.activeElement, button);
  container.ownerDocument.activeElement = null; button.focus();
  assert.equal(popup.hidden, false, "Escape on an already focused icon must not suppress the next genuine focus");
  anchor.dispatch("keydown", { key: "Escape" }); assert.equal(popup.hidden, true);
  button.dispatch("click"); assert.equal(popup.hidden, false);
  draw();
  button = container.querySelectorAll("[data-planning-info-control]")[0];
  popup = container.querySelectorAll("[data-planning-info-popover]")[0];
  assert.equal(popup.hidden, false); assert.equal(container.ownerDocument.activeElement, button);
  container.ownerDocument.dispatch("pointerdown", { target: container });
  assert.equal(popup.hidden, true); assert.equal(button.getAttribute("aria-expanded"), "false");
  button.dispatch("click"); assert.equal(popup.hidden, false);
  cleanup(container); assert.equal(container.ownerDocument.listeners.size, 0);
  button.dispatch("focus"); assert.equal(container.ownerDocument.listeners.size, 0, "Retired controls cannot reinstall outside handlers");
});

test("three compact usage cards immediately follow the four macro figures outside their information popover", () => {
  const container = domFixture(), detail = monthlyDetail(); detail.planningInfo = planningInfoFixture();
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail, years: [2027] });
  draw();
  const info = container.querySelectorAll("[data-project-planning-info]")[0];
  const metrics = info.querySelectorAll(".project-planning-info-metrics")[0];
  const comparisons = info.querySelectorAll(".project-planning-info-comparisons")[0];
  assert.equal(metrics.children.length, 4);
  assert.equal(info.children[info.children.indexOf(metrics) + 1], comparisons);
  let cards = comparisons.querySelectorAll("[data-planning-to-date-comparison]");
  assert.deepEqual(cards.map(card => card.getAttribute("data-planning-to-date-comparison")), ["personal", "planning", "convention"]);
  assert.deepEqual(cards.map(card => card.querySelectorAll("strong")[0].textContent),
    ["Mes heures · planning", "Total · planning", "Total · convention"]);
  assert.deepEqual(cards.map(card => card.querySelectorAll("span")[0].textContent),
    ["5 h de sous-consommation à ce jour.", "10 h de sous-consommation à ce jour.", "20 h de sous-consommation à ce jour."]);
  assert.ok(cards.every(card => !info.querySelectorAll("[data-planning-info-popover]")[0].contains(card)));
  assert.ok(cards.every(card => card.querySelectorAll(".project-planning-info-value").length === 0), "Usage cards contain a short sentence rather than another oversized metric");
  detail.planningInfo.planningToDateDifference = 10.125;
  detail.planningInfo.conventionToDateDifference = 0;
  draw(); cards = container.querySelectorAll("[data-planning-to-date-comparison]");
  assert.match(cards[1].textContent, /10,13 h de surconsommation/);
  assert.match(cards[2].textContent, /Consommation conforme à ce jour/);
  detail.planningInfo.plannedToDateStatus = "unavailable";
  detail.planningInfo.conventionToDateStatus = "unavailable";
  draw(); cards = container.querySelectorAll("[data-planning-to-date-comparison]");
  assert.equal(cards[0].getAttribute("data-planning-to-date-direction"), "under");
  assert.ok(cards.slice(1).every(card => /indisponible/.test(card.textContent)), "Unavailable total references do not hide an independently known personal result");
  cleanup(container);
});

test("only personal actual bars split at today's tick and the full plan, with a visible Surpointage callout", () => {
  const container = domFixture();
  const draw = (planned, actual, fraction) => render(container, { projects: projects(), selectedId: 2, years: [2026],
    detail: { personal: { planned, actual }, project: { planned, actual }, calendarFraction: fraction } });
  draw(100, 120, 0.5);
  let personal = container.querySelectorAll('[data-comparison="personal"]')[0];
  const segments = personal.querySelectorAll("[data-personal-actual-segment]");
  assert.deepEqual(segments.map(segment => segment.getAttribute("data-personal-actual-segment")), ["standard", "above-today", "above-plan"]);
  assert.deepEqual(segments.map(segment => Number(segment.getAttribute("data-personal-segment-width"))), [37.5, 37.5, 15]);
  assert.equal(segments.reduce((sum, segment) => sum + Number.parseFloat(segment.style.width), 0), 100);
  const bubble = personal.querySelectorAll("[data-personal-surpointage]")[0];
  assert.equal(bubble.textContent, "Surpointage"); assert.equal(bubble.parentElement.className, "project-hours-tracks");
  assert.match(personal.querySelectorAll(".project-hours-tracks")[0].getAttribute("aria-label"), /rouge.*orange/);
  assert.equal(container.querySelectorAll('[data-comparison="project"]')[0].querySelectorAll("[data-personal-actual-segment]").length, 0);
  assert.equal(container.querySelectorAll('[data-comparison="lifetime"]')[0].querySelectorAll("[data-personal-surpointage]").length, 0);
  for (const [actual, expected, warning] of [[25, ["standard"], false], [70, ["standard", "above-today"], true],
    [100, ["standard", "above-today"], true], [200, ["standard", "above-today", "above-plan"], true]]) {
    draw(100, actual, 0.5); personal = container.querySelectorAll('[data-comparison="personal"]')[0];
    assert.deepEqual(personal.querySelectorAll("[data-personal-actual-segment]").map(segment => segment.getAttribute("data-personal-actual-segment")), expected);
    assert.equal(personal.querySelectorAll("[data-personal-surpointage]").length, Number(warning));
  }
  draw(100, 120, null); personal = container.querySelectorAll('[data-comparison="personal"]')[0];
  assert.deepEqual(personal.querySelectorAll("[data-personal-actual-segment]").map(segment => segment.getAttribute("data-personal-actual-segment")), ["standard", "above-plan"], "Unknown today cannot fabricate an orange threshold");
  draw(0, 10, 0.5); personal = container.querySelectorAll('[data-comparison="personal"]')[0];
  assert.deepEqual(personal.querySelectorAll("[data-personal-actual-segment]").map(segment => segment.getAttribute("data-personal-actual-segment")), ["above-plan"]);
  for (const [planned, actual] of [[null, 10], [-10, 10], [100, -10]]) {
    draw(planned, actual, 0.5); personal = container.querySelectorAll('[data-comparison="personal"]')[0];
    assert.equal(personal.querySelectorAll("[data-personal-surpointage]").length, 0);
  }
});

function pairedMonthlyDetail() {
  const detail = employeePlanningDetail();
  Object.assign(detail.monthly, { planning: [3, 7, 2], planningStatus: "available", planningWarning: null });
  Object.assign(detail.monthly.employees[0], { scheduledPlanning: [2, 3, 1], scheduledPlanningStatus: "available" });
  Object.assign(detail.monthly.employees[1], { scheduledPlanning: [1, 4, 1], scheduledPlanningStatus: "available" });
  detail.plannedMonthly = { status: "available", kind: "planned", mode: "monthly", startDate: "2026-01-01", endDate: "2027-01-31", throughDate: "2027-01-31",
    months: [...detail.monthly.months, { key: "2027-01", label: "janvier 2027" }],
    employees: [{ id: "employee:1", name: "Alex Example", values: [2, 3, 1, 20], photoDataUrl: png },
      { id: "resource:201", name: "TH_DiCo", values: [0, 0, 0, 40], isToHire: true }],
    total: [2, 3, 1, 60], convention: null, warnings: [] };
  return detail;
}

function planningConventionDetail(mode = "monthly") {
  const detail = pairedMonthlyDetail();
  const summary = detail.plannedMonthly;
  Object.assign(summary, { mode, startDate: "2026-10-15", endDate: "2027-01-31", throughDate: "2027-01-31",
    months: [{ key: "2026-10" }, { key: "2026-11" }, { key: "2026-12" }, { key: "2027-01" }],
    total: [2, 3, -1, 60], convention: [170.1234567890123, 300, 310, 310], budgetStatus: "available" });
  summary.employees[0].values = [2, 3, -1, 20];
  if (mode === "cumulative") {
    const prefix = values => { let total = 0; return values.map(value => total += value); };
    summary.employees.forEach(employee => { employee.values = prefix(employee.values); });
    summary.total = prefix(summary.total); summary.convention = prefix(summary.convention);
  }
  detail.monthlyMode = mode;
  return detail;
}

test("planned convention geometry spans the lifetime axis without joining employee stacks or changing its values on resource selection", () => {
  for (const mode of ["monthly", "cumulative"]) {
    const summary = planningConventionDetail(mode).plannedMonthly, original = structuredClone(summary);
    for (const width of [280, 390, 1200]) for (const employeeId of [null, "employee:1", "resource:201", "unknown"]) {
      const geometry = monthlyGeometry(summary, width, employeeId);
      const convention = geometry.series.find(series => series.kind === "convention");
      assert.deepEqual(convention.values, summary.convention);
      assert.equal(convention.areas, undefined, "The project-wide reference must never be stacked into employee hours");
      assert.equal(convention.points.length, summary.months.length);
      assert.equal(convention.points[0].x, geometry.plot.left);
      assert.equal(convention.points.at(-1).x, geometry.plot.left + geometry.plot.width);
      assert.ok(convention.points.every(point => point.y >= geometry.plot.top && point.y <= geometry.plot.top + geometry.plot.height));
      assert.ok(geometry.max >= Math.max(...summary.convention), "A large convention remains inside the y-axis after selecting a small resource");
      assert.ok(!/NaN|Infinity| Z/.test(convention.path));
      const selected = summary.employees.find(employee => employee.id === employeeId);
      assert.equal(geometry.selectedEmployeeId, selected?.id || null);
      assert.deepEqual(geometry.series.find(series => series.kind === "total").values, selected ? selected.values : summary.total);
      assert.ok(geometry.series.filter(series => series.kind === "employee").every(series => series.areas.length > 0));
      if (mode === "monthly" && (!selected || selected.id === "employee:1")) assert.ok(geometry.min <= -1);
    }
    assert.deepEqual(summary, original);
  }
});

test("the planned convention stays dotted and project-wide in monthly and cumulative tooltips, tables and resource filters", () => {
  const i18n = require("../i18n"), container = domFixture();
  try {
    for (const mode of ["monthly", "cumulative"]) {
      const detail = planningConventionDetail(mode), original = structuredClone(detail), choices = [];
      const draw = () => render(container, { projects: projects(), selectedId: 2, years: [2026], detail,
        onPlannedMonthlyEmployeeChange(id) { choices.push(id); detail.plannedMonthlyEmployeeId = id; draw(); } });
      draw();
      const checkReference = (expectedEmployeeId = null) => {
        const planned = container.querySelectorAll('[data-monthly-kind="planned"]')[0];
        const path = planned.querySelectorAll('[data-monthly-series="convention"]')[0].querySelectorAll("path")[0];
        assert.equal(path.getAttribute("stroke-dasharray"), "2 6"); assert.equal(path.getAttribute("fill"), "none");
        assert.ok(planned.querySelectorAll("[data-monthly-area]").length > 0, "The convention cannot replace the employee area chart");
        assert.match(planned.querySelectorAll('[data-monthly-legend="convention"]')[0].textContent, /Convention.*prorata journalier/);
        assert.equal(planned.querySelectorAll('[data-planned-convention="available"]').length, 1);
        const table = planned.querySelectorAll("[data-monthly-table]")[0];
        const headers = table.querySelectorAll("thead")[0].querySelectorAll("th");
        assert.equal(headers.at(-1).textContent, mode === "cumulative" ? "Convention cumulée" : "Convention");
        const rows = table.querySelectorAll("tbody")[0].children;
        assert.equal(rows.length, 4); assert.match(rows.at(-1).textContent, /janvier 2027/);
        const exact = value => `${i18n.formatNumber(value, { maximumSignificantDigits: 17 })} h`;
        rows.forEach((row, index) => assert.equal(row.querySelectorAll("td").at(-1).textContent, exact(detail.plannedMonthly.convention[index])));
        planned.querySelectorAll('[data-monthly-month="2027-01"]')[0].focus();
        const conventionRow = planned.querySelectorAll('[data-monthly-value="convention"]')[0];
        assert.equal(conventionRow.querySelectorAll("strong")[0].textContent,
          `${i18n.formatNumber(detail.plannedMonthly.convention.at(-1), { maximumFractionDigits: 2 })} h`);
        if (expectedEmployeeId) {
          assert.equal(planned.getAttribute("data-monthly-selected-employee"), expectedEmployeeId);
          assert.equal(headers.length, 4, "A resource selection narrows employees, while retaining total and project convention columns");
        }
        return { planned, path: path.getAttribute("d") };
      };
      const allReference = checkReference();
      allReference.planned.querySelectorAll('[data-monthly-employee-choice="resource:201"]')[0].dispatch("click");
      const selectedReference = checkReference("resource:201");
      const selectedGeometry = monthlyGeometry(detail.plannedMonthly, 800, "resource:201");
      assert.equal(selectedReference.path, selectedGeometry.series.find(series => series.kind === "convention").path,
        "The unchanged project convention is reprojected within the selected resource's signed y-axis domain");
      assert.equal(container.querySelectorAll('[data-monthly-kind="actual"]')[0].getAttribute("data-monthly-selected-employee"), "");
      selectedReference.planned.querySelectorAll('[data-monthly-employee-reset]')[0].dispatch("click");
      assert.deepEqual(choices, ["resource:201", null]);
      checkReference();
      assert.deepEqual(detail.plannedMonthly, original.plannedMonthly);
      cleanup(container);
    }
  } finally { cleanup(container); }
});

test("planned charts disclose missing convention references without losing future planning or inventing a zero curve", () => {
  const container = domFixture();
  try {
    for (const budgetStatus of ["empty", "unavailable", undefined]) {
      const detail = planningConventionDetail(); detail.plannedMonthly.convention = null;
      if (budgetStatus === undefined) delete detail.plannedMonthly.budgetStatus;
      else detail.plannedMonthly.budgetStatus = budgetStatus;
      render(container, { projects: projects(), selectedId: 2, detail });
      const planned = container.querySelectorAll('[data-monthly-kind="planned"]')[0];
      assert.equal(planned.querySelectorAll(`[data-planned-convention="${budgetStatus === "empty" ? "empty" : "unavailable"}"]`).length, 1);
      assert.equal(planned.querySelectorAll('[data-monthly-series="convention"]').length, 0);
      assert.equal(planned.querySelectorAll('[data-monthly-legend="convention"]').length, 0);
      assert.ok(planned.querySelectorAll("[data-monthly-area]").length > 0);
      assert.equal(planned.querySelectorAll('[data-monthly-month="2027-01"]').length, 1);
      assert.ok(!planned.querySelectorAll("thead")[0].textContent.includes("Convention"));
    }
  } finally { cleanup(container); }
});

test("actual monthly planning is a solid red dated curve, distinct from dotted convention and personal extrapolation", () => {
  const container = domFixture(), detail = pairedMonthlyDetail();
  const original = structuredClone(detail);
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail });
  draw(); let actual = container.querySelectorAll('[data-monthly-kind="actual"]')[0];
  let red = actual.querySelectorAll('[data-monthly-series="planning"]')[0].querySelectorAll("path")[0];
  assert.equal(red.getAttribute("stroke"), "#cf3347"); assert.equal(red.getAttribute("stroke-dasharray"), "none");
  assert.equal(red.getAttribute("fill"), "none");
  assert.equal(actual.querySelectorAll('[data-monthly-series="convention"]')[0].querySelectorAll("path")[0].getAttribute("stroke-dasharray"), "2 6");
  actual.querySelectorAll('[data-monthly-month="2026-02"]')[0].focus();
  assert.match(actual.querySelectorAll("[data-monthly-tooltip]")[0].textContent, /Planning daté à ce jour7 h/);
  assert.match(actual.querySelectorAll("[data-monthly-table]")[0].textContent, /Planning daté à ce jour/);
  assert.deepEqual(detail, original);
  detail.monthlyEmployeeId = "employee:1"; draw(); actual = container.querySelectorAll('[data-monthly-kind="actual"]')[0];
  assert.deepEqual(actual.querySelectorAll("[data-monthly-series]").map(group => group.getAttribute("data-monthly-series")), ["employee-actual", "employee-planned", "planning"]);
  actual.querySelectorAll('[data-monthly-month="2026-02"]')[0].focus();
  assert.match(actual.querySelectorAll("[data-monthly-tooltip]")[0].textContent, /Planning daté à ce jour3 h/);
  detail.monthly.employees[0].scheduledPlanningStatus = "unavailable"; draw(); actual = container.querySelectorAll('[data-monthly-kind="actual"]')[0];
  assert.equal(actual.querySelectorAll('[data-monthly-series="planning"]').length, 0);
  assert.equal(actual.querySelectorAll("[data-monthly-dated-planning]")[0].getAttribute("data-monthly-dated-planning"), "unavailable");
  assert.equal(actual.querySelectorAll('[data-monthly-series="employee-planned"]').length, 1, "Unavailable dated slots do not erase an independently known linear reference");
});

test("the separate lifetime planning chart keeps future resources, stable colors, exact tables and independent filtering", () => {
  const container = domFixture(), detail = pairedMonthlyDetail(), choices = [];
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail, years: [2026],
    onPlannedMonthlyEmployeeChange(id) { choices.push(id); detail.plannedMonthlyEmployeeId = id; draw(); } });
  draw(); let actual = container.querySelectorAll('[data-monthly-kind="actual"]')[0], planned = container.querySelectorAll('[data-monthly-kind="planned"]')[0];
  assert.match(planned.querySelectorAll("h3")[0].textContent, /Projets · 03 \/ Planning mensuel/);
  assert.match(planned.querySelectorAll(".project-monthly-period")[0].textContent, /31\/01\/2027/);
  assert.equal(planned.querySelectorAll('[data-monthly-month="2027-01"]').length, 1);
  assert.equal(actual.querySelectorAll('[data-monthly-month="2027-01"]').length, 0);
  assert.equal(planned.querySelectorAll('[data-monthly-series="convention"]').length, 0);
  assert.equal(planned.querySelectorAll('[data-monthly-series="planning"]').length, 0);
  const actualColor = actual.querySelectorAll('[data-monthly-employee-id="employee:1"]')[0].querySelectorAll("path")[0].getAttribute("fill");
  const plannedColor = planned.querySelectorAll('[data-monthly-employee-id="employee:1"]')[0].querySelectorAll("path")[0].getAttribute("fill");
  assert.equal(plannedColor, actualColor);
  planned.querySelectorAll('[data-monthly-month="2027-01"]')[0].focus();
  assert.match(planned.querySelectorAll("[data-monthly-tooltip]")[0].textContent, /Total du projet planifié60 h.*Alex Example20 h.*TH_DiCo40 h/);
  const futureResource = planned.querySelectorAll('[data-monthly-employee-choice="resource:201"]')[0];
  futureResource.focus(); futureResource.dispatch("click");
  actual = container.querySelectorAll('[data-monthly-kind="actual"]')[0]; planned = container.querySelectorAll('[data-monthly-kind="planned"]')[0];
  assert.deepEqual(choices, ["resource:201"]);
  assert.equal(actual.getAttribute("data-monthly-selected-employee"), "");
  assert.equal(planned.getAttribute("data-monthly-selected-employee"), "resource:201");
  assert.ok(planned.querySelectorAll("[data-monthly-area]").length > 0, "An isolated planned employee remains area filled");
  assert.ok(planned.contains(container.ownerDocument.activeElement));
  assert.equal(planned.querySelectorAll('[data-monthly-series="employee"]')[0].getAttribute("data-monthly-employee-id"), "resource:201");
  const table = planned.querySelectorAll("[data-monthly-table]")[0];
  assert.match(table.textContent, /TH_DiCo/); assert.doesNotMatch(table.textContent, /Alex Example/);
  planned.querySelectorAll("[data-monthly-employee-reset]")[0].dispatch("click");
  assert.deepEqual(choices, ["resource:201", null]);
});

test("paired monthly charts scope focus, radio names, tooltips, exact-table state and reveal cleanup independently", () => {
  const container = domFixture(), detail = pairedMonthlyDetail(), observers = [];
  class Observer { constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } }
  container.ownerDocument.defaultView = { IntersectionObserver: Observer, ResizeObserver: Observer, matchMedia: () => ({ matches: false }) };
  const draw = () => render(container, { projects: [{ id: 29001, name: "Paired charts" }], selectedId: 29001, detail,
    onMonthlyModeChange(mode) { detail.monthlyMode = mode; detail.monthlyRevealKey = (detail.monthlyRevealKey || 0) + 1; draw(); } });
  draw();
  let actual = container.querySelectorAll('[data-monthly-kind="actual"]')[0], planned = container.querySelectorAll('[data-monthly-kind="planned"]')[0];
  assert.notEqual(actual.querySelectorAll("[data-monthly-tooltip]")[0].id, planned.querySelectorAll("[data-monthly-tooltip]")[0].id);
  assert.notEqual(actual.querySelectorAll("[data-monthly-mode-choice]")[0].name, planned.querySelectorAll("[data-monthly-mode-choice]")[0].name);
  assert.notEqual(actual.querySelectorAll("clipPath")[0].getAttribute("id"), planned.querySelectorAll("clipPath")[0].getAttribute("id"));
  actual.querySelectorAll(".project-monthly-details")[0].open = false;
  planned.querySelectorAll(".project-monthly-details")[0].open = true;
  planned.querySelectorAll("[data-monthly-table-toggle]")[0].focus(); draw();
  actual = container.querySelectorAll('[data-monthly-kind="actual"]')[0]; planned = container.querySelectorAll('[data-monthly-kind="planned"]')[0];
  assert.equal(actual.querySelectorAll(".project-monthly-details")[0].open, false);
  assert.equal(planned.querySelectorAll(".project-monthly-details")[0].open, true);
  assert.ok(planned.contains(container.ownerDocument.activeElement));
  planned.querySelectorAll('[data-monthly-month="2027-01"]')[0].focus(); draw();
  planned = container.querySelectorAll('[data-monthly-kind="planned"]')[0];
  assert.ok(planned.contains(container.ownerDocument.activeElement));
  const mode = planned.querySelectorAll('[data-monthly-mode-choice="cumulative"]')[0]; mode.focus(); mode.checked = true; mode.dispatch("change");
  actual = container.querySelectorAll('[data-monthly-kind="actual"]')[0]; planned = container.querySelectorAll('[data-monthly-kind="planned"]')[0];
  assert.equal(actual.getAttribute("data-monthly-mode"), "cumulative"); assert.equal(planned.getAttribute("data-monthly-mode"), "cumulative");
  assert.ok(planned.contains(container.ownerDocument.activeElement));
  assert.equal(actual.getAttribute("data-monthly-reveal"), "pending"); assert.equal(planned.getAttribute("data-monthly-reveal"), "pending");
  const currentObservers = observers.filter(observer => !observer.disconnected); assert.equal(currentObservers.length, 4);
  currentObservers[0].callback([{ isIntersecting: true }]);
  assert.equal(actual.getAttribute("data-monthly-reveal"), "running"); assert.equal(planned.getAttribute("data-monthly-reveal"), "pending");
  currentObservers[2].callback([{ isIntersecting: true }]);
  assert.equal(planned.getAttribute("data-monthly-reveal"), "running");
  cleanup(container); assert.ok(observers.every(observer => observer.disconnected)); assert.equal(container.ownerDocument.listeners.size, 0);
});

test("scoped headings stay distinct from individual lifetime planning labels, tooltips and table dates", () => {
  const container = domFixture(), detail = employeePlanningDetail();
  detail.monthlyEmployeeId = "employee:1";
  detail.monthly.endDate = "2028-05-31";
  const before = structuredClone(detail);
  const draw = scope => render(container, { projects: projects(), selectedId: 2, scope, years: [2026], detail });
  draw(new Set([2026]));
  assert.equal(container.querySelectorAll('[data-comparison="personal"]')[0].querySelectorAll("h3")[0].textContent, "Mes heures en 2026");
  assert.equal(container.querySelectorAll(".project-hours-period").length, 0);
  let history = container.querySelectorAll("[data-monthly-project]")[0];
  assert.equal(history.querySelectorAll("h3")[0].textContent, "Projets · 02 / Heures réalisées · jusqu’à aujourd’hui");
  assert.match(history.querySelectorAll(".project-monthly-period")[0].textContent, /01\/01\/2026.*05\/03\/2026/);
  assert.doesNotMatch(history.querySelectorAll(".project-monthly-period")[0].textContent, /31\/05\/2028/,
    "The clearer cutoff title retains the actual-through date rather than the future project end");
  assert.match(history.querySelectorAll("[data-monthly-employee-planning]")[0].textContent,
    /Planning total de Alex Example sur toute la durée du projet : 120 h/);
  const reference = history.querySelectorAll('[data-monthly-legend="planned:employee:1"]')[0];
  assert.match(reference.textContent, /Planning individuel · référence linéaire sur tout le projet/);
  assert.match(reference.title, /01\/01\/2026.*31\/05\/2028.*indépendamment de la période sélectionnée/);
  const table = history.querySelectorAll("[data-monthly-table]")[0];
  const planningColumn = table.querySelectorAll("thead")[0].querySelectorAll("th")[2];
  assert.match(planningColumn.textContent, /sur tout le projet/);
  assert.equal(planningColumn.title, reference.title);
  const values = table.querySelectorAll("tbody")[0].textContent;
  draw({ startDate: "2026-08-01", endDate: "2026-12-31" });
  assert.equal(container.querySelectorAll('[data-comparison="personal"]')[0].querySelectorAll("h3")[0].textContent,
    "Mes heures du 1er août 2026 au 31 décembre 2026");
  history = container.querySelectorAll("[data-monthly-project]")[0];
  assert.equal(history.querySelectorAll("[data-monthly-table]")[0].querySelectorAll("tbody")[0].textContent, values);
  assert.match(history.querySelectorAll("[data-monthly-chart]")[0].getAttribute("aria-label"), /indépendamment de la période sélectionnée/);
  assert.deepEqual(detail, before, "Scope wording cannot alter lifetime source totals or planning curves");
});

test("employee line geometry isolates exact IDs, signed values and personal planning without source mutation", () => {
  const detail = employeePlanningDetail(), data = detail.monthly;
  data.total = [9999, 9999, 9999]; data.convention = [9999, 9999, 9999];
  data.employees[1].values = [9999, 9999, 9999];
  const original = structuredClone(data), geometry = monthlyGeometry(data, 390, "employee:1");
  assert.equal(geometry.selectedEmployeeId, "employee:1");
  assert.deepEqual(geometry.series.map(series => series.kind), ["employee-actual", "employee-planned"]);
  assert.deepEqual(geometry.series[0].values, [10, -2, 5]);
  assert.deepEqual(geometry.series[1].values, data.employees[0].plannedReference);
  assert.ok(geometry.min <= -2 && geometry.max < 9999);
  assert.equal(geometry.hasNegative, true);
  assert.ok(geometry.series.every(series => !series.areas && !/NaN|Infinity| Z/.test(series.path)));
  const fallback = monthlyGeometry(data, 390, "employee:missing");
  assert.equal(fallback.selectedEmployeeId, null);
  assert.ok(fallback.series.some(series => series.kind === "total"));
  const one = monthlyGeometry({ months: [{ key: "2026-01" }], employees: [
    { id: "employee:zero", values: [0], plannedHours: 0, plannedStatus: "available", plannedReference: [0] }
  ] }, 280, "employee:zero");
  assert.equal(one.series.length, 2);
  assert.ok(one.series.every(series => /^M.+ L.+$/.test(series.path) && !/NaN|Infinity/.test(series.path)));
  assert.deepEqual(data, original);
});

test("employee name buttons isolate, switch and reset with exact identities, stable colors and retained focus", () => {
  const container = domFixture(), detail = employeePlanningDetail(), changes = [];
  detail.monthly.employees.forEach(employee => { employee.name = "Same employee name"; });
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail, onMonthlyEmployeeChange(id) {
    changes.push(id); detail.monthlyEmployeeId = id; detail.monthlyRevealKey = (detail.monthlyRevealKey || 0) + 1; draw();
  } });
  draw();
  let buttons = container.querySelectorAll("[data-monthly-employee-choice]");
  assert.deepEqual(buttons.map(button => button.type), ["button", "button"]);
  assert.deepEqual(buttons.map(button => button.getAttribute("aria-pressed")), ["false", "false"]);
  assert.match(buttons[0].textContent, /Same employee name \(ID employee:1\)/);
  const originalColor = buttons[0].querySelectorAll(".project-monthly-legend-line")[0].style.borderTopColor;
  buttons[0].focus(); buttons[0].dispatch("click");
  assert.deepEqual(changes, ["employee:1"]);
  let section = container.querySelectorAll("[data-monthly-project]")[0];
  assert.equal(section.getAttribute("data-monthly-selected-employee"), "employee:1");
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-monthly-employee-choice"), "employee:1");
  buttons = section.querySelectorAll("[data-monthly-employee-choice]");
  assert.deepEqual(buttons.map(button => button.getAttribute("aria-pressed")), ["true", "false"]);
  assert.ok(section.querySelectorAll(".is-selected")[0].contains(buttons[0]));
  assert.ok(section.querySelectorAll(".is-muted")[0].contains(buttons[1]));
  assert.equal(section.querySelectorAll("[data-monthly-area]").length, 0);
  assert.deepEqual(section.querySelectorAll("[data-monthly-series]").map(group => group.getAttribute("data-monthly-series")), ["employee-actual", "employee-planned"]);
  const actual = section.querySelectorAll('[data-monthly-employee-line="actual"]')[0];
  const planned = section.querySelectorAll('[data-monthly-employee-line="planned"]')[0];
  assert.equal(actual.getAttribute("stroke"), originalColor);
  assert.equal(planned.getAttribute("stroke"), originalColor);
  assert.equal(actual.getAttribute("fill"), "none");
  assert.equal(actual.getAttribute("stroke-dasharray"), "none");
  assert.equal(planned.getAttribute("stroke-dasharray"), "2 6");
  assert.match(section.querySelectorAll("[data-monthly-chart]")[0].getAttribute("aria-label"), /Same employee name.*réalisé et prévu en lignes/);
  assert.match(section.querySelectorAll("[data-monthly-corrections]")[0].textContent, /corrections négatives.*sous zéro/);
  section.querySelectorAll('[data-monthly-month="2026-02"]')[0].focus();
  const tooltip = section.querySelectorAll("[data-monthly-tooltip]")[0];
  assert.deepEqual(tooltip.querySelectorAll("[data-monthly-value]").map(value => value.getAttribute("data-monthly-value")), ["employee:1", "planned:employee:1", "planning"]);
  assert.match(tooltip.textContent, /Réalisé-2 h.*Planning individuel · référence linéaire sur tout le projet10 h/);
  assert.doesNotMatch(tooltip.textContent, /employee:2|Total du projet|Convention/);
  const table = section.querySelectorAll("[data-monthly-table]")[0];
  assert.equal(table.querySelectorAll("thead")[0].querySelectorAll("th").length, 4);
  assert.ok(table.textContent.includes("10,1234567890123 h"));
  assert.doesNotMatch(table.textContent, /employee:2|Total du projet|Convention/);
  buttons[1].focus(); buttons[1].dispatch("click");
  assert.deepEqual(changes, ["employee:1", "employee:2"]);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-monthly-employee-choice"), "employee:2");
  const reset = container.querySelectorAll("[data-monthly-employee-reset]")[0];
  assert.equal(reset.textContent, "Tous les employés");
  reset.focus(); reset.dispatch("click");
  assert.deepEqual(changes, ["employee:1", "employee:2", null]);
  assert.equal(container.querySelectorAll("[data-monthly-employee-reset]").length, 0);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-monthly-employee-choice"), "employee:1");
  assert.ok(container.querySelectorAll('[data-monthly-series="total"]').length > 0);
  buttons = container.querySelectorAll("[data-monthly-employee-choice]");
  buttons[1].focus(); buttons[1].dispatch("click");
  container.querySelectorAll('[data-monthly-employee-choice="employee:2"]')[0].dispatch("click");
  assert.equal(changes.at(-1), null, "Clicking the selected employee again restores the stack");
});

test("selected employee distinguishes available zero planning from unavailable projection and literal warnings", () => {
  const container = domFixture(), detail = employeePlanningDetail();
  detail.monthlyEmployeeId = "employee:2";
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail });
  draw();
  let section = container.querySelectorAll("[data-monthly-project]")[0];
  assert.equal(section.querySelectorAll("[data-monthly-employee-planning]")[0].getAttribute("data-monthly-employee-planning"), "available");
  assert.match(section.querySelectorAll("[data-monthly-employee-planning]")[0].textContent, /0 h.*aucune heure planifiée/);
  assert.equal(section.querySelectorAll('[data-monthly-employee-line="planned"]').length, 1);
  section.querySelectorAll('[data-monthly-month="2026-01"]')[0].focus();
  assert.match(section.querySelectorAll("[data-monthly-tooltip]")[0].textContent, /Planning individuel · référence linéaire sur tout le projet0 h/);
  Object.assign(detail.monthly.employees[1], { plannedStatus: "unavailable", plannedHours: null, plannedReference: null,
    plannedWarning: "<script>Planning source unavailable</script>" });
  draw(); section = container.querySelectorAll("[data-monthly-project]")[0];
  assert.equal(section.querySelectorAll('[data-monthly-employee-line="planned"]').length, 0);
  assert.equal(section.querySelectorAll("[data-monthly-employee-planning]")[0].getAttribute("data-monthly-employee-planning"), "unavailable");
  assert.equal(section.querySelectorAll("[data-monthly-planned-warning]")[0].textContent, "<script>Planning source unavailable</script>");
  assert.equal(section.querySelectorAll("script").length, 0);
  assert.match(section.querySelectorAll("[data-monthly-tooltip]")[0].textContent, /Planning individuel · référence linéaire sur tout le projetIndisponible/);
  assert.ok(section.querySelectorAll("tbody")[0].children.every(row => row.querySelectorAll("td")[1].textContent === "Indisponible"));
  detail.monthlyEmployeeId = "employee:missing"; draw();
  assert.equal(container.querySelectorAll("[data-monthly-employee-reset]").length, 0);
  assert.ok(container.querySelectorAll('[data-monthly-series="convention"]').length > 0, "Invalid selections fall back to the original project view");
});

test("selected employee cumulative values and planned reference stay isolated through mode and inclusion redraws", () => {
  const container = domFixture(), detail = employeePlanningDetail();
  detail.monthlyEmployeeId = "employee:1";
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail });
  draw();
  const button = container.querySelectorAll('[data-monthly-employee-choice="employee:1"]')[0]; button.focus();
  detail.monthlyMode = "cumulative"; detail.monthly.mode = "cumulative";
  detail.monthly.employees[0].values = [10, 8, 13];
  detail.monthly.employees[0].plannedReference = [10.1234567890123, 20.1234567890123, 22.1234567890123];
  draw();
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-monthly-employee-choice"), "employee:1");
  let section = container.querySelectorAll("[data-monthly-project]")[0];
  assert.match(section.querySelectorAll("[data-monthly-chart]")[0].getAttribute("aria-label"), /Évolution cumulée.*Alex Example/);
  const cells = section.querySelectorAll("tbody")[0].children[2].querySelectorAll("td");
  assert.equal(cells[0].textContent, "13 h");
  assert.equal(cells[1].textContent, "22,1234567890123 h");
  section.querySelectorAll('[data-monthly-month="2026-03"]')[0].focus();
  assert.match(section.querySelectorAll("[data-monthly-tooltip]")[0].textContent, /Réalisé cumulé13 h.*Planning individuel · référence linéaire cumulée sur tout le projet22,12 h/);
  const toggle = section.querySelectorAll("[data-monthly-include-ormitters]")[0]; toggle.focus();
  detail.includeOrmitters = true; draw();
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-monthly-include-ormitters"), "");
  assert.equal(container.querySelectorAll("[data-monthly-selected-employee]")[0].getAttribute("data-monthly-selected-employee"), "employee:1");
  assert.equal(container.querySelectorAll('[data-monthly-series="total"]').length, 0);
});

test("employee isolation switches and reset replay one shared line reveal while unchanged redraws stay complete", () => {
  const container = domFixture(), detail = employeePlanningDetail(), observers = [];
  let reduced = false;
  container.ownerDocument.defaultView = { matchMedia: () => ({ matches: reduced }), IntersectionObserver: class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() {}
  } };
  const draw = () => render(container, { projects: [{ id: 19011, name: "Employee reveal fixture" }], selectedId: 19011, detail });
  const reveal = () => {
    const section = container.querySelectorAll("[data-monthly-project]")[0];
    assert.equal(section.getAttribute("data-monthly-reveal"), "pending");
    observers.at(-1).callback([{ isIntersecting: true }]);
    assert.equal(section.getAttribute("data-monthly-reveal"), "running");
    section.querySelectorAll(".project-monthly-reveal-window")[0].dispatch("animationend");
    assert.equal(section.getAttribute("data-monthly-reveal"), "complete");
  };
  draw(); reveal();
  for (const [revision, id] of [[1, "employee:1"], [2, "employee:2"], [3, null]]) {
    detail.monthlyEmployeeId = id; detail.monthlyRevealKey = revision; draw(); reveal();
    const count = observers.length; draw();
    assert.equal(observers.length, count, "The same filter revision must not replay");
    assert.equal(container.querySelectorAll("[data-monthly-project]")[0].getAttribute("data-monthly-reveal"), "complete");
  }
  reduced = true; detail.monthlyEmployeeId = "employee:1"; detail.monthlyRevealKey = 4; draw();
  assert.equal(observers.length, 4);
  assert.equal(container.querySelectorAll("[data-monthly-project]")[0].getAttribute("data-monthly-reveal"), "complete");
});

test("wide monthly geometry expands its display width with bounded opt-in while standard geometry and source series stay intact", () => {
  const summary = monthlySummary(), original = structuredClone(summary);
  const normal = monthlyGeometry(summary, 2400);
  assert.equal(normal.width, 1200);
  for (const requested of [2400, 4096, 8000]) {
    const wide = monthlyGeometry(summary, requested, null, null, null, 4096);
    assert.equal(wide.width, Math.min(requested, 4096));
    assert.equal(wide.plot.height, normal.plot.height, "Extra width must not enlarge the plot or its text vertically");
    assert.deepEqual(wide.positive, normal.positive); assert.deepEqual(wide.negative, normal.negative);
    assert.equal(wide.min, normal.min); assert.equal(wide.max, normal.max);
    assert.deepEqual(wide.series.map(({ key, id, kind, values }) => ({ key, id, kind, values })),
      normal.series.map(({ key, id, kind, values }) => ({ key, id, kind, values })));
    assert.deepEqual(wide.ticks.map(tick => [tick.value, tick.y]), normal.ticks.map(tick => [tick.value, tick.y]));
    wide.x.forEach((x, index) => assert.ok(Math.abs((x - wide.plot.left) / wide.plot.width -
      (normal.x[index] - normal.plot.left) / normal.plot.width) < 1e-12));
    for (const series of wide.series) {
      if (series.path) assert.doesNotMatch(series.path, /NaN|Infinity/);
      for (const area of series.areas || []) assert.doesNotMatch(area.path, /NaN|Infinity/);
    }
  }
  for (const invalid of [NaN, Infinity, "invalid", {}]) {
    assert.equal(monthlyGeometry(summary, 2400, null, null, null, invalid).width, 1200);
  }
  assert.equal(monthlyGeometry(summary, 2400, null, null, null, 100).width, 280);
  assert.deepEqual(summary, original);
});

test("monthly resize uses wide geometry only for the exact mounted Hours project and retains focused month", () => {
  const container = domFixture(), resizes = [];
  Object.getPrototypeOf(container).closest = function (selector) {
    const match = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
    for (let node = this; node; node = node.parentElement) if (match && node.getAttribute(match[1]) !== null &&
      (match[2] === undefined || node.getAttribute(match[1]) === match[2])) return node;
    return null;
  };
  container.setAttribute("data-project-hours-superwide", "true");
  container.ownerDocument.defaultView = { matchMedia: () => ({ matches: true }), ResizeObserver: class {
    constructor(callback) { this.callback = callback; this.disconnected = false; resizes.push(this); }
    observe(target) { this.target = target; } disconnect() { this.disconnected = true; }
  } };
  try {
    render(container, { projects: projects(), selectedId: 2, detail: monthlyDetail() });
    const section = container.querySelectorAll('[data-monthly-kind="actual"]')[0];
    const chart = section.querySelectorAll("[data-monthly-chart]")[0];
    assert.equal(resizes[0].target, section.querySelectorAll(".project-monthly-chart-wrap")[0]);
    section.querySelectorAll('[data-monthly-month="2026-02"]')[0].focus();
    const resize = width => resizes[0].callback([{ contentRect: { width } }]);
    resize(2400); assert.equal(chart.getAttribute("viewBox"), "0 0 2400 340");
    assert.equal(container.ownerDocument.activeElement.getAttribute("data-monthly-month"), "2026-02");
    container.setAttribute("data-project-hours-superwide", "false");
    resize(2400); assert.equal(chart.getAttribute("viewBox"), "0 0 1200 340");
    container.setAttribute("data-project-hours-superwide", "true");
    resize(2400); assert.equal(chart.getAttribute("viewBox"), "0 0 2400 340");
    const layout = container.querySelectorAll("[data-project-hours-project]")[0];
    layout.setAttribute("data-project-hours-project", "999");
    resize(2400); assert.equal(chart.getAttribute("viewBox"), "0 0 1200 340");
    layout.setAttribute("data-project-hours-project", "2");
    resize(8000); assert.equal(chart.getAttribute("viewBox"), "0 0 4096 340");
    container.querySelectorAll("[data-project-panel]")[0].setAttribute("data-project-panel", "budget");
    resize(2400); assert.equal(chart.getAttribute("viewBox"), "0 0 1200 340");
  } finally { cleanup(container); }
  assert.ok(resizes.every(observer => observer.disconnected));
});

test("monthly ResizeObserver batches only the latest width outside delivery and cancels retired frames without losing interaction state", () => {
  const container = domFixture(), resizes = [], frames = new Map(), cancelled = [];
  Object.getPrototypeOf(container).closest = function (selector) {
    const match = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
    for (let node = this; node; node = node.parentElement) if (match && node.getAttribute(match[1]) !== null &&
      (match[2] === undefined || node.getAttribute(match[1]) === match[2])) return node;
    return null;
  };
  let nextFrame = 0;
  container.setAttribute("data-project-hours-superwide", "true");
  container.ownerDocument.defaultView = { matchMedia: () => ({ matches: true }),
    requestAnimationFrame(callback) { const key = nextFrame++; frames.set(key, callback); return key; },
    cancelAnimationFrame(key) { cancelled.push(key); frames.delete(key); },
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; this.disconnected = false; resizes.push(this); }
      observe(target) { this.target = target; } disconnect() { this.disconnected = true; }
    } };
  const detail = employeePlanningDetail(); detail.monthlyEmployeeId = "employee:1";
  const original = structuredClone(detail), draw = () => render(container, { projects: projects(), selectedId: 2, detail });
  try {
    draw();
    const section = container.querySelectorAll('[data-monthly-kind="actual"]')[0];
    const svg = section.querySelectorAll("[data-monthly-chart]")[0];
    const table = section.querySelectorAll(".project-monthly-details")[0]; table.open = true;
    section.querySelectorAll('[data-monthly-month="2026-02"]')[0].focus();
    const initialBox = svg.getAttribute("viewBox"), replace = svg.replaceChildren.bind(svg);
    let writes = 0;
    svg.replaceChildren = (...children) => { writes++; return replace(...children); };
    const resize = width => resizes[0].callback([{ contentRect: { width } }]);
    const flush = () => {
      assert.equal(frames.size, 1); const [key, callback] = frames.entries().next().value;
      frames.delete(key); callback(16);
    };
    resize(1087); resize(1800); resize(2443);
    assert.equal(frames.size, 1, "Several notifications share one pending frame, including handle zero");
    assert.equal(writes, 0); assert.equal(svg.getAttribute("viewBox"), initialBox,
      "Observer delivery must not replace SVG children or its viewBox synchronously");
    flush(); assert.equal(writes, 1); assert.equal(svg.getAttribute("viewBox"), "0 0 2443 340");
    assert.equal(table.open, true); assert.equal(section.getAttribute("data-monthly-selected-employee"), "employee:1");
    assert.equal(container.ownerDocument.activeElement.getAttribute("data-monthly-month"), "2026-02");
    assert.equal(section.getAttribute("data-monthly-reveal"), "complete");
    resize(2443); resize(2443.5); assert.equal(frames.size, 0, "Height-only and subpixel callbacks cannot start a redraw loop");
    resize(1087); resize(2443); flush(); assert.equal(writes, 1, "A reverted width cancels the need for a pending redraw");
    container.setAttribute("data-project-hours-superwide", "false");
    resize(2443); container.setAttribute("data-project-hours-superwide", "true");
    flush(); assert.equal(writes, 1, "The frame rechecks the current effective layout cap");
    container.setAttribute("data-project-hours-superwide", "false");
    resize(1087); assert.equal(writes, 1); flush();
    assert.equal(writes, 2); assert.equal(svg.getAttribute("viewBox"), "0 0 1087 340");
    container.setAttribute("data-project-hours-superwide", "true");
    resize(2443); assert.equal(writes, 2); flush();
    assert.equal(writes, 3); assert.equal(svg.getAttribute("viewBox"), "0 0 2443 340");
    resize(2000); const [retiredKey, retiredCallback] = frames.entries().next().value;
    draw(); assert.ok(cancelled.includes(retiredKey)); assert.equal(frames.size, 0);
    assert.equal(resizes[0].disconnected, true);
    retiredCallback(32); resize(1900); assert.equal(writes, 3); assert.equal(frames.size, 0,
      "Retired observer and frame callbacks cannot modify the detached chart");
    const current = container.querySelectorAll('[data-monthly-kind="actual"]')[0];
    assert.equal(current.querySelectorAll(".project-monthly-details")[0].open, true);
    assert.equal(current.getAttribute("data-monthly-selected-employee"), "employee:1");
    resizes[1].callback([{ contentRect: { width: 2100 } }]);
    const [lastKey, lastCallback] = frames.entries().next().value;
    const currentBox = current.querySelectorAll("[data-monthly-chart]")[0].getAttribute("viewBox");
    cleanup(container); assert.ok(cancelled.includes(lastKey)); assert.equal(frames.size, 0);
    lastCallback(48); assert.equal(current.querySelectorAll("[data-monthly-chart]")[0].getAttribute("viewBox"), currentBox);
    assert.deepEqual(detail, original);
  } finally { cleanup(container); }
  assert.ok(resizes.every(observer => observer.disconnected));
});

test("monthly geometry keeps signed values, a shared zero axis and finite one-month or empty paths", () => {
  const data = monthlySummary();
  const before = structuredClone(data);
  const geometry = monthlyGeometry(data, 390);
  assert.ok(geometry.min <= -2 && geometry.max >= 10);
  assert.ok(geometry.ticks.some(tick => tick.value === 0));
  assert.deepEqual(geometry.series.map(series => series.kind), ["employee", "employee", "convention", "total"]);
  const employee = geometry.series.find(series => series.id === "employee:1");
  const zero = geometry.ticks.find(tick => tick.value === 0).y;
  assert.ok(employee.points[0].y < zero && employee.points[1].y > zero);
  assert.equal(employee.points[1].value, -2);
  assert.equal(geometry.series.find(series => series.kind === "convention").points[0].value, data.convention[0]);
  for (const series of geometry.series) {
    assert.ok(!/NaN|Infinity/.test(series.path));
    assert.ok(series.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
  }
  const one = monthlyGeometry({ months: [data.months[0]], employees: [], total: [0], convention: null }, 280);
  assert.ok(one.max > one.min);
  assert.equal(one.x[0], one.plot.left + one.plot.width / 2);
  assert.equal(one.series[0].points[0].value, 0);
  assert.ok(!/NaN|Infinity/.test(one.series[0].path));
  const empty = monthlyGeometry({ months: [], employees: [], total: [] });
  assert.deepEqual(empty.x, []);
  assert.equal(empty.series[0].path, "");
  const many = monthlyGeometry({ months: Array.from({ length: 60 }, (_, index) => ({ key: String(index) })), total: [] }, 390);
  assert.ok(many.monthIndices.length < 10);
  assert.equal(many.monthIndices[0], 0);
  assert.equal(many.monthIndices.at(-1), 59);
  assert.deepEqual(data, before);
});

test("monthly areas stack positive hours and signed corrections within the shared domain", () => {
  const data = { months: [{ key: "2026-01" }, { key: "2026-02" }], convention: [8, 8], total: [9, -2], employees: [
    { id: "employee:1", values: [12, -5] }, { id: "employee:2", values: [9, -4] }, { id: "employee:3", values: [-12, 7] }
  ] };
  const original = structuredClone(data), geometry = monthlyGeometry(data);
  assert.deepEqual(geometry.positive, [21, 7]);
  assert.deepEqual(geometry.negative, [-12, -9]);
  assert.ok(geometry.max >= 21 && geometry.min <= -12, "Stack extents, rather than individual/net values, define the domain");
  assert.equal(geometry.hasNegative, true);
  const second = geometry.series.find(series => series.id === "employee:2");
  assert.deepEqual(second.areas.find(area => area.sign === "positive").lower, [12, 0]);
  assert.deepEqual(second.areas.find(area => area.sign === "positive").upper, [21, 0]);
  assert.deepEqual(second.areas.find(area => area.sign === "negative").lower, [0, -5]);
  assert.deepEqual(second.areas.find(area => area.sign === "negative").upper, [0, -9]);
  for (const series of geometry.series.filter(series => series.kind === "employee")) for (const area of series.areas) {
    assert.match(area.path, /^M.+ Z$/);
    assert.doesNotMatch(area.path, /NaN|Infinity/);
  }
  for (let index = 0; index < data.months.length; index++) {
    assert.equal(geometry.positive[index] + geometry.negative[index], data.total[index]);
  }
  const one = monthlyGeometry({ months: [data.months[0]], total: [3], employees: [
    { id: "employee:1", values: [5] }, { id: "employee:2", values: [-2] }
  ] }, 280);
  for (const series of one.series.filter(series => series.kind === "employee")) {
    const path = series.areas[0].path;
    assert.ok(path.includes(`${one.plot.left.toFixed(3)},`) && path.includes(`${(one.plot.left + one.plot.width).toFixed(3)},`),
      "A single-month area has visible width");
    assert.doesNotMatch(path, /NaN|Infinity/);
  }
  assert.match(one.series.find(series => series.kind === "total").path, /^M.+ L.+$/, "A single-month net total remains a visible line above its area");
  assert.deepEqual(data, original);
});

test("monthly chart actors use the twenty requested colors in order, loop across multiple cycles and retain existing bar colors", () => {
  ChartPalette.set("classic");
  const browser = freshBrowser(), container = domFixture();
  const palette = ["#f7909f", "#e2647f", "#d1698c", "#e8555f", "#da332a", "#fe672a", "#ff7a34", "#ffb22c", "#83ba69", "#4ca64e",
    "#2a897e", "#287f91", "#62b0dc", "#6492cb", "#4975c4", "#3b4f93", "#32436f", "#5f5395", "#6f4483", "#5a3340"];
  const barPalette = ["#008bab", "#1c9c8c", "#6368ae", "#cd8747", "#b65c7b", "#488c62", "#5b88b4", "#8865a5", "#bc7057", "#86933f", "#448d8d", "#637d94"];
  const actors = Array.from({ length: 61 }, (_, index) => ({ id: `palette:${index}`, name: `Actor ${String(index < 2 ? 0 : index).padStart(2, "0")}`,
    values: [1, 2, 3], actual: 6, photoDataUrl: null }));
  const detail = rows => ({ personal: { planned: 0, actual: 0 }, project: { planned: 200, actual: 6 * rows.length, employees: rows },
    monthly: { ...monthlySummary(), employees: rows, total: [rows.length, 2 * rows.length, 3 * rows.length] },
    plannedMonthly: { ...monthlySummary(), kind: "planned", employees: rows, total: [rows.length, 2 * rows.length, 3 * rows.length] } });
  const barColors = () => new Map(container.querySelectorAll('[data-comparison="project"]')[0].querySelectorAll('[data-employee-kind="segment"]')
    .map(segment => [segment.getAttribute("data-employee-id"), segment.style.backgroundColor]));
  const chartColors = section => new Map(section.querySelectorAll('[data-monthly-series="employee"]')
    .map(series => [series.getAttribute("data-monthly-employee-id"), series.querySelectorAll("path")[0].getAttribute("fill")]));
  try {
    const twenty = detail(actors.slice(0, 20));
    browser.render(container, { projects: projects(), selectedId: 2, detail: { project: twenty.project } });
    const originalBars = barColors();
    assert.ok(barPalette.every(color => [...originalBars.values()].includes(color)), "The original twelve bar palette values remain in use");
    browser.render(container, { projects: projects(), selectedId: 2, detail: twenty });
    const colors = chartColors(container.querySelectorAll('[data-monthly-kind="actual"]')[0]);
    assert.equal(new Set(colors.values()).size, 20);
    assert.deepEqual([...colors.values()], palette, "The first twenty chart identities use the exact listed palette in order");
    assert.deepEqual(barColors(), originalBars);
    const expanded = detail(actors), source = structuredClone(expanded);
    browser.render(container, { projects: projects(), selectedId: 2, detail: expanded });
    const actual = container.querySelectorAll('[data-monthly-kind="actual"]')[0];
    const allColors = chartColors(actual);
    assert.equal(allColors.size, 61); assert.equal(new Set(allColors.values()).size, 20);
    for (const [id, color] of colors) assert.equal(allColors.get(id), color);
    actors.forEach((actor, index) => assert.equal(allColors.get(actor.id), palette[index % palette.length],
      `Chart identity ${index + 1} uses the requested repeated palette slot`));
    for (const section of container.querySelectorAll("[data-monthly-kind]")) {
      assert.deepEqual(chartColors(section), allColors, "An exact actor uses the same color in actual and planned areas");
      for (const [id, color] of allColors) {
        const legend = section.querySelectorAll(`[data-monthly-legend="${id}"]`)[0];
        assert.equal(legend.querySelectorAll(".project-monthly-legend-line")[0].style.backgroundColor, color);
        assert.equal(legend.querySelectorAll(".project-hours-employee-avatar")[0].style.borderColor, color);
      }
    }
    const filtered = detail([actors[60], actors[40], actors[20], actors[1]]);
    browser.render(container, { projects: projects(), selectedId: 2, detail: filtered });
    for (const section of container.querySelectorAll("[data-monthly-kind]")) {
      for (const [id, color] of chartColors(section)) assert.equal(color, allColors.get(id),
        "Removing and reordering actors retains exact-ID assignments across palette cycles");
    }
    browser.render(container, { projects: projects(), selectedId: 2, detail: expanded });
    for (const section of container.querySelectorAll("[data-monthly-kind]")) assert.deepEqual(chartColors(section), allColors);
    for (const [id, color] of originalBars) assert.equal(barColors().get(id), color);
    assert.deepEqual(expanded, source);
  } finally { browser.cleanup(container); ChartPalette.set("dico-vibes"); }
});

test("Dico vibes is the default monthly palette and repeats its exact fifteen colors across paired charts and actor filters", () => {
  assert.equal(ChartPalette.current(), "dico-vibes");
  const browser = freshBrowser(), container = domFixture();
  const palette = ["#F89700", "#CAC800", "#4DD000", "#00EF75", "#00E0BF", "#00E7FF", "#00C2FF", "#00B8FF",
    "#9289FF", "#E480FF", "#FF55FF", "#FF53D3", "#FF3272", "#FF5E00", "#FF7000"];
  const actors = Array.from({ length: 46 }, (_, index) => ({ id: `dico:${index}`, name: `Actor ${index}`,
    values: [1, 2, 3], actual: 6, photoDataUrl: null }));
  const makeDetail = rows => ({ monthly: { ...monthlySummary(), employees: rows, total: [rows.length, rows.length * 2, rows.length * 3] },
    plannedMonthly: { ...monthlySummary(), kind: "planned", employees: rows, total: [rows.length, rows.length * 2, rows.length * 3] } });
  const detail = makeDetail(actors), original = structuredClone(detail);
  const draw = value => browser.render(container, { projects: projects(), selectedId: 2, detail: value });
  const colorFor = (section, id) => section.querySelectorAll(`[data-monthly-employee-id="${id}"]`)[0]
    .querySelectorAll("path")[0].getAttribute("fill");
  try {
    draw(detail);
    for (const section of container.querySelectorAll("[data-monthly-kind]")) {
      actors.forEach((actor, index) => assert.equal(colorFor(section, actor.id), palette[index % palette.length]));
      section.querySelectorAll('[data-monthly-month="2026-02"]')[0].focus();
      actors.forEach((actor, index) => {
        const color = palette[index % palette.length];
        const legend = section.querySelectorAll(`[data-monthly-legend="${actor.id}"]`)[0];
        assert.equal(legend.querySelectorAll(".project-monthly-legend-line")[0].style.backgroundColor, color);
        assert.equal(legend.querySelectorAll(".project-hours-employee-avatar")[0].style.borderColor, color);
        assert.equal(section.querySelectorAll(`[data-monthly-value="${actor.id}"]`)[0]
          .querySelectorAll(".project-monthly-value-dot")[0].style.backgroundColor, color);
      });
    }
    draw(makeDetail([actors[45], actors[30], actors[15], actors[1]]));
    for (const section of container.querySelectorAll("[data-monthly-kind]")) {
      for (const index of [45, 30, 15, 1]) assert.equal(colorFor(section, actors[index].id), palette[index % palette.length],
        "Reordering or filtering cannot reassign an actor's palette slot");
    }
    assert.deepEqual(detail, original);
  } finally { browser.cleanup(container); ChartPalette.set("dico-vibes"); }
});

test("monthly palette changes recolor mounted areas, isolated lines and open tooltips without replacing interaction or geometry", () => {
  const allNodes = host => [host, ...host.children.flatMap(allNodes)];
  const I18n = require("../i18n");
  for (const language of ["fr", "nl"]) for (const selected of [false, true]) {
    ChartPalette.set("dico-vibes"); I18n.setLanguage(language);
    const browser = freshBrowser(), container = domFixture(), observers = [], calls = [];
    container.ownerDocument.defaultView = { matchMedia: () => ({ matches: false }), IntersectionObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {} disconnect() {}
    } };
    const detail = pairedMonthlyDetail();
    detail.monthlyMode = "cumulative";
    detail.monthlyRevealKey = 318;
    detail.milestones = { available: true, milestones: [{ id: 7, date: "2026-02-05", name: "Review milestone" }] };
    if (selected) detail.monthlyEmployeeId = "employee:1";
    const original = structuredClone(detail);
    const draw = () => browser.render(container, { projects: projects(), selectedId: 2, detail,
      onMonthlyModeChange: value => calls.push(value), onMonthlyEmployeeChange: value => calls.push(value),
      onPlannedMonthlyEmployeeChange: value => calls.push(value), onIncludeOrmittersChange: value => calls.push(value) });
    try {
      draw(); observers.forEach(observer => observer.callback([{ isIntersecting: true }]));
      const sections = container.querySelectorAll("[data-monthly-kind]");
      for (const section of sections) {
        section.querySelectorAll(".project-monthly-details")[0].open = true;
        section.querySelectorAll("[data-monthly-milestones]")[0].open = true;
        const month = section.querySelectorAll('[data-monthly-month="2026-02"]')[0];
        month.focus(); month.dispatch("click");
      }
      const actual = sections[0], planned = sections[1];
      const tooltip = planned.querySelectorAll("[data-monthly-tooltip]")[0]; tooltip.focus();
      const focused = container.ownerDocument.activeElement;
      const nodes = allNodes(container);
      const paths = nodes.filter(node => node.tagName === "path");
      const geometry = paths.map(node => node.getAttribute("d"));
      const initialFills = paths.map(node => [node.getAttribute("fill"), node.getAttribute("stroke")]);
      const viewBoxes = sections.map(section => section.querySelectorAll("[data-monthly-chart]")[0].getAttribute("viewBox"));
      const tableValues = sections.map(section => section.querySelectorAll("[data-monthly-table]")[0].textContent);
      const revealStates = sections.map(section => section.getAttribute("data-monthly-reveal"));
      const nonChartBars = container.querySelectorAll('[data-employee-kind="segment"]').map(node => [node, node.style.backgroundColor]);
      const fullText = container.textContent;
      const checkPreserved = () => {
        assert.deepEqual(allNodes(container), nodes, "A palette change updates the mounted nodes in place, including tooltip contents");
        assert.deepEqual(paths.map(node => node.getAttribute("d")), geometry);
        assert.deepEqual(sections.map(section => section.querySelectorAll("[data-monthly-chart]")[0].getAttribute("viewBox")), viewBoxes);
        assert.deepEqual(sections.map(section => section.querySelectorAll("[data-monthly-table]")[0].textContent), tableValues);
        assert.deepEqual(sections.map(section => section.getAttribute("data-monthly-reveal")), revealStates,
          "Changing colours must not replay an existing chart reveal");
        assert.equal(container.ownerDocument.activeElement, focused);
        assert.equal(container.textContent, fullText);
        for (const section of sections) {
          assert.equal(section.querySelectorAll(".project-monthly-details")[0].open, true);
          assert.equal(section.querySelectorAll("[data-monthly-milestones]")[0].open, true);
          assert.equal(section.querySelectorAll("[data-monthly-tooltip]")[0].hidden, false);
          assert.equal(section.querySelectorAll("[data-monthly-tooltip]")[0].getAttribute("data-monthly-pinned"), "true");
          for (const [kind, color] of [["total", "#183b53"], ["convention", "#8496a2"], ["planning", "#cf3347"]]) {
            const group = section.querySelectorAll(`[data-monthly-series="${kind}"]`)[0];
            if (group) assert.equal(group.querySelectorAll("path")[0].getAttribute("stroke"), color);
          }
          for (const marker of section.querySelectorAll("[data-monthly-milestone]")) assert.equal(marker.getAttribute("stroke"), "#000");
        }
        for (const [node, color] of nonChartBars) assert.equal(node.style.backgroundColor, color);
        assert.equal(actual.getAttribute("data-monthly-selected-employee"), selected ? "employee:1" : "");
        assert.equal(planned.getAttribute("data-monthly-selected-employee"), "");
        assert.deepEqual(calls, []); assert.deepEqual(detail, original);
      };
      const checkActorColor = color => {
        for (const section of sections) {
          const legend = section.querySelectorAll('[data-monthly-legend="employee:1"]')[0];
          assert.equal(legend.querySelectorAll(".project-monthly-legend-line")[0].style.borderTopColor, color);
          assert.equal(legend.querySelectorAll(".project-hours-employee-avatar")[0].style.borderColor, color);
          for (const group of section.querySelectorAll('[data-monthly-employee-id="employee:1"]')) {
            for (const path of group.querySelectorAll("path")) {
              assert.equal(path.getAttribute("stroke"), color);
              if (group.getAttribute("data-monthly-series") === "employee") assert.equal(path.getAttribute("fill"), color);
            }
          }
          assert.equal(section.querySelectorAll('[data-monthly-value="employee:1"]')[0]
            .querySelectorAll(".project-monthly-value-dot")[0].style.backgroundColor, color);
        }
        if (selected) {
          assert.equal(actual.querySelectorAll('[data-monthly-legend="planned:employee:1"]')[0]
            .querySelectorAll(".project-monthly-legend-line")[0].style.borderTopColor, color);
          assert.equal(actual.querySelectorAll('[data-monthly-value="planned:employee:1"]')[0]
            .querySelectorAll(".project-monthly-value-dot")[0].style.backgroundColor, color);
        }
      };
      checkActorColor("#F89700");
      assert.equal(ChartPalette.set("classic"), true); checkPreserved(); checkActorColor("#f7909f");
      assert.equal(ChartPalette.set("classic"), false); checkPreserved();
      assert.equal(ChartPalette.set("dico-vibes"), true); checkPreserved(); checkActorColor("#F89700");
      assert.deepEqual(paths.map(node => [node.getAttribute("fill"), node.getAttribute("stroke")]), initialFills,
        "Returning to the first palette restores each exact actor colour");
    } finally { browser.cleanup(container); I18n.setLanguage("fr"); ChartPalette.set("dico-vibes"); }
  }
});

test("monthly palette subscriptions are released on rerender, Budget navigation and explicit cleanup", () => {
  ChartPalette.set("dico-vibes");
  const subscriptions = new Set();
  const palette = { ...ChartPalette, subscribe(callback) {
    subscriptions.add(callback);
    const unsubscribe = ChartPalette.subscribe(callback);
    return () => { subscriptions.delete(callback); unsubscribe(); };
  } };
  const browser = freshBrowser(palette), container = domFixture(), detail = pairedMonthlyDetail();
  const draw = (panel = "hours") => browser.render(container, { projects: projects(), selectedId: 2, panel, detail });
  try {
    draw(); assert.equal(subscriptions.size, 2, "Each mounted monthly chart owns one palette subscription");
    const retired = container.querySelectorAll("[data-monthly-area]");
    const retiredColors = retired.map(path => path.getAttribute("fill"));
    draw(); assert.equal(subscriptions.size, 2, "Rerendering replaces rather than accumulates subscriptions");
    const live = container.querySelectorAll("[data-monthly-area]")[0];
    assert.equal(live.getAttribute("fill"), "#F89700");
    ChartPalette.set("classic");
    assert.equal(live.getAttribute("fill"), "#f7909f");
    assert.deepEqual(retired.map(path => path.getAttribute("fill")), retiredColors, "Retired charts cannot receive later palette updates");
    draw("budget"); assert.equal(subscriptions.size, 0);
    const previousColor = live.getAttribute("fill"); ChartPalette.set("dico-vibes");
    assert.equal(live.getAttribute("fill"), previousColor);
    draw(); assert.equal(subscriptions.size, 2);
    const disposed = container.querySelectorAll("[data-monthly-area]")[0];
    browser.cleanup(container); assert.equal(subscriptions.size, 0);
    browser.cleanup(container); assert.equal(subscriptions.size, 0, "Cleanup is idempotent");
    ChartPalette.set("classic"); assert.equal(disposed.getAttribute("fill"), "#F89700");
  } finally { browser.cleanup(container); ChartPalette.set("dico-vibes"); }
});

test("monthly actor colors survive selection, reference lines, filters, cumulative mode and language changes", () => {
  const container = domFixture(), I18n = require("../i18n"), detail = employeePlanningDetail();
  detail.plannedMonthly = pairedMonthlyDetail().plannedMonthly;
  const original = structuredClone(detail);
  const draw = options => render(container, { projects: projects(), selectedId: 2, detail: { ...detail, ...options } });
  const section = kind => container.querySelectorAll(`[data-monthly-kind="${kind}"]`)[0];
  const actorColor = (host, id) => host.querySelectorAll(`[data-monthly-legend="${id}"]`)[0]
    .querySelectorAll(".project-monthly-legend-line")[0].style.borderTopColor;
  try {
    draw(); const color = actorColor(section("actual"), "employee:1");
    assert.equal(actorColor(section("planned"), "employee:1"), color);
    for (const language of ["fr", "nl"]) for (const monthlyMode of ["monthly", "cumulative"]) {
      I18n.setLanguage(language);
      draw({ monthlyMode, monthlyEmployeeId: "employee:1", plannedMonthlyEmployeeId: "employee:1", includeOrmitters: true });
      const actual = section("actual"), planned = section("planned");
      assert.equal(actorColor(actual, "employee:1"), color); assert.equal(actorColor(actual, "planned:employee:1"), color);
      assert.equal(actorColor(planned, "employee:1"), color);
      for (const path of actual.querySelectorAll("[data-monthly-employee-line]")) assert.equal(path.getAttribute("stroke"), color);
      assert.equal(planned.querySelectorAll('[data-monthly-series="employee"]')[0].querySelectorAll("path")[0].getAttribute("fill"), color);
      actual.querySelectorAll('[data-monthly-month="2026-02"]')[0].focus();
      for (const id of ["employee:1", "planned:employee:1"]) assert.equal(actual.querySelectorAll(`[data-monthly-value="${id}"]`)[0]
        .querySelectorAll(".project-monthly-value-dot")[0].style.backgroundColor, color);
      draw({ monthlyMode, monthly: { ...detail.monthly, employees: detail.monthly.employees.slice(0, 1) } });
      assert.equal(actorColor(section("actual"), "employee:1"), color, "Removing another actor cannot reassign the retained actor");
    }
    draw();
    for (const [key, color] of [["total", "#183b53"], ["convention", "#8496a2"], ["planning", "#cf3347"]]) {
      const host = section("actual");
      if (host.querySelectorAll(`[data-monthly-series="${key}"]`).length) {
        assert.equal(host.querySelectorAll(`[data-monthly-series="${key}"]`)[0].querySelectorAll("path")[0].getAttribute("stroke"), color);
      }
    }
    assert.deepEqual(detail, original);
  } finally { cleanup(container); I18n.setLanguage("fr"); }
});

test("monthly stacked areas use their own matching legend, avatar and tooltip colors while retaining exact signed values", () => {
  const container = domFixture();
  const detail = monthlyDetail();
  detail.monthly.employees[1].name = '<script>Private employee</script>';
  detail.monthly.employees[1].photoDataUrl = "https://attacker.example/photo.png";
  render(container, { projects: projects(), selectedId: 2, detail });
  const section = container.querySelectorAll("[data-monthly-project]")[0];
  assert.match(section.textContent, /Projets · 02 \/ Heures réalisées · jusqu’à aujourd’hui/);
  assert.match(section.textContent, /hors période sélectionnée/);
  const lines = section.querySelectorAll("[data-monthly-lines]")[0];
  assert.ok(lines.getAttribute("clip-path").startsWith("url(#"));
  const series = lines.querySelectorAll("[data-monthly-series]");
  assert.equal(series.at(-1).getAttribute("data-monthly-series"), "total");
  assert.equal(series.at(-1).querySelectorAll("path")[0].getAttribute("stroke-width"), "3.5");
  const convention = series.find(group => group.getAttribute("data-monthly-series") === "convention");
  assert.equal(convention.querySelectorAll("path")[0].getAttribute("stroke-dasharray"), "2 6");
  assert.equal(convention.querySelectorAll("path")[0].getAttribute("fill"), "none");
  assert.equal(series.at(-2), convention, "The dotted reference stays above the stacked employee fills");
  const segments = container.querySelectorAll('[data-comparison="project"]')[0].querySelectorAll('[data-employee-kind="segment"]');
  const areaColors = new Map();
  for (const group of series.filter(group => group.getAttribute("data-monthly-series") === "employee")) {
    const id = group.getAttribute("data-monthly-employee-id");
    const color = group.querySelectorAll("path")[0].getAttribute("fill"); areaColors.set(id, color);
    assert.notEqual(color, segments.find(segment => segment.getAttribute("data-employee-id") === id).style.backgroundColor,
      "The new area palette does not replace the established bar palette");
    for (const path of group.querySelectorAll("path")) {
      assert.equal(path.getAttribute("fill"), color);
      assert.equal(path.getAttribute("stroke"), color);
      assert.match(path.getAttribute("d"), / Z$/);
    }
    const legend = section.querySelectorAll("[data-monthly-legend]").find(item => item.getAttribute("data-monthly-legend") === id);
    assert.equal(legend.querySelectorAll(".project-monthly-legend-line")[0].style.borderTopColor, color);
    assert.equal(legend.querySelectorAll(".project-hours-employee-avatar")[0].style.borderColor, color);
  }
  assert.ok(section.querySelectorAll("[data-monthly-y-tick]").some(tick => Number(tick.getAttribute("data-monthly-y-tick")) < 0));
  assert.match(section.querySelectorAll("[data-monthly-corrections]")[0].textContent, /sous zéro.*somme nette/);
  assert.equal(section.querySelectorAll(".is-zero").length, 1);
  const table = section.querySelectorAll("[data-monthly-table]")[0];
  assert.equal(table.tagName, "table");
  assert.equal(table.querySelectorAll("tbody")[0].children.length, 3);
  assert.ok(table.textContent.includes("-2 h"));
  assert.ok(table.textContent.includes("8,1234567890123 h"), "The table preserves source allowance precision");
  assert.ok(table.querySelectorAll("th").every(cell => ["col", "row"].includes(cell.getAttribute("scope"))));
  const target = section.querySelectorAll('[data-monthly-month="2026-02"]')[0];
  target.focus();
  const tooltip = section.querySelectorAll("[data-monthly-tooltip]")[0];
  assert.equal(tooltip.hidden, false);
  assert.ok(tooltip.textContent.includes("-2 h"));
  assert.ok(tooltip.textContent.includes('<script>Private employee</script>'));
  for (const [id, color] of areaColors) assert.equal(tooltip.querySelectorAll(`[data-monthly-value="${id}"]`)[0]
    .querySelectorAll(".project-monthly-value-dot")[0].style.backgroundColor, color);
  assert.equal(container.querySelectorAll("script").length, 0);
  assert.ok(container.querySelectorAll("img").every(image => image.src === png));
  target.dispatch("keydown", { key: "Escape" });
  assert.equal(tooltip.hidden, true);
});

test("monthly and cumulative native mode controls keep focus and match the selected values", () => {
  const container = domFixture(), changes = [];
  const detail = monthlyDetail();
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail, onMonthlyModeChange(mode) {
    changes.push(mode); detail.monthlyMode = mode; detail.monthlyRevealKey = (detail.monthlyRevealKey || 0) + 1;
    detail.monthly = monthlySummary(); detail.monthly.mode = mode;
    if (mode === "cumulative") {
      const prefix = values => { let sum = 0; return values.map(value => sum += value); };
      detail.monthly.employees.forEach(employee => { employee.values = prefix(employee.values); });
      detail.monthly.total = prefix(detail.monthly.total); detail.monthly.convention = prefix(detail.monthly.convention);
    }
    draw();
  } });
  draw();
  let choices = container.querySelectorAll("[data-monthly-mode-choice]");
  assert.deepEqual(choices.map(input => input.type), ["radio", "radio"]);
  assert.equal(choices[0].name, choices[1].name);
  assert.deepEqual(choices.map(input => input.checked), [true, false]);
  assert.equal(container.querySelectorAll(".project-monthly-mode-toggle")[0].tagName, "fieldset");
  const controls = container.querySelectorAll(".project-monthly-controls")[0];
  assert.equal(controls.querySelectorAll("[data-monthly-include-ormitters]").length, 1);
  assert.equal(controls.querySelectorAll("[data-monthly-mode-choice]").length, 2, "Mode controls sit beside inclusion");
  choices[1].dispatch("change");
  assert.deepEqual(changes, [], "An unchecked radio must not select a mode");
  choices[1].focus(); choices[1].checked = true; choices[1].dispatch("change");
  assert.deepEqual(changes, ["cumulative"]);
  choices = container.querySelectorAll("[data-monthly-mode-choice]");
  assert.equal(container.ownerDocument.activeElement, choices[1]);
  assert.deepEqual(choices.map(input => input.checked), [false, true]);
  const section = container.querySelectorAll("[data-monthly-project]")[0];
  assert.equal(section.getAttribute("data-monthly-mode"), "cumulative");
  assert.match(section.querySelectorAll("[data-monthly-chart]")[0].getAttribute("aria-label"), /Évolution cumulée.*aires empilées/);
  assert.match(section.querySelectorAll("[data-monthly-table-toggle]")[0].textContent, /valeurs cumulées/);
  const rows = section.querySelectorAll("tbody")[0].children;
  assert.equal(rows[2].querySelectorAll("td")[2].textContent, "19 h");
  section.querySelectorAll('[data-monthly-month="2026-03"]')[0].focus();
  assert.match(section.querySelectorAll("[data-monthly-tooltip]")[0].textContent, /Total cumulé du projet19 h.*Convention cumulée/);
  assert.equal(section.querySelectorAll("[data-monthly-corrections]").length, 0, "Positive cumulative nets no longer need the negative-band note");
  choices[0].focus(); choices[0].checked = true; choices[0].dispatch("change");
  assert.deepEqual(changes, ["cumulative", "monthly"]);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-monthly-mode-choice"), "monthly");
  assert.match(container.querySelectorAll("[data-monthly-chart]")[0].getAttribute("aria-label"), /Évolution mensuelle/);
  detail.hasOrmitters = false; draw();
  assert.equal(container.querySelectorAll("[data-monthly-include-ormitters]").length, 0);
  assert.equal(container.querySelectorAll("[data-monthly-mode-choice]").length, 2, "Monthly/cumulative choice remains available without Ormitters");
});

test("monthly keyboard and synchronized checkboxes preserve their specific focus across redraws", () => {
  const container = domFixture();
  const detail = monthlyDetail();
  const choices = [];
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail,
    onIncludeOrmittersChange: value => choices.push(value) });
  draw();
  let months = container.querySelectorAll("[data-monthly-month]");
  assert.deepEqual(months.map(month => month.getAttribute("tabindex")), ["-1", "-1", "0"]);
  months[2].focus();
  months[2].dispatch("keydown", { key: "Home" });
  assert.equal(container.ownerDocument.activeElement, months[0]);
  months[0].dispatch("keydown", { key: "ArrowRight" });
  assert.equal(container.ownerDocument.activeElement, months[1]);
  months[1].dispatch("keydown", { key: "End" });
  assert.equal(container.ownerDocument.activeElement, months[2]);
  months[2].dispatch("keydown", { key: "Escape" });
  months[2].dispatch("keydown", { key: "Enter" });
  const pinned = container.querySelectorAll("[data-monthly-tooltip]")[0];
  assert.equal(pinned.hidden, false);
  assert.equal(pinned.getAttribute("data-monthly-pinned"), "true");
  assert.equal(pinned.getAttribute("tabindex"), "0");
  months[2].dispatch("blur"); pinned.focus();
  assert.equal(pinned.hidden, false, "A pinned list stays open while keyboard focus moves into it");
  pinned.dispatch("keydown", { key: "Escape" });
  assert.equal(container.ownerDocument.activeElement, months[2]);
  assert.equal(pinned.hidden, true, "Returning focus after Escape must not reopen the tooltip");
  months[2].dispatch("keydown", { key: " " });
  assert.equal(pinned.hidden, false);
  container.ownerDocument.dispatch("pointerdown", { target: container.querySelectorAll("[data-project-back]")[0] });
  assert.equal(pinned.hidden, true);
  draw();
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-monthly-month"), "2026-03");
  const graphToggle = container.querySelectorAll("[data-monthly-include-ormitters]")[0];
  assert.equal(graphToggle.checked, false);
  graphToggle.focus(); graphToggle.checked = true; graphToggle.dispatch("change");
  assert.deepEqual(choices, [true]);
  detail.includeOrmitters = true;
  draw();
  assert.equal(container.ownerDocument.activeElement, container.querySelectorAll("[data-monthly-include-ormitters]")[0]);
  assert.equal(container.querySelectorAll("[data-include-ormitters]")[0].checked, true);
  const barToggle = container.querySelectorAll("[data-include-ormitters]")[0];
  barToggle.focus(); barToggle.checked = false; barToggle.dispatch("change");
  detail.includeOrmitters = false;
  draw();
  assert.deepEqual(choices, [true, false]);
  assert.equal(container.ownerDocument.activeElement, container.querySelectorAll("[data-include-ormitters]")[0]);
  assert.equal(container.querySelectorAll("[data-monthly-include-ormitters]")[0].checked, false);
  const table = container.querySelectorAll(".project-monthly-details")[0]; table.open = true;
  container.querySelectorAll("[data-monthly-table-toggle]")[0].focus();
  draw();
  assert.equal(container.ownerDocument.activeElement, container.querySelectorAll("[data-monthly-table-toggle]")[0]);
  assert.equal(container.querySelectorAll(".project-monthly-details")[0].open, true);
  detail.hasOrmitters = false;
  draw();
  assert.equal(container.querySelectorAll("[data-monthly-include-ormitters]").length, 0);
  assert.equal(container.querySelectorAll("[data-include-ormitters]").length, 0);
});

test("monthly reveal replays only changed control revisions, cleans observers and respects reduced motion", () => {
  const container = domFixture();
  const intersections = [], resizes = [];
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  }
  container.ownerDocument.defaultView = {
    IntersectionObserver: class extends Observer { constructor(callback) { super(callback); intersections.push(this); } },
    ResizeObserver: class extends Observer { constructor(callback) { super(callback); resizes.push(this); } },
    matchMedia: () => ({ matches: false })
  };
  const rows = [{ id: 19001, name: "Animation fixture" }, { id: 19002, name: "Reduced motion fixture" }];
  const detail = monthlyDetail();
  const draw = id => render(container, { projects: rows, selectedId: id, detail });
  draw(19001);
  let section = container.querySelectorAll("[data-monthly-project]")[0];
  assert.equal(section.getAttribute("data-monthly-reveal"), "pending");
  intersections[0].callback([{ isIntersecting: true }]);
  assert.equal(section.getAttribute("data-monthly-reveal"), "running");
  assert.equal(intersections[0].disconnected, true);
  section.querySelectorAll(".project-monthly-reveal-window")[0].dispatch("animationend");
  assert.equal(section.getAttribute("data-monthly-reveal"), "complete");
  section.querySelectorAll('[data-monthly-month="2026-02"]')[0].focus();
  resizes[0].callback([{ contentRect: { width: 390 } }]);
  assert.match(section.querySelectorAll("[data-monthly-chart]")[0].getAttribute("viewBox"), /^0 0 390 300$/);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-monthly-month"), "2026-02");
  draw(19001);
  section = container.querySelectorAll("[data-monthly-project]")[0];
  assert.equal(section.getAttribute("data-monthly-reveal"), "complete");
  assert.equal(intersections.length, 1, "Redrawing an already revealed project must not replay its animation");
  assert.equal(resizes[0].disconnected, true);
  const unchanged = section.querySelectorAll("[data-monthly-chart]")[0].getAttribute("viewBox");
  resizes[0].callback([{ contentRect: { width: 280 } }]);
  assert.equal(section.querySelectorAll("[data-monthly-chart]")[0].getAttribute("viewBox"), unchanged);
  detail.monthlyMode = "cumulative"; detail.monthlyRevealKey = 1;
  draw(19001);
  section = container.querySelectorAll("[data-monthly-project]")[0];
  assert.equal(section.getAttribute("data-monthly-reveal"), "pending");
  assert.equal(intersections.length, 2, "A mode switch requests a fresh one-second reveal");
  intersections[1].callback([{ isIntersecting: true }]);
  assert.equal(section.getAttribute("data-monthly-reveal"), "running");
  section.querySelectorAll(".project-monthly-reveal-window")[0].dispatch("animationend");
  assert.equal(section.getAttribute("data-monthly-reveal"), "complete");
  draw(19001);
  assert.equal(intersections.length, 2, "Unchanged mode, year or other rerenders do not replay");
  assert.equal(container.querySelectorAll("[data-monthly-project]")[0].getAttribute("data-monthly-reveal"), "complete");
  detail.includeOrmitters = true; detail.monthlyRevealKey = 2;
  draw(19001);
  section = container.querySelectorAll("[data-monthly-project]")[0];
  intersections[2].callback([{ isIntersecting: true }]);
  assert.equal(section.getAttribute("data-monthly-reveal"), "running", "Inclusion switches replay the shared area/reference reveal too");
  resizes.at(-1).callback([{ contentRect: { width: 390 } }]);
  assert.equal(section.getAttribute("data-monthly-reveal"), "complete", "Resize finishes a running reveal without restarting it");
  draw(19001);
  assert.equal(intersections.length, 3);
  container.ownerDocument.defaultView.matchMedia = () => ({ matches: true });
  draw(19002);
  assert.equal(container.querySelectorAll("[data-monthly-project]")[0].getAttribute("data-monthly-reveal"), "complete");
  assert.equal(intersections.length, 3);
  detail.monthlyRevealKey = 3; draw(19002);
  assert.equal(container.querySelectorAll("[data-monthly-project]")[0].getAttribute("data-monthly-reveal"), "complete");
  assert.equal(intersections.length, 3, "Reduced motion also bypasses replay after switches");
  for (const status of ["unavailable", "not-started"]) {
    detail.monthly = { status, months: [], warnings: ["<script>Read unavailable</script>"] };
    draw(19002);
    assert.equal(container.querySelectorAll("[data-monthly-status]")[0].getAttribute("data-monthly-status"), status);
    assert.equal(container.querySelectorAll("[data-monthly-chart]").length, 0);
    assert.equal(container.querySelectorAll("[data-monthly-table]").length, 0);
    assert.ok(container.textContent.includes("<script>Read unavailable</script>"));
  }
  assert.ok(resizes.every(observer => observer.disconnected));
  assert.equal(container.ownerDocument.listeners.size, 0, "Leaving the graph removes document-level tooltip handlers");
});

test("project tiles use a native named radio group, safe labels and exact project IDs", () => {
  const container = domFixture();
  const rows = projects();
  rows[0].name = '<img src=x onerror="PRIVATE_SCRIPT()">';
  const before = structuredClone(rows);
  const selected = [];
  render(container, { projects: rows, onSelect: id => selected.push(id) });
  assert.equal(container.querySelectorAll(".project-browser-grid")[0].tagName, "fieldset");
  const radios = container.querySelectorAll("[data-project-choice]");
  assert.equal(radios.length, 2);
  for (const radio of radios) {
    assert.equal(radio.tagName, "input");
    assert.equal(radio.type, "radio");
    assert.equal(radio.name, "personal-project");
    assert.ok(container.querySelectorAll("label").some(label => label.children.includes(radio)));
  }
  const choice = radios.find(radio => radio.value === "2");
  choice.checked = false;
  choice.dispatch("change");
  assert.deepEqual(selected, []);
  choice.checked = true;
  choice.dispatch("change");
  assert.deepEqual(selected, [2]);
  assert.ok(container.textContent.includes(rows[0].name));
  assert.equal(container.querySelectorAll("img").length, 2, "The validated manager photo appears on both card faces");
  assert.deepEqual(rows, before);
});

test("personal outline cards show source identity and dates while preserving manager and budget metadata access", () => {
  const container = domFixture(), rows = projects();
  rows[0].name = "[Autogrout] [54252043] Automated grouting research";
  rows[0].startDate = "2025-12-01"; rows[0].endDate = "2028-05-31";
  rows[0].totalBudget = { amount: 12345.67, currencyId: 1, currency: "EUR" };
  const before = structuredClone(rows), selected = [];
  render(container, { projects: rows, onSelect: id => selected.push(id), focusProjectId: 2 });
  const radio = container.querySelectorAll("[data-project-choice]").find(input => input.value === "2"), label = radio.parentElement;
  const front = label.querySelectorAll(".project-card-front")[0], back = label.querySelectorAll(".project-card-back")[0];
  assert.equal(label.children[0], radio, "The native radio remains a direct label child outside decorative card content");
  assert.ok(label.className.split(/\s+/).includes("project-card-outline"));
  assert.equal(label.querySelectorAll(".project-card-ambient").length, 0);
  const title = front.querySelectorAll(".project-browser-name")[0];
  assert.deepEqual(title.children.map(row => [row.tagName, row.className, row.textContent]), [
    ["strong", "project-card-title", "Autogrout"]
  ]);
  assert.equal(title.title, rows[0].name); assert.ok(label.title.startsWith(`${rows[0].name}\n`));
  assert.equal(radio.getAttribute("aria-label"), rows[0].name);
  assert.equal(front.querySelectorAll("img").length, 1); assert.equal(back.querySelectorAll("img").length, 1);
  assert.equal(back.querySelectorAll(".project-card-short-name")[0].textContent, "Autogrout");
  assert.equal(back.querySelectorAll(".project-card-back-number")[0].textContent, "54252043");
  assert.equal(back.querySelectorAll(".project-card-manager-name").length, 0);
  assert.equal(back.querySelectorAll(".project-card-back-full-name")[0].textContent, "Automated grouting research");
  const backOrder = ["54252043", "Autogrout", "Automated grouting research", "01/12/2025", "31/05/2028"]
    .map(value => back.textContent.indexOf(value));
  assert.deepEqual(backOrder, [...backOrder].sort((a, b) => a - b), "Source identity precedes the project start/end dates");
  assert.equal(back.querySelectorAll(".project-card-mini-photo")[0].src, png);
  assert.doesNotMatch(front.textContent, /54252043|Automated grouting research|12345|01\/12\/2025|31\/05\/2028/);
  assert.deepEqual(back.querySelectorAll(".project-card-date-value").map(value => value.textContent), ["01/12/2025", "31/05/2028"]);
  assert.equal(back.querySelectorAll(".project-card-budget").length, 0);
  assert.doesNotMatch(back.textContent, /12345|Alex Example/);
  assert.match(label.title, /Début : 01\/12\/2025\nFin : 31\/05\/2028/);
  assert.match(label.title.replace(/\s/g, ""), /Budgettotal:12345,67EUR/);
  const descriptionId = radio.getAttribute("aria-describedby"); assert.ok(descriptionId);
  const description = label.querySelectorAll(".project-card-sr-only")[0]; assert.equal(description.id, descriptionId);
  assert.match(description.textContent, /Alex Example.*01\/12\/2025/);
  assert.match(description.textContent.replace(/\s/g, ""), /12345,67.*EUR/);
  assert.equal(container.ownerDocument.activeElement, radio);
  radio.checked = false; radio.dispatch("change"); assert.deepEqual(selected, []);
  radio.checked = true; radio.dispatch("change"); assert.deepEqual(selected, [2]);
  assert.deepEqual(rows, before);
});

test("personal outline cards retain source numbers and complete name without inventing missing identity", () => {
  for (const [name, values] of [
    ["54252043 - [MiXeD] Full title [2026] (ID 99999999)", ["MiXeD", "54252043", "Full title [2026] (ID 99999999)"]],
    ["[54252043] Full title", ["Full title", "54252043", ""]],
    ["[MiXeD] Full title", ["MiXeD", "", "Full title"]],
    ["Plain project", ["Plain project", "", ""]],
    ['[<img src=x onerror="PRIVATE_SCRIPT()">] [54252043] <script>Full</script>',
      ['<img src=x onerror="PRIVATE_SCRIPT()">', "54252043", "<script>Full</script>"]]
  ]) {
    const container = domFixture(), rows = [{ id: 99999999, name, manager: null }], original = structuredClone(rows);
    render(container, { projects: rows });
    const radio = container.querySelectorAll("[data-project-choice]")[0], label = radio.parentElement;
    const title = label.querySelectorAll(".project-browser-name")[0];
    assert.ok(title.className.split(/\s+/).includes("project-card-name"));
    assert.deepEqual(title.children.map(row => row.textContent), [values[0]], name);
    const back = label.querySelectorAll(".project-card-back")[0];
    assert.deepEqual(["project-card-short-name", "project-card-back-number", "project-card-back-full-name"]
      .map(className => back.querySelectorAll(`.${className}`)[0].textContent), [values[0], values[1], values[2] || values[0]], name);
    assert.equal(back.querySelectorAll(".project-card-manager-name").length, 0);
    assert.deepEqual(back.querySelectorAll(".project-card-date-value").map(value => value.textContent), ["Indisponible", "Indisponible"]);
    assert.equal(title.title, name); assert.ok(label.title.startsWith(`${name}\n`)); assert.equal(radio.getAttribute("aria-label"), name);
    assert.equal(container.querySelectorAll("img").length, 0); assert.equal(container.querySelectorAll("script").length, 0);
    assert.deepEqual(rows, original);
  }
});

test("personal overview places the shared lifetime calendar below its unchanged radio grid", () => {
  const container = domFixture(), rows = [
    { ...projects()[0], startDate: "2020-01-01", endDate: "2026-10-04" },
    { ...projects()[1], startDate: "2025-12-01", endDate: "2028-05-31" },
    { id: 3, name: "Placeholder project", startDate: "2010-01-01", endDate: "2999-12-31", manager: null }
  ];
  const before = structuredClone(rows), selected = [];
  render(container, { projects: rows, years: new Set([2026]), now: "2026-10-05", timelineRenderer: require("../unit-dico"),
    onSelect: id => selected.push(id) });
  const content = container.querySelectorAll(".project-browser")[0];
  assert.equal(content.children[0].className, "project-browser-grid");
  assert.equal(content.children[1].className, "project-browser-calendar");
  assert.deepEqual(container.querySelectorAll("[data-project-choice]").map(radio => radio.value), ["1", "3", "2"]);
  assert.equal(container.querySelectorAll("img").length, 2, "Manager images stay on the card faces, without extra timeline images");
  assert.match(container.textContent, /Projets · 02 \/ Calendrier des projets/);
  assert.equal(container.querySelectorAll("[data-unit-timeline-start]")[0].getAttribute("data-unit-timeline-start"), "2020-01-01");
  assert.equal(container.querySelectorAll("[data-unit-timeline-end]")[0].getAttribute("data-unit-timeline-end"), "2028-05-31");
  assert.deepEqual(container.querySelectorAll("[data-unit-timeline-project]").map(track => track.getAttribute("data-unit-timeline-project")), ["1", "2"]);
  const name = container.querySelectorAll("[data-unit-project-select]").find(control => control.getAttribute("data-unit-project-select") === "1" && control.getAttribute("data-unit-project-kind") === "name");
  const bar = container.querySelectorAll("[data-unit-project-select]").find(control => control.getAttribute("data-unit-project-select") === "2" && control.getAttribute("data-unit-project-kind") === "bar");
  name.dispatch("click"); bar.dispatch("click");
  const radio = container.querySelectorAll("[data-project-choice]").find(control => control.value === "3");
  radio.checked = true; radio.dispatch("change");
  assert.deepEqual(selected, [1, 2, 3], "Names, duration bars and radio tiles share the same exact-ID selection callback");
  assert.deepEqual(rows, before);
});

test("personal calendar releases connected hosts before rerender, project entry and explicit tab-exit cleanup", () => {
  const container = domFixture(), observers = [], retired = [], calls = [], timeline = require("../unit-dico");
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe() {}
    unobserve() {}
    disconnect() { this.disconnected = true; }
  }
  container.ownerDocument.defaultView = { IntersectionObserver: Observer, matchMedia: () => ({ matches: false }) };
  const renderer = {
    renderTimeline: timeline.renderTimeline,
    cleanup(host) {
      calls.push(container.contains(host));
      retired.push(host.querySelectorAll(".unit-dico-timeline-bar")[0]);
      timeline.cleanup(host);
    }
  };
  const rows = [{ id: 1, name: "Lifecycle project", startDate: "2025-01-01", endDate: "2028-12-31" }];
  const draw = selectedId => render(container, { projects: rows, selectedId, timelineRenderer: renderer, now: "2026-10-05" });
  draw(null); draw(null);
  assert.deepEqual(calls, [true]); assert.equal(observers[0].disconnected, true);
  draw(1);
  assert.deepEqual(calls, [true, true]); assert.equal(observers[1].disconnected, true);
  assert.equal(container.querySelectorAll("[data-project-timeline]").length, 0);
  draw(null); cleanup(container); cleanup(container);
  assert.deepEqual(calls, [true, true, true]);
  assert.ok(observers.every(observer => observer.disconnected));
  observers.forEach((observer, index) => observer.callback([{ target: retired[index], isIntersecting: true }]));
  assert.ok(retired.every(bar => bar.getAttribute("data-unit-timeline-reveal") === "pending"), "Late callbacks cannot animate retired personal calendars");
});

test("personal calendar rerenders retain exact name/bar focus and Back can restore radio focus", () => {
  const container = domFixture(), timelineRenderer = require("../unit-dico");
  const rows = projects().map(project => ({ ...project, startDate: "2025-01-01", endDate: "2028-12-31" }));
  const draw = options => render(container, { projects: rows, timelineRenderer, now: "2026-10-05", ...options });
  draw();
  for (const kind of ["name", "bar"]) {
    container.querySelectorAll("[data-unit-project-select]").find(control => control.getAttribute("data-unit-project-select") === "2" && control.getAttribute("data-unit-project-kind") === kind).focus();
    draw();
    assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-project-select"), "2");
    assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-project-kind"), kind);
    assert.ok(container.contains(container.ownerDocument.activeElement));
  }
  draw({ selectedId: 2, focusDetail: true });
  assert.equal(container.querySelectorAll("[data-project-timeline]").length, 0);
  draw({ focusProjectId: 2 });
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-project-choice"), "2");
});

test("personal calendar mounts only on a populated overview and remains absent from Hours and Budget", () => {
  const container = domFixture(), mounts = [];
  const timelineRenderer = { renderTimeline(host, rows, options) { mounts.push({ host, rows, options }); } };
  render(container, { projects: [], timelineRenderer });
  assert.equal(mounts.length, 0); assert.equal(container.querySelectorAll("[data-project-timeline]").length, 0);
  for (const panel of ["hours", "budget"]) {
    render(container, { projects: projects(), selectedId: 2, panel, timelineRenderer });
    assert.equal(mounts.length, 0); assert.equal(container.querySelectorAll("[data-project-timeline]").length, 0);
  }
  render(container, { projects: projects(), timelineRenderer });
  assert.equal(mounts.length, 1);
  assert.deepEqual(mounts[0].rows.map(project => project.id), [1, 2]);
});

test("selecting a project renders three unavailable comparisons with an accessible return action", () => {
  const container = domFixture();
  let returned = 0;
  render(container, { projects: projects(), selectedId: "2", focusDetail: true, onBack: () => returned++ });
  assert.equal(container.querySelectorAll(".project-browser-grid").length, 0);
  assert.equal(container.querySelectorAll("[data-project-choice]").length, 0);
  const heading = container.querySelectorAll(".project-browser-title")[0];
  assert.equal(heading.textContent, "Zulu project");
  assert.equal(heading.getAttribute("tabindex"), "-1");
  assert.equal(container.ownerDocument.activeElement, heading);
  assert.deepEqual(container.querySelectorAll("[data-comparison]").map(node => node.getAttribute("data-comparison")), ["personal", "project", "lifetime"]);
  assert.equal(container.querySelectorAll(".project-hours-skeleton").length, 3);
  assert.equal(container.querySelectorAll("[data-hours-width]").length, 0, "Unavailable hours must not become zero bars");
  const back = container.querySelectorAll(".project-browser-back")[0];
  assert.equal(back.type, "button");
  assert.equal(back.textContent, "Tous les projets");
  back.dispatch("click");
  assert.equal(returned, 1);
});

test("project comparison geometry uses a 75 percent plan and a linear calendar tick", () => {
  assert.deepEqual(barGeometry(100, 50, 0.25), {
    plannedWidth: 75, actualWidth: 37.5, tickPosition: 18.75,
    scaleAvailable: true, unplanned: false, capped: false
  });
  assert.equal(barGeometry(100, 100, 0).tickPosition, 0);
  assert.equal(barGeometry(100, 100, 1).tickPosition, 75);
  assert.equal(barGeometry(100, 100, -1).tickPosition, 0);
  assert.equal(barGeometry(100, 100, 2).tickPosition, 75);
  assert.equal(barGeometry(100, 100, null).tickPosition, null);
  assert.equal(barGeometry(100, 120, 0.5).actualWidth, 90);
  assert.equal(barGeometry(100, 120, 0.5).capped, false);
  assert.equal(barGeometry(75, 100, 0.5).actualWidth, 100);
  assert.equal(barGeometry(75, 100, 0.5).capped, false);
  assert.equal(barGeometry(75, 101, 0.5).capped, true);
  assert.equal(barGeometry(100, -20, 0.5).actualWidth, 0);
});

test("unknown, zero and negative planning retain distinct comparison geometry", () => {
  for (const plan of [null, undefined, NaN, "", "not a number"]) {
    assert.deepEqual(barGeometry(plan, 10, 0.5), {
      plannedWidth: null, actualWidth: null, tickPosition: null,
      scaleAvailable: false, unplanned: false, capped: false
    });
  }
  assert.deepEqual(barGeometry(0, 10, 0.5), {
    plannedWidth: 0, actualWidth: 100, tickPosition: null,
    scaleAvailable: false, unplanned: true, capped: false
  });
  for (const actual of [0, -10]) {
    assert.equal(barGeometry(0, actual, 0.5).actualWidth, 0);
    assert.equal(barGeometry(0, actual, 0.5).unplanned, false);
  }
  assert.equal(barGeometry(-10, 10, 0.5).actualWidth, null);
  assert.equal(barGeometry(-10, -5, 0.5).actualWidth, 0);
  assert.equal(barGeometry(-10, 10, 0.5).tickPosition, null);
});

test("both project comparisons render signed totals, independent scales and the same calendar reference", () => {
  const container = domFixture();
  render(container, { projects: projects(), selectedId: 2, years: [2024, 2026], detail: {
    personal: { planned: 100, actual: 50, warnings: ["<script>unknown function</script>"] },
    project: { planned: 200, actual: 300 }, calendarFraction: 0.25
  } });
  const [mine, whole] = container.querySelectorAll("[data-comparison]");
  assert.match(mine.textContent, /Mes heures/);
  assert.match(whole.textContent, /tous les employés \(hors Ormitters\)/);
  assert.deepEqual(mine.querySelectorAll("[data-hours-width]").map(node => node.style.width), ["75%", "37.5%"]);
  assert.deepEqual(whole.querySelectorAll("[data-hours-width]").map(node => node.style.width), ["75%", "100%"]);
  for (const comparison of [mine, whole]) {
    const tick = comparison.querySelectorAll("[data-calendar-position]")[0];
    assert.equal(tick.style.left, "18.75%", "Calendar uses linear days, not the macro's square-root radius");
    assert.match(comparison.querySelectorAll('[role="img"]')[0].getAttribute("aria-label"), /25/);
  }
  assert.equal(whole.querySelectorAll(".is-capped").length, 1);
  assert.match(whole.querySelectorAll(".is-capped")[0].textContent, /100 h/);
  assert.equal(mine.querySelectorAll("h3")[0].textContent, "Mes heures en 2024 et 2026");
  assert.equal(whole.querySelectorAll("h3")[0].textContent, "Heures du projet en 2024 et 2026 · tous les employés (hors Ormitters)");
  assert.equal(container.querySelectorAll(".project-hours-period").length, 0);
  assert.ok(mine.textContent.includes("<script>unknown function</script>"));
  assert.equal(container.querySelectorAll("script").length, 0);
});

test("personal remaining-hours badges compare the full displayed plan and retain other graph baselines", () => {
  const container = domFixture();
  render(container, { projects: projects(), selectedId: 2, years: [2026], detail: {
    personal: { planned: 100, actual: 50 }, project: { planned: 200, actual: 0 },
    lifetime: { planned: 1000, actual: 80, startDate: "2025-12-01", endDate: "2028-05-31", calendarFraction: 0.1 },
    calendarFraction: 0.1
  } });
  const [mine, whole, lifetime] = container.querySelectorAll("[data-comparison]");
  assert.equal(mine.querySelectorAll(".is-below")[0].textContent, "Plus que 50 h prévues disponibles d’ici au 31/12/2026",
    "Available hours match the full planned bar, rather than the date tick's elapsed fraction");
  assert.equal(whole.querySelectorAll(".is-below")[0].textContent, "−200 h en-dessous du prévu");
  assert.equal(lifetime.querySelectorAll(".is-below")[0].textContent, "−920 h en-dessous de la convention");
  render(container, { projects: projects(), selectedId: 2, years: [2026], detail: {
    personal: { planned: "10.25", actual: "-2.25" }, project: { planned: 10, actual: 10 }
  } });
  assert.equal(container.querySelectorAll(".is-below")[0].textContent, "Plus que 12,5 h prévues disponibles d’ici au 31/12/2026");
  assert.match(container.querySelectorAll('[data-comparison="personal"]')[0].textContent, /-2,25 h.*Réalisé négatif après corrections/,
    "Negative corrections remain signed in the actual total while increasing available planned hours");
  assert.equal(container.querySelectorAll('[data-comparison="project"]')[0].querySelectorAll(".project-hours-badge").length, 0,
    "A balanced comparison needs no variance label");
});

test("personal available-hours deadlines use the selected scope end independently of clipped project dates", () => {
  const container = domFixture();
  const detail = { personal: { planned: 200, actual: 46.5 }, project: { planned: 200, actual: 46.5 },
    calendarScope: { startDate: "2026-08-01", endDate: "2026-10-15", fraction: 0.5 },
    lifetime: { planned: 1000, actual: 46.5, startDate: "2026-08-01", endDate: "2026-10-15", calendarFraction: 0.5 } };
  const years = new Set([2028, 2024, 2026, 2028]);
  for (const [options, end] of [
    [{ years: [2026] }, "31/12/2026"],
    [{ scope: years, years: [2025] }, "31/12/2028"],
    [{ scope: { kind: "years", years: [2027, "2026", 2027], startDate: "2026-01-01", endDate: "2029-12-31" } }, "31/12/2027"],
    [{ scope: ["2026", false, "", 2026.5, null, 9999, Infinity] }, "31/12/2026"],
    [{ scope: { startDate: "2026-08-01", endDate: "2026-12-30" }, years: [2028] }, "30/12/2026"],
    [{ scope: { kind: "custom", startDate: "2028-02-01", endDate: "2028-02-29" }, years: [2026] }, "29/02/2028"],
    [{ scope: null, years: [2024, 2026] }, "31/12/2026"]
  ]) {
    render(container, { projects: projects(), selectedId: 2, detail, ...options });
    const [mine, whole, lifetime] = container.querySelectorAll("[data-comparison]");
    assert.equal(mine.querySelectorAll(".is-below")[0].textContent, `Plus que 153,5 h prévues disponibles d’ici au ${end}`);
    assert.equal(whole.querySelectorAll(".is-below")[0].textContent, "−153,5 h en-dessous du prévu");
    assert.equal(lifetime.querySelectorAll(".is-below")[0].textContent, "−953,5 h en-dessous de la convention");
  }
  assert.deepEqual([...years], [2028, 2024, 2026], "Scope formatting leaves selected years unchanged");
  assert.deepEqual(detail.calendarScope, { startDate: "2026-08-01", endDate: "2026-10-15", fraction: 0.5 },
    "The effective project calendar is neither reused for the selected deadline nor mutated");
});

test("personal available-hours badges disclose unavailable selected end dates without inventing a deadline", () => {
  const container = domFixture();
  const detail = { personal: { planned: 200, actual: 46.5 },
    calendarScope: { startDate: "2026-08-01", endDate: "2026-10-15", fraction: 0.5 } };
  for (const options of [{}, { scope: [] }, { scope: "2026" }, { scope: { kind: "years", years: [] }, years: [2026] },
    { scope: { startDate: "2026-02-30", endDate: "2026-12-31" }, years: [2026] },
    { scope: { startDate: "2026-12-31", endDate: "2026-08-01" }, years: [2026] },
    { scope: { startDate: "2026-08-01" }, years: [2026] },
    { scope: { endDate: "2026-12-31" }, years: [2026] },
    { scope: { startDate: "0000-01-01", endDate: "2026-12-31" }, years: [2026] },
    { scope: { startDate: "2026-01-01", endDate: "9999-12-31" }, years: [2026] }]) {
    render(container, { projects: projects(), selectedId: 2, detail, ...options });
    assert.equal(container.querySelectorAll(".is-below")[0].textContent,
      "Plus que 153,5 h prévues disponibles sur la période sélectionnée (date de fin indisponible)");
  }
});

test("below-plan badges omit unknown totals and nonpositive planning without changing overruns", () => {
  const container = domFixture();
  for (const [planned, actual] of [[null, 1], [undefined, 1], [NaN, 1], ["", 1], [0, -1], [-10, -20],
    [10, null], [10, undefined], [10, NaN], [10, ""], [10, "not a number"], [10, 10]]) {
    const summary = { planned, actual };
    render(container, { projects: projects(), selectedId: 2, detail: {
      personal: summary, project: summary,
      lifetime: { ...summary, startDate: "2025-12-01", endDate: "2028-05-31", calendarFraction: 0.5 }
    } });
    assert.equal(container.querySelectorAll(".is-below").length, 0, `No deficit for plan ${planned}, actual ${actual}`);
  }
  render(container, { projects: projects(), selectedId: 2, detail: {
    personal: { planned: 100, actual: 120 }, project: { planned: 100, actual: 150 }
  } });
  const [mine, whole] = container.querySelectorAll("[data-comparison]");
  assert.equal(mine.querySelectorAll(".project-hours-badge")[0].textContent, "+20 h au-delà du prévu");
  assert.equal(whole.querySelectorAll(".project-hours-badge")[0].textContent, "Barre plafonnée · +50 h au-delà du prévu");
  assert.equal(container.querySelectorAll(".is-below").length, 0);
});

test("custom scope headings and employee details describe the selected period while independent views retain project dates", () => {
  const container = domFixture();
  const employees = [{ id: "employee:1", name: "Alex Example", actual: 30 }];
  const detail = {
    personal: { planned: 100, actual: 20 }, project: { planned: 200, actual: 30, employees },
    calendarScope: { startDate: "2026-03-05", endDate: "2026-04-20", fraction: 0.4 },
    lifetime: { planned: 1000, actual: 30, employees, startDate: "2025-12-01", endDate: "2028-05-31", calendarFraction: 0.1 },
    monthly: monthlySummary()
  };
  const draw = options => render(container, { projects: projects(), selectedId: 2, years: [2026],
    scope: { startDate: "2026-03-05", endDate: "2026-04-20" },
    scopeLabel: "Du 05/03/2026 au 20/04/2026", detail, ...options });
  draw();
  assert.equal(container.querySelectorAll(".project-hours-period").length, 0, "The old subtle hours header caption is removed");
  const [mine, whole, lifetime] = container.querySelectorAll("[data-comparison]");
  assert.equal(mine.querySelectorAll("h3")[0].textContent, "Mes heures du 5 mars 2026 au 20 avril 2026");
  assert.equal(whole.querySelectorAll("h3")[0].textContent, "Heures du projet du 5 mars 2026 au 20 avril 2026 · tous les employés (hors Ormitters)");
  for (const comparison of [mine, whole]) {
    assert.match(comparison.querySelectorAll("[data-project-calendar-period]")[0].textContent, /05\/03\/2026.*20\/04\/2026.*période sélectionnée/);
    assert.doesNotMatch(comparison.textContent, /années sélectionnées/);
    assert.equal(comparison.querySelectorAll("[data-calendar-position]")[0].style.left, "30%");
  }
  whole.querySelectorAll('[data-employee-kind="segment"]')[0].focus();
  assert.match(container.querySelectorAll('[role="tooltip"]')[0].textContent, /Sur la période sélectionnée/);
  lifetime.querySelectorAll('[data-employee-kind="segment"]')[0].focus();
  assert.match(container.querySelectorAll('[role="tooltip"]')[0].textContent, /Sur les dates du projet/);
  assert.match(lifetime.querySelectorAll("[data-project-lifetime-period]")[0].textContent, /01\/12\/2025.*31\/05\/2028.*hors période sélectionnée/);
  assert.match(container.querySelectorAll(".project-monthly-period")[0].textContent, /hors période sélectionnée/);
  draw({ scope: null, scopeLabel: "" });
  assert.equal(container.querySelectorAll('[data-comparison="personal"]')[0].querySelectorAll("h3")[0].textContent, "Mes heures en 2026");
  assert.equal(container.querySelectorAll(".project-hours-period").length, 0);
  draw({ panel: "budget", budgetRenderer: { render() {} } });
  assert.equal(container.querySelectorAll(".project-hours-period")[0].textContent, "Durée totale du projet");
});

test("scoped comparisons use the clipped December project period without changing totals or independent graphs", () => {
  const container = domFixture();
  const detail = { personal: { planned: 100, actual: 50 }, project: { planned: 200, actual: 80 },
    lifetime: { planned: 1000, actual: 80, startDate: "2025-12-01", endDate: "2028-05-31", calendarFraction: 0.3 },
    monthly: monthlySummary(), calendarFraction: 0.99 };
  const source = structuredClone(detail);
  let fallbackCalls = 0, firstMonthlyPaths = null;
  for (const [years, startDate, calendarDays, fraction] of [
    [[2026], "2026-01-01", 365, 281 / 364],
    [[2025, 2026], "2025-12-01", 396, 312 / 395]
  ]) {
    render(container, { projects: projects(), selectedId: 2, years, detail: { ...detail,
      calendarScope: { startDate, endDate: "2026-12-31", calendarDays, fraction } },
    calendarProgress() { fallbackCalls++; return { fraction: 0.99 }; } });
    const scoped = container.querySelectorAll("[data-comparison]").slice(0, 2);
    for (const comparison of scoped) {
      assert.equal(comparison.querySelectorAll("[data-calendar-position]")[0].style.left, `${75 * fraction}%`);
      const period = comparison.querySelectorAll("[data-project-calendar-period]")[0];
      assert.match(period.textContent, /31\/12\/2026.*période sélectionnée dans les dates du projet/);
      assert.ok(period.textContent.includes(startDate === "2025-12-01" ? "01/12/2025" : "01/01/2026"));
      assert.match(comparison.textContent, /Prévu réparti linéairement sur la période sélectionnée, dans les dates du projet/);
    }
    assert.deepEqual(scoped[0].querySelectorAll("[data-hours-width]").map(fill => fill.style.width), ["75%", "37.5%"]);
    assert.deepEqual(scoped[1].querySelectorAll("[data-hours-width]").map(fill => fill.style.width), ["75%", "30%"]);
    assert.match(scoped[0].textContent, /100 h.*50 h/);
    assert.match(scoped[1].textContent, /200 h.*80 h/);
    const lifetime = container.querySelectorAll('[data-comparison="lifetime"]')[0];
    assert.equal(lifetime.querySelectorAll("[data-calendar-position]")[0].style.left, "22.5%");
    assert.equal(lifetime.querySelectorAll("[data-project-calendar-period]").length, 0);
    assert.match(lifetime.querySelectorAll("[data-project-lifetime-period]")[0].textContent, /01\/12\/2025.*31\/05\/2028/);
    const monthlyPaths = container.querySelectorAll("[data-monthly-series]").map(group => group.querySelectorAll("path").map(path => path.getAttribute("d")));
    if (firstMonthlyPaths) assert.deepEqual(monthlyPaths, firstMonthlyPaths);
    else firstMonthlyPaths = monthlyPaths;
  }
  assert.equal(fallbackCalls, 0, "The project-clipped reference must take precedence over whole calendar years");
  assert.deepEqual(detail, source);
});

test("explicit unavailable or invalid scoped project dates suppress the calendar fallback and leave hours intact", () => {
  const container = domFixture();
  let fallbackCalls = 0;
  for (const calendarScope of [null, undefined,
    { startDate: "2025-12-01", endDate: "2026-12-31", fraction: null },
    { startDate: "2026-02-30", endDate: "2026-12-31", fraction: 0.5 },
    { startDate: "2027-01-01", endDate: "2026-12-31", fraction: 0.5 }
  ]) {
    render(container, { projects: projects(), selectedId: 2, years: [2025, 2026],
      detail: { personal: { planned: 100, actual: 50 }, project: { planned: 200, actual: 80 }, calendarScope, calendarFraction: 0.8 },
      calendarProgress() { fallbackCalls++; return { fraction: 0.9 }; } });
    const scoped = container.querySelectorAll("[data-comparison]").slice(0, 2);
    for (const comparison of scoped) {
      assert.equal(comparison.querySelectorAll("[data-calendar-position]").length, 0);
      assert.equal(comparison.querySelectorAll("[data-project-calendar-period]").length, 0);
      assert.match(comparison.textContent, /Repère du jour indisponible.*dates du projet absentes, invalides ou hors de la période sélectionnée/);
      assert.doesNotMatch(comparison.querySelectorAll('[role="img"]')[0].getAttribute("aria-label"), /Repère du jour|période écoulée/);
    }
    assert.deepEqual(scoped[0].querySelectorAll("[data-hours-width]").map(fill => fill.style.width), ["75%", "37.5%"]);
    assert.deepEqual(scoped[1].querySelectorAll("[data-hours-width]").map(fill => fill.style.width), ["75%", "30%"]);
  }
  assert.equal(fallbackCalls, 0);
});

test("a valid clipped period stays visible without inventing date ticks for unknown or zero planning", () => {
  const container = domFixture();
  render(container, { projects: projects(), selectedId: 2, years: [2025, 2026], detail: {
    personal: { planned: null, actual: 9 }, project: { planned: 0, actual: 12 },
    calendarScope: { startDate: "2025-12-01", endDate: "2026-12-31", calendarDays: 396, fraction: 0 }
  } });
  const [mine, whole] = container.querySelectorAll("[data-comparison]");
  assert.equal(mine.querySelectorAll("[data-hours-width]").length, 0);
  assert.match(mine.textContent, /Planning indisponible/);
  assert.match(whole.textContent, /Hors planning/);
  assert.deepEqual(whole.querySelectorAll("[data-hours-width]").map(fill => fill.style.width), ["0%", "100%"]);
  for (const comparison of [mine, whole]) {
    assert.match(comparison.querySelectorAll("[data-project-calendar-period]")[0].textContent, /01\/12\/2025.*31\/12\/2026/);
    assert.equal(comparison.querySelectorAll("[data-calendar-position]").length, 0);
    assert.equal(comparison.querySelectorAll(".project-hours-date-warning").length, 0);
  }
});

test("comparison labels preserve unknown planning, unplanned actuals and negative corrections", () => {
  const container = domFixture();
  const draw = (personal, project) => render(container, { projects: projects(), selectedId: 2,
    detail: { personal, project, calendarFraction: 0.5 } });
  draw({ planned: null, actual: 9 }, { planned: 0, actual: 12 });
  let [mine, whole] = container.querySelectorAll("[data-comparison]");
  assert.match(mine.textContent, /Indisponible.*9 h/);
  assert.equal(mine.querySelectorAll("[data-hours-width]").length, 0);
  assert.match(whole.textContent, /Hors planning/);
  assert.deepEqual(whole.querySelectorAll("[data-hours-width]").map(node => node.style.width), ["0%", "100%"]);
  assert.equal(container.querySelectorAll("[data-calendar-position]").length, 0);
  draw({ planned: 10, actual: -2 }, { planned: -5, actual: 3 });
  [mine, whole] = container.querySelectorAll("[data-comparison]");
  assert.match(mine.textContent, /-2 h/);
  assert.match(mine.textContent, /total signé/);
  assert.equal(mine.querySelectorAll("[data-hours-width]")[1].style.width, "0%");
  assert.match(whole.textContent, /Planning net négatif/);
  assert.equal(whole.querySelectorAll("[data-calendar-position]").length, 0);
});

test("loading and retry keep unavailable totals honest and preserve selected-view keyboard focus", () => {
  const container = domFixture();
  let retries = 0;
  const base = { projects: projects(), selectedId: 2, onRetry: () => retries++ };
  render(container, { ...base, detail: { loading: true } });
  assert.equal(container.getAttribute("aria-busy"), "true");
  assert.equal(container.querySelectorAll(".project-hours-skeleton").length, 3);
  assert.equal(container.querySelectorAll("[data-hours-width]").length, 0);
  container.querySelectorAll("[data-project-back]")[0].focus();
  render(container, { ...base, detail: { error: "Synthetic failure" } });
  assert.equal(container.ownerDocument.activeElement, container.querySelectorAll("[data-project-back]")[0]);
  const retry = container.querySelectorAll(".project-hours-retry")[0];
  retry.focus();
  retry.dispatch("click");
  assert.equal(retries, 1);
  render(container, { ...base, detail: { error: "Synthetic failure" } });
  assert.equal(container.ownerDocument.activeElement, container.querySelectorAll(".project-hours-retry")[0]);
  render(container, { ...base, detail: { personal: { planned: 10, actual: 2 }, project: { planned: 20, actual: 4 } } });
  assert.equal(container.ownerDocument.activeElement, container.querySelectorAll(".project-browser-title")[0]);
  assert.equal(container.getAttribute("aria-busy"), "false");
});

test("Ormitter inclusion appears only in the project comparison and preserves checkbox focus", () => {
  const container = domFixture();
  const selected = [];
  const base = { projects: projects(), selectedId: 2, onIncludeOrmittersChange: value => selected.push(value) };
  const detail = { personal: { planned: 10, actual: 2 }, project: { planned: 20, actual: 4 } };
  render(container, { ...base, detail });
  assert.equal(container.querySelectorAll("[data-include-ormitters]").length, 0);
  render(container, { ...base, detail: { ...detail, hasOrmitters: true } });
  const [mine, whole] = container.querySelectorAll("[data-comparison]");
  assert.equal(mine.querySelectorAll("[data-include-ormitters]").length, 0);
  const input = whole.querySelectorAll("[data-include-ormitters]")[0];
  assert.equal(input.type, "checkbox");
  assert.equal(input.checked, false);
  assert.ok(whole.querySelectorAll("label").some(label => label.children.includes(input)));
  const personalText = mine.textContent;
  input.focus();
  input.checked = true;
  input.dispatch("change");
  assert.deepEqual(selected, [true]);
  render(container, { ...base, detail: { ...detail, hasOrmitters: true, includeOrmitters: true } });
  assert.equal(container.ownerDocument.activeElement, container.querySelectorAll("[data-include-ormitters]")[0]);
  assert.equal(container.querySelectorAll("[data-include-ormitters]")[0].checked, true);
  assert.equal(container.querySelectorAll('[data-comparison="personal"]')[0].textContent, personalText);
  assert.match(container.querySelectorAll('[data-comparison="project"]')[0].textContent, /Ormitters inclus/);
});

test("positive project actuals descend by contribution with stable ties, ID colors and accessible narrow segments", () => {
  const container = domFixture();
  const ids = [1, 13, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14];
  const employees = ids.map((id, index) => ({ id: `employee:${id}`, employeeId: id,
    name: index < 2 ? "Same employee name" : `Employee ${id}`, actual: index === 0 ? 90 : index === 1 ? 0.01 : 1,
    photoDataUrl: null, isSubcontractor: false }));
  const before = structuredClone(employees);
  const draw = (rows, actual) => render(container, { projects: projects(), selectedId: 2, detail: {
    personal: { planned: 10, actual: 2 }, project: { planned: 75, actual, employees: rows }, calendarFraction: 0.5
  } });
  draw(employees, 102.01);
  const whole = container.querySelectorAll('[data-comparison="project"]')[0];
  const segments = whole.querySelectorAll('[data-employee-kind="segment"]');
  assert.equal(segments.length, 14);
  assert.deepEqual(segments.map(segment => segment.getAttribute("data-employee-id")),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 13].map(id => `employee:${id}`));
  assert.equal(whole.querySelectorAll('[data-hours-kind="actual"]')[0].querySelectorAll("[data-hours-width]")[0].style.width, "100%");
  assert.ok(Math.abs(segments.reduce((sum, segment) => sum + Number(segment.getAttribute("data-employee-share")), 0) - 100) < 1e-10);
  assert.equal(container.querySelectorAll('[data-comparison="personal"]')[0].querySelectorAll("[data-employee-id]").length, 0);
  const colors = new Map(segments.map(segment => [segment.getAttribute("data-employee-id"), segment.style.backgroundColor]));
  assert.equal(new Set(colors.values()).size, 14);
  const tiny = segments.find(segment => segment.getAttribute("data-employee-id") === "employee:13");
  assert.equal(tiny.type, "button");
  assert.ok(Number(tiny.getAttribute("data-employee-share")) < 0.02);
  assert.match(tiny.getAttribute("aria-label"), /Same employee name \(ID employee:13\)/);
  const legend = whole.querySelectorAll('[data-employee-kind="legend"]');
  assert.equal(legend.length, 14, "Every narrow part has a full-sized keyboard/touch legend control");
  assert.ok(Math.abs(legend.reduce((sum, entry) => sum + Number(entry.getAttribute("data-employee-actual")), 0) - 102.01) < 1e-10);
  tiny.focus();
  assert.equal(container.querySelectorAll('[role="tooltip"]')[0].hidden, false);
  draw(employees.slice(1), 12.01);
  const remaining = container.querySelectorAll('[data-employee-kind="segment"]');
  for (const segment of remaining) assert.equal(segment.style.backgroundColor, colors.get(segment.getAttribute("data-employee-id")));
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-employee-id"), "employee:13");
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-employee-kind"), "segment");
  assert.deepEqual(employees, before);
});

test("negative contributor corrections keep a neutral net bar and a reconciled signed breakdown", () => {
  const container = domFixture();
  const employees = [
    { id: "employee:1", name: "Positive employee", actual: 10 },
    { id: "employee:2", name: "Corrected employee", actual: -2 }
  ];
  const draw = (planned, actual = 8, rows = employees) => render(container, { projects: projects(), selectedId: 2,
    detail: { project: { planned, actual, employees: rows } } });
  draw(10);
  assert.equal(container.querySelectorAll('[data-employee-kind="segment"]').length, 0);
  assert.equal(container.querySelectorAll(".is-net-actual")[0].style.width, "60%");
  assert.match(container.querySelectorAll(".project-hours-breakdown-note")[0].textContent, /corrections négatives/);
  const entries = container.querySelectorAll('[data-employee-kind="legend"]');
  assert.equal(entries.reduce((sum, entry) => sum + Number(entry.getAttribute("data-employee-actual")), 0), 8);
  const negative = entries.find(entry => entry.getAttribute("data-employee-id") === "employee:2");
  negative.focus();
  assert.match(container.querySelectorAll('[role="tooltip"]')[0].textContent, /-2 h/);
  container.querySelectorAll(".project-browser-detail")[0].dispatch("keydown", { key: "Escape" });
  assert.equal(container.querySelectorAll('[role="tooltip"]')[0].hidden, true);
  draw(null);
  assert.equal(container.querySelectorAll("[data-hours-width]").length, 0);
  assert.equal(container.querySelectorAll('[data-employee-kind="legend"]').length, 2, "Unknown planning retains the actual contribution breakdown");
  draw(10, 99, [{ id: "employee:1", name: "Incomplete detail", actual: 10 }]);
  assert.equal(container.querySelectorAll('[data-employee-kind="segment"]').length, 0);
  assert.match(container.querySelectorAll(".project-hours-breakdown-note")[0].textContent, /ne se réconcilie pas/);
});

test("employee callouts and legends keep safe photos, fallback initials and literal names", () => {
  const container = domFixture();
  const employees = [
    { id: "employee:1", name: "Alex Example", actual: 2, photoDataUrl: png },
    { id: "employee:2", name: '<script>Private name</script>', actual: 3, photoDataUrl: "https://attacker.example/photo.png" },
    { id: "resource:3", name: "Unknown Resource", actual: 4, photoDataUrl: "data:image/svg+xml;base64,PHN2Zy8+", isSubcontractor: true }
  ];
  render(container, { projects: projects(), selectedId: 2, detail: { project: { planned: 10, actual: 9, employees } } });
  const segments = container.querySelectorAll('[data-employee-kind="segment"]');
  assert.equal(segments.length, employees.length);
  for (const segment of segments) {
    const employee = employees.find(entry => entry.id === segment.getAttribute("data-employee-id"));
    const bubbles = segment.querySelectorAll(".project-hours-employee-callout");
    assert.equal(bubbles.length, 1, "Each employee bubble belongs to its own bar segment");
    assert.equal(bubbles[0].getAttribute("aria-hidden"), "true");
    assert.equal(bubbles[0].querySelectorAll(".project-hours-employee-callout-name")[0].textContent, employee.name);
  }
  assert.equal(container.querySelectorAll(".project-hours-employee-callouts").length, 0);
  const images = container.querySelectorAll("img");
  assert.ok(images.length > 0);
  assert.ok(images.every(image => image.src === png));
  images.forEach(image => image.dispatch("error"));
  assert.ok(images.every(image => image.hidden));
  assert.ok(container.querySelectorAll(".project-hours-employee-initials").some(node => node.textContent === "AE"));
  assert.equal(container.querySelectorAll("script").length, 0);
  assert.ok(container.textContent.includes('<script>Private name</script>'));
  const resource = container.querySelectorAll('[data-employee-kind="legend"]').find(entry => entry.getAttribute("data-employee-id") === "resource:3");
  resource.focus();
  assert.match(container.querySelectorAll('[role="tooltip"]')[0].textContent, /Unknown Resource.*4 h.*Ormitter/);
});

test("lifetime convention sorts descending by its own hours while date tick, colors and focus stay exact", () => {
  const container = domFixture();
  const employees = [{ id: "employee:1", name: "Alex Example", actual: 30 },
    { id: "employee:2", name: "Drew Example", actual: 20 }];
  const detail = { personal: { planned: 10, actual: 2 }, project: { planned: 200, actual: 50, employees },
    lifetime: { planned: 100, actual: 50, employees: [{ ...employees[0], actual: 10 }, { ...employees[1], actual: 40 }],
      startDate: "2024-01-01", endDate: "2026-12-31", calendarFraction: 0.25 },
    calendarFraction: 0.5, hasOrmitters: true };
  const draw = years => render(container, { projects: projects(), selectedId: 2, detail, years });
  draw([2026]);
  const project = container.querySelectorAll('[data-comparison="project"]')[0];
  const lifetime = container.querySelectorAll('[data-comparison="lifetime"]')[0];
  assert.match(lifetime.textContent, /Convention · durée du projet/);
  assert.match(lifetime.querySelectorAll("[data-project-lifetime-period]")[0].textContent, /01\/01\/2024.*31\/12\/2026.*hors période sélectionnée/);
  assert.deepEqual(lifetime.querySelectorAll("[data-hours-width]").map(fill => fill.style.width), ["75%", "37.5%"]);
  assert.equal(lifetime.querySelectorAll("[data-calendar-position]")[0].style.left, "18.75%");
  assert.equal(project.querySelectorAll("[data-calendar-position]")[0].style.left, "37.5%");
  assert.equal(container.querySelectorAll("[data-include-ormitters]").length, 1);
  assert.equal(lifetime.querySelectorAll("[data-include-ormitters]").length, 0);
  const projectColors = new Map(project.querySelectorAll('[data-employee-kind="segment"]')
    .map(segment => [segment.getAttribute("data-employee-id"), segment.style.backgroundColor]));
  assert.deepEqual([...projectColors.keys()], ["employee:1", "employee:2"]);
  assert.deepEqual(lifetime.querySelectorAll('[data-employee-kind="segment"]').map(segment => segment.getAttribute("data-employee-id")),
    ["employee:2", "employee:1"]);
  for (const segment of lifetime.querySelectorAll('[data-employee-kind="segment"]')) {
    assert.equal(segment.style.backgroundColor, projectColors.get(segment.getAttribute("data-employee-id")));
    assert.equal(segment.getAttribute("data-employee-comparison"), "lifetime");
  }
  const key = lifetime.querySelectorAll('[data-employee-kind="legend"]')[0];
  key.focus();
  draw([2025]);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-employee-comparison"), "lifetime");
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-employee-id"), key.getAttribute("data-employee-id"));
  assert.equal(container.querySelectorAll('[data-comparison="lifetime"]')[0].querySelectorAll("[data-calendar-position]")[0].style.left, "18.75%");
});

test("unfilled lifetime budget omits the convention row and labels actual distribution with the MIS message", () => {
  const container = domFixture();
  const draw = lifetime => render(container, { projects: projects(), selectedId: 2, detail: { lifetime } });
  for (const planned of [null, 0, -5]) {
    draw({ planned, actual: 10, startDate: "2024-01-01", endDate: "2026-12-31", calendarFraction: 0.5,
      employees: [{ id: "employee:1", name: "Alex Example", actual: 10 }] });
    const lifetime = container.querySelectorAll('[data-comparison="lifetime"]')[0];
    assert.equal(lifetime.querySelectorAll('[data-hours-kind="planned"]').length, 0);
    assert.equal(lifetime.querySelectorAll('[data-hours-kind="actual"]')[0].querySelectorAll("[data-hours-width]")[0].style.width, "100%");
    assert.equal(lifetime.querySelectorAll("[data-calendar-position]").length, 0);
    assert.equal(lifetime.querySelectorAll("[data-convention-missing]")[0].textContent,
      "Budget personnel BW non renseigné. Demandez au MIS de mettre ce champ à jour.");
    assert.equal(lifetime.querySelectorAll(".project-hours-scale-note")[0].textContent,
      "Répartition du réalisé · sans échelle conventionnelle.");
  }
  draw({ planned: 100, actual: 10, startDate: "2026-02-30", endDate: "2026-12-31", calendarFraction: 0.5,
    employees: [{ id: "employee:1", name: "Alex Example", actual: 10 }] });
  const unavailable = container.querySelectorAll('[data-comparison="lifetime"]')[0];
  assert.equal(unavailable.querySelectorAll('[data-hours-kind="actual"]')[0].querySelectorAll("[data-hours-width]").length, 0);
  assert.equal(unavailable.querySelectorAll("[data-employee-id]").length, 0);
  assert.equal(unavailable.querySelectorAll("[data-calendar-position]").length, 0);
  assert.match(unavailable.textContent, /Dates du projet absentes ou invalides/);
});

test("confirmed raw convention hours scale correctly and unavailable budgets do not claim the MIS field is empty", () => {
  const container = domFixture();
  const rawHours = 3890.3967484570226;
  assert.equal(barGeometry(rawHours, rawHours / 2, 0.5).actualWidth, 37.5);
  const draw = lifetime => render(container, { projects: projects(), selectedId: 2, detail: { lifetime } });
  const lifetime = { planned: rawHours, actual: rawHours / 2, budgetStatus: "available",
    startDate: "2024-01-01", endDate: "2026-12-31", calendarFraction: 0.5 };
  draw(lifetime);
  let comparison = container.querySelectorAll('[data-comparison="lifetime"]')[0];
  assert.deepEqual(comparison.querySelectorAll("[data-hours-width]").map(fill => fill.style.width), ["75%", "37.5%"]);
  assert.match(comparison.textContent, /890,4 h/);
  assert.doesNotMatch(comparison.textContent, /890,24 h/);
  for (const budgetStatus of ["empty", "unavailable"]) {
    draw({ ...lifetime, planned: null, budgetStatus });
    comparison = container.querySelectorAll('[data-comparison="lifetime"]')[0];
    const message = comparison.querySelectorAll("[data-convention-missing]")[0];
    assert.equal(message.getAttribute("data-convention-status"), budgetStatus);
    if (budgetStatus === "unavailable") {
      assert.equal(message.textContent, "Budget personnel BW indisponible. Impossible de lire ce champ dans Odoo.");
      assert.doesNotMatch(message.textContent, /non renseigné|MIS/);
    } else assert.match(message.textContent, /non renseigné.*MIS/);
    assert.equal(comparison.querySelectorAll('[data-hours-kind="planned"]').length, 0);
    assert.equal(comparison.querySelectorAll('[data-hours-kind="actual"]')[0].querySelectorAll("[data-hours-width]")[0].style.width, "100%");
    assert.equal(comparison.querySelectorAll("[data-calendar-position]").length, 0);
  }
});

test("project manager avatars reject remote and active content, and broken photos keep initials", () => {
  const container = domFixture();
  const unsafe = ["https://attacker.example/photo.png", "data:image/svg+xml;base64,PHN2Zy8+", "javascript:alert(1)", png + "A".repeat(400000)];
  const rows = unsafe.map((photoDataUrl, index) => ({ id: index + 1, name: `Project ${index + 1}`,
    manager: { id: 10 + index, name: "Renée Example", photoDataUrl } }));
  rows.push({ id: 5, name: "Project 5", manager: { id: 15, name: "Alex Example", photoDataUrl: png } });
  rows.push({ id: 6, name: "Project 6", manager: null });
  render(container, { projects: rows });
  const images = container.querySelectorAll("img");
  assert.equal(images.length, 2);
  assert.equal(images[0].src, png);
  assert.equal(images[0].alt, "Photo de Alex Example");
  assert.equal(images[1].src, png); assert.equal(images[1].alt, "");
  images.forEach(image => image.dispatch("error"));
  assert.ok(images.every(image => image.hidden));
  assert.ok(container.querySelectorAll(".project-card-mini-initials").some(node => node.textContent === "AE"));
  assert.ok(container.querySelectorAll(".project-browser-initials").some(node => node.textContent === "AE"));
  assert.ok(container.querySelectorAll(".project-browser-initials").some(node => node.textContent === "RE"));
  assert.ok(container.querySelectorAll(".project-browser-initials").some(node => node.textContent === "?"));
});

test("project list sorts a copy and can restore focus after returning from a selection", () => {
  const container = domFixture();
  const rows = projects();
  render(container, { projects: rows, selectedId: 999, focusProjectId: 2 });
  const radios = container.querySelectorAll("[data-project-choice]");
  assert.deepEqual(radios.map(radio => radio.value), ["1", "2"]);
  assert.equal(container.ownerDocument.activeElement, radios[1]);
  assert.deepEqual(rows.map(project => project.id), [2, 1]);
});

test("empty, loading and failed project lists expose a safe status", () => {
  const container = domFixture();
  render(container, { projects: [], loading: true });
  assert.equal(container.getAttribute("aria-busy"), "true");
  assert.match(container.querySelectorAll('[role="status"]')[0].textContent, /Chargement/);
  render(container, { projects: [], error: "<script>private error</script>" });
  assert.equal(container.getAttribute("aria-busy"), "false");
  assert.ok(container.textContent.includes("<script>private error</script>"));
  assert.equal(container.querySelectorAll("script").length, 0);
  render(container, { projects: [] });
  assert.match(container.textContent, /Aucun projet/);
});

test("scoped employee exclusions append reconciled ignored hours without changing reference geometry", () => {
  const container = domFixture(), changes = [], ignoredEmployeeIds = new Set();
  const employees = [{ id: "employee:1", name: "Same name", actual: 10.2 }, { id: "employee:2", name: "Same name", actual: 5.3 }];
  const project = { planned: 20, actual: 15.5, employees }, detail = { personal: { planned: 20, actual: 10.2 }, project,
    lifetime: { ...project, startDate: "2026-01-01", endDate: "2026-12-31", calendarFraction: 0.5 }, calendarFraction: 0.5, ignoredEmployeeIds };
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail, onEmployeeInclusionChange(id, included) {
    changes.push([id, included]); if (included) ignoredEmployeeIds.delete(id); else ignoredEmployeeIds.add(id); draw();
  } });
  draw();
  const section = () => container.querySelectorAll('[data-comparison="project"]')[0];
  const widths = section().querySelectorAll("[data-hours-width]").map(fill => fill.style.width);
  const tick = section().querySelectorAll("[data-calendar-position]")[0].style.left;
  const first = section().querySelectorAll('[data-employee-kind="legend"]')[0]; first.focus(); first.dispatch("click");
  assert.deepEqual(changes, [["employee:1", false]]);
  let whole = section(), legend = whole.querySelectorAll('[data-employee-kind="legend"]');
  assert.equal(legend[0].getAttribute("aria-pressed"), "false");
  assert.match(legend[0].className, /is-ignored/);
  assert.equal(container.ownerDocument.activeElement, legend[0]);
  assert.equal(whole.querySelectorAll('[data-employee-kind="segment"]').length, 1);
  assert.equal(whole.querySelectorAll("[data-ignored-hours]")[0].getAttribute("data-ignored-hours"), "10.2");
  assert.equal(whole.querySelectorAll("[data-ignored-hours-label]")[0].textContent, "Heures ignorées");
  assert.deepEqual(whole.querySelectorAll("[data-hours-width]").map(fill => fill.style.width), widths);
  assert.equal(whole.querySelectorAll("[data-calendar-position]")[0].style.left, tick);
  assert.match(whole.querySelectorAll(".project-hours-employees-total")[0].textContent, /Heures comptées : 5,3 h.*Heures ignorées : 10,2 h.*Total réalisé : 15,5 h/);
  assert.equal(container.querySelectorAll('[data-comparison="lifetime"]')[0].querySelectorAll("[data-ignored-hours]").length, 0);
  legend[1].dispatch("click"); whole = section();
  assert.equal(whole.querySelectorAll('[data-employee-kind="segment"]').length, 0);
  assert.equal(whole.querySelectorAll("[data-ignored-hours]")[0].style.width, "100%");
  whole.querySelectorAll('[data-employee-kind="legend"]')[0].dispatch("click");
  assert.deepEqual(changes.at(-1), ["employee:1", true]);
  assert.equal(section().querySelectorAll('[data-employee-kind="segment"]')[0].getAttribute("data-employee-id"), "employee:1");
  assert.equal(project.actual, 15.5);
});

test("ignored signed corrections remain exact with neutral geometry, unknown IDs and unavailable planning", () => {
  const container = domFixture(), employees = [{ id: "employee:1", name: "A", actual: 10 }, { id: "employee:2", name: "B", actual: -2 }];
  const draw = (planned, ids) => render(container, { projects: projects(), selectedId: 2, detail: {
    project: { planned, actual: 8, employees }, ignoredEmployeeIds: ids } });
  draw(10, ["employee:2", "missing"]);
  let whole = container.querySelectorAll('[data-comparison="project"]')[0];
  assert.equal(whole.querySelectorAll("[data-ignored-hours]").length, 0);
  assert.equal(whole.querySelectorAll(".is-net-actual")[0].style.width, "60%");
  assert.match(whole.querySelectorAll(".project-hours-employees-total")[0].textContent, /Heures comptées : 10 h.*Heures ignorées : -2 h.*Total réalisé : 8 h/);
  draw(null, ["employee:1"]); whole = container.querySelectorAll('[data-comparison="project"]')[0];
  assert.equal(whole.querySelectorAll("[data-hours-width]").length, 0);
  assert.match(whole.querySelectorAll(".project-hours-employees-total")[0].textContent, /Heures comptées : -2 h.*Heures ignorées : 10 h/);
  draw(10, ["missing"]);
  assert.equal(container.querySelectorAll("[data-ignored-hours-label]").length, 0);
});

test("actual hover omits only exact zero employee values and monthly table omits only confirmed all-zero rows", () => {
  const container = domFixture(), detail = monthlyDetail();
  detail.monthly.employees[0].values = [0, 2, 0]; detail.monthly.employees[1].values = [0, -2, 0];
  detail.monthly.total = [0, 0, 0]; detail.monthly.convention = [0, 0, 0];
  detail.monthly.planningStatus = "available"; detail.monthly.planning = [0, 0, 1];
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail });
  draw(); let section = container.querySelectorAll('[data-monthly-kind="actual"]')[0];
  assert.equal(section.querySelectorAll("tbody")[0].children.length, 2, "Opposite corrections and nonzero planning stay visible");
  section.querySelectorAll('[data-monthly-month="2026-01"]')[0].focus();
  assert.deepEqual(section.querySelectorAll("[data-monthly-value]").map(row => row.getAttribute("data-monthly-value")), ["total", "convention", "planning"]);
  section.querySelectorAll('[data-monthly-month="2026-02"]')[0].focus();
  assert.ok(section.querySelectorAll("[data-monthly-value]").some(row => row.getAttribute("data-monthly-value") === "employee:2"));
  detail.monthly.planningStatus = "unavailable"; detail.monthly.planning = null; draw();
  section = container.querySelectorAll('[data-monthly-kind="actual"]')[0];
  assert.equal(section.querySelectorAll("tbody")[0].children.length, 3, "Unknown reference cannot establish an empty month");
  detail.monthlyMode = "cumulative"; detail.monthly.mode = "cumulative";
  detail.monthly.employees[0].values = [0, 2, 2]; detail.monthly.employees[1].values = [0, -2, -2];
  detail.monthly.planningStatus = "available"; detail.monthly.planning = [0, 0, 0]; draw();
  section = container.querySelectorAll('[data-monthly-kind="actual"]')[0];
  assert.equal(section.querySelectorAll("tbody")[0].children.length, 2);
});

test("project browser translates French and Dutch text, accessible labels and dates while preserving source names", () => {
  const i18n = require("../i18n"), container = domFixture(), detail = pairedMonthlyDetail();
  const original = structuredClone(detail);
  detail.planningInfo = planningInfoFixture(); detail.ignoredEmployeeIds = new Set(["employee:2"]); detail.calendarFraction = 0.5;
  try {
    i18n.setLanguage("nl");
    assert.equal(periodTitle([2026, 2027]), "Mijn uren in 2026 en 2027");
    assert.equal(periodTitle({ startDate: "2026-08-01", endDate: "2026-12-31" }), "Mijn uren van 1 augustus 2026 tot 31 december 2026");
    render(container, { projects: projects(), selectedId: 2, detail, years: [2026] });
    assert.match(container.textContent, /Overeenkomst en planning/);
    assert.match(container.textContent, /Projecten · 01 \/ Overzicht/);
    assert.match(container.textContent, /Projecturen in 2026 · alle medewerkers \(zonder Ormitters\)/);
    assert.match(container.textContent, /Genegeerde uren/);
    assert.match(container.textContent, /Projecten · 02 \/ Gepresteerde uren · tot vandaag/);
    assert.match(container.textContent, /Projecten · 03 \/ Maandelijkse planning/);
    assert.match(container.textContent, /Exacte waarden per maand bekijken/);
    assert.ok(container.textContent.includes("Zulu project"));
    assert.ok(container.textContent.includes("Alex Example"));
    assert.equal(container.querySelectorAll("[data-planning-info-control]")[0].getAttribute("aria-label"), "Informatie over de overeenkomst en de planning");
    assert.equal(container.querySelectorAll(".project-hours-date-label")[0].textContent, "Vandaag");
    const actual = container.querySelectorAll('[data-monthly-kind="actual"]')[0];
    assert.equal(actual.querySelectorAll("h3")[0].textContent, "Projecten · 02 / Gepresteerde uren · tot vandaag");
    assert.match(container.querySelectorAll('[data-planned-convention="unavailable"]')[0].textContent, /De uren van de overeenkomst konden niet worden bepaald/);
    actual.querySelectorAll('[data-monthly-month="2026-02"]')[0].focus();
    assert.match(actual.querySelectorAll("[data-monthly-tooltip]")[0].textContent, /februari 2026/);
    assert.ok(!actual.querySelectorAll("[data-monthly-tooltip]")[0].textContent.includes("février"));
    assert.equal(detail.monthly.employees[0].name, original.monthly.employees[0].name);
    i18n.setLanguage("fr");
    render(container, { projects: projects(), selectedId: 2, detail, years: [2026] });
    assert.match(container.textContent, /Convention et planning/);
    assert.match(container.textContent, /Heures ignorées/);
    assert.equal(container.querySelectorAll('[data-monthly-kind="actual"]')[0].querySelectorAll("h3")[0].textContent,
      "Projets · 02 / Heures réalisées · jusqu’à aujourd’hui");
    assert.equal(periodTitle([2026]), "Mes heures en 2026");
  } finally { i18n.setLanguage("fr"); cleanup(container); }
});

test("real purchase ribbon focus and disclosure survive project refresh and clean up on Hours navigation", () => {
  const budgetRenderer = require("../project-budget"), container = domFixture();
  const finance = { ok: true, project: { id: 11, name: "Projet fictif" }, annual: [], conventions: [],
    purchases: { status: "available", startDate: "2026-01-01", endDate: "2026-10-21", issues: [], items: [
      { id: 7001, date: "2026-09-01", consumed: 120, currencyId: 1, currency: "EUR", categoryId: 22, category: "Équipement",
        codeCategoryId: 601, codeCategory: "6010 Matériel", code: "6010", description: "Achat fictif", documentType: "in_invoice" }
    ] } };
  const draw = (panel = "budget") => render(container, { projects: [{ id: 11, name: "Projet fictif" }], selectedId: 11,
    panel, finance: { result: finance }, budgetRenderer });
  draw();
  container.querySelectorAll("[data-purchase-flow-details]")[0].open = true;
  const ribbon = container.querySelectorAll("[data-purchase-flow-link]")[0]; ribbon.focus();
  const key = ribbon.getAttribute("data-purchase-flow-control"), priorTip = container.querySelectorAll(".purchase-flow-tooltip")[0];
  draw();
  assert.equal(priorTip.hidden, true);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-purchase-flow-control"), key);
  assert.equal(container.querySelectorAll("[data-purchase-flow-details]")[0].open, true);
  const tip = container.querySelectorAll(".purchase-flow-tooltip")[0]; assert.equal(tip.hidden, false);
  container.querySelectorAll('[data-purchase-flow-control="expand"]')[0].dispatch("click");
  container.querySelectorAll("[data-purchase-flow-link]")[0].focus();
  const panel = container.querySelectorAll("[data-purchase-flow]")[0], removePanel = panel.remove.bind(panel);
  panel.remove = () => {
    if (panel.contains(container.ownerDocument.activeElement)) container.ownerDocument.activeElement = null;
    removePanel();
  };
  draw();
  assert.equal(container.ownerDocument.modalElement, null);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-purchase-flow-control"), key);
  container.querySelectorAll('[data-purchase-flow-control="visibility"]')[0].dispatch("click"); draw();
  assert.equal(container.querySelectorAll("[data-purchase-flow-body]")[0].hidden, true);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-purchase-flow-control"), "visibility");
  container.querySelectorAll('[data-purchase-flow-control="expand"]')[0].dispatch("click");
  const expanded = container.querySelectorAll("[data-purchase-flow-fullscreen]")[0]; assert.equal(expanded.open, true);
  draw("hours");
  assert.equal(expanded.open, false); assert.equal(container.ownerDocument.modalElement, null);
  assert.equal(tip.hidden, true); assert.equal(container.querySelectorAll("[data-purchase-flow]").length, 0);
  assert.equal(container.ownerDocument.listeners.size, 0);
  cleanup(container);
});

test("project calendar forwards the shared view and accessible focus contract", () => {
  const container = domFixture(), calls = [], choices = [];
  render(container, { projects: projects(), calendarView: "near", focusCalendarView: true,
    onCalendarViewChange: value => choices.push(value), timelineRenderer: { renderTimeline(host, rows, options) { calls.push(options); } } });
  assert.equal(calls[0].calendarView, "near");
  assert.equal(calls[0].focusCalendarView, true);
  calls[0].onCalendarViewChange("full");
  assert.deepEqual(choices, ["full"]);
});

test("cached application errors repaint when the project grid or detail language changes", () => {
  const i18n = require("../i18n"), container = domFixture(), error = "Heures indisponibles.";
  try {
    i18n.setLanguage("fr"); render(container, { projects: [], error });
    assert.equal(container.querySelectorAll(".project-browser-status")[0].textContent, error);
    i18n.setLanguage("nl"); render(container, { projects: [], error });
    assert.equal(container.querySelectorAll(".project-browser-status")[0].textContent, "Uren niet beschikbaar.");
    render(container, { projects: projects(), selectedId: 2, detail: { error } });
    assert.ok(container.querySelectorAll('[role="alert"]').some(element => element.textContent === "Uren niet beschikbaar."));
  } finally { i18n.setLanguage("fr"); cleanup(container); }
});

test("Dutch comparison badges and employee controls use complete grammatical phrases", () => {
  const i18n = require("../i18n"), container = domFixture();
  const employees = [{ id: "employee:1", name: "Source Alice", actual: 15 }, { id: "employee:2", name: "Source Bob", actual: 10 }];
  const detail = { personal: { planned: 20, actual: 25 }, project: { planned: 20, actual: 25, employees },
    lifetime: { planned: 30, actual: 25, employees, startDate: "2026-01-01", endDate: "2026-12-31", calendarFraction: 0.5 },
    calendarFraction: 0.5, ignoredEmployeeIds: new Set(["employee:2"]) };
  try {
    i18n.setLanguage("nl"); render(container, { projects: projects(), selectedId: 2, detail, years: [2026] });
    const whole = container.querySelectorAll('[data-comparison="project"]')[0], lifetime = container.querySelectorAll('[data-comparison="lifetime"]')[0];
    assert.ok(whole.textContent.includes("+5 h boven de planning")); assert.ok(!whole.textContent.includes("boven van"));
    assert.ok(lifetime.textContent.includes("−5 h onder de overeenkomst")); assert.ok(!lifetime.textContent.includes("onder van"));
    assert.match(lifetime.querySelectorAll(".project-hours-tracks")[0].getAttribute("aria-label"), /30 h volgens de overeenkomst/);
    assert.ok(!lifetime.querySelectorAll(".project-hours-tracks")[0].getAttribute("aria-label").includes("conventionnelles"));
    const legend = whole.querySelectorAll('[data-employee-kind="legend"]');
    assert.equal(legend[0].getAttribute("aria-label"), "De uren van Source Alice negeren: 15 h.");
    assert.equal(legend[1].getAttribute("aria-label"), "De uren van Source Bob opnieuw meetellen: 10 h.");
    i18n.setLanguage("fr"); render(container, { projects: projects(), selectedId: 2, detail, years: [2026] });
    assert.equal(container.querySelectorAll('[data-comparison="project"]')[0].querySelectorAll('[data-employee-kind="legend"]')[0].getAttribute("aria-label"), "Ignorer les heures de Source Alice : 15 h.");
  } finally { i18n.setLanguage("fr"); cleanup(container); }
});

test("excluded employee badges explicitly retain the full actual reference in both languages and all comparison states", () => {
  const i18n = require("../i18n"), container = domFixture();
  try {
    for (const language of ["fr", "nl"]) {
      i18n.setLanguage(language);
      const prefix = language === "fr" ? "Total réalisé, heures ignorées incluses · " : "Totaal gepresteerd, inclusief genegeerde uren · ";
      for (const [planned, actual, counted] of [[1274.6, 1170.75, 739], [100, 120, 40], [100, 200, 40]]) {
        const employees = [{ id: "employee:1", name: "Counted source person", actual: counted },
          { id: "employee:2", name: "Ignored source person", actual: Math.round((actual - counted) * 100) / 100 }];
        const detail = { personal: { planned, actual: counted }, project: { planned, actual, employees },
          lifetime: { planned, actual, employees, startDate: "2026-01-01", endDate: "2026-12-31", calendarFraction: 0.7 },
          calendarFraction: 0.7, ignoredEmployeeIds: new Set() };
        const draw = () => render(container, { projects: projects(), selectedId: 2, detail, years: [2026] });
        draw();
        let whole = container.querySelectorAll('[data-comparison="project"]')[0];
        const originalBadge = whole.querySelectorAll(".project-hours-badge")[0].textContent;
        const widths = whole.querySelectorAll("[data-hours-width]").map(fill => fill.style.width);
        const today = whole.querySelectorAll("[data-calendar-position]")[0].style.left;
        assert.equal(whole.querySelectorAll("[data-project-full-actual-reference]").length, 0);
        detail.ignoredEmployeeIds.add("employee:2"); draw();
        whole = container.querySelectorAll('[data-comparison="project"]')[0];
        const badge = whole.querySelectorAll("[data-project-full-actual-reference]")[0];
        assert.equal(badge.textContent, prefix + originalBadge, "The same full-actual amount has an explicit reference, without recalculation");
        assert.match(badge.getAttribute("title"), language === "fr" ? /heures ignorées incluses/ : /inclusief genegeerde uren/);
        assert.deepEqual(whole.querySelectorAll("[data-hours-width]").map(fill => fill.style.width), widths);
        assert.equal(whole.querySelectorAll("[data-calendar-position]")[0].style.left, today);
        assert.equal(container.querySelectorAll('[data-comparison="personal"]')[0].querySelectorAll("[data-project-full-actual-reference]").length, 0);
        assert.equal(container.querySelectorAll('[data-comparison="lifetime"]')[0].querySelectorAll("[data-project-full-actual-reference]").length, 0);
        if (actual === 1170.75) assert.ok(badge.textContent.includes("−103,85 h"), "The preserved reference is the full realized total, not the counted-only balance");
      }
    }
  } finally { i18n.setLanguage("fr"); cleanup(container); }
});
