(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./i18n-core-messages") : root.DashboardI18n);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProjectMonthly = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (I18n) {
  "use strict";
  const t = I18n.t;

  const DAY = 864e5;
  const MAX_MONTHS = 2400;
  const monthName = month => I18n.formatDate(new Date(Date.UTC(2020, month - 1, 1)), { month: "long" });
  const brussels = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit"
  });

  function calendarDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return null;
    const time = Date.parse(value + "T00:00:00Z");
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) return null;
    return { key: value, time, year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) };
  }

  function todayInBrussels(value) {
    if (value == null || typeof value === "boolean") return null;
    const current = new Date(value);
    if (!Number.isFinite(current.getTime())) return null;
    const parts = Object.fromEntries(brussels.formatToParts(current).map(part => [part.type, part.value]));
    return calendarDate(`${parts.year}-${parts.month}-${parts.day}`);
  }

  function numeric(value) {
    if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function positiveId(value) {
    const id = numeric(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  function photoSource(value) {
    return typeof value === "string" && value.length <= 400000
      && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : null;
  }

  function budgetDetails(lifetime) {
    const hours = numeric(lifetime.conventionHours);
    if (hours !== null && hours > 0) return { hours, status: "available" };
    if (lifetime.conventionStatus === "unavailable") return { hours: null, status: "unavailable" };
    const value = lifetime.conventionHours;
    const explicitlyEmpty = Object.hasOwn(lifetime, "conventionHours")
      && (value === null || value === false || typeof value === "string" && !value.trim());
    return { hours: null, status: hours !== null && hours <= 0 || explicitlyEmpty || lifetime.conventionStatus === "empty" ? "empty" : "unavailable" };
  }

  function slotPeriod(slot) {
    const instant = value => {
      if (typeof value !== "string" || !value.trim()) return null;
      let text = value.trim();
      if (!calendarDate(text.slice(0, 10))) return null;
      // Like personal-time.js, unsuffixed Odoo datetimes represent UTC.
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text)) text = text.replace(" ", "T") + "Z";
      const time = Date.parse(text);
      return Number.isFinite(time) ? time : null;
    };
    const start = instant(slot?.start), end = instant(slot?.end);
    return start !== null && end !== null && end > start ? { start, end } : null;
  }

  function linearReference(hours, start, end, through, monthStarts, cumulative) {
    const periodDays = (end.time - start.time) / DAY + 1;
    let sum = 0;
    return monthStarts.map(monthStart => {
      const nextMonth = new Date(monthStart);
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      const overlapDays = Math.max(0, Math.min(nextMonth.getTime(), end.time + DAY, through.time + DAY)
        - Math.max(monthStart, start.time)) / DAY;
      const value = overlapDays ? hours * (overlapDays / periodDays) : 0;
      sum += value;
      return cumulative ? sum : value;
    });
  }

  function monthAxis(start, through) {
    const count = (through.year - start.year) * 12 + through.month - start.month + 1;
    if (count < 1 || count > MAX_MONTHS) return null;
    const months = [], starts = [];
    for (let index = 0; index < count; index++) {
      const offset = start.month - 1 + index;
      const year = start.year + Math.floor(offset / 12), month = offset % 12 + 1;
      const key = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
      months.push({ key, label: `${monthName(month)} ${year}` });
      starts.push(Date.parse(key + "-01T00:00:00Z"));
    }
    return { months, starts };
  }

  function planningSchedule(result, options, start, end, through, monthStarts, mode) {
    const unavailable = warning => ({ status: "unavailable", warning, employees: [], total: null,
      warnings: [warning], owners: new Map(), uncertain: [], personResources: [] });
    if (!end || end.key < start.key) return unavailable(t("monthly.invalidPlanDates"));
    if (!Array.isArray(result?.planning?.slots) || result.planning.ok === false || result.planningError) {
      return unavailable(t("monthly.planningUnavailable"));
    }
    const projectId = positiveId(result?.project?.id), owners = new Map(), profiles = new Map(), resources = new Map();
    const addOwner = (resourceId, employeeId) => {
      if (!resourceId || !employeeId) return;
      if (!owners.has(resourceId)) owners.set(resourceId, new Set());
      owners.get(resourceId).add(employeeId);
    };
    for (const profile of Array.isArray(result.contributors) ? result.contributors : []) {
      const employeeId = positiveId(profile?.employeeId);
      if (employeeId && !profiles.has(employeeId)) profiles.set(employeeId, profile);
      for (const value of Array.isArray(profile?.resourceIds) ? profile.resourceIds : []) addOwner(positiveId(value), employeeId);
    }
    for (const line of Array.isArray(result?.timesheets?.lines) ? result.timesheets.lines : []) {
      if (positiveId(line?.projectId) === projectId) addOwner(positiveId(line.resourceId), positiveId(line.employeeId));
    }
    for (const resource of Array.isArray(result.planning.resources) ? result.planning.resources : []) {
      const resourceId = positiveId(resource?.id);
      if (!resourceId) continue;
      if (!resources.has(resourceId)) resources.set(resourceId, resource);
      else resources.set(resourceId, null);
      if (resource.linkStatus === "linked" && resource.isToHire !== true) addOwner(resourceId, positiveId(resource.employeeId));
    }
    const groups = new Map(), warnings = new Set(), uncertain = [], personResources = [];
    let unknownFunctions = false, roleFallback = false;
    for (const slot of result.planning.slots) {
      if (positiveId(slot?.projectId) !== projectId) continue;
      if (slot.isSubcontractor === true && options.includeOrmitters !== true) continue;
      const period = slotPeriod(slot);
      if (!period) return unavailable(t("monthly.invalidAllocationDates"));
      const left = Math.max(period.start, start.time), right = Math.min(period.end, end.time + DAY, through.time + DAY);
      if (right <= left) continue;
      const hours = numeric(slot.hours);
      if (hours === null) return unavailable(t("monthly.invalidAllocationHours"));
      if (hours === 0) continue;
      const resourceId = positiveId(slot.resourceId), snapshot = slot.planningIdentity, resource = resources.get(resourceId);
      let employeeId = null, identity = "unknown";
      if (snapshot && typeof snapshot === "object") {
        if (snapshot.status === "person" && positiveId(snapshot.employeeId)) { employeeId = positiveId(snapshot.employeeId); identity = "person"; }
        else if (["to-hire", "unlinked"].includes(snapshot.status) && snapshot.employeeId === null && resourceId) identity = snapshot.status;
      } else if (positiveId(slot.employeeId)) { employeeId = positiveId(slot.employeeId); identity = "person"; }
      else if (slot.employeeId === null || slot.employeeId === undefined || slot.employeeId === false || slot.employeeId === "") {
        if (resource?.isToHire === true) identity = "to-hire";
        else if (resource?.linkStatus === "unlinked") identity = "unlinked";
        else if (owners.get(resourceId)?.size === 1) { employeeId = [...owners.get(resourceId)][0]; identity = "person"; }
      }
      const id = employeeId ? `employee:${employeeId}` : resourceId ? `resource:${resourceId}` : "unassigned";
      if (identity === "unknown") uncertain.push({ id, resourceId });
      if (employeeId && resourceId) personResources.push({ id, resourceId });
      if (!groups.has(id)) {
        const profile = employeeId ? profiles.get(employeeId) : null;
        const label = typeof profile?.name === "string" && profile.name.trim() ? I18n.displayName(profile).trim()
          : !employeeId && typeof resource?.name === "string" && resource.name.trim() ? resource.name.trim()
          : typeof slot.employee === "string" && slot.employee.trim() && identity !== "unknown" ? slot.employee.trim()
          : employeeId ? t("common.employeeWithId", { p0: employeeId }) : resourceId ? t("common.resourceWithId", { p0: resourceId }) : t("monthly.resourceUnidentified");
        groups.set(id, { id, employeeId, resourceId, resourceIds: [], name: label,
          photoDataUrl: photoSource(profile?.photoDataUrl), isSubcontractor: false, isToHire: identity === "to-hire",
          planningIdentity: identity, values: Array(monthStarts.length).fill(0) });
      }
      const employee = groups.get(id);
      if (resourceId && !employee.resourceIds.includes(resourceId)) employee.resourceIds.push(resourceId);
      employee.isSubcontractor ||= slot.isSubcontractor === true;
      employee.isToHire ||= identity === "to-hire";
      if (identity === "unknown") employee.planningIdentity = "unknown";
      for (let index = 0; index < monthStarts.length; index++) {
        const next = new Date(monthStarts[index]); next.setUTCMonth(next.getUTCMonth() + 1);
        const overlap = Math.max(0, Math.min(right, next.getTime()) - Math.max(left, monthStarts[index]));
        employee.values[index] += hours * (overlap / (period.end - period.start));
        if (!Number.isFinite(employee.values[index])) return unavailable(t("monthly.planningOverflow"));
      }
      unknownFunctions ||= !slot.subcontractorClassification || slot.subcontractorClassification === "unknown";
      roleFallback ||= slot.subcontractorClassification === "planning-role";
    }
    const employees = [...groups.values()].filter(employee => employee.values.some(value => value !== 0))
      .sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }) || a.id.localeCompare(b.id, "fr", { numeric: true }));
    const total = Array(monthStarts.length).fill(0);
    for (const employee of employees) employee.values.forEach((value, index) => { total[index] += value; });
    if (mode === "cumulative") for (const values of [total, ...employees.map(employee => employee.values)]) {
      for (let index = 1; index < values.length; index++) values[index] += values[index - 1];
    }
    if ([total, ...employees.map(employee => employee.values)].some(values => values.some(value => !Number.isFinite(value)))) {
      return unavailable(t("monthly.planningOverflow"));
    }
    employees.forEach(employee => employee.resourceIds.sort((a, b) => a - b));
    if (uncertain.length) warnings.add(t("monthly.resourceGroupsWarning"));
    if (employees.some(employee => employee.isToHire)) warnings.add(t("monthly.thWarning"));
    if (unknownFunctions) warnings.add(t("monthly.unknownPlannedFunctions"));
    if (roleFallback) warnings.add(t("monthly.roleFallback"));
    return { status: "available", warning: null, employees, total, warnings: [...warnings], owners, uncertain, personResources };
  }

  function scheduledEmployee(employee, schedule, count) {
    const unavailable = warning => ({ scheduledPlanning: null, scheduledPlanningStatus: "unavailable", scheduledPlanningWarning: warning });
    if (schedule.status !== "available") return unavailable(schedule.warning);
    const employeeId = positiveId(employee.employeeId), resourceId = positiveId(employee.resourceId);
    const owners = schedule.owners.get(resourceId);
    const ownerId = !employeeId && owners?.size === 1 ? [...owners][0] : employeeId;
    const key = ownerId ? `employee:${ownerId}` : resourceId ? `resource:${resourceId}` : "unassigned";
    const resources = new Set(employee.resourceIds || []); if (resourceId) resources.add(resourceId);
    if (ownerId && schedule.uncertain.some(item => !item.resourceId || resources.size === 0 || resources.has(item.resourceId))
      || !ownerId && resourceId && schedule.personResources.some(item => item.resourceId === resourceId)) {
      return unavailable(t("monthly.individualScheduledIdentityUnknown"));
    }
    const values = schedule.employees.find(person => person.id === key)?.values || Array(count).fill(0);
    return { scheduledPlanning: values.slice(), scheduledPlanningStatus: "available", scheduledPlanningWarning: null };
  }

  function summarizePlanning(result, options = {}) {
    const mode = options.mode === "cumulative" ? "cumulative" : "monthly";
    const lifetime = result?.lifetime || {}, budget = budgetDetails(lifetime);
    const start = calendarDate(lifetime.startDate), end = calendarDate(lifetime.endDate);
    const output = { status: "unavailable", startDate: start?.key || null, endDate: end?.key || null,
      throughDate: end?.key || null, months: [], employees: [], total: [], convention: null,
      budgetStatus: budget.status, warnings: [], mode, kind: "planned" };
    if (!start || !end || end.key < start.key || !positiveId(result?.project?.id)) {
      output.warnings.push(t("monthly.invalidProjectIdentity")); return output;
    }
    const axis = monthAxis(start, end);
    if (!axis) { output.warnings.push(t("monthly.planningTooLong")); return output; }
    const schedule = planningSchedule(result, options, start, end, end, axis.starts, mode);
    output.status = schedule.status; output.warnings = schedule.warnings;
    if (schedule.status === "available") {
      output.months = axis.months; output.employees = schedule.employees; output.total = schedule.total;
      if (budget.hours !== null) {
        const convention = linearReference(budget.hours, start, end, end, axis.starts, mode === "cumulative");
        if (convention.every(Number.isFinite)) output.convention = convention;
        else { output.budgetStatus = "unavailable"; output.warnings.push(t("monthly.conventionOverflow")); }
      }
    }
    return output;
  }

  function employeePlanning(result, employees, start, end, through, monthStarts, options, mode) {
    const unavailable = warning => ({ plannedHours: null, plannedStatus: "unavailable", plannedReference: null, plannedWarning: warning });
    const plans = new Map();
    const failAll = warning => {
      employees.forEach(employee => plans.set(employee.id, unavailable(warning)));
      return plans;
    };
    if (!end || end.key < start.key) return failAll(t("monthly.individualDatesInvalid"));
    if (!Array.isArray(result?.planning?.slots) || result.planning.ok === false || result.planningError) {
      return failAll(t("monthly.individualUnavailable"));
    }
    const resourceOwners = new Map();
    const addOwner = (resourceId, employeeId) => {
      if (!resourceId || !employeeId) return;
      if (!resourceOwners.has(resourceId)) resourceOwners.set(resourceId, new Set());
      resourceOwners.get(resourceId).add(employeeId);
    };
    // Include excluded contributors: their resource IDs must not be reassigned
    // to a displayed employee merely because the Ormitter switch is off.
    for (const profile of Array.isArray(result.contributors) ? result.contributors : []) {
      const employeeId = positiveId(profile?.employeeId);
      for (const resource of Array.isArray(profile?.resourceIds) ? profile.resourceIds : []) addOwner(positiveId(resource), employeeId);
    }
    for (const line of result.timesheets.lines) {
      if (positiveId(line?.projectId) === positiveId(result.project.id)) addOwner(positiveId(line.resourceId), positiveId(line.employeeId));
    }
    const identities = employees.map(employee => {
      const owners = resourceOwners.get(employee.resourceId);
      const employeeId = employee.employeeId || (owners?.size === 1 ? [...owners][0] : null);
      const resources = new Set(employee.resourceIds);
      if (employee.resourceId) resources.add(employee.resourceId);
      return { employee, employeeId, resources, hours: 0, warning: !employee.employeeId && owners?.size > 1
        ? t("monthly.ambiguousResource")
        : !employeeId && !employee.resourceId ? t("monthly.unidentifiedEmployeeReference") : null };
    });
    for (const slot of result.planning.slots) {
      if (positiveId(slot?.projectId) !== positiveId(result.project.id)) continue;
      if (slot.isSubcontractor === true && options.includeOrmitters !== true) continue;
      const employeeId = positiveId(slot.employeeId), resourceId = positiveId(slot.resourceId);
      const owners = resourceOwners.get(resourceId);
      const ownerId = owners?.size === 1 ? [...owners][0] : null;
      const invalidEmployee = employeeId === null && slot.employeeId !== null && slot.employeeId !== undefined
        && slot.employeeId !== false && slot.employeeId !== "";
      const period = slotPeriod(slot);
      const overlap = period ? Math.max(0, Math.min(period.end, end.time + DAY) - Math.max(period.start, start.time)) : null;
      if (overlap === 0) continue;
      for (const identity of identities) {
        if (identity.warning) continue;
        if (invalidEmployee && (!resourceId || identity.resources.has(resourceId) || identity.resources.size === 0)) {
          identity.warning = t("monthly.invalidAllocationIdentity");
          continue;
        }
        // An explicit employee always outranks a coincident resource or name.
        if (employeeId && employeeId !== identity.employeeId) {
          if (!identity.employeeId && identity.resources.has(resourceId)) {
            identity.warning = t("monthly.unresolvedAllocationIdentity");
          }
          continue;
        }
        if (!employeeId) {
          if (!resourceId) {
            identity.warning = t("monthly.noAllocationEmployee");
            continue;
          }
          if (owners?.size > 1) {
            if (identity.resources.has(resourceId) || owners.has(identity.employeeId)) {
              identity.warning = t("monthly.ambiguousAllocationIdentity");
            }
            continue;
          }
          if (!ownerId && identity.employeeId && identity.resources.size === 0) {
            identity.warning = t("monthly.unlinkedEmployeeResource");
            continue;
          }
          if (ownerId ? ownerId !== identity.employeeId : resourceId !== identity.employee.resourceId) continue;
        }
        if (!period) {
          identity.warning = t("monthly.invalidIndividualDates");
          continue;
        }
        const hours = numeric(slot.hours);
        if (hours === null) {
          identity.warning = t("monthly.invalidIndividualHours");
          continue;
        }
        identity.hours += hours * (overlap / (period.end - period.start));
        if (!Number.isFinite(identity.hours)) identity.warning = t("monthly.individualOverflow");
      }
    }
    for (const identity of identities) {
      const reference = identity.warning ? null : linearReference(identity.hours, start, end, through, monthStarts, mode === "cumulative");
      if (reference?.some(value => !Number.isFinite(value))) identity.warning = t("monthly.individualOverflow");
      plans.set(identity.employee.id, identity.warning ? unavailable(identity.warning)
        : { plannedHours: identity.hours, plannedStatus: "available", plannedReference: reference, plannedWarning: null });
    }
    return plans;
  }

  function summarize(result, options = {}) {
    const mode = options.mode === "cumulative" ? "cumulative" : "monthly";
    const lifetime = result?.lifetime || {};
    const start = calendarDate(lifetime.startDate), end = calendarDate(lifetime.endDate);
    const through = todayInBrussels(options.now === undefined ? new Date() : options.now);
    const budget = budgetDetails(lifetime);
    const warnings = new Set();
    const output = { status: "unavailable", startDate: start?.key || null, throughDate: through?.key || null,
      endDate: end?.key || null, months: [], employees: [], total: [], convention: null,
      budgetStatus: budget.status, warnings: [], mode, planning: null, planningStatus: "unavailable", planningWarning: null };
    const finish = () => { output.warnings = [...warnings]; return output; };
    if (!start) {
      warnings.add(t("monthly.startMissing"));
      return finish();
    }
    if (!through) {
      warnings.add(t("monthly.todayInvalid"));
      return finish();
    }
    if (start.key > through.key) { output.status = "not-started"; return finish(); }
    const projectId = positiveId(result?.project?.id);
    if (!projectId || !Array.isArray(result?.timesheets?.lines)) {
      warnings.add(t("monthly.actualUnavailable"));
      return finish();
    }
    const monthCount = (through.year - start.year) * 12 + through.month - start.month + 1;
    if (monthCount > MAX_MONTHS) {
      warnings.add(t("monthly.actualTooLong"));
      return finish();
    }
    const monthStarts = [];
    for (let index = 0; index < monthCount; index++) {
      const offset = start.month - 1 + index;
      const year = start.year + Math.floor(offset / 12), month = offset % 12 + 1;
      const key = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
      output.months.push({ key, label: `${monthName(month)} ${year}` });
      monthStarts.push(Date.parse(key + "-01T00:00:00Z"));
    }
    const monthIndex = new Map(output.months.map((month, index) => [month.key, index]));
    const byEmployee = new Map(), byResource = new Map();
    for (const profile of Array.isArray(result.contributors) ? result.contributors : []) {
      if (!profile || typeof profile !== "object") continue;
      const employeeId = positiveId(profile.employeeId);
      if (employeeId) byEmployee.set(employeeId, profile);
      for (const value of Array.isArray(profile.resourceIds) ? profile.resourceIds : []) {
        const resourceId = positiveId(value);
        if (resourceId) byResource.set(resourceId, profile);
      }
    }
    const groups = new Map();
    let ignoredDates = 0, ignoredHours = 0, unknownFunctions = false, roleFallback = false;
    for (const line of result.timesheets.lines) {
      if (!line || positiveId(line.projectId) !== projectId) continue;
      if (line.isSubcontractor === true && options.includeOrmitters !== true) continue;
      const date = calendarDate(line.date);
      if (!date) { ignoredDates++; continue; }
      if (date.key < start.key || date.key > through.key) continue;
      const hours = numeric(line.hours), cents = hours === null ? null : Math.round(hours * 100);
      if (cents === null || !Number.isSafeInteger(cents)) { ignoredHours++; continue; }
      if (!line.subcontractorClassification || line.subcontractorClassification === "unknown") unknownFunctions = true;
      if (line.subcontractorClassification === "planning-role") roleFallback = true;
      const employeeId = positiveId(line.employeeId), resourceId = positiveId(line.resourceId);
      const id = employeeId ? `employee:${employeeId}` : resourceId ? `resource:${resourceId}` : "unassigned";
      if (!groups.has(id)) {
        const profile = employeeId ? byEmployee.get(employeeId) : byResource.get(resourceId);
        const name = typeof profile?.name === "string" && profile.name.trim() ? I18n.displayName(profile)
          : typeof line.employee === "string" && line.employee.trim() ? line.employee : t("monthly.employeeUnidentified");
        groups.set(id, { id, employeeId, resourceId, resourceIds: [], name,
          photoDataUrl: photoSource(profile?.photoDataUrl), isSubcontractor: false, cents: Array(monthCount).fill(0) });
        for (const value of Array.isArray(profile?.resourceIds) ? profile.resourceIds : []) {
          const profileResource = positiveId(value);
          if (profileResource && !groups.get(id).resourceIds.includes(profileResource)) groups.get(id).resourceIds.push(profileResource);
        }
      }
      const employee = groups.get(id);
      if (resourceId && !employee.resourceIds.includes(resourceId)) employee.resourceIds.push(resourceId);
      employee.isSubcontractor ||= line.isSubcontractor === true;
      const index = monthIndex.get(date.key.slice(0, 7));
      const sum = employee.cents[index] + cents;
      if (!Number.isSafeInteger(sum)) {
        warnings.add(t("monthly.actualOverflow"));
        output.months = [];
        return finish();
      }
      employee.cents[index] = sum;
    }
    if (ignoredDates) warnings.add(t("monthly.ignoredDates"));
    if (ignoredHours) warnings.add(t("monthly.ignoredHours"));
    if (unknownFunctions) warnings.add(t("monthly.unknownFunctions"));
    if (roleFallback) warnings.add(t("monthly.roleFallback"));
    if (Array.isArray(result.warnings) && result.warnings.some(warning => typeof warning === "string"
      && (warning.startsWith("Project assignments are unavailable") || warning.startsWith("Project assignment functions are unavailable")))) {
      warnings.add(t("monthly.incompleteOrmitters"));
    }
    const employees = [...groups.values()].filter(employee => employee.cents.some(value => value !== 0))
      .sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }) || a.id.localeCompare(b.id, "fr", { numeric: true }));
    const total = Array(monthCount).fill(0);
    for (const employee of employees) {
      for (let index = 0; index < monthCount; index++) {
        total[index] += employee.cents[index];
        if (!Number.isSafeInteger(total[index])) {
          warnings.add(t("monthly.actualOverflow"));
          output.months = [];
          return finish();
        }
      }
    }
    const prefix = values => {
      let sum = 0;
      return values.map(value => { sum += value; return sum; });
    };
    if (mode === "cumulative" && [total, ...employees.map(employee => employee.cents)]
      .some(values => prefix(values).some(value => !Number.isSafeInteger(value)))) {
      warnings.add(t("monthly.actualOverflow"));
      output.months = [];
      return finish();
    }
    const plans = employeePlanning(result, employees, start, end, through, monthStarts, options, mode);
    const schedule = planningSchedule(result, options, start, end, through, monthStarts, mode);
    output.planning = schedule.total; output.planningStatus = schedule.status; output.planningWarning = schedule.warning;
    schedule.warnings.forEach(warning => warnings.add(warning));
    output.employees = employees.map(employee => {
      const { cents, ...profile } = employee;
      return { ...profile, resourceIds: profile.resourceIds.sort((a, b) => a - b),
        values: (mode === "cumulative" ? prefix(cents) : cents).map(value => value / 100), ...plans.get(employee.id),
        ...scheduledEmployee(employee, schedule, monthCount) };
    });
    output.total = (mode === "cumulative" ? prefix(total) : total).map(value => value / 100);
    if (end && end.key >= start.key && budget.hours !== null) {
      output.convention = linearReference(budget.hours, start, end, through, monthStarts, mode === "cumulative");
    } else if (!end || end.key < start.key) {
      warnings.add(t("monthly.conventionDatesInvalid"));
    }
    output.status = "available";
    return finish();
  }

  return { summarize, summarizePlanning };
});
