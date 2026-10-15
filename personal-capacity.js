(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PersonalCapacity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const views = new WeakMap();
  const numberFormat = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 2 });
  const warningLabels = {
    CALENDRIER_ACTUEL_APPLIQUE_AUX_ANNEES: "Les horaires actuels sont appliqués aux années sélectionnées ; leurs changements passés ou futurs ne peuvent pas être confirmés.",
    CALENDRIER_PERSONNEL_INDISPONIBLE: "Le calendrier personnel de travail est indisponible.",
    CALENDRIER_COLLECTIF_INDISPONIBLE: "Les jours fériés et fermetures collectives ne sont pas accessibles.",
    DROITS_ANNUELS_INDISPONIBLES: "Les droits annuels de congés ne sont pas accessibles.",
    IDENTITE_CAPACITE_AMBIGUE: "Plusieurs fiches employé sont liées au compte ; la capacité annuelle ne peut pas être déterminée sans identifier la fiche active.",
    DROITS_ANNUELS_ACQUISITION_NON_PROJETEE: "Les droits de congés acquis progressivement ne peuvent pas être projetés pour l’année avec les données disponibles.",
    TYPE_ATTRIBUTION_INCONNU: "Le type d’attribution des droits de congés n’est pas confirmé ; la capacité annuelle ne peut pas être calculée.",
    CATEGORIES_NON_ANNUELLES_EXCLUES: "Les autres catégories de congé sont exclues des droits annuels payés.",
    CONGES_SANS_SOLDE_EXCLUS: null
  };
  let renderId = 0;

  function known(value, nonnegative = true) {
    return typeof value === "number" && Number.isFinite(value) && (!nonnegative || value >= 0) ? value : null;
  }

  function formatted(value, unit, nonnegative = true) {
    const amount = known(value, nonnegative);
    return amount === null ? "Indisponible" : `${numberFormat.format(amount)} ${unit}`;
  }

  function yearValue(value) {
    return Number.isInteger(value) && value > 0 && value <= 9999 ? String(value) : "Année non précisée";
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
    const heading = node("h2", "personal-capacity-heading", "Capacité de travail et planning");
    heading.id = `${id}-heading`;
    section.setAttribute("aria-labelledby", heading.id);
    const period = node("p", "personal-capacity-period");
    header.append(heading, period);
    const cards = node("div", "personal-capacity-cards");
    const metrics = {};
    for (const [key, label] of [["available", "Heures de travail disponibles"], ["planned", "Heures totales planifiées"],
      ["coverage", "Pourcentage des heures planifiées"]]) {
      const card = node("article", `personal-capacity-metric is-${key}`);
      const title = node("h3", "personal-capacity-metric-label", label);
      title.id = `${id}-${key}-label`;
      card.setAttribute("aria-labelledby", title.id);
      const value = node("strong", "personal-capacity-metric-value");
      value.setAttribute(`data-capacity-${key}`, "");
      const note = node("p", "personal-capacity-metric-note");
      card.append(title, value, note);
      cards.append(card);
      metrics[key] = { card, value, note };
    }
    const status = node("p", "personal-capacity-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    const warnings = node("ul", "personal-capacity-warnings");
    const details = node("details", "personal-capacity-details");
    const summary = node("summary", "personal-capacity-summary", "Voir le calcul par année");
    const years = node("div", "personal-capacity-years");
    details.append(summary, years);
    const policy = node("p", "personal-capacity-policy",
      "Calendrier personnel, jours fériés et fermetures collectives, moins les droits annuels de congés payés. Congés sans solde et reports d’années précédentes exclus ; demandes de congé non utilisées.");
    section.append(header, cards, status, warnings, details, policy);
    container.replaceChildren(section);
    return { node, section, period, metrics, status, warnings, details, years };
  }

  function annualDetails(view, rows, loading) {
    const nodes = [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const section = view.node("section", "personal-capacity-year");
      section.setAttribute("data-capacity-year", yearValue(row.year));
      const heading = view.node("h4", "personal-capacity-year-heading", yearValue(row.year));
      const estimated = row.status === "estimated";
      if (estimated) heading.append(view.node("span", "personal-capacity-estimate-badge", "Estimation"));
      const amounts = row.scope && typeof row.scope === "object" ? row.scope : row;
      const partial = known(amounts.fraction) !== null && amounts.fraction < 1;
      const list = view.node("dl", "personal-capacity-year-values");
      for (const [label, field, unit] of [
        ["Calendrier de travail", "scheduledHours", "h"],
        ["Jours fériés et fermetures collectives", "publicHolidayHours", "h"],
        [partial ? "Droits de congés payés (prorata)" : "Droits annuels de congés payés", "entitlementHours", "h"],
        ["Heures de travail disponibles", "availableHours", "h"],
        ["Jours de travail disponibles", "availableDays", "jours"]
      ]) {
        const term = view.node("dt", "", label);
        const capacityUnavailable = row.status === "unavailable" && ["availableHours", "availableDays"].includes(field);
        const value = view.node("dd", "", formatted(capacityUnavailable ? null : amounts[field], unit));
        list.append(term, value);
      }
      section.append(heading, list);
      if (partial) {
        section.append(view.node("p", "personal-capacity-year-note",
          `${numberFormat.format(amounts.fraction * 100)} % des heures du calendrier annuel sélectionnées. Année complète : ${formatted(row.availableHours, "h")} disponibles et ${formatted(row.entitlementHours, "h")} de droits de congés payés.`));
      }
      if (estimated) {
        const reason = row.estimateReason === "reference-year-calendar"
          ? `Calendrier non publié : capacité annuelle reprise de ${yearValue(row.calendarBasisYear)}.`
          : row.estimateReason === "reference-year-entitlement"
            ? `Droits de congés non attribués : droits annuels repris de ${yearValue(row.entitlementBasisYear)}.`
            : row.estimateReason === "partial-period-entitlement"
              ? "Estimation des congés sur la période sélectionnée par prorata des droits annuels ; demandes de congé non utilisées."
              : row.estimateReason === "current-work-schedule"
                ? "Horaires actuels appliqués à cette année ; les changements de régime de travail ne peuvent pas être confirmés."
              : "Estimation établie à partir des données annuelles disponibles.";
        section.append(view.node("p", "personal-capacity-year-note is-estimated", reason));
      } else if (row.status === "unavailable") {
        section.append(view.node("p", "personal-capacity-year-note", "Calendrier ou droits annuels insuffisants pour calculer la capacité de cette année."));
      }
      nodes.push(section);
    }
    const retainDisclosure = view.details.open === true || view.details.contains(view.section.ownerDocument.activeElement);
    if (nodes.length === 0 && retainDisclosure) nodes.push(view.node("p", "personal-capacity-year-note",
      loading ? "Détail du calcul en cours de chargement." : "Détail annuel indisponible avec les sources accessibles."));
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
      ? data.scopeLabel : "Période sélectionnée";
    view.metrics.available.value.textContent = loading ? "Chargement…" : formatted(available, "h");
    view.metrics.planned.value.textContent = formatted(planned, "h", false);
    view.metrics.available.card.className = `personal-capacity-metric is-available${status === "estimated" && available !== null ? " is-estimated" : ""}`;
    const notes = [];
    if (available !== null && known(data.availableDays) !== null) notes.push(formatted(data.availableDays, "jours de travail"));
    if (available !== null && known(data.workTimeRate) !== null && data.workTimeRate < 100) {
      notes.push(`Temps de travail : ${numberFormat.format(data.workTimeRate)} % (déjà intégré au calendrier)`);
    }
    view.metrics.available.note.textContent = loading ? "Lecture du calendrier personnel et des droits annuels…"
      : available === null ? "La capacité ne peut pas être établie avec les sources disponibles." : notes.join(" · ");
    view.metrics.planned.note.textContent = planned === null ? "Planning personnel indisponible."
      : "Toute la période sélectionnée, y compris le planning futur et les projets masqués.";
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
    view.metrics.coverage.value.textContent = coverageLabel === null ? "Indisponible"
      : `${coverageLabel} %`;
    view.metrics.coverage.note.textContent = coverageLabel === null
      ? "Le taux nécessite des heures disponibles supérieures à zéro et un planning connu."
      : lowCoverage
        ? "Il est normal de ne pas être planifié à 100% mais dans le cas présent le ratio semble faible. A vérifier avec votre Unit Manager."
        : highCoverage
          ? "Vous êtes planifié au-delà de 100%. A clarifier avec votre Unit Manager"
          : "Il est normal de ne pas être planifié à 100%. Cela tient compte des absences maladies notamment.";
    let description = "";
    if (loading) description = "Calcul de la capacité de travail en cours.";
    else if (failed || available === null) description = "Capacité de travail indisponible. Les heures planifiées restent affichées lorsqu’elles sont connues.";
    else if (status === "estimated") {
      const calendarYears = years.filter(row => row?.estimateReason === "reference-year-calendar").map(row => yearValue(row.year));
      const entitlementYears = years.filter(row => row?.estimateReason === "reference-year-entitlement").map(row => yearValue(row.year));
      if (calendarYears.length) description = `Calendrier non publié en ${calendarYears.join(", ")} : capacité annuelle estimée d’après ${yearValue(data.referenceYear)}.`;
      if (entitlementYears.length) description += `${description ? " " : ""}Droits de congés non attribués en ${entitlementYears.join(", ")} : estimation d’après les droits annuels de ${yearValue(data.referenceYear)}.`;
      if (!description && data.partialPeriod !== true) description = "Capacité estimée à partir des données annuelles disponibles.";
    }
    if (!loading && !failed && data.partialPeriod === true) {
      description += `${description ? " " : ""}Période partielle : droits annuels répartis au prorata des heures de calendrier sélectionnées.`;
    }
    view.status.textContent = description;
    view.status.hidden = !description;
    const warnings = !loading && !failed && Array.isArray(data.warnings)
      ? [...new Set(data.warnings.map(message => Object.hasOwn(warningLabels, message) ? warningLabels[message]
        : typeof message === "string" && !/^[A-Z_0-9]+$/.test(message) ? message : null)
        .filter(message => typeof message === "string" && message.trim()))] : [];
    view.warnings.replaceChildren(...warnings.map(message => view.node("li", "", message)));
    view.warnings.hidden = warnings.length === 0;
    annualDetails(view, years, loading);
    return view.section;
  }

  return { render };
});
