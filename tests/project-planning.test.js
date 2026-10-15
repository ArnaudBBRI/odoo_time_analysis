const assert = require("node:assert/strict");
const test = require("node:test");
const { summarize } = require("../project-planning");
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);
const person = { status: "person", employeeId: 7 }, hire = { status: "to-hire", employeeId: null }, unlinked = { status: "unlinked", employeeId: null };
function slot(start, end, hours, identity = person, extra = {}) { return { projectId: 11, start, end, hours, planningIdentity: identity, ...extra }; }
function fixture(slots = [], startDate = "2026-01-01", endDate = "2026-01-10") {
  return { project: { id: 11 }, lifetime: { startDate, endDate, conventionHours: 100, conventionStatus: "available" },
    planning: { ok: true, slots, resources: [{ id: 21, name: "TH_DiCo", linkStatus: "unlinked", employeeId: null, isToHire: true },
      { id: 22, name: "Collective team", linkStatus: "unlinked", employeeId: null, isToHire: false }] } };
}
const options = { now: "2026-01-02" };

test("full-life UTC proration preserves signed totals and subtracts only confirmed TH while filtering foreign projects and Ormitters", () => {
  const data = fixture([
    slot("2025-12-31", "2026-01-05", 50), slot("2026-01-02", "2026-01-04", 20, hire, { resourceId: 21 }),
    slot("2026-01-02", "2026-01-03", -5, hire, { resourceId: 21 }),
    slot("2026-01-02", "2026-01-04", 120, person, { isSubcontractor: true }),
    slot("2026-01-02", "2026-01-04", 500, person, { projectId: 22 })
  ], "2026-01-02", "2026-01-03"), original = structuredClone(data);
  const result = summarize(data, options);
  close(result.totalPlanned, 35); close(result.knownToHireHours, 15); close(result.plannedWithoutKnownToHire, 20);
  close(result.difference, -65); assert.equal(result.toHireStatus, "complete");
  assert.deepEqual(result.toHireResources, [{ id: 21, name: "TH_DiCo", hours: 15 }]);
  close(summarize(data, { ...options, includeOrmitters: true }).totalPlanned, 155); assert.deepEqual(data, original);
});

test("a verified empty plan differs from denied planning and retains a known convention shortfall", () => {
  const empty = summarize(fixture(), options);
  assert.equal(empty.totalPlanned, 0); assert.equal(empty.knownToHireHours, 0); assert.equal(empty.toHireStatus, "complete");
  assert.equal(empty.difference, -100); assert.equal(empty.coverage.status, "no-substantial-gaps"); assert.equal(empty.coverage.gapDays, 0);
  assert.equal(empty.coverage.allGapDays, 9);
  const denied = fixture(); denied.planning.ok = false;
  const missing = summarize(denied, options); assert.equal(missing.totalPlanned, null); assert.equal(missing.coverage.status, "unavailable");
});

test("calendar-day coverage merges partial daily shifts without inventing overnight gaps or working-day exclusions", () => {
  const data = fixture([slot("2026-01-01T08:00:00Z", "2026-01-01T09:00:00Z", 1),
    slot("2026-01-02T08:00:00Z", "2026-01-02T09:00:00Z", 1), slot("2026-01-03T08:00:00Z", "2026-01-03T09:00:00Z", 1)], "2026-01-01", "2026-01-03");
  const result = summarize(data, { now: "2026-01-01" });
  assert.equal(result.coverage.status, "complete"); assert.equal(result.coverage.gapDays, 0); assert.deepEqual(result.coverage.gaps, []);
});

test("TH and confirmed other unlinked resources do not fill real-person future gaps", () => {
  const data = fixture([slot("2026-01-02T08:00:00Z", "2026-01-02T09:00:00Z", 1),
    slot("2026-01-04T08:00:00Z", "2026-01-05T17:00:00Z", 8),
    slot("2026-01-03", "2026-01-11", 100, hire, { resourceId: 21 }),
    slot("2026-01-03", "2026-01-11", 10, unlinked, { resourceId: 22 })]);
  const result = summarize(data, { now: "2026-01-01T23:30:00Z" });
  assert.equal(result.coverage.startDate, "2026-01-02"); assert.equal(result.coverage.status, "no-substantial-gaps");
  assert.deepEqual(result.coverage.gaps, []);
  assert.deepEqual(result.coverage.shortGaps, [{ startDate: "2026-01-03", endDate: "2026-01-03", days: 1 },
    { startDate: "2026-01-06", endDate: "2026-01-10", days: 5 }]);
  assert.equal(result.coverage.gapDays, 0); assert.equal(result.coverage.allGapDays, 6);
  assert.deepEqual(result.unlinkedResources, [{ id: 22, name: "Collective team", hours: 10 }]);
});

test("exclusive local midnight slot ends do not cover the following day across Brussels daylight saving", () => {
  const data = fixture([slot("2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z", 23)], "2026-03-29", "2026-03-30");
  const result = summarize(data, { now: "2026-03-28T23:30:00Z" });
  assert.deepEqual(result.coverage.shortGaps, [{ startDate: "2026-03-30", endDate: "2026-03-30", days: 1 }]);
  close(result.totalPlanned, 22);
});

test("unknown identities make potential gaps indeterminate without hiding an independently proven fully covered period", () => {
  const unknown = slot("2026-01-01", "2026-01-11", 100, { status: "unknown", employeeId: null }, { resourceId: 99 });
  const uncertain = summarize(fixture([unknown], "2026-01-01", "2026-03-01"), options);
  assert.equal(uncertain.totalPlanned, 100); assert.equal(uncertain.toHireStatus, "unavailable"); assert.equal(uncertain.knownToHireHours, null);
  assert.equal(uncertain.plannedWithoutKnownToHire, null); assert.equal(uncertain.coverage.status, "unavailable"); assert.deepEqual(uncertain.coverage.gaps, []);
  const covered = summarize(fixture([unknown, slot("2026-01-01", "2026-01-11", 10)]), options);
  assert.equal(covered.toHireStatus, "partial"); assert.equal(covered.knownToHireHours, 0); assert.equal(covered.plannedWithoutKnownToHire, 110);
  assert.equal(covered.coverage.status, "complete");
});

test("negative person or unknown corrections invalidate otherwise full coverage while negative confirmed TH cannot cancel real people", () => {
  for (const identity of [person, { status: "unknown", employeeId: null }]) {
    const result = summarize(fixture([slot("2026-01-01", "2026-01-11", 100), slot("2026-01-02", "2026-01-03", -10, identity)]), options);
    assert.equal(result.totalPlanned, 90); assert.equal(result.coverage.status, "unavailable");
  }
  const th = summarize(fixture([slot("2026-01-01", "2026-01-11", 100), slot("2026-01-02", "2026-01-03", -10, hire, { resourceId: 21 })]), options);
  assert.equal(th.coverage.status, "complete"); assert.equal(th.knownToHireHours, -10); assert.equal(th.plannedWithoutKnownToHire, 100);
  const nonPerson = summarize(fixture([slot("2026-01-01", "2026-01-11", 100),
    slot("2026-01-02", "2026-01-03", -10, unlinked, { resourceId: 22 }),
    slot("2026-01-02", "2026-01-03", null, hire, { resourceId: 21 })]), options);
  assert.equal(nonPerson.coverage.status, "complete"); assert.equal(nonPerson.totalPlanned, null);
});

test("legacy mutable employee fields and TH-looking names never replace the validated identity snapshot", () => {
  const data = fixture([slot("2026-01-01", "2026-03-02", 100, undefined, { employeeId: 7, resourceId: 21 })], "2026-01-01", "2026-03-01");
  delete data.planning.slots[0].planningIdentity;
  const result = summarize(data, options);
  assert.equal(result.toHireStatus, "unavailable"); assert.equal(result.coverage.status, "unavailable");
  assert.equal(result.toHireResources.length, 0);
});

test("invalid hours or dates keep totals and affected future coverage unavailable instead of fabricating zeros", () => {
  for (const row of [slot("2026-02-30", "2026-03-02", 50), slot("2026-01-03", "2026-01-02", 50), slot("2026-01-01", "2026-01-11", null)]) {
    const result = summarize(fixture([row]), options); assert.equal(result.totalPlanned, null); assert.equal(result.coverage.status, "unavailable");
  }
  const dates = fixture(); dates.lifetime.endDate = null;
  assert.equal(summarize(dates, options).status, "unavailable");
});

test("missing or nonpositive convention hours retain their source-empty state and no invented delta", () => {
  for (const value of [0, -1, null]) {
    const data = fixture(); data.lifetime.conventionHours = value; data.lifetime.conventionStatus = "empty";
    const result = summarize(data, options); assert.equal(result.conventionHours, null); assert.equal(result.conventionStatus, "empty"); assert.equal(result.difference, null);
  }
  const denied = fixture(); denied.lifetime.conventionStatus = "unavailable";
  assert.equal(summarize(denied, options).conventionHours, null);
});

test("ended projects have no remaining gaps and sentinel end dates use bounded interval arithmetic", () => {
  const ended = summarize(fixture(), { now: "2026-02-01" }); assert.equal(ended.coverage.status, "complete"); assert.equal(ended.coverage.gapDays, 0);
  const long = summarize(fixture([], "2026-01-01", "2999-12-31"), options);
  assert.equal(long.coverage.status, "gaps"); assert.equal(long.coverage.gaps.length, 1);
  assert.equal(long.coverage.gaps[0].endDate, "2999-12-31"); assert.ok(long.coverage.gapDays > 300000);
});

const actualLine = (date, hours, extra = {}) => ({ projectId: 11, date, hours, isSubcontractor: false,
  subcontractorClassification: "employee-function", ...extra });
function withActuals(data, lines = []) { return { ...data, timesheets: { ok: true, lines } }; }

test("macro projection combines signed actuals through today with only remaining Brussels planning, including TH", () => {
  const data = withActuals(fixture([
    slot("2025-12-31T23:00:00Z", "2026-01-10T23:00:00Z", 100),
    slot("2026-01-02T23:00:00Z", "2026-01-10T23:00:00Z", 40, hire, { resourceId: 21 }),
    slot("2026-01-02T23:00:00Z", "2026-01-10T23:00:00Z", 500, person, { isSubcontractor: true })
  ]), [actualLine("2025-12-31", 200), actualLine("2026-01-01", 8), actualLine("2026-01-02", 10),
    actualLine("2026-01-02", -2), actualLine("2026-01-03", 500), actualLine("2026-01-02", 900, { isSubcontractor: true }),
    actualLine("2026-01-02", 900, { projectId: 22 })]);
  const original = structuredClone(data), result = summarize(data, options), switched = summarize(data, { ...options, includeOrmitters: true });
  assert.equal(result.actualHours, 16); assert.equal(result.actualStatus, "available"); assert.equal(result.actualThroughDate, "2026-01-02");
  assert.equal(result.remainingStartDate, "2026-01-03"); close(result.remainingPlannedHours, 120); close(result.remainingToHireHours, 40);
  assert.equal(result.remainingPlannedStatus, "available"); assert.equal(result.remainingToHireStatus, "complete");
  close(result.projectedHours, 136); close(result.projectionDifference, 36); assert.equal(result.projectionStatus, "available");
  assert.notEqual(result.projectionDifference, result.difference, "the new forecast does not reuse the old lifetime planning delta");
  assert.equal(switched.actualHours, result.actualHours); assert.equal(switched.remainingPlannedHours, result.remainingPlannedHours);
  assert.equal(switched.remainingToHireHours, result.remainingToHireHours); assert.equal(switched.projectionDifference, result.projectionDifference);
  assert.ok(switched.totalPlanned > result.totalPlanned, "the legacy lifetime total still honors its historical option");
  assert.deepEqual(result.remainingToHireResources, [{ id: 21, name: "TH_DiCo", hours: 40 }]);
  assert.deepEqual(data, original);
});

test("remaining planning resolves Brussels midnights across both DST transitions without a fixed UTC offset", () => {
  const cases = [
    ["2026-03-28T12:00:00Z", "2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z", "2026-03-28", "2026-03-29", 23],
    ["2026-10-24T12:00:00Z", "2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z", "2026-10-24", "2026-10-25", 25],
    ["2026-03-29T12:00:00Z", "2026-03-29T00:00:00Z", "2026-03-31T00:00:00Z", "2026-03-29", "2026-03-30", 24],
    ["2026-10-25T12:00:00Z", "2026-10-25T00:00:00Z", "2026-10-27T00:00:00Z", "2026-10-25", "2026-10-26", 24]
  ];
  for (const [now, start, end, first, last, expected] of cases) {
    const hours = (Date.parse(end) - Date.parse(start)) / 36e5;
    const result = summarize(withActuals(fixture([slot(start, end, hours)], first, last)), { now });
    close(result.remainingPlannedHours, expected); assert.equal(result.actualHours, 0);
    assert.equal(result.remainingStartDate, new Date(Date.parse(first) + 864e5).toISOString().slice(0, 10));
  }
});

test("new future plan clips both lifetime endpoints at Brussels midnight while compatibility totals remain UTC", () => {
  const data = withActuals(fixture([
    slot("2026-01-04T22:00:00Z", "2026-01-05T01:00:00Z", 3),
    slot("2026-01-05T21:00:00Z", "2026-01-06T02:00:00Z", 5)
  ], "2026-01-05", "2026-01-05"));
  const result = summarize(data, { now: "2026-01-01" });
  close(result.remainingPlannedHours, 4); close(result.totalPlanned, 4);
  assert.equal(result.remainingStartDate, "2026-01-05");
  const firstOnly = summarize(withActuals(fixture([slot("2026-01-04T23:00:00Z", "2026-01-05T00:00:00Z", 8)],
    "2026-01-05", "2026-01-05")), { now: "2026-01-01" });
  close(firstOnly.remainingPlannedHours, 8); close(firstOnly.totalPlanned, 0);
});

test("a future project has zero known actuals and all correctly clipped future planning", () => {
  const result = summarize(withActuals(fixture([slot("2026-01-04T23:00:00Z", "2026-01-10T23:00:00Z", 60)],
    "2026-01-05", "2026-01-10"), [actualLine("2026-01-02", 20), actualLine("2026-01-05", 100)]), options);
  assert.equal(result.actualHours, 0); assert.equal(result.actualStatus, "available"); assert.equal(result.remainingStartDate, "2026-01-05");
  close(result.remainingPlannedHours, 60); close(result.projectionDifference, -40);
});

test("the final Brussels project day has no tomorrow planning or UTC-tail forecast", () => {
  for (const [first, last, now, end] of [
    ["2026-01-01", "2026-01-10", "2026-01-10T15:00:00Z", "2026-01-11T00:00:00Z"],
    ["2026-07-01", "2026-07-10", "2026-07-10T15:00:00Z", "2026-07-11T00:00:00Z"]
  ]) {
    const result = summarize(withActuals(fixture([slot(first, end, 100)], first, last), [actualLine(last, 30)]), { now });
    assert.equal(result.remainingPlannedHours, 0); assert.equal(result.remainingToHireHours, 0);
    assert.equal(result.remainingStartDate, null); assert.equal(result.projectedHours, 30); assert.equal(result.projectionDifference, -70);
  }
});

test("closed projects retain post-end actual charges and a known zero future even when old planning is unavailable", () => {
  const data = withActuals(fixture(), [actualLine("2026-01-10", 20), actualLine("2026-02-01", 7), actualLine("2026-02-01", -2)]);
  delete data.planning;
  const result = summarize(data, { now: "2026-02-02" });
  assert.equal(result.actualHours, 25); assert.equal(result.remainingPlannedHours, 0); assert.equal(result.remainingPlannedStatus, "available");
  assert.equal(result.remainingToHireHours, 0); assert.equal(result.projectedHours, 25); assert.equal(result.projectionDifference, -75);
  assert.equal(result.coverage.status, "complete"); assert.equal(result.totalPlanned, null);
});

test("missing project end or planning never hides independent known actuals or invents a forecast", () => {
  for (const modify of [data => { data.lifetime.endDate = null; }, data => { delete data.planning; }, data => { data.planning.ok = false; }]) {
    const data = withActuals(fixture(), [actualLine("2026-01-02", 8)]); modify(data);
    const result = summarize(data, options);
    assert.equal(result.actualHours, 8); assert.equal(result.actualStatus, "available");
    assert.equal(result.remainingPlannedHours, null); assert.equal(result.projectionDifference, null); assert.equal(result.projectionStatus, "unavailable");
  }
});

test("missing or malformed actual evidence remains unavailable; no aggregate substitutes for date-level actuals", () => {
  const mutations = [data => { delete data.timesheets; }, data => { data.timesheets = { totalHours: 500 }; },
    data => { data.timesheets.ok = false; }, data => { data.timesheets.lines = [actualLine("2026-02-30", 5)]; },
    data => { data.timesheets.lines = [actualLine("2026-01-02", null)]; }, data => { data.timesheets.lines = [actualLine("2026-01-02", true)]; }];
  for (const modify of mutations) {
    const data = withActuals(fixture()); modify(data); const result = summarize(data, options);
    assert.equal(result.actualHours, null); assert.equal(result.actualStatus, "unavailable");
    assert.equal(result.remainingPlannedHours, 0); assert.equal(result.projectedHours, null); assert.equal(result.projectionDifference, null);
  }
  assert.equal(summarize(withActuals(fixture(), [actualLine("2026-01-03", null)]), options).actualHours, 0,
    "invalid amounts outside the actual-to-date period do not corrupt its known sum");
});

test("TH subtotals concern remaining hours rather than their historical allocations and preserve signed corrections", () => {
  const data = withActuals(fixture([
    slot("2025-12-31T23:00:00Z", "2026-01-04T23:00:00Z", 40, hire, { resourceId: 21 }),
    slot("2026-01-02T23:00:00Z", "2026-01-04T23:00:00Z", -3, hire, { resourceId: 21 }),
    slot("2026-01-02T23:00:00Z", "2026-01-04T23:00:00Z", 30)
  ]), [actualLine("2026-01-02", -5)]);
  const result = summarize(data, options);
  close(result.remainingToHireHours, 17); close(result.remainingPlannedHours, 47);
  assert.ok(result.knownToHireHours > result.remainingToHireHours); close(result.projectedHours, 42); close(result.projectionDifference, -58);
  assert.equal(result.remainingToHireStatus, "complete");
});

test("future identity uncertainty labels only the remaining TH attribution and does not corrupt known planning totals", () => {
  const historical = slot("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z", 10, { status: "unknown", employeeId: null }, { resourceId: 99 });
  const confirmed = slot("2026-01-02T23:00:00Z", "2026-01-10T23:00:00Z", 40, hire, { resourceId: 21 });
  const result = summarize(withActuals(fixture([historical, confirmed])), options);
  assert.equal(result.toHireStatus, "partial"); assert.equal(result.remainingToHireStatus, "complete"); close(result.remainingToHireHours, 40);
  const unknownFuture = slot("2026-01-02T23:00:00Z", "2026-01-10T23:00:00Z", 20, { status: "unknown", employeeId: null }, { resourceId: 99 });
  const partial = summarize(withActuals(fixture([confirmed, unknownFuture])), options);
  assert.equal(partial.remainingToHireStatus, "partial"); assert.equal(partial.remainingToHireHours, 40); assert.equal(partial.remainingPlannedHours, 60);
  const unconfirmed = summarize(withActuals(fixture([unknownFuture])), options);
  assert.equal(unconfirmed.remainingToHireStatus, "unavailable"); assert.equal(unconfirmed.remainingToHireHours, null);
  assert.equal(unconfirmed.remainingPlannedHours, 20);
});

test("coverage warns only continuous gaps at least one clamped calendar month, preserving shorter diagnostics", () => {
  const cases = [
    ["2026-01-01", "2026-01-30", false, 30], ["2026-01-01", "2026-01-31", true, 31],
    ["2026-02-01", "2026-02-27", false, 27], ["2026-02-01", "2026-02-28", true, 28],
    ["2024-02-01", "2024-02-28", false, 28], ["2024-02-01", "2024-02-29", true, 29],
    ["2026-01-31", "2026-02-26", false, 27], ["2026-01-31", "2026-02-27", true, 28],
    ["2026-12-31", "2027-01-30", true, 31]
  ];
  for (const [first, last, qualifies, days] of cases) {
    const result = summarize(withActuals(fixture([], first, last)), { now: first });
    assert.equal(result.coverage.status, qualifies ? "gaps" : "no-substantial-gaps", `${first}..${last}`);
    assert.equal(result.coverage.gapDays, qualifies ? days : 0); assert.equal(result.coverage.allGapDays, days);
    assert.equal(result.coverage.gaps.length, qualifies ? 1 : 0); assert.equal(result.coverage.shortGaps.length, qualifies ? 0 : 1);
  }
});

test("several short gaps never combine into a one-month staffing warning and Ormitters never cover a macro gap", () => {
  const shifts = [slot("2026-01-16T10:00:00Z", "2026-01-16T11:00:00Z", 1), slot("2026-02-01T10:00:00Z", "2026-02-01T11:00:00Z", 1),
    slot("2026-02-16T10:00:00Z", "2026-02-16T11:00:00Z", 1)];
  const result = summarize(withActuals(fixture(shifts, "2026-01-01", "2026-02-28")), { now: "2026-01-01" });
  assert.equal(result.coverage.status, "no-substantial-gaps"); assert.equal(result.coverage.gapDays, 0);
  assert.equal(result.coverage.allGapDays, 56); assert.equal(result.coverage.shortGaps.length, 4);
  const onlyOrmitter = summarize(withActuals(fixture([slot("2025-12-31T23:00:00Z", "2026-03-01T23:00:00Z", 100,
    person, { isSubcontractor: true })], "2026-01-01", "2026-03-01")), { now: "2026-01-01", includeOrmitters: true });
  assert.equal(onlyOrmitter.remainingPlannedHours, 0); assert.equal(onlyOrmitter.coverage.status, "gaps");
  assert.equal(onlyOrmitter.coverage.gapDays, 60); assert.equal(onlyOrmitter.totalPlanned, 100 * 1439 / 1440);
});

test("unknown future employee functions preserve known amounts while disclosing incomplete Ormitter exclusion", () => {
  const data = withActuals(fixture([
    slot("2026-01-02T23:00:00Z", "2026-01-10T23:00:00Z", 40, person,
      { isSubcontractor: false, subcontractorClassification: "unknown" }),
    slot("2026-01-02T23:00:00Z", "2026-01-10T23:00:00Z", 90, person,
      { isSubcontractor: true, subcontractorClassification: "employee-function" })
  ]), [actualLine("2026-01-02", 10)]);
  const result = summarize(data, options);
  assert.equal(result.remainingPlannedHours, 40); assert.equal(result.remainingPlannedStatus, "available");
  assert.equal(result.remainingToHireHours, 0); assert.equal(result.projectedHours, 50); assert.equal(result.projectionDifference, -50);
  assert.ok(result.warnings.some(message => /fonction.*ressources planifiées.*inconnue.*heures futures d’Ormitters.*incomplète/.test(message)));
  const historical = withActuals(fixture([slot("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z", 20,
    person, { isSubcontractor: false, subcontractorClassification: "unknown" })]));
  assert.ok(!summarize(historical, options).warnings.some(message => /heures futures d’Ormitters/.test(message)),
    "unknown historical functions must not imply uncertainty in a separately known empty future");
});

test("pointage references include the current Brussels day, clamp at project dates and keep post-end actual charges", () => {
  const data = withActuals(fixture([slot("2025-12-31T23:00:00Z", "2026-01-10T23:00:00Z", 100)]),
    [actualLine("2025-12-31", 500), actualLine("2026-01-01", 9), actualLine("2026-01-05", 51),
      actualLine("2026-01-10", 30), actualLine("2026-02-01", 20), actualLine("2026-02-01", -5)]);
  const original = structuredClone(data);
  for (const [now, expected, actual] of [["2025-12-31", 0, 0], ["2026-01-01", 10, 9],
    ["2026-01-05", 50, 60], ["2026-01-10", 100, 90], ["2026-02-01", 100, 105]]) {
    const result = summarize(data, { now });
    assert.equal(result.plannedToDateStatus, "available"); close(result.plannedToDateHours, expected);
    assert.equal(result.conventionToDateStatus, "available"); close(result.conventionToDateHours, expected);
    assert.equal(result.actualHours, actual);
    close(result.planningToDateDifference, actual - expected); close(result.conventionToDateDifference, actual - expected);
  }
  assert.deepEqual(data, original);
});

test("planning-to-date follows dated allocations with TH and signed corrections, independent of Ormitter inclusion", () => {
  const data = withActuals(fixture([
    slot("2025-12-31T23:00:00Z", "2026-01-02T23:00:00Z", 20),
    slot("2025-12-31T23:00:00Z", "2026-01-02T23:00:00Z", 10, hire, { resourceId: 21 }),
    slot("2026-01-01T23:00:00Z", "2026-01-02T23:00:00Z", -4),
    slot("2026-01-02T23:00:00Z", "2026-01-10T23:00:00Z", 120),
    slot("2025-12-31T23:00:00Z", "2026-01-02T23:00:00Z", 600, person, { isSubcontractor: true }),
    slot("2025-12-31T23:00:00Z", "2026-01-02T23:00:00Z", 500, person, { projectId: 99 })
  ]), [actualLine("2026-01-01", 20), actualLine("2026-01-02", -3),
    actualLine("2026-01-02", 900, { isSubcontractor: true }), actualLine("2026-01-02", 800, { projectId: 99 })]);
  const result = summarize(data, options), switched = summarize(data, { ...options, includeOrmitters: true });
  close(result.plannedToDateHours, 26); close(result.planningToDateDifference, -9);
  close(result.conventionToDateHours, 20); close(result.conventionToDateDifference, -3);
  assert.equal(result.remainingPlannedHours, 120);
  for (const field of ["plannedToDateHours", "plannedToDateStatus", "conventionToDateHours", "conventionToDateStatus",
    "planningToDateDifference", "conventionToDateDifference"]) assert.equal(switched[field], result[field], field);
  assert.ok(switched.totalPlanned > result.totalPlanned, "Legacy optional inclusion remains separate from macro comparisons");
});

test("elapsed planning uses 23/25-hour Brussels days while convention interpolation uses calendar days", () => {
  for (const [first, last, now, start, end, hours, elapsed] of [
    ["2026-03-28", "2026-03-30", "2026-03-29T22:30:00+02:00", "2026-03-27T23:00:00Z", "2026-03-30T22:00:00Z", 71, 47],
    ["2026-10-24", "2026-10-26", "2026-10-25T22:30:00+01:00", "2026-10-23T22:00:00Z", "2026-10-26T23:00:00Z", 73, 49]
  ]) {
    const data = withActuals(fixture([slot(start, end, hours)], first, last), [actualLine(now.slice(0, 10), 40)]);
    data.lifetime.conventionHours = 300;
    const result = summarize(data, { now });
    close(result.plannedToDateHours, elapsed); close(result.remainingPlannedHours, 24);
    close(result.planningToDateDifference, 40 - elapsed);
    close(result.conventionToDateHours, 200); close(result.conventionToDateDifference, -160);
  }
});

test("planning-to-date clips both Brussels project endpoints and does not reuse UTC compatibility totals", () => {
  const data = withActuals(fixture([
    slot("2026-01-04T22:00:00Z", "2026-01-05T01:00:00Z", 3),
    slot("2026-01-05T21:00:00Z", "2026-01-06T02:00:00Z", 5)
  ], "2026-01-05", "2026-01-05"), [actualLine("2026-01-05", 6)]);
  const result = summarize(data, { now: "2026-01-05" });
  close(result.plannedToDateHours, 4); close(result.planningToDateDifference, 2);
  close(result.conventionToDateHours, 100); close(result.conventionToDateDifference, -94);
  const firstOnly = withActuals(fixture([slot("2026-01-04T23:00:00Z", "2026-01-05T00:00:00Z", 8)], "2026-01-05", "2026-01-05"));
  const endpoint = summarize(firstOnly, { now: "2026-01-05" });
  assert.equal(endpoint.totalPlanned, 0); assert.equal(endpoint.plannedToDateHours, 8);
});

test("failed source statuses keep pointage comparisons independently unavailable instead of borrowing other totals", () => {
  const base = () => withActuals(fixture([slot("2025-12-31T23:00:00Z", "2026-01-10T23:00:00Z", 100)]), [actualLine("2026-01-02", 25)]);
  for (const modify of [data => { delete data.planning; }, data => { data.planning.ok = false; }, data => { data.planningError = "denied"; }]) {
    const data = base(); modify(data); const result = summarize(data, options);
    assert.equal(result.plannedToDateStatus, "unavailable"); assert.equal(result.plannedToDateHours, null);
    assert.equal(result.planningToDateDifference, null);
    assert.equal(result.conventionToDateStatus, "available"); assert.equal(result.conventionToDateHours, 20);
    assert.equal(result.conventionToDateDifference, 5);
  }
  for (const modify of [data => { data.lifetime.conventionStatus = "unavailable"; }, data => { data.lifetime.conventionHours = 0; },
    data => { data.lifetime.conventionHours = NaN; }]) {
    const data = base(); modify(data); const result = summarize(data, options);
    assert.equal(result.conventionToDateStatus, "unavailable"); assert.equal(result.conventionToDateHours, null);
    assert.equal(result.conventionToDateDifference, null);
    assert.equal(result.plannedToDateStatus, "available"); close(result.plannedToDateHours, 20); close(result.planningToDateDifference, 5);
  }
  for (const modify of [data => { delete data.timesheets; }, data => { data.timesheets.ok = false; }, data => { data.timesheetsError = "denied"; }]) {
    const data = base(); modify(data); const result = summarize(data, options);
    assert.equal(result.actualHours, null); assert.equal(result.planningToDateDifference, null); assert.equal(result.conventionToDateDifference, null);
    assert.equal(result.plannedToDateStatus, "available"); assert.equal(result.conventionToDateStatus, "available");
  }
});

test("invalid dates or clock prevent invented pointage expectations, while an unstarted period is known zero", () => {
  for (const modify of [data => { data.lifetime.startDate = null; }, data => { data.lifetime.endDate = null; },
    data => { data.lifetime.endDate = "2025-12-31"; }]) {
    const data = withActuals(fixture()); modify(data); const result = summarize(data, options);
    assert.equal(result.plannedToDateHours, null); assert.equal(result.conventionToDateHours, null);
    assert.equal(result.planningToDateDifference, null); assert.equal(result.conventionToDateDifference, null);
  }
  const invalidClock = summarize(withActuals(fixture()), { now: false });
  assert.equal(invalidClock.plannedToDateHours, null); assert.equal(invalidClock.conventionToDateHours, null);
  const future = withActuals(fixture([slot("broken", "broken", null)], "2026-02-01", "2026-02-10"));
  delete future.planning;
  const unstarted = summarize(future, options);
  assert.equal(unstarted.plannedToDateHours, 0); assert.equal(unstarted.plannedToDateStatus, "available");
  assert.equal(unstarted.conventionToDateHours, 0); assert.equal(unstarted.conventionToDateStatus, "available");
  assert.equal(unstarted.planningToDateDifference, 0); assert.equal(unstarted.conventionToDateDifference, 0);
});

test("only malformed allocations that can affect the elapsed period invalidate its planning reference", () => {
  const past = slot("2025-12-31T23:00:00Z", "2026-01-02T23:00:00Z", 20);
  for (const extra of [slot("2026-01-02T23:00:00Z", "2026-01-10T23:00:00Z", null),
    slot("2025-12-30T23:00:00Z", "2025-12-31T23:00:00Z", Infinity),
    slot("broken", "broken", null, person, { isSubcontractor: true })]) {
    const result = summarize(withActuals(fixture([past, extra])), options);
    assert.equal(result.plannedToDateStatus, "available"); assert.equal(result.plannedToDateHours, 20);
  }
  for (const extra of [slot("2026-01-01T23:00:00Z", "2026-01-02T23:00:00Z", null),
    slot("2026-01-01T23:00:00Z", "2026-01-02T23:00:00Z", Infinity), slot("broken", "broken", 100)]) {
    const result = summarize(withActuals(fixture([past, extra])), options);
    assert.equal(result.plannedToDateStatus, "unavailable"); assert.equal(result.plannedToDateHours, null);
    assert.equal(result.planningToDateDifference, null); assert.equal(result.conventionToDateHours, 20);
  }
});

test("to-date totals and signed differences reject nonfinite arithmetic without erasing independent references", () => {
  const row = slot("2025-12-31T23:00:00Z", "2026-01-02T23:00:00Z", Number.MAX_VALUE);
  const overflow = summarize(withActuals(fixture([row, { ...row }])), options);
  assert.equal(overflow.plannedToDateHours, null); assert.equal(overflow.plannedToDateStatus, "unavailable");
  assert.equal(overflow.planningToDateDifference, null); assert.equal(overflow.conventionToDateHours, 20);
  const negative = summarize(withActuals(fixture([{ ...row, hours: -Number.MAX_VALUE }]), [actualLine("2026-01-02", Number.MAX_VALUE)]), options);
  assert.equal(negative.plannedToDateHours, -Number.MAX_VALUE); assert.equal(negative.plannedToDateStatus, "available");
  assert.equal(negative.planningToDateDifference, null, "An overflowing signed delta is unavailable even when each source is finite");
  assert.equal(negative.conventionToDateStatus, "available"); assert.ok(Number.isFinite(negative.conventionToDateDifference));
  const unclassified = summarize(withActuals(fixture([slot("2025-12-31T23:00:00Z", "2026-01-02T23:00:00Z", 20,
    person, { subcontractorClassification: "unknown" })])), options);
  assert.equal(unclassified.plannedToDateHours, 20);
  assert.ok(unclassified.warnings.some(message => /Ormitters à ce jour.*incomplète/.test(message)));
});
