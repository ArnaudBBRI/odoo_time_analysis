"use strict";
const relation = model => ({ type: "many2one", relation: model });
const float = { type: "float" }, date = { type: "date" }, boolean = { type: "boolean" };
const selection = values => ({ type: "selection", selection: values.map(value => [value, value]) });
const employee = { ids: [20], resourceIds: [30] };
const options = { now: new Date("2026-10-14T10:00:00Z") };
function fixture(change = () => {}) {
  const definitions = {
    "hr.employee": { id: { type: "integer" }, resource_calendar_id: relation("resource.calendar"), company_id: relation("res.company") },
    "hr.employee.public": { id: { type: "integer" }, resource_calendar_id: relation("resource.calendar"), company_id: relation("res.company") },
    "resource.resource": { id: { type: "integer" }, calendar_id: relation("resource.calendar"), company_id: relation("res.company") },
    "resource.calendar": { id: { type: "integer" }, hours_per_day: float, hours_per_week: float, full_time_required_hours: float,
      work_time_rate: float, tz: { type: "char" }, company_id: relation("res.company"), two_weeks_calendar: boolean, flexible_hours: boolean },
    "resource.calendar.attendance": { id: { type: "integer" }, calendar_id: relation("resource.calendar"), resource_id: relation("resource.resource"),
      dayofweek: selection(["0", "1", "2", "3", "4", "5", "6"]), hour_from: float, hour_to: float,
      day_period: selection(["morning", "afternoon", "lunch"]), display_type: selection(["line_section"]),
      date_from: date, date_to: date, week_type: selection(["0", "1"]) },
    "resource.calendar.leaves": { id: { type: "integer" }, calendar_id: relation("resource.calendar"), company_id: relation("res.company"),
      resource_id: relation("resource.resource"), date_from: { type: "datetime" }, date_to: { type: "datetime" }, time_type: selection(["leave", "other"]) },
    "hr.leave.allocation": { id: { type: "integer" }, employee_id: relation("hr.employee"), holiday_status_id: relation("hr.leave.type"),
      date_from: date, state: selection(["validate", "draft"]), allocation_type: selection(["regular", "accrual"]), number_of_days: float, number_of_hours_display: float },
    "hr.leave.type": { id: { type: "integer" }, name: { type: "char" }, unpaid: boolean, time_type: selection(["leave", "other"]) }
  };
  const rows = {
    "hr.employee": [{ id: 20, resource_calendar_id: [1, "My schedule"], company_id: [1, "Company"] }],
    "hr.employee.public": [{ id: 20, resource_calendar_id: [1, "My schedule"], company_id: [1, "Company"] }],
    "resource.resource": [{ id: 30, calendar_id: [1, "My schedule"], company_id: [1, "Company"] }],
    "resource.calendar": [{ id: 1, hours_per_day: 7.95, hours_per_week: 39.75, full_time_required_hours: 39.75,
      work_time_rate: 100, tz: "Europe/Brussels", company_id: [1, "Company"], two_weeks_calendar: false, flexible_hours: false }],
    "resource.calendar.attendance": Array.from({ length: 10 }, (_, i) => ({ id: i + 1, calendar_id: [1, "Calendar"], resource_id: false,
      dayofweek: String(Math.floor(i / 2)), hour_from: i % 2 ? 13 : 8, hour_to: i % 2 ? 16.95 : 12,
      day_period: i % 2 ? "afternoon" : "morning", display_type: false, date_from: false, date_to: false, week_type: false })),
    "resource.calendar.leaves": [{ id: 1, calendar_id: false, company_id: [1, "Company"], resource_id: false,
      date_from: "2025-12-31 23:00:00", date_to: "2026-01-01 23:00:00", time_type: "leave", name: "PRIVATE_DESCRIPTION" }],
    "hr.leave.type": [{ id: 1, name: "Annual Time Off ", unpaid: false, time_type: "leave" }, { id: 3, name: "Compensatory Days", unpaid: false, time_type: "leave" },
      { id: 17, name: "Anciënniteitsverlof", unpaid: false, time_type: "leave" }, { id: 4, name: "Unpaid", unpaid: true, time_type: "leave" }],
    "hr.leave.allocation": [[1, 1, 20], [2, 3, 6], [3, 17, 1], [4, 4, 5]].map(([id, type, days]) => ({ id,
      employee_id: [20, "PERSONAL_NAME"], holiday_status_id: [type, "Category"], date_from: "2026-01-01", state: "validate",
      allocation_type: "regular", number_of_days: days, number_of_hours_display: days * 7.95, name: "PRIVATE_DESCRIPTION" }))
  };
  const calls = [], denied = new Set(), deniedMetadata = new Set(), deniedColumns = new Set();
  change({ definitions, rows, denied, deniedMetadata, deniedColumns });
  return { calls, definitions, rows, async fields(model) {
    calls.push({ model, method: "fields_get" });
    if (deniedMetadata.has(model)) throw new Error("PRIVATE_FAULT");
    return structuredClone(definitions[model] || {});
  }, async read(model, domain, names, kwargs) {
    calls.push({ model, method: "search_read", domain, fields: names, kwargs });
    if (denied.has(model) || names.some(name => deniedColumns.has(`${model}:${name}`))) throw new Error("PRIVATE_FAULT");
    // Deliberately over-return every year and foreign records: service owns all postfilters.
    return structuredClone(rows[model] || []);
  } };
}

module.exports = { fixture, employee, options };
