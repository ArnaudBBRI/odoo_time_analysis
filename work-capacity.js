(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./i18n-core-messages") : root.DashboardI18n);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WorkCapacity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (I18n) {
  "use strict";
  const t = I18n.t;
  const DAY = 864e5, HOUR = 36e5, MAX_YEARS = 150;
  const clocks = new Map();
  const finite = value => typeof value === "number" && Number.isFinite(value) ? value : null;
  const yearNumber = value => (typeof value === "number" || typeof value === "string" && /^\d{1,4}$/.test(value)) &&
    Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 9998 ? Number(value) : null;
  const key = instant => new Date(instant).toISOString().slice(0, 10);
  const startOfYear = year => Date.parse(`${String(year).padStart(4, "0")}-01-01T00:00:00Z`);
  function date(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return null;
    const instant = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(instant) && key(instant) === value ? instant : null;
  }
  function normalizeScope(value) {
    if (value && typeof value === "object" && ("startDate" in value || "endDate" in value)) {
      const start = date(value.startDate), end = date(value.endDate);
      if (start === null || end === null || start > end || new Date(end).getUTCFullYear() > 9998) return null;
      const first = new Date(start).getUTCFullYear(), last = new Date(end).getUTCFullYear();
      if (last - first + 1 > MAX_YEARS) return null;
      return { custom: true, startDate: key(start), endDate: key(end), years: Array.from({ length: last - first + 1 }, (_, index) => first + index) };
    }
    const iterable = value && typeof value === "object" && Array.isArray(value.years) ? value.years : value;
    if (!iterable || typeof iterable === "string" || typeof iterable[Symbol.iterator] !== "function") return null;
    const years = [...new Set([...iterable].map(yearNumber))];
    if (!years.length || years.includes(null) || years.length > MAX_YEARS) return null;
    years.sort((a, b) => a - b);
    return { custom: false, startDate: `${String(years[0]).padStart(4, "0")}-01-01`,
      endDate: `${String(years.at(-1)).padStart(4, "0")}-12-31`, years };
  }
  // Odoo's alternating-week parity uses Gregorian ordinals, including across
  // ISO years with week 53. Calendar dates remain 24h apart through DST.
  function weekType(value) {
    const instant = date(value);
    if (instant === null) return null;
    const ordinal = (instant - Date.parse("0001-01-01T00:00:00Z")) / DAY + 1;
    return Math.floor((ordinal - 1) / 7) % 2;
  }
  function clock(zone) {
    if (typeof zone !== "string" || !zone.trim()) return null;
    try {
      if (!clocks.has(zone)) clocks.set(zone, new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit",
        day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }));
      return clocks.get(zone);
    } catch (_) { return null; }
  }
  function wall(instant, formatter) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
    return Date.parse(`${parts.year.padStart(4, "0")}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
  }
  function localInstant(day, hour, formatter) {
    const target = day + Math.round(hour * HOUR), secondTarget = Math.floor(target / 1000) * 1000;
    const offsets = new Set([-DAY, -DAY / 2, 0, DAY / 2, DAY].map(delta => {
      const sample = secondTarget + delta;
      return wall(sample, formatter) - sample;
    }));
    const candidates = [...offsets].map(offset => secondTarget - offset).filter(candidate => wall(candidate, formatter) === secondTarget);
    // An ambiguous local boundary uses standard-time's later instant, matching
    // pytz.localize's default. A nonexistent boundary cannot establish capacity.
    return candidates.length ? Math.max(...candidates) + target - secondTarget : null;
  }
  function merge(intervals) {
    const result = [];
    for (const interval of [...intervals].sort((a, b) => a.start - b.start || a.end - b.end)) {
      const last = result.at(-1);
      if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end);
      else result.push({ start: interval.start, end: interval.end });
    }
    return result;
  }
  function instant(value) {
    if (typeof value !== "string" || date(value.trim().slice(0, 10)) === null) return null;
    let text = value.trim();
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text)) text = text.replace(" ", "T") + "Z";
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) return null;
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const sum = (rows, field) => rows.reduce((total, row) => row[field] === null || total === null ? null : total + row[field], 0);
  const warnings = values => [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === "string" && value.trim()))];
  function scheduleData(schedule) {
    const formatter = clock(schedule?.timeZone), hoursPerDay = finite(schedule?.hoursPerDay);
    if (schedule?.status !== "available" || !formatter || hoursPerDay === null || hoursPerDay <= 0 ||
      schedule.flexibleHours === true || schedule.scheduleType === "flexible" || !Array.isArray(schedule.attendance)) return null;
    const rows = [];
    for (const row of schedule.attendance) {
      if (row?.displayType || row?.dayPeriod === "lunch") continue;
      const dayOfWeek = typeof row?.dayOfWeek === "number" ? row.dayOfWeek : typeof row?.dayOfWeek === "string" && /^[0-6]$/.test(row.dayOfWeek) ? Number(row.dayOfWeek) : null;
      const from = finite(row?.hourFrom), to = finite(row?.hourTo);
      const week = row?.weekType === 0 || row?.weekType === "0" ? 0 : row?.weekType === 1 || row?.weekType === "1" ? 1 : null;
      const first = row?.dateFrom == null || row.dateFrom === false ? null : date(row.dateFrom);
      const last = row?.dateTo == null || row.dateTo === false ? null : date(row.dateTo);
      if (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6 || !Number.isInteger(dayOfWeek) || from === null || to === null ||
        from < 0 || to > 24 || to <= from || schedule.twoWeeksCalendar === true && week === null ||
        row.dateFrom != null && row.dateFrom !== false && first === null || row.dateTo != null && row.dateTo !== false && last === null ||
        first !== null && last !== null && first > last) return null;
      rows.push({ dayOfWeek, from, to, week, first, last });
    }
    if (!rows.length) return null;
    return { formatter, hoursPerDay, rows, alternating: schedule.twoWeeksCalendar === true, basisYear: yearNumber(schedule.basisYear) };
  }
  function dailyWork(year, schedule) {
    const result = [];
    for (let day = startOfYear(year); day < startOfYear(year + 1); day += DAY) {
      const dayKey = key(day), weekday = (new Date(day).getUTCDay() + 6) % 7, parity = weekType(dayKey), intervals = [];
      for (const attendance of schedule.rows) {
        if (attendance.dayOfWeek !== weekday || schedule.alternating && attendance.week !== parity ||
          attendance.first !== null && day < attendance.first || attendance.last !== null && day > attendance.last) continue;
        const start = localInstant(day, attendance.from, schedule.formatter), end = localInstant(day, attendance.to, schedule.formatter);
        if (start === null || end === null || end <= start) return null;
        intervals.push({ start, end });
      }
      const merged = merge(intervals), scheduledHours = merged.reduce((total, interval) => total + (interval.end - interval.start) / HOUR, 0);
      result.push({ date: dayKey, scheduledHours, publicHolidayHours: null, netHours: null, intervals: merged });
    }
    return result;
  }
  function publicIntervals(rows) {
    if (!Array.isArray(rows)) return null;
    const intervals = [];
    for (const row of rows) {
      const start = instant(row?.start), end = instant(row?.end);
      if (start === null || end === null || end <= start) return null;
      intervals.push({ start, end });
    }
    return merge(intervals);
  }
  function applyClosures(daily, closures) {
    return daily.map(row => {
      let closed = 0;
      for (const work of row.intervals) for (const leave of closures) closed += Math.max(0, Math.min(work.end, leave.end) - Math.max(work.start, leave.start)) / HOUR;
      return { ...row, publicHolidayHours: closed, netHours: row.scheduledHours - closed };
    });
  }
  function entitlement(row, hoursPerDay) {
    const hours = finite(row?.leaveHours), days = finite(row?.leaveDays);
    if (hours !== null) return hours >= 0 ? hours : null;
    return days !== null && days >= 0 ? days * hoursPerDay : null;
  }
  function blankAnnual(year, sourceWarnings = []) {
    return { year, status: "unavailable", scheduledHours: null, publicHolidayHours: null, entitlementHours: null,
      availableHours: null, availableDays: null, calendarBasisYear: null, entitlementBasisYear: null,
      estimateReason: null, daily: [], warnings: warnings(sourceWarnings) };
  }
  function annual(year, row, schedule, referenceYear, reference) {
    const result = blankAnnual(year, row?.warnings || []), daily = dailyWork(year, schedule);
    if (!row || !daily) {
      result.warnings.push(t("workCapacity.calendarUnavailable")); return result;
    }
    result.scheduledHours = sum(daily, "scheduledHours"); result.daily = daily;
    if (!["available", "missing", "unavailable"].includes(row.calendarStatus) ||
      !["available", "missing", "unavailable"].includes(row.entitlementStatus)) {
      result.warnings.push(t("workCapacity.statusUnknown")); return result;
    }
    if (row.calendarStatus === "unavailable" || row.entitlementStatus === "unavailable") {
      result.warnings.push(t("workCapacity.sourcesUnavailable")); return result;
    }
    if (row.calendarStatus === "missing" && year > referenceYear) {
      if (!reference || reference.status !== "available") {
        result.warnings.push(t("workCapacity.referenceUnavailable")); return result;
      }
      result.availableHours = reference.availableHours; result.availableDays = reference.availableDays;
      result.entitlementHours = reference.entitlementHours; result.status = "estimated";
      result.calendarBasisYear = referenceYear; result.entitlementBasisYear = referenceYear;
      result.estimateReason = "reference-year-calendar";
      result.warnings.push(t("workCapacity.futureCalendarBasis", { p0: referenceYear }));
      return result;
    }
    if (row.calendarStatus !== "available") {
      result.warnings.push(t("workCapacity.holidaysUnknown")); return result;
    }
    const closures = publicIntervals(row.publicClosures);
    if (closures === null) {
      result.warnings.push(t("workCapacity.invalidClosures")); return result;
    }
    result.daily = applyClosures(daily, closures); result.publicHolidayHours = sum(result.daily, "publicHolidayHours");
    result.calendarBasisYear = year;
    if (row.entitlementStatus === "available") {
      result.entitlementHours = entitlement(row, schedule.hoursPerDay); result.entitlementBasisYear = year;
    } else if (row.entitlementStatus === "missing" && year > referenceYear && reference?.status === "available") {
      result.entitlementHours = reference.entitlementHours; result.entitlementBasisYear = referenceYear;
      result.estimateReason = "reference-year-entitlement";
      result.warnings.push(t("workCapacity.futureRightsBasis", { p0: referenceYear }));
    }
    if (result.entitlementHours === null) {
      result.warnings.push(t("workCapacity.rightsUnavailable")); return result;
    }
    const available = result.scheduledHours - result.publicHolidayHours - result.entitlementHours;
    if (!Number.isFinite(available) || available < 0) {
      result.warnings.push(t("workCapacity.leaveExceedsHours")); return result;
    }
    result.availableHours = available; result.availableDays = available / schedule.hoursPerDay;
    result.status = result.estimateReason ? "estimated" : "available";
    if (schedule.basisYear !== null && year !== schedule.basisYear) {
      result.status = "estimated";
      if (!result.estimateReason) result.estimateReason = "current-work-schedule";
      result.warnings.push(t("workCapacity.scheduleBasisYears", { p0: schedule.basisYear, p1: year }));
    }
    return result;
  }
  function summarize(source, selection) {
    const scope = normalizeScope(selection), referenceYear = yearNumber(source?.referenceYear), schedule = scheduleData(source?.schedule);
    const rate = finite(source?.schedule?.workTimeRate);
    const output = { status: "unavailable", referenceYear, availableHours: null, availableDays: null, scheduledHours: null,
      publicHolidayHours: null, entitlementHours: null, workTimeRate: rate !== null && rate >= 0 ? rate : null,
      partialPeriod: false, years: [], warnings: warnings(source?.warnings || []) };
    if (source?.status !== "available" || !scope || referenceYear === null || !schedule || !Array.isArray(source.years)) {
      output.warnings.push(t("workCapacity.unavailable")); return output;
    }
    const years = new Map(), duplicateYears = new Set();
    for (const row of source.years) {
      const year = yearNumber(row?.year);
      if (year === null) continue;
      if (years.has(year)) duplicateYears.add(year); else years.set(year, row);
    }
    const reference = duplicateYears.has(referenceYear) ? null : annual(referenceYear, years.get(referenceYear), schedule, referenceYear, null);
    for (const year of scope.years) {
      const result = duplicateYears.has(year) ? blankAnnual(year, [t("workCapacity.conflictingYears")])
        : year === referenceYear && reference ? { ...reference, daily: [...reference.daily], warnings: [...reference.warnings] }
          : annual(year, years.get(year), schedule, referenceYear, reference);
      const startDate = scope.custom && scope.startDate > `${String(year).padStart(4, "0")}-01-01` ? scope.startDate : `${String(year).padStart(4, "0")}-01-01`;
      const endDate = scope.custom && scope.endDate < `${String(year).padStart(4, "0")}-12-31` ? scope.endDate : `${String(year).padStart(4, "0")}-12-31`;
      const daily = result.daily.filter(row => row.date >= startDate && row.date <= endDate);
      const scopedScheduled = result.scheduledHours === null ? null : sum(daily, "scheduledHours");
      const partial = startDate !== `${String(year).padStart(4, "0")}-01-01` || endDate !== `${String(year).padStart(4, "0")}-12-31`;
      const fraction = result.scheduledHours > 0 && scopedScheduled !== null ? scopedScheduled / result.scheduledHours
        : result.scheduledHours === 0 ? partial ? 0 : 1 : null;
      const scoped = { startDate, endDate, fraction, scheduledHours: scopedScheduled, publicHolidayHours: null,
        entitlementHours: null, availableHours: null, availableDays: null };
      output.partialPeriod ||= partial;
      if (result.status !== "unavailable" && fraction !== null) {
        scoped.entitlementHours = result.entitlementHours * fraction;
        if (result.estimateReason === "reference-year-calendar") scoped.availableHours = result.availableHours * fraction;
        else {
          scoped.publicHolidayHours = sum(daily, "publicHolidayHours");
          scoped.availableHours = scoped.scheduledHours - scoped.publicHolidayHours - scoped.entitlementHours;
        }
        if (scoped.availableHours < 0 || !Number.isFinite(scoped.availableHours)) {
          scoped.availableHours = null; result.status = "unavailable";
          result.warnings.push(t("workCapacity.partialLeaveExceedsHours"));
        } else {
          scoped.availableDays = scoped.availableHours / schedule.hoursPerDay;
          if (partial && result.entitlementHours > 0) {
            if (result.status === "available") result.status = "estimated";
            if (!result.estimateReason) result.estimateReason = "partial-period-entitlement";
            result.warnings.push(t("workCapacity.partialLeavePolicy"));
          }
        }
      }
      result.scope = scoped;
      result.daily = result.daily.map(({ date: day, scheduledHours, publicHolidayHours, netHours }) => ({ date: day, scheduledHours, publicHolidayHours, netHours }));
      result.warnings = warnings(result.warnings); output.years.push(result);
    }
    const scopedRows = output.years.map(row => row.scope);
    output.scheduledHours = sum(scopedRows, "scheduledHours"); output.publicHolidayHours = sum(scopedRows, "publicHolidayHours");
    output.entitlementHours = sum(scopedRows, "entitlementHours"); output.availableHours = sum(scopedRows, "availableHours");
    output.availableDays = sum(scopedRows, "availableDays");
    output.status = output.years.some(row => row.status === "unavailable") || output.availableHours === null ? "unavailable"
      : output.years.some(row => row.status === "estimated") ? "estimated" : "available";
    output.warnings = warnings([...output.warnings, ...output.years.flatMap(row => row.warnings)]);
    return output;
  }
  return { summarize, normalizeScope, weekType };
});
