"use strict";

// Optional, exact-owner reads only. No leave requests, balances, payroll or
// workflow methods are used to infer annual working capacity.
const MAX_YEARS = 30;
const PAID_TYPES = new Map([[1, "Annual Time Off"], [3, "Compensatory Days"], [17, "Anciënniteitsverlof"]]);
const positiveId = value => Number.isSafeInteger(value) && value > 0 ? value : null;
const relationId = value => positiveId(Array.isArray(value) ? value[0] : value);
const numeric = value => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const numericField = definition => ["integer", "float"].includes(definition?.type);
const relation = (definition, model) => definition?.type === "many2one" && definition.relation === model;
const ownRelation = definition => definition?.type === "many2one" && ["hr.employee", "hr.employee.public"].includes(definition.relation);
const optionalEmpty = value => value === false || value === null;
const warning = (list, value) => { if (!list.includes(value)) list.push(value); };

function date(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

function datetime(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z?$/.test(value)) return null;
  const text = value.replace(" ", "T").replace(/Z?$/, "Z"), parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) && date(value.slice(0, 10))
    && parsed.toISOString().slice(0, 19) === text.slice(0, 19) ? parsed.toISOString() : null;
}

function selectionHas(definition, value) {
  return definition?.type === "selection" && Array.isArray(definition.selection)
    && definition.selection.some(item => Array.isArray(item) && item[0] === value);
}

function yearMidnight(year, timeZone) {
  const wall = Date.parse(`${String(year).padStart(4, "0")}-01-01T00:00:00Z`);
  let result = wall;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let pass = 0; pass < 3; pass++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(result)).map(part => [part.type, part.value]));
    const actual = Date.parse(`${parts.year.padStart(4, "0")}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
    const difference = wall - actual;
    result += difference;
    if (!difference) break;
  }
  return result;
}

function scopedRows(rows, accepts, fields) {
  if (!Array.isArray(rows)) throw new Error("Invalid capacity source");
  const result = new Map();
  for (const row of rows) {
    if (!row || !accepts(row)) continue;
    const id = positiveId(row.id);
    if (!id) throw new Error("Invalid capacity source identity");
    const projected = Object.fromEntries(fields.map(field => [field, row[field]]));
    if (result.has(id) && JSON.stringify(result.get(id)) !== JSON.stringify(projected)) throw new Error("Conflicting capacity source");
    result.set(id, projected);
  }
  return [...result.values()];
}

async function load(rpc, employee, years, { now = new Date() } = {}) {
  const ownIds = [...new Set(employee?.ids || [])].filter(positiveId).sort((a, b) => a - b);
  const ownResources = [...new Set(employee?.resourceIds || [])].filter(positiveId).sort((a, b) => a - b);
  if (!ownIds.length || !rpc || typeof rpc.fields !== "function" || typeof rpc.read !== "function") throw new Error("Invalid personal capacity identity");
  const instant = new Date(now);
  if (!Number.isFinite(instant.getTime())) throw new Error("Invalid personal capacity date");
  const referenceYear = Number(new Intl.DateTimeFormat("en", { timeZone: "Europe/Brussels", year: "numeric" }).format(instant));
  const requested = Array.from(years || []);
  if (requested.length > MAX_YEARS || requested.some(year => !Number.isInteger(year) || year < 1 || year > 9998)) throw new Error("Invalid personal capacity years");
  const selected = [...new Set([referenceYear, ...requested])].sort((a, b) => a - b);
  const result = { referenceYear, status: "unavailable", schedule: { status: "unavailable" },
    years: selected.map(year => ({ year, calendarStatus: "unavailable", publicClosures: [],
      entitlementStatus: "unavailable", leaveDays: null, leaveHours: null, warnings: [] })), warnings: [] };
  if (ownIds.length !== 1) {
    // The time endpoint intentionally retains archived HR links. Without a
    // canonical effective employee, summing allocations across those links
    // could double the same person's annual rights.
    warning(result.warnings, "IDENTITE_CAPACITE_AMBIGUE");
    return result;
  }
  const metadata = new Map();
  const fields = async model => {
    if (!metadata.has(model)) {
      const value = await rpc.fields(model);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid capacity metadata");
      metadata.set(model, value);
    }
    return metadata.get(model);
  };
  const read = (model, domain, names, context = {}) => rpc.read(model, domain, names,
    { order: "id asc", context: { ...context, active_test: false } });

  let calendarId, companyId;
  try {
    const calendars = new Set(), companies = new Set(), columns = new Map();
    let invalidOwnEvidence = false;
    // Private/public models are alternate views of the same exact HR IDs.
    for (const model of ["hr.employee", "hr.employee.public"]) {
      let obtainedRows = false;
      try {
        const definitions = await fields(model);
        if (definitions.id?.type !== "integer") continue;
        const names = ["resource_calendar_id", "company_id"].filter(name => relation(definitions[name], name === "company_id" ? "res.company" : "resource.calendar"));
        if (!names.length) continue;
        for (const name of names) {
          obtainedRows = false;
          const source = await read(model, [["id", "in", ownIds]], ["id", name]);
          obtainedRows = true;
          const rows = scopedRows(source, row => ownIds.includes(row.id), ["id", name]);
          for (const row of rows) {
            const value = row[name], id = relationId(value);
            if (!id && !optionalEmpty(value)) throw new Error("Malformed own calendar identity");
            const key = `${row.id}:${name}`;
            if (columns.has(key) && columns.get(key) !== id) throw new Error("Conflicting own calendar identity");
            columns.set(key, id);
            if (id) (name === "company_id" ? companies : calendars).add(id);
          }
        }
      } catch (_) {
        // A denied read can recover through the public view; readable malformed
        // or contradictory identity evidence cannot become a confirmed calendar.
        if (obtainedRows) invalidOwnEvidence = true;
      }
    }
    if (invalidOwnEvidence) throw new Error("Invalid own calendar evidence");
    if ((!calendars.size || !companies.size) && ownResources.length) {
      const definitions = await fields("resource.resource");
      if (definitions.id?.type === "integer" && relation(definitions.calendar_id, "resource.calendar")) {
        const names = ["id", "calendar_id", ...(relation(definitions.company_id, "res.company") ? ["company_id"] : [])];
        const rows = scopedRows(await read("resource.resource", [["id", "in", ownResources]], names), row => ownResources.includes(row.id), names);
        for (const row of rows) {
          const id = relationId(row.calendar_id);
          if (id) calendars.add(id); else if (!optionalEmpty(row.calendar_id)) throw new Error("Invalid resource calendar");
          if (names.includes("company_id")) {
            const company = relationId(row.company_id);
            if (company) companies.add(company); else if (!optionalEmpty(row.company_id)) throw new Error("Invalid resource company");
          }
        }
      }
    }
    if (calendars.size !== 1 || companies.size > 1) throw new Error("Ambiguous personal calendar");
    calendarId = [...calendars][0]; companyId = [...companies][0] || null;
    const definitions = await fields("resource.calendar");
    if (definitions.id?.type !== "integer" || !numericField(definitions.hours_per_day)
      || !numericField(definitions.hours_per_week) || !["char", "selection"].includes(definitions.tz?.type)
      || definitions.two_weeks_calendar?.type !== "boolean" || definitions.flexible_hours?.type !== "boolean") throw new Error("Unsupported work calendar");
    const names = ["id", "hours_per_day", "hours_per_week", "tz",
      ...["full_time_required_hours", "work_time_rate"].filter(name => numericField(definitions[name])),
      ...["two_weeks_calendar", "flexible_hours"].filter(name => definitions[name]?.type === "boolean"),
      ...(relation(definitions.company_id, "res.company") ? ["company_id"] : [])];
    const rows = scopedRows(await read("resource.calendar", [["id", "=", calendarId]], names), row => row.id === calendarId, names);
    if (rows.length !== 1) throw new Error("Missing work calendar");
    const row = rows[0], hoursPerDay = numeric(row.hours_per_day), hoursPerWeek = numeric(row.hours_per_week);
    if (!hoursPerDay || !hoursPerWeek || typeof row.tz !== "string") throw new Error("Invalid work calendar");
    new Intl.DateTimeFormat("en", { timeZone: row.tz }).format(instant);
    if (names.includes("company_id")) {
      const id = relationId(row.company_id);
      if (!id && !optionalEmpty(row.company_id) || id && companyId && id !== companyId) throw new Error("Conflicting calendar company");
      companyId ||= id;
    }
    if (!companyId) throw new Error("Unavailable calendar company");
    for (const name of ["two_weeks_calendar", "flexible_hours"].filter(name => names.includes(name))) {
      if (typeof row[name] !== "boolean") throw new Error("Invalid calendar schedule flag");
    }
    const schedule = { status: "available", basisYear: referenceYear, calendarId, companyId, timeZone: row.tz, hoursPerDay, hoursPerWeek,
      fullTimeHoursPerWeek: numeric(row.full_time_required_hours), workTimeRate: numeric(row.work_time_rate),
      twoWeeksCalendar: row.two_weeks_calendar === true, flexibleHours: row.flexible_hours === true, attendance: [] };
    const attendance = await fields("resource.calendar.attendance");
    if (attendance.id?.type !== "integer" || !relation(attendance.calendar_id, "resource.calendar")
      || !["selection", "integer"].includes(attendance.dayofweek?.type)
      || !numericField(attendance.hour_from) || !numericField(attendance.hour_to)
      || !selectionHas(attendance.day_period, "morning") || !selectionHas(attendance.day_period, "afternoon")) throw new Error("Unsupported calendar attendance");
    const attendanceFields = ["id", "calendar_id", "dayofweek", "hour_from", "hour_to",
      ...["day_period", "display_type", "week_type"].filter(name => attendance[name]?.type === "selection"),
      ...["date_from", "date_to"].filter(name => attendance[name]?.type === "date"),
      ...(relation(attendance.resource_id, "resource.resource") ? ["resource_id"] : [])];
    if (schedule.twoWeeksCalendar && !attendanceFields.includes("week_type")) throw new Error("Missing alternating-week schedule");
    const domain = [["calendar_id", "=", calendarId], ...(attendanceFields.includes("resource_id")
      ? ["|", ["resource_id", "=", false], ["resource_id", "in", ownResources]] : [])];
    const records = scopedRows(await read("resource.calendar.attendance", domain, attendanceFields), item => relationId(item.calendar_id) === calendarId
      && (!attendanceFields.includes("resource_id") || optionalEmpty(item.resource_id) || ownResources.includes(relationId(item.resource_id))), attendanceFields);
    for (const item of records) {
      if (item.display_type && !optionalEmpty(item.display_type) || item.day_period === "lunch") continue;
      const dayOfWeek = typeof item.dayofweek === "string" && /^[0-6]$/.test(item.dayofweek) ? Number(item.dayofweek) : item.dayofweek;
      const hourFrom = numeric(item.hour_from), hourTo = numeric(item.hour_to);
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || hourFrom === null || hourTo === null
        || hourFrom >= hourTo || hourTo > 24) throw new Error("Invalid attendance interval");
      const dateFrom = item.date_from == null || item.date_from === false ? null : date(item.date_from);
      const dateTo = item.date_to == null || item.date_to === false ? null : date(item.date_to);
      if (item.date_from && !dateFrom || item.date_to && !dateTo || dateFrom && dateTo && dateFrom > dateTo) throw new Error("Invalid attendance dates");
      const weekType = item.week_type == null || item.week_type === false ? null : ["0", "1"].includes(item.week_type) ? item.week_type : null;
      if (item.week_type && weekType === null || schedule.twoWeeksCalendar && weekType === null) throw new Error("Invalid attendance week");
      schedule.attendance.push({ id: item.id, dayOfWeek, hourFrom, hourTo, weekType, dateFrom, dateTo,
        resourceSpecific: Boolean(relationId(item.resource_id)) });
    }
    if (!schedule.attendance.length) throw new Error("Empty attendance calendar");
    result.schedule = schedule; result.status = "available";
    warning(result.warnings, "CALENDRIER_ACTUEL_APPLIQUE_AUX_ANNEES");
  } catch (_) {
    warning(result.warnings, "CALENDRIER_PERSONNEL_INDISPONIBLE");
    return result;
  }

  try {
    const definitions = await fields("resource.calendar.leaves");
    if (definitions.id?.type !== "integer" || !relation(definitions.calendar_id, "resource.calendar")
      || !relation(definitions.company_id, "res.company") || !relation(definitions.resource_id, "resource.resource")
      || definitions.date_from?.type !== "datetime" || definitions.date_to?.type !== "datetime"
      || !selectionHas(definitions.time_type, "leave")) throw new Error("Unsupported public calendar");
    const names = ["id", "calendar_id", "company_id", "resource_id", "date_from", "date_to",
      ...(definitions.time_type?.type === "selection" ? ["time_type"] : [])];
    for (const entry of result.years) {
      try {
        // The one-day margins cover UTC/local boundary crossings. Post-filtering
        // and the pure calculator retain only each requested calendar year.
        const lower = `${String(entry.year - 1).padStart(4, "0")}-12-31 00:00:00`;
        const upper = `${String(entry.year + 1).padStart(4, "0")}-01-02 00:00:00`;
        const yearFrom = yearMidnight(entry.year, result.schedule.timeZone);
        const yearTo = yearMidnight(entry.year + 1, result.schedule.timeZone);
        const domain = [["resource_id", "=", false], "|", ["calendar_id", "=", calendarId], ["calendar_id", "=", false],
          "|", ["company_id", "=", companyId], ["company_id", "=", false], ["date_from", "<", upper], ["date_to", ">", lower]];
        const rows = scopedRows(await read("resource.calendar.leaves", domain, names), row => {
          const calendar = relationId(row.calendar_id), company = relationId(row.company_id), resource = relationId(row.resource_id);
          if (calendar && calendar !== calendarId || company && company !== companyId || resource) return false;
          if (!optionalEmpty(row.calendar_id) && !calendar || !optionalEmpty(row.company_id) && !company
            || !optionalEmpty(row.resource_id)) throw new Error("Invalid collective calendar ownership");
          return true;
        }, names);
        for (const row of rows) {
          if (names.includes("time_type") && row.time_type !== "leave") {
            if (row.time_type === "other" && selectionHas(definitions.time_type, "other")) continue;
            throw new Error("Unknown public closure kind");
          }
          const start = datetime(row.date_from), end = datetime(row.date_to);
          if (!start || !end || start >= end) throw new Error("Invalid public closure");
          if (Date.parse(start) < yearTo && Date.parse(end) > yearFrom) entry.publicClosures.push({ id: row.id, start, end });
        }
        entry.calendarStatus = entry.year > referenceYear && !entry.publicClosures.length ? "missing" : "available";
      } catch (_) { entry.publicClosures = []; warning(entry.warnings, "CALENDRIER_COLLECTIF_INDISPONIBLE"); }
    }
  } catch (_) { for (const entry of result.years) warning(entry.warnings, "CALENDRIER_COLLECTIF_INDISPONIBLE"); }

  try {
    const definitions = await fields("hr.leave.allocation");
    if (definitions.id?.type !== "integer" || !ownRelation(definitions.employee_id)
      || !relation(definitions.holiday_status_id, "hr.leave.type") || definitions.date_from?.type !== "date"
      || !selectionHas(definitions.state, "validate") || !selectionHas(definitions.allocation_type, "regular")
      || !numericField(definitions.number_of_days) && !numericField(definitions.number_of_hours_display)) throw new Error("Unsupported annual rights");
    const typeDefinitions = await fields("hr.leave.type");
    if (typeDefinitions.id?.type !== "integer" || !["char", "text"].includes(typeDefinitions.name?.type)
      || !selectionHas(typeDefinitions.time_type, "leave")) throw new Error("Unsupported leave categories");
    const typeNames = ["id", "name", "time_type", ...(typeDefinitions.unpaid?.type === "boolean" ? ["unpaid"] : [])];
    // Leave category names are translatable. Confirm the fixed IDs in one
    // stable language rather than changing eligibility with the account locale.
    const types = scopedRows(await read("hr.leave.type", [["id", "in", [...PAID_TYPES.keys(), 4]]], typeNames,
      { lang: "en_US" }), row => PAID_TYPES.has(row.id) || row.id === 4, typeNames);
    const eligibleTypes = new Set();
    for (const type of types) {
      if (!PAID_TYPES.has(type.id)) continue;
      if (typeof type.name === "string" && type.name.trim() === PAID_TYPES.get(type.id) && type.time_type === "leave"
        && (!typeNames.includes("unpaid") || type.unpaid === false)) eligibleTypes.add(type.id);
    }
    // An empty grant search cannot prove a zero allowance when the known paid
    // categories themselves were hidden or unconfirmed.
    if (eligibleTypes.size !== PAID_TYPES.size) throw new Error("Paid annual categories are not completely confirmed");
    const names = ["id", "employee_id", "holiday_status_id", "date_from", "state", "allocation_type",
      ...["number_of_days", "number_of_hours_display"].filter(name => numericField(definitions[name]))];
    for (const entry of result.years) {
      try {
        const domain = [["employee_id", "in", ownIds], ["state", "=", "validate"],
          ["date_from", ">=", `${entry.year}-01-01`], ["date_from", "<=", `${entry.year}-12-31`]];
        const rows = scopedRows(await read("hr.leave.allocation", domain, names), row => ownIds.includes(relationId(row.employee_id)), names);
        let days = 0, hours = 0, count = 0, allDays = true, allHours = true;
        for (const row of rows) {
          if (row.state !== "validate") {
            if (selectionHas(definitions.state, row.state)) continue;
            throw new Error("Unknown annual rights approval");
          }
          const start = date(row.date_from);
          if (!start) throw new Error("Invalid annual rights period");
          if (Number(start.slice(0, 4)) !== entry.year) continue; // Prior-year carryover is not a new annual entitlement.
          const typeId = relationId(row.holiday_status_id);
          if (!typeId) throw new Error("Invalid annual rights category");
          if (typeId === 4) { warning(entry.warnings, "CONGES_SANS_SOLDE_EXCLUS"); continue; }
          if (!PAID_TYPES.has(typeId)) { warning(entry.warnings, "CATEGORIES_NON_ANNUELLES_EXCLUES"); continue; }
          if (!eligibleTypes.has(typeId)) throw new Error("Unconfirmed paid rights category");
          if (row.allocation_type !== "regular") {
            warning(entry.warnings, row.allocation_type === "accrual" ? "DROITS_ANNUELS_ACQUISITION_NON_PROJETEE" : "TYPE_ATTRIBUTION_INCONNU");
            throw new Error("Annual accrual rights require unavailable projection");
          }
          const grantDays = numeric(row.number_of_days), grantHours = numeric(row.number_of_hours_display);
          if (grantDays === null && grantHours === null) throw new Error("Invalid annual rights amount");
          if (names.includes("number_of_days") && grantDays === null || names.includes("number_of_hours_display") && grantHours === null) throw new Error("Invalid annual rights amount");
          allDays &&= grantDays !== null; allHours &&= grantHours !== null;
          days += grantDays || 0; hours += grantHours || 0; count++;
          if (!Number.isFinite(days) || !Number.isFinite(hours)) throw new Error("Invalid annual rights total");
        }
        entry.leaveDays = allDays ? days : null; entry.leaveHours = allHours ? hours : null;
        entry.entitlementStatus = entry.year > referenceYear && count === 0 ? "missing" : "available";
      } catch (_) {
        entry.leaveDays = null; entry.leaveHours = null;
        warning(entry.warnings, "DROITS_ANNUELS_INDISPONIBLES");
      }
    }
  } catch (_) { for (const entry of result.years) warning(entry.warnings, "DROITS_ANNUELS_INDISPONIBLES"); }
  return result;
}

module.exports = { load, MAX_YEARS };
