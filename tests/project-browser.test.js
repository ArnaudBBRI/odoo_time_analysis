const assert = require("node:assert/strict");
const test = require("node:test");
const { render, barGeometry, monthlyGeometry } = require("../project-browser");
const { domFixture } = require("./dom-fixture");

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ekAAAAASUVORK5CYII=";
const projects = () => [
  { id: 2, name: "Zulu project", manager: { id: 20, name: "Alex Example", photoDataUrl: png } },
  { id: 1, name: "Alpha project", manager: null }
];

test("Heures/Budget switch replaces hours graphs, retains its focus and reuses the budget host", () => {
  const container = domFixture(), panels = [], renders = [];
  let panel = "hours", finance = { result: { project: { id: 2 } }, loading: false, selectedConventionId: 14, excludeOrmitterCosts: true };
  const draw = () => render(container, { projects: projects(), selectedId: 2, detail: monthlyDetail(), panel, finance,
    onViewChange(value) { panels.push(value); panel = value; draw(); },
    onBudgetRetry() { panels.push("retry"); }, onConventionChange(id) { panels.push(id); },
    onExcludeOrmitterCostsChange(value) { panels.push(value); },
    budgetRenderer: { render(host, data, options) { renders.push({ host, data, options }); host.replaceChildren(host.ownerDocument.createElement("p")); } } });
  draw();
  assert.equal(container.querySelectorAll('[data-project-view="hours"]')[0].getAttribute("aria-pressed"), "true");
  assert.equal(container.querySelectorAll('[data-project-view="budget"]')[0].getAttribute("aria-pressed"), "false");
  assert.equal(renders.length, 0);
  const budgetButton = container.querySelectorAll('[data-project-view="budget"]')[0];
  budgetButton.focus(); budgetButton.dispatch("click");
  assert.deepEqual(panels, ["budget"]);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-project-view"), "budget");
  assert.equal(container.querySelectorAll('[data-project-view="budget"]')[0].getAttribute("aria-pressed"), "true");
  assert.equal(container.querySelectorAll(".project-comparison").length, 0);
  assert.equal(container.querySelectorAll("[data-monthly-project]").length, 0);
  assert.match(container.textContent, /Durée totale du projet/);
  assert.equal(renders[0].data, finance.result);
  assert.equal(renders[0].options.selectedConventionId, 14);
  assert.equal(renders[0].options.excludeOrmitterCosts, true);
  renders[0].options.onRetry(); renders[0].options.onConventionChange(15); renders[0].options.onExcludeOrmitterCostsChange(false);
  assert.deepEqual(panels, ["budget", "retry", 15, false]);
  const firstHost = renders[0].host;
  draw();
  assert.equal(renders[1].host, firstHost, "The source-backed renderer can preserve expanded tables and focus");
  container.querySelectorAll('[data-project-view="hours"]')[0].dispatch("click");
  assert.equal(container.querySelectorAll("[data-budget-host]").length, 0);
  assert.ok(container.querySelectorAll("[data-monthly-project]").length > 0);
});

test("Budget control focus is restored after mounting a rerendered project detail", () => {
  const container = domFixture();
  for (const [attribute, value] of [["data-budget-convention-choice", "14"], ["data-budget-details", "annual:21"], ["data-budget-retry", ""], ["data-budget-exclude-ormitter-costs", ""], ["data-budget-code-detail", "21:consumed:6139"]]) {
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
  assert.deepEqual(tooltip.querySelectorAll("[data-monthly-value]").map(value => value.getAttribute("data-monthly-value")), ["employee:1", "planned:employee:1"]);
  assert.match(tooltip.textContent, /Réalisé-2 h.*Prévu · projection linéaire10 h/);
  assert.doesNotMatch(tooltip.textContent, /employee:2|Total du projet|Convention/);
  const table = section.querySelectorAll("[data-monthly-table]")[0];
  assert.equal(table.querySelectorAll("thead")[0].querySelectorAll("th").length, 3);
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
  assert.match(section.querySelectorAll("[data-monthly-tooltip]")[0].textContent, /Prévu · projection linéaire0 h/);
  Object.assign(detail.monthly.employees[1], { plannedStatus: "unavailable", plannedHours: null, plannedReference: null,
    plannedWarning: "<script>Planning source unavailable</script>" });
  draw(); section = container.querySelectorAll("[data-monthly-project]")[0];
  assert.equal(section.querySelectorAll('[data-monthly-employee-line="planned"]').length, 0);
  assert.equal(section.querySelectorAll("[data-monthly-employee-planning]")[0].getAttribute("data-monthly-employee-planning"), "unavailable");
  assert.equal(section.querySelectorAll("[data-monthly-planned-warning]")[0].textContent, "<script>Planning source unavailable</script>");
  assert.equal(section.querySelectorAll("script").length, 0);
  assert.match(section.querySelectorAll("[data-monthly-tooltip]")[0].textContent, /Prévu · projection linéaireIndisponible/);
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
  assert.match(section.querySelectorAll("[data-monthly-tooltip]")[0].textContent, /Réalisé cumulé13 h.*Prévu cumulé · projection linéaire22,12 h/);
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

test("monthly stacked areas share bar colors, retain exact signed table values and render safe tooltips", () => {
  const container = domFixture();
  const detail = monthlyDetail();
  detail.monthly.employees[1].name = '<script>Private employee</script>';
  detail.monthly.employees[1].photoDataUrl = "https://attacker.example/photo.png";
  render(container, { projects: projects(), selectedId: 2, detail });
  const section = container.querySelectorAll("[data-monthly-project]")[0];
  assert.match(section.textContent, /Projets · 02 \/ Évolution mensuelle/);
  assert.match(section.textContent, /hors filtre d’années/);
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
  for (const group of series.filter(group => group.getAttribute("data-monthly-series") === "employee")) {
    const id = group.getAttribute("data-monthly-employee-id");
    const color = segments.find(segment => segment.getAttribute("data-employee-id") === id).style.backgroundColor;
    for (const path of group.querySelectorAll("path")) {
      assert.equal(path.getAttribute("fill"), color);
      assert.equal(path.getAttribute("stroke"), color);
      assert.match(path.getAttribute("d"), / Z$/);
    }
    assert.equal(section.querySelectorAll("[data-monthly-legend]").find(item => item.getAttribute("data-monthly-legend") === id)
      .querySelectorAll(".project-monthly-legend-line")[0].style.borderTopColor, color);
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
  assert.equal(container.querySelectorAll("img").length, 1, "The only image is the validated manager photo");
  assert.deepEqual(rows, before);
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
  assert.ok(container.textContent.includes("2024 · 2026"));
  assert.ok(mine.textContent.includes("<script>unknown function</script>"));
  assert.equal(container.querySelectorAll("script").length, 0);
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
      assert.match(period.textContent, /31\/12\/2026.*années sélectionnées dans les dates du projet/);
      assert.ok(period.textContent.includes(startDate === "2025-12-01" ? "01/12/2025" : "01/01/2026"));
      assert.match(comparison.textContent, /Prévu réparti linéairement sur les années sélectionnées, dans les dates du projet/);
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
      assert.match(comparison.textContent, /Repère du jour indisponible.*dates du projet absentes, invalides ou hors des années sélectionnées/);
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

test("positive project actuals form a reconciled stack with stable ID colors and accessible narrow segments", () => {
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
  negative.dispatch("click");
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
  resource.dispatch("click");
  assert.match(container.querySelectorAll('[role="tooltip"]')[0].textContent, /Unknown Resource.*4 h.*Ormitter/);
});

test("lifetime convention uses its own period and date tick while contributor colors and focus stay exact", () => {
  const container = domFixture();
  const employees = [{ id: "employee:1", name: "Alex Example", actual: 30 },
    { id: "employee:2", name: "Drew Example", actual: 20 }];
  const detail = { personal: { planned: 10, actual: 2 }, project: { planned: 200, actual: 50, employees },
    lifetime: { planned: 100, actual: 50, employees, startDate: "2024-01-01", endDate: "2026-12-31", calendarFraction: 0.25 },
    calendarFraction: 0.5, hasOrmitters: true };
  const draw = years => render(container, { projects: projects(), selectedId: 2, detail, years });
  draw([2026]);
  const project = container.querySelectorAll('[data-comparison="project"]')[0];
  const lifetime = container.querySelectorAll('[data-comparison="lifetime"]')[0];
  assert.match(lifetime.textContent, /Convention · durée du projet/);
  assert.match(lifetime.querySelectorAll("[data-project-lifetime-period]")[0].textContent, /01\/01\/2024.*31\/12\/2026.*hors filtre d’années/);
  assert.deepEqual(lifetime.querySelectorAll("[data-hours-width]").map(fill => fill.style.width), ["75%", "37.5%"]);
  assert.equal(lifetime.querySelectorAll("[data-calendar-position]")[0].style.left, "18.75%");
  assert.equal(project.querySelectorAll("[data-calendar-position]")[0].style.left, "37.5%");
  assert.equal(container.querySelectorAll("[data-include-ormitters]").length, 1);
  assert.equal(lifetime.querySelectorAll("[data-include-ormitters]").length, 0);
  const projectColors = new Map(project.querySelectorAll('[data-employee-kind="segment"]')
    .map(segment => [segment.getAttribute("data-employee-id"), segment.style.backgroundColor]));
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
  assert.equal(images.length, 1);
  assert.equal(images[0].src, png);
  assert.equal(images[0].alt, "Photo de Alex Example");
  images[0].dispatch("error");
  assert.equal(images[0].hidden, true);
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
