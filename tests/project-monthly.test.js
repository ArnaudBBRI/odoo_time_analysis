const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { summarize } = require("../project-monthly");

const now = new Date("2026-03-10T12:00:00Z");
const rawBudget = 3890.3967484570226;
const png = "data:image/png;base64,aW1hZ2U=";
const line = (employeeId, date, hours, extra = {}) => ({ projectId: 101, employeeId, employee: `Employee ${employeeId}`,
  date, hours, isSubcontractor: false, subcontractorClassification: "employee-function", ...extra });
const slot = (employeeId, start, end, hours, extra = {}) => ({ projectId: 101, employeeId, start, end, hours,
  isSubcontractor: false, ...extra });
const source = (lines = [], extra = {}) => ({ project: { id: 101, name: "Project" }, timesheets: { lines },
  lifetime: { startDate: "2026-01-15", endDate: "2026-03-31", conventionHours: 76, conventionStatus: "available" },
  contributors: [], ...extra });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test("monthly actuals use a continuous project-start to Brussels-today timeline, including zero months", () => {
  const input = source([line(1, "2026-01-14", 100), line(1, "2026-01-15", 4), line(1, "2026-03-10", 6),
    line(1, "2026-03-11", 200), line(1, "2025-12-01", 300), line(1, "2026-02-01", 999, { projectId: 102 })]);
  const before = structuredClone(input);
  const result = summarize(input, { now });
  assert.equal(result.status, "available");
  assert.equal(result.mode, "monthly");
  assert.equal(result.startDate, "2026-01-15");
  assert.equal(result.throughDate, "2026-03-10");
  assert.equal(result.endDate, "2026-03-31");
  assert.deepEqual(result.months, [{ key: "2026-01", label: "janvier 2026" },
    { key: "2026-02", label: "février 2026" }, { key: "2026-03", label: "mars 2026" }]);
  assert.deepEqual(result.employees[0].values, [4, 0, 6]);
  assert.deepEqual(result.total, [4, 0, 6]);
  assert.deepEqual(result.convention, [17, 28, 10]);
  assert.deepEqual(input, before);
});

test("exact employee IDs take priority over resource/name matches and profiles cannot change classification", () => {
  const input = source([line(1, "2026-02-01", 1, { resourceId: 111, employee: "Same name" }),
    line(2, "2026-02-01", 2, { employee: "Same name" }),
    line(null, "2026-02-01", 3, { resourceId: 333 }), line(null, "2026-02-01", 4, { employee: "" })], {
    contributors: [
      { employeeId: 1, resourceIds: [111], name: "Same name", photoDataUrl: png, isSubcontractor: true },
      { employeeId: 2, resourceIds: [], name: "Same name", photoDataUrl: "https://private.example/photo" },
      { employeeId: null, resourceIds: [333], name: "Known resource", photoDataUrl: "data:image/svg+xml;base64,PHN2Zy8+" },
      { employeeId: 99, resourceIds: [111], name: "Foreign metadata", photoDataUrl: null }
    ]
  });
  const result = summarize(input, { now });
  const people = new Map(result.employees.map(employee => [employee.id, employee]));
  assert.equal(people.size, 4);
  assert.equal(people.get("employee:1").name, "Same name");
  assert.equal(people.get("employee:1").photoDataUrl, png);
  assert.equal(people.get("employee:1").isSubcontractor, false);
  assert.deepEqual(people.get("employee:1").resourceIds, [111]);
  assert.equal(people.get("employee:2").photoDataUrl, null);
  assert.equal(people.get("resource:333").name, "Known resource");
  assert.equal(people.get("resource:333").photoDataUrl, null);
  assert.equal(people.get("unassigned").name, "Employé non identifié");
  assert.deepEqual(result.total, [0, 10, 0]);
});

test("record-level consultant exclusion is default and unknown functions remain included with fixed disclosure", () => {
  const input = source([line(1, "2026-02-01", 2), line(2, "2026-02-01", 10, { isSubcontractor: true }),
    line(3, "2026-02-01", 3, { subcontractorClassification: "unknown" }),
    line(4, "2026-02-01", 4, { subcontractorClassification: "planning-role" })], {
    warnings: ["Project assignments are unavailable; upstream sensitive text", "Do not reflect this upstream fault"]
  });
  const excluded = summarize(input, { now });
  assert.deepEqual(excluded.total, [0, 9, 0]);
  assert.equal(excluded.employees.some(employee => employee.id === "employee:2"), false);
  assert.ok(excluded.warnings.some(warning => /inconnues/.test(warning)));
  assert.ok(excluded.warnings.some(warning => /rôle de planning/.test(warning)));
  assert.ok(excluded.warnings.some(warning => /affectations/.test(warning)));
  assert.equal(excluded.warnings.some(warning => /sensitive|fault/.test(warning)), false);
  const included = summarize(input, { now, includeOrmitters: true });
  assert.deepEqual(included.total, [0, 19, 0]);
  assert.equal(included.employees.find(employee => employee.id === "employee:2").isSubcontractor, true);
  assert.deepEqual(included.convention, excluded.convention);
});

test("signed monthly corrections reconcile cents and preserve contributors with a zero lifetime net", () => {
  const input = source([line(1, "2026-01-20", 0.1), line(1, "2026-01-21", 0.2), line(1, "2026-02-01", -0.3),
    line(2, "2026-01-20", 5), line(2, "2026-01-21", -5),
    line(3, "2026-02-01", -2), line(4, "2026-02-01", 0.01)]);
  const result = summarize(input, { now });
  assert.deepEqual(result.employees.find(employee => employee.employeeId === 1).values, [0.3, -0.3, 0]);
  assert.equal(result.employees.some(employee => employee.employeeId === 2), false);
  assert.deepEqual(result.total, [0.3, -2.29, 0]);
  result.total.forEach((total, index) => assert.equal(Math.round(total * 100),
    result.employees.reduce((sum, employee) => sum + Math.round(employee.values[index] * 100), 0)));
});

test("actuals after project end remain included while convention allowance becomes zero", () => {
  const input = source([line(1, "2026-02-01", 4), line(1, "2026-03-10", 6)], {
    lifetime: { startDate: "2026-01-01", endDate: "2026-01-31", conventionHours: 31, conventionStatus: "available" }
  });
  const result = summarize(input, { now });
  assert.deepEqual(result.total, [0, 4, 6]);
  assert.deepEqual(result.convention, [31, 0, 0]);
});

test("inclusive leap-year calendar days and current partial months determine allowance", () => {
  const input = source([], { lifetime: { startDate: "2024-02-15", endDate: "2024-03-02", conventionHours: 17 } });
  const result = summarize(input, { now: new Date("2024-03-01T12:00:00Z") });
  assert.deepEqual(result.convention, [15, 1]);
  const february = summarize(input, { now: new Date("2024-02-29T12:00:00Z") });
  assert.deepEqual(february.convention, [15]);
  const oneDay = summarize(source([], { lifetime: { startDate: "2024-02-29", endDate: "2024-02-29", conventionHours: 7.25 } }),
    { now: new Date("2024-02-29T12:00:00Z") });
  assert.deepEqual(oneDay.convention, [7.25]);
});

test("raw convention precision is retained and full-period monthly allowances sum to that scalar", () => {
  const input = source([], { lifetime: { startDate: "2024-01-15", endDate: "2026-03-03", conventionHours: rawBudget,
    conventionStatus: "available" } });
  const result = summarize(input, { now });
  assert.equal(result.budgetStatus, "available");
  close(result.convention.reduce((sum, value) => sum + value, 0), rawBudget);
  close(result.convention[0], rawBudget * 17 / 779);
  assert.notEqual(result.convention[0], Math.round(result.convention[0] * 100) / 100);
});

test("Brussels midnight changes current day/month independently of the host timezone", () => {
  const input = source([line(1, "2026-03-31", 2), line(1, "2026-04-01", 3)], {
    lifetime: { startDate: "2026-03-31", endDate: "2026-04-01", conventionHours: 2 }
  });
  const before = summarize(input, { now: new Date("2026-03-31T21:59:59Z") });
  assert.equal(before.throughDate, "2026-03-31");
  assert.deepEqual(before.total, [2]);
  assert.deepEqual(before.convention, [1]);
  const after = summarize(input, { now: new Date("2026-03-31T22:00:00Z") });
  assert.equal(after.throughDate, "2026-04-01");
  assert.deepEqual(after.total, [2, 3]);
  assert.deepEqual(after.convention, [1, 1]);
});

test("a future start is explicit and missing/invalid start or source never invents zero actuals", () => {
  const future = summarize(source([], { lifetime: { startDate: "2027-01-01", endDate: "2027-12-31", conventionHours: 100 } }), { now });
  assert.equal(future.status, "not-started");
  assert.deepEqual(future.months, []);
  for (const startDate of [null, "", "2026-02-30", "2026-01-01T00:00:00Z", "0000-01-01"]) {
    const result = summarize(source([], { lifetime: { startDate, endDate: "2026-12-31", conventionHours: 100 } }), { now });
    assert.equal(result.status, "unavailable");
    assert.deepEqual(result.total, []);
    assert.ok(result.warnings.length > 0);
  }
  assert.equal(summarize(source([], { timesheets: null }), { now }).status, "unavailable");
  assert.equal(summarize(source([], { project: { id: 0 } }), { now }).status, "unavailable");
  assert.equal(summarize(source(), { now: new Date("invalid") }).status, "unavailable");
});

test("missing, invalid or reversed end removes only the convention baseline", () => {
  for (const endDate of [null, "2026-02-30", "2025-12-31"]) {
    const result = summarize(source([line(1, "2026-03-10", 4)], {
      lifetime: { startDate: "2026-01-01", endDate, conventionHours: 100, conventionStatus: "available" }
    }), { now });
    assert.equal(result.status, "available");
    assert.deepEqual(result.total, [0, 0, 4]);
    assert.equal(result.convention, null);
    assert.equal(result.budgetStatus, "available");
    assert.ok(result.warnings.some(warning => /référence conventionnelle/.test(warning)));
  }
});

test("budget status separates explicitly empty/nonpositive values from unavailable source values", () => {
  for (const [conventionHours, conventionStatus, expected] of [[null, "empty", "empty"], [0, "empty", "empty"],
    [-2, "empty", "empty"], [false, "empty", "empty"], ["  ", "empty", "empty"],
    [null, "unavailable", "unavailable"], [NaN, "unavailable", "unavailable"], [Infinity, "unavailable", "unavailable"]]) {
    const result = summarize(source([line(1, "2026-02-01", 4)], {
      lifetime: { startDate: "2026-01-01", endDate: "2026-12-31", conventionHours, conventionStatus }
    }), { now });
    assert.equal(result.budgetStatus, expected);
    assert.equal(result.convention, null);
    assert.deepEqual(result.total, [0, 4, 0]);
  }
});

test("malformed scoped dates/hours are ignored with bounded warnings and never reflected", () => {
  const rows = Array.from({ length: 100 }, () => line(1, "2026-02-30", 1));
  rows.push(line(1, "2026-02-01", "secret bad hours"), line(1, "2026-02-01", Infinity),
    line(1, "2026-02-01", false), line(1, "2026-02-01", ""), line(1, "2026-02-01", 2));
  const result = summarize(source(rows), { now });
  assert.equal(result.status, "available");
  assert.deepEqual(result.total, [0, 2, 0]);
  assert.equal(result.warnings.length, 2);
  assert.equal(result.warnings.some(warning => /secret/.test(warning)), false);
});

test("oversized timelines and unsafe hour totals fail explicitly without allocating huge ranges", () => {
  const tooLong = summarize(source([], { lifetime: { startDate: "1800-01-01", endDate: "2026-12-31", conventionHours: 100 } }), { now });
  assert.equal(tooLong.status, "unavailable");
  assert.deepEqual(tooLong.months, []);
  assert.ok(tooLong.warnings.some(warning => /2 400/.test(warning)));
  const invalidHours = summarize(source([line(1, "2026-02-01", Number.MAX_VALUE)]), { now });
  assert.deepEqual(invalidHours.total, [0, 0, 0]);
  assert.ok(invalidHours.warnings.some(warning => /heures invalides/.test(warning)));
  const unsafeSum = summarize(source([line(1, "2026-02-01", 8e13), line(1, "2026-02-02", 8e13)]), { now });
  assert.equal(unsafeSum.status, "unavailable");
  assert.deepEqual(unsafeSum.months, []);
  const unsafePrefix = summarize(source([line(1, "2026-01-20", 8e13), line(1, "2026-02-01", 8e13)]), { now, mode: "cumulative" });
  assert.equal(unsafePrefix.status, "unavailable");
});

test("large finite convention values do not overflow intermediate daily proration", () => {
  const result = summarize(source([], { lifetime: { startDate: "2026-01-01", endDate: "2026-12-31", conventionHours: 1e308 } }), { now });
  assert.equal(result.status, "available");
  assert.ok(result.convention.every(Number.isFinite));
  close(result.convention[0] / 1e308, 31 / 365);
});

test("explicit cumulative mode applies prefix sums to the same signed series and convention", () => {
  const result = summarize(source([line(1, "2026-01-20", 5), line(1, "2026-02-01", -5), line(2, "2026-03-10", 2)]),
    { now, mode: "cumulative" });
  assert.equal(result.mode, "cumulative");
  assert.deepEqual(result.total, [5, 0, 2]);
  assert.deepEqual(result.employees.find(employee => employee.employeeId === 1).values, [5, 0, 0]);
  assert.deepEqual(result.convention, [17, 45, 55]);
});

test("cumulative signed cents reconcile across inclusion changes while convention stops at the project end", () => {
  const input = source([line(1, "2026-01-20", 0.1), line(1, "2026-01-21", 0.2),
    line(1, "2026-02-01", -0.3), line(1, "2026-03-10", 1.11),
    line(2, "2026-01-20", 2.22), line(2, "2026-02-01", 0.1),
    line(2, "2026-02-02", 0.2), line(2, "2026-03-10", -0.1),
    line(3, "2026-01-20", 10.01, { isSubcontractor: true }),
    line(3, "2026-02-01", -0.01, { isSubcontractor: true }),
    line(3, "2026-03-10", 2.22, { isSubcontractor: true })], {
    lifetime: { startDate: "2026-01-15", endDate: "2026-02-05", conventionHours: rawBudget,
      conventionStatus: "available" }
  });
  const before = structuredClone(input);
  const excluded = summarize(input, { now, mode: "cumulative" });
  const included = summarize(input, { now, mode: "cumulative", includeOrmitters: true });
  assert.deepEqual(excluded.total, [2.52, 2.52, 3.53]);
  assert.deepEqual(excluded.employees.find(employee => employee.employeeId === 1).values, [0.3, 0, 1.11]);
  assert.deepEqual(excluded.employees.find(employee => employee.employeeId === 2).values, [2.22, 2.52, 2.42]);
  assert.deepEqual(included.total, [12.53, 12.52, 15.75]);
  assert.deepEqual(included.employees.find(employee => employee.employeeId === 3).values, [10.01, 10, 12.22]);
  for (const result of [excluded, included]) {
    result.total.forEach((total, index) => assert.equal(Math.round(total * 100),
      result.employees.reduce((sum, employee) => sum + Math.round(employee.values[index] * 100), 0)));
    close(result.convention[0], rawBudget * 17 / 22);
    close(result.convention[1], rawBudget);
    close(result.convention[2], rawBudget);
  }
  assert.deepEqual(included.months, excluded.months);
  assert.deepEqual(included.convention, excluded.convention);
  assert.deepEqual(summarize(input, { now, mode: "cumulative", years: [2025], selectedYears: [2024] }), excluded);
  assert.deepEqual(input, before);
});

test("employee linear planning uses full clipped lifetime allocations, including future hours, with raw precision", () => {
  const input = source([line(1, "2026-02-01", 4)], { planning: { ok: true, slots: [
    slot(1, "2025-12-31 00:00:00", "2026-01-31 00:00:00", 310.123456789),
    slot(1, "2026-03-11T00:00:00Z", "2026-04-10T00:00:00Z", 300.987654321),
    slot(1, "2026-04-01", "2026-05-01", 500),
    slot(1, "2026-01-15", "2026-03-31", 999, { projectId: 102 }),
    slot(2, "2026-01-15", "2026-03-31", 999)
  ] } });
  const before = structuredClone(input);
  const result = summarize(input, { now });
  const person = result.employees[0], planned = 310.123456789 * 16 / 31 + 300.987654321 * 21 / 30;
  assert.equal(result.employees.length, 1, "planned-only employees do not enter the actual legend");
  assert.equal(person.plannedStatus, "available");
  assert.equal(person.plannedWarning, null);
  close(person.plannedHours, planned);
  assert.notEqual(person.plannedHours, Math.round(person.plannedHours * 100) / 100);
  person.plannedReference.forEach((value, index) => close(value, planned * [17, 28, 10][index] / 76));
  assert.deepEqual(person.values, [0, 4, 0]);
  assert.deepEqual(summarize(input, { now, years: [2025], selectedYears: [2024] }), result);
  assert.deepEqual(input, before);
});

test("employee planning reference respects leap days, partial months, inclusive project end and cumulative plateau", () => {
  const input = source([line(1, "2024-02-16", 3), line(1, "2024-04-01", 4)], {
    lifetime: { startDate: "2024-02-15", endDate: "2024-03-02", conventionHours: 17 },
    planning: { slots: [slot(1, "2024-02-01", "2024-03-01", 290), slot(1, "2024-03-01", "2024-03-03", 20)] }
  });
  const february = summarize(input, { now: new Date("2024-02-29T12:00:00Z") }).employees[0];
  assert.equal(february.plannedHours, 170);
  assert.deepEqual(february.plannedReference, [150]);
  const march = summarize(input, { now: new Date("2024-03-01T12:00:00Z"), mode: "cumulative" }).employees[0];
  assert.deepEqual(march.plannedReference, [150, 160]);
  const monthly = summarize(input, { now: new Date("2024-04-01T12:00:00Z") }).employees[0];
  assert.deepEqual(monthly.plannedReference, [150, 20, 0]);
  const cumulative = summarize(input, { now: new Date("2024-04-01T12:00:00Z"), mode: "cumulative" }).employees[0];
  assert.deepEqual(cumulative.plannedReference, [150, 170, 170]);
  assert.deepEqual(cumulative.values, [3, 3, 7], "actual hours may continue after the reference plateaus");
});

test("planning prefers explicit employee IDs over coincident resources and never matches contributor names", () => {
  const input = source([line(1, "2026-02-01", 1, { resourceId: 111, employee: "Same name" }),
    line(2, "2026-02-01", 2, { employee: "Same name" })], {
    contributors: [{ employeeId: 1, resourceIds: [111], name: "Same name" },
      { employeeId: 2, resourceIds: [222], name: "Same name" },
      { employeeId: 99, resourceIds: [111], name: "Foreign owner" }],
    planning: { slots: [slot(1, "2026-01-15", "2026-04-01", 100, { resourceId: 222 }),
      slot(2, "2026-01-15", "2026-04-01", 200, { resourceId: 111 }),
      slot(99, "2026-01-15", "2026-04-01", 900, { resourceId: 111 })] }
  });
  const people = new Map(summarize(input, { now }).employees.map(employee => [employee.id, employee]));
  assert.equal(people.get("employee:1").plannedHours, 100);
  assert.equal(people.get("employee:2").plannedHours, 200);
});

test("resource-only plans use unique exact ownership and ambiguous resources fail closed even for excluded contributors", () => {
  const input = source([line(1, "2026-02-01", 1, { resourceId: 111 }),
    line(2, "2026-02-01", 2, { resourceId: 222 })], {
    contributors: [{ employeeId: 1, resourceIds: [111] }, { employeeId: 2, resourceIds: [222] },
      { employeeId: 99, resourceIds: [111], isSubcontractor: true }],
    planning: { slots: [slot(null, "2026-01-15", "2026-04-01", 100, { resourceId: 111 }),
      slot(null, "2026-01-15", "2026-04-01", 200, { resourceId: 222 })] }
  });
  const people = new Map(summarize(input, { now }).employees.map(employee => [employee.id, employee]));
  assert.equal(people.get("employee:1").plannedStatus, "unavailable");
  assert.equal(people.get("employee:1").plannedHours, null);
  assert.equal(people.get("employee:1").plannedReference, null);
  assert.match(people.get("employee:1").plannedWarning, /ambiguë/);
  assert.equal(people.get("employee:2").plannedHours, 200);
});

test("resource-only actual identities accept unique contributor mappings or exact resources without name inference", () => {
  const input = source([line(null, "2026-02-01", 1, { resourceId: 222 }),
    line(null, "2026-02-01", 2, { resourceId: 333 }), line(null, "2026-02-01", 3, { employee: "Employee 2" })], {
    contributors: [{ employeeId: 2, resourceIds: [222] }],
    planning: { slots: [slot(2, "2026-01-15", "2026-04-01", 100),
      slot(null, "2026-01-15", "2026-04-01", 50, { resourceId: 222 }),
      slot(null, "2026-01-15", "2026-04-01", 20, { resourceId: 333 })] }
  });
  const people = new Map(summarize(input, { now }).employees.map(employee => [employee.id, employee]));
  assert.equal(people.get("resource:222").plannedHours, 150);
  assert.equal(people.get("resource:333").plannedHours, 20);
  assert.equal(people.get("unassigned").plannedStatus, "unavailable");
  assert.equal(people.get("unassigned").plannedReference, null);
});

test("unmapped resource allocations cannot turn incomplete employee identity metadata into known-zero planning", () => {
  const input = source([line(1, "2026-02-01", 1), line(2, "2026-02-01", 2)], {
    contributors: [{ employeeId: 1, resourceIds: [] }, { employeeId: 2, resourceIds: [222] }],
    planning: { slots: [slot(null, "2026-01-15", "2026-04-01", 100, { resourceId: 999 })] }
  });
  const people = new Map(summarize(input, { now }).employees.map(employee => [employee.id, employee]));
  assert.equal(people.get("employee:1").plannedReference, null);
  assert.equal(people.get("employee:1").plannedHours, null);
  assert.match(people.get("employee:1").plannedWarning, /ressources/);
  assert.equal(people.get("employee:2").plannedHours, 0, "known exact resource metadata excludes a different resource");
  input.planning.slots[0] = slot(null, "2026-04-01", "2026-05-01", 100, { resourceId: 999 });
  assert.equal(summarize(input, { now }).employees[0].plannedHours, 0, "allocations outside project dates cannot affect the lifetime total");
});

test("malformed allocation identities and unresolved explicit employees never borrow a coincident resource", () => {
  const input = source([line(1, "2026-02-01", 1, { resourceId: 111 }), line(null, "2026-02-01", 2, { resourceId: 333 })], {
    contributors: [{ employeeId: 1, resourceIds: [111] }],
    planning: { slots: [slot("invalid employee", "2026-01-15", "2026-04-01", 100, { resourceId: 111 }),
      slot(99, "2026-01-15", "2026-04-01", 200, { resourceId: 333 })] }
  });
  const people = new Map(summarize(input, { now }).employees.map(employee => [employee.id, employee]));
  assert.equal(people.get("employee:1").plannedHours, null);
  assert.match(people.get("employee:1").plannedWarning, /identité invalide/);
  assert.equal(people.get("resource:333").plannedHours, null);
  assert.match(people.get("resource:333").plannedWarning, /résolue/);
});

test("missing planning is unavailable while accessible empty planning is a genuine zero reference", () => {
  const lines = [line(1, "2026-02-01", 3)];
  for (const planning of [null, undefined, { ok: false, slots: [] }, { slots: null }]) {
    const person = summarize(source(lines, { planning }), { now }).employees[0];
    assert.equal(person.plannedStatus, "unavailable");
    assert.equal(person.plannedHours, null);
    assert.equal(person.plannedReference, null);
    assert.match(person.plannedWarning, /indisponible/);
  }
  const zero = summarize(source(lines, { planning: { ok: true, slots: [] } }), { now }).employees[0];
  assert.equal(zero.plannedStatus, "available");
  assert.equal(zero.plannedHours, 0);
  assert.deepEqual(zero.plannedReference, [0, 0, 0]);
  for (const endDate of [null, "2026-02-30", "2025-12-31"]) {
    const person = summarize(source(lines, { planning: { slots: [] },
      lifetime: { startDate: "2026-01-15", endDate, conventionHours: 100 } }), { now }).employees[0];
    assert.equal(person.plannedReference, null);
    assert.match(person.plannedWarning, /Dates du projet/);
  }
});

test("employee planning keeps signed finite hours but malformed matching allocations remain unavailable", () => {
  const lines = [line(1, "2026-02-01", 3), line(2, "2026-02-01", 4)];
  const signed = summarize(source(lines, { planning: { slots: [slot(1, "2026-01-15", "2026-04-01", "10.125"),
    slot(1, "2026-01-15", "2026-04-01", -12.25)] } }), { now }).employees[0];
  assert.equal(signed.plannedHours, -2.125);
  assert.ok(signed.plannedReference.every(value => value < 0));
  const signedAfterEnd = summarize(source(lines, { planning: { slots: [slot(1, "2026-01-15", "2026-04-01", -2.125)] } }),
    { now: new Date("2026-04-01T12:00:00Z") }).employees[0];
  assert.equal(signedAfterEnd.plannedReference.at(-1), 0, "negative plans still have an ordinary zero allowance after the end");
  const invalid = [slot(1, "2026-02-30", "2026-03-10", 10), slot(1, "2026-02-01", "2026-02-01", 10),
    slot(1, "2026-02-02", "2026-02-01", 10), slot(1, "2026-02-01", "2026-03-01", false),
    slot(1, "2026-02-01", "2026-03-01", ""), slot(1, "2026-02-01", "2026-03-01", Infinity),
    slot(1, "2026-02-01", "2026-03-01", "private invalid value")];
  for (const allocation of invalid) {
    const result = summarize(source(lines, { planning: { slots: [allocation] } }), { now });
    const person = result.employees.find(employee => employee.employeeId === 1);
    assert.equal(person.plannedReference, null);
    assert.equal(person.plannedHours, null);
    assert.doesNotMatch(person.plannedWarning, /private/);
    assert.equal(result.employees.find(employee => employee.employeeId === 2).plannedHours, 0);
    assert.deepEqual(result.total, [0, 7, 0]);
  }
});

test("Ormitter exclusion applies to employee planning and its inclusion changes do not alter convention", () => {
  const input = source([line(1, "2026-02-01", 3), line(2, "2026-02-01", 4, { isSubcontractor: true })], {
    planning: { slots: [slot(1, "2026-01-15", "2026-04-01", 20),
      slot(1, "2026-01-15", "2026-04-01", 10, { isSubcontractor: true }),
      slot(2, "2026-01-15", "2026-04-01", 200, { isSubcontractor: true })] }
  });
  const excluded = summarize(input, { now }), included = summarize(input, { now, includeOrmitters: true });
  assert.equal(excluded.employees.length, 1);
  assert.equal(excluded.employees[0].plannedHours, 20);
  assert.equal(included.employees.find(employee => employee.employeeId === 1).plannedHours, 30);
  assert.equal(included.employees.find(employee => employee.employeeId === 2).plannedHours, 200);
  assert.deepEqual(included.convention, excluded.convention);
});

test("the same dependency-free API is exposed as a browser UMD global", () => {
  const context = vm.createContext({ Intl, Date });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../project-monthly.js"), "utf8"), context);
  assert.equal(typeof context.ProjectMonthly.summarize, "function");
  const actual = context.ProjectMonthly.summarize(source([line(1, "2026-02-01", 3)]), { now });
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), summarize(source([line(1, "2026-02-01", 3)]), { now }));
});
