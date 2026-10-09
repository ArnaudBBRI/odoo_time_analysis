const assert = require("node:assert/strict");
const test = require("node:test");
const { availableYears, summarizeProjects, buildSectors, calendarProgress, projectCalendarProgress, render } = require("../personal-time");
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
