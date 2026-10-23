(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./i18n-core-messages") : root.DashboardI18n);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PersonalTime = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (I18n) {
  "use strict";
  const t = I18n.t;

  const TAU = Math.PI * 2;
  const MAX_YEARS = 150;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const PALETTE = ["#008bab", "#1c9c8c", "#6368ae", "#cd8747", "#b65c7b", "#488c62",
    "#5b88b4", "#8865a5", "#bc7057", "#86933f", "#448d8d", "#637d94"];
  const projectColors = new Map(), assignedColors = new Set();
  const recommendationViews = new WeakMap();
  let extraColorIndex = 0;
  const numberFormat = { format: value => I18n.formatNumber(value, { maximumFractionDigits: 1 }) };
  const percentFormat = { format: value => I18n.formatNumber(value, { style: "percent", maximumFractionDigits: 0 }) };
  const brusselsFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit"
  });
  const brusselsTimeFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  });
  let renderId = 0;

  function hours(value) {
    if (typeof value !== "number" && typeof value !== "string") return 0;
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function knownHours(value) {
    if ((typeof value !== "number" && typeof value !== "string") || typeof value === "string" && !value.trim()) return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  }

  function dateKey(value) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(value + "T00:00:00Z");
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
    }
    const date = instant(value);
    if (!date) return null;
    const parts = Object.fromEntries(brusselsFormat.formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function instant(value) {
    if (value == null || value === "" || value === false) return null;
    let text = value;
    if (typeof text === "string") {
      text = text.trim();
      // Odoo datetimes are UTC even when their serialized value has no suffix.
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text)) {
        text = text.replace(" ", "T") + "Z";
      }
    }
    const date = new Date(text);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function slotPeriod(slot) {
    const start = instant(slot && slot.start), end = instant(slot && slot.end);
    return start && end && end > start ? { start: start.getTime(), end: end.getTime() } : null;
  }

  function yearStart(year) {
    return new Date(`${String(year).padStart(4, "0")}-01-01T00:00:00Z`).getTime();
  }

  function validYear(value) {
    if (typeof value !== "number" && typeof value !== "string") return null;
    const year = Number(value);
    return Number.isInteger(year) && year >= 1 && year <= 9998 ? year : null;
  }

  function brusselsMidnight(day) {
    let result = day;
    // Resolve the requested local midnight without depending on the browser's
    // timezone. A second pass accounts for an offset change near the boundary.
    for (let pass = 0; pass < 3; pass++) {
      const parts = Object.fromEntries(brusselsTimeFormat.formatToParts(new Date(result))
        .map(part => [part.type, part.value]));
      const wall = Date.parse(`${parts.year.padStart(4, "0")}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
      const correction = day - wall;
      result += correction;
      if (!correction) break;
    }
    return result;
  }

  function normalizeScope(scope) {
    const isRange = scope && typeof scope === "object" &&
      (Object.prototype.hasOwnProperty.call(scope, "startDate") || Object.prototype.hasOwnProperty.call(scope, "endDate"));
    if (isRange) {
      const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        validYear(Number(value.slice(0, 4))) !== null && dateKey(value) === value;
      if (!validDate(scope.startDate) || !validDate(scope.endDate) || scope.startDate > scope.endDate) return null;
      const start = Date.parse(`${scope.startDate}T00:00:00Z`);
      const end = Date.parse(`${scope.endDate}T00:00:00Z`) + 864e5;
      return { kind: "range", years: [], startDate: scope.startDate, endDate: scope.endDate,
        periods: [{ start, end }], planningPeriods: [{ start: brusselsMidnight(start), end: brusselsMidnight(end) }] };
    }
    const years = Array.from(new Set(Array.from(scope || []).map(validYear)
      .filter(year => year !== null))).sort((a, b) => a - b).slice(0, MAX_YEARS);
    if (!years.length) return null;
    const periods = years.map(year => ({ start: yearStart(year), end: yearStart(year + 1) }));
    return { kind: "years", years, startDate: `${String(years[0]).padStart(4, "0")}-01-01`,
      endDate: `${String(years[years.length - 1]).padStart(4, "0")}-12-31`, periods,
      // Preserve the established UTC-year slot allocation contract.
      planningPeriods: periods.map(period => ({ ...period })) };
  }

  function availableYears(data) {
    const years = new Set();
    for (const line of data?.timesheets?.lines || []) {
      const key = dateKey(line.date);
      if (key) years.add(Number(key.slice(0, 4)));
    }
    for (const slot of data?.planning?.slots || []) {
      const period = slotPeriod(slot);
      if (!period) continue;
      const first = new Date(period.start).getUTCFullYear();
      const last = new Date(period.end - 1).getUTCFullYear();
      for (let year = Math.max(1, first); year <= last && year < first + MAX_YEARS; year++) {
        if (validYear(year)) years.add(year);
      }
    }
    return Array.from(years).filter(year => validYear(year)).sort((a, b) => a - b).slice(0, MAX_YEARS);
  }

  function calendarProgress(scope, now = new Date()) {
    const selected = normalizeScope(scope);
    const today = typeof now === "boolean" ? null : dateKey(now);
    if (!selected || !today) return null;
    // Treat Brussels calendar dates as UTC ordinals so DST does not change
    // the weight of a day. Unselected years contribute no elapsed time.
    const day = new Date(`${today}T00:00:00Z`).getTime();
    let totalDays = 0, elapsedDays = 0;
    for (const { start, end } of selected.periods) {
      totalDays += (end - start) / 864e5;
      elapsedDays += Math.max(0, Math.min(day, end) - start) / 864e5;
    }
    // Day-position anchors Jan 1 at the center and the final Dec 31 at the rim.
    const fraction = totalDays === 1 ? Number(day >= selected.periods[0].start)
      : Math.max(0, Math.min(1, elapsedDays / (totalDays - 1)));
    return { fraction, radiusRatio: Math.sqrt(fraction) };
  }

  function projectCalendarProgress(scope, startDate, endDate, now = new Date()) {
    const projectDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && !value.startsWith("0000") ? dateKey(value) : null;
    const first = projectDate(startDate), last = projectDate(endDate);
    const today = typeof now === "boolean" ? null : dateKey(now);
    if (!first || !last || first > last || !today) return null;
    const selected = normalizeScope(scope);
    if (!selected) return null;
    const projectStart = Date.parse(`${first}T00:00:00Z`);
    const projectEnd = Date.parse(`${last}T00:00:00Z`) + 864e5;
    const periods = selected.periods.map(period => ({
      start: Math.max(projectStart, period.start), end: Math.min(projectEnd, period.end)
    })).filter(period => period.end > period.start);
    if (!periods.length) return null;
    const day = Date.parse(`${today}T00:00:00Z`);
    let calendarDays = 0, elapsedDays = 0;
    for (const period of periods) {
      calendarDays += (period.end - period.start) / 864e5;
      elapsedDays += Math.max(0, Math.min(day, period.end) - period.start) / 864e5;
    }
    // Match the macro's first/last-day anchors, but exclude dates outside
    // this project's duration as well as unselected gaps. A one-day scope
    // reaches its endpoint on that day instead of dividing by zero.
    const fraction = calendarDays === 1 ? Number(day >= periods[0].start)
      : Math.max(0, Math.min(1, elapsedDays / (calendarDays - 1)));
    return { fraction, startDate: new Date(periods[0].start).toISOString().slice(0, 10),
      endDate: new Date(periods[periods.length - 1].end - 864e5).toISOString().slice(0, 10), calendarDays };
  }

  function compareProjects(a, b) {
    return Number(hours(b.planned) > 0) - Number(hours(a.planned) > 0) ||
      String(a.name || "").localeCompare(String(b.name || ""), "fr", { numeric: true }) ||
      String(a.id).localeCompare(String(b.id), "fr", { numeric: true });
  }

  function summarizeProjects(data, scope, now = new Date()) {
    const selected = normalizeScope(scope == null ? availableYears(data) : scope);
    if (!selected) return [];
    const today = dateKey(now);
    const knownPlanning = Boolean(data && data.planning && Array.isArray(data.planning.slots));
    const catalogue = new Map((data?.projects || []).filter(project => project && project.id != null)
      .map(project => [String(project.id), project]));
    const projects = new Map();
    const ensureProject = record => {
      const recordId = record.projectId == null || record.projectId === false ? "unassigned" : record.projectId;
      const key = String(recordId);
      if (!projects.has(key)) {
        const source = catalogue.get(key);
        projects.set(key, {
          id: source ? source.id : recordId,
          name: String(I18n.displayName(source) || record.project || (key === "unassigned" ? t("personal.noProject") : t("common.projectWithId", { p0: key }))),
          planned: knownPlanning ? 0 : null, actual: 0, involved: true
        });
      }
      return projects.get(key);
    };
    for (const line of data?.timesheets?.lines || []) {
      const key = dateKey(line.date);
      if (!key) continue;
      const day = Date.parse(`${key}T00:00:00Z`);
      if (!selected.periods.some(period => day >= period.start && day < period.end)) continue;
      const project = ensureProject(line);
      if (today && key <= today) project.actual += hours(line.hours);
    }
    if (knownPlanning) {
      for (const slot of data.planning.slots) {
        const period = slotPeriod(slot);
        if (!period) continue;
        let overlap = 0;
        for (const selectedPeriod of selected.planningPeriods) {
          overlap += Math.max(0, Math.min(period.end, selectedPeriod.end) - Math.max(period.start, selectedPeriod.start));
        }
        if (overlap > 0) ensureProject(slot).planned += hours(slot.hours) * overlap / (period.end - period.start);
      }
    }
    // A record alone does not imply scoped activity (zero-hour slots and
    // future-only actuals can both leave the displayed totals at zero).
    const result = Array.from(projects.values())
      .filter(project => hours(project.planned) !== 0 || project.actual !== 0);
    const labelKey = name => name.normalize("NFKC").trim().toLocaleLowerCase("fr");
    const labelCounts = new Map();
    result.forEach(project => labelCounts.set(labelKey(project.name), (labelCounts.get(labelKey(project.name)) || 0) + 1));
    result.forEach(project => {
      if (labelCounts.get(labelKey(project.name)) > 1) project.name = `${project.name} (ID ${project.id})`;
    });
    return result.sort(compareProjects);
  }

  function recommendationTitle(name) {
    const text = String(name || t("common.project")).trim();
    const tokens = Array.from(text.matchAll(/\[([^\[\]\r\n]+)\]/g));
    const short = tokens.find(token => token[1].trim() && !/^\d+$/.test(token[1].trim()));
    if (short) return short[1].trim();
    const number = tokens.find(token => /^\d{5,}$/.test(token[1].trim()));
    return (number ? text.replace(number[0], "") : text.replace(/^\d{5,}(?=\s|[·:|–—-]|\[|$)/, ""))
      .replace(/^\s*[·:|–—-]+\s*/, "").replace(/\s+/g, " ").trim() || t("common.project");
  }

  function recommendationPeriodLabel(selected) {
    if (!selected) return t("personal.selectedPeriodLower");
    if (selected.kind === "years") return selected.years.length === 1 ? String(selected.years[0])
      : t("personal.yearsAnd", { p0: selected.years.slice(0, -1).join(", "), p1: selected.years.at(-1) });
    const date = value => {
      const day = Number(value.slice(8, 10));
      const month = I18n.formatDate(new Date(`${value}T12:00:00Z`), { month: "long" });
      return `${day === 1 && I18n.language() === "fr" ? "1er" : day} ${month} ${Number(value.slice(0, 4))}`;
    };
    return t("personal.rangePeriod", { p0: date(selected.startDate), p1: date(selected.endDate) });
  }

  function recommendationYearPeriods(selected) {
    const result = [];
    for (const period of selected.periods) {
      let start = period.start;
      while (start < period.end) {
        if (result.length >= MAX_YEARS) return null;
        const end = Math.min(period.end, yearStart(new Date(start).getUTCFullYear() + 1));
        result.push({ start, end, planningStart: selected.kind === "range" ? brusselsMidnight(start) : start,
          planningEnd: selected.kind === "range" ? brusselsMidnight(end) : end });
        start = end;
      }
    }
    return result;
  }

  function futurePersonalPlanning(data, projectId, projectStart, projectEnd, day) {
    // /my-time supplies all accessible personal slots without a date filter.
    // An aggregate or a missing/failed source cannot establish their absence.
    const result = { status: "unavailable", hours: null };
    if (day < projectStart || day >= projectEnd) return { status: "not-applicable", hours: null };
    const planning = data?.planning;
    if (data?.ok === false || planning?.ok !== true || !Array.isArray(planning.slots) || data.planningError ||
      planning.complete === false || planning.partial === true || planning.truncated === true) return result;
    // Include all of today: even a today's-only allocation makes an immediate
    // instruction to stop entirely premature. This differs from the macro
    // remaining-consumption projection, which starts tomorrow.
    const start = brusselsMidnight(day), end = brusselsMidnight(projectEnd);
    let total = 0;
    for (const slot of planning.slots) {
      if (!slot || typeof slot !== "object") return result;
      const id = slot.projectId == null || slot.projectId === false ? "unassigned" : slot.projectId;
      if (String(id) !== String(projectId)) continue;
      const validDate = value => value instanceof Date ? Number.isFinite(value.getTime()) : typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}(?:$|[ T])/.test(value.trim()) && dateKey(value.trim().slice(0, 10)) !== null;
      const period = validDate(slot.start) && validDate(slot.end) ? slotPeriod(slot) : null;
      if (!period) return result;
      const overlap = Math.max(0, Math.min(period.end, end) - Math.max(period.start, start));
      if (!overlap) continue;
      const amount = knownHours(slot.hours);
      // Signed corrections cannot prove a remaining allowance of zero, even
      // when they cancel an allocation exactly. Preserve the original hours.
      if (amount === null || amount < 0) return result;
      total += amount * overlap / (period.end - period.start);
    }
    return Number.isFinite(total) ? { status: "available", hours: total } : result;
  }

  function buildRecommendations(projects, scope, options = {}) {
    const list = Array.isArray(projects) ? projects : [];
    const inputTolerance = knownHours(options.tolerancePercent);
    const tolerancePercent = inputTolerance === null ? 15 : Math.max(0, Math.min(100, inputTolerance));
    const selected = normalizeScope(scope == null ? availableYears(options.data) : scope);
    const now = options.now === undefined ? new Date() : options.now;
    const today = typeof now === "boolean" ? null : dateKey(now);
    const periods = selected ? recommendationYearPeriods(selected) : null;
    const model = { asOf: today, periodLabel: recommendationPeriodLabel(selected), tolerancePercent, rows: [], unavailable: [] };
    const catalogue = new Map((options.data?.projects || []).filter(project => project && project.id != null)
      .map(project => [String(project.id), project]));
    const omit = (project, reason) => model.unavailable.push({ id: project.id, name: String(project.name || t("common.project")), reason });
    const strictDay = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !value.startsWith("0000") ? dateKey(value) : null;
    const day = today ? Date.parse(`${today}T00:00:00Z`) : null;
    for (const project of list) {
      if (!project || project.id == null) continue;
      if (!today) { omit(project, t("personal.periodUnknown")); continue; }
      const planned = knownHours(project.planned), actual = knownHours(project.actual);
      if (planned === 0 && actual === 0) continue;
      const source = catalogue.get(String(project.id)) || project;
      const startDate = strictDay(source.startDate), endDate = strictDay(source.endDate);
      const coherentDates = !startDate || !endDate || startDate <= endDate;
      const start = startDate ? Date.parse(`${startDate}T00:00:00Z`) : null;
      const end = endDate ? Date.parse(`${endDate}T00:00:00Z`) + 864e5 : null;
      const futurePlanning = startDate && endDate && coherentDates ? futurePersonalPlanning(options.data, project.id, start, end, day)
        : { status: "unavailable", hours: null };
      const stopReasons = [];
      if (endDate && coherentDates && endDate <= today) stopReasons.push({ code: "expired", endDate });
      if (futurePlanning.status === "available" && futurePlanning.hours === 0) {
        stopReasons.push({ code: "noPersonalPlan", startDate: today, endDate });
      }
      const budget = source.personnelBudget;
      const conventionHours = knownHours(budget?.conventionHours), actualHours = knownHours(budget?.actualHours);
      if (options.data?.ok !== false && budget?.status === "available" && budget.actualStatus === "available" &&
        conventionHours !== null && conventionHours > 0 && actualHours !== null && actualHours >= conventionHours) {
        stopReasons.push({ code: "budgetConsumed", conventionHours, actualHours });
      }
      const stopTracking = stopReasons.length > 0;
      const base = { id: project.id, name: String(project.name || t("common.project")), shortName: recommendationTitle(project.name),
        planned, actual, projectEndDate: endDate, unplanned: planned === 0, stopTracking, stopReasons,
        futurePlanningStatus: futurePlanning.status, futurePlannedHours: futurePlanning.hours };
      const unavailable = reason => {
        if (!stopTracking) { omit(project, reason); return; }
        // A certain stop condition is useful even when the personal linear
        // comparison cannot be calculated. Never fabricate a signed gap.
        model.rows.push({ ...base, category: "stop", expected: null, variance: null, varianceRatio: null,
          remainingDays: null, weeklyHours: null, endDate: selected?.endDate || endDate,
          periodEnded: endDate !== null && endDate <= today, periodFuture: startDate !== null && startDate > today,
          paceUnavailableReason: reason });
      };
      if (!selected || !periods) { unavailable(t("personal.periodUnknown")); continue; }
      if (planned === null || planned < 0) { unavailable(planned < 0 ? t("personal.negativePlanning") : t("common.planningUnavailable")); continue; }
      if (actual === null || actual < 0) { unavailable(actual < 0 ? t("personal.negativeCorrections") : t("common.actualUnavailable")); continue; }
      if (!startDate || !endDate || !coherentDates) { unavailable(t("personal.invalidProjectDates")); continue; }
      let annual = periods.map(() => 0);
      if (Array.isArray(options.data?.planning?.slots)) {
        let invalid = false;
        for (const slot of options.data.planning.slots) {
          if (!slot) continue;
          const id = slot.projectId == null || slot.projectId === false ? "unassigned" : slot.projectId;
          if (String(id) !== String(project.id)) continue;
          const validSlotDate = value => value instanceof Date ? Number.isFinite(value.getTime()) : typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}(?:$|[ T])/.test(value.trim()) && strictDay(value.trim().slice(0, 10));
          const slotDates = validSlotDate(slot.start) && validSlotDate(slot.end) ? slotPeriod(slot) : null;
          if (!slotDates) { invalid = true; continue; }
          const amount = knownHours(slot.hours);
          periods.forEach((period, index) => {
            const overlap = Math.max(0, Math.min(slotDates.end, period.planningEnd) - Math.max(slotDates.start, period.planningStart));
            if (!overlap) return;
            if (amount === null) invalid = true;
            else annual[index] += amount * overlap / (slotDates.end - slotDates.start);
          });
        }
        if (invalid || annual.some(value => value < 0) ||
          Math.abs(annual.reduce((sum, value) => sum + value, 0) - planned) > Math.max(1e-8, Math.abs(planned) * 1e-9)) {
          unavailable(t("personal.annualPlanningUnreconciled")); continue;
        }
      } else if (periods.length === 1) annual = [planned];
      else { unavailable(t("personal.annualPlanningUnavailable")); continue; }
      let expected = 0, remainingDays = 0, planningOutsideProjectDates = false;
      const activePeriods = [];
      periods.forEach((period, index) => {
        const first = Math.max(period.start, start), last = Math.min(period.end, end);
        if (last <= first) { if (annual[index] !== 0) planningOutsideProjectDates = true; return; }
        activePeriods.push({ start: first, end: last });
        const elapsed = Math.max(0, Math.min(day + 864e5, last) - first);
        expected += annual[index] * elapsed / (last - first);
        remainingDays += Math.max(0, last - Math.max(day + 864e5, first)) / 864e5;
      });
      if (planningOutsideProjectDates) { unavailable(t("personal.planningOutsideDates")); continue; }
      if (!activePeriods.length) { unavailable(t("personal.projectOutsidePeriod")); continue; }
      const periodEnded = day >= activePeriods.at(-1).end - 864e5;
      const periodFuture = day < activePeriods[0].start;
      const activeToday = activePeriods.some(period => day >= period.start && day < period.end);
      if (!activeToday && !periodEnded && !(periodFuture && actual > 0)) {
        unavailable(periodFuture ? t("personal.projectNotStarted") : t("personal.periodNotActive")); continue;
      }
      const variance = actual - expected, limit = expected * tolerancePercent / 100;
      const category = stopTracking ? "stop" : variance > limit ? "slow" : variance < -limit ? "increase" : "continue";
      model.rows.push({ ...base, category, expected, variance, varianceRatio: expected > 0 ? variance / expected : null,
        remainingDays, weeklyHours: !stopTracking && activeToday && remainingDays > 0 ? Math.max(0, planned - actual) * 7 / remainingDays : null,
        endDate: new Date(activePeriods.at(-1).end - 864e5).toISOString().slice(0, 10), periodEnded, periodFuture });
    }
    const byName = (a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }) || String(a.id).localeCompare(String(b.id), "fr", { numeric: true });
    model.rows.sort(byName); model.unavailable.sort(byName);
    return model;
  }

  function renderRecommendations(container, model, options = {}) {
    if (!container) return null;
    const doc = container.ownerDocument || document;
    const node = (tag, className, text) => {
      const element = doc.createElement(tag); element.className = className;
      if (text != null) element.textContent = text;
      return element;
    };
    let view = recommendationViews.get(container);
    if (!view) {
      const id = `personal-time-recommendations-${++renderId}`;
      const section = node("section", "personal-time-recommendations"); section.setAttribute("aria-label", t("personal.recommendationsAria"));
      const heading = node("h3", "personal-time-recommendations-title"); section.append(heading);
      const grid = node("div", "personal-time-recommendations-grid");
      const unavailable = node("div", "personal-time-recommendation-unavailable");
      const unavailableMessage = node("p", "personal-time-recommendation-unavailable-message");
      const unavailableDetails = node("details", "personal-time-recommendation-unavailable-details");
      const reasonsSummary = node("summary", "", t("personal.showReasons"));
      unavailableDetails.append(reasonsSummary);
      const unavailableList = node("ul", "personal-time-recommendation-unavailable-list"); unavailableDetails.append(unavailableList);
      unavailable.append(unavailableMessage, unavailableDetails);
      const controls = node("div", "personal-time-recommendation-tolerance");
      const label = node("label", "personal-time-recommendation-tolerance-label", t("personal.tolerance")); label.setAttribute("for", `${id}-input`);
      const input = node("input", "personal-time-recommendation-slider"); input.type = "range"; input.min = "0"; input.max = "100"; input.step = "1";
      input.id = `${id}-input`; input.setAttribute("data-recommendation-tolerance", ""); input.setAttribute("aria-describedby", `${id}-helper`);
      const output = node("output", "personal-time-recommendation-tolerance-value"); output.setAttribute("for", input.id);
      const helper = node("p", "personal-time-recommendation-helper",
        t("personal.toleranceHelp"));
      helper.id = `${id}-helper`;
      const status = node("p", "personal-time-recommendation-status"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
      controls.append(label, input, output, helper); section.append(grid, unavailable, controls, status);
      view = { section, heading, grid, unavailable, unavailableMessage, unavailableList, input, output, status,
        reasonsSummary, label, helper, onToleranceChange: null };
      input.addEventListener("input", () => {
        const value = Math.max(0, Math.min(100, Number(input.value)));
        if (!Number.isFinite(value)) return;
        output.textContent = `${value} %`; input.setAttribute("aria-valuetext", t("personal.toleranceAria", { p0: value })); view.onToleranceChange?.(value);
      });
      recommendationViews.set(container, view);
    }
    view.section.setAttribute("aria-label", t("personal.recommendationsAria"));
    view.reasonsSummary.textContent = t("personal.showReasons");
    view.label.textContent = t("personal.tolerance");
    view.helper.textContent = t("personal.toleranceHelp");
    view.onToleranceChange = options.onToleranceChange;
    view.heading.textContent = t("personal.recommendationsTitle", { p0: model?.periodLabel || t("personal.selectedPeriodLower") });
    const rows = Array.isArray(model?.rows) ? model.rows : [], unavailable = Array.isArray(model?.unavailable) ? model.unavailable : [];
    const tolerance = knownHours(model?.tolerancePercent) ?? 15;
    view.input.value = String(Math.max(0, Math.min(100, tolerance))); view.output.textContent = `${view.input.value} %`;
    view.input.setAttribute("aria-valuetext", t("personal.toleranceAria", { p0: view.input.value }));
    const columns = [], counts = [];
    for (const [category, title] of [["stop", t("personal.stop")], ["slow", t("personal.slow")], ["increase", t("personal.increase")], ["continue", t("personal.continue")]]) {
      const column = node("section", `personal-time-recommendation-column is-${category}`);
      column.append(node("h3", "personal-time-recommendation-heading", title));
      const list = node("ul", "personal-time-recommendation-list"), entries = rows.filter(row => row.category === category);
      const gapSize = row => knownHours(row.variance) === null ? -1 : Math.abs(row.variance);
      if (category !== "continue") entries.sort((a, b) => gapSize(b) - gapSize(a) ||
        String(a.shortName || a.name || "").localeCompare(String(b.shortName || b.name || ""), "fr", { numeric: true }) ||
        String(a.id).localeCompare(String(b.id), "fr", { numeric: true }));
      counts.push(`${title} : ${entries.length}`);
      for (const row of entries) {
        const item = node("li", `personal-time-recommendation${row.stopTracking ? " is-stop" : ""}`); item.setAttribute("data-recommendation-id", String(row.id));
        item.title = t("personal.recommendationTooltip", { p0: row.name, p1: formatHours(row.expected), p2: formatHours(row.actual), p3: row.endDate });
        const variance = `${row.variance > 0 ? "+" : row.variance < 0 ? "−" : ""}${formatHours(Math.abs(row.variance))}`;
        const deadline = /^\d{4}-\d{2}-\d{2}$/.test(row.endDate || "") ? `${row.endDate.slice(8, 10)}/${row.endDate.slice(5, 7)}/${row.endDate.slice(0, 4)}` : t("common.dateUnavailable");
        const rate = row.weeklyHours == null ? row.periodFuture ? t("personal.noPaceBeforeStart") : t("personal.periodEndedDate", { p0: deadline }) :
          t("personal.weeklyPace", { p0: category === "slow" ? t("personal.maximum") : t("personal.target"), p1: numberFormat.format(row.weeklyHours), p2: deadline });
        item.append(node("strong", "personal-time-recommendation-name", row.shortName));
        if (category === "stop") {
          const difference = row.variance > 0 ? t("personal.aboveThe") : row.variance < 0 ? t("personal.belowThe") : t("personal.differenceWithThe");
          const details = [item.title, knownHours(row.variance) === null
            ? t("personal.paceGapUnknown") : t("personal.paceDifference", { p0: variance, p1: difference })];
          const dateLabel = value => /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : t("common.dateUnavailable");
          const labels = [];
          for (const reason of row.stopReasons || []) {
            if (reason.code === "expired") {
              labels.push(t("personal.projectEnded")); details.push(t("personal.endedDate", { p0: dateLabel(reason.endDate) }));
            } else if (reason.code === "budgetConsumed") {
              labels.push(t("personal.bwBudgetConsumed"));
              details.push(t("personal.budgetConsumedDetail", { p0: formatHours(reason.actualHours), p1: formatHours(reason.conventionHours) }));
            } else if (reason.code === "noPersonalPlan") {
              labels.push(t("personal.notPlanned"));
              details.push(t("personal.noFuturePlanDetail", { p0: dateLabel(reason.startDate), p1: dateLabel(reason.endDate) }));
            }
          }
          item.append(node("span", "personal-time-recommendation-stop", ` — ${labels.join(" · ") || t("personal.reasonUnknown")}`));
          if (row.paceUnavailableReason) details.push(I18n.message(row.paceUnavailableReason));
          item.title = details.join("\n"); item.setAttribute("aria-description", item.title);
        } else if (category !== "continue") item.append(node("span", "personal-time-recommendation-values",
          t("personal.recommendationGap", { p0: variance, p1: category === "slow" ? t("personal.above") : t("personal.below"), p2: rate })));
        if (category !== "continue" && category !== "stop" && (row.unplanned || knownHours(row.expected) === 0 && row.varianceRatio === null && row.actual > 0)) {
          item.append(node("span", "personal-time-recommendation-note", row.unplanned ? t("common.outsidePlanning") : t("personal.noExpectedYet")));
        }
        list.append(item);
      }
      if (!entries.length) list.append(node("li", "personal-time-recommendation-empty", t("personal.noProjects")));
      column.append(list); columns.push(column);
    }
    view.grid.replaceChildren(...columns);
    view.unavailable.hidden = !unavailable.length;
    view.unavailableMessage.textContent = unavailable.length ? t(unavailable.length === 1 ? "personal.noNumericAdviceOne" : "personal.noNumericAdviceMany", { count: unavailable.length }) : "";
    view.unavailableList.replaceChildren(...unavailable.map(row => node("li", "", `${row.name} : ${I18n.message(row.reason)}`)));
    view.status.textContent = `${counts.join(". ")}.`;
    if (!container.contains(view.section)) container.replaceChildren(view.section);
    return view.section;
  }

  function hiddenKeys(hiddenIds) {
    return new Set(Array.from(hiddenIds || []).map(String));
  }

  function buildSectors(projects, hiddenIds = new Set()) {
    const hidden = hiddenKeys(hiddenIds);
    const visible = (projects || []).filter(project => !hidden.has(String(project.id)) && hours(project.planned) > 0);
    const total = visible.reduce((sum, project) => sum + hours(project.planned), 0);
    let angle = -Math.PI / 2;
    return visible.map((project, index) => {
      const startAngle = angle;
      angle = index === visible.length - 1 ? -Math.PI / 2 + TAU : angle + hours(project.planned) / total * TAU;
      const actual = hours(project.actual), planned = hours(project.planned);
      const fillRatio = Math.min(1, Math.max(0, actual / planned));
      return { ...project, startAngle, endAngle: angle, fillRatio,
        fillRadiusRatio: Math.sqrt(fillRatio), overrun: Math.max(0, actual - planned) };
    });
  }

  function colorFor(id) {
    const key = String(id);
    if (projectColors.has(key)) return projectColors.get(key);
    let hash = 0;
    for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    let color = null;
    for (let offset = 0; offset < PALETTE.length; offset++) {
      const candidate = PALETTE[(hash + offset) % PALETTE.length];
      if (!assignedColors.has(candidate)) { color = candidate; break; }
    }
    while (!color) {
      const index = extraColorIndex++;
      const hue = ((23 + index * 137.50776405) % 360) / 60;
      const saturation = 0.55 + Math.floor(index / 24) % 3 * 0.06;
      const lightness = 0.42 + Math.floor(index / 72) % 3 * 0.05;
      const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
      const secondary = chroma * (1 - Math.abs(hue % 2 - 1));
      const channels = hue < 1 ? [chroma, secondary, 0] : hue < 2 ? [secondary, chroma, 0] :
        hue < 3 ? [0, chroma, secondary] : hue < 4 ? [0, secondary, chroma] :
          hue < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];
      const candidate = "#" + channels.map(channel => Math.round((channel + lightness - chroma / 2) * 255)
        .toString(16).padStart(2, "0")).join("");
      if (!assignedColors.has(candidate)) color = candidate;
    }
    assignedColors.add(color);
    projectColors.set(key, color);
    return color;
  }

  function tint(color, white) {
    const channels = color.slice(1).match(/../g).map(channel => parseInt(channel, 16));
    return `rgb(${channels.map(channel => Math.round(channel + (255 - channel) * white)).join(",")})`;
  }

  function formatHours(value) {
    return value == null ? t("common.unavailable") : `${numberFormat.format(hours(value))} h`;
  }

  function sectorPath(radius, start, end) {
    const cx = 230, cy = 230;
    const point = angle => [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    const from = point(start), to = point(end);
    if (end - start >= TAU - 1e-9) {
      const halfway = point(start + Math.PI);
      return `M ${cx} ${cy} L ${from.join(" ")} A ${radius} ${radius} 0 1 1 ${halfway.join(" ")} A ${radius} ${radius} 0 1 1 ${from.join(" ")} Z`;
    }
    return `M ${cx} ${cy} L ${from.join(" ")} A ${radius} ${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${to.join(" ")} Z`;
  }

  function render(container, projects, options = {}) {
    if (!container) return null;
    const doc = container.ownerDocument || document;
    const hidden = hiddenKeys(options.hiddenIds);
    const list = (Array.isArray(projects) ? [...projects] : []).sort(compareProjects);
    const visible = list.filter(project => !hidden.has(String(project.id)));
    const sectors = buildSectors(list, hidden);
    const selectedScope = normalizeScope(options.scope === undefined ? options.years : options.scope);
    const calendar = calendarProgress(options.scope === undefined ? options.years : options.scope, options.now);
    const id = `personal-time-${++renderId}`;
    const node = (tag, className, text) => {
      const result = doc.createElement(tag);
      if (className) result.className = className;
      if (text != null) result.textContent = text;
      return result;
    };
    const svgNode = (tag, attributes = {}) => {
      const result = doc.createElementNS(SVG_NS, tag);
      Object.entries(attributes).forEach(([name, value]) => result.setAttribute(name, String(value)));
      return result;
    };
    const card = node("article", `personal-time-card${options.embedded ? " personal-time-embedded" : ""}`);
    const heading = node("div", "personal-time-heading");
    const headingText = node("div", "personal-time-heading-text");
    headingText.append(node("p", "personal-time-eyebrow", t("common.myTime")),
      node("h2", "personal-time-title", options.title || t("common.overview")),
      node("p", "personal-time-description", t("personal.pieDescription")));
    heading.append(headingText);
    if (options.scopeLabel) heading.append(node("span", "personal-time-period", options.scopeLabel));
    if (!options.embedded) card.append(heading);
    else if (options.scopeLabel) card.append(node("span", "personal-time-period personal-time-embedded-period", options.scopeLabel));

    const metrics = node("div", "personal-time-metrics");
    const known = visible.filter(project => project.planned != null);
    const planned = known.reduce((sum, project) => sum + hours(project.planned), 0);
    const actual = visible.reduce((sum, project) => sum + hours(project.actual), 0);
    for (const [kind, label, value, detail] of [
      ["planned", t("personal.plannedInPeriod"), visible.length && !known.length ? null : planned, known.length < visible.length ? t("personal.partialPlanning") : t("personal.displayedProjects")],
      ["actual", t("common.actualToDate"), actual, t("personal.correctionsIncluded")]
    ]) {
      const metric = node("div", "personal-time-metric");
      metric.setAttribute("data-personal-metric", kind);
      metric.append(node("span", "personal-time-metric-label", label), node("strong", "personal-time-metric-value", formatHours(value)),
        node("span", "personal-time-metric-note", detail));
      metrics.append(metric);
    }
    card.append(metrics);

    const body = node("div", "personal-time-body");
    const chartArea = node("div", "personal-time-chart-area");
    const legendArea = node("div", "personal-time-legend-area");
    const legendHeading = node("div", "personal-time-legend-heading");
    legendHeading.append(node("h3", "personal-time-legend-title", t("common.myProjects")),
      node("span", "personal-time-project-count", t("personal.visibleProjectCount", { p0: visible.length, p1: list.length })));
    legendArea.append(legendHeading, node("p", "personal-time-legend-help", t("personal.legendHelp")));
    body.append(chartArea, legendArea);
    card.append(body);

    const tooltip = node("div", "personal-time-tooltip");
    tooltip.id = `${id}-tooltip`;
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    card.append(tooltip);
    const sectorElements = new Map(), legendButtons = new Map();
    let activeElement = null, activeProjectId = null, pinnedId = null;
    function highlightProject(projectId) {
      if (activeProjectId !== null) {
        sectorElements.get(activeProjectId)?.classList.remove("is-active");
        legendButtons.get(activeProjectId)?.classList.remove("is-active");
      }
      activeProjectId = projectId;
      if (activeProjectId !== null) {
        sectorElements.get(activeProjectId)?.classList.add("is-active");
        legendButtons.get(activeProjectId)?.classList.add("is-active");
      }
    }
    function hideTooltip(force = false) {
      if (!force && pinnedId !== null) return;
      if (activeElement) activeElement.classList.remove("is-active");
      highlightProject(null);
      activeElement = null;
      pinnedId = null;
      tooltip.hidden = true;
    }
    function showTooltip(project, element, event) {
      if (pinnedId !== null && pinnedId !== String(project.id)) pinnedId = null;
      if (activeElement && activeElement !== element) activeElement.classList.remove("is-active");
      activeElement = element;
      highlightProject(String(project.id));
      element.classList.add("is-active");
      tooltip.replaceChildren(node("strong", "personal-time-tooltip-title", project.name));
      for (const [label, value] of [[t("personal.plannedInPeriod"), project.planned], [t("common.actualToDate"), project.actual]]) {
        const row = node("div", "personal-time-tooltip-row");
        row.append(node("span", "", label), node("strong", "", formatHours(value)));
        tooltip.append(row);
      }
      if (project.planned != null && hours(project.actual) > Math.max(0, hours(project.planned))) {
        tooltip.append(node("p", "personal-time-tooltip-overrun", t("personal.abovePlanBadge", { p0: formatHours(hours(project.actual) - Math.max(0, hours(project.planned))) })));
      } else if (hours(project.actual) < 0) {
        tooltip.append(node("p", "personal-time-tooltip-note", t("personal.negativeActual")));
      }
      tooltip.hidden = false;
      const bounds = card.getBoundingClientRect();
      const anchor = element.getBoundingClientRect();
      const own = tooltip.getBoundingClientRect();
      const x = Number.isFinite(event?.clientX) ? event.clientX - bounds.left : anchor.left - bounds.left + anchor.width / 2;
      const y = Number.isFinite(event?.clientY) ? event.clientY - bounds.top : anchor.top - bounds.top + anchor.height / 2;
      tooltip.style.left = `${Math.max(8, Math.min(x + 16, bounds.width - own.width - 8))}px`;
      tooltip.style.top = `${Math.max(8, y + own.height + 26 > bounds.height ? y - own.height - 14 : y + 18)}px`;
    }
    function attachTooltip(element, project, chartSector = false) {
      element.setAttribute("aria-describedby", tooltip.id);
      element.addEventListener("pointerenter", event => showTooltip(project, element, event));
      element.addEventListener("pointermove", event => { if (!tooltip.hidden) showTooltip(project, element, event); });
      element.addEventListener("pointerleave", () => hideTooltip());
      element.addEventListener("focus", () => showTooltip(project, element));
      element.addEventListener("blur", () => hideTooltip(true));
      if (chartSector) {
        const toggleTooltip = event => {
          if (pinnedId === String(project.id)) hideTooltip(true);
          else { pinnedId = String(project.id); showTooltip(project, element, event); }
        };
        element.addEventListener("click", toggleTooltip);
        element.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleTooltip(event); }
        });
      }
    }
    card.addEventListener("keydown", event => { if (event.key === "Escape") hideTooltip(true); });
    card.addEventListener("click", event => {
      if (!event.target?.closest?.("[data-personal-sector]")) hideTooltip(true);
    });

    if (sectors.length) {
      const svg = svgNode("svg", { viewBox: "0 0 460 460", class: "personal-time-chart", role: "group",
        "aria-label": t("personal.pieAria") });
      const defs = svgNode("defs");
      svg.append(defs);
      sectors.forEach((sector, index) => {
        const color = colorFor(sector.id), radius = 190 * sector.fillRadiusRatio;
        const group = svgNode("g", { class: "personal-time-sector", tabindex: "0", role: "button",
          "data-personal-sector": sector.id,
          "aria-label": t("personal.sectorAria", { p0: sector.name, p1: formatHours(sector.planned), p2: formatHours(sector.actual) }) });
        sectorElements.set(String(sector.id), group);
        group.append(svgNode("path", { d: sectorPath(190, sector.startAngle, sector.endAngle),
          fill: tint(color, 0.89), stroke: "#ffffff", "stroke-width": "2", "aria-hidden": "true" }));
        if (radius > 0) {
          const gradientId = `${id}-gradient-${index}`;
          const gradient = svgNode("radialGradient", { id: gradientId, gradientUnits: "userSpaceOnUse", cx: "230", cy: "230", r: radius });
          const bands = [0.79, 0.62, 0.44, 0.23, 0];
          bands.forEach((white, band) => {
            gradient.append(svgNode("stop", { offset: `${band * 20}%`, "stop-color": tint(color, white) }),
              svgNode("stop", { offset: `${(band + 1) * 20}%`, "stop-color": tint(color, white) }));
          });
          defs.append(gradient);
          group.append(svgNode("path", { d: sectorPath(radius, sector.startAngle, sector.endAngle),
            fill: `url(#${gradientId})`, stroke: "#ffffff", "stroke-width": "1.5", "aria-hidden": "true" }));
        }
        attachTooltip(group, sector, true);
        svg.append(group);
      });
      if (calendar) {
        const radius = 190 * calendar.radiusRatio;
        const reference = svgNode("g", { class: "personal-time-calendar-reference", role: "img",
          "aria-label": t("personal.calendarAria", { p0: percentFormat.format(calendar.fraction) }) });
        reference.append(svgNode("circle", { cx: 230, cy: 230, r: radius,
          class: "personal-time-calendar-halo", "aria-hidden": "true" }),
        svgNode("circle", { cx: 230, cy: 230, r: radius, class: "personal-time-calendar-ring",
          "data-calendar-fraction": calendar.fraction, "aria-hidden": "true" }));
        if (radius === 0) reference.append(svgNode("circle", { cx: 230, cy: 230, r: 3,
          class: "personal-time-calendar-origin", "aria-hidden": "true" }));
        svg.append(reference);
      }
      chartArea.append(svg);
      const key = node("div", "personal-time-chart-key");
      for (const [className, label] of [["is-planned", t("common.planned")], ["is-actual", t("common.actualToDate")]]) {
        const item = node("span", "personal-time-key-item");
        item.append(node("span", `personal-time-key-swatch ${className}`), node("span", "", label));
        key.append(item);
      }
      if (calendar) {
        const item = node("span", "personal-time-key-item");
        item.append(node("span", "personal-time-key-swatch is-today"),
          node("span", "", t("personal.todayMarker", { p0: percentFormat.format(calendar.fraction) })));
        key.append(item);
      }
      chartArea.append(key, node("p", "personal-time-chart-note", t("personal.pieAreaNote") +
        (calendar ? t("personal.calendarNote") : "")));
    } else {
      const allHidden = list.length > 0 && !visible.length;
      const unknown = visible.some(project => project.planned == null);
      const empty = node("div", "personal-time-chart-empty");
      empty.append(node("span", "personal-time-empty-symbol", "◌"),
        node("strong", "", allHidden ? t("personal.allHidden") : !list.length ? t("personal.noHoursPeriod") : unknown ? t("common.planningUnavailable") : t("personal.noPlannedHours")),
        node("p", "", allHidden ? t("personal.showProjectHelp") : !list.length ? t("personal.changePeriodHelp") : t("personal.noPiePlanning")));
      if (allHidden) {
        const restore = node("button", "personal-time-restore", t("personal.showAll"));
        restore.type = "button";
        restore.addEventListener("click", () => {
          if (options.onShowAll) options.onShowAll();
          else render(container, list, { ...options, hiddenIds: new Set() });
        });
        empty.append(restore);
      }
      chartArea.append(empty);
    }

    const legendItem = project => {
      const shown = !hidden.has(String(project.id));
      const item = node("li", "personal-time-legend-item");
      const button = node("button", `personal-time-legend-button${shown ? "" : " is-hidden"}`);
      button.type = "button";
      button.setAttribute("aria-pressed", String(shown));
      button.setAttribute("data-personal-id", String(project.id));
      legendButtons.set(String(project.id), button);
      button.setAttribute("aria-label", t("personal.legendAria", { p0: shown ? t("common.hide") : t("common.show"), p1: project.name, p2: formatHours(project.planned), p3: formatHours(project.actual) }));
      const dot = node("span", "personal-time-legend-dot");
      dot.style.backgroundColor = colorFor(project.id);
      dot.setAttribute("aria-hidden", "true");
      const text = node("span", "personal-time-legend-text");
      text.append(node("span", "personal-time-legend-name", project.name),
        node("span", "personal-time-legend-values", t("personal.legendValues", { p0: formatHours(project.actual), p1: formatHours(project.planned) })));
      const planned = knownHours(project.planned), actual = knownHours(project.actual);
      if (project.planned == null) text.append(node("span", "personal-time-legend-badge is-unknown", t("common.planningUnavailable")));
      else if (hours(project.planned) <= 0 && hours(project.actual) > 0) text.append(node("span", "personal-time-legend-badge is-overrun", t("personal.noPlanBadge")));
      else if (hours(project.actual) > hours(project.planned)) text.append(node("span", "personal-time-legend-badge is-overrun", t("personal.abovePlanBadge", { p0: formatHours(hours(project.actual) - hours(project.planned)) })));
      else if (planned > 0 && actual !== null && actual < planned) {
        const endDate = selectedScope?.endDate;
        const deadline = endDate ? `${endDate.slice(8, 10)}/${endDate.slice(5, 7)}/${endDate.slice(0, 4)}` : null;
        text.append(node("span", "personal-time-legend-badge is-below", t("personal.remainingHours", { p0: formatHours(planned - actual), p1: deadline
          ? t("personal.deadlineSuffix", { p0: deadline }) : t("personal.remainingNoDate") })));
      }
      if (hours(project.actual) < 0) text.append(node("span", "personal-time-legend-badge is-credit", t("personal.netCorrection")));
      const visibility = node("span", "personal-time-legend-visibility", shown ? "✓" : "+");
      visibility.setAttribute("aria-hidden", "true");
      button.append(dot, text, visibility);
      attachTooltip(button, project);
      button.addEventListener("click", () => {
        hideTooltip(true);
        if (options.onToggle) options.onToggle(project.id);
        else {
          const nextHidden = new Set(hidden);
          if (shown) nextHidden.add(String(project.id)); else nextHidden.delete(String(project.id));
          render(container, list, { ...options, hiddenIds: nextHidden });
        }
      });
      item.append(button);
      return item;
    };
    const plannedProjects = list.filter(project => hours(project.planned) > 0);
    const unknownProjects = list.filter(project => project.planned == null);
    const correctedProjects = list.filter(project => project.planned != null && hours(project.planned) <= 0 && hours(project.actual) === 0);
    const unplannedProjects = list.filter(project => project.planned != null && hours(project.planned) <= 0 && hours(project.actual) !== 0);
    const groups = [
      { key: "planned", label: t("personal.projectsWithPlan"), projects: plannedProjects },
      { key: "unknown", label: t("common.planningUnavailable"), projects: unknownProjects },
      { key: "corrections", label: correctedProjects.every(project => hours(project.planned) < 0) ? t("personal.planCorrections") : t("personal.noPlannedHours"), projects: correctedProjects },
      { key: "unplanned", label: t("common.outsidePlanning"), projects: unplannedProjects }
    ];
    groups.forEach(group => {
      if (!group.projects.length) return;
      const section = node("section", `personal-time-legend-group is-${group.key}`);
      section.setAttribute("data-personal-group", group.key);
      const legend = node("ul", "personal-time-legend");
      if (group.key === "planned") legend.setAttribute("aria-label", group.label);
      else {
        section.append(node("hr", "personal-time-legend-divider"));
        const groupHeading = node("div", "personal-time-group-heading");
        const title = node("h4", "personal-time-group-title", group.label);
        title.id = `${id}-legend-${group.key}`;
        groupHeading.append(title);
        section.setAttribute("aria-labelledby", title.id);
        legend.setAttribute("aria-labelledby", title.id);
        if (group.key === "unplanned") {
          const subtotal = group.projects.filter(project => !hidden.has(String(project.id)))
            .reduce((sum, project) => sum + hours(project.actual), 0);
          const total = node("div", "personal-time-group-total");
          total.setAttribute("data-personal-actual-subtotal", String(subtotal));
          total.setAttribute("aria-label", t("personal.unplannedSubtotal", { p0: formatHours(subtotal) }));
          total.append(node("strong", "", formatHours(subtotal)), node("span", "", t("personal.actualDisplayed")));
          groupHeading.append(total);
        }
        section.append(groupHeading);
      }
      group.projects.forEach(project => legend.append(legendItem(project)));
      section.append(legend);
      legendArea.append(section);
    });
    if (!list.length) legendArea.append(node("p", "personal-time-legend-empty", t("personal.noInvolvedProjects")));

    const focusedId = container.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-personal-id") : null;
    container.replaceChildren(card);
    if (focusedId !== null) {
      const buttons = legendArea.querySelectorAll("[data-personal-id]");
      Array.from(buttons).find(button => button.getAttribute("data-personal-id") === focusedId)?.focus({ preventScroll: true });
    }
    return card;
  }

  return { availableYears, normalizeScope, calendarProgress, projectCalendarProgress, summarizeProjects, buildRecommendations, renderRecommendations, buildSectors, render };
});
