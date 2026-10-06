const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const originalTimezone = process.env.TZ;
process.env.TZ = "Europe/Brussels";
test.after(() => {
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
});

const source = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const today = new Date(2026, 9, 5, 12);
const project = "[10001] Example project";

function utcAtLocalMidnight(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toISOString();
}

function loadDashboard() {
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "Dashboard inline script must exist");
  const bootstrap = "const originalFetch = window.fetch.bind(window);";
  assert.equal(script.split(bootstrap).length, 2, "Test seam must precede the sole bootstrap");
  const instrumented = script.replace(bootstrap, `
    state.hoursScope = "me";
    globalThis.dashboard = {
      state, els, monthFromKey, projectColorKey,
      buildRemainingToDateTotals, buildRemainingComparison,
      buildEmployeeRemainingRows, renderRemainingRow,
      buildEmployeeDatasetFromApi, buildPersonalPlanDatasetFromApi,
      buildDicoProjectListFromApi
    };
    return;
    ${bootstrap}`);
  const elements = new Map();
  const context = {
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, {});
        return elements.get(id);
      }
    },
    fetch() { throw new Error("Offline dashboard tests must never make network requests"); }
  };
  vm.runInNewContext(instrumented, context, { filename: "index.html" });
  context.dashboard.state.years = [2024, 2025, 2026, 2027];
  context.dashboard.state.selectedYears = new Set([2026]);
  return context.dashboard;
}

function monthlyDataset(dashboard, values, extra = {}) {
  return {
    months: Object.keys(values).map((key) => dashboard.monthFromKey(key)),
    rows: [{ name: project, values: new Map(Object.entries(values)) }],
    ...extra
  };
}

function totalsFor(dashboard, actual, planned, at = today) {
  const totals = dashboard.buildRemainingToDateTotals(actual, planned, at);
  return totals.get(dashboard.projectColorKey(project)) || { actualToDate: 0, foreseenToDate: 0 };
}

function assertTotals(totals, actual, foreseen) {
  assert.equal(totals.actualToDate, actual);
  assert.ok(Math.abs(totals.foreseenToDate - foreseen) < 1e-9,
    `Expected ${foreseen} foreseen hours, received ${totals.foreseenToDate}`);
}

test("actual lines include all of today, exclude tomorrow and years outside the scope", () => {
  const dashboard = loadDashboard();
  const actual = monthlyDataset(dashboard, { "2026-10": 100 }, {
    lines: [
      { project, date: "2025-10-01", hours: 40 },
      { project, date: "2026-10-01", hours: 8 },
      { project, date: "2026-10-05", hours: 12 },
      { project, date: "2026-10-06", hours: 30 }
    ]
  });
  assertTotals(totalsFor(dashboard, actual, null), 20, 0);
});

test("foreseen hours count the elapsed fraction of a slot through the end of today", () => {
  const dashboard = loadDashboard();
  const planned = monthlyDataset(dashboard, { "2026-10": 999 }, {
    slots: [
      { project, start: utcAtLocalMidnight("2026-10-01"), end: utcAtLocalMidnight("2026-10-11"), hours: 100 },
      { project, start: utcAtLocalMidnight("2026-10-06"), end: utcAtLocalMidnight("2026-10-07"), hours: 40 }
    ]
  });
  assertTotals(totalsFor(dashboard, null, planned), 0, 50);
});

test("Odoo UTC planning datetimes respect Brussels late-night day boundaries", () => {
  const dashboard = loadDashboard();
  assert.equal(today.getTimezoneOffset(), -120);
  // Odoo returns UTC without a suffix; 23:00 UTC is already October 6 locally.
  assertTotals(totalsFor(dashboard, null, { slots: [
    { project, start: "2026-10-05 23:00:00", end: "2026-10-06 01:00:00", hours: 20 }
  ] }), 0, 0);
  // Only the first hour falls before the local October 6 cutoff (22:00 UTC).
  assertTotals(totalsFor(dashboard, null, { slots: [
    { project, start: "2026-10-05 21:00:00", end: "2026-10-05 23:00:00", hours: 20 }
  ] }), 0, 10);
});

test("UTC planning instants are assigned to their local selected year at New Year", () => {
  const dashboard = loadDashboard();
  const planned = { slots: [
    { project, start: "2025-12-31 23:00:00", end: "2026-01-01 01:00:00", hours: 20 },
    { project, start: "2026-12-31 23:00:00", end: "2027-01-01 01:00:00", hours: 99 }
  ] };
  assertTotals(totalsFor(dashboard, null, planned, new Date(2027, 0, 2, 12)), 0, 20);
});

test("slot allocation respects disjoint selected years instead of filling gaps", () => {
  const dashboard = loadDashboard();
  dashboard.state.selectedYears = new Set([2024, 2026]);
  const planned = monthlyDataset(dashboard, {}, {
    slots: [
      { project, start: utcAtLocalMidnight("2024-12-31"), end: utcAtLocalMidnight("2025-01-02"), hours: 48 },
      { project, start: utcAtLocalMidnight("2025-03-01"), end: utcAtLocalMidnight("2025-03-02"), hours: 99 },
      { project, start: utcAtLocalMidnight("2026-01-01"), end: utcAtLocalMidnight("2026-01-03"), hours: 48 }
    ]
  });
  assertTotals(totalsFor(dashboard, null, planned), 0, 72);
});

test("a future-only selected year has no actual or foreseen hours to date", () => {
  const dashboard = loadDashboard();
  dashboard.state.selectedYears = new Set([2027]);
  const actual = monthlyDataset(dashboard, { "2027-01": 30 }, {
    lines: [{ project, date: "2027-01-01", hours: 30 }]
  });
  const planned = monthlyDataset(dashboard, { "2027-01": 48 }, {
    slots: [{ project, start: utcAtLocalMidnight("2027-01-01"), end: utcAtLocalMidnight("2027-01-03"), hours: 48 }]
  });
  assertTotals(totalsFor(dashboard, actual, planned), 0, 0);
});

test("empty raw API arrays are authoritative even if monthly summaries contain hours", () => {
  const dashboard = loadDashboard();
  const actual = monthlyDataset(dashboard, { "2026-10": 100 }, { lines: [] });
  const planned = monthlyDataset(dashboard, { "2026-10": 100 }, { slots: [] });
  assertTotals(totalsFor(dashboard, actual, planned), 0, 0);
});

test("raw comparison records exclude Internal and keep the No project summary bucket", () => {
  const dashboard = loadDashboard();
  const totals = dashboard.buildRemainingToDateTotals(
    { lines: [
      { project, date: "2026-10-01", hours: 9 },
      { project: "Internal", date: "2026-10-01", hours: 20 },
      { project: "", date: "2026-10-01", hours: 10 }
    ] },
    { slots: [project, "Interne", ""].map((name) => ({
      project: name, start: utcAtLocalMidnight("2026-10-01"), end: utcAtLocalMidnight("2026-10-02"), hours: 12
    })) },
    today
  );
  assert.equal(totals.size, 2);
  assertTotals(totals.get(dashboard.projectColorKey(project)), 9, 12);
  assertTotals(totals.get(dashboard.projectColorKey("(No project)")), 10, 12);
});

test("monthly fallback retains reported actuals and prorates only current planning", () => {
  const dashboard = loadDashboard();
  const actual = monthlyDataset(dashboard, { "2026-09": 30, "2026-10": 62, "2026-11": 100 });
  const planned = monthlyDataset(dashboard, { "2026-09": 60, "2026-10": 310, "2026-11": 100 });
  assertTotals(totalsFor(dashboard, actual, planned), 92, 110);
});

test("empty year selection uses available years while retaining the today cutoff", () => {
  const dashboard = loadDashboard();
  dashboard.state.selectedYears = new Set();
  dashboard.state.years = [2025, 2026, 2027];
  const actual = monthlyDataset(dashboard, { "2025-12": 10, "2026-09": 20, "2027-01": 100 });
  assertTotals(totalsFor(dashboard, actual, null), 30, 0);
});

test("comparison color boundaries are symmetric and include exact 10% and 25% limits", () => {
  const dashboard = loadDashboard();
  for (const [actual, status] of [
    [100, "green"], [90, "green"], [110, "green"],
    [89.99, "orange"], [110.01, "orange"], [75, "orange"], [125, "orange"],
    [74.99, "red"], [125.01, "red"]
  ]) {
    assert.equal(dashboard.buildRemainingComparison(actual, 100).status, status,
      `${actual} actual hours against 100 foreseen`);
  }
});

test("the larger comparison bar fills its row and the other scales proportionally", () => {
  const dashboard = loadDashboard();
  const over = dashboard.buildRemainingComparison(160, 100);
  assert.equal(over.actual, 160);
  assert.equal(over.foreseen, 100);
  assert.equal(over.actualWidth, 100);
  assert.equal(over.foreseenWidth, 62.5);
  const under = dashboard.buildRemainingComparison(60, 100);
  assert.equal(under.actualWidth, 60);
  assert.equal(under.foreseenWidth, 100);
});

test("zero foreseen and zero actual comparisons produce safe widths and statuses", () => {
  const dashboard = loadDashboard();
  const none = dashboard.buildRemainingComparison(0, 0);
  assert.equal(none.status, "green");
  assert.equal(none.divergence, 0);
  assert.equal(none.actualWidth, 0);
  assert.equal(none.foreseenWidth, 0);
  const unplanned = dashboard.buildRemainingComparison(10, 0);
  assert.equal(unplanned.status, "red");
  assert.equal(unplanned.divergence, Infinity);
  assert.equal(unplanned.actualWidth, 100);
  assert.equal(unplanned.foreseenWidth, 0);
  const unspent = dashboard.buildRemainingComparison(0, 10);
  assert.equal(unspent.status, "red");
  assert.equal(unspent.actualWidth, 0);
  assert.equal(unspent.foreseenWidth, 100);
});

test("row merging keeps scope totals and ordering while attaching to-date totals", () => {
  const dashboard = loadDashboard();
  const key = dashboard.projectColorKey(project);
  const rows = dashboard.buildEmployeeRemainingRows(
    [{ name: project, value: 40, color: "blue" }, { name: "[10002] Overspent", value: 80 }],
    [{ name: "[10001] Renamed project", value: 100 }, { name: "[10002] Overspent", value: 20 }],
    new Map([[key, { actualToDate: 8, foreseenToDate: 10 }]])
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].key, key);
  assert.equal(rows[0].actual, 40);
  assert.equal(rows[0].planned, 100);
  assert.equal(rows[0].remaining, 60);
  assert.equal(rows[0].actualToDate, 8);
  assert.equal(rows[0].foreseenToDate, 10);
  assert.equal(rows[1].remaining, -60);
  assert.equal(rows[1].actualToDate, 0);
  assert.equal(rows[1].foreseenToDate, 0);
});

test("employee API adapters retain raw records for date-level comparison", () => {
  const dashboard = loadDashboard();
  const actual = dashboard.buildEmployeeDatasetFromApi({
    monthly: [{ month: "2026-10", projects: [{ name: project, hours: 50 }] }],
    lines: [{ project, date: "2026-10-05", hours: 20 }, { project, date: "2026-10-06", hours: 30 }]
  });
  const planned = dashboard.buildPersonalPlanDatasetFromApi({
    monthly: [{ month: "2026-10", projects: [{ name: project, hours: 100 }] }],
    slots: [{ project, start: utcAtLocalMidnight("2026-10-01"), end: utcAtLocalMidnight("2026-10-11"), hours: 100 }]
  });
  assertTotals(totalsFor(dashboard, actual, planned), 20, 50);
});

test("Dico API adapter retains raw records used by the same to-date comparison", () => {
  const dashboard = loadDashboard();
  const dataset = dashboard.buildDicoProjectListFromApi({
    projects: [{ id: 1, name: project }],
    actualMonthly: [{ month: "2026-10", projects: [{ name: project, hours: 50 }] }],
    plannedMonthly: [{ month: "2026-10", projects: [{ name: project, hours: 100 }] }],
    lines: [{ project, date: "2026-10-05", hours: 20 }, { project, date: "2026-10-06", hours: 30 }],
    slots: [{ project, start: utcAtLocalMidnight("2026-10-01"), end: utcAtLocalMidnight("2026-10-11"), hours: 100 }]
  });
  assertTotals(totalsFor(dashboard,
    { months: dataset.months, rows: dataset.actualRows, lines: dataset.lines },
    { months: dataset.months, rows: dataset.plannedRows, slots: dataset.slots }
  ), 20, 50);
});

test("rendered project row shows foreseen before actual and preserves drilldown", () => {
  const dashboard = loadDashboard();
  const name = "[10001] Project <review> & test";
  const key = dashboard.projectColorKey(name);
  dashboard.state.activeProjectKey = key;
  const html = dashboard.renderRemainingRow({
    key, name, actual: 160, planned: 200, remaining: 40,
    actualToDate: 80, foreseenToDate: 100
  });
  assert.ok(html.indexOf(">Foreseen</span>") >= 0);
  assert.ok(html.indexOf(">Foreseen</span>") < html.indexOf(">Actual</span>"));
  assert.match(html, /data-project-drilldown="true"/);
  assert.match(html, /data-project-name="\[10001\] Project &lt;review&gt; &amp; test"/);
  assert.match(html, /remaining-row active/);
  const bars = Array.from(html.matchAll(/class="remaining-bar ([^"]+)" style="width:([\d.]+)%"/g),
    ([, status, width]) => ({ status, width: Number(width) }));
  assert.deepEqual(bars, [{ status: "foreseen", width: 100 }, { status: "orange", width: 80 }]);
  assert.doesNotMatch(html, /NaN|width:Infinity/);
});
