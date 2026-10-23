"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { summarize } = require("../project-planning");
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);
const own = { status: "person", employeeId: 10 }, colleague = { status: "person", employeeId: 11 };
const slot = (hours, extra = {}) => ({ projectId: 1, employeeId: 10, resourceId: 20,
  start: "2025-12-31T23:00:00Z", end: "2026-01-02T23:00:00Z", hours, planningIdentity: own, ...extra });
const line = (hours, extra = {}) => ({ projectId: 1, employeeId: 10, resourceId: 20, date: "2026-01-02", hours, ...extra });
const source = (extra = {}) => ({ project: { id: 1 }, employee: { ids: [10], resourceIds: [20] },
  lifetime: { startDate: "2026-01-01", endDate: "2026-01-10", conventionHours: 100, conventionStatus: "available" },
  timesheets: { ok: true, lines: [] }, planning: { ok: true, slots: [] }, ...extra });
const today = { now: "2026-01-02" };

test("personal and project comparisons use distinct raw lifetime cohorts with signed hours and confirmed TH", () => {
  const input = source({ timesheets: { ok: true, lines: [line(20, { date: "2026-01-01" }), line(-3),
    line(30, { employeeId: 11 }), line(900, { isSubcontractor: true }), line(800, { projectId: 99 })] },
    planning: { ok: true, slots: [slot(20), slot(-4, { start: "2026-01-01T23:00:00Z" }),
      slot(10, { planningIdentity: { status: "to-hire", employeeId: null }, resourceId: 21 }),
      slot(4, { planningIdentity: colleague, employeeId: 11 }), slot(600, { isSubcontractor: true }), slot(500, { projectId: 99 })] } });
  const before = structuredClone(input), result = summarize(input, today);
  assert.deepEqual(result.personalToDate, { actualHours: 17, actualStatus: "available", plannedHours: 16,
    plannedStatus: "available", difference: 1, status: "available" });
  close(result.actualHours, 47); close(result.plannedToDateHours, 30); close(result.planningToDateDifference, 17);
  close(result.conventionToDateHours, 20); close(result.conventionToDateDifference, 27);
  const switched = summarize(input, { ...today, includeOrmitters: true, years: [2099],
    scope: { startDate: "2099-01-01", endDate: "2099-12-31" }, ignoredEmployeeIds: new Set(["employee:10"]) });
  assert.deepEqual(switched.personalToDate, result.personalToDate);
  assert.equal(switched.planningToDateDifference, result.planningToDateDifference);
  assert.equal(switched.conventionToDateDifference, result.conventionToDateDifference);
  assert.deepEqual(input, before);
});

test("own actual employee IDs precede resource fallbacks and planning snapshots precede compatibility IDs", () => {
  const input = source({ timesheets: { lines: [line(2), line(3, { employeeId: null }),
    line(100, { employeeId: 11 }), line(100, { employeeId: 11, employee: "Same own name" })] },
    planning: { slots: [slot(4, { employeeId: 11 }), slot(200, { planningIdentity: colleague }),
      slot(300, { planningIdentity: { status: "to-hire", employeeId: null } }),
      slot(400, { planningIdentity: { status: "unlinked", employeeId: null } })] } });
  const personal = summarize(input, today).personalToDate;
  assert.equal(personal.actualHours, 5); assert.equal(personal.plannedHours, 4); assert.equal(personal.difference, 1);
  const direct = slot(7, { resourceId: null }); delete direct.planningIdentity;
  assert.equal(summarize(source({ planning: { slots: [direct] } }), today).personalToDate.plannedHours, 7);
  const resourceOnly = slot(8, { employeeId: null }); delete resourceOnly.planningIdentity;
  assert.equal(summarize(source({ planning: { slots: [resourceOnly], resources: [{ id: 20,
    isToHire: false, linkStatus: "unknown" }] } }), today).personalToDate.plannedHours, 8);
});

test("unknown or malformed planning snapshots never borrow an own technical ID or known resource owner", () => {
  for (const snapshot of [{ status: "unknown", employeeId: null }, {}, null, false, "person", 10, undefined]) {
    const input = source({ planning: { slots: [slot(10, { planningIdentity: snapshot })],
      resources: [{ id: 20, employeeId: 10, isToHire: false, linkStatus: "linked" }] } });
    const result = summarize(input, today);
    assert.equal(result.plannedToDateHours, 10, "The independently known project total still includes these hours");
    assert.equal(result.personalToDate.actualHours, 0);
    assert.equal(result.personalToDate.plannedStatus, "unavailable"); assert.equal(result.personalToDate.plannedHours, null);
    assert.equal(result.personalToDate.difference, null);
    input.planning.slots[0].hours = 0;
    assert.equal(summarize(input, today).personalToDate.plannedHours, 0, "A proven zero cannot introduce uncertain personal hours");
  }
  const missing = slot(10); delete missing.planningIdentity;
  assert.equal(summarize(source({ planning: { slots: [missing] } }), today).personalToDate.plannedHours, null,
    "A resource-linked technical employee ID without non-TH evidence is not a person assignment");
});

test("missing own identity affects only personal results and a verified empty own cohort remains known zero", () => {
  for (const employee of [undefined, {}, { ids: [], resourceIds: [] }, { ids: ["10", 0, -1], resourceIds: [] }]) {
    const result = summarize(source({ employee, planning: { slots: [slot(10)] }, timesheets: { lines: [line(4)] } }), today);
    assert.deepEqual(result.personalToDate, { actualHours: null, actualStatus: "unavailable", plannedHours: null,
      plannedStatus: "unavailable", difference: null, status: "unavailable" });
    assert.equal(result.actualHours, 4); assert.equal(result.plannedToDateHours, 10); assert.equal(result.conventionToDateHours, 20);
  }
  assert.deepEqual(summarize(source(), today).personalToDate, { actualHours: 0, actualStatus: "available",
    plannedHours: 0, plannedStatus: "available", difference: 0, status: "available" });
});

test("denied actual and planning sources preserve independent personal counterparts without borrowing stale totals", () => {
  const initial = () => source({ timesheets: { lines: [line(5)] }, planning: { slots: [slot(2)] } });
  for (const change of [data => { data.planning.ok = false; }, data => { data.planningError = "denied"; }, data => { delete data.planning; }]) {
    const data = initial(); change(data); const result = summarize(data, today);
    assert.equal(result.personalToDate.actualHours, 5); assert.equal(result.personalToDate.actualStatus, "available");
    assert.equal(result.personalToDate.plannedHours, null); assert.equal(result.personalToDate.difference, null);
    assert.equal(result.conventionToDateDifference, -15);
  }
  for (const change of [data => { data.timesheets.ok = false; }, data => { data.timesheetsError = "denied"; }, data => { delete data.timesheets; }]) {
    const data = initial(); change(data); const personal = summarize(data, today).personalToDate;
    assert.equal(personal.actualHours, null); assert.equal(personal.plannedHours, 2); assert.equal(personal.plannedStatus, "available");
    assert.equal(personal.difference, null);
  }
  const noConvention = initial(); noConvention.lifetime.conventionStatus = "unavailable";
  assert.equal(summarize(noConvention, today).personalToDate.difference, 3);
});

test("personal references use inclusive Brussels days and cap expectations while keeping post-end actual credits", () => {
  const input = source({ timesheets: { lines: [line(500, { date: "2025-12-31" }), line(3, { date: "2026-01-01" }),
    line(8, { date: "2026-01-10" }), line(7, { date: "2026-02-01" }), line(-2, { date: "2026-02-01" })] },
    planning: { slots: [slot(100, { end: "2026-01-10T23:00:00Z" })] } });
  for (const [now, planned, actual] of [["2025-12-31", 0, 0], ["2026-01-01", 10, 3],
    ["2026-01-10", 100, 11], ["2026-02-01", 100, 16]]) {
    const personal = summarize(input, { now }).personalToDate;
    close(personal.plannedHours, planned); close(personal.actualHours, actual); close(personal.difference, actual - planned);
  }
  const future = source({ lifetime: { startDate: "2027-01-01", endDate: "2027-01-10", conventionHours: 100 } });
  delete future.planning;
  assert.equal(summarize(future, today).personalToDate.plannedHours, 0);
  assert.equal(summarize(input, { now: false }).personalToDate.difference, null);
});

test("personal dated planning reuses real 23/25-hour Brussels slot fractions instead of convention calendar fractions", () => {
  for (const [startDate, endDate, now, start, end, hours, expected] of [
    ["2026-03-28", "2026-03-30", "2026-03-29T22:30:00+02:00", "2026-03-27T23:00:00Z", "2026-03-30T22:00:00Z", 71, 47],
    ["2026-10-24", "2026-10-26", "2026-10-25T22:30:00+01:00", "2026-10-23T22:00:00Z", "2026-10-26T23:00:00Z", 73, 49]
  ]) {
    const input = source({ lifetime: { startDate, endDate, conventionHours: 300 },
      planning: { slots: [slot(hours, { start, end })] }, timesheets: { lines: [line(40, { date: now.slice(0, 10) })] } });
    const result = summarize(input, { now });
    close(result.personalToDate.plannedHours, expected); close(result.personalToDate.difference, 40 - expected);
    close(result.conventionToDateHours, 200);
  }
});

test("signed zero, malformed own allocations and overflow remain distinct without poisoning proven personal counterparts", () => {
  const signed = summarize(source({ timesheets: { lines: [line(-2.25)] }, planning: { slots: [slot(-10.125)] } }), today);
  close(signed.personalToDate.plannedHours, -10.125); close(signed.personalToDate.difference, 7.875);
  const malformed = source({ timesheets: { lines: [line(4)] }, planning: { slots: [slot(null)] } });
  assert.equal(summarize(malformed, today).personalToDate.plannedHours, null);
  assert.equal(summarize(malformed, today).personalToDate.actualHours, 4);
  malformed.planning.slots = [slot(7), slot(null, { planningIdentity: colleague, employeeId: 11 })];
  assert.equal(summarize(malformed, today).plannedToDateHours, null);
  assert.equal(summarize(malformed, today).personalToDate.plannedHours, 7, "A proven foreign invalid amount cannot erase known own planning");
  const overflow = source({ timesheets: { lines: [line(Number.MAX_VALUE), line(Number.MAX_VALUE)] }, planning: { slots: [] } });
  assert.equal(summarize(overflow, today).personalToDate.actualHours, null);
  assert.equal(summarize(overflow, today).personalToDate.plannedHours, 0);
  overflow.timesheets.lines = [line(Number.MAX_VALUE)]; overflow.planning.slots = [slot(-Number.MAX_VALUE)];
  assert.equal(summarize(overflow, today).personalToDate.actualStatus, "available");
  assert.equal(summarize(overflow, today).personalToDate.plannedStatus, "available");
  assert.equal(summarize(overflow, today).personalToDate.difference, null);
});
