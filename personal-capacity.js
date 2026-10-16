(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./i18n-core-messages") : root.DashboardI18n);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PersonalCapacity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (I18n) {
  "use strict";
  const t = I18n.t;

  const views = new WeakMap();
  const numberFormat = { format: value => I18n.formatNumber(value, { maximumFractionDigits: 2 }) };
  const warningLabels = {
    CALENDRIER_ACTUEL_APPLIQUE_AUX_ANNEES: t("capacity.currentScheduleWarning"),
    CALENDRIER_PERSONNEL_INDISPONIBLE: t("capacity.personalCalendarUnavailable"),
    CALENDRIER_COLLECTIF_INDISPONIBLE: t("capacity.collectiveCalendarUnavailable"),
    DROITS_ANNUELS_INDISPONIBLES: t("capacity.annualRightsUnavailable"),
    IDENTITE_CAPACITE_AMBIGUE: t("capacity.ambiguousIdentity"),
    DROITS_ANNUELS_ACQUISITION_NON_PROJETEE: t("capacity.accrualUnavailable"),
    TYPE_ATTRIBUTION_INCONNU: t("capacity.allocationTypeUnknown"),
    CATEGORIES_NON_ANNUELLES_EXCLUES: t("capacity.otherLeaveExcluded"),
    CONGES_SANS_SOLDE_EXCLUS: null
  };
  let renderId = 0;

  function known(value, nonnegative = true) {
    return typeof value === "number" && Number.isFinite(value) && (!nonnegative || value >= 0) ? value : null;
  }

  function formatted(value, unit, nonnegative = true) {
    const amount = known(value, nonnegative);
    return amount === null ? t("common.unavailable") : `${numberFormat.format(amount)} ${unit}`;
  }

  function yearValue(value) {
    return Number.isInteger(value) && value > 0 && value <= 9999 ? String(value) : t("common.unspecifiedYear");
  }

  function makeView(container) {
    const document = container.ownerDocument;
    const node = (tag, className, text) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    };
    const id = `personal-capacity-${++renderId}`;
    const section = node("section", "personal-capacity");
    const header = node("div", "personal-capacity-header");
    const heading = node("h2", "personal-capacity-heading", t("capacity.heading"));
    heading.id = `${id}-heading`;
    section.setAttribute("aria-labelledby", heading.id);
    const period = node("p", "personal-capacity-period");
    header.append(heading, period);
    const cards = node("div", "personal-capacity-cards");
    const metrics = {};
    for (const [key, label] of [["available", t("capacity.availableHours")], ["planned", t("capacity.plannedHours")],
      ["coverage", t("capacity.coverage")]]) {
      const card = node("article", `personal-capacity-metric is-${key}`);
      const title = node("h3", "personal-capacity-metric-label", label);
      title.id = `${id}-${key}-label`;
      card.setAttribute("aria-labelledby", title.id);
      const value = node("strong", "personal-capacity-metric-value");
      value.setAttribute(`data-capacity-${key}`, "");
      const note = node("p", "personal-capacity-metric-note");
      card.append(title, value, note);
      cards.append(card);
      metrics[key] = { card, title, value, note };
    }
    const status = node("p", "personal-capacity-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    const warnings = node("ul", "personal-capacity-warnings");
    const details = node("details", "personal-capacity-details");
    const summary = node("summary", "personal-capacity-summary", t("capacity.details"));
    const years = node("div", "personal-capacity-years");
    details.append(summary, years);
    const policy = node("p", "personal-capacity-policy",
      t("capacity.policy"));
    section.append(header, cards, status, warnings, details, policy);
    container.replaceChildren(section);
    return { node, section, heading, summary, policy, period, metrics, status, warnings, details, years };
  }

  function annualDetails(view, rows, loading) {
    const nodes = [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const section = view.node("section", "personal-capacity-year");
      section.setAttribute("data-capacity-year", yearValue(row.year));
      const heading = view.node("h4", "personal-capacity-year-heading", yearValue(row.year));
      const estimated = row.status === "estimated";
      if (estimated) heading.append(view.node("span", "personal-capacity-estimate-badge", t("common.estimate")));
      const amounts = row.scope && typeof row.scope === "object" ? row.scope : row;
      const partial = known(amounts.fraction) !== null && amounts.fraction < 1;
      const list = view.node("dl", "personal-capacity-year-values");
      for (const [label, field, unit] of [
        [t("capacity.workCalendar"), "scheduledHours", "h"],
        [t("capacity.holidays"), "publicHolidayHours", "h"],
        [partial ? t("capacity.prorataRights") : t("capacity.annualRights"), "entitlementHours", "h"],
        [t("capacity.availableHours"), "availableHours", "h"],
        [t("capacity.availableDays"), "availableDays", t("common.dayUnit")]
      ]) {
        const term = view.node("dt", "", label);
        const capacityUnavailable = row.status === "unavailable" && ["availableHours", "availableDays"].includes(field);
        const value = view.node("dd", "", formatted(capacityUnavailable ? null : amounts[field], unit));
        list.append(term, value);
      }
      section.append(heading, list);
      if (partial) {
        section.append(view.node("p", "personal-capacity-year-note",
          t("capacity.partialYearDetails", { p0: numberFormat.format(amounts.fraction * 100), p1: formatted(row.availableHours, "h"), p2: formatted(row.entitlementHours, "h") })));
      }
      if (estimated) {
        const reason = row.estimateReason === "reference-year-calendar"
          ? t("capacity.unpublishedCalendarBasis", { p0: yearValue(row.calendarBasisYear) })
          : row.estimateReason === "reference-year-entitlement"
            ? t("capacity.unallocatedRightsBasis", { p0: yearValue(row.entitlementBasisYear) })
            : row.estimateReason === "partial-period-entitlement"
              ? t("capacity.partialRightsEstimate")
              : row.estimateReason === "current-work-schedule"
                ? t("capacity.currentScheduleEstimate")
              : t("capacity.annualEstimate");
        section.append(view.node("p", "personal-capacity-year-note is-estimated", reason));
      } else if (row.status === "unavailable") {
        section.append(view.node("p", "personal-capacity-year-note", t("capacity.insufficientAnnualSources")));
      }
      nodes.push(section);
    }
    const retainDisclosure = view.details.open === true || view.details.contains(view.section.ownerDocument.activeElement);
    if (nodes.length === 0 && retainDisclosure) nodes.push(view.node("p", "personal-capacity-year-note",
      loading ? t("capacity.detailsLoading") : t("capacity.detailsUnavailable")));
    view.years.replaceChildren(...nodes);
    view.details.hidden = nodes.length === 0;
  }

  function render(container, model, options = {}) {
    if (!container || !container.ownerDocument) return null;
    let view = views.get(container);
    if (!view || !container.contains(view.section)) {
      view = makeView(container);
      views.set(container, view);
    }
    // Keep the native disclosure/focus while changing every persistent label.
    view.heading.textContent = t("capacity.heading");
    view.summary.textContent = t("capacity.details");
    view.policy.textContent = t("capacity.policy");
    for (const [key, messageKey] of [["available", "capacity.availableHours"], ["planned", "capacity.plannedHours"], ["coverage", "capacity.coverage"]]) {
      view.metrics[key].title.textContent = t(messageKey);
    }
    const data = model && typeof model === "object" ? model : {};
    const loading = options.loading === true;
    const failed = Boolean(options.error);
    const years = !loading && !failed && Array.isArray(data.years) ? data.years.slice() : [];
    years.sort((a, b) => (Number.isInteger(a?.year) ? a.year : Infinity) - (Number.isInteger(b?.year) ? b.year : Infinity));
    const status = ["available", "estimated", "unavailable"].includes(data.status) ? data.status : "unavailable";
    const available = !loading && !failed && status !== "unavailable" ? known(data.availableHours) : null;
    const planned = known(data.plannedHours, false);
    view.section.setAttribute("aria-busy", loading ? "true" : "false");
    view.period.textContent = typeof data.scopeLabel === "string" && data.scopeLabel.trim()
      ? data.scopeLabel : t("common.selectedPeriod");
    view.metrics.available.value.textContent = loading ? t("common.loading") : formatted(available, "h");
    view.metrics.planned.value.textContent = formatted(planned, "h", false);
    view.metrics.available.card.className = `personal-capacity-metric is-available${status === "estimated" && available !== null ? " is-estimated" : ""}`;
    const notes = [];
    if (available !== null && known(data.availableDays) !== null) notes.push(formatted(data.availableDays, t("common.workingDayUnit")));
    if (available !== null && known(data.workTimeRate) !== null && data.workTimeRate < 100) {
      notes.push(t("capacity.workTimeRate", { p0: numberFormat.format(data.workTimeRate) }));
    }
    view.metrics.available.note.textContent = loading ? t("capacity.reading")
      : available === null ? t("capacity.cannotEstablish") : notes.join(" · ");
    view.metrics.planned.note.textContent = planned === null ? t("capacity.personalPlanningUnavailable")
      : t("capacity.fullPlanningScope");
    const coverage = available !== null && available > 0 && planned !== null
      ? known(planned / available * 100, false) : null;
    // Allow only floating-point roundoff near the threshold, not rounded display precision.
    const coverageTolerance = Number.EPSILON * Math.max(85, Math.abs(coverage ?? 0)) * 2;
    const lowCoverage = coverage !== null && coverage < 85 - coverageTolerance;
    const upperTolerance = Number.EPSILON * Math.max(100, Math.abs(coverage ?? 0)) * 2;
    const highCoverage = coverage !== null && coverage > 100 + upperTolerance;
    // Keep real threshold crossings explicit when two-decimal rounding would hide them.
    const coverageLabel = lowCoverage && Number(coverage.toFixed(2)) >= 85
      ? "< 85" : highCoverage && Number(coverage.toFixed(2)) <= 100
        ? "> 100" : coverage === null ? null : numberFormat.format(coverage);
    view.metrics.coverage.card.className = `personal-capacity-metric is-coverage personal-capacity-coverage${lowCoverage ? " is-low" : highCoverage ? " is-high" : ""}`;
    view.metrics.coverage.value.textContent = coverageLabel === null ? t("common.unavailable")
      : `${coverageLabel} %`;
    view.metrics.coverage.note.textContent = coverageLabel === null
      ? t("capacity.coverageUnavailable")
      : lowCoverage
        ? t("capacity.lowCoverage")
        : highCoverage
          ? t("capacity.highCoverage")
          : t("capacity.normalCoverage");
    let description = "";
    if (loading) description = t("capacity.calculating");
    else if (failed || available === null) description = t("capacity.unavailableKeepPlanning");
    else if (status === "estimated") {
      const calendarYears = years.filter(row => row?.estimateReason === "reference-year-calendar").map(row => yearValue(row.year));
      const entitlementYears = years.filter(row => row?.estimateReason === "reference-year-entitlement").map(row => yearValue(row.year));
      if (calendarYears.length) description = t("capacity.unpublishedCalendarYears", { p0: calendarYears.join(", "), p1: yearValue(data.referenceYear) });
      if (entitlementYears.length) description += t("capacity.unallocatedRightsYears", { p0: description ? " " : "", p1: entitlementYears.join(", "), p2: yearValue(data.referenceYear) });
      if (!description && data.partialPeriod !== true) description = t("capacity.estimated");
    }
    if (!loading && !failed && data.partialPeriod === true) {
      description += t("capacity.partialPeriodNote", { p0: description ? " " : "" });
    }
    view.status.textContent = description;
    view.status.hidden = !description;
    const warnings = !loading && !failed && Array.isArray(data.warnings)
      ? [...new Set(data.warnings.map(message => Object.hasOwn(warningLabels, message) ? warningLabels[message]
        : typeof message === "string" && !/^[A-Z_0-9]+$/.test(message) ? message : null)
        .filter(message => typeof message === "string" && message.trim()))] : [];
    view.warnings.replaceChildren(...warnings.map(message => view.node("li", "", I18n.message(message))));
    view.warnings.hidden = warnings.length === 0;
    annualDetails(view, years, loading);
    return view.section;
  }

  return { render };
});
