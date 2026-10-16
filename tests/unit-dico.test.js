const assert = require("node:assert/strict");
const test = require("node:test");
const { render, renderTimeline, cleanup, normalizeProjects, buildTimeline, buildConcurrency, isExcludedProjectName, colorFor } = require("../unit-dico");
const { domFixture } = require("./dom-fixture");
const I18n = require("../i18n");
const timelineMessages = require("../i18n-timeline-messages");

const photo = "data:image/png;base64,iVBORw0KGgo=";
function project(id, name, startDate, endDate) { return { id, name, startDate, endDate, manager: null }; }
function fixture() {
  return { ok: true, unit: { id: 206, name: "RESEARCH & DEVELOPMENT / DIGITAL CONSTRUCTION UNIT" },
    responsibleField: "lead_unit_id", asOf: "2026-10-10T10:00:00Z", warnings: [], projects: [
      { ...project(101, "[10001] Example Alpha", "2025-12-01", "2028-05-31"), manager: { name: "Alex Example", photoDataUrl: photo } },
      project(102, "Example Beta", "2026-02-01", "2027-01-31"),
      project(103, "Example Gamma", null, "2029-12-31"),
      project(104, "[10004] Interne", "2010-01-01", "2040-12-31"),
      project(105, "10005 - Overhead", "2010-01-01", "2040-12-31") ] };
}
function find(container, selector) { return container.querySelectorAll(selector)[0]; }

function viewportFixture({ reducedMotion = false, missingObserver = false, failingObserver = false } = {}) {
  const container = domFixture(), observers = [];
  class Observer {
    constructor(callback, options) {
      if (failingObserver) throw new Error("Observer unavailable");
      this.callback = callback; this.options = options;
      this.observed = new Set(); this.unobserved = []; this.disconnects = 0;
      observers.push(this);
    }
    observe(target) { this.observed.add(target); }
    unobserve(target) { this.observed.delete(target); this.unobserved.push(target); }
    disconnect() { this.disconnects += 1; this.observed.clear(); }
    deliver(entries) { this.callback(entries); }
  }
  container.ownerDocument.defaultView = {
    matchMedia(query) { assert.equal(query, "(prefers-reduced-motion: reduce)"); return { matches: reducedMotion }; },
    ...(missingObserver ? {} : { IntersectionObserver: Observer })
  };
  return { container, observers };
}

test("pseudo-project classification strips only a leading code and keeps real projects with longer names", () => {
  for (const name of ["Interne", " OVERHEAD ", "[54250000] Interne", "54250000 - Overhead", "[01] / Interne", "00002:Overhead", "00003· Interne", "00004 Overhead"]) {
    assert.equal(isExcludedProjectName(name), true, name);
  }
  for (const name of [null, false, "Interne innovation", "Overhead monitoring", "External Overhead", "Internal", "[CODE] Interne", "2nd Interne project", "100Interne"]) {
    assert.equal(isExcludedProjectName(name), false, String(name));
  }
});

test("normalization retains accessible zero-hour projects, removes pseudo names and rejects invalid exact IDs", () => {
  const input = [project(1, "Zulu", null, null), project("2", "Alpha", null, null), project(1, "Duplicate", "2020-01-01", "2040-01-01"),
    project(3, "Interne", null, null), { ...project(4, "Other", null, null), display_name: "[123] Overhead" },
    ...[true, false, 0, -1, 1.2, "1e2", {}, "", "2a", Infinity, 9007199254740992].map(id => project(id, "Invalid", null, null))];
  const before = structuredClone(input), normalized = normalizeProjects(input);
  assert.deepEqual(normalized.map(row => row.id), [2, 1]);
  assert.equal(normalized[1].startDate, null, "Repeated IDs do not merge or replace their dates");
  assert.deepEqual(input, before);
  assert.deepEqual(normalizeProjects(null), []);
});

test("timeline spans full project lives independently of years, work hours and pseudo-project dates", () => {
  const data = fixture(), original = structuredClone(data), timeline = buildTimeline(data.projects);
  assert.equal(timeline.startDate, "2025-12-01"); assert.equal(timeline.endDate, "2029-12-31");
  assert.equal(timeline.rows.length, 3); assert.equal(timeline.available, true);
  assert.equal(timeline.rows.find(row => row.id === 101).left, 0);
  assert.equal(timeline.rows.find(row => row.id === 103).width, null);
  assert.equal(timeline.ticks[0].position, 0); assert.equal(timeline.ticks.at(-1).position, 100);
  assert.deepEqual(data, original);
});

test("monthly concurrency counts the peak actually simultaneous projects rather than every project touching a month", () => {
  const input = [
    project(1, "January first", "2026-01-01", "2026-01-10"),
    project(2, "January second", "2026-01-20", "2026-01-31"),
    project(3, "February first", "2026-02-01", "2026-02-15"),
    project(4, "February bridge", "2026-02-15", "2026-02-16"),
    project(5, "February last", "2026-02-16", "2026-02-28"),
    ...[6, 7, 8].map(id => project(id, `March ${id}`, "2026-03-04", "2026-03-04"))
  ];
  const original = structuredClone(input), result = buildConcurrency(input, "2026-01-01");
  assert.equal(result.available, true);
  assert.deepEqual(result.months.map(month => [month.month, month.count]), [["2026-01", 1], ["2026-02", 2], ["2026-03", 3]]);
  assert.equal(result.maxCount, 3); assert.equal(result.includedCount, 8); assert.equal(result.omittedCount, 0);
  assert.deepEqual(input, original);
});

test("monthly concurrency retains inclusive shared-date overlaps, including month boundaries and one-day projects", () => {
  const input = [project(1, "Ends at boundary", "2026-01-30", "2026-02-01"),
    project(2, "Starts at boundary", "2026-02-01", "2026-02-02"),
    project(3, "Single shared day", "2026-02-01", "2026-02-01")];
  const result = buildConcurrency(input, "2026-02-01");
  assert.deepEqual(result.months.map(month => month.count), [1, 3]);
  assert.equal(result.days, 4); assert.equal(result.maxCount, 3);
  assert.deepEqual(result.months.map(month => [month.startDate, month.endDate]), [["2026-01-30", "2026-01-31"], ["2026-02-01", "2026-02-02"]]);
  assert.equal(result.months[0].position, 0); assert.equal(result.months[0].width, 50);
  assert.equal(result.months[1].position, 50); assert.equal(result.months[1].width, 50);
});

test("monthly concurrency uses the timeline's inclusive leap-day geometry and identical date references", () => {
  const input = [project(1, "Leap span", "2024-02-28", "2024-03-01"), project(2, "Leap only", "2024-02-29", "2024-02-29")];
  const timeline = buildTimeline(input, "2024-02-28T23:30:00Z"), result = buildConcurrency(input, "2024-02-28T23:30:00Z");
  assert.equal(result.startDate, timeline.startDate); assert.equal(result.endDate, timeline.endDate);
  assert.equal(result.days, timeline.days); assert.deepEqual(result.ticks, timeline.ticks); assert.deepEqual(result.today, timeline.today);
  assert.deepEqual(result.months.map(month => [month.month, month.startDate, month.endDate, month.count]),
    [["2024-02", "2024-02-28", "2024-02-29", 2], ["2024-03", "2024-03-01", "2024-03-01", 1]]);
  assert.ok(Math.abs(result.months[0].width - 200 / 3) < 1e-10);
  assert.ok(Math.abs(result.months[1].position - 200 / 3) < 1e-10);
  assert.ok(Math.abs(result.months[1].width - 100 / 3) < 1e-10);
  assert.ok(result.months.every(month => typeof month.label === "string" && month.label.includes("2024")));
  const oneDay = buildConcurrency([project(1, "One day", "2024-02-29", "2024-02-29")], "2024-02-29");
  assert.equal(oneDay.months.length, 1); assert.equal(oneDay.months[0].count, 1);
  assert.equal(oneDay.months[0].position, 0); assert.equal(oneDay.months[0].width, 100);
});

test("monthly concurrency spans complete project life, retaining zero gaps and future months beyond today", () => {
  const input = [project(1, "Past month", "2025-12-15", "2025-12-20"), project(2, "Future month", "2026-03-10", "2026-03-20")];
  const result = buildConcurrency(input, "2026-01-01");
  assert.deepEqual(result.months.map(month => [month.month, month.count]), [["2025-12", 1], ["2026-01", 0], ["2026-02", 0], ["2026-03", 1]]);
  assert.equal(result.startDate, "2025-12-15"); assert.equal(result.endDate, "2026-03-20");
  assert.equal(result.months[0].position, 0);
  assert.ok(Math.abs(result.months.reduce((sum, month) => sum + month.width, 0) - 100) < 1e-10);
  for (let index = 1; index < result.months.length; index += 1) {
    assert.ok(Math.abs(result.months[index].position - result.months[index - 1].position - result.months[index - 1].width) < 1e-10);
  }
  assert.deepEqual(buildConcurrency(input, "2030-01-01").months, result.months, "Today changes the reference, not lifetime counts");
});

test("monthly concurrency deduplicates exact identities and applies timeline pseudo-project and year-2999 exclusions", () => {
  const input = [project(1, "Count once", "2026-01-01", "2026-01-31"),
    project("1", "Duplicate with other dates", "1900-01-01", "2099-12-31"),
    project(2, "Same name", "2026-01-10", "2026-01-15"),
    project(3, "Same name", "2026-01-10", "2026-01-15"),
    project(4, "[100] Interne", "1900-01-01", "2099-12-31"),
    project(5, "100 - Overhead", "1900-01-01", "2099-12-31"),
    project(6, "Permanent", "1900-01-01", "2999-12-31"),
    project(7, "Invalid 2999 end", "2026-01-01", "2999-02-29"),
    project(true, "Invalid ID", "1900-01-01", "2099-12-31")];
  const original = structuredClone(input), result = buildConcurrency(input, "2026-01-01");
  assert.equal(result.startDate, "2026-01-01"); assert.equal(result.endDate, "2026-01-31");
  assert.equal(result.months.length, 1); assert.equal(result.months[0].count, 3);
  assert.equal(result.includedCount, 3); assert.equal(result.omittedCount, 1);
  assert.deepEqual(input, original);
});

test("incomplete and reversed projects retain the exact timeline scale but contribute no invented duration", () => {
  const input = [project(1, "Known period", "2026-02-01", "2026-02-28"),
    project(2, "Known earlier start", "2026-01-10", null),
    project(3, "Known later end", null, "2026-04-05"),
    project(4, "Reversed", "2040-01-01", "1900-01-01"),
    project(5, "Unknown", null, null)];
  const timeline = buildTimeline(input, "2026-02-15"), result = buildConcurrency(input, "2026-02-15");
  assert.equal(result.available, true); assert.equal(result.includedCount, 1); assert.equal(result.omittedCount, 4);
  assert.equal(result.startDate, timeline.startDate); assert.equal(result.endDate, timeline.endDate);
  assert.deepEqual(result.ticks, timeline.ticks); assert.deepEqual(result.today, timeline.today);
  assert.deepEqual(result.months.map(month => [month.month, month.count]), [["2026-01", 0], ["2026-02", 1], ["2026-03", 0], ["2026-04", 0]]);
});

test("unknown concurrency remains unavailable instead of becoming an invented all-zero series", () => {
  for (const input of [null, [], [project(1, "Unknown", null, null)],
    [project(1, "Start only", "2026-01-01", null), project(2, "End only", null, "2026-12-31")],
    [project(1, "Reversed", "2026-12-31", "2026-01-01")],
    [project(1, "Permanent", "2026-01-01", "2999-12-31")]]) {
    const result = buildConcurrency(input, "2026-01-01");
    assert.equal(result.available, false); assert.deepEqual(result.months, []); assert.equal(result.maxCount, null); assert.equal(result.includedCount, 0);
  }
});

test("monthly concurrency preserves early-century dates and rejects a period beyond its disclosed monthly limit", () => {
  const early = buildConcurrency([project(1, "Early century", "0099-12-31", "0100-01-02")], "0100-01-01");
  assert.equal(early.available, true); assert.equal(early.days, 3);
  assert.deepEqual(early.months.map(month => [month.month, month.count]), [["0099-12", 1], ["0100-01", 1]]);
  const huge = buildConcurrency([project(1, "Unbounded dates", "1900-01-01", "2200-12-31")], "2026-01-01");
  assert.equal(huge.available, false); assert.equal(huge.reason, "range-too-long");
  assert.deepEqual(huge.months, []); assert.equal(huge.maxCount, null);
  assert.equal(huge.startDate, "1900-01-01"); assert.equal(huge.endDate, "2200-12-31");
});

test("known independent endpoints extend bounds while missing counterparts never invent bars", () => {
  const timeline = buildTimeline([project(1, "Complete", "2026-01-01", "2026-12-31"),
    project(2, "Earlier unknown end", "2024-01-01", null), project(3, "Later unknown start", null, "2028-12-31")]);
  assert.equal(timeline.startDate, "2024-01-01"); assert.equal(timeline.endDate, "2028-12-31");
  assert.equal(timeline.rows.find(row => row.id === 2).left, null);
  assert.equal(timeline.rows.find(row => row.id === 3).width, null);
  assert.ok(timeline.rows.find(row => row.id === 1).left > 0);
});

test("2999 endings leave the catalogue intact but cannot stretch either timeline endpoint", () => {
  const input = [project(1, "Real project", "2025-12-01", "2028-05-31"),
    project(2, "Permanent early", "1900-01-01", "2999-01-01"),
    project(3, "Permanent late", "2030-01-01", "2999-12-31"),
    project(4, "Permanent missing start", null, "2999-06-30")];
  const original = structuredClone(input), timeline = buildTimeline(input);
  assert.equal(timeline.projects.length, 4);
  assert.deepEqual(timeline.rows.map(row => row.id), [1]);
  assert.equal(timeline.startDate, "2025-12-01"); assert.equal(timeline.endDate, "2028-05-31");
  assert.equal(timeline.rows[0].left, 0); assert.equal(timeline.rows[0].width, 100);
  assert.equal(timeline.ticks.at(-1).date, "2028-05-31");
  assert.deepEqual(input, original);
});

test("the timeline exclusion targets exactly valid year-2999 endings", () => {
  const timeline = buildTimeline([project(1, "Before", "2998-01-01", "2998-12-31"),
    project(2, "Excluded", "2998-01-01", "2999-12-31"),
    project(3, "After", "2999-01-01", "3000-12-31"),
    project(4, "Invalid end", "2026-01-01", "2999-02-29")]);
  assert.deepEqual(timeline.rows.map(row => row.id), [4, 1, 3]);
  assert.equal(timeline.endDate, "3000-12-31");
  assert.equal(timeline.rows.find(row => row.id === 4).status, "unavailable");
  assert.equal(timeline.rows.find(row => row.id === 4).width, null);
});

test("one-day durations and leap-day bounds use inclusive exact calendar days", () => {
  const oneDay = buildTimeline([project(1, "Single day", "2024-02-29", "2024-02-29")]);
  assert.equal(oneDay.days, 1); assert.equal(oneDay.rows[0].left, 0); assert.equal(oneDay.rows[0].width, 100);
  const threeDays = buildTimeline([project(1, "Span", "2024-02-28", "2024-03-01"), project(2, "Leap", "2024-02-29", "2024-02-29")]);
  assert.equal(threeDays.days, 3);
  assert.ok(Math.abs(threeDays.rows.find(row => row.id === 2).left - 100 / 3) < 1e-10);
  assert.ok(Math.abs(threeDays.rows.find(row => row.id === 2).width - 100 / 3) < 1e-10);
});

test("today uses Brussels calendar dates and the same inclusive scale as project bars", () => {
  const input = [project(1, "Leap span", "2024-02-28", "2024-03-01")];
  const before = structuredClone(input);
  for (const now of ["2024-02-29", "2024-02-28T23:30:00Z", new Date("2024-02-28T23:30:00Z")]) {
    const timeline = buildTimeline(input, now);
    assert.equal(timeline.today.date, "2024-02-29");
    assert.equal(timeline.today.label, "29/02/2024");
    assert.ok(Math.abs(timeline.today.position - 100 / 3) < 1e-10);
    assert.equal(timeline.startDate, "2024-02-28"); assert.equal(timeline.endDate, "2024-03-01");
  }
  const summer = buildTimeline([project(1, "Summer", "2026-06-01", "2026-06-03")], "2026-06-01T22:30:00Z");
  assert.equal(summer.today.date, "2026-06-02", "Summer time converts the instant before placing the marker");
  assert.ok(Math.abs(summer.today.position - 100 / 3) < 1e-10);
  const last = buildTimeline(input, "2024-03-01");
  assert.ok(Math.abs(last.today.position - 200 / 3) < 1e-10, "The marker starts the final inclusive calendar day");
  const single = buildTimeline([project(1, "One day", "2024-02-29", "2024-02-29")], "2024-02-29");
  assert.equal(single.today.position, 0); assert.equal(single.rows[0].completed, false);
  assert.deepEqual(input, before);
});

test("today outside the project scale never stretches bounds or invents a visible marker", () => {
  const input = [project(1, "Limited", "2026-10-01", "2026-10-05")];
  for (const now of ["2026-09-30", "2026-10-06"]) {
    const timeline = buildTimeline(input, now);
    assert.equal(timeline.today.date, now); assert.equal(timeline.today.position, null);
    assert.equal(timeline.startDate, "2026-10-01"); assert.equal(timeline.endDate, "2026-10-05");
    assert.equal(timeline.days, 5); assert.equal(timeline.rows[0].width, 100);
  }
  const missing = buildTimeline([project(1, "Unknown", null, null)], "2026-10-05");
  assert.equal(missing.today.date, "2026-10-05"); assert.equal(missing.today.position, null);
});

test("completion requires a valid end date strictly before Brussels today and a non-reversed interval", () => {
  const input = [project(1, "Ended", "2026-01-01", "2026-10-04"),
    project(2, "Ends today", "2026-01-01", "2026-10-05"),
    project(3, "Future end", "2026-01-01", "2026-10-06"),
    project(4, "Unknown end", "2026-01-01", null),
    project(5, "Invalid end", "2026-01-01", "2026-02-29"),
    project(6, "Reversed", "2026-12-31", "2026-10-04"),
    project(7, "Known past end only", null, "2026-10-04")];
  const timeline = buildTimeline(input, "2026-10-04T22:30:00Z");
  assert.equal(timeline.today.date, "2026-10-05");
  assert.deepEqual(timeline.rows.filter(row => row.completed).map(row => row.id).sort(), [1, 7]);
  assert.ok(timeline.rows.every(row => typeof row.completed === "boolean"));
  assert.equal(timeline.rows.find(row => row.id === 1).color, colorFor(1), "Completion must not mutate stable project identity colors");
});

test("invalid explicit today values leave completion and the date marker unavailable", () => {
  const input = [project(1, "Past", "2020-01-01", "2020-12-31")];
  for (const now of [null, false, NaN, Infinity, {}, "", "not a date", "2026-02-29", new Date(NaN)]) {
    const timeline = buildTimeline(input, now);
    assert.equal(timeline.today, null, String(now));
    assert.equal(timeline.rows[0].completed, false, String(now));
    assert.equal(timeline.rows[0].width, 100);
  }
});

test("strict source dates reject rollover, datetime, zero year and arbitrary coercion", () => {
  const values = ["2026-02-29", "2024-02-30", "2026-13-01", "2026-00-01", "2026-01-00", "2026-1-01", "0000-01-01", "2026-01-01T00:00:00Z", false, 20260101, {}];
  for (const date of values) {
    const timeline = buildTimeline([project(1, "Bad source", date, "2026-12-31")]);
    assert.equal(timeline.available, false, String(date));
    assert.equal(timeline.startDate, null); assert.equal(timeline.rows[0].width, null);
  }
  assert.equal(buildTimeline([project(1, "Early century", "0099-01-01", "0099-12-31")]).days, 365);
});

test("reversed intervals stay in the catalogue without changing a valid timeline's bounds", () => {
  const timeline = buildTimeline([project(1, "Good", "2026-01-01", "2026-12-31"), project(2, "Reversed", "2040-01-01", "2000-01-01")]);
  assert.equal(timeline.projects.length, 2); assert.equal(timeline.rows.find(row => row.id === 2).status, "reversed");
  assert.equal(timeline.startDate, "2026-01-01"); assert.equal(timeline.endDate, "2026-12-31");
  assert.equal(timeline.rows.find(row => row.id === 2).width, null);
});

test("incoherent or missing global endpoint coverage stays explicitly unavailable", () => {
  for (const input of [[], [project(1, "Unknown", null, null)], [project(1, "Start only", "2030-01-01", null), project(2, "End only", null, "2020-01-01")]]) {
    const timeline = buildTimeline(input);
    assert.equal(timeline.available, false); assert.equal(timeline.days, null); assert.deepEqual(timeline.ticks, []);
    assert.ok(timeline.rows.every(row => row.width === null));
  }
});

test("axis density adapts to broad lifetimes and project colors remain exact-ID stable", () => {
  for (const [start, end] of [["2026-01-01", "2026-01-02"], ["2026-01-01", "2026-12-31"], ["2020-01-01", "2030-12-31"], ["1900-01-01", "2099-12-31"]]) {
    const timeline = buildTimeline([project(1, "Span", start, end)]);
    assert.ok(timeline.ticks.length >= 2 && timeline.ticks.length <= 9);
    assert.equal(timeline.ticks[0].date, start); assert.equal(timeline.ticks.at(-1).date, end);
    assert.ok(timeline.ticks.every(tick => tick.position >= 0 && tick.position <= 100));
  }
  const original = buildTimeline([project(1, "Before rename", "2026-01-01", "2026-12-31")]).rows[0].color;
  const changed = buildTimeline([project(2, "Other", "2026-01-01", "2026-12-31"), project(1, "Renamed", "2026-01-01", "2026-12-31")]).rows.find(row => row.id === 1).color;
  assert.equal(original, changed); assert.equal(colorFor("1"), colorFor(1)); assert.notEqual(colorFor(1), colorFor(2));
});

test("timeline groups completed projects last while preserving start, name and exact-ID order within each group", () => {
  const input = [
    project(1, "Ended early", "2018-01-01", "2025-12-31"),
    project(2, "Ended later", "2019-01-01", "2026-10-04"),
    project(3, "Ended without start", null, "2026-01-31"),
    project(4, "Active early", "2023-01-01", "2030-12-31"),
    project(5, "Beta", "2026-01-01", "2028-12-31"),
    project(7, "Alpha", "2026-01-01", "2028-12-31"),
    project(6, "Alpha", "2026-01-01", "2028-12-31"),
    project(8, "Ends today", "2020-01-01", "2026-10-05"),
    project(9, "Unknown", null, null),
    project(10, "Reversed", "2040-01-01", "2000-01-01")
  ];
  const before = structuredClone(input), timeline = buildTimeline(input, "2026-10-05");
  assert.deepEqual(timeline.rows.map(row => row.id), [8, 4, 6, 7, 5, 10, 9, 1, 2, 3]);
  assert.deepEqual(timeline.rows.map(row => row.completed), [false, false, false, false, false, false, false, true, true, true]);
  assert.equal(timeline.startDate, "2018-01-01"); assert.equal(timeline.endDate, "2030-12-31");
  assert.equal(timeline.rows.find(row => row.id === 3).width, null, "Missing dates remain disclosed even in the completed group");
  assert.equal(timeline.rows.find(row => row.id === 10).status, "reversed");
  assert.deepEqual(input, before);
});

test("completed grouping advances at Brussels midnight without treating today's end as already completed", () => {
  const input = [project(1, "Older project", "2020-01-01", "2026-10-04"),
    project(2, "Current project", "2021-01-01", "2026-10-05")];
  assert.deepEqual(buildTimeline(input, "2026-10-04T21:59:59Z").rows.map(row => row.id), [1, 2]);
  const midnight = buildTimeline(input, "2026-10-04T22:00:00Z");
  assert.deepEqual(midnight.rows.map(row => row.id), [2, 1]);
  assert.equal(midnight.rows[0].completed, false); assert.equal(midnight.rows[1].completed, true);
  assert.deepEqual(buildTimeline(input, "invalid date").rows.map(row => row.id), [1, 2], "Unknown today retains chronological ordering");
});

test("shared timeline renders only the calendar with selectable full-lifetime bars and caller labels", () => {
  const { container, observers } = viewportFixture(), selections = [];
  const input = [project(11, "Ended", "2020-01-01", "2026-10-04"),
    project(12, "Active", "2025-12-01", "2028-05-31"),
    project(13, "Long placeholder", "2010-01-01", "2999-12-31")];
  const before = structuredClone(input);
  renderTimeline(container, input, { now: "2026-10-05", heading: "Projets · 02 / Calendrier des projets",
    regionLabel: "Calendrier de mes projets", onSelect: id => selections.push(id), focusProjectId: 12, focusKind: "bar" });
  assert.equal(container.querySelectorAll("section").length, 1);
  assert.equal(container.querySelectorAll(".unit-dico-concurrency").length, 0, "The personal calendar does not add the Unit-only count chart");
  assert.equal(container.querySelectorAll("[data-unit-project-choice]").length, 0);
  assert.equal(container.querySelectorAll("[data-unit-refresh]").length, 0);
  assert.match(container.textContent, /Projets · 02 \/ Calendrier des projets/);
  assert.equal(find(container, ".unit-dico-timeline-scroll").getAttribute("aria-label"), "Calendrier de mes projets");
  assert.deepEqual(container.querySelectorAll("[data-unit-timeline-project]").map(track => track.getAttribute("data-unit-timeline-project")), ["12", "11"]);
  assert.equal(find(container, "[data-unit-timeline-start]").getAttribute("data-unit-timeline-start"), "2020-01-01");
  assert.equal(find(container, "[data-unit-timeline-end]").getAttribute("data-unit-timeline-end"), "2028-05-31");
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-project-select"), "12");
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-project-kind"), "bar");
  const name = container.querySelectorAll("[data-unit-project-select]").find(control => control.getAttribute("data-unit-project-select") === "11" && control.getAttribute("data-unit-project-kind") === "name");
  name.dispatch("click"); container.ownerDocument.activeElement.dispatch("click");
  assert.deepEqual(selections, [11, 12]); assert.equal(observers.length, 1);
  assert.equal(find(find(container, ".is-completed"), ".unit-dico-timeline-fill").style.backgroundColor, "#98a2ab");
  assert.deepEqual(input, before);
  cleanup(container); assert.equal(observers[0].disconnects, 1);
});

test("shared timeline preserves focused name/bar identities and retires each previous reveal observer", () => {
  const { container, observers } = viewportFixture(), input = fixture().projects;
  const draw = () => renderTimeline(container, input, { now: "2026-10-05" });
  draw();
  for (const kind of ["name", "bar"]) {
    const button = container.querySelectorAll("[data-unit-project-select]").find(control => control.getAttribute("data-unit-project-select") === "101" && control.getAttribute("data-unit-project-kind") === kind);
    button.focus();
    const observer = observers.at(-1), oldBar = find(container, ".unit-dico-timeline-bar");
    draw();
    assert.equal(observer.disconnects, 1);
    observer.deliver([{ target: oldBar, isIntersecting: true }]);
    assert.equal(oldBar.getAttribute("data-unit-timeline-reveal"), "pending");
    assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-project-select"), "101");
    assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-project-kind"), kind);
    assert.ok(container.contains(container.ownerDocument.activeElement));
  }
  cleanup(container); cleanup(container);
  assert.ok(observers.every(observer => observer.disconnects === 1));
});

test("shared empty timeline uses the personal scope notice without inventing dates or observers", () => {
  const { container, observers } = viewportFixture();
  renderTimeline(container, [], { heading: "Projets · 02 / Calendrier des projets", emptyMessage: "Aucune activité pour la période choisie." });
  assert.match(container.textContent, /Aucune activité pour la période choisie/);
  assert.equal(container.querySelectorAll(".unit-dico-timeline").length, 0);
  assert.equal(observers.length, 0);
});

test("overview presents compact native radio choices before the full-lifetime timeline", () => {
  const container = domFixture(), selections = [];
  render(container, fixture(), { onSelect: id => selections.push(id) });
  const sections = container.querySelectorAll("section"); assert.equal(sections.length, 3);
  assert.match(sections[0].textContent, /Unité DiCo · 01 \/ Projets/);
  assert.match(sections[1].textContent, /Unité DiCo · 02 \/ Calendrier des projets/);
  assert.ok(sections[2].className.split(/\s+/).includes("unit-dico-concurrency"));
  assert.match(sections[2].textContent, /Unité DiCo · 03/);
  assert.equal(find(container, ".unit-dico-grid").tagName, "fieldset");
  const radios = container.querySelectorAll("[data-unit-project-choice]"); assert.equal(radios.length, 3);
  assert.ok(radios.every(radio => radio.type === "radio" && radio.name === "unit-dico-project"));
  const choice = radios.find(radio => radio.value === "102");
  choice.checked = false; choice.dispatch("change"); assert.deepEqual(selections, []);
  choice.checked = true; choice.dispatch("change"); assert.deepEqual(selections, [102]);
  assert.equal(find(container, "[data-unit-timeline-start]").getAttribute("data-unit-timeline-start"), "2025-12-01");
  assert.equal(find(container, "[data-unit-timeline-end]").getAttribute("data-unit-timeline-end"), "2029-12-31");
  assert.equal(container.ownerDocument.listeners.size, 0, "Rendering adds no global keyboard or pointer interception");
});

test("Unit overview adds a monthly area chart and accessible table under the calendar on the exact same date scale", () => {
  const container = domFixture(), projects = [project(1, "January", "2026-01-15", "2026-01-31"),
    project(2, "March", "2026-03-01", "2026-03-05"), project(3, "Unknown start", null, "2026-03-05")];
  const data = { ...fixture(), projects }, original = structuredClone(data), now = "2026-02-15";
  render(container, data, { now });
  const sections = container.querySelectorAll("section"), section = find(container, ".unit-dico-concurrency");
  assert.equal(sections[2], section); assert.match(section.textContent, /Unité DiCo · 03 \/ Projets simultanés/);
  assert.match(section.textContent, /Maximum de projets simultanés dans chaque mois/);
  assert.match(section.textContent, /2 projets avec une période complète.*1 projet aux dates manquantes ou incohérentes est exclu/);
  const calendarChart = find(container, "[data-unit-timeline-start]"), countChart = find(section, "[data-unit-concurrency-start]");
  assert.equal(countChart.getAttribute("data-unit-concurrency-start"), calendarChart.getAttribute("data-unit-timeline-start"));
  assert.equal(countChart.getAttribute("data-unit-concurrency-end"), calendarChart.getAttribute("data-unit-timeline-end"));
  const calendarTicks = container.querySelectorAll("[data-unit-timeline-tick]");
  assert.deepEqual(section.querySelectorAll("[data-unit-concurrency-tick]").map(tick => [tick.getAttribute("data-unit-concurrency-tick"), tick.style.left, tick.textContent]),
    calendarTicks.map(tick => [tick.getAttribute("data-unit-timeline-tick"), tick.style.left, tick.textContent]));
  const summary = buildConcurrency(projects, now), buttons = section.querySelectorAll("[data-unit-concurrency-month]");
  assert.deepEqual(buttons.map(button => button.getAttribute("data-unit-concurrency-month")), summary.months.map(month => month.month));
  assert.deepEqual(buttons.map(button => [Number.parseFloat(button.style.left), Number.parseFloat(button.style.width)]),
    summary.months.map(month => [month.position, month.width]));
  assert.ok(buttons.every(button => button.tagName === "button" && button.type === "button"));
  const area = find(section, "[data-unit-concurrency-area]");
  assert.equal(area.tagName, "path"); assert.ok(area.getAttribute("d").endsWith(" Z"));
  assert.equal(find(section, "svg").getAttribute("aria-hidden"), "true", "Monthly controls/table carry the accessible numeric evidence");
  const today = find(section, "[data-unit-concurrency-today]");
  assert.equal(today.getAttribute("data-unit-concurrency-today"), now);
  assert.equal(today.style.left, find(container, "[data-unit-timeline-today]").style.left);
  const details = find(section, ".unit-dico-concurrency-details"), table = find(details, ".unit-dico-concurrency-table");
  assert.equal(details.tagName, "details"); assert.match(find(details, "summary").textContent, /Valeurs mensuelles/);
  assert.equal(table.tagName, "table"); assert.match(find(table, "caption").textContent, /Maximum mensuel/);
  const rows = find(table, "tbody").querySelectorAll("tr");
  assert.deepEqual(rows.map(row => [find(row, "th").textContent, find(row, "td").textContent]), summary.months.map(month => [month.label, String(month.count)]));
  assert.ok(rows.every(row => find(row, "th").getAttribute("scope") === "row"));
  assert.deepEqual(data, original); assert.equal(container.ownerDocument.listeners.size, 0);
});

test("monthly controls expose pointer and tap details with local roving keyboard navigation and Escape dismissal", () => {
  const container = domFixture(), data = { ...fixture(), projects: [project(1, "Span", "2026-01-01", "2026-03-31")] };
  render(container, data, { now: "2026-02-15" });
  const section = find(container, ".unit-dico-concurrency"), tooltip = find(section, ".unit-dico-concurrency-tooltip");
  const buttons = section.querySelectorAll("[data-unit-concurrency-month]");
  assert.equal(tooltip.getAttribute("role"), "tooltip"); assert.equal(tooltip.hidden, true);
  assert.deepEqual(buttons.map(button => button.getAttribute("tabindex")), ["0", "-1", "-1"]);
  assert.ok(buttons.every(button => button.getAttribute("aria-describedby") === tooltip.id));
  buttons[0].dispatch("pointerenter"); assert.equal(tooltip.hidden, false); assert.match(tooltip.textContent, /janv\. 2026 · 1 projet simultané/);
  buttons[0].dispatch("pointerleave"); assert.equal(tooltip.hidden, true);
  buttons[1].dispatch("click"); assert.equal(tooltip.hidden, false); assert.match(tooltip.textContent, /févr\. 2026/);
  buttons[1].dispatch("pointerleave"); assert.equal(tooltip.hidden, false, "Tapped details remain visible after pointer departure");
  buttons[1].dispatch("click"); assert.equal(tooltip.hidden, true, "A second tap dismisses the pinned details");
  buttons[0].focus(); assert.equal(tooltip.hidden, false);
  let prevented = 0;
  const press = (button, key) => button.dispatch("keydown", { key, preventDefault: () => { prevented += 1; } });
  press(buttons[0], "ArrowLeft"); assert.equal(container.ownerDocument.activeElement, buttons[0]);
  press(buttons[0], "ArrowRight"); assert.equal(container.ownerDocument.activeElement, buttons[1]);
  assert.deepEqual(buttons.map(button => button.getAttribute("tabindex")), ["-1", "0", "-1"]);
  press(buttons[1], "End"); assert.equal(container.ownerDocument.activeElement, buttons[2]);
  press(buttons[2], "ArrowRight"); assert.equal(container.ownerDocument.activeElement, buttons[2]);
  press(buttons[2], "Home"); assert.equal(container.ownerDocument.activeElement, buttons[0]);
  press(buttons[0], "Escape"); assert.equal(tooltip.hidden, true); assert.equal(prevented, 6);
  buttons[2].focus(); assert.equal(tooltip.hidden, false); buttons[2].dispatch("blur"); assert.equal(tooltip.hidden, true);
  assert.equal(container.ownerDocument.listeners.size, 0, "Month navigation never intercepts the rest of the dashboard");
});

test("monthly control focus survives a Unit rerender and does not create a selected project", () => {
  const container = domFixture(), selections = [], data = { ...fixture(), projects: [project(1, "Span", "2026-01-01", "2026-03-31")] };
  render(container, data, { now: "2026-02-15", onSelect: id => selections.push(id) });
  const old = find(container, '[data-unit-concurrency-month="2026-02"]'); old.focus(); old.dispatch("click");
  render(container, data, { now: "2026-02-15", onSelect: id => selections.push(id) });
  const current = find(container, '[data-unit-concurrency-month="2026-02"]');
  assert.notEqual(current, old); assert.equal(container.ownerDocument.activeElement, current);
  assert.equal(current.getAttribute("tabindex"), "0"); assert.equal(find(container, ".unit-dico-concurrency-tooltip").hidden, false);
  assert.deepEqual(selections, []);
});

test("calendar and monthly area chart synchronize horizontal scrolling and release listeners on cleanup", () => {
  const container = domFixture(); render(container, fixture(), { now: "2026-02-15" });
  const calendarScroll = find(find(container, ".unit-dico-calendar"), ".unit-dico-timeline-scroll");
  const countScroll = find(find(container, ".unit-dico-concurrency"), ".unit-dico-timeline-scroll");
  const removed = [];
  for (const scroll of [calendarScroll, countScroll]) {
    scroll.scrollLeft = 0;
    scroll.removeEventListener = (name, listener) => {
      assert.equal(scroll.listeners.get(name), listener); scroll.listeners.delete(name); removed.push(scroll);
    };
  }
  calendarScroll.scrollLeft = 125; calendarScroll.dispatch("scroll"); assert.equal(countScroll.scrollLeft, 125);
  countScroll.scrollLeft = 225; countScroll.dispatch("scroll"); assert.equal(calendarScroll.scrollLeft, 225);
  cleanup(container); cleanup(container); assert.deepEqual(removed, [calendarScroll, countScroll]);
  calendarScroll.scrollLeft = 300; calendarScroll.dispatch("scroll"); assert.equal(countScroll.scrollLeft, 225);
});

test("an unavailable or excluded Unit count chart shows a notice without a numeric plot, table or invented zero", () => {
  const container = domFixture();
  for (const projects of [[], [project(1, "Unknown", null, null)],
    [project(1, "Start only", "2026-01-01", null), project(2, "End only", null, "2026-12-31")],
    [project(1, "Permanent", "2026-01-01", "2999-12-31")]]) {
    render(container, { ...fixture(), projects }, { now: "2026-02-15" });
    const section = find(container, ".unit-dico-concurrency");
    assert.match(section.textContent, /Comptage indisponible/);
    assert.equal(section.querySelectorAll("svg").length, 0); assert.equal(section.querySelectorAll("table").length, 0);
    assert.equal(section.querySelectorAll("[data-unit-concurrency-month]").length, 0);
  }
  render(container, { ...fixture(), projects: [project(1, "Malformed centuries", "1900-01-01", "2200-12-31")] });
  assert.match(find(container, ".unit-dico-concurrency").textContent, /Période trop longue.*2\s?400 mois/);
});

test("Unit DiCo cards show a manager chip and short front title, with project and manager details on the back", () => {
  const container = domFixture(), data = fixture(), selections = [];
  data.projects[0].name = "54252043 · [Autogrout] Automated grouting research";
  data.projects[0].totalBudget = { amount: 12345.67, currencyId: 1, currency: "EUR" };
  const original = structuredClone(data);
  render(container, data, { onSelect: id => selections.push(id), focusProjectId: 101 });
  const choice = container.querySelectorAll("[data-unit-project-choice]").find(radio => radio.value === "101");
  const label = choice.parentElement, front = find(label, ".project-card-front"), back = find(label, ".project-card-back");
  assert.equal(label.children[0], choice, "The native radio stays outside the visual rotation");
  assert.equal(front.querySelectorAll("img").length, 1); assert.equal(back.querySelectorAll("img").length, 1);
  assert.equal(find(back, ".project-card-short-name").textContent, "Autogrout");
  assert.equal(find(back, ".project-card-back-number").textContent, "54252043");
  assert.equal(find(back, ".project-card-manager-name").textContent, "Alex Example");
  assert.equal(find(back, ".project-card-back-full-name").textContent, "Automated grouting research");
  const backOrder = ["54252043", "Autogrout", "Alex Example", "Automated grouting research"]
    .map(value => back.textContent.indexOf(value));
  assert.deepEqual(backOrder, [...backOrder].sort((a, b) => a - b), "Back content follows number, short title, manager, full title order");
  assert.equal(find(back, ".project-card-mini-photo").src, photo);
  const title = find(front, ".unit-dico-project-name");
  assert.deepEqual(title.children.map(row => [row.tagName, row.className, row.textContent]), [
    ["strong", "project-card-title", "Autogrout"]
  ]);
  assert.equal(title.title, data.projects[0].name); assert.ok(label.title.startsWith(`${data.projects[0].name}\n`));
  assert.equal(choice.getAttribute("aria-label"), data.projects[0].name);
  assert.doesNotMatch(front.textContent, /54252043|Automated grouting research/);
  assert.equal(back.querySelectorAll(".project-card-date").length, 0);
  assert.equal(back.querySelectorAll(".project-card-budget").length, 0);
  assert.doesNotMatch(back.textContent, /12345|01\/12\/2025|31\/05\/2028/);
  assert.match(label.title, /Début : 01\/12\/2025\nFin : 31\/05\/2028/);
  assert.match(label.title.replace(/\s/g, ""), /Budgettotal:12345,67EUR/);
  assert.equal(front.getAttribute("aria-hidden"), "true"); assert.equal(back.getAttribute("aria-hidden"), "true");
  const descriptionId = choice.getAttribute("aria-describedby"); assert.ok(descriptionId);
  const description = find(label, ".project-card-sr-only"); assert.equal(description.id, descriptionId);
  assert.match(description.textContent, /Alex Example/); assert.match(description.textContent, /01\/12\/2025/);
  assert.match(description.textContent.replace(/\s/g, ""), /12345,67.*EUR/);
  assert.equal(container.ownerDocument.activeElement, choice, "Back navigation keeps native radio focus");
  choice.checked = true; choice.dispatch("change"); assert.deepEqual(selections, [101]);
  assert.deepEqual(data, original);
});

test("Unit DiCo cards move source numbers and full names to the back without treating the Odoo ID as a number", () => {
  for (const [name, values] of [
    ["[MiXeD] [54252043] Full title [2026] (ID 99999999)", ["MiXeD", "54252043", "Full title [2026] (ID 99999999)"]],
    ["[54252043] Full title", ["Full title", "54252043", ""]],
    ["[MiXeD] Full title", ["MiXeD", "", "Full title"]],
    ["Plain project", ["Plain project", "", ""]],
    ['[<img src=x onerror="PRIVATE_SCRIPT()">] [54252043] <script>Full</script>',
      ['<img src=x onerror="PRIVATE_SCRIPT()">', "54252043", "<script>Full</script>"]]
  ]) {
    const container = domFixture(), data = { ...fixture(), projects: [project(99999999, name, null, null)] };
    const original = structuredClone(data); render(container, data);
    const choice = find(container, "[data-unit-project-choice]"), label = choice.parentElement;
    const title = find(label, ".unit-dico-project-name");
    assert.ok(title.className.split(/\s+/).includes("project-card-name"));
    assert.deepEqual(title.children.map(row => row.textContent), [values[0]], name);
    const back = find(label, ".project-card-back");
    assert.deepEqual(["project-card-short-name", "project-card-back-number", "project-card-back-full-name"]
      .map(className => find(back, `.${className}`).textContent), values, name);
    assert.equal(find(back, ".project-card-manager-name").textContent, "Responsable indisponible");
    assert.equal(title.title, name); assert.ok(label.title.startsWith(`${name}\n`)); assert.equal(choice.getAttribute("aria-label"), name);
    assert.equal(container.querySelectorAll("img").length, 0); assert.equal(container.querySelectorAll("script").length, 0);
    assert.deepEqual(data, original);
  }
});

test("timeline name and duration buttons select the same exact project with readable date descriptions", () => {
  const container = domFixture(), selections = [], data = fixture();
  render(container, data, { onSelect: id => selections.push(id) });
  const controls = container.querySelectorAll("[data-unit-project-select]").filter(control => control.getAttribute("data-unit-project-select") === "101");
  assert.equal(controls.length, 2); assert.ok(controls.every(control => control.tagName === "button" && control.type === "button"));
  controls.forEach(control => {
    assert.match(control.getAttribute("aria-label"), /01\/12\/2025 → 31\/05\/2028.*Ouvrir/);
    control.dispatch("click");
  });
  assert.deepEqual(selections, [101, 101]);
  assert.equal(find(controls.find(control => control.getAttribute("data-unit-project-kind") === "bar"), ".unit-dico-timeline-fill").style.backgroundColor, colorFor(101));
  assert.ok(container.querySelectorAll("[data-unit-project-select]").some(control => /Début indisponible/.test(control.getAttribute("aria-label"))));
  assert.equal(container.querySelectorAll(".unit-dico-timeline-unavailable").length, 1);
});

test("rendered today markers share one exact position across the axis and every project track", () => {
  const container = domFixture(), data = { ...fixture(), projects: [
    project(1, "Ended", "2026-10-01", "2026-10-04"),
    project(2, "Ends today", "2026-10-01", "2026-10-05"),
    project(3, "Future", "2026-10-01", "2026-10-06"),
    project(4, "Missing", "2026-10-01", null)] };
  render(container, data, { now: "2026-10-05" });
  const markers = find(container, ".unit-dico-calendar").querySelectorAll(".unit-dico-timeline-today");
  assert.equal(markers.length, 5, "One axis marker and one marker per row keep the line continuous");
  assert.ok(markers.every(marker => marker.getAttribute("data-unit-timeline-today") === "2026-10-05"));
  assert.ok(markers.every(marker => Math.abs(Number.parseFloat(marker.style.left) - 400 / 6) < 1e-10));
  const axis = find(container, ".unit-dico-timeline-axis");
  assert.match(axis.textContent, /Aujourd.hui/);
  assert.equal(container.querySelectorAll(".unit-dico-timeline-today-label").length, 1, "The positioned label appears only on the axis");
  assert.ok(markers.every(marker => marker.getAttribute("aria-hidden") === "true"));
  const completed = container.querySelectorAll(".is-completed");
  assert.equal(completed.length, 1); assert.equal(completed[0].getAttribute("data-unit-project-select"), "1");
  assert.equal(find(completed[0], ".unit-dico-timeline-fill").style.backgroundColor, "#98a2ab");
  assert.equal(find(container.querySelectorAll(".unit-dico-timeline-bar").find(bar => bar.getAttribute("data-unit-project-select") === "2"), ".unit-dico-timeline-fill").style.backgroundColor, colorFor(2));
  assert.equal(find(container, "[data-unit-timeline-start]").getAttribute("data-unit-timeline-start"), "2026-10-01");
  assert.equal(find(container, "[data-unit-timeline-end]").getAttribute("data-unit-timeline-end"), "2026-10-06");
});

test("out-of-range or invalid today produces no marker while retaining duration and project controls", () => {
  const container = domFixture(), data = { ...fixture(), projects: [project(1, "Limited", "2026-10-01", "2026-10-05")] };
  for (const now of ["2026-09-30", "2026-10-06", "bad date"]) {
    render(container, data, { now });
    assert.equal(container.querySelectorAll(".unit-dico-timeline-today").length, 0);
    assert.equal(container.querySelectorAll(".unit-dico-timeline-bar").length, 1);
    assert.equal(container.querySelectorAll("[data-unit-project-select]").length, 2);
    assert.equal(find(container, "[data-unit-timeline-start]").getAttribute("data-unit-timeline-start"), "2026-10-01");
    assert.equal(find(container, "[data-unit-timeline-end]").getAttribute("data-unit-timeline-end"), "2026-10-05");
  }
});

test("duration fills reveal individually on intersection without changing selectable bar geometry", () => {
  const { container, observers } = viewportFixture(), selections = [];
  render(container, fixture(), { now: "2026-10-05", onSelect: id => selections.push(id) });
  assert.equal(observers.length, 1);
  const observer = observers[0], bars = container.querySelectorAll(".unit-dico-timeline-bar");
  assert.equal(bars.length, 2); assert.equal(observer.options.threshold, 0);
  assert.deepEqual(Array.from(observer.observed), bars, "The untransformed project buttons are the viewport targets");
  assert.ok(bars.every(bar => bar.getAttribute("data-unit-timeline-reveal") === "pending"));
  const before = bars.map(bar => ({ left: bar.style.left, width: bar.style.width }));
  bars[0].dispatch("click"); assert.deepEqual(selections, [101], "Pending animation does not block project selection");
  observer.deliver([{ target: bars[0], isIntersecting: false }]);
  assert.equal(bars[0].getAttribute("data-unit-timeline-reveal"), "pending");
  observer.deliver([{ target: bars[0], isIntersecting: true }]);
  assert.equal(bars[0].getAttribute("data-unit-timeline-reveal"), "running");
  assert.equal(bars[1].getAttribute("data-unit-timeline-reveal"), "pending", "An off-screen row waits for its own reveal");
  assert.deepEqual(observer.unobserved, [bars[0]]);
  const fill = find(bars[0], ".unit-dico-timeline-fill");
  fill.dispatch("animationend", { animationName: "unrelated-animation" });
  assert.equal(bars[0].getAttribute("data-unit-timeline-reveal"), "running");
  fill.dispatch("animationend", { animationName: "unit-dico-bar-fill" });
  assert.equal(bars[0].getAttribute("data-unit-timeline-reveal"), "complete");
  observer.deliver([{ target: bars[0], isIntersecting: false }, { target: bars[0], isIntersecting: true }]);
  assert.equal(bars[0].getAttribute("data-unit-timeline-reveal"), "complete", "Leaving and re-entering cannot replay a completed row");
  observer.deliver([{ target: bars[1], isIntersecting: true }]);
  assert.equal(bars[1].getAttribute("data-unit-timeline-reveal"), "running");
  assert.deepEqual(observer.unobserved, bars); assert.equal(observer.disconnects, 1);
  assert.deepEqual(bars.map(bar => ({ left: bar.style.left, width: bar.style.width })), before);
  assert.ok(bars.every(bar => bar.style.transform === undefined), "Only the inner decorative fill animates");
  cleanup(container);
});

test("timeline cleanup and rerender disconnect old observers and ignore obsolete reveal or animation callbacks", () => {
  const { container, observers } = viewportFixture();
  render(container, fixture(), { now: "2026-10-05" });
  const firstObserver = observers[0], firstBar = find(container, ".unit-dico-timeline-bar"), firstFill = find(firstBar, ".unit-dico-timeline-fill");
  cleanup(container); cleanup(container);
  assert.equal(firstObserver.disconnects, 1, "Repeated cleanup is safe");
  firstObserver.deliver([{ target: firstBar, isIntersecting: true }]);
  firstFill.dispatch("animationend", { animationName: "unit-dico-bar-fill" });
  assert.equal(firstBar.getAttribute("data-unit-timeline-reveal"), "pending");
  render(container, fixture(), { now: "2026-10-05" });
  const secondObserver = observers[1], secondBar = find(container, ".unit-dico-timeline-bar");
  render(container, fixture(), { now: "2026-10-05" });
  assert.equal(secondObserver.disconnects, 1, "Rerender releases the previous viewport observer before replacing the chart");
  secondObserver.deliver([{ target: secondBar, isIntersecting: true }]);
  assert.equal(secondBar.getAttribute("data-unit-timeline-reveal"), "pending");
  const currentBar = find(container, ".unit-dico-timeline-bar");
  assert.notEqual(currentBar, secondBar); assert.equal(currentBar.getAttribute("data-unit-timeline-reveal"), "pending");
  cleanup(container);
});

test("reduced motion and unavailable viewport observers retain fully visible project durations", () => {
  for (const options of [{ reducedMotion: true }, { missingObserver: true }, { failingObserver: true }]) {
    const { container, observers } = viewportFixture(options);
    render(container, fixture(), { now: "2026-10-05" });
    const bars = container.querySelectorAll(".unit-dico-timeline-bar");
    assert.equal(observers.length, 0);
    assert.equal(bars.length, 2); assert.ok(bars.every(bar => bar.getAttribute("data-unit-timeline-reveal") === "complete"));
    assert.ok(bars.every(bar => Number.parseFloat(bar.style.width) > 0));
    assert.ok(bars.every(bar => find(bar, ".unit-dico-timeline-fill")));
    cleanup(container);
  }
});

test("a catalogue with no coherent duration never creates a viewport observer", () => {
  const { container, observers } = viewportFixture();
  render(container, { ...fixture(), projects: [project(1, "Missing", null, null), project(2, "Reversed", "2026-12-31", "2026-01-01")] }, { now: "2026-10-05" });
  assert.equal(observers.length, 0);
  assert.equal(container.querySelectorAll(".unit-dico-timeline-bar").length, 0);
  cleanup(container);
});

test("year-2999 projects remain selectable without timeline names, tracks or bars", () => {
  const container = domFixture(), selections = [], data = fixture();
  data.projects.push(project(2999, "Permanent project", "1900-01-01", "2999-12-31"));
  render(container, data, { onSelect: id => selections.push(id) });
  const choice = container.querySelectorAll("[data-unit-project-choice]").find(radio => radio.value === "2999");
  assert.ok(choice); choice.checked = true; choice.dispatch("change");
  assert.deepEqual(selections, [2999]);
  assert.ok(container.querySelectorAll("[data-unit-project-select]").every(control => control.getAttribute("data-unit-project-select") !== "2999"));
  assert.ok(container.querySelectorAll("[data-unit-timeline-project]").every(track => track.getAttribute("data-unit-timeline-project") !== "2999"));
  assert.equal(find(container, "[data-unit-timeline-start]").getAttribute("data-unit-timeline-start"), "2025-12-01");
  assert.equal(find(container, "[data-unit-timeline-end]").getAttribute("data-unit-timeline-end"), "2029-12-31");
});

test("a catalogue containing only year-2999 endings has an explicit empty calendar and selectable projects", () => {
  const container = domFixture(), data = { ...fixture(), projects: [project(1, "Permanent", "2026-01-01", "2999-12-31")] };
  const timeline = buildTimeline(data.projects);
  assert.equal(timeline.available, false); assert.equal(timeline.startDate, null); assert.equal(timeline.endDate, null);
  assert.equal(timeline.days, null); assert.deepEqual(timeline.rows, []); assert.deepEqual(timeline.ticks, []);
  render(container, data, { focusProjectId: 1 });
  assert.equal(container.querySelectorAll("[data-unit-project-choice]").length, 1);
  assert.equal(container.querySelectorAll(".unit-dico-timeline").length, 0);
  assert.ok(find(container, ".unit-dico-calendar").textContent.includes("les projets se terminant en 2999 sont exclus"));
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-project-choice"), "1");
});

test("unknown and reversed dates keep project choices and left-side names without invented bars", () => {
  const container = domFixture(), data = { ...fixture(), projects: [project(1, "Missing", null, null), project(2, "Reversed", "2026-12-31", "2026-01-01")] };
  render(container, data);
  assert.equal(container.querySelectorAll("[data-unit-project-choice]").length, 2);
  assert.equal(container.querySelectorAll(".unit-dico-timeline-bar").length, 0);
  assert.equal(container.querySelectorAll(".unit-dico-timeline-label").filter(element => element.tagName === "button").length, 2);
  assert.ok(container.textContent.includes("Dates incohérentes")); assert.ok(container.textContent.includes("Dates indisponibles"));
  assert.ok(container.textContent.includes("Échelle indisponible"));
});

test("unsafe labels and warnings render as plain text and unsafe photos fall back to initials", () => {
  const container = domFixture(), data = fixture(), malicious = '<img src=x onerror="PRIVATE_SCRIPT()">';
  data.projects[0].name = malicious; data.warnings = ["<script>private</script>", "<script>private</script>"];
  data.projects[0].manager.photoDataUrl = "https://example.test/private.png";
  data.projects[1].manager = { name: "Drew Example", photoDataUrl: "data:image/svg+xml;base64,PHN2Zz4=" };
  data.projects[2].manager = { name: "Casey Example", photoDataUrl: `data:image/png;base64,${"A".repeat(400001)}` };
  const original = structuredClone(data); render(container, data);
  assert.ok(container.textContent.includes(malicious)); assert.equal(container.querySelectorAll("img").length, 0);
  assert.ok(container.querySelectorAll(".unit-dico-initials").some(element => element.textContent === "AE"));
  assert.equal(container.querySelectorAll("li").length, 1); assert.deepEqual(data, original);
});

test("bounded raster manager photos stay decorative and an image failure preserves the initials", () => {
  const container = domFixture(); render(container, fixture());
  const image = find(container, "img"); assert.equal(image.src, photo); assert.equal(image.alt, ""); assert.equal(image.width, 24);
  assert.equal(find(container, ".unit-dico-avatar").title, "Responsable : Alex Example");
  image.dispatch("error"); assert.equal(image.hidden, true);
  assert.ok(container.querySelectorAll(".unit-dico-initials").some(element => element.textContent === "AE"));
});

test("loading, errors, retry and refresh are explicit without turning missing data into a zero portfolio", () => {
  const container = domFixture(), calls = [];
  render(container, null, { loading: true, onRefresh: () => calls.push("refresh") });
  assert.equal(container.getAttribute("aria-busy"), "true"); assert.ok(container.textContent.includes("Chargement"));
  assert.equal(find(container, "[data-unit-refresh]").getAttribute("aria-disabled"), "true");
  render(container, null, { error: "Source unavailable", onRetry: () => calls.push("retry"), onRefresh: () => calls.push("refresh") });
  assert.equal(container.getAttribute("aria-busy"), "false"); assert.ok(container.textContent.includes("Source unavailable"));
  find(container, "[data-unit-retry]").dispatch("click"); find(container, "[data-unit-refresh]").dispatch("click");
  assert.deepEqual(calls, ["retry", "refresh"]);
  render(container, { ...fixture(), projects: [] }); assert.ok(container.textContent.includes("Aucun projet de l’Unité DiCo accessible"));
  assert.equal(container.querySelectorAll("[data-unit-project-choice]").length, 0);
});

test("returning from details restores the selected radio and local rerenders retain timeline focus", () => {
  const container = domFixture(); render(container, fixture(), { focusProjectId: 102 });
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-project-choice"), "102");
  render(container, fixture()); assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-project-choice"), "102");
  const bar = container.querySelectorAll("[data-unit-project-select]").find(control => control.getAttribute("data-unit-project-kind") === "bar");
  bar.focus(); const id = bar.getAttribute("data-unit-project-select");
  render(container, fixture()); assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-project-select"), id);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-project-kind"), "bar");
});

test("refresh and retry focus survive status rerenders without a hidden-focus fallback", () => {
  const container = domFixture(), refresh = () => {};
  render(container, fixture(), { onRefresh: refresh }); find(container, "[data-unit-refresh]").focus();
  render(container, fixture(), { onRefresh: refresh }); assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-refresh"), "");
  render(container, null, { error: "Unavailable", onRetry: refresh }); find(container, "[data-unit-retry]").focus();
  render(container, null, { error: "Still unavailable", onRetry: refresh }); assert.equal(container.ownerDocument.activeElement.getAttribute("data-unit-retry"), "");
});

test("catalogue refresh and retry controls retain keyboard focus through loading and prevent duplicate requests", () => {
  const container = domFixture(), calls = [];
  const draw = (data, options = {}) => render(container, data, {
    onRefresh: () => calls.push("refresh"), onRetry: () => calls.push("retry"), ...options
  });
  draw(fixture(), { error: "Refresh unavailable" });
  let refresh = find(container, "[data-unit-refresh]"); refresh.focus(); refresh.dispatch("click");
  assert.deepEqual(calls, ["refresh"]);
  draw(fixture(), { loading: true }); refresh = find(container, "[data-unit-refresh]");
  assert.equal(container.ownerDocument.activeElement, refresh); assert.equal(refresh.getAttribute("aria-disabled"), "true");
  assert.notEqual(refresh.disabled, true, "The pending refresh stays focusable");
  refresh.dispatch("click"); assert.deepEqual(calls, ["refresh"]);
  draw(fixture()); refresh = find(container, "[data-unit-refresh]");
  assert.equal(container.ownerDocument.activeElement, refresh); assert.equal(refresh.getAttribute("aria-disabled"), "false");
  refresh.dispatch("click"); assert.deepEqual(calls, ["refresh", "refresh"]);

  draw(null, { error: "Projects unavailable" });
  let retry = find(container, "[data-unit-retry]"); retry.focus(); retry.dispatch("click");
  draw(null, { loading: true }); retry = find(container, "[data-unit-retry]");
  assert.equal(container.ownerDocument.activeElement, retry); assert.equal(retry.getAttribute("aria-disabled"), "true");
  assert.notEqual(retry.disabled, true, "The pending retry stays focusable");
  retry.dispatch("click"); assert.deepEqual(calls, ["refresh", "refresh", "retry"]);
  draw(null, { error: "Projects still unavailable" }); retry = find(container, "[data-unit-retry]");
  assert.equal(container.ownerDocument.activeElement, retry); assert.equal(retry.getAttribute("aria-disabled"), "false");
  retry.dispatch("click"); assert.deepEqual(calls, ["refresh", "refresh", "retry", "retry"]);
  draw(null, { loading: true }); draw(fixture());
  assert.equal(container.querySelectorAll("[data-unit-retry]").length, 0);
  assert.equal(container.ownerDocument.activeElement, find(container, "[data-unit-refresh]"),
    "A successful retry transfers focus to the remaining refresh control");
});

test("calendar view defaults to the existing full range and rejects unsupported view modes", () => {
  const input = fixture().projects, now = "2026-10-16";
  const original = buildTimeline(input, now);
  assert.equal(original.calendarView, "full");
  for (const calendarView of ["full", undefined, null, "years", {}, 3]) {
    assert.deepEqual(buildTimeline(input, now, { calendarView }), original);
  }
  assert.equal(original.outsideCount, 0);
  assert.deepEqual(buildConcurrency(input, now, { calendarView: "full" }), buildConcurrency(input, now));
});

test("near view uses fixed rolling Brussels dates rather than seven full calendar years or scope dates", () => {
  const input = [project(1, "Span", "2024-02-01", "2028-01-31")], original = structuredClone(input);
  const timeline = buildTimeline(input, "2026-10-15T22:30:00Z", { calendarView: "near", years: [2025] });
  assert.equal(timeline.calendarView, "near");
  assert.equal(timeline.startDate, "2023-10-16"); assert.equal(timeline.endDate, "2029-10-16");
  assert.equal(timeline.today.date, "2026-10-16");
  assert.equal(timeline.ticks[0].date, "2023-10-16"); assert.equal(timeline.ticks.at(-1).date, "2029-10-16");
  assert.equal(timeline.days, (Date.parse("2029-10-16") - Date.parse("2023-10-16")) / 86400000 + 1);
  assert.deepEqual(input, original);
});

test("near view clamps leap anniversaries and source-supported calendar limits", () => {
  const input = [project(1, "Span", "2020-01-01", "2030-01-01")];
  const leap = buildTimeline(input, "2024-02-29", { calendarView: "near" });
  assert.equal(leap.startDate, "2021-02-28"); assert.equal(leap.endDate, "2027-02-28");
  assert.equal(buildTimeline(input, "0001-01-01", { calendarView: "near" }).startDate, "0001-01-01");
  assert.equal(buildTimeline(input, "9999-12-31", { calendarView: "near" }).endDate, "9999-12-31");
  assert.equal(buildTimeline(input, "invalid", { calendarView: "near" }).calendarView, "full");
});

test("near view clips inclusive bars without mutating original dates or catalogue membership", () => {
  const input = [project(1, "Spans window", "2020-01-01", "2030-12-31"),
    project(2, "Left boundary", "2020-01-01", "2023-10-16"),
    project(3, "Right boundary", "2029-10-16", "2030-01-01"),
    project(4, "Before", "2023-10-15", "2023-10-15"),
    project(5, "After", "2029-10-17", "2029-10-17"),
    project(6, "Missing", null, "2035-01-01"), project(7, "Reversed", "2035-01-01", "2034-01-01"),
    project(8, "Open-ended", "2026-01-01", "2999-12-31"), project(9, "Interne", "2020-01-01", "2040-01-01")];
  const original = structuredClone(input), timeline = buildTimeline(input, "2026-10-16", { calendarView: "near" });
  assert.equal(timeline.projects.length, 8); assert.equal(timeline.outsideCount, 2);
  assert.deepEqual(timeline.rows.map(row => row.id).sort((a, b) => a - b), [1, 2, 3, 6, 7]);
  const span = timeline.rows.find(row => row.id === 1);
  assert.equal(span.start.value, "2020-01-01"); assert.equal(span.end.value, "2030-12-31");
  assert.equal(span.left, 0); assert.equal(span.width, 100);
  assert.equal(timeline.rows.find(row => row.id === 2).width, 100 / timeline.days);
  const right = timeline.rows.find(row => row.id === 3);
  assert.equal(right.left, (timeline.days - 1) / timeline.days * 100);
  assert.equal(right.width, 100 / timeline.days);
  assert.equal(timeline.rows.find(row => row.id === 6).width, null);
  assert.equal(timeline.rows.find(row => row.id === 7).width, null);
  assert.ok(timeline.rows.every(row => row.left == null || row.left >= 0 && row.left + row.width <= 100 + 1e-10));
  assert.deepEqual(input, original);
});

test("near concurrency clips partial months and carries projects already active at its left edge", () => {
  const input = [project(1, "Long span", "2020-01-01", "2030-12-31"),
    project(2, "Ends at start", "2020-01-01", "2023-10-16"),
    project(3, "Earlier October only", "2023-10-01", "2023-10-15"),
    project(4, "Starts at end", "2029-10-16", "2030-01-01")];
  const options = { calendarView: "near" }, timeline = buildTimeline(input, "2026-10-16", options);
  const result = buildConcurrency(input, "2026-10-16", options);
  assert.equal(result.available, true); assert.equal(result.months.length, 73);
  assert.deepEqual(result.ticks, timeline.ticks); assert.deepEqual(result.today, timeline.today);
  assert.equal(result.startDate, timeline.startDate); assert.equal(result.endDate, timeline.endDate);
  assert.equal(result.includedCount, 3); assert.equal(result.outsideCount, 1);
  assert.deepEqual([result.months[0].month, result.months[0].startDate, result.months[0].endDate, result.months[0].count],
    ["2023-10", "2023-10-16", "2023-10-31", 2]);
  assert.deepEqual([result.months.at(-1).startDate, result.months.at(-1).endDate, result.months.at(-1).count], ["2029-10-01", "2029-10-16", 2]);
  assert.equal(result.months.find(month => month.month === "2026-10").count, 1);
  assert.ok(Math.abs(result.months.reduce((sum, month) => sum + month.width, 0) - 100) < 1e-10);
});

test("a near window outside all known projects displays known zero counts with finite geometry", () => {
  const input = [project(1, "Long finished", "2010-01-01", "2011-12-31")], container = domFixture();
  const result = buildConcurrency(input, "2026-10-16", { calendarView: "near" });
  assert.equal(result.available, true); assert.equal(result.maxCount, 0); assert.equal(result.months.length, 73);
  assert.ok(result.months.every(month => month.count === 0)); assert.equal(result.includedCount, 0); assert.equal(result.outsideCount, 1);
  render(container, { projects: input }, { now: "2026-10-16", calendarView: "near" });
  assert.equal(container.querySelectorAll("[data-unit-project-choice]").length, 1);
  assert.equal(container.querySelectorAll("[data-unit-project-select]").length, 0);
  assert.match(container.textContent, /1 projet hors de cette fenêtre/);
  assert.match(container.textContent, /Aucun projet aux dates complètes dans cette fenêtre/);
  for (const path of container.querySelectorAll("path")) assert.doesNotMatch(path.getAttribute("d"), /NaN|Infinity/);
  assert.ok(find(container, ".unit-dico-concurrency").querySelectorAll("[data-unit-concurrency-month]").length > 0);
});

test("a fixed near axis does not convert unknown periods or excluded catalogues into known zero concurrency", () => {
  const unknown = buildConcurrency([project(1, "Unknown", null, null)], "2026-10-16", { calendarView: "near" });
  assert.equal(unknown.available, false); assert.equal(unknown.maxCount, null); assert.deepEqual(unknown.months, []);
  for (const input of [[], [project(2, "Open", "2020-01-01", "2999-01-01")], [project(3, "Overhead", "2020-01-01", "2040-01-01")]]) {
    assert.equal(buildTimeline(input, "2026-10-16", { calendarView: "near" }).available, false);
    assert.equal(buildConcurrency(input, "2026-10-16", { calendarView: "near" }).available, false);
  }
});

test("calendar view controls are native scoped radios that dispatch only a real selected change", () => {
  const container = domFixture(), calls = [];
  render(container, fixture(), { now: "2026-10-16", onCalendarViewChange: value => calls.push(value) });
  const full = find(container, '[data-unit-calendar-view="full"]'), near = find(container, '[data-unit-calendar-view="near"]');
  assert.equal(full.type, "radio"); assert.equal(near.type, "radio"); assert.equal(full.name, near.name);
  assert.equal(full.checked, true); assert.equal(near.checked, false);
  assert.match(find(container, ".unit-dico-calendar-views").textContent, /Période du calendrier.*Vue \+\/-3 ans.*Vue complète/);
  near.dispatch("change"); full.dispatch("change"); assert.deepEqual(calls, []);
  near.checked = true; near.dispatch("change"); assert.deepEqual(calls, ["near"]);
  render(container, fixture(), { now: "2026-10-16", calendarView: "near", onCalendarViewChange: value => calls.push(value) });
  const next = find(container, '[data-unit-calendar-view="near"]'); assert.equal(next.checked, true);
  assert.notEqual(next.name, near.name, "Controls have a new chart-scoped radio group after rerender");
  assert.equal(find(container, "[data-unit-timeline-start]").getAttribute("data-unit-timeline-start"), "2023-10-16");
  assert.equal(find(container, "[data-unit-concurrency-start]").getAttribute("data-unit-concurrency-start"), "2023-10-16");
  const back = find(container, '[data-unit-calendar-view="full"]'); back.checked = true; back.dispatch("change"); assert.deepEqual(calls, ["near", "full"]);
});

test("both timeline entry points preserve calendar-switch focus and explicit focus overrides", () => {
  for (const personal of [true, false]) {
    const container = domFixture();
    const draw = options => personal ? renderTimeline(container, fixture().projects, options) : render(container, fixture(), options);
    draw({ now: "2026-10-16" });
    find(container, '[data-unit-calendar-view="near"]').focus();
    draw({ now: "2026-10-16", calendarView: "near" });
    assert.equal(container.ownerDocument.activeElement, find(container, '[data-unit-calendar-view="near"]'));
    draw({ now: "2026-10-16", calendarView: "full", focusCalendarView: "full" });
    assert.equal(container.ownerDocument.activeElement, find(container, '[data-unit-calendar-view="full"]'));
  }
});

test("switching the window releases old reveal observers and synchronized scroll listeners", () => {
  const { container, observers } = viewportFixture();
  render(container, fixture(), { now: "2026-10-16" });
  const oldScrolls = container.querySelectorAll(".unit-dico-timeline-scroll"), removed = [];
  for (const scroll of oldScrolls) scroll.removeEventListener = (name, callback) => {
    assert.equal(name, "scroll"); assert.equal(scroll.listeners.get(name), callback); scroll.listeners.delete(name); removed.push(scroll);
  };
  const oldBar = find(container, ".unit-dico-timeline-bar");
  render(container, fixture(), { now: "2026-10-16", calendarView: "near" });
  assert.equal(observers[0].disconnects, 1); assert.deepEqual(removed, oldScrolls);
  observers[0].deliver([{ target: oldBar, isIntersecting: true }]);
  assert.equal(oldBar.getAttribute("data-unit-timeline-reveal"), "pending");
  const scrolls = container.querySelectorAll(".unit-dico-timeline-scroll"); scrolls[0].scrollLeft = 72; scrolls[1].scrollLeft = 0;
  scrolls[0].dispatch("scroll"); assert.equal(scrolls[1].scrollLeft, 72);
  cleanup(container); assert.equal(observers[1].disconnects, 1);
});

test("timeline catalogue translations have complete FR/NL keys and equal interpolation placeholders", () => {
  const placeholders = text => [...new Set(Array.from(text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g), match => match[1]))].sort();
  assert.ok(Object.keys(timelineMessages).length >= 50);
  for (const [key, message] of Object.entries(timelineMessages)) {
    assert.match(key, /^timeline\./); assert.equal(typeof message.fr, "string"); assert.equal(typeof message.nl, "string");
    assert.deepEqual(placeholders(message.fr), placeholders(message.nl), key);
  }
});

test("live Dutch and French timeline rendering localizes labels, tooltips and dates while preserving source identities", () => {
  const container = domFixture(), sourceName = "[eXtRAI] Unité pilote", managerName = "Marie Projet";
  const input = { projects: [{ ...project(1, sourceName, "2026-01-01", "2027-12-31"), manager: { name: managerName } }, project(2, "Sans dates source", null, null)] };
  const original = structuredClone(input);
  try {
    I18n.setLanguage("nl"); render(container, input, { now: "2026-10-16", calendarView: "near" });
    assert.match(container.textContent, /Eenheid DiCo · 02 \/ Projectkalender/);
    assert.match(container.textContent, /Weergave \+\/-3 jaar/); assert.match(container.textContent, /Volledige weergave/);
    assert.match(container.textContent, /Aantal projecten/); assert.match(container.textContent, /Maandwaarden/);
    assert.match(container.textContent, /Datums niet beschikbaar/); assert.ok(container.textContent.includes("eXtRAI"));
    assert.equal(find(container, '[data-unit-project-choice="1"]').getAttribute("aria-label"), sourceName);
    const avatar = container.querySelectorAll(".unit-dico-avatar").find(item => item.title.includes(managerName));
    assert.equal(avatar.title, `Verantwoordelijke: ${managerName}`);
    assert.equal(find(container, ".unit-dico-timeline-scroll").getAttribute("aria-label"), "Looptijdkalender van de projecten van Eenheid DiCo, horizontaal scrollen mogelijk");
    assert.match(find(container, "[data-unit-project-select]").getAttribute("aria-label"), /Projectweergave openen/);
    const month = find(container, '[data-unit-concurrency-month="2026-10"]'); month.dispatch("pointerenter");
    assert.match(find(container, ".unit-dico-concurrency-tooltip").textContent, /okt\.? 2026 · maximaal 1 gelijktijdig project/);
    I18n.setLanguage("fr"); render(container, input, { now: "2026-10-16", calendarView: "near" });
    assert.match(container.textContent, /Unité DiCo · 02 \/ Calendrier des projets/);
    assert.match(container.textContent, /Vue \+\/-3 ans/); assert.match(container.textContent, /Valeurs mensuelles/);
    assert.deepEqual(input, original); assert.equal(find(container, '[data-unit-calendar-view="near"]').checked, true);
    assert.equal(container.ownerDocument.listeners.size, 0);
  } finally { I18n.setLanguage("fr"); }
});

test("personal, unit and programme calendar labels use short project names while full source names remain accessible", () => {
  const input = [project(1, "[54252043] [eXtRAI] Long construction project name", "2025-12-01", "2028-05-31"),
    project(2, "56232072 - Renolab", "2026-01-01", "2027-12-31"),
    project(3, "Project without acronym", "2026-02-01", "2027-12-31")];
  const original = structuredClone(input);
  for (const kind of ["personal", "unit", "programme"]) {
    for (const calendarView of ["full", "near"]) {
      const container = domFixture(), options = { now: "2026-10-16", calendarView };
      if (kind === "personal") renderTimeline(container, input, options);
      else render(container, { projects: input }, { ...options,
        ...(kind === "programme" ? { heading: "DC3 · 02 / Calendrier des projets", radioName: "programme-project" } : {}) });
      const names = container.querySelectorAll(".unit-dico-timeline-name").map(element => find(element, "strong").textContent);
      assert.deepEqual(names, ["eXtRAI", "Renolab", "Project without acronym"], `${kind} / ${calendarView}`);
      for (const project of input) {
        const controls = container.querySelectorAll("[data-unit-project-select]").filter(control => control.getAttribute("data-unit-project-select") === String(project.id));
        assert.equal(controls.length, 2);
        for (const control of controls) {
          assert.ok(control.title.startsWith(`${project.name}\n`));
          assert.ok(control.getAttribute("aria-label").startsWith(`${project.name} · `));
        }
        if (kind !== "personal") assert.equal(find(container, `[data-unit-project-choice="${project.id}"]`).getAttribute("aria-label"), project.name);
      }
    }
  }
  assert.deepEqual(input, original);
});
