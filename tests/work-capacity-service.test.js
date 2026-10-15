"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { load, MAX_YEARS } = require("../work-capacity-service");
const { fixture, employee, options } = require("./work-capacity-fixture");
const relation = model => ({ type: "many2one", relation: model });
const current = result => result.years.find(entry => entry.year === 2026);

test("typed own calendar and annual paid rights ignore unpaid requests and prior-year carryover", async () => {
  const rpc = fixture(({ rows }) => {
    rows["hr.leave.allocation"].push({ ...rows["hr.leave.allocation"][1], id: 90, date_from: "2025-01-01" });
  });
  const result = await load(rpc, employee, [2027, 2028], options);
  assert.equal(result.referenceYear, 2026); assert.equal(result.schedule.hoursPerWeek, 39.75);
  assert.equal(result.schedule.basisYear, 2026);
  assert.equal(result.schedule.hoursPerDay, 7.95); assert.equal(result.schedule.workTimeRate, 100);
  assert.equal(result.schedule.attendance.length, 10); assert.equal(current(result).leaveDays, 27);
  assert.ok(Math.abs(current(result).leaveHours - 214.65) < 1e-9);
  assert.equal(current(result).calendarStatus, "available"); assert.equal(current(result).publicClosures.length, 1);
  assert.ok(current(result).warnings.includes("CONGES_SANS_SOLDE_EXCLUS"));
  for (const year of result.years.filter(row => row.year > 2026)) {
    assert.equal(year.calendarStatus, "missing"); assert.equal(year.entitlementStatus, "missing");
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|PERSONAL_NAME|My schedule|Category/);
  assert.ok(rpc.calls.every(call => ["fields_get", "search_read"].includes(call.method)));
  assert.ok(rpc.calls.every(call => call.model !== "hr.leave" && call.model !== "hr.contract"));
  assert.ok(rpc.calls.filter(call => call.fields).every(call => !call.fields.some(field => /remaining|taken|max_leaves|wage/.test(field))));
  for (const call of rpc.calls.filter(call => call.model === "hr.leave.allocation" && call.fields)) {
    assert.deepEqual(call.domain[0], ["employee_id", "in", [20]]);
    assert.ok(!call.domain.some(item => Array.isArray(item) && item[0] === "allocation_type"), "Paid accrual grants must remain visible as unsupported evidence");
  }
});

test("foreign identities and employee-linked leave requests cannot enter personal capacity", async () => {
  const rpc = fixture(({ rows }) => {
    rows["hr.employee"].push({ id: 999, resource_calendar_id: [999, "Foreign"], company_id: [999, "Foreign"] });
    rows["resource.calendar"].push({ ...rows["resource.calendar"][0], id: 999 });
    rows["resource.calendar.attendance"].push({ ...rows["resource.calendar.attendance"][0], id: 999, resource_id: [999, "Foreign"] });
    const closure = rows["resource.calendar.leaves"][0];
    rows["resource.calendar.leaves"].push({ ...closure, id: 2, resource_id: [30, "Own leave request"] },
      { ...closure, id: 3, calendar_id: [999, "Foreign"] }, { ...closure, id: 4, company_id: [999, "Foreign"] });
    rows["hr.leave.allocation"].push({ ...rows["hr.leave.allocation"][0], id: 999, employee_id: [999, "Foreign"] });
  });
  const result = await load(rpc, employee, [2026], options);
  assert.equal(result.status, "available"); assert.equal(result.schedule.attendance.length, 10);
  assert.equal(current(result).publicClosures.length, 1); assert.equal(current(result).leaveDays, 27);
  const read = rpc.calls.find(call => call.model === "resource.calendar.leaves" && call.fields);
  assert.deepEqual(read.domain.slice(0, 7), [["resource_id", "=", false], "|", ["calendar_id", "=", 1], ["calendar_id", "=", false],
    "|", ["company_id", "=", 1], ["company_id", "=", false]]);
});

test("private access denial recovers exact public/resource identity without broad searches", async () => {
  const rpc = fixture(({ denied }) => denied.add("hr.employee"));
  const result = await load(rpc, employee, [2026], options);
  assert.equal(result.status, "available");
  assert.ok(rpc.calls.filter(call => ["hr.employee", "hr.employee.public", "resource.resource"].includes(call.model) && call.fields)
    .every(call => call.domain.length === 1 && call.domain[0][0] === "id"));
  const fallback = fixture(({ definitions }) => {
    delete definitions["hr.employee"].resource_calendar_id; delete definitions["hr.employee.public"].resource_calendar_id;
  });
  assert.equal((await load(fallback, employee, [2026], options)).schedule.calendarId, 1);
});

test("denied or malformed optional sources remain unavailable and never imply future publication absence", async () => {
  for (const model of ["resource.calendar.leaves", "hr.leave.allocation"]) {
    const result = await load(fixture(({ denied }) => denied.add(model)), employee, [2027], options);
    assert.equal(result.years.find(row => row.year === 2027)[model.endsWith("leaves") ? "calendarStatus" : "entitlementStatus"], "unavailable");
  }
  const malformed = fixture(({ definitions }) => { definitions["hr.leave.allocation"].number_of_days = { type: "char" };
    definitions["hr.leave.allocation"].number_of_hours_display = { type: "char" }; });
  assert.equal(current(await load(malformed, employee, [2026], options)).entitlementStatus, "unavailable");
  const wrongRelation = fixture(({ definitions }) => { definitions["resource.calendar.leaves"].resource_id = relation("hr.employee"); });
  assert.equal(current(await load(wrongRelation, employee, [2026], options)).calendarStatus, "unavailable");
  const missingKind = fixture(({ definitions }) => { delete definitions["resource.calendar.leaves"].time_type; });
  const unconfirmed = await load(missingKind, employee, [2026, 2027], options);
  assert.ok(unconfirmed.years.every(annual => annual.calendarStatus === "unavailable"));
});

test("duplicate source IDs deduplicate equal data and fail closed on conflicting own evidence", async () => {
  const same = fixture(({ rows }) => {
    rows["hr.leave.allocation"].push({ ...rows["hr.leave.allocation"][0] });
    rows["resource.calendar.leaves"].push({ ...rows["resource.calendar.leaves"][0] });
  });
  assert.equal(current(await load(same, employee, [2026], options)).leaveDays, 27);
  const contradictory = fixture(({ rows }) => rows["hr.employee"].push({ ...rows["hr.employee"][0], resource_calendar_id: [2, "Conflict"] }));
  assert.equal((await load(contradictory, employee, [2026], options)).status, "unavailable");
  const grants = fixture(({ rows }) => rows["hr.leave.allocation"].push({ ...rows["hr.leave.allocation"][0], number_of_days: 99 }));
  assert.equal(current(await load(grants, employee, [2026], options)).entitlementStatus, "unavailable");
});

test("lunch/section rows are omitted and exact own resource attendance stays marked", async () => {
  const rpc = fixture(({ rows }) => {
    const template = rows["resource.calendar.attendance"][0];
    rows["resource.calendar.attendance"].push({ ...template, id: 80, day_period: "lunch" },
      { id: 81, calendar_id: [1, "Calendar"], resource_id: false, display_type: "line_section" },
      { ...template, id: 82, resource_id: [30, "Own"] });
  });
  const result = await load(rpc, employee, [2026], options);
  assert.equal(result.schedule.attendance.length, 11);
  assert.equal(result.schedule.attendance.find(row => row.id === 82).resourceSpecific, true);
});

test("year-local holiday bounds do not treat December closures as a future published calendar", async () => {
  const result = await load(fixture(({ rows }) => { rows["resource.calendar.leaves"] = [{ id: 42,
    calendar_id: false, company_id: [1, "Company"], resource_id: false, time_type: "leave",
    date_from: "2026-12-30 23:00:00", date_to: "2026-12-31 23:00:00" }]; }), employee, [2027], options);
  assert.equal(current(result).publicClosures.length, 1);
  assert.equal(result.years.find(row => row.year === 2027).calendarStatus, "missing");
});

test("category names and optional unpaid flags must confirm approved paid types", async () => {
  const changed = fixture(({ rows }) => { rows["hr.leave.type"][0].name = "Something else"; });
  assert.equal(current(await load(changed, employee, [2026], options)).entitlementStatus, "unavailable");
  const flag = fixture(({ rows }) => { rows["hr.leave.type"][0].unpaid = true; });
  assert.equal(current(await load(flag, employee, [2026], options)).entitlementStatus, "unavailable");
  const unknown = fixture(({ rows }) => rows["hr.leave.allocation"].push({ ...rows["hr.leave.allocation"][0], id: 91, holiday_status_id: [91, "Unknown"] }));
  const annual = current(await load(unknown, employee, [2026], options));
  assert.equal(annual.leaveDays, 27); assert.ok(annual.warnings.includes("CATEGORIES_NON_ANNUELLES_EXCLUES"));
});

test("translated category labels use a stable locale only for the exact paid-type read", async () => {
  const rpc = fixture(), sourceRead = rpc.read;
  rpc.read = async (model, domain, fields, kwargs) => {
    const rows = await sourceRead(model, domain, fields, kwargs);
    if (model === "hr.leave.type" && kwargs.context.lang !== "en_US") {
      return rows.map(row => ({ ...row, name: "Libellé traduit en français" }));
    }
    return rows;
  };
  const result = await load(rpc, employee, [2026], options);
  assert.equal(current(result).entitlementStatus, "available"); assert.equal(current(result).leaveDays, 27);
  const categoryRead = rpc.calls.find(call => call.model === "hr.leave.type" && call.fields);
  assert.deepEqual(categoryRead.domain, [["id", "in", [1, 3, 17, 4]]]);
  assert.equal(categoryRead.kwargs.context.lang, "en_US"); assert.equal(categoryRead.kwargs.context.active_test, false);
  assert.ok(rpc.calls.filter(call => call.fields && call.model !== "hr.leave.type").every(call => !Object.hasOwn(call.kwargs.context, "lang")));
});

test("part-time and alternating-week evidence is retained without multiplying hours again", async () => {
  const result = await load(fixture(({ rows }) => {
    Object.assign(rows["resource.calendar"][0], { hours_per_week: 31.8, work_time_rate: 80, two_weeks_calendar: true });
    rows["resource.calendar.attendance"].forEach((row, index) => { row.week_type = index % 2 ? "1" : "0"; });
  }), employee, [2026], options);
  assert.equal(result.schedule.hoursPerWeek, 31.8); assert.equal(result.schedule.workTimeRate, 80);
  assert.equal(result.schedule.twoWeeksCalendar, true); assert.equal(result.schedule.attendance[1].weekType, "1");
});

test("invalid identities/years are rejected before any source request", async () => {
  const rpc = fixture();
  await assert.rejects(load(rpc, { ids: [] }, [2026], options));
  await assert.rejects(load(rpc, employee, ["2026"], options));
  await assert.rejects(load(rpc, employee, Array.from({ length: MAX_YEARS + 1 }, () => 2026), options));
  assert.deepEqual(rpc.calls, []);
});

test("multiple archived/current HR identities cannot double one person's annual leave", async () => {
  const rpc = fixture();
  const result = await load(rpc, { ids: [20, 21], resourceIds: [30, 31] }, [2026], options);
  assert.equal(result.status, "unavailable"); assert.equal(result.schedule.status, "unavailable");
  assert.equal(current(result).leaveHours, null); assert.equal(current(result).entitlementStatus, "unavailable");
  assert.ok(result.warnings.includes("IDENTITE_CAPACITE_AMBIGUE")); assert.deepEqual(rpc.calls, []);
});

test("paid accrual rights stay visible and cannot fabricate zero or a future fallback", async () => {
  for (const year of [2026, 2027]) {
    const result = await load(fixture(({ rows }) => {
      rows["hr.leave.allocation"] = [{ ...rows["hr.leave.allocation"][0], allocation_type: "accrual", date_from: `${year}-01-01` }];
    }), employee, [year], options);
    const annual = result.years.find(row => row.year === year);
    assert.equal(annual.entitlementStatus, "unavailable"); assert.equal(annual.leaveHours, null);
    assert.ok(annual.warnings.includes("DROITS_ANNUELS_ACQUISITION_NON_PROJETEE"));
  }
});

test("paid category time_type must confirm absence rather than worked time", async () => {
  const result = await load(fixture(({ rows }) => { rows["hr.leave.type"][0].time_type = "other"; }), employee, [2026], options);
  assert.equal(current(result).entitlementStatus, "unavailable");
  const unsupported = fixture(({ definitions }) => { delete definitions["hr.leave.type"].time_type; });
  assert.equal(current(await load(unsupported, employee, [2026], options)).entitlementStatus, "unavailable");
  const hiddenCategories = fixture(({ rows }) => { rows["hr.leave.type"] = []; rows["hr.leave.allocation"] = []; });
  const missing = await load(hiddenCategories, employee, [2026, 2027], options);
  assert.ok(missing.years.every(annual => annual.entitlementStatus === "unavailable" && annual.leaveHours === null));
});

test("malformed source amounts, dates, flags and intervals never become known capacity", async () => {
  const changes = [
    ["schedule", ({ rows }) => { rows["resource.calendar"][0].hours_per_day = "7.95"; }],
    ["schedule", ({ rows }) => { rows["resource.calendar"][0].flexible_hours = "false"; }],
    ["schedule", ({ rows }) => { rows["resource.calendar.attendance"][0].hour_to = 7; }],
    ["schedule", ({ rows }) => { rows["resource.calendar.attendance"][0].date_from = "2026-02-30"; }],
    ["calendar", ({ rows }) => { rows["resource.calendar.leaves"][0].date_to = "2026-01-01 25:00:00"; }],
    ["calendar", ({ rows }) => { rows["resource.calendar.leaves"][0].time_type = false; }],
    ["calendar", ({ rows }) => { delete rows["resource.calendar.leaves"][0].resource_id; }],
    ["rights", ({ rows }) => { rows["hr.leave.allocation"][0].number_of_days = -1; }],
    ["rights", ({ rows }) => { rows["hr.leave.allocation"][0].number_of_hours_display = "159"; }],
    ["rights", ({ rows }) => { rows["hr.leave.allocation"][0].holiday_status_id = false; }],
    ["rights", ({ rows }) => { delete rows["hr.leave.allocation"][0].state; }]
  ];
  for (const [measure, change] of changes) {
    const result = await load(fixture(change), employee, [2026], options);
    assert.equal(measure === "schedule" ? result.schedule.status : current(result)[measure === "calendar" ? "calendarStatus" : "entitlementStatus"], "unavailable");
  }
});

test("missing optional hour scalar uses days only, while flexible calendar evidence remains explicit", async () => {
  const days = await load(fixture(({ definitions }) => { delete definitions["hr.leave.allocation"].number_of_hours_display; }), employee, [2026], options);
  assert.equal(current(days).leaveDays, 27); assert.equal(current(days).leaveHours, null);
  const flexible = await load(fixture(({ rows }) => { rows["resource.calendar"][0].flexible_hours = true; }), employee, [2026], options);
  assert.equal(flexible.schedule.flexibleHours, true);
});

test("reference year uses Brussels timezone and is always included independently of caller years", async () => {
  const result = await load(fixture(), employee, [2028], { now: new Date("2026-12-31T23:30:00Z") });
  assert.equal(result.referenceYear, 2027); assert.deepEqual(result.years.map(row => row.year), [2027, 2028]);
});

test("service DTO and calculator reconcile 16 closures plus 27 paid days and future net-day reuse", async () => {
  const Capacity = require("../work-capacity");
  const holidays = ["01-01", "04-06", "05-01", "05-14", "05-25", "07-21", "11-11", "12-25", "12-21", "12-22", "12-23", "12-24", "12-28", "12-29", "12-30", "12-31"];
  const source = await load(fixture(({ rows }) => {
    rows["resource.calendar.leaves"] = holidays.map((day, index) => {
      const wall = Date.parse(`2026-${day}T00:00:00Z`), summer = day >= "03-29" && day < "10-25";
      return { id: index + 1, calendar_id: false, company_id: [1, "Company"], resource_id: false, time_type: "leave",
        date_from: new Date(wall - (summer ? 2 : 1) * 36e5).toISOString().replace("T", " ").slice(0, 19),
        date_to: new Date(wall + 864e5 - (summer ? 2 : 1) * 36e5).toISOString().replace("T", " ").slice(0, 19) };
    });
  }), employee, [2026, 2027, 2028], options);
  const result = Capacity.summarize(source, [2026, 2027, 2028]);
  assert.equal(result.status, "estimated");
  for (const annual of result.years) {
    assert.ok(Math.abs(annual.availableDays - 218) < 1e-8);
    assert.ok(Math.abs(annual.availableHours - 1733.1) < 1e-8);
  }
  assert.ok(Math.abs(result.availableHours - 5199.3) < 1e-8);
});
