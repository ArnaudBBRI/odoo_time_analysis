const assert = require("node:assert/strict");
const test = require("node:test");
const { availableYears, normalizeScope, summarizeProjects, buildSectors, calendarProgress, projectCalendarProgress, render } = require("../personal-time");
const { domFixture } = require("./dom-fixture");

const today = new Date("2026-10-08T10:00:00Z");
const project = (id, name = `Project ${id}`) => ({ id, name });
const line = (projectId, date, hours) => ({ projectId, project: `Project ${projectId}`, date, hours });
const slot = (projectId, start, end, hours) => ({ projectId, project: `Project ${projectId}`, start, end, hours });
const data = (lines = [], slots = [], projects = [project(1), project(2)]) => ({
  projects, timesheets: { lines }, planning: { slots }
});
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9,
  message || `Expected ${actual} to be within 1e-9 of ${expected}`);

test("custom scope validates inclusive dates independently of available data years", () => {
  const input = Object.freeze({ startDate: "2024-02-28", endDate: "2024-03-01" });
  const scope = normalizeScope(input);
  assert.equal(scope.kind, "range");
  assert.equal(scope.startDate, input.startDate);
  assert.equal(scope.endDate, input.endDate);
  assert.equal((scope.periods[0].end - scope.periods[0].start) / 864e5, 3);
  assert.equal(new Date(scope.planningPeriods[0].start).toISOString(), "2024-02-27T23:00:00.000Z");
  assert.equal(new Date(scope.planningPeriods[0].end).toISOString(), "2024-03-01T23:00:00.000Z");
  assert.deepEqual(input, { startDate: "2024-02-28", endDate: "2024-03-01" });
  const earliest = normalizeScope({ startDate: "0001-01-01", endDate: "0001-01-03" });
  assert.equal(earliest.planningPeriods[0].end - earliest.planningPeriods[0].start, 3 * 864e5,
    "Ancient years retain finite planning boundaries without Date.UTC's 1900 offset for small years");
  assert.equal(calendarProgress({ startDate: "0001-01-01", endDate: "0001-01-03" }, "0001-01-02").fraction, 0.5);
  const maximum = normalizeScope({ startDate: "9998-12-31", endDate: "9998-12-31" });
  assert.equal(maximum.planningPeriods[0].end - maximum.planningPeriods[0].start, 864e5);
});

test("invalid or incomplete custom ranges produce no totals or calendar references", () => {
  const invalid = [{ startDate: "2026-01-01" }, { endDate: "2026-01-01" },
    { startDate: "2026-02-29", endDate: "2026-03-01" },
    { startDate: "2026-03-02", endDate: "2026-03-01" },
    { startDate: "0000-01-01", endDate: "2026-01-01" },
    { startDate: "9999-01-01", endDate: "9999-12-31" },
    { startDate: new Date("2026-01-01"), endDate: "2026-01-02" },
    { startDate: "2026-01-01T00:00:00Z", endDate: "2026-01-02" }];
  const source = data([line(1, "2026-01-01", 10)]);
  for (const scope of invalid) {
    assert.equal(normalizeScope(scope), null);
    assert.deepEqual(summarizeProjects(source, scope, today), []);
    assert.equal(calendarProgress(scope, today), null);
    assert.equal(projectCalendarProgress(scope, "2026-01-01", "2026-12-31", today), null);
  }
});

test("custom actuals include both Brussels dates, retain credits and stop at today", () => {
  const source = data([line(1, "2026-10-06", 100), line(1, "2026-10-06T22:30:00Z", 3),
    line(1, "2026-10-07", 7), line(1, "2026-10-08", 5), line(1, "2026-10-08", -2),
    line(1, "2026-10-08T22:30:00Z", 200), line(1, "2026-10-09", 300)]);
  const scope = { startDate: "2026-10-07", endDate: "2026-10-08" };
  assert.equal(summarizeProjects(source, scope, today)[0].actual, 13);
  assert.equal(summarizeProjects(source, { ...scope, endDate: "2026-10-10" }, today)[0].actual, 13,
    "Extending the scope into the future never includes future actuals");
});

test("custom planning prorates exact Brussels midnight intervals across DST", () => {
  for (const [scope, start, end, total, expected] of [
    [{ startDate: "2026-03-29", endDate: "2026-03-29" }, "2026-03-28T23:00:00Z", "2026-03-30T22:00:00Z", 47, 23],
    [{ startDate: "2026-10-25", endDate: "2026-10-25" }, "2026-10-24T22:00:00Z", "2026-10-26T23:00:00Z", 49, 25]
  ]) {
    const normalized = normalizeScope(scope);
    close((normalized.planningPeriods[0].end - normalized.planningPeriods[0].start) / 36e5, expected);
    const rows = summarizeProjects(data([], [slot(1, start, end, total)]), scope, today);
    close(rows[0].planned, expected, "Planning uses elapsed slot duration rather than treating DST days as 24 hours");
  }
});

test("custom planning includes future allocations and excludes slots touching either boundary", () => {
  const scope = { startDate: "2026-10-07", endDate: "2026-10-08" };
  const source = data([], [
    slot(1, "2026-10-06T22:00:00Z", "2026-10-08T22:00:00Z", 48),
    slot(1, "2026-10-06T21:00:00Z", "2026-10-06T22:00:00Z", 100),
    slot(1, "2026-10-08T22:00:00Z", "2026-10-09T22:00:00Z", 100)
  ]);
  close(summarizeProjects(source, scope, new Date("2026-10-01T12:00:00Z"))[0].planned, 48);
});

test("custom scope keeps unknown planning distinct and omits zero-net or absent projects", () => {
  const scope = { startDate: "2026-10-07", endDate: "2026-10-08" };
  const source = data([line(1, "2026-10-07", 3), line(1, "2026-10-08", -3),
    line(2, "2026-10-06", 90), line(3, "2026-10-08", -4)], [], [project(1), project(2), project(3)]);
  const rows = summarizeProjects({ ...source, planning: null }, scope, today);
  assert.deepEqual(rows.map(row => row.id), [3]);
  assert.equal(rows[0].planned, null);
  assert.equal(rows[0].actual, -4);
  assert.deepEqual(summarizeProjects(source, { startDate: "2040-01-01", endDate: "2040-01-31" }, today), []);
});

test("year and null scopes preserve UTC planning and full-history summary behavior", () => {
  const source = data([line(1, "2025-01-01", 2), line(1, "2026-01-01", 3)], [
    slot(1, "2026-12-31T23:30:00Z", "2027-01-01T00:30:00Z", 1)
  ]);
  const years = Object.freeze([2026, "2025", 2026]);
  assert.equal(normalizeScope(years).kind, "years");
  assert.deepEqual(normalizeScope(years).years, [2025, 2026]);
  assert.equal(summarizeProjects(source, [2026], today)[0].planned, 0.5);
  assert.equal(summarizeProjects(source, { startDate: "2026-01-01", endDate: "2026-12-31" }, today)[0].planned, 0);
  assert.equal(summarizeProjects(source, null, today)[0].actual, 5);
  assert.equal(summarizeProjects(source, null, today)[0].planned, 1);
  assert.deepEqual(years, [2026, "2025", 2026]);
});

test("custom calendar progress counts dates across leap days and DST, with first/last anchors", () => {
  for (const [scope, dates] of [
    [{ startDate: "2024-02-28", endDate: "2024-03-01" }, ["2024-02-28", "2024-02-29", "2024-03-01"]],
    [{ startDate: "2026-03-28", endDate: "2026-03-30" }, ["2026-03-28", "2026-03-29", "2026-03-30"]],
    [{ startDate: "2026-10-24", endDate: "2026-10-26" }, ["2026-10-24", "2026-10-25", "2026-10-26"]]
  ]) {
    dates.forEach((date, index) => {
      const result = calendarProgress(scope, date);
      close(result.fraction, index / 2);
      close(result.radiusRatio ** 2, result.fraction);
    });
  }
  const scope = { startDate: "2026-10-07", endDate: "2026-10-09" };
  assert.equal(calendarProgress(scope, "2026-10-06").fraction, 0);
  assert.equal(calendarProgress(scope, "2026-10-10").fraction, 1);
  assert.equal(calendarProgress(scope, "2026-10-07T22:30:00Z").fraction, 0.5);
});

test("single-day custom macro and project references complete on that day", () => {
  const scope = { startDate: "2026-10-08", endDate: "2026-10-08" };
  for (const [date, fraction] of [["2026-10-07", 0], ["2026-10-08", 1], ["2026-10-09", 1]]) {
    assert.equal(calendarProgress(scope, date).fraction, fraction);
    assert.equal(projectCalendarProgress(scope, "2026-01-01", "2026-12-31", date).fraction, fraction);
  }
});

test("custom project references clip both boundaries without clipping recorded scoped hours", () => {
  const scope = { startDate: "2025-11-01", endDate: "2026-02-28" };
  const result = projectCalendarProgress(scope, "2025-12-01", "2026-01-31", "2026-01-01");
  assert.deepEqual(result, { fraction: 31 / 61, startDate: "2025-12-01", endDate: "2026-01-31", calendarDays: 62 });
  assert.equal(projectCalendarProgress(scope, "2026-03-01", "2026-04-01", today), null);
  assert.equal(projectCalendarProgress(scope, null, "2026-04-01", today), null);
  const source = data([line(1, "2025-11-30", 8), line(1, "2026-02-01", 4)]);
  assert.equal(summarizeProjects(source, scope, today)[0].actual, 12,
    "Source hours inside the chosen scope remain visible outside the project's date reference");
});

test("macro render uses custom scope ahead of legacy years for its calendar ring", () => {
  const container = domFixture();
  render(container, [{ ...project(1), planned: 100, actual: 50 }], {
    years: [2025], scope: { startDate: "2026-10-07", endDate: "2026-10-09" }, now: today
  });
  const ring = container.querySelectorAll(".personal-time-calendar-ring")[0];
  assert.ok(ring);
  close(Number(ring.getAttribute("data-calendar-fraction")), 0.5);
  close(Number(ring.getAttribute("r")), 190 * Math.sqrt(0.5));
  assert.match(container.querySelectorAll(".personal-time-calendar-reference")[0].getAttribute("aria-label"), /période sélectionnée/);
});

test("personal actuals retain credits and include only selected years through Brussels today", () => {
  const input = data([
    line(1, "2025-12-31", 100), line(1, "2026-10-07", 10),
    line(1, "2026-10-08", 5), line(1, "2026-10-08", -2),
    line(1, "2026-10-09", 200), line(1, "2027-01-01", 300)
  ]);
  const rows = summarizeProjects(input, new Set([2026]), today);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 1);
  assert.equal(rows[0].actual, 13);
  assert.equal(rows[0].planned, 0);
  assert.equal(rows[0].involved, true);
});

test("UTC timestamps use the Brussels calendar day while date-only actuals keep their date", () => {
  const input = data([
    line(1, "2026-10-07T23:30:00Z", 2), // October 8 in Brussels.
    line(1, "2026-10-08 21:30:00", 3), // Odoo datetime: October 8, 23:30 local.
    line(1, "2026-10-08T23:30:00Z", 40), // October 9 in Brussels.
    line(1, "2026-10-08", 5)
  ]);
  const rows = summarizeProjects(input, [2026], new Date("2026-10-08T22:00:00Z"));
  // UTC 22:00 is already October 9 locally, so all October 9 entries are included.
  assert.equal(rows[0].actual, 50);
  assert.equal(summarizeProjects(input, [2026], today)[0].actual, 10);
});

test("planning covers complete selected UTC years and prorates disjoint years without their gap", () => {
  const input = data([], [slot(1, "2024-01-01T00:00:00Z", "2027-01-01T00:00:00Z", 1096)]);
  const rows = summarizeProjects(input, new Set([2024, 2026]), today);
  assert.equal(rows.length, 1);
  close(rows[0].planned, 731); // Leap year 2024 + 2026, excluding all 365 days of 2025.
  assert.equal(rows[0].actual, 0);
  assert.deepEqual(availableYears(input), [2024, 2025, 2026]);
  assert.deepEqual(summarizeProjects(input, [2027], today), [], "Planning end is exclusive");
});

test("future planning stays in the annual plan while future actuals do not enter consumption", () => {
  const input = data([line(1, "2027-03-01", 80)], [
    slot(1, "2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z", 60),
    slot(1, "2027-01-01T00:00:00Z", "2028-01-01T00:00:00Z", 200)
  ]);
  const rows = summarizeProjects(input, [2026, 2027], today);
  assert.equal(rows[0].planned, 260);
  assert.equal(rows[0].actual, 0);
});

test("only involved project IDs appear and equal display names remain distinct", () => {
  const input = data([line(1, "2026-01-01", 4)], [
    slot(2, "2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z", 8),
    slot(3, "2025-01-01T00:00:00Z", "2025-01-02T00:00:00Z", 500)
  ], [project(1, "Shared name"), project(2, "Shared name"), project(3), project(4)]);
  const rows = summarizeProjects(input, [2026], today);
  assert.deepEqual(rows.map(row => row.id).sort(), [1, 2]);
  assert.deepEqual(rows.map(row => row.name), ["Shared name (ID 2)", "Shared name (ID 1)"]);
  assert.equal(rows.find(row => row.id === 1).actual, 4);
  assert.equal(rows.find(row => row.id === 2).planned, 8);
});

test("unknown planning remains unknown rather than becoming a zero-hour budget", () => {
  const input = data([line(1, "2026-01-01", 12)]);
  const known = summarizeProjects(input, [2026], today);
  const unknown = summarizeProjects({ ...input, planning: null, planningError: "Unavailable" }, [2026], today);
  assert.equal(known[0].planned, 0);
  assert.equal(unknown[0].planned, null);
  assert.equal(unknown[0].actual, 12);
  assert.deepEqual(buildSectors(unknown), []);
});

test("the selected-year legend omits old-year, zero-hour, future-only and zero-net projects", () => {
  const input = data([
    line(1, "2025-06-01", 40),
    line(2, "2026-06-01", 0),
    line(3, "2026-10-09", 12),
    line(4, "2026-06-01", 5), line(4, "2026-06-02", -5)
  ], [
    slot(1, "2025-01-01T00:00:00Z", "2026-01-01T00:00:00Z", 80),
    slot(2, "2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z", 0)
  ], Array.from({ length: 5 }, (_, index) => project(index + 1)));
  assert.deepEqual(summarizeProjects(input, [2026], today), []);
});

test("the selected-year legend retains nonzero planning, actuals and negative corrections", () => {
  const input = data([
    line(1, "2026-10-08", 4), line(2, "2026-10-08", -2)
  ], [slot(3, "2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z", 10)], [project(1), project(2), project(3)]);
  const rows = summarizeProjects(input, [2026], today);
  assert.deepEqual(rows.map(row => row.id), [3, 1, 2]);
  assert.equal(rows.find(row => row.id === 1).actual, 4);
  assert.equal(rows.find(row => row.id === 2).actual, -2);
  assert.equal(rows.find(row => row.id === 3).planned, 10);
  assert.equal(rows.find(row => row.id === 3).actual, 0);
});

test("unknown planning does not retain an inactive legend row or hide nonzero actuals", () => {
  const input = { ...data([
    line(1, "2026-01-01", 0), line(2, "2026-10-09", 12),
    line(3, "2026-10-08", -3), line(4, "2026-10-08", 2),
    line(5, "2026-10-07", 7), line(5, "2026-10-08", -7)
  ]), planning: null };
  const rows = summarizeProjects(input, [2026], today);
  assert.deepEqual(rows.map(row => row.id), [3, 4]);
  assert.ok(rows.every(row => row.planned === null));
  assert.equal(rows[0].actual, -3);
  assert.equal(rows[1].actual, 2);
});

test("available years combine actuals and interval spans in sorted unique order", () => {
  const input = data([line(1, "2026-01-01", 1), line(1, "2024-06-01", 1)], [
    slot(2, "2025-12-31T00:00:00Z", "2027-01-01T00:00:00Z", 2)
  ]);
  assert.deepEqual(availableYears(input), [2024, 2025, 2026]);
});

test("positive planned projects lead the legend, with alphabetical order inside both groups", () => {
  const projects = [project(1, "Alpha actual"), project(2, "Zulu planned"), project(3, "Bravo actual"),
    project(4, "Able planned"), project(5, "Aaron negative plan")];
  const input = data([line(1, "2026-01-01", 4), line(3, "2026-01-01", 5)], [
    slot(2, "2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z", 20),
    slot(4, "2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z", 10),
    slot(5, "2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z", -1)
  ], projects);
  assert.deepEqual(summarizeProjects(input, [2026], today).map(row => row.id), [4, 2, 5, 1, 3]);
  const container = domFixture();
  const rows = [
    { ...projects[0], planned: 0, actual: 4 }, { ...projects[1], planned: 20, actual: 0 },
    { ...projects[2], planned: null, actual: 5 }, { ...projects[3], planned: 10, actual: 0 },
    { ...projects[4], planned: -1, actual: 0 }
  ];
  const before = structuredClone(rows);
  render(container, rows, { hiddenIds: new Set([2]) });
  assert.deepEqual(container.querySelectorAll("[data-personal-id]").map(button => button.getAttribute("data-personal-id")),
    ["4", "2", "3", "5", "1"]);
  assert.deepEqual(rows, before, "Legend sorting must not reorder the caller's project array");
});

test("calendar progress uses first/last selected dates, clamps outside scope and scales radius by area", () => {
  for (const date of ["2025-12-31T12:00:00Z", "2026-01-01T12:00:00Z"]) {
    const progress = calendarProgress([2026], new Date(date));
    assert.equal(progress.fraction, 0);
    assert.equal(progress.radiusRatio, 0);
  }
  for (const date of ["2026-12-31T12:00:00Z", "2027-01-01T12:00:00Z"]) {
    const progress = calendarProgress([2026], new Date(date));
    assert.equal(progress.fraction, 1);
    assert.equal(progress.radiusRatio, 1);
  }
  const midpoint = calendarProgress([2026, "2026", 2026], new Date("2026-07-02T12:00:00Z"));
  close(midpoint.fraction, 0.5);
  close(midpoint.radiusRatio, Math.sqrt(0.5));
  close(midpoint.radiusRatio ** 2, midpoint.fraction, "Calendar and actual fills share the area scale");
  close(calendarProgress([2026], new Date("2026-01-01T23:30:00Z")).fraction, 1 / 364,
    "UTC late evening advances to the next Brussels calendar day");
});

test("calendar progress counts leap days and freezes while selected years have a gap", () => {
  close(calendarProgress([2024], new Date("2024-02-29T12:00:00Z")).fraction, 59 / 365);
  close(calendarProgress([2024], new Date("2024-03-01T12:00:00Z")).fraction, 60 / 365);
  for (const date of ["2025-01-01T12:00:00Z", "2025-08-01T12:00:00Z", "2026-01-01T12:00:00Z"]) {
    close(calendarProgress(new Set([2026, 2024]), new Date(date)).fraction, 366 / 730);
  }
  close(calendarProgress([2024, 2026], new Date("2026-07-02T12:00:00Z")).fraction, (366 + 182) / 730);
});

test("calendar progress omits invalid dates and empty or invalid year selections", () => {
  assert.equal(calendarProgress([], today), null);
  assert.equal(calendarProgress(new Set(), today), null);
  assert.equal(calendarProgress([0, "invalid", 10000], today), null);
  assert.equal(calendarProgress([2026], new Date(NaN)), null);
  assert.equal(calendarProgress([2026], true), null);
  assert.equal(calendarProgress([2026], false), null);
  assert.equal(normalizeScope([true, false, null, undefined]), null);
});

test("project calendar intersects selected years with a December project start", () => {
  const start = "2025-12-01", end = "2028-05-31", current = new Date("2026-07-02T12:00:00Z");
  const oneYear = projectCalendarProgress([2026], start, end, current);
  const bothYears = projectCalendarProgress([2025, 2026], start, end, current);
  assert.deepEqual(oneYear, { fraction: 0.5, startDate: "2026-01-01", endDate: "2026-12-31", calendarDays: 365 });
  assert.equal(bothYears.calendarDays, 396, "2025 adds December's 31 days, not the full year");
  assert.equal(bothYears.startDate, start);
  assert.equal(bothYears.endDate, "2026-12-31");
  close(bothYears.fraction, (31 + 182) / 395);
  assert.notEqual(bothYears.fraction, calendarProgress([2025, 2026], current).fraction);
});

test("project calendar anchors the first and last eligible days and clamps outside them", () => {
  for (const date of ["2025-11-30", "2025-12-01"]) {
    assert.equal(projectCalendarProgress([2025, 2026], "2025-12-01", "2026-03-31", date).fraction, 0);
  }
  for (const date of ["2026-03-31", "2026-04-01", "2028-01-01"]) {
    const progress = projectCalendarProgress([2025, 2026], "2025-12-01", "2026-03-31", date);
    assert.equal(progress.fraction, 1);
    assert.equal(progress.calendarDays, 121);
    assert.equal(progress.endDate, "2026-03-31");
  }
  const partialLastYear = projectCalendarProgress([2026], "2025-12-01", "2026-03-31", "2026-01-01");
  assert.deepEqual(partialLastYear, { fraction: 0, startDate: "2026-01-01", endDate: "2026-03-31", calendarDays: 90 });
});

test("project calendar counts leap days and uses Brussels today without DST weighting", () => {
  const leap = projectCalendarProgress([2024], "2024-02-28", "2024-03-01", "2024-02-29");
  assert.deepEqual(leap, { fraction: 0.5, startDate: "2024-02-28", endDate: "2024-03-01", calendarDays: 3 });
  const overnight = projectCalendarProgress([2026], "2026-03-28", "2026-03-30", new Date("2026-03-28T23:30:00Z"));
  assert.equal(overnight.fraction, 0.5, "UTC late evening is already March 29 in Brussels");
  assert.equal(overnight.calendarDays, 3);
  assert.equal(projectCalendarProgress([2026], "2026-03-28", "2026-03-30", "2026-03-30").fraction, 1);
});

test("project calendar excludes unselected year gaps and freezes within them", () => {
  const years = new Set([2026, 2024]);
  for (const date of ["2025-01-01", "2025-08-01", "2026-01-01"]) {
    const progress = projectCalendarProgress(years, "2024-12-01", "2026-01-31", date);
    close(progress.fraction, 31 / 61);
    assert.equal(progress.calendarDays, 62);
    assert.equal(progress.startDate, "2024-12-01");
    assert.equal(progress.endDate, "2026-01-31");
  }
  close(projectCalendarProgress(years, "2024-12-01", "2026-01-31", "2026-01-02").fraction, 32 / 61);
});

test("a single eligible project day is complete on that date", () => {
  const values = [["2026-01-08", 0], ["2026-01-09", 1], ["2026-01-10", 1]];
  for (const [current, fraction] of values) {
    assert.deepEqual(projectCalendarProgress([2026], "2026-01-09", "2026-01-09", current),
      { fraction, startDate: "2026-01-09", endDate: "2026-01-09", calendarDays: 1 });
  }
});

test("project calendar returns no reference for invalid, missing or reversed project boundaries", () => {
  for (const value of [null, undefined, false, "", "2026-02-30", "0000-01-01", "2026-01-01T00:00:00Z", "invalid"]) {
    assert.equal(projectCalendarProgress([2026], value, "2026-12-31", today), null);
    assert.equal(projectCalendarProgress([2026], "2026-01-01", value, today), null);
  }
  assert.equal(projectCalendarProgress([2026], "2026-12-31", "2026-01-01", today), null);
  assert.equal(projectCalendarProgress([2026], "2026-01-01", "2026-12-31", new Date(NaN)), null);
  assert.equal(projectCalendarProgress([2026], "2026-01-01", "2026-12-31", true), null);
});

test("project calendar returns no reference when selected years do not overlap the project", () => {
  for (const years of [[], new Set(), [0, "invalid", 10000], [2024], [2027], [2024, 2027]]) {
    assert.equal(projectCalendarProgress(years, "2025-12-01", "2026-12-31", today), null);
  }
  assert.equal(projectCalendarProgress([2025], "2026-01-01", "2026-12-31", today), null);
  assert.equal(projectCalendarProgress([2027], "2025-12-01", "2026-12-31", today), null);
});

test("project calendar normalizes duplicate years without mutating the caller's inputs", () => {
  const years = Object.freeze([2026, "2025", 2026, "invalid"]), current = new Date("2026-07-02T12:00:00Z");
  const before = current.getTime();
  assert.deepEqual(projectCalendarProgress(years, "2025-12-01", "2028-05-31", current),
    projectCalendarProgress([2025, 2026], "2025-12-01", "2028-05-31", current));
  assert.equal(current.getTime(), before);
  assert.deepEqual(years, [2026, "2025", 2026, "invalid"]);
});

test("radial angles encode planned proportions and fill area encodes consumed proportions", () => {
  const rows = [{ ...project(1), planned: 25, actual: 6.25 }, { ...project(2), planned: 75, actual: 75 }];
  const sectors = buildSectors(rows);
  assert.equal(sectors.length, 2);
  close(sectors[0].startAngle, -Math.PI / 2);
  close(sectors[0].endAngle - sectors[0].startAngle, Math.PI / 2);
  close(sectors[1].startAngle, sectors[0].endAngle);
  close(sectors[1].endAngle - sectors[1].startAngle, 3 * Math.PI / 2);
  close(sectors[1].endAngle - sectors[0].startAngle, 2 * Math.PI);
  close(sectors[0].fillRatio, 0.25);
  close(sectors[0].fillRadiusRatio, 0.5);
  close(sectors[0].fillRadiusRatio ** 2, sectors[0].fillRatio,
    "Filled area must use square-root radius, not linear radius");
});

test("overruns cap fill at the full sector and signed negative actuals stay visible numerically", () => {
  const sectors = buildSectors([
    { ...project(1), planned: 100, actual: 150 },
    { ...project(2), planned: 100, actual: -12 }
  ]);
  assert.equal(sectors[0].actual, 150);
  assert.equal(sectors[0].overrun, 50);
  assert.equal(sectors[0].fillRatio, 1);
  assert.equal(sectors[0].fillRadiusRatio, 1);
  assert.equal(sectors[1].actual, -12);
  assert.equal(sectors[1].fillRatio, 0);
  assert.equal(sectors[1].fillRadiusRatio, 0);
  assert.equal(sectors[1].overrun, 0);
});

test("zero and unknown plans have no invented radial sector", () => {
  assert.deepEqual(buildSectors([
    { ...project(1), planned: 0, actual: 12 },
    { ...project(2), planned: null, actual: 10 }
  ]), []);
});

test("legend exclusion reallocates angles by project ID without mutating source totals", () => {
  const rows = [
    { ...project(1, "Same name"), planned: 25, actual: 5 },
    { ...project(2, "Same name"), planned: 75, actual: 30 }
  ];
  const before = structuredClone(rows);
  const hidden = new Set(["1"]);
  const sectors = buildSectors(rows, hidden);
  assert.deepEqual(sectors.map(row => row.id), [2]);
  close(sectors[0].endAngle - sectors[0].startAngle, 2 * Math.PI);
  assert.deepEqual(rows, before);
  assert.deepEqual([...hidden], ["1"]);
  assert.equal(buildSectors(rows).length, 2, "Show all restores the original project population");
});

test("chart legend keeps zero and unknown budgets inspectable and renders project names as safe text", () => {
  const container = domFixture();
  const name = '<img src=x onerror="PRIVATE_SCRIPT()">';
  render(container, [
    { id: 1, name, planned: 0, actual: 12 },
    { ...project(2), planned: null, actual: -2 }
  ]);
  assert.equal(container.querySelectorAll("[data-personal-sector]").length, 0);
  assert.equal(container.querySelectorAll("[data-personal-id]").length, 2);
  assert.ok(container.textContent.includes(name));
  assert.match(container.textContent, /Planning indisponible/);
  assert.match(container.textContent, /Sans heures prévues/);
  assert.match(container.textContent, /Correction nette/);
  assert.equal(container.querySelectorAll("img").length, 0);
});

test("stable metric identities keep standard order, signed visible totals and accessible notes in both render modes", () => {
  const rows = [{ ...project(1), planned: 100, actual: 12.5 },
    { ...project(2), planned: null, actual: -2 }, { ...project(3), planned: 50, actual: 10 }];
  const original = structuredClone(rows);
  for (const embedded of [false, true]) {
    const container = domFixture();
    const card = render(container, rows, { embedded, scopeLabel: "2026", hiddenIds: new Set([3]) });
    const metrics = container.querySelectorAll(".personal-time-metrics")[0];
    assert.equal(metrics.parentElement, card, "CSS placement must not reparent the existing metrics");
    assert.deepEqual(metrics.children.map(metric => metric.getAttribute("data-personal-metric")), ["planned", "actual"],
      "Standard DOM order remains planned then actual; only wide CSS changes visual order");
    const planned = metrics.children[0], actual = metrics.children[1];
    assert.equal(planned.querySelectorAll(".personal-time-metric-label")[0].textContent, "Prévu sur la période");
    assert.equal(planned.querySelectorAll(".personal-time-metric-value")[0].textContent, "100 h");
    assert.equal(actual.querySelectorAll(".personal-time-metric-label")[0].textContent, "Réalisé à ce jour");
    assert.equal(actual.querySelectorAll(".personal-time-metric-value")[0].textContent, "10,5 h");
    for (const metric of metrics.children) {
      const note = metric.querySelectorAll(".personal-time-metric-note")[0];
      assert.ok(note.textContent, "Wide presentation retains the explanatory text for assistive technology");
      assert.equal(note.hidden, false); assert.notEqual(note.getAttribute("aria-hidden"), "true");
    }
    assert.equal(container.querySelectorAll(".personal-time-chart-area")[0].contains(metrics), false);
    assert.equal(container.querySelectorAll('[role="tooltip"]')[0].parentElement, card);
  }
  assert.deepEqual(rows, original);
});

test("project legend mirrors overruns and states the remaining scoped allowance only for known positive plans and actuals", () => {
  const container = domFixture();
  const inputs = [
    [100, 70, "Plus que 30 h prévues disponibles d’ici au 31/12/2026"], [100, 0, "Plus que 100 h prévues disponibles d’ici au 31/12/2026"],
    [100, -5, "Plus que 105 h prévues disponibles d’ici au 31/12/2026"], ["100", "70", "Plus que 30 h prévues disponibles d’ici au 31/12/2026"],
    [100, 100, null], [100, 110, null], [0, 10, null], [null, 50, null],
    [100, null, null], [100, undefined, null], [100, " ", null],
    [100, NaN, null], [100, Infinity, null], [Infinity, 1, null], [-5, -10, null]
  ];
  const rows = inputs.map(([planned, actual], index) => ({ ...project(index + 1), planned, actual }));
  render(container, rows, { hiddenIds: new Set([1]), years: [2026] });
  inputs.forEach(([, , expected], index) => {
    const button = container.querySelectorAll(`[data-personal-id="${index + 1}"]`)[0];
    assert.ok(button, `Project ${index + 1} remains inspectable`);
    const badges = button.querySelectorAll(".is-below");
    assert.deepEqual(badges.map(badge => badge.textContent), expected ? [expected] : []);
  });
  assert.equal(container.querySelectorAll('[data-personal-id="6"]')[0].querySelectorAll(".is-overrun")[0].textContent,
    "+10 h au-delà du prévu", "Existing overrun text is unchanged");
  assert.equal(container.querySelectorAll('[data-personal-id="7"]')[0].querySelectorAll(".is-overrun")[0].textContent,
    "Sans heures prévues");
  assert.equal(container.querySelectorAll('[data-personal-id="8"]')[0].querySelectorAll(".is-unknown")[0].textContent,
    "Planning indisponible");
  assert.equal(container.querySelectorAll('[data-personal-id="3"]')[0].querySelectorAll(".is-credit")[0].textContent,
    "Correction nette", "A shortfall does not conceal signed credit context");
});

test("remaining pie legend allowance ends at the normalized selected scope, independently of project dates, with an explicit unavailable fallback", () => {
  const container = domFixture(), rows = [{ ...project(1), planned: 200, actual: 46.5,
    startDate: "2026-01-01", endDate: "2026-09-30" }], before = structuredClone(rows);
  const prefix = "Plus que 153,5 h prévues disponibles";
  for (const [options, suffix] of [
    [{ years: [2027, 2025, 2027] }, " d’ici au 31/12/2027"],
    [{ years: [2027], scope: { startDate: "2026-08-01", endDate: "2026-12-15" } }, " d’ici au 15/12/2026"],
    [{ scope: { startDate: "2026-08-01", endDate: "2026-08-01" } }, " d’ici au 01/08/2026"],
    [{}, " sur la période sélectionnée (date de fin indisponible)"],
    [{ years: [2026], scope: { startDate: "2026-08-01", endDate: "2026-02-30" } }, " sur la période sélectionnée (date de fin indisponible)"]
  ]) {
    render(container, rows, options);
    assert.equal(container.querySelectorAll(".is-below")[0].textContent, prefix + suffix);
    assert.deepEqual(rows, before, "The clearer badge must not change source totals or project dates");
  }
});

test("controlled legend toggles use stable IDs and SVG details support keyboard and touch", () => {
  const container = domFixture();
  const rows = [{ ...project(1), planned: 25, actual: 6.25 }, { ...project(2), planned: 75, actual: 90 }];
  const toggled = [];
  const hidden = new Set();
  const card = render(container, rows, { hiddenIds: hidden, onToggle: id => toggled.push(id) });
  const legend = container.querySelectorAll('[data-personal-id="1"]')[0];
  assert.equal(legend.getAttribute("aria-pressed"), "true");
  legend.dispatch("click");
  assert.deepEqual(toggled, [1]);
  assert.equal(hidden.size, 0, "Controlled callbacks own visibility state");
  const sector = container.querySelectorAll('[data-personal-sector="2"]')[0];
  assert.equal(sector.getAttribute("tabindex"), "0");
  const tooltip = container.querySelectorAll('[role="tooltip"]')[0];
  sector.focus();
  assert.equal(tooltip.hidden, false);
  assert.match(tooltip.textContent, /Project 2/);
  assert.match(tooltip.textContent, /75 h/);
  assert.match(tooltip.textContent, /90 h/);
  assert.match(tooltip.textContent, /au-delà du prévu/);
  assert.equal(sector.getAttribute("aria-describedby"), tooltip.id);
  card.dispatch("keydown", { key: "Escape" });
  assert.equal(tooltip.hidden, true);
  sector.dispatch("click");
  assert.equal(tooltip.hidden, false);
  sector.dispatch("click");
  assert.equal(tooltip.hidden, true, "A second touch closes the pinned detail");
  render(container, rows, { hiddenIds: new Set([1]) });
  assert.equal(container.querySelectorAll('[data-personal-id="1"]')[0].getAttribute("aria-pressed"), "false");
  assert.equal(container.querySelectorAll("[data-personal-sector]").length, 1);
});

test("standalone legend hides locally, preserves source values and restores all hidden projects", () => {
  const container = domFixture();
  const rows = [{ ...project(1), planned: 20, actual: 5 }, { ...project(2), planned: 80, actual: 10 }];
  const before = structuredClone(rows);
  render(container, rows);
  container.querySelectorAll('[data-personal-id="1"]')[0].dispatch("click");
  assert.equal(container.querySelectorAll("[data-personal-sector]").length, 1);
  assert.equal(container.querySelectorAll('[data-personal-id="1"]')[0].getAttribute("aria-pressed"), "false");
  container.querySelectorAll('[data-personal-id="2"]')[0].dispatch("click");
  assert.equal(container.querySelectorAll("[data-personal-sector]").length, 0);
  assert.match(container.textContent, /Tous les projets sont masqués/);
  const restore = container.querySelectorAll("button").find(button => button.textContent === "Tout afficher");
  assert.ok(restore);
  restore.dispatch("click");
  assert.equal(container.querySelectorAll("[data-personal-sector]").length, 2);
  assert.ok(container.querySelectorAll("[data-personal-id]").every(button => button.getAttribute("aria-pressed") === "true"));
  assert.deepEqual(rows, before);
});

test("more than twelve projects keep distinct stable colors through visibility and year-subset changes", () => {
  const container = domFixture();
  const rows = Array.from({ length: 14 }, (_, index) => ({ ...project(index + 1), planned: 20, actual: 5 }));
  const colors = () => new Map(container.querySelectorAll("[data-personal-id]").map(button => [
    button.getAttribute("data-personal-id"), button.querySelectorAll(".personal-time-legend-dot")[0].style.backgroundColor
  ]));
  render(container, rows);
  const original = colors();
  assert.equal(original.size, 14);
  assert.equal(new Set(original.values()).size, 14, "The project palette must remain distinct beyond twelve entries");
  render(container, rows, { hiddenIds: new Set([1, 13]) });
  assert.deepEqual(colors(), original, "Hiding a project must not recolor any legend entry");
  render(container, rows.filter(row => [1, 13, 14].includes(row.id)));
  for (const [id, color] of colors()) assert.equal(color, original.get(id), `Project ${id} keeps its color in another year's subset`);
  render(container, rows);
  assert.deepEqual(colors(), original, "Restoring the full period preserves the original colors");
});

test("calendar reference ring shares the area radius and survives legend and detail interactions", () => {
  const container = domFixture();
  const rows = [{ ...project(1), planned: 100, actual: 50 }, { ...project(2), planned: 100, actual: 50 }];
  const options = { years: [2026], now: new Date("2026-07-02T12:00:00Z") };
  render(container, rows, options);
  let ring = container.querySelectorAll(".personal-time-calendar-ring")[0];
  assert.ok(ring);
  assert.equal(ring.tagName, "circle");
  close(Number(ring.getAttribute("r")), 190 * Math.sqrt(0.5));
  close(Number(ring.getAttribute("data-calendar-fraction")), 0.5);
  close(Number(container.querySelectorAll("radialGradient")[0].getAttribute("r")), Number(ring.getAttribute("r")),
    "Half the calendar and half the budget use the same area radius");
  container.querySelectorAll('[data-personal-sector="1"]')[0].focus();
  assert.equal(container.querySelectorAll('[role="tooltip"]')[0].hidden, false);
  container.querySelectorAll('[data-personal-id="1"]')[0].dispatch("click");
  assert.equal(container.querySelectorAll("[data-personal-sector]").length, 1);
  ring = container.querySelectorAll(".personal-time-calendar-ring")[0];
  close(Number(ring.getAttribute("r")), 190 * Math.sqrt(0.5), "Visibility does not change calendar progress");
  container.querySelectorAll('[data-personal-id="2"]')[0].dispatch("click");
  assert.equal(container.querySelectorAll(".personal-time-calendar-ring").length, 0, "An empty chart has no floating reference ring");
  container.querySelectorAll("button").find(button => button.textContent === "Tout afficher").dispatch("click");
  assert.equal(container.querySelectorAll(".personal-time-calendar-ring").length, 1);
  render(container, [{ ...project(1), planned: null, actual: 50 }], options);
  assert.equal(container.querySelectorAll(".personal-time-calendar-ring").length, 0);
});

test("Hors planning is a divided bottom group with a visible signed actual subtotal", () => {
  const container = domFixture();
  const rows = [
    { ...project(1), planned: 100, actual: 10 },
    { ...project(2), planned: null, actual: 4 },
    { ...project(3), planned: -2, actual: 0 },
    { ...project(4), planned: 0, actual: 12 },
    { ...project(5), planned: -1, actual: -2 },
    { ...project(6), planned: 0, actual: 5 }
  ];
  const before = structuredClone(rows);
  render(container, rows);
  assert.deepEqual(container.querySelectorAll("[data-personal-group]").map(group => group.getAttribute("data-personal-group")),
    ["planned", "unknown", "corrections", "unplanned"]);
  const group = container.querySelectorAll('[data-personal-group="unplanned"]')[0];
  assert.match(group.textContent, /Hors planning/);
  assert.equal(group.querySelectorAll(".personal-time-legend-divider").length, 1);
  assert.deepEqual(group.querySelectorAll("[data-personal-id]").map(button => button.getAttribute("data-personal-id")), ["4", "5", "6"]);
  assert.equal(Number(group.querySelectorAll("[data-personal-actual-subtotal]")[0].getAttribute("data-personal-actual-subtotal")), 15);
  container.querySelectorAll('[data-personal-id="4"]')[0].dispatch("click");
  const updated = container.querySelectorAll('[data-personal-group="unplanned"]')[0];
  assert.equal(Number(updated.querySelectorAll("[data-personal-actual-subtotal]")[0].getAttribute("data-personal-actual-subtotal")), 3);
  assert.equal(updated.querySelectorAll('[data-personal-id="4"]')[0].getAttribute("aria-pressed"), "false");
  assert.deepEqual(rows, before);
});

test("unknown planning stays separate from Hors planning and each group retains accessible legend controls", () => {
  const container = domFixture();
  render(container, [{ ...project(1), planned: null, actual: 7 }, { ...project(2), planned: 0, actual: 5 }]);
  const unknown = container.querySelectorAll('[data-personal-group="unknown"]')[0];
  assert.match(unknown.textContent, /Planning indisponible/);
  assert.equal(unknown.querySelectorAll("[data-personal-actual-subtotal]").length, 0);
  assert.deepEqual(unknown.querySelectorAll("[data-personal-id]").map(button => button.getAttribute("data-personal-id")), ["1"]);
  for (const legend of container.querySelectorAll(".personal-time-legend")) {
    assert.equal(legend.tagName, "ul");
    assert.ok(legend.getAttribute("aria-label") || legend.getAttribute("aria-labelledby"));
  }
});
