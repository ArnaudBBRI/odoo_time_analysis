const test = require("node:test"), assert = require("node:assert/strict");
const { summarize, normalizeScope, weekType } = require("../work-capacity.js");
const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
function fixture(year = 2026, overrides = {}) {
  return { status: "available", referenceYear: 2026, warnings: [],
    schedule: { status: "available", calendarId: 1, companyId: 1, timeZone: "Europe/Brussels", hoursPerDay: 7.95,
      hoursPerWeek: 39.75, fullTimeHoursPerWeek: 39.75, workTimeRate: 100, twoWeeksCalendar: false, flexibleHours: false,
      attendance: [0, 1, 2, 3, 4].map((dayOfWeek, id) => ({ id: id + 1, dayOfWeek, hourFrom: 8, hourTo: 15.95, weekType: null, dateFrom: null, dateTo: null })) },
    years: [{ year, calendarStatus: "available", entitlementStatus: "available", publicClosures: [], leaveDays: 27, leaveHours: 214.65, warnings: [] }], ...overrides };
}
const closure = (day, end = day) => ({ id: day, start: `${day}T00:00:00Z`, end: `${end}T23:59:59Z` });
const currentHolidays = ["2026-01-01", "2026-01-02", "2026-04-06", "2026-05-01", "2026-05-14", "2026-05-15", "2026-05-25", "2026-07-20", "2026-07-21",
  "2026-08-17", "2026-11-02", "2026-11-11", "2026-12-24", "2026-12-25", "2026-12-28", "2026-12-31"];
function currentFixture() {
  const source = fixture(); source.years[0].publicClosures = currentHolidays.map(day => closure(day)); return source;
}

test("current-year paid entitlement and company calendar give 218 own-calendar days / 1733.1 hours independently of requests", () => {
  const source = currentFixture(), before = structuredClone(source), result = summarize(source, [2026]);
  assert.equal(result.status, "available"); close(result.scheduledHours, 261 * 7.95);
  close(result.publicHolidayHours, 16 * 7.95); close(result.entitlementHours, 27 * 7.95);
  close(result.availableDays, 218); close(result.availableHours, 1733.1);
  assert.equal(result.years[0].daily.length, 365); assert.deepEqual(source, before);
  source.years[0].leaveRequests = [{ days: 9 }, { days: 16, state: "confirm" }];
  source.years[0].remainingBalance = 1;
  close(summarize(source, [2026]).availableHours, 1733.1);
});

test("hour entitlement is authoritative and is not counted a second time as days", () => {
  const source = fixture(); source.years[0].leaveHours = 100.25; source.years[0].leaveDays = 999;
  close(summarize(source, [2026]).entitlementHours, 100.25);
  source.years[0].leaveHours = null; source.years[0].leaveDays = 27;
  close(summarize(source, [2026]).entitlementHours, 214.65);
});

test("a four-day part-time calendar is already adjusted and is not multiplied by its employment percentage", () => {
  const source = fixture(); source.schedule.hoursPerDay = 8; source.schedule.hoursPerWeek = 32; source.schedule.workTimeRate = 80;
  source.schedule.attendance = [0, 1, 2, 3].map(dayOfWeek => ({ dayOfWeek, hourFrom: 8, hourTo: 16 }));
  source.years[0].leaveHours = 160; source.years[0].leaveDays = 20;
  const result = summarize(source, [2026]);
  assert.equal(result.workTimeRate, 80); close(result.scheduledHours, 209 * 8); close(result.availableHours, 209 * 8 - 160);
  close(result.availableDays, 189);
});

test("five half days preserve employee-calendar day equivalents and zero approved entitlement", () => {
  const source = fixture(); source.schedule.hoursPerDay = 4; source.schedule.hoursPerWeek = 20; source.schedule.workTimeRate = 50;
  source.schedule.attendance.forEach(row => { row.hourTo = 12; }); source.years[0].leaveHours = 0; source.years[0].leaveDays = 0;
  const result = summarize(source, [2026]); close(result.availableHours, 1044); close(result.availableDays, 261);
});

test("overlapping work and holiday intervals are unioned, lunch and headings ignored, weekend holidays cost nothing", () => {
  const source = fixture(); source.schedule.hoursPerDay = 8;
  source.schedule.attendance = [{ dayOfWeek: 0, hourFrom: 8, hourTo: 12 }, { dayOfWeek: 0, hourFrom: 10, hourTo: 16 },
    { dayOfWeek: 0, hourFrom: 12, hourTo: 13, dayPeriod: "lunch" }, { displayType: "line_section" }];
  source.years[0].leaveHours = 0;
  source.years[0].publicClosures = [closure("2026-01-03"), closure("2026-01-05"), closure("2026-01-05"),
    { start: "2026-01-05T09:00:00Z", end: "2026-01-05T13:00:00Z" }];
  const result = summarize(source, [2026]); close(result.scheduledHours, 52 * 8); close(result.publicHolidayHours, 8);
  close(result.availableHours, 51 * 8);
});

test("partial holiday intervals subtract only their intersection with the employee's work", () => {
  const source = fixture(); source.years[0].leaveHours = 0;
  source.years[0].publicClosures = [{ start: "2026-01-05T06:00:00Z", end: "2026-01-05T09:30:00Z" },
    { start: "2026-01-05T09:00:00Z", end: "2026-01-05T10:00:00Z" }];
  const result = summarize(source, [2026]); close(result.publicHolidayHours, 3);
  const day = result.years[0].daily.find(row => row.date === "2026-01-05"); close(day.netHours, 4.95);
});

test("two-week parity follows continuous Gregorian ordinal parity across ISO week 53", () => {
  assert.equal(weekType("2020-12-28"), 0); assert.equal(weekType("2021-01-04"), 1);
  const source = fixture(2021); source.referenceYear = 2021; source.schedule.twoWeeksCalendar = true;
  source.schedule.attendance = [{ dayOfWeek: 0, hourFrom: 8, hourTo: 12, weekType: "0" }, { dayOfWeek: 0, hourFrom: 8, hourTo: 16, weekType: "1" }];
  source.years[0].leaveHours = 0;
  const result = summarize(source, [2021]); assert.equal(result.status, "available");
  close(result.years[0].daily.find(row => row.date === "2021-01-04").scheduledHours, 8);
  close(result.years[0].daily.find(row => row.date === "2021-01-11").scheduledHours, 4); close(result.availableHours, 26 * 12);
});

test("date-bounded attendance changes and leap day are included only in their valid calendar period", () => {
  const source = fixture(2028); source.referenceYear = 2028; source.schedule.hoursPerDay = 8;
  source.schedule.attendance = [{ dayOfWeek: 1, hourFrom: 8, hourTo: 12, dateFrom: "2028-02-01", dateTo: "2028-02-29" }];
  source.years[0].leaveHours = 0;
  const result = summarize(source, [2028]); assert.equal(result.years[0].daily.length, 366); close(result.availableHours, 20);
  close(result.years[0].daily.find(row => row.date === "2028-02-29").scheduledHours, 4);
});

test("Brussels and another IANA timezone resolve holiday overlap across DST without depending on host timezone", () => {
  for (const timeZone of ["Europe/Brussels", "America/New_York"]) {
    const source = fixture(); source.schedule.timeZone = timeZone; source.schedule.hoursPerDay = 8;
    source.schedule.attendance = [{ dayOfWeek: 6, hourFrom: 0, hourTo: 4 }]; source.years[0].leaveHours = 0;
    const result = summarize(source, [2026]); assert.equal(result.status, "available");
    const spring = timeZone === "Europe/Brussels" ? "2026-03-29" : "2026-03-08";
    const autumn = timeZone === "Europe/Brussels" ? "2026-10-25" : "2026-11-01";
    close(result.years[0].daily.find(row => row.date === spring).scheduledHours, 3);
    close(result.years[0].daily.find(row => row.date === autumn).scheduledHours, 5);
    close(result.availableHours, 52 * 4);
  }
});

test("an absent future calendar clones current net days and hours rather than recalculating a leap year's weekday count", () => {
  const source = currentFixture(); source.years.push({ year: 2028, calendarStatus: "missing", entitlementStatus: "missing", publicClosures: [], leaveHours: null, leaveDays: null });
  const result = summarize(source, [2028]); assert.equal(result.status, "estimated");
  close(result.availableDays, 218); close(result.availableHours, 1733.1); assert.equal(result.publicHolidayHours, null);
  close(result.years[0].scheduledHours, 260 * 7.95); assert.equal(result.years[0].calendarBasisYear, 2026);
  assert.equal(result.years[0].estimateReason, "reference-year-calendar");
});

test("published future holidays with not-yet-granted leave use only the current leave entitlement as an estimate", () => {
  const source = currentFixture(); source.years.push({ year: 2028, calendarStatus: "available", entitlementStatus: "missing", publicClosures: [closure("2028-01-03")], leaveHours: null, leaveDays: null });
  const result = summarize(source, [2028]); assert.equal(result.status, "estimated");
  close(result.availableHours, (260 - 1 - 27) * 7.95); assert.equal(result.years[0].calendarBasisYear, 2028);
  assert.equal(result.years[0].entitlementBasisYear, 2026); assert.equal(result.years[0].estimateReason, "reference-year-entitlement");
});

test("noncontiguous selected years add only requested capacities and keep future fallback separate", () => {
  const source = currentFixture(); source.years.push({ year: 2028, calendarStatus: "missing", entitlementStatus: "missing", publicClosures: [] });
  const result = summarize(source, new Set([2028, 2026, 2028])); assert.deepEqual(result.years.map(row => row.year), [2026, 2028]);
  close(result.availableHours, 2 * 1733.1); close(result.availableDays, 436);
});

test("a current schedule applied to otherwise published past or future sources is disclosed as an estimate", () => {
  const source = currentFixture(); source.schedule.basisYear = 2026;
  for (const year of [2025, 2027]) source.years.push({ year, calendarStatus: "available", entitlementStatus: "available",
    publicClosures: [], leaveHours: 214.65, leaveDays: 27 });
  const result = summarize(source, [2025, 2026, 2027]); assert.equal(result.status, "estimated");
  assert.equal(result.years[1].status, "available");
  for (const row of [result.years[0], result.years[2]]) {
    assert.equal(row.status, "estimated"); assert.equal(row.estimateReason, "current-work-schedule");
    close(row.availableHours, (261 - 27) * 7.95);
    assert.match(row.warnings.join(" "), /calendrier de travail de 2026 est appliqué/);
  }
  source.years.push({ year: 2028, calendarStatus: "missing", entitlementStatus: "missing", publicClosures: [] });
  assert.equal(summarize(source, [2028]).years[0].estimateReason, "reference-year-calendar");
});

test("an inclusive custom period uses exact scoped holidays and declared working-hour leave prorata", () => {
  const source = currentFixture(), result = summarize(source, { startDate: "2026-01-01", endDate: "2026-01-31" });
  assert.equal(result.status, "estimated"); assert.equal(result.partialPeriod, true);
  close(result.scheduledHours, 22 * 7.95); close(result.publicHolidayHours, 2 * 7.95);
  close(result.entitlementHours, 214.65 * 22 / 261); close(result.availableHours, 20 * 7.95 - 214.65 * 22 / 261);
  assert.equal(result.years[0].estimateReason, "partial-period-entitlement");
  const weekend = summarize(source, { startDate: "2026-01-03", endDate: "2026-01-04" });
  close(weekend.availableHours, 0); close(weekend.entitlementHours, 0);
});

test("a custom period spanning current and unpublished future years keeps a pristine reference capacity", () => {
  const source = currentFixture(); source.years.push({ year: 2027, calendarStatus: "missing", entitlementStatus: "missing", publicClosures: [] });
  const result = summarize(source, { startDate: "2026-12-01", endDate: "2027-01-31" });
  assert.equal(result.status, "estimated"); close(result.years[1].availableHours, 1733.1);
  close(result.years[1].scope.availableHours, 1733.1 * 21 / 261);
  const future = summarize(source, { startDate: "2027-01-02", endDate: "2027-01-04" });
  close(future.availableHours, 1733.1 / 261);
});

test("permission-denied annual data cannot be converted into a future-calendar estimate", () => {
  for (const field of ["calendarStatus", "entitlementStatus"]) {
    const source = currentFixture(); source.years.push({ year: 2027, calendarStatus: "missing", entitlementStatus: "missing", publicClosures: [], [field]: "unavailable" });
    const result = summarize(source, [2027]); assert.equal(result.status, "unavailable"); assert.equal(result.availableHours, null);
  }
  const noReference = fixture(2028); noReference.years[0].calendarStatus = "missing";
  assert.equal(summarize(noReference, [2028]).availableHours, null);
});

test("malformed or absent annual proof statuses cannot enable a future reference-year fallback", () => {
  for (const field of ["calendarStatus", "entitlementStatus"]) for (const status of [undefined, null, false, "unknown", "AVAILABLE"]) {
    const source = currentFixture(), future = { year: 2027, calendarStatus: "missing", entitlementStatus: "missing", publicClosures: [] };
    if (status === undefined) delete future[field]; else future[field] = status;
    source.years.push(future);
    const result = summarize(source, [2027]); assert.equal(result.status, "unavailable");
    assert.equal(result.availableHours, null, `${field}: ${status}`); assert.equal(result.years[0].estimateReason, null);
  }
});

test("missing current/past rights or calendars stay unknown, including mixed known/unknown years", () => {
  const source = currentFixture(); source.years[0].entitlementStatus = "missing";
  const result = summarize(source, [2026]); assert.equal(result.status, "unavailable"); assert.equal(result.availableHours, null);
  const past = currentFixture(); past.years.push({ year: 2025, calendarStatus: "missing", entitlementStatus: "missing", publicClosures: [] });
  const mixed = summarize(past, [2025, 2026]); assert.equal(mixed.availableHours, null); close(mixed.years[1].availableHours, 1733.1);
});

test("invalid schedule metadata and flexible calendars disclose unavailable capacity rather than assumed full time", () => {
  for (const change of [{ status: "unavailable" }, { hoursPerDay: null }, { timeZone: "Mars/Olympus" }, { flexibleHours: true },
    { attendance: [] }, { attendance: [{ dayOfWeek: 7, hourFrom: 8, hourTo: 16 }] },
    { attendance: [{ dayOfWeek: 0, hourFrom: 8, hourTo: 16, dateFrom: "2026-02-30" }] },
    { attendance: [{ dayOfWeek: 0, hourFrom: 16, hourTo: 8 }] },
    { twoWeeksCalendar: true }, { attendance: [{ dayOfWeek: 0, hourFrom: "8", hourTo: 16 }] }]) {
    const source = fixture(); Object.assign(source.schedule, change);
    assert.equal(summarize(source, [2026]).availableHours, null, JSON.stringify(change));
  }
});

test("invalid closures, negative entitlement, duplicate annual records and impossible negative capacity fail explicitly", () => {
  for (const change of [{ publicClosures: [{ start: "2026-02-30T00:00:00Z", end: "2026-03-01T00:00:00Z" }] },
    { publicClosures: [{ start: "2026-01-05T10:00:00Z", end: "2026-01-05T09:00:00Z" }] },
    { leaveHours: -1 }, { leaveHours: "20", leaveDays: null }, { leaveHours: 3000 }, { leaveHours: null, leaveDays: null }]) {
    const source = fixture(); Object.assign(source.years[0], change);
    assert.equal(summarize(source, [2026]).availableHours, null, JSON.stringify(change));
  }
  const duplicate = fixture(); duplicate.years.push({ ...duplicate.years[0] });
  assert.equal(summarize(duplicate, [2026]).availableHours, null);
});

test("public output contains only sanitized day aggregates without schedule/closure/HR identities", () => {
  const source = currentFixture(); source.years[0].publicClosures[0].employeeName = "Secret";
  source.schedule.employeeId = 42; source.years[0].leaveRequests = [{ name: "Secret" }];
  const result = summarize(source, [2026]), text = JSON.stringify(result);
  assert.ok(!text.includes("Secret")); assert.ok(!text.includes("employeeId")); assert.ok(!text.includes("intervals"));
  assert.deepEqual(Object.keys(result.years[0].daily[0]).sort(), ["date", "netHours", "publicHolidayHours", "scheduledHours"]);
});

test("scope validation respects Gregorian validity and rejects empty, invalid and excessive ranges", () => {
  for (const value of [null, [], [false], [""], [9999], "2026", { startDate: "2026-02-30", endDate: "2026-03-01" },
    { startDate: "2026-02-02", endDate: "2026-02-01" }, { startDate: "2026-01-01" },
    { startDate: "1800-01-01", endDate: "2026-12-31" }]) assert.equal(normalizeScope(value), null, JSON.stringify(value));
  assert.deepEqual(normalizeScope([2028, "2026", 2028]).years, [2026, 2028]); assert.equal(weekType("2026-02-30"), null);
  assert.equal(summarize(null, [2026]).availableHours, null);
});
