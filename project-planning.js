(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./i18n-core-messages") : root.DashboardI18n);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProjectPlanning = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (I18n) {
  "use strict";
  const t = I18n.t;
  const DAY = 864e5;
  const brussels = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit" });
  const brusselsClock = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const number = value => (typeof value === "number" || typeof value === "string" && value.trim()) && Number.isFinite(Number(value)) ? Number(value) : null;
  const id = value => typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
  function date(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return null;
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? { key: value, time } : null;
  }
  function localDay(value) {
    if (typeof value === "boolean" || value == null) return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return date(value);
    const instant = new Date(value);
    if (!Number.isFinite(instant.getTime())) return null;
    const parts = Object.fromEntries(brussels.formatToParts(instant).map(part => [part.type, part.value]));
    return date(`${parts.year}-${parts.month}-${parts.day}`);
  }
  function period(slot) {
    const instant = value => {
      if (typeof value !== "string" || !date(value.trim().slice(0, 10))) return null;
      let text = value.trim();
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text)) text = text.replace(" ", "T") + "Z";
      const time = Date.parse(text); return Number.isFinite(time) ? time : null;
    };
    const start = instant(slot?.start), end = instant(slot?.end);
    return start !== null && end !== null && end > start ? { start, end } : null;
  }
  const key = time => new Date(time).toISOString().slice(0, 10);
  const overlaps = (a, b) => a.start < b.end && b.start < a.end;
  // Calendar ordinals remain 24h apart; actual Brussels midnights can be 23/25h
  // apart. Resolve the UTC instant before prorating a datetime allocation.
  function midnight(day) {
    if (!day) return null;
    let instant = day.time;
    for (let attempt = 0; attempt < 4; attempt++) {
      const parts = Object.fromEntries(brusselsClock.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
      const clock = Date.parse(`${parts.year.padStart(4, "0")}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
      if (!Number.isFinite(clock)) return null;
      const adjustment = day.time - clock;
      if (!adjustment) return instant;
      instant += adjustment;
    }
    return null;
  }
  function atLeastMonth(interval) {
    const start = new Date(interval.start), year = start.getUTCFullYear(), month = start.getUTCMonth();
    const firstNext = new Date(interval.start); firstNext.setUTCDate(1); firstNext.setUTCMonth(month + 1);
    const firstAfter = new Date(firstNext); firstAfter.setUTCMonth(firstAfter.getUTCMonth() + 1);
    const daysNext = (firstAfter.getTime() - firstNext.getTime()) / DAY;
    const threshold = firstNext.getTime() + (Math.min(start.getUTCDate(), daysNext) - 1) * DAY;
    return year > 0 && interval.end >= threshold;
  }
  function merge(intervals) {
    const merged = [];
    for (const interval of [...intervals].sort((a, b) => a.start - b.start || a.end - b.end)) {
      const last = merged.at(-1);
      if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end);
      else merged.push({ ...interval });
    }
    return merged;
  }
  function summarize(result, options = {}) {
    const lifetime = result?.lifetime || {}, first = date(lifetime.startDate), last = date(lifetime.endDate);
    const today = localDay(options.now === undefined ? new Date() : options.now);
    const rawConvention = number(lifetime.conventionHours);
    const convention = lifetime.conventionStatus !== "unavailable" && rawConvention !== null && rawConvention > 0 ? rawConvention : null, warnings = new Set();
    const output = { status: "unavailable", startDate: first?.key || null, endDate: last?.key || null,
      conventionHours: convention, conventionStatus: convention !== null ? "available" : lifetime.conventionStatus !== "unavailable" &&
        (lifetime.conventionStatus === "empty" || rawConvention !== null && rawConvention <= 0) ? "empty" : "unavailable",
      totalPlanned: null, knownToHireHours: null, toHireStatus: "unavailable", plannedWithoutKnownToHire: null,
      toHireResources: [], unlinkedResources: [], difference: null,
      actualHours: null, actualStatus: "unavailable", actualThroughDate: today?.key || null,
      plannedToDateHours: null, plannedToDateStatus: "unavailable",
      conventionToDateHours: null, conventionToDateStatus: "unavailable",
      planningToDateDifference: null, conventionToDateDifference: null,
      remainingPlannedHours: null, remainingPlannedStatus: "unavailable", remainingStartDate: null,
      remainingToHireHours: null, remainingToHireStatus: "unavailable", remainingToHireResources: [],
      projectedHours: null, projectionDifference: null, projectionStatus: "unavailable",
      coverage: { status: "unavailable", startDate: null, endDate: last?.key || null, gaps: [], gapDays: null,
        shortGaps: [], allGapDays: null }, warnings: [] };
    const finish = () => {
      const projected = output.actualHours !== null && output.remainingPlannedHours !== null ? output.actualHours + output.remainingPlannedHours : null;
      output.projectedHours = Number.isFinite(projected) ? projected : null;
      const difference = output.projectedHours !== null && convention !== null ? output.projectedHours - convention : null;
      output.projectionDifference = Number.isFinite(difference) ? difference : null;
      output.projectionStatus = output.projectionDifference !== null ? "available" : "unavailable";
      for (const [reference, status, field] of [["plannedToDateHours", "plannedToDateStatus", "planningToDateDifference"],
        ["conventionToDateHours", "conventionToDateStatus", "conventionToDateDifference"]]) {
        const delta = output.actualStatus === "available" && output[status] === "available"
          ? output.actualHours - output[reference] : null;
        output[field] = Number.isFinite(delta) ? delta : null;
      }
      output.warnings = [...warnings]; return output;
    };
    if (convention !== null && first && last && first.time <= last.time && today) {
      const days = (last.time - first.time) / DAY + 1;
      const elapsed = Math.max(0, Math.min(days, (today.time - first.time) / DAY + 1));
      const expected = convention * (elapsed / days);
      if (Number.isFinite(expected)) { output.conventionToDateHours = expected; output.conventionToDateStatus = "available"; }
    }
    const projectId = id(result?.project?.id);
    if (projectId && first && today && Array.isArray(result?.timesheets?.lines) && result.timesheets.ok !== false && !result.timesheetsError) {
      let actual = 0, validActual = true, unknownFunctions = false;
      for (const line of result.timesheets.lines) {
        if (id(line?.projectId) !== projectId || line.isSubcontractor === true) continue;
        const day = date(line.date);
        if (!day) { validActual = false; continue; }
        if (day.time < first.time || day.time > today.time) continue;
        const hours = number(line.hours);
        if (hours === null) validActual = false; else actual += hours;
        unknownFunctions ||= line.subcontractorClassification === "unknown";
      }
      if (validActual && Number.isFinite(actual)) { output.actualHours = actual; output.actualStatus = "available"; }
      else warnings.add(t("planning.invalidActual"));
      if (unknownFunctions) warnings.add(t("planning.unknownActualFunctions"));
    } else warnings.add(t("planning.actualUnavailable"));
    if (!projectId || !first || !last || first.time > last.time) {
      warnings.add(t("planning.invalidProject")); return finish();
    }
    const future = today ? { start: Math.max(first.time, today.time), end: last.time + DAY } : null;
    const tomorrow = today ? date(key(today.time + DAY)) : null, tomorrowInstant = tomorrow ? midnight(tomorrow) : null;
    const firstInstant = midnight(first), endInstant = midnight(date(key(last.time + DAY)));
    const toDate = tomorrowInstant !== null && firstInstant !== null && endInstant !== null
      ? { start: firstInstant, end: Math.min(tomorrowInstant, endInstant) } : null;
    const remaining = tomorrowInstant !== null && firstInstant !== null && endInstant !== null
      ? { start: Math.max(firstInstant, tomorrowInstant), end: endInstant } : null;
    if (toDate && toDate.end <= toDate.start) {
      output.plannedToDateHours = 0; output.plannedToDateStatus = "available";
    }
    output.remainingStartDate = remaining && remaining.start < remaining.end ? key(Math.max(first.time, tomorrow.time)) : null;
    output.coverage.startDate = future && future.start < future.end ? key(future.start) : null;
    if (remaining && remaining.start >= remaining.end) {
      output.remainingPlannedHours = 0; output.remainingPlannedStatus = "available";
      output.remainingToHireHours = 0; output.remainingToHireStatus = "complete";
    }
    if (future && future.start >= future.end) {
      output.coverage = { status: "complete", startDate: null, endDate: last.key, gaps: [], gapDays: 0, shortGaps: [], allGapDays: 0 };
    }
    if (!Array.isArray(result?.planning?.slots) || result.planning.ok === false || result.planningError) {
      warnings.add(t("planning.unavailable")); return finish();
    }
    const metadata = new Map((Array.isArray(result.planning.resources) ? result.planning.resources : []).filter(resource => id(resource?.id))
      .map(resource => [resource.id, resource]));
    const hires = new Map(), remainingHires = new Map(), unlinked = new Map(), coverage = [], uncertain = [];
    let total = 0, knownHire = 0, validTotal = true, unknownIdentities = 0, knownIdentities = 0, indeterminateFuture = !today;
    let plannedToDate = 0, validToDate = !!toDate, unknownToDateFunctions = false;
    let remainingTotal = 0, remainingHire = 0, validRemaining = !!remaining, remainingUnknown = 0, remainingKnown = 0, unknownRemainingFunctions = false;
    const resourceRow = (map, resourceId, hours) => {
      if (!map.has(resourceId)) map.set(resourceId, { id: resourceId, name: typeof metadata.get(resourceId)?.name === "string" && metadata.get(resourceId).name.trim()
        ? metadata.get(resourceId).name.trim() : t("common.resourceWithId", { p0: resourceId }), hours: 0 });
      const row = map.get(resourceId); row.hours = hours === null || row.hours === null ? null : row.hours + hours;
    };
    for (const slot of result.planning.slots) {
      if (id(slot?.projectId) !== projectId) continue;
      const macroIncluded = slot.isSubcontractor !== true, legacyIncluded = macroIncluded || options.includeOrmitters === true;
      if (!legacyIncluded) continue;
      const dates = period(slot), amount = number(slot.hours);
      if (!dates) {
        validTotal = false; unknownIdentities += 1;
        if (macroIncluded) { validRemaining = false; validToDate = false; indeterminateFuture = true; }
        continue;
      }
      const overlap = Math.max(0, Math.min(dates.end, last.time + DAY) - Math.max(dates.start, first.time));
      const snapshot = slot.planningIdentity;
      const resource = id(slot.resourceId);
      const identity = snapshot?.status === "person" && id(snapshot.employeeId) ? "person" :
        ["to-hire", "unlinked"].includes(snapshot?.status) && snapshot.employeeId === null && resource ? snapshot.status : "unknown";
      if (overlap) {
        const allocated = amount === null ? null : amount * overlap / (dates.end - dates.start);
        if (allocated === null || !Number.isFinite(allocated)) validTotal = false; else total += allocated;
        if (identity === "unknown") unknownIdentities += 1; else knownIdentities += 1;
        if (identity === "to-hire") { resourceRow(hires, resource, allocated); if (allocated !== null) knownHire += allocated; }
        else if (identity === "unlinked") resourceRow(unlinked, resource, allocated);
      }
      if (macroIncluded && toDate && toDate.start < toDate.end) {
        const elapsedOverlap = Math.max(0, Math.min(dates.end, toDate.end) - Math.max(dates.start, toDate.start));
        if (elapsedOverlap) {
          unknownToDateFunctions ||= slot.subcontractorClassification === "unknown";
          const allocated = amount === null ? null : amount * (elapsedOverlap / (dates.end - dates.start));
          if (allocated === null || !Number.isFinite(allocated)) validToDate = false; else plannedToDate += allocated;
        }
      }
      if (macroIncluded && remaining && remaining.start < remaining.end) {
        const futureOverlap = Math.max(0, Math.min(dates.end, remaining.end) - Math.max(dates.start, remaining.start));
        if (futureOverlap) {
          unknownRemainingFunctions ||= slot.subcontractorClassification === "unknown";
          const value = amount === null ? null : amount * futureOverlap / (dates.end - dates.start);
          if (value === null || !Number.isFinite(value)) validRemaining = false; else remainingTotal += value;
          if (identity === "unknown") remainingUnknown++; else remainingKnown++;
          if (identity === "to-hire") { resourceRow(remainingHires, resource, value); if (value !== null) remainingHire += value; }
        }
      }
      if (!macroIncluded) continue;
      if (!future || future.start >= future.end || amount === 0) continue;
      const left = localDay(dates.start), right = localDay(dates.end - 1);
      if (!left || !right) { indeterminateFuture = true; continue; }
      const interval = { start: Math.max(future.start, left.time), end: Math.min(future.end, right.time + DAY) };
      if (interval.end <= interval.start) continue;
      if (!["to-hire", "unlinked"].includes(identity) && (amount === null || amount < 0)) indeterminateFuture = true;
      if (identity === "unknown" || identity === "person" && (amount === null || amount < 0)) uncertain.push(interval);
      else if (identity === "person" && amount > 0) coverage.push(interval);
    }
    if (!Number.isFinite(total) || !Number.isFinite(knownHire)) validTotal = false;
    output.totalPlanned = validTotal ? total : null;
    output.toHireStatus = !validTotal ? "unavailable" : unknownIdentities ? knownIdentities ? "partial" : "unavailable" : "complete";
    output.knownToHireHours = output.toHireStatus === "unavailable" ? null : knownHire;
    output.plannedWithoutKnownToHire = output.totalPlanned !== null && output.knownToHireHours !== null ? output.totalPlanned - output.knownToHireHours : null;
    output.toHireResources = [...hires.values()].sort((a, b) => a.name.localeCompare(b.name, "fr") || a.id - b.id);
    output.unlinkedResources = [...unlinked.values()].sort((a, b) => a.name.localeCompare(b.name, "fr") || a.id - b.id);
    output.difference = output.totalPlanned !== null && convention !== null ? output.totalPlanned - convention : null;
    if (!Number.isFinite(plannedToDate)) validToDate = false;
    if (toDate && toDate.end <= toDate.start) { plannedToDate = 0; validToDate = true; }
    output.plannedToDateHours = validToDate ? plannedToDate : null;
    output.plannedToDateStatus = validToDate ? "available" : "unavailable";
    if (!validToDate) warnings.add(t("planning.toDateUnavailable"));
    if (unknownToDateFunctions) warnings.add(t("planning.toDateUnknownFunctions"));
    if (!Number.isFinite(remainingTotal) || !Number.isFinite(remainingHire)) validRemaining = false;
    if (remaining && remaining.start >= remaining.end) {
      // Past malformed allocations cannot invent future hours after project end.
      remainingTotal = 0; remainingHire = 0; validRemaining = true; remainingUnknown = 0; remainingKnown = 0;
    }
    output.remainingPlannedHours = validRemaining ? remainingTotal : null;
    output.remainingPlannedStatus = validRemaining ? "available" : "unavailable";
    output.remainingToHireStatus = !validRemaining ? "unavailable" : remainingUnknown ? remainingKnown ? "partial" : "unavailable" : "complete";
    output.remainingToHireHours = output.remainingToHireStatus === "unavailable" ? null : remainingHire;
    output.remainingToHireResources = [...remainingHires.values()].sort((a, b) => a.name.localeCompare(b.name, "fr") || a.id - b.id);
    if (!validRemaining) warnings.add(t("planning.futureUnavailable"));
    if (remainingUnknown) warnings.add(t("planning.futureThUnknown"));
    if (unknownRemainingFunctions) warnings.add(t("planning.futureUnknownFunctions"));
    if (!validTotal) warnings.add(t("planning.invalidAllocations"));
    if (unknownIdentities) warnings.add(t("planning.unknownIdentities"));
    if (unlinked.size) warnings.add(t("planning.unlinkedResources"));
    if (future && future.start >= future.end) {
      output.coverage = { status: "complete", startDate: null, endDate: last.key, gaps: [], gapDays: 0, shortGaps: [], allGapDays: 0 };
    } else if (future) {
      let cursor = future.start; const gaps = [];
      for (const interval of merge(coverage)) {
        if (interval.start > cursor) gaps.push({ start: cursor, end: interval.start });
        cursor = Math.max(cursor, interval.end);
      }
      if (cursor < future.end) gaps.push({ start: cursor, end: future.end });
      const substantial = gaps.filter(atLeastMonth), short = gaps.filter(gap => !atLeastMonth(gap));
      if (indeterminateFuture || substantial.some(gap => uncertain.some(interval => overlaps(gap, interval)))) {
        warnings.add(t("planning.coverageIndeterminate"));
      } else {
        const rows = intervals => intervals.map(gap => ({ startDate: key(gap.start), endDate: key(gap.end - DAY), days: (gap.end - gap.start) / DAY }));
        output.coverage = { status: substantial.length ? "gaps" : short.length ? "no-substantial-gaps" : "complete", startDate: key(future.start), endDate: last.key,
          gaps: rows(substantial), shortGaps: rows(short),
          gapDays: substantial.reduce((sum, gap) => sum + (gap.end - gap.start) / DAY, 0),
          allGapDays: gaps.reduce((sum, gap) => sum + (gap.end - gap.start) / DAY, 0) };
      }
    } else warnings.add(t("planning.todayUnavailable"));
    output.status = output.totalPlanned === null ? "unavailable" : output.toHireStatus === "complete" && output.coverage.status !== "unavailable" ? "available" : "partial";
    return finish();
  }
  return { summarize };
});
