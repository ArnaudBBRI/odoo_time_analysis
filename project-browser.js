(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./project-card") : root.ProjectCard);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProjectBrowser = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (ProjectCard) {
  "use strict";

  const numberFormat = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 2 });
  const exactNumberFormat = new Intl.NumberFormat("fr-BE", { maximumSignificantDigits: 17 });
  const percentFormat = new Intl.NumberFormat("fr-BE", { style: "percent", maximumFractionDigits: 0 });
  let renderId = 0;
  const employeeColors = new Map(), assignedEmployeeColors = new Set();
  const employeePalette = ["#008bab", "#1c9c8c", "#6368ae", "#cd8747", "#b65c7b", "#488c62", "#5b88b4", "#8865a5", "#bc7057", "#86933f", "#448d8d", "#637d94"];
  let extraEmployeeColor = 0;
  const monthlyLifecycles = new WeakMap(), budgetLifecycles = new WeakMap(), revealedMonthlyProjects = new Map();
  const timelineLifecycles = new WeakMap();

  function employeeColor(id) {
    const key = String(id);
    if (employeeColors.has(key)) return employeeColors.get(key);
    let hash = 0;
    for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    let color = null;
    for (let offset = 0; offset < employeePalette.length; offset++) {
      const candidate = employeePalette[(hash + offset) % employeePalette.length];
      if (!assignedEmployeeColors.has(candidate)) { color = candidate; break; }
    }
    while (!color) {
      const candidate = `hsl(${(extraEmployeeColor++ * 137.508 % 360).toFixed(3)} 55% 43%)`;
      if (!assignedEmployeeColors.has(candidate)) color = candidate;
    }
    employeeColors.set(key, color);
    assignedEmployeeColors.add(color);
    return color;
  }

  function numeric(value) {
    if ((typeof value !== "number" && typeof value !== "string") || typeof value === "string" && !value.trim()) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatHours(value) {
    const number = numeric(value);
    return number === null ? "Indisponible" : `${numberFormat.format(number)} h`;
  }

  function projectDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
    return { value, label: `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` };
  }

  function periodTitle(scope, years, subject = "Mes heures") {
    const selected = scope == null ? years : scope;
    const fallback = `${subject} · période sélectionnée`;
    if (selected && typeof selected === "object" && selected.kind !== "years" &&
      (Object.hasOwn(selected, "startDate") || Object.hasOwn(selected, "endDate"))) {
      const start = projectDate(selected.startDate), end = projectDate(selected.endDate);
      if (!start || !end || start.value > end.value || Number(start.value.slice(0, 4)) < 1 ||
        Number(end.value.slice(0, 4)) > 9998) return fallback;
      const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
      const date = value => {
        const day = Number(value.slice(8, 10));
        return `${day === 1 ? "1er" : day} ${months[Number(value.slice(5, 7)) - 1]} ${Number(value.slice(0, 4))}`;
      };
      return `${subject} du ${date(start.value)} au ${date(end.value)}`;
    }
    const values = selected?.kind === "years" ? selected.years : selected;
    if (typeof values === "string" || typeof values?.[Symbol.iterator] !== "function") return fallback;
    const valid = [...new Set(Array.from(values).map(value => numeric(value))
      .filter(value => Number.isInteger(value) && value >= 1 && value <= 9998))].sort((a, b) => a - b);
    if (!valid.length) return fallback;
    const period = valid.length === 1 ? String(valid[0]) : `${valid.slice(0, -1).join(", ")} et ${valid.at(-1)}`;
    return `${subject} en ${period}`;
  }

  function selectedPeriodEnd(scope, years) {
    const selected = scope == null ? years : scope;
    if (selected && typeof selected === "object" && selected.kind !== "years" &&
      (Object.hasOwn(selected, "startDate") || Object.hasOwn(selected, "endDate"))) {
      const start = projectDate(selected.startDate), end = projectDate(selected.endDate);
      return start && end && start.value <= end.value && Number(start.value.slice(0, 4)) >= 1 &&
        Number(end.value.slice(0, 4)) <= 9998 ? end : null;
    }
    const values = selected?.kind === "years" ? selected.years : selected;
    if (typeof values === "string" || typeof values?.[Symbol.iterator] !== "function") return null;
    const valid = Array.from(values).map(value => numeric(value))
      .filter(value => Number.isInteger(value) && value >= 1 && value <= 9998);
    return valid.length ? projectDate(`${String(valid.reduce((latest, value) => Math.max(latest, value), 0)).padStart(4, "0")}-12-31`) : null;
  }

  function planningInfoView(node, data, id, openDetails, infoOpen = false) {
    const info = data.planningInfo;
    const section = node("section", "project-planning-info"), controls = new Map();
    section.setAttribute("data-project-planning-info", "");
    const heading = node("h4", "project-planning-info-title", "Convention et planning"); heading.id = `${id}-planning-info`;
    const header = node("div", "project-planning-info-header"), anchor = node("div", "project-planning-info-anchor");
    const infoButton = node("button", "project-planning-info-button", "i"); infoButton.type = "button";
    infoButton.setAttribute("aria-label", "Informations sur la convention et le planning");
    infoButton.setAttribute("data-planning-info-control", "");
    const notes = node("div", "project-planning-info-popover"); notes.id = `${id}-planning-notes`;
    notes.setAttribute("role", "region"); notes.setAttribute("aria-label", "Informations sur la convention et le planning");
    notes.setAttribute("data-planning-info-popover", ""); notes.hidden = !infoOpen;
    infoButton.setAttribute("aria-controls", notes.id); infoButton.setAttribute("aria-expanded", String(infoOpen));
    let pinned = infoOpen, hovered = false, suppressFocus = false, listening = false, stopped = false;
    const show = () => {
      if (stopped) return;
      notes.hidden = false; infoButton.setAttribute("aria-expanded", "true");
      if (!listening) { section.ownerDocument.addEventListener?.("pointerdown", outsidePointer); section.ownerDocument.addEventListener?.("focusin", outsideFocus); listening = true; }
    };
    const hide = () => {
      notes.hidden = true; infoButton.setAttribute("aria-expanded", "false");
      section.ownerDocument.removeEventListener?.("pointerdown", outsidePointer); section.ownerDocument.removeEventListener?.("focusin", outsideFocus); listening = false;
    };
    anchor.addEventListener("pointerenter", () => { hovered = true; show(); });
    anchor.addEventListener("pointerleave", () => { hovered = false; if (!pinned && !anchor.contains(section.ownerDocument.activeElement)) hide(); });
    infoButton.addEventListener("focus", () => { if (suppressFocus) suppressFocus = false; else show(); });
    anchor.addEventListener("focusout", event => { if (!pinned && !hovered && !anchor.contains(event.relatedTarget)) hide(); });
    infoButton.addEventListener("click", () => { pinned = !pinned; if (pinned) show(); else hide(); });
    anchor.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      pinned = false; hide();
      suppressFocus = section.ownerDocument.activeElement !== infoButton;
      if (suppressFocus) infoButton.focus();
    });
    const outsidePointer = event => { if (!anchor.contains(event.target)) { pinned = false; hide(); } };
    const outsideFocus = event => { if (!anchor.contains(event.target) && !hovered) { pinned = false; hide(); } };
    if (infoOpen) show();
    const cleanup = () => {
      stopped = true; section.ownerDocument.removeEventListener?.("pointerdown", outsidePointer); section.ownerDocument.removeEventListener?.("focusin", outsideFocus); listening = false;
    };
    anchor.append(infoButton, notes); header.append(heading, anchor);
    section.setAttribute("aria-labelledby", heading.id); section.append(header);
    if (!info || typeof info !== "object") {
      const loading = Boolean(data.loading);
      section.setAttribute("data-planning-info-status", loading ? "loading" : "unavailable");
      section.setAttribute("aria-busy", String(loading));
      const message = node("p", "project-planning-info-note", loading ? "Chargement des informations de planning…" : "Informations de planning indisponibles.");
      message.setAttribute("role", "status"); section.append(message); notes.append(node("p", "project-planning-info-note", loading ? "Les détails seront disponibles après le chargement du planning." : "Les informations détaillées de planning sont indisponibles."));
      return { section, controls, infoButton, cleanup };
    }
    section.setAttribute("data-planning-info-status", ["available", "partial", "unavailable"].includes(info.status) ? info.status : "unavailable");
    const start = projectDate(info.startDate), end = projectDate(info.endDate);
    section.append(node("p", "project-planning-info-period", `${start && end && start.value <= end.value ? `Du ${start.label} au ${end.label}` : "Dates du projet indisponibles"} · durée totale du projet · indépendamment de la période sélectionnée · hors Ormitters.`));
    const metrics = node("dl", "project-planning-info-metrics");
    const delta = info.projectionStatus === "unavailable" ? null : numeric(info.projectionDifference);
    const roundedDelta = delta === null ? null : Math.abs(delta) <= 0.005 ? 0 : delta;
    const definitions = [["convention", "prévues par la convention", info.conventionHours],
      ["actual", "déjà prestées au total depuis le début du projet", info.actualStatus === "unavailable" ? null : info.actualHours],
      ["remaining", "restantes planifiées au total", info.remainingPlannedStatus === "unavailable" ? null : info.remainingPlannedHours],
      ["projection", roundedDelta === null ? "écart projeté avec la convention" : roundedDelta > 0 ? "planifiées en trop par rapport à la convention"
        : roundedDelta < 0 ? "en moins par rapport à la convention" : "d’écart avec la convention", roundedDelta]];
    for (const [key, title, value] of definitions) {
      const metric = node("div", "project-planning-info-metric"); metric.setAttribute("data-planning-metric", key);
      const amount = numeric(value);
      const text = key === "convention" && amount === null && info.conventionStatus === "empty" ? "Non renseigné"
        : key === "projection" && amount !== null ? `${amount > 0 ? "+" : amount < 0 ? "−" : ""}${formatHours(Math.abs(amount))}` : formatHours(value);
      const label = node("dt", "project-planning-info-caption", title);
      const valueNode = node("dd", "project-planning-info-value", text);
      valueNode.setAttribute("data-planning-value", key);
      if (key === "projection") {
        metric.setAttribute("data-planning-projection-direction", roundedDelta === null ? "unknown" : roundedDelta > 0 ? "over" : roundedDelta < 0 ? "under" : "balanced");
      } else if (key === "actual") {
        const through = projectDate(info.actualThroughDate);
        label.append(node("em", "project-planning-info-card-note", `Hors Ormitters${through ? ` · jusqu’au ${through.label}` : ""}.`));
      } else if (key === "remaining") {
        const knownHire = numeric(info.remainingToHireHours);
        const hireText = info.remainingToHireStatus === "unavailable" || knownHire === null ? "Part des heures TH indisponible."
          : `dont ${formatHours(knownHire)} à recruter (TH)${info.remainingToHireStatus === "partial" ? " identifiées" : ""}.`;
        const hireNote = node("strong", "project-planning-info-card-th", hireText); hireNote.setAttribute("data-planning-remaining-to-hire", "");
        label.append(hireNote);
        const remainingStart = projectDate(info.remainingStartDate);
        if (remainingStart) label.append(node("em", "project-planning-info-card-note", `À partir du ${remainingStart.label}.`));
      }
      metric.append(label, valueNode); metrics.append(metric);
    }
    section.append(metrics);
    const comparisons = node("div", "project-planning-info-comparisons");
    for (const [key, reference, status, difference] of [
      ["planning", "au planning daté", info.plannedToDateStatus, info.planningToDateDifference],
      ["convention", "à la convention (interpolation linéaire)", info.conventionToDateStatus, info.conventionToDateDifference]
    ]) {
      const delta = status === "available" && info.actualStatus !== "unavailable" ? numeric(difference) : null;
      const rounded = delta === null ? null : Math.abs(delta) <= 0.005 ? 0 : delta;
      const text = rounded === null ? `Comparaison ${reference} à ce jour indisponible.` : rounded === 0
        ? `À ce jour, les heures pointées correspondent ${reference}.`
        : `À ce jour, ${formatHours(Math.abs(rounded))} pointées ${rounded > 0 ? "en trop" : "en moins"} par rapport ${reference}.`;
      const sentence = node("p", `project-planning-info-comparison${rounded > 0 ? " is-over" : ""}`, text);
      sentence.setAttribute("data-planning-to-date-comparison", key); comparisons.append(sentence);
    }
    section.append(comparisons);
    notes.append(node("p", "project-planning-info-note", "Écart projeté = heures déjà prestées + heures restantes planifiées (TH inclus) − convention. Tous ces chiffres sont hors Ormitters."));
    notes.append(node("p", "project-planning-info-note", "Les comparaisons à ce jour utilisent le planning réellement daté et la convention répartie linéairement sur les dates du projet. Elles sont indépendantes de la période sélectionnée."));
    const details = (key, summaryText, items) => {
      const group = node("details", "project-planning-info-details"); group.open = openDetails.has(key); group.setAttribute("data-planning-details", key);
      const summary = node("summary", "", summaryText); summary.setAttribute("data-planning-detail-control", key);
      const list = node("ul", ""); items.forEach(text => list.append(node("li", "", text)));
      group.append(summary, list); notes.append(group); controls.set(key, summary);
    };
    const coverage = info.coverage || {}, first = projectDate(coverage.startDate), last = projectDate(coverage.endDate);
    if (coverage.status === "gaps") {
      const gaps = Array.isArray(coverage.gaps) ? coverage.gaps : [];
      const gapText = gap => {
        const from = projectDate(gap.startDate), to = projectDate(gap.endDate), count = numeric(gap.days);
        return `${from && to ? `du ${from.label} au ${to.label}` : "dates indisponibles"}${count === null ? "" : ` (${numberFormat.format(count)} jours calendaires)`}`;
      };
      const periods = gaps.slice(0, 2).map(gapText).join(" ; ");
      const note = node("p", "project-planning-info-warning", `Planning futur : aucune personne réellement planifiée${periods ? ` ${periods}` : " sur certaines périodes d’au moins un mois"}${gaps.length > 2 ? ` ; et ${gaps.length - 2} autre${gaps.length === 3 ? " période" : "s périodes"}` : ""}.`);
      note.setAttribute("data-planning-coverage", "gaps"); notes.append(note);
      if (gaps.length) details("gaps", `Voir ${gaps.length === 1 ? "la période" : `les ${gaps.length} périodes`} sans personne planifiée`, gaps.map(gap => {
        const from = projectDate(gap.startDate), to = projectDate(gap.endDate), count = numeric(gap.days);
        return `${from && to ? `Du ${from.label} au ${to.label}` : "Dates indisponibles"}${count === null ? "" : ` · ${numberFormat.format(count)} jour${count === 1 ? " calendaire" : "s calendaires"}`}.`;
      }));
    } else {
      const knownCoverage = ["complete", "no-substantial-gaps"].includes(coverage.status);
      const text = knownCoverage ? first && last && first.value <= last.value
        ? "Aucune période sans personne réellement planifiée d’au moins un mois." : "Aucune période future à couvrir."
        : "Couverture future indéterminée : le planning ou les identités accessibles ne permettent pas de confirmer les périodes sans personne planifiée.";
      const note = node("p", knownCoverage ? "project-planning-info-note" : "project-planning-info-warning", text);
      note.setAttribute("data-planning-coverage", knownCoverage ? coverage.status : "unavailable"); notes.append(note);
    }
    notes.append(node("p", "project-planning-info-note", "Seules les interruptions continues d’au moins un mois sont signalées."));
    const toHire = Array.isArray(info.toHireResources) ? info.toHireResources : [];
    const resourceText = resource => `${typeof resource.name === "string" && resource.name.trim() ? resource.name : `Ressource ${resource.id}`} · ${formatHours(resource.hours)}.`;
    if (toHire.length) {
      const hours = numeric(info.knownToHireHours);
      details("to-hire", `Ressources TH · durée totale du projet : ${toHire.length} ressource${toHire.length === 1 ? "" : "s"}${hours === null ? "" : ` · ${formatHours(hours)} identifiées`}`, toHire.map(resourceText));
      notes.append(node("p", "project-planning-info-note", "Les ressources TH représentent des postes à pourvoir ; leurs heures restent incluses dans le planning et dans l’écart projeté."));
    }
    if (info.toHireStatus !== "complete") {
      const note = node("p", "project-planning-info-warning", info.toHireStatus === "partial"
        ? "Identification des ressources TH incomplète : seules les heures TH confirmées peuvent être distinguées dans le planning."
        : "Identification des ressources TH indisponible : leur part dans le planning ne peut pas être confirmée.");
      note.setAttribute("data-planning-to-hire-coverage", info.toHireStatus === "partial" ? "partial" : "unavailable"); notes.append(note);
    }
    const unlinked = Array.isArray(info.unlinkedResources) ? info.unlinkedResources : [];
    if (unlinked.length) details("unlinked", `${unlinked.length} autre${unlinked.length === 1 ? "" : "s"} ressource${unlinked.length === 1 ? "" : "s"} sans personne attribuée`, unlinked.map(resourceText));
    const warnings = Array.isArray(info.warnings) ? [...new Set(info.warnings.filter(value => typeof value === "string" && value.trim()))] : [];
    if (warnings.length) {
      const list = node("ul", "project-planning-info-notes"); warnings.forEach(warning => list.append(node("li", "", warning))); notes.append(list);
    }
    return { section, controls, infoButton, cleanup };
  }

  function barGeometry(planned, actual, fraction) {
    const plan = numeric(planned), done = numeric(actual), date = numeric(fraction);
    const scaleAvailable = plan !== null && plan > 0;
    if (scaleAvailable) return {
      plannedWidth: 75,
      actualWidth: done === null ? null : Math.min(100, Math.max(0, 75 * done / plan)),
      tickPosition: date === null ? null : 75 * Math.min(1, Math.max(0, date)),
      scaleAvailable: true, unplanned: false, capped: done !== null && done > plan / 0.75
    };
    const unplanned = plan === 0 && done !== null && done > 0;
    return {
      plannedWidth: plan === null ? null : 0,
      actualWidth: plan === null || done === null || plan < 0 && done > 0 ? null : unplanned ? 100 : 0,
      tickPosition: null, scaleAvailable: false, unplanned, capped: false
    };
  }

  function photoSource(value) {
    return typeof value === "string" && value.length <= 400000 &&
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : null;
  }

  function initials(name) {
    return String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => Array.from(part)[0]).join("").toLocaleUpperCase("fr") || "?";
  }

  function monthlyGeometry(data, requestedWidth = 800, employeeId = null) {
    const width = Math.max(280, Math.min(1200, numeric(requestedWidth) || 800));
    const height = width < 520 ? 300 : 340;
    const plot = { left: 55, top: 28, width: width - 75, height: height - 93 };
    const months = Array.isArray(data?.months) ? data.months : [];
    const values = input => months.map((_, index) => numeric(input?.[index]) ?? 0);
    const series = [], positive = months.map(() => 0), negative = months.map(() => 0);
    const employees = Array.isArray(data?.employees) ? data.employees : [];
    const selectedEmployee = employeeId == null ? null : employees.find(employee => employee?.id != null && String(employee.id) === String(employeeId));
    const isPlanned = data?.kind === "planned";
    const planningValues = selectedEmployee ? selectedEmployee.scheduledPlanning : data?.planning;
    const planningStatus = selectedEmployee ? selectedEmployee.scheduledPlanningStatus : data?.planningStatus;
    if (selectedEmployee && !isPlanned) {
      const id = String(selectedEmployee.id);
      series.push({ key: id, id, kind: "employee-actual", values: values(selectedEmployee.values) });
      if (selectedEmployee.plannedStatus === "available" && Array.isArray(selectedEmployee.plannedReference)
        && selectedEmployee.plannedReference.length === months.length && selectedEmployee.plannedReference.every(value => numeric(value) !== null)) {
        series.push({ key: `planned:${id}`, id, kind: "employee-planned", values: values(selectedEmployee.plannedReference) });
      }
    } else for (const employee of selectedEmployee ? [selectedEmployee] : employees) {
      if (employee?.id == null) continue;
      const item = { key: String(employee.id), id: String(employee.id), kind: "employee", values: values(employee.values), areas: [] };
      for (const sign of ["positive", "negative"]) {
        const stack = sign === "positive" ? positive : negative;
        const lower = stack.slice();
        const contribution = item.values.map(value => sign === "positive" ? Math.max(0, value) : Math.min(0, value));
        contribution.forEach((value, index) => { stack[index] += value; });
        if (contribution.some(value => value !== 0)) item.areas.push({ sign, lower, upper: stack.slice() });
      }
      series.push(item);
    }
    if (!selectedEmployee || isPlanned) {
      if (Array.isArray(data?.convention)) series.push({ key: "convention", kind: "convention", values: values(data.convention) });
      series.push({ key: "total", kind: "total", values: values(selectedEmployee ? selectedEmployee.values : data?.total) });
    }
    if (!isPlanned && planningStatus === "available" && Array.isArray(planningValues) && planningValues.length === months.length && planningValues.every(value => numeric(value) !== null)) {
      series.push({ key: "planning", kind: "planning", values: values(planningValues) });
    }
    let low = 0, high = 0;
    for (const item of series) for (const value of item.values) { low = Math.min(low, value); high = Math.max(high, value); }
    for (const value of positive) high = Math.max(high, value);
    for (const value of negative) low = Math.min(low, value);
    const span = high - low || 1, roughStep = span / 5, magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const step = [1, 2, 2.5, 5, 10].map(value => value * magnitude).find(value => value >= roughStep) || magnitude * 10;
    const min = low < 0 ? Math.floor(low / step) * step : 0;
    const max = high > 0 ? Math.ceil(high / step) * step : low < 0 ? 0 : 1;
    const y = value => plot.top + (max - value) / (max - min) * plot.height;
    const x = months.map((_, index) => plot.left + (months.length <= 1 ? plot.width / 2 : index / (months.length - 1) * plot.width));
    const ticks = [];
    const tickStep = high === 0 && low === 0 ? 0.2 : step;
    for (let value = min, count = 0; value <= max + tickStep / 1000 && count < 20; value += tickStep, count++) {
      const rounded = Number(value.toPrecision(12));
      ticks.push({ value: rounded, y: y(rounded) });
    }
    const labelCount = Math.max(2, Math.floor(plot.width / 85));
    const tickCount = Math.min(months.length, labelCount);
    const monthIndices = Array.from(new Set(Array.from({ length: tickCount }, (_, index) =>
      tickCount <= 1 ? 0 : Math.round(index * (months.length - 1) / (tickCount - 1)))));
    for (const item of series) {
      item.points = item.values.map((value, index) => ({ x: x[index], y: y(value), value }));
      item.path = item.points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(3)},${point.y.toFixed(3)}`).join(" ");
      if (months.length === 1) item.path = `M${plot.left.toFixed(3)},${item.points[0].y.toFixed(3)} L${(plot.left + plot.width).toFixed(3)},${item.points[0].y.toFixed(3)}`;
      for (const area of item.areas || []) {
        const coordinates = months.length === 1 ? [plot.left, plot.left + plot.width] : x;
        const lower = months.length === 1 ? [area.lower[0], area.lower[0]] : area.lower;
        const upper = months.length === 1 ? [area.upper[0], area.upper[0]] : area.upper;
        const edge = heights => coordinates.map((coordinate, index) => ({ x: coordinate, y: y(heights[index]) }))
          .map(point => `${point.x.toFixed(3)},${point.y.toFixed(3)}`);
        const top = edge(upper), bottom = edge(lower).reverse();
        area.path = top.length ? `M${top.join(" L")} L${bottom.join(" L")} Z` : "";
      }
    }
    return { width, height, plot, min, max, ticks, x, monthIndices, series, positive, negative,
      hasNegative: selectedEmployee ? series.some(item => item.values.some(value => value < 0)) : negative.some(value => value < 0),
      selectedEmployeeId: selectedEmployee ? String(selectedEmployee.id) : null };
  }

  function monthlyView(doc, node, selected, data, options, makeAvatar, id, focusMonth, tableOpen, kind = "actual") {
    const isPlanned = kind === "planned";
    if (isPlanned) id = `${id}-planned`;
    const summary = isPlanned ? data.plannedMonthly : data.monthly;
    const onEmployeeChange = isPlanned ? options.onPlannedMonthlyEmployeeChange : options.onMonthlyEmployeeChange;
    const mode = data.monthlyMode === "monthly" || data.monthlyMode === "cumulative" ? data.monthlyMode : summary?.mode === "cumulative" ? "cumulative" : "monthly";
    const cumulative = mode === "cumulative";
    const section = node("section", "project-monthly project-browser-section");
    section.setAttribute("data-monthly-project", String(selected.id));
    section.setAttribute("data-monthly-kind", kind);
    section.setAttribute("data-monthly-mode", mode);
    const heading = node("h3", "project-browser-section-title", isPlanned ? "Projets · 03 / Planning mensuel · durée du projet" : "Projets · 02 / Évolution mensuelle · durée du projet");
    heading.id = `${id}-monthly`;
    section.setAttribute("aria-labelledby", heading.id);
    section.append(heading);
    let toggle = null, observer = null, resizeObserver = null, fallbackListener = null, outsidePointer = null, outsideFocus = null, stopped = false;
    const controls = node("div", "project-monthly-controls");
    if (data.hasOrmitters === true) {
      const label = node("label", "project-hours-ormitters-toggle");
      toggle = node("input", "project-hours-ormitters-input");
      toggle.type = "checkbox"; toggle.checked = data.includeOrmitters === true;
      toggle.setAttribute("data-monthly-include-ormitters", "");
      toggle.addEventListener("change", () => options.onIncludeOrmittersChange?.(toggle.checked));
      label.append(toggle, node("span", "", "Inclure les heures des Ormitters")); controls.append(label);
    }
    const modeGroup = node("fieldset", "project-monthly-mode-toggle"), modeInputs = [];
    modeGroup.append(node("legend", "project-browser-sr-only", isPlanned ? "Affichage des heures planifiées" : "Affichage des heures réalisées"));
    for (const [value, text] of [["monthly", "Par mois"], ["cumulative", "Cumulé"]]) {
      const label = node("label", "project-monthly-mode-choice"), input = node("input", "project-monthly-mode-input");
      input.type = "radio"; input.name = `${id}-monthly-mode`; input.value = value; input.checked = mode === value;
      input.setAttribute("data-monthly-mode-choice", value);
      input.addEventListener("change", () => { if (input.checked) options.onMonthlyModeChange?.(value); });
      label.append(input, node("span", "", text)); modeGroup.append(label); modeInputs.push(input);
    }
    controls.append(modeGroup); section.append(controls);
    const status = summary?.status || (data.loading ? "loading" : "unavailable");
    section.setAttribute("data-monthly-status", status);
    section.setAttribute("aria-busy", String(status === "loading"));
    const addWarnings = () => {
      const warnings = Array.isArray(summary?.warnings) ? summary.warnings.filter(value => typeof value === "string" && value.trim()) : [];
      if (warnings.length) {
        const list = node("ul", "project-hours-warnings");
        [...new Set(warnings)].forEach(warning => list.append(node("li", "", warning))); section.append(list);
      }
    };
    const cleanup = () => {
      stopped = true; observer?.disconnect(); resizeObserver?.disconnect();
      if (fallbackListener) {
        const host = doc.defaultView || (typeof window === "object" ? window : null);
        host?.removeEventListener?.("scroll", fallbackListener); host?.removeEventListener?.("resize", fallbackListener);
      }
      if (outsidePointer) doc.removeEventListener?.("pointerdown", outsidePointer);
      if (outsideFocus) doc.removeEventListener?.("focusin", outsideFocus);
    };
    if (status !== "available" || !Array.isArray(summary?.months) || !summary.months.length) {
      const message = node("p", "project-monthly-status", isPlanned ? status === "loading" ? "Chargement du planning mensuel…" : "Planning mensuel indisponible : vérifiez le planning et les dates du projet." : status === "loading" ? "Chargement de l’évolution mensuelle…" :
        status === "not-started" ? "Le projet n’a pas encore commencé." : "Évolution mensuelle indisponible : vérifiez les dates du projet.");
      message.setAttribute("role", "status"); section.append(message); addWarnings();
      return { section, toggle, modeInputs, cleanup, mount() {}, focus() {} };
    }
    const employees = (Array.isArray(summary.employees) ? summary.employees : []).filter(employee => employee?.id != null)
      .map(employee => ({ ...employee, name: String(employee.name || "Employé non identifié") }));
    const names = new Map();
    employees.forEach(employee => names.set(employee.name, (names.get(employee.name) || 0) + 1));
    employees.forEach(employee => { employee.label = names.get(employee.name) > 1 ? `${employee.name} (ID ${employee.id})` : employee.name; });
    const requestedEmployee = isPlanned ? data.plannedMonthlyEmployeeId : data.monthlyEmployeeId;
    const selectedEmployee = requestedEmployee == null ? null : employees.find(employee => String(employee.id) === String(requestedEmployee));
    const visibleEmployees = selectedEmployee ? [selectedEmployee] : employees;
    const plannedLabel = `Planning individuel · référence linéaire${cumulative ? " cumulée" : ""} sur tout le projet`;
    const plannedAvailable = selectedEmployee?.plannedStatus === "available" && Array.isArray(selectedEmployee.plannedReference)
      && selectedEmployee.plannedReference.length === summary.months.length && selectedEmployee.plannedReference.every(value => numeric(value) !== null);
    const plannedValues = plannedAvailable ? selectedEmployee.plannedReference : null;
    const scheduledPlanning = selectedEmployee ? selectedEmployee.scheduledPlanning : summary.planning;
    const scheduledPlanningStatus = selectedEmployee ? selectedEmployee.scheduledPlanningStatus : summary.planningStatus;
    const datedPlanningAvailable = !isPlanned && scheduledPlanningStatus === "available" && Array.isArray(scheduledPlanning)
      && scheduledPlanning.length === summary.months.length && scheduledPlanning.every(value => numeric(value) !== null);
    const datedPlanningLabel = cumulative ? "Planning daté cumulé à ce jour" : "Planning daté à ce jour";
    const shownTotal = selectedEmployee && isPlanned ? selectedEmployee.values : summary.total;
    const employeeButtons = [];
    let employeeReset = null;
    section.setAttribute("data-monthly-selected-employee", selectedEmployee ? String(selectedEmployee.id) : "");
    if (selectedEmployee) {
      employeeReset = node("button", "project-monthly-employee-reset", "Tous les employés"); employeeReset.type = "button";
      employeeReset.setAttribute("data-monthly-employee-reset", "");
      employeeReset.addEventListener("click", () => onEmployeeChange?.(null)); controls.append(employeeReset);
    }
    const start = projectDate(summary.startDate), through = projectDate(summary.throughDate), end = projectDate(summary.endDate);
    const planningPeriod = start && end ? `Du ${start.label} au ${end.label} · totalité du planning individuel, indépendamment de la période sélectionnée.`
      : "Totalité du planning individuel sur les dates du projet, indépendamment de la période sélectionnée.";
    const projectPeriod = start && end ? `Dates du projet : du ${start.label} au ${end.label}.` : "Dates de référence du projet indisponibles.";
    heading.title = `${start && through ? `Heures du ${start.label} au ${through.label}. ` : ""}${selectedEmployee ? planningPeriod : `${projectPeriod} Indépendamment de la période sélectionnée.`}`;
    const period = node("p", "project-monthly-period", start && through ?
      `Du ${start.label} au ${through.label} · hors période sélectionnée · ${data.includeOrmitters ? "Ormitters inclus" : "hors Ormitters"}` : "Période du projet · hors période sélectionnée");
    section.append(period);
    const months = summary.months;
    const currentKey = isPlanned ? null : summary.throughDate?.slice(0, 7);
    const monthLabel = month => `${month.label || month.key}${month.key === currentKey ? ` · au ${through?.label || summary.throughDate} (mois en cours)` : ""}`;
    section.append(node("p", "project-monthly-note", isPlanned ?
      `Heures planifiées ${cumulative ? "cumulées mois après mois" : "par mois"}, réparties selon les dates des créneaux sur toute la durée du projet, y compris les allocations futures et les ressources à recruter (TH). Indépendamment de la période sélectionnée.` : selectedEmployee ?
      `${selectedEmployee.label} · ${cumulative ? "heures cumulées" : "heures de chaque mois"}, du début du projet à aujourd’hui. Le mois en cours est partiel. La référence répartit son planning total, y compris les allocations futures, linéairement sur toute la durée du projet. Elle est indépendante de la période sélectionnée.` : cumulative ?
      "Heures cumulées mois après mois depuis le début du projet. Le mois en cours est partiel. La convention s’accumule au prorata des jours du projet, puis reste constante après sa fin." :
      "Heures de chaque mois, du début du projet à aujourd’hui. Le mois en cours est partiel. La convention est répartie par jour sur les dates du projet, puis nulle après sa fin."));
    if (selectedEmployee && !isPlanned) {
      const planning = node("p", "project-monthly-note", plannedAvailable ?
        `Planning total de ${selectedEmployee.label} sur toute la durée du projet : ${formatHours(selectedEmployee.plannedHours)}${numeric(selectedEmployee.plannedHours) === 0 ? " · aucune heure planifiée." : "."}` :
        `Planning de ${selectedEmployee.label} indisponible ; la projection linéaire ne peut pas être affichée.`);
      planning.setAttribute("data-monthly-employee-planning", plannedAvailable ? "available" : "unavailable"); section.append(planning);
      if (typeof selectedEmployee.plannedWarning === "string" && selectedEmployee.plannedWarning.trim()) {
        const warning = node("p", "project-monthly-note", selectedEmployee.plannedWarning);
        warning.setAttribute("data-monthly-planned-warning", ""); section.append(warning);
      }
    }
    if (!isPlanned) {
      const notice = node("p", "project-monthly-note", datedPlanningAvailable ?
        "La ligne rouge continue suit les heures des créneaux de planning datés, jusqu’à aujourd’hui ; elle ne représente pas une interpolation linéaire." :
        "Planning daté indisponible : la ligne rouge de comparaison ne peut pas être affichée.");
      notice.setAttribute("data-monthly-dated-planning", datedPlanningAvailable ? "available" : "unavailable"); section.append(notice);
      const warning = selectedEmployee ? selectedEmployee.scheduledPlanningWarning : summary.planningWarning;
      if (typeof warning === "string" && warning.trim()) section.append(node("p", "project-monthly-note", warning));
    }
    if (visibleEmployees.some(employee => employee.values?.some(value => numeric(value) < 0))) {
      const note = node("p", "project-monthly-note", selectedEmployee ? "Les corrections négatives restent visibles sous zéro." : "Les corrections négatives sont empilées sous zéro. La ligne Total indique la somme nette des employés.");
      note.setAttribute("data-monthly-corrections", ""); section.append(note);
    }
    const totalLabel = isPlanned ? `${selectedEmployee ? "Total individuel" : "Total du projet"} planifié${cumulative ? " cumulé" : ""}` : cumulative ? "Total cumulé du projet" : "Total du projet";
    const conventionLabel = cumulative ? "Convention cumulée · prorata journalier" : "Convention · prorata journalier";
    const legend = node("ul", "project-monthly-legend"); legend.setAttribute("aria-label", "Choisir un employé ou afficher tous les employés");
    const legendItem = (key, label, kind, color, employee) => {
      const item = node("li", "project-monthly-legend-item"); item.setAttribute("data-monthly-legend", key);
      let content = item;
      if (employee) {
        const isSelected = selectedEmployee && String(selectedEmployee.id) === String(employee.id);
        item.classList.add(isSelected ? "is-selected" : selectedEmployee ? "is-muted" : "is-all");
        content = node("button", "project-monthly-employee-choice"); content.type = "button";
        content.setAttribute("data-monthly-employee-choice", String(employee.id)); content.setAttribute("aria-pressed", String(Boolean(isSelected)));
        content.setAttribute("aria-label", `${isSelected ? "Afficher tous les employés" : "Afficher uniquement"} : ${employee.label}`);
        content.addEventListener("click", () => onEmployeeChange?.(isSelected ? null : String(employee.id)));
        item.append(content); employeeButtons.push(content);
      }
      const sample = node("span", `project-monthly-legend-line is-${kind}`); sample.style.borderTopColor = color;
      if (kind === "employee" && (!selectedEmployee || isPlanned)) sample.style.backgroundColor = color;
      if (kind === "employee" && selectedEmployee && !isPlanned) sample.classList.add("is-line");
      sample.setAttribute("aria-hidden", "true");
      content.append(sample);
      if (employee) content.append(makeAvatar(employee));
      content.append(node("span", "project-monthly-legend-name", label), node("span", "project-browser-sr-only", kind === "convention" || kind === "employee-planned" ? "courbe pointillée" : kind === "total" ? "courbe pleine épaisse" : kind === "planning" || selectedEmployee && !isPlanned ? "courbe pleine" : "aire empilée"));
      if (employee?.isSubcontractor) content.append(node("span", "project-hours-employee-tag", "Ormitter"));
      legend.append(item);
      return item;
    };
    employees.forEach(employee => legendItem(String(employee.id), employee.label, "employee", employeeColor(employee.id), employee));
    if (selectedEmployee && !isPlanned) {
      if (plannedAvailable) legendItem(`planned:${selectedEmployee.id}`, plannedLabel, "employee-planned", employeeColor(selectedEmployee.id)).title = planningPeriod;
    } else {
      legendItem("total", totalLabel, "total", "#183b53");
      if (Array.isArray(summary.convention)) legendItem("convention", conventionLabel, "convention", "#8496a2");
    }
    if (datedPlanningAvailable) legendItem("planning", datedPlanningLabel, "planning", "#cf3347");
    section.append(legend);
    const chart = node("div", "project-monthly-chart-wrap");
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "project-monthly-chart"); svg.setAttribute("data-monthly-chart", "");
    svg.setAttribute("role", "group"); svg.setAttribute("aria-label", `${cumulative ? "Évolution cumulée" : "Évolution mensuelle"} ${isPlanned ? "du planning " : ""}de ${selectedEmployee ? selectedEmployee.label : selected.name}, ${selectedEmployee && !isPlanned ? "réalisé et prévu en lignes" : "en aires empilées"} et en heures, ${isPlanned ? "sur toute la durée du projet" : "depuis le début du projet"} et indépendamment de la période sélectionnée. Flèches gauche et droite pour parcourir les mois.`);
    chart.append(svg); section.append(chart);
    const tooltip = node("div", "project-monthly-tooltip"); tooltip.id = `${id}-monthly-tooltip`;
    tooltip.setAttribute("role", "tooltip"); tooltip.setAttribute("data-monthly-tooltip", ""); tooltip.hidden = true; section.append(tooltip);
    tooltip.setAttribute("data-monthly-pinned", "false"); tooltip.setAttribute("tabindex", "-1");
    const instruction = node("p", "project-monthly-note", "Survolez ou touchez un mois pour le détail. Au clavier : flèches gauche/droite, Début/Fin ; Échap ferme le détail."); section.append(instruction);
    let geometry = null, targets = [], cursor = null, pinnedMonth = null, skipNextFocus = false, activeIndex = Math.max(0, months.findIndex(month => month.key === focusMonth));
    if (!focusMonth) activeIndex = months.length - 1;
    const hide = () => {
      tooltip.hidden = true; pinnedMonth = null; tooltip.setAttribute("data-monthly-pinned", "false"); tooltip.setAttribute("tabindex", "-1");
      cursor?.setAttribute("visibility", "hidden");
    };
    const show = (index, event) => {
      if (!geometry) return;
      activeIndex = index;
      if (pinnedMonth !== null && pinnedMonth !== index) pinnedMonth = null;
      tooltip.setAttribute("data-monthly-pinned", String(pinnedMonth !== null)); tooltip.setAttribute("tabindex", pinnedMonth === null ? "-1" : "0");
      tooltip.replaceChildren(node("strong", "project-monthly-tooltip-title", `${selected.name} · ${monthLabel(months[index])}`));
      const list = node("ul", "project-monthly-tooltip-values");
      const valueItem = (key, label, value, kind, color) => {
        const row = node("li", `project-monthly-tooltip-value is-${kind}`); row.setAttribute("data-monthly-value", key);
        const dot = node("span", "project-monthly-value-dot"); dot.style.backgroundColor = color; dot.setAttribute("aria-hidden", "true");
        row.append(dot, node("span", "", label), node("strong", "", formatHours(value))); list.append(row);
      };
      if (selectedEmployee && !isPlanned) {
        valueItem(String(selectedEmployee.id), `${selectedEmployee.label} · Réalisé${cumulative ? " cumulé" : ""}`, selectedEmployee.values?.[index], "employee-actual", employeeColor(selectedEmployee.id));
        valueItem(`planned:${selectedEmployee.id}`, plannedLabel, plannedValues?.[index], "employee-planned", employeeColor(selectedEmployee.id));
      } else {
        valueItem("total", totalLabel, shownTotal?.[index], "total", "#183b53");
        if (Array.isArray(summary.convention)) valueItem("convention", cumulative ? "Convention cumulée" : "Convention", summary.convention[index], "convention", "#8496a2");
        visibleEmployees.forEach(employee => valueItem(String(employee.id), employee.label, employee.values?.[index], "employee", employeeColor(employee.id)));
      }
      if (!isPlanned) valueItem("planning", datedPlanningLabel, datedPlanningAvailable ? scheduledPlanning[index] : null, "planning", "#cf3347");
      tooltip.append(list); tooltip.hidden = false;
      cursor.setAttribute("x1", geometry.x[index]); cursor.setAttribute("x2", geometry.x[index]); cursor.setAttribute("visibility", "visible");
      const bounds = section.getBoundingClientRect(), chartBounds = svg.getBoundingClientRect(), own = tooltip.getBoundingClientRect();
      const x = Number.isFinite(event?.clientX) ? event.clientX - bounds.left : chartBounds.left - bounds.left + geometry.x[index];
      const y = Number.isFinite(event?.clientY) ? event.clientY - bounds.top : chartBounds.top - bounds.top + geometry.plot.top + geometry.plot.height / 2;
      tooltip.style.left = `${Math.max(8, Math.min(x + 12, bounds.width - own.width - 8))}px`;
      tooltip.style.top = `${Math.max(8, y + own.height + 24 > bounds.height ? y - own.height - 12 : y + 16)}px`;
    };
    tooltip.addEventListener("keydown", event => {
      if (event.key === "Escape") { hide(); skipNextFocus = true; targets[activeIndex]?.focus(); }
    });
    outsidePointer = event => { if (pinnedMonth !== null && !chart.contains(event.target) && !tooltip.contains(event.target)) hide(); };
    outsideFocus = event => { if (pinnedMonth !== null && !chart.contains(event.target) && !tooltip.contains(event.target)) hide(); };
    doc.addEventListener?.("pointerdown", outsidePointer); doc.addEventListener?.("focusin", outsideFocus);
    const tableDetails = node("details", "project-monthly-details"); tableDetails.open = Boolean(tableOpen);
    const tableToggle = node("summary", "project-monthly-table-toggle", cumulative ? "Voir les valeurs cumulées par mois" : "Voir les valeurs exactes par mois"); tableToggle.setAttribute("data-monthly-table-toggle", ""); tableDetails.append(tableToggle);
    const tableWrap = node("div", "project-monthly-table-wrap"), table = node("table", "project-monthly-table"); table.setAttribute("data-monthly-table", "");
    table.append(node("caption", "project-browser-sr-only", `Heures ${cumulative ? "cumulées" : "mensuelles"} de ${selectedEmployee ? selectedEmployee.label : selected.name} depuis le début du projet, indépendamment de la période sélectionnée`));
    const tableHead = node("thead", ""), headerRow = node("tr", "");
    const columnLabels = selectedEmployee && !isPlanned ? ["Mois", `${selectedEmployee.label} · Réalisé${cumulative ? " cumulé" : ""}`, plannedLabel] :
      ["Mois", ...visibleEmployees.map(employee => employee.label), totalLabel, ...(Array.isArray(summary.convention) ? [cumulative ? "Convention cumulée" : "Convention"] : [])];
    if (!isPlanned) columnLabels.push(datedPlanningLabel);
    for (const text of columnLabels) {
      const cell = node("th", "", text); cell.setAttribute("scope", "col");
      if (selectedEmployee && text === plannedLabel) cell.title = planningPeriod;
      headerRow.append(cell);
    }
    tableHead.append(headerRow); table.append(tableHead);
    const body = node("tbody", "");
    months.forEach((month, index) => {
      const row = node("tr", ""), label = node("th", "", monthLabel(month)); label.setAttribute("scope", "row"); row.append(label);
      const values = selectedEmployee && !isPlanned ? [selectedEmployee.values?.[index], plannedValues?.[index]] :
        [...visibleEmployees.map(employee => employee.values?.[index]), shownTotal?.[index], ...(Array.isArray(summary.convention) ? [summary.convention[index]] : [])];
      if (!isPlanned) values.push(datedPlanningAvailable ? scheduledPlanning[index] : null);
      values.forEach(value => row.append(node("td", "", numeric(value) === null ? "Indisponible" : `${exactNumberFormat.format(Number(value))} h`)));
      body.append(row);
    });
    table.append(body); tableWrap.append(table); tableDetails.append(tableWrap); section.append(tableDetails); addWarnings();
    const view = doc.defaultView || (typeof window === "object" ? window : null);
    const svgNode = (tag, attributes, text) => {
      const element = doc.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attributes || {}).forEach(([key, value]) => element.setAttribute(key, value));
      if (text != null) element.textContent = text; return element;
    };
    let measuredWidth = 0;
    const draw = width => {
      const focusKey = section.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-monthly-month") : null;
      if (section.getAttribute("data-monthly-reveal") === "running") section.setAttribute("data-monthly-reveal", "complete");
      geometry = monthlyGeometry(summary, width, selectedEmployee?.id); measuredWidth = geometry.width; targets = [];
      svg.setAttribute("viewBox", `0 0 ${geometry.width} ${geometry.height}`); svg.replaceChildren();
      const { plot } = geometry;
      svg.append(svgNode("text", { x: plot.left, y: 15, class: "project-monthly-axis-title" }, cumulative ? "Heures cumulées" : "Heures par mois"));
      const compact = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 2, notation: "compact" });
      for (const tick of geometry.ticks) {
        svg.append(svgNode("line", { x1: plot.left, x2: plot.left + plot.width, y1: tick.y, y2: tick.y,
          class: `project-monthly-grid-line${tick.value === 0 ? " is-zero" : ""}`, "data-monthly-y-tick": tick.value }));
        svg.append(svgNode("text", { x: plot.left - 9, y: tick.y + 4, "text-anchor": "end", class: "project-monthly-axis-label" }, compact.format(tick.value)));
      }
      svg.append(svgNode("line", { x1: plot.left, x2: plot.left, y1: plot.top, y2: plot.top + plot.height, class: "project-monthly-axis" }));
      const lastY = plot.top + plot.height;
      for (const index of geometry.monthIndices) {
        const month = months[index], date = projectDate(`${month.key}-01`);
        const text = date ? new Intl.DateTimeFormat("fr-BE", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${date.value}T12:00:00Z`)) : month.label || month.key;
        svg.append(svgNode("line", { x1: geometry.x[index], x2: geometry.x[index], y1: lastY, y2: lastY + 5, class: "project-monthly-axis" }));
        svg.append(svgNode("text", { x: geometry.x[index], y: lastY + 23, "text-anchor": index === 0 ? "start" : index === months.length - 1 ? "end" : "middle", class: "project-monthly-axis-label" }, `${text}${month.key === currentKey ? "*" : ""}`));
      }
      svg.append(svgNode("text", { x: plot.left + plot.width, y: geometry.height - 8, "text-anchor": "end", class: "project-monthly-axis-title" }, isPlanned ? "Mois" : "Mois · * en cours"));
      const definitions = svgNode("defs"), clip = svgNode("clipPath", { id: `${id}-monthly-clip`, clipPathUnits: "userSpaceOnUse" });
      const reveal = svgNode("rect", { x: plot.left - 4, y: plot.top - 5, width: plot.width + 8, height: plot.height + 10, class: "project-monthly-reveal-window" });
      reveal.addEventListener("animationend", () => section.setAttribute("data-monthly-reveal", "complete")); clip.append(reveal); definitions.append(clip); svg.append(definitions);
      const lines = svgNode("g", { "clip-path": `url(#${id}-monthly-clip)`, "data-monthly-lines": "" });
      for (const item of geometry.series) {
        const color = item.kind === "planning" ? "#cf3347" : item.id ? employeeColor(item.id) : item.kind === "total" ? "#183b53" : "#8496a2";
        const group = svgNode("g", { "data-monthly-series": item.kind, ...(item.id ? { "data-monthly-employee-id": item.id } : {}) });
        if (item.kind === "employee") {
          for (const area of item.areas) group.append(svgNode("path", { d: area.path, fill: color, stroke: color,
            "fill-opacity": 0.78, "stroke-width": 0.6, "stroke-linejoin": "round", "data-monthly-area": area.sign }));
        } else {
          group.append(svgNode("path", { d: item.path, fill: "none", stroke: color, "stroke-width": item.kind === "total" ? 3.5 : 2,
            "stroke-dasharray": item.kind === "convention" || item.kind === "employee-planned" ? "2 6" : "none", "stroke-linecap": "round", "stroke-linejoin": "round",
            ...(item.kind === "employee-actual" || item.kind === "employee-planned" ? { "data-monthly-employee-line": item.kind === "employee-actual" ? "actual" : "planned" } : {}) }));
          if (months.length === 1) for (const point of item.points) group.append(svgNode("circle", { cx: point.x, cy: point.y, r: item.kind === "total" ? 4 : 3, fill: color }));
        }
        lines.append(group);
      }
      svg.append(lines);
      cursor = svgNode("line", { y1: plot.top, y2: lastY, class: "project-monthly-cursor", visibility: "hidden", "aria-hidden": "true" }); svg.append(cursor);
      months.forEach((month, index) => {
        const left = index === 0 ? plot.left : (geometry.x[index - 1] + geometry.x[index]) / 2;
        const right = index === months.length - 1 ? plot.left + plot.width : (geometry.x[index] + geometry.x[index + 1]) / 2;
        const target = svgNode("g", { tabindex: index === activeIndex ? 0 : -1, role: "button", "data-monthly-month": month.key,
          "aria-label": selectedEmployee && !isPlanned ? `${monthLabel(month)} : ${selectedEmployee.label}, ${formatHours(selectedEmployee.values?.[index])} réalisé${cumulative ? " cumulé" : ""} ; ${plannedLabel}, ${formatHours(plannedValues?.[index])}. Afficher le détail.` :
            `${monthLabel(month)} : ${formatHours(shownTotal?.[index])} ${isPlanned ? "planifiées" : "au total"}. Afficher le détail.`, "aria-describedby": tooltip.id, class: "project-monthly-month" });
        target.append(svgNode("rect", { x: left, y: plot.top, width: Math.max(1, right - left), height: plot.height, fill: "transparent" }));
        target.addEventListener("pointerenter", event => show(index, event));
        target.addEventListener("pointerleave", () => { if (pinnedMonth === null) hide(); });
        target.addEventListener("focus", () => { if (skipNextFocus) skipNextFocus = false; else show(index); });
        target.addEventListener("blur", () => { if (pinnedMonth === null) hide(); });
        target.addEventListener("click", event => { if (pinnedMonth === index) hide(); else { pinnedMonth = index; show(index, event); } });
        target.addEventListener("keydown", event => {
          if (event.key === "Escape") { hide(); return; }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault?.();
            if (pinnedMonth === index) hide(); else { pinnedMonth = index; show(index); }
            return;
          }
          const next = event.key === "ArrowRight" ? Math.min(months.length - 1, index + 1) : event.key === "ArrowLeft" ? Math.max(0, index - 1) : event.key === "Home" ? 0 : event.key === "End" ? months.length - 1 : null;
          if (next !== null) { event.preventDefault?.(); activeIndex = next; targets.forEach((element, position) => element.setAttribute("tabindex", position === next ? 0 : -1)); targets[next]?.focus(); }
        });
        targets.push(target); svg.append(target);
      });
      if (focusKey) targets.find(target => target.getAttribute("data-monthly-month") === focusKey)?.focus();
    };
    const mount = () => {
      draw(chart.getBoundingClientRect().width || 800);
      const projectKey = `${selected.id}${isPlanned ? ":planned" : ""}`, revision = numeric(data.monthlyRevealKey) ?? 0;
      let reduced = false;
      try { reduced = Boolean(view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches); } catch (_) {}
      const reveal = () => {
        if (stopped) return;
        revealedMonthlyProjects.set(projectKey, revision); section.setAttribute("data-monthly-reveal", reduced ? "complete" : "running"); observer?.disconnect();
      };
      if (revealedMonthlyProjects.get(projectKey) === revision || reduced || !view) {
        revealedMonthlyProjects.set(projectKey, revision); section.setAttribute("data-monthly-reveal", "complete");
      } else if (view.IntersectionObserver) {
        section.setAttribute("data-monthly-reveal", "pending");
        observer = new view.IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) reveal(); }, { threshold: 0.15 }); observer.observe(chart);
      } else {
        section.setAttribute("data-monthly-reveal", "pending");
        fallbackListener = () => {
          if (stopped || revealedMonthlyProjects.get(projectKey) === revision) return;
          const bounds = chart.getBoundingClientRect();
          if (!Number.isFinite(view.innerHeight) || bounds.top < view.innerHeight && bounds.top + bounds.height > 0) {
            reveal(); view.removeEventListener?.("scroll", fallbackListener); view.removeEventListener?.("resize", fallbackListener);
          }
        };
        view.addEventListener?.("scroll", fallbackListener, { passive: true }); view.addEventListener?.("resize", fallbackListener);
        fallbackListener();
      }
      if (view?.ResizeObserver) {
        resizeObserver = new view.ResizeObserver(entries => {
          if (stopped) return;
          const width = entries[0]?.contentRect?.width || chart.getBoundingClientRect().width;
          if (width > 0 && Math.abs(Math.max(280, Math.min(1200, width)) - measuredWidth) > 1) draw(width);
        }); resizeObserver.observe(chart);
      }
    };
    return { section, toggle, modeInputs, employeeButtons, employeeReset, cleanup, mount,
      focus(key) { (targets.find(target => target.getAttribute("data-monthly-month") === key) || targets.at(-1))?.focus(); }, tableToggle };
  }

  function render(container, options = {}) {
    if (!container) return null;
    const priorTimeline = timelineLifecycles.get(container);
    const priorTimelineFocus = priorTimeline?.host.contains(priorTimeline.host.ownerDocument.activeElement)
      ? priorTimeline.host.ownerDocument.activeElement : null;
    const focusedTimelineId = priorTimelineFocus?.getAttribute?.("data-unit-project-select");
    const focusedTimelineKind = priorTimelineFocus?.getAttribute?.("data-unit-project-kind");
    priorTimeline?.renderer.cleanup?.(priorTimeline.host);
    timelineLifecycles.delete(container);
    monthlyLifecycles.get(container)?.(); monthlyLifecycles.delete(container);
    const doc = container.ownerDocument || document;
    const node = (tag, className, text) => {
      const element = doc.createElement(tag);
      if (className) element.className = className;
      if (text != null) element.textContent = text;
      return element;
    };
    const projects = (Array.isArray(options.projects) ? options.projects : []).slice()
      .filter(project => Number.isSafeInteger(Number(project.id)) && Number(project.id) > 0)
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "fr", { numeric: true }) || Number(a.id) - Number(b.id));
    const selected = options.selectedId == null ? null : projects.find(project => String(project.id) === String(options.selectedId));
    const priorBudget = budgetLifecycles.get(container);
    const closedBudgetTrigger = priorBudget?.renderer?.cleanup?.(priorBudget.host, false) || null;
    budgetLifecycles.delete(container);
    const content = node("div", "project-browser");
    container.setAttribute("aria-busy", String(Boolean(options.loading)));

    if (selected) {
      const previous = Array.from(container.querySelectorAll(".project-browser-detail"))
        .find(element => element.getAttribute("data-selected-project") === String(selected.id));
      const hadHeadingFocus = Array.from(previous?.querySelectorAll(".project-browser-title") || []).includes(doc.activeElement);
      const hadBackFocus = Array.from(previous?.querySelectorAll("[data-project-back]") || []).includes(doc.activeElement);
      const focusedPanel = previous?.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-project-view") : null;
      const focusedBudgetControl = (previous?.contains(doc.activeElement) ?
        ["data-budget-convention-choice", "data-budget-details", "data-budget-retry", "data-budget-exclude-ormitter-costs", "data-budget-show-bw-personnel-costs", "data-budget-code-detail"].map(attribute =>
          ({ attribute, value: doc.activeElement?.getAttribute?.(attribute) })).find(control => control.value !== null) : null) ||
        (closedBudgetTrigger && String(priorBudget.projectId) === String(selected.id) && options.panel === "budget"
          ? { attribute: "data-budget-code-detail", value: closedBudgetTrigger } : null);
      const hadRetryFocus = Array.from(previous?.querySelectorAll(".project-hours-retry") || []).includes(doc.activeElement);
      const hadToggleFocus = Array.from(previous?.querySelectorAll("[data-include-ormitters]") || []).includes(doc.activeElement);
      const hadMonthlyToggleFocus = Array.from(previous?.querySelectorAll("[data-monthly-include-ormitters]") || []).includes(doc.activeElement);
      const focusedMonthlyMode = previous?.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-monthly-mode-choice") : null;
      const focusedMonthlyEmployee = previous?.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-monthly-employee-choice") : null;
      const hadMonthlyResetFocus = Array.from(previous?.querySelectorAll("[data-monthly-employee-reset]") || []).includes(doc.activeElement);
      const hadMonthlyTableFocus = Array.from(previous?.querySelectorAll("[data-monthly-table-toggle]") || []).includes(doc.activeElement);
      const previousMonthly = Array.from(previous?.querySelectorAll("[data-monthly-kind]") || []);
      const focusedMonthlyKind = previousMonthly.find(section => section.contains(doc.activeElement))?.getAttribute("data-monthly-kind") || "actual";
      const tableOpen = kind => previousMonthly.find(section => section.getAttribute("data-monthly-kind") === kind)?.querySelectorAll(".project-monthly-details")[0]?.open === true;
      const focusedMonth = previous?.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-monthly-month") : null;
      const hadPlanningInfoFocus = Array.from(previous?.querySelectorAll("[data-planning-info-control]") || []).includes(doc.activeElement);
      const planningInfoOpen = Array.from(previous?.querySelectorAll("[data-planning-info-popover]") || []).some(element => !element.hidden);
      const focusedPlanningDetail = previous?.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-planning-detail-control") : null;
      const openPlanningDetails = new Set(Array.from(previous?.querySelectorAll("[data-planning-details]") || [])
        .filter(group => group.open).map(group => group.getAttribute("data-planning-details")));
      const focusedEmployee = previous?.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-employee-id") : null;
      const focusedEmployeeKind = focusedEmployee == null ? null : doc.activeElement.getAttribute("data-employee-kind");
      const focusedComparison = focusedEmployee == null ? null : doc.activeElement.getAttribute("data-employee-comparison");
      const detail = node("section", "project-browser-detail");
      detail.setAttribute("data-selected-project", String(selected.id));
      const header = node("div", "project-browser-detail-header");
      const back = node("button", "project-browser-back", "Tous les projets");
      back.type = "button";
      back.setAttribute("data-project-back", "");
      back.addEventListener("click", () => options.onBack?.());
      const heading = node("h2", "project-browser-title", selected.name);
      heading.setAttribute("tabindex", "-1");
      header.append(back, heading);
      const budgetMode = options.panel === "budget";
      if (budgetMode) header.append(node("span", "project-hours-period", "Durée totale du projet"));
      detail.append(header);
      const switcher = node("div", "project-view-switch");
      switcher.setAttribute("role", "group"); switcher.setAttribute("aria-label", "Vue du projet");
      const panelButtons = ["hours", "budget"].map(panel => {
        const button = node("button", "project-view-button", panel === "hours" ? "Heures" : "Budget");
        button.type = "button"; button.setAttribute("data-project-view", panel);
        button.setAttribute("aria-pressed", String((budgetMode ? "budget" : "hours") === panel));
        button.addEventListener("click", () => options.onViewChange?.(panel));
        switcher.append(button); return button;
      });
      detail.append(switcher);
      if (budgetMode) {
        const host = Array.from(previous?.querySelectorAll("[data-budget-host]") || [])[0] || node("div", "project-budget-host");
        host.setAttribute("data-budget-host", "");
        const renderer = options.budgetRenderer || doc.defaultView?.ProjectBudget ||
          (typeof window === "object" ? window.ProjectBudget : null);
        const finance = options.finance || {};
        container.setAttribute("aria-busy", String(Boolean(finance.loading)));
        if (renderer?.render) renderer.render(host, finance.result || null, {
          loading: Boolean(finance.loading), error: finance.error || "",
          selectedConventionId: finance.selectedConventionId,
          excludeOrmitterCosts: finance.excludeOrmitterCosts === true,
          showBwPersonnelCosts: finance.showBwPersonnelCosts === true,
          onRetry: options.onBudgetRetry, onConventionChange: options.onConventionChange,
          onExcludeOrmitterCostsChange: options.onExcludeOrmitterCostsChange,
          onShowBwPersonnelCostsChange: options.onShowBwPersonnelCostsChange
        });
        else host.append(node("p", "project-browser-status", "La vue Budget est indisponible. Rechargez le tableau de bord."));
        detail.append(host);
        budgetLifecycles.set(container, { host, renderer, projectId: selected.id });
        content.append(detail); container.replaceChildren(content);
        if (options.focusDetail || hadHeadingFocus) heading.focus();
        else if (hadBackFocus) back.focus();
        else if (focusedPanel != null) panelButtons.find(button => button.getAttribute("data-project-view") === focusedPanel)?.focus();
        else if (focusedBudgetControl) Array.from(host.querySelectorAll(`[${focusedBudgetControl.attribute}]`))
          .find(control => control.getAttribute(focusedBudgetControl.attribute) === focusedBudgetControl.value)?.focus();
        return content;
      }
      const data = options.detail || {};
      container.setAttribute("aria-busy", String(Boolean(data.loading)));
      const hasCalendarScope = Object.prototype.hasOwnProperty.call(data, "calendarScope");
      const scopedStart = projectDate(data.calendarScope?.startDate), scopedEnd = projectDate(data.calendarScope?.endDate);
      const scopedFraction = numeric(data.calendarScope?.fraction);
      const validCalendarScope = Boolean(scopedStart && scopedEnd && scopedStart.value <= scopedEnd.value && scopedFraction !== null);
      const fraction = hasCalendarScope ? validCalendarScope ? scopedFraction : null :
        numeric(data.calendarFraction) ?? numeric(options.calendarProgress?.(options.years, options.now)?.fraction);
      const comparisons = node("div", "project-hours-comparisons");
      const id = `project-hours-${++renderId}`;
      const employeeTooltip = node("div", "project-hours-employee-tooltip");
      employeeTooltip.id = `${id}-employee-tooltip`;
      employeeTooltip.setAttribute("role", "tooltip");
      employeeTooltip.hidden = true;
      let pinnedEmployee = null, includeToggle = null;
      const hideEmployeeTooltip = (force = false) => {
        if (!force && pinnedEmployee !== null) return;
        pinnedEmployee = null;
        employeeTooltip.hidden = true;
      };
      const employeeAvatar = employee => {
        const avatar = node("span", "project-hours-employee-avatar");
        avatar.style.borderColor = employeeColor(employee.id);
        const fallback = node("span", "project-hours-employee-initials", initials(employee.name));
        fallback.setAttribute("aria-hidden", "true");
        avatar.append(fallback);
        const source = photoSource(employee.photoDataUrl);
        if (source) {
          const photo = node("img", "project-hours-employee-photo");
          photo.src = source; photo.alt = ""; photo.width = 28; photo.height = 28;
          photo.addEventListener("error", () => { photo.hidden = true; });
          avatar.append(photo);
        }
        return avatar;
      };
      const attachEmployeeDetail = (element, employee, comparisonKey) => {
        element.setAttribute("aria-describedby", employeeTooltip.id);
        element.setAttribute("data-employee-comparison", comparisonKey);
        const tooltipKey = `${comparisonKey}:${employee.id}`;
        const show = event => {
          if (pinnedEmployee !== null && pinnedEmployee !== tooltipKey) pinnedEmployee = null;
          employeeTooltip.replaceChildren(node("strong", "", employee.label),
            node("span", "", `${formatHours(employee.actual)} réalisés`),
            node("span", "", comparisonKey === "lifetime" ? "Sur les dates du projet" : "Sur la période sélectionnée"));
          if (employee.isSubcontractor) employeeTooltip.append(node("span", "project-hours-employee-tag", "Ormitter"));
          employeeTooltip.hidden = false;
          const bounds = detail.getBoundingClientRect(), anchor = element.getBoundingClientRect(), own = employeeTooltip.getBoundingClientRect();
          const x = Number.isFinite(event?.clientX) ? event.clientX - bounds.left : anchor.left - bounds.left + anchor.width / 2;
          const y = Number.isFinite(event?.clientY) ? event.clientY - bounds.top : anchor.top - bounds.top + anchor.height / 2;
          employeeTooltip.style.left = `${Math.max(8, Math.min(x + 12, bounds.width - own.width - 8))}px`;
          employeeTooltip.style.top = `${Math.max(8, y + own.height + 24 > bounds.height ? y - own.height - 12 : y + 16)}px`;
        };
        element.addEventListener("pointerenter", show);
        element.addEventListener("pointerleave", () => hideEmployeeTooltip());
        element.addEventListener("focus", () => show());
        element.addEventListener("blur", () => hideEmployeeTooltip(true));
        element.addEventListener("click", event => {
          if (pinnedEmployee === tooltipKey) hideEmployeeTooltip(true);
          else { pinnedEmployee = tooltipKey; show(event); }
        });
      };
      detail.addEventListener("keydown", event => { if (event.key === "Escape") hideEmployeeTooltip(true); });
      const inclusionLabel = data.includeOrmitters ? "Ormitters inclus" : "hors Ormitters";
      for (const [key, title] of [["personal", periodTitle(options.scope, options.years)], ["project", `${periodTitle(options.scope, options.years, "Heures du projet")} · tous les employés (${inclusionLabel})`],
        ["lifetime", `Convention · durée du projet (${inclusionLabel})`]]) {
        const lifetime = key === "lifetime";
        const source = data[key];
        if (key === "personal" && source && numeric(source.planned) === 0 && numeric(source.actual) === 0) continue;
        const startDate = lifetime ? projectDate(source?.startDate) : null, endDate = lifetime ? projectDate(source?.endDate) : null;
        const validDates = Boolean(startDate && endDate && startDate.value <= endDate.value);
        const summary = lifetime && source && !validDates ? { ...source, actual: null, employees: [], calendarFraction: null } : source;
        const comparisonFraction = lifetime ? validDates ? numeric(summary?.calendarFraction) : null : fraction;
        const comparison = node("section", "project-hours-comparison");
        comparison.setAttribute("data-comparison", key);
        comparison.setAttribute("aria-busy", String(!summary && Boolean(data.loading)));
        const titleNode = node("h3", "project-hours-title", title);
        titleNode.id = `${id}-${key}`;
        comparison.setAttribute("aria-labelledby", titleNode.id);
        comparison.append(titleNode);
        if (lifetime) {
          const period = node("p", "project-hours-lifetime-period", validDates ?
            `Du ${startDate.label} au ${endDate.label} · hors période sélectionnée` : "Dates du projet indisponibles · hors période sélectionnée");
          period.setAttribute("data-project-lifetime-period", "");
          comparison.append(period);
        } else if (hasCalendarScope && validCalendarScope) {
          const period = node("p", "project-hours-scale-note",
            `Repère linéaire du ${scopedStart.label} au ${scopedEnd.label} · période sélectionnée dans les dates du projet.`);
          period.setAttribute("data-project-calendar-period", "");
          comparison.append(period);
        }
        if (key === "project" && data.hasOrmitters === true) {
          const toggle = node("label", "project-hours-ormitters-toggle");
          includeToggle = node("input", "project-hours-ormitters-input");
          includeToggle.type = "checkbox";
          includeToggle.checked = data.includeOrmitters === true;
          includeToggle.setAttribute("data-include-ormitters", "");
          includeToggle.addEventListener("change", () => options.onIncludeOrmittersChange?.(includeToggle.checked));
          toggle.append(includeToggle, node("span", "", "Inclure les heures des Ormitters"));
          comparison.append(toggle);
        }
        if (!summary) {
          const skeleton = node("div", "project-hours-skeleton");
          skeleton.setAttribute("aria-hidden", "true");
          for (const label of [lifetime ? "Convention" : "Prévu", "Réalisé"]) {
            const row = node("div", "project-hours-skeleton-row");
            row.append(node("span", "", label), node("span", "project-hours-skeleton-track"));
            skeleton.append(row);
          }
          const status = node("p", "project-hours-unavailable", data.loading ? "Chargement des heures…" : "Heures indisponibles.");
          status.setAttribute("role", "status");
          comparison.append(skeleton, status);
        } else {
          const plan = numeric(summary.planned), actual = numeric(summary.actual);
          const missingBudget = lifetime && !(plan > 0);
          const geometry = missingBudget ? {
            plannedWidth: null, actualWidth: actual === null ? null : actual > 0 ? 100 : 0,
            tickPosition: null, scaleAvailable: false, unplanned: false, capped: false
          } : barGeometry(plan, actual, comparisonFraction);
          if (missingBudget) {
            const budgetStatus = summary.budgetStatus === "unavailable" ? "unavailable" : "empty";
            const message = node("p", "project-hours-budget-missing", budgetStatus === "unavailable" ?
              "Budget personnel BW indisponible. Impossible de lire ce champ dans Odoo." :
              "Budget personnel BW non renseigné. Demandez au MIS de mettre ce champ à jour.");
            message.setAttribute("data-convention-missing", "");
            message.setAttribute("data-convention-status", budgetStatus);
            comparison.append(message);
          }
          const employees = key !== "personal" && Array.isArray(summary.employees) ? summary.employees
            .filter(employee => employee && employee.id != null && numeric(employee.actual) !== null && numeric(employee.actual) !== 0)
            .map(employee => ({ ...employee, actual: numeric(employee.actual), name: String(employee.name || "Employé non identifié") }))
            .sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }) || String(a.id).localeCompare(String(b.id), "fr", { numeric: true })) : [];
          const names = new Map();
          employees.forEach(employee => names.set(employee.name, (names.get(employee.name) || 0) + 1));
          employees.forEach(employee => { employee.label = names.get(employee.name) > 1 ? `${employee.name} (ID ${employee.id})` : employee.name; });
          const employeeTotal = employees.reduce((sum, employee) => sum + employee.actual, 0);
          const negativeContributions = employees.some(employee => employee.actual < 0);
          const reconciled = numeric(summary.actual) !== null && Math.abs(employeeTotal - numeric(summary.actual)) <= 1e-8 * Math.max(1, Math.abs(employeeTotal), Math.abs(numeric(summary.actual)));
          const stacked = employees.length > 0 && !negativeContributions && reconciled && employeeTotal > 0 && geometry.actualWidth > 0;
          const pair = node("div", "project-hours-pair");
          if (missingBudget) pair.classList.add("is-actual-only");
          const labels = node("div", "project-hours-labels");
          const tracks = node("div", "project-hours-tracks");
          const warningStart = key === "personal" && geometry.actualWidth > 0 ? geometry.unplanned ? 0 :
            geometry.scaleAvailable ? Math.min(75, geometry.tickPosition ?? 75) : null : null;
          const hasOverpointing = warningStart !== null && geometry.actualWidth - warningStart > 1e-8;
          if (hasOverpointing) pair.classList.add("has-personal-overpointing");
          tracks.setAttribute("role", stacked ? "group" : "img");
          tracks.setAttribute("aria-label", lifetime ?
            `${title} : ${missingBudget ? "budget conventionnel indisponible" : `${formatHours(plan)} conventionnelles`}, ${formatHours(actual)} réalisés sur les dates du projet à ce jour.` :
            `${title} : ${formatHours(plan)} prévus sur la période, ${formatHours(actual)} réalisés à ce jour.`);
          const rows = [
            ["planned", lifetime ? "Convention" : "Prévu", summary.planned, geometry.plannedWidth],
            ["actual", "Réalisé", summary.actual, geometry.actualWidth]
          ];
          for (const [kind, label, value, width] of missingBudget ? rows.slice(1) : rows) {
            const text = node("div", "project-hours-label");
            text.append(node("span", "", label), node("strong", "", formatHours(value)));
            labels.append(text);
            const track = node("div", `project-hours-track is-${kind}${width === null ? " is-unavailable" : ""}`);
            track.setAttribute("data-hours-kind", kind);
            if (kind !== "actual" || !stacked) track.setAttribute("aria-hidden", "true");
            if (width !== null) {
              const fill = node("span", `project-hours-fill is-${kind}`);
              fill.style.width = `${width}%`;
              fill.setAttribute("data-hours-width", String(width));
              if (kind === "actual" && key === "personal" && (geometry.scaleAvailable || geometry.unplanned)) {
                fill.classList.add("is-personal-segmented");
                const end = geometry.actualWidth;
                const normalEnd = geometry.unplanned ? 0 : Math.min(end, geometry.tickPosition ?? 75);
                const orangeEnd = geometry.unplanned ? 0 : Math.min(end, 75);
                for (const [name, from, to] of [["standard", 0, normalEnd], ["above-today", normalEnd, orangeEnd], ["above-plan", orangeEnd, end]]) {
                  if (!(to > from) || !(end > 0)) continue;
                  const segment = node("span", `project-hours-personal-segment is-${name}`);
                  segment.style.width = `${100 * (to - from) / end}%`;
                  segment.setAttribute("data-personal-actual-segment", name);
                  segment.setAttribute("data-personal-segment-width", String(to - from)); fill.append(segment);
                }
              } else if (kind === "actual" && stacked) {
                fill.classList.add("is-stacked");
                fill.setAttribute("data-employee-total", String(employeeTotal));
                let used = 0;
                employees.forEach((employee, index) => {
                  const share = index === employees.length - 1 ? 100 - used : employee.actual / employeeTotal * 100;
                  used += share;
                  const segment = node("button", "project-hours-employee-segment");
                  segment.type = "button";
                  segment.style.width = `${share}%`;
                  segment.style.backgroundColor = employeeColor(employee.id);
                  segment.setAttribute("data-employee-id", String(employee.id));
                  segment.setAttribute("data-employee-kind", "segment");
                  segment.setAttribute("data-employee-share", String(share));
                  segment.setAttribute("aria-label", `${employee.label} : ${formatHours(employee.actual)} réalisés`);
                  attachEmployeeDetail(segment, employee, key);
                  const callout = node("span", "project-hours-employee-callout");
                  callout.setAttribute("aria-hidden", "true");
                  callout.append(employeeAvatar(employee), node("span", "project-hours-employee-callout-name", employee.label));
                  segment.append(callout);
                  fill.append(segment);
                });
              } else if (kind === "actual" && negativeContributions) fill.classList.add("is-net-actual");
              track.append(fill);
            }
            tracks.append(track);
          }
          if (geometry.tickPosition !== null) {
            const tick = node("span", "project-hours-date-tick");
            tick.style.left = `${geometry.tickPosition}%`;
            tick.setAttribute("data-calendar-position", String(geometry.tickPosition));
            tick.setAttribute("aria-hidden", "true");
            tick.append(node("span", "project-hours-date-label", "Aujourd’hui"));
            tracks.append(tick);
            tracks.setAttribute("aria-label", tracks.getAttribute("aria-label") + ` Repère du jour : ${percentFormat.format(Math.min(1, Math.max(0, comparisonFraction)))} de la période écoulée.`);
          }
          if (hasOverpointing) {
            const badge = node("span", `project-hours-overpointing${geometry.unplanned || geometry.actualWidth > 75 ? " is-over-plan" : ""}`, "Surpointage");
            badge.setAttribute("data-personal-surpointage", "");
            badge.style.left = `clamp(44px, ${(warningStart + geometry.actualWidth) / 2}%, calc(100% - 44px))`;
            badge.setAttribute("aria-hidden", "true"); tracks.append(badge);
            tracks.setAttribute("aria-label", tracks.getAttribute("aria-label") +
              `${geometry.unplanned || geometry.actualWidth > 75 ? " Surpointage : le réalisé dépasse le maximum planifié de la période (rouge)." : ""}` +
              `${geometry.tickPosition !== null && geometry.actualWidth > geometry.tickPosition && geometry.tickPosition < 75 ? " Surpointage : le réalisé dépasse le repère linéaire d’aujourd’hui (orange)." : ""}`);
          }
          pair.append(labels, tracks);
          comparison.append(pair);
          const note = missingBudget ? "Répartition du réalisé · sans échelle conventionnelle." : lifetime ?
            "Convention : Budget personnel BW, réparti linéairement sur les dates du projet ; le repère du jour suit le calendrier." :
            geometry.scaleAvailable ? hasCalendarScope ? validCalendarScope ?
              "Prévu réparti linéairement sur la période sélectionnée, dans les dates du projet ; le repère du jour suit cette période." :
              "Prévu sur la période sélectionnée ; repère linéaire indisponible sans dates valides du projet." :
              "Prévu réparti linéairement sur la période sélectionnée ; le repère du jour suit le calendrier." :
            geometry.unplanned ? "Hors planning · aucune heure prévue sur la période." : plan === null ? "Planning indisponible · échelle de comparaison indisponible." :
              plan < 0 ? "Planning net négatif après corrections · échelle de comparaison indisponible." : "Aucune heure prévue · échelle de comparaison indisponible.";
          comparison.append(node("p", "project-hours-scale-note", note));
          if (lifetime && !validDates) comparison.append(node("p", "project-hours-date-warning", "Dates du projet absentes ou invalides ; le réalisé est indisponible."));
          if (!lifetime && hasCalendarScope && !validCalendarScope) comparison.append(node("p", "project-hours-date-warning",
            "Repère du jour indisponible · dates du projet absentes, invalides ou hors de la période sélectionnée."));
          if (key !== "personal" && employees.length) {
            if (negativeContributions) comparison.append(node("p", "project-hours-breakdown-note", "La barre montre le réalisé net. Les corrections négatives restent dans le détail signé ; elles ne sont pas dessinées comme des surfaces positives."));
            else if (!reconciled) comparison.append(node("p", "project-hours-breakdown-note", "Le détail par employé ne se réconcilie pas avec le total affiché ; la barre conserve le total net."));
            const legend = node("ul", "project-hours-employees");
            legend.setAttribute("aria-label", "Heures réalisées par employé");
            employees.forEach(employee => {
              const item = node("li", "project-hours-employee-item");
              const button = node("button", "project-hours-employee-key");
              button.type = "button";
              button.setAttribute("data-employee-id", String(employee.id));
              button.setAttribute("data-employee-kind", "legend");
              button.setAttribute("data-employee-actual", String(employee.actual));
              button.setAttribute("aria-label", `${employee.label} : ${formatHours(employee.actual)} réalisés. Afficher le détail.`);
              const dot = node("span", "project-hours-employee-dot");
              dot.style.backgroundColor = employeeColor(employee.id); dot.setAttribute("aria-hidden", "true");
              const text = node("span", "project-hours-employee-text");
              text.append(node("span", "project-hours-employee-name", employee.label));
              if (employee.isSubcontractor) text.append(node("span", "project-hours-employee-tag", "Ormitter"));
              button.append(dot, employeeAvatar(employee), text, node("strong", "project-hours-employee-hours", formatHours(employee.actual)));
              attachEmployeeDetail(button, employee, key);
              item.append(button); legend.append(item);
            });
            const detailedTotal = node("p", "project-hours-employees-total", `Total réalisé détaillé : ${formatHours(employeeTotal)}`);
            detailedTotal.setAttribute("data-employee-total", String(employeeTotal));
            comparison.append(legend, detailedTotal);
          }
          const baseline = lifetime ? "de la convention" : "du prévu";
          if (geometry.capped) comparison.append(node("p", "project-hours-badge is-capped", `Barre plafonnée · +${formatHours(actual - plan)} au-delà ${baseline}`));
          else if (plan > 0 && actual > plan) comparison.append(node("p", "project-hours-badge", `+${formatHours(actual - plan)} au-delà ${baseline}`));
          else if (plan > 0 && actual !== null && actual < plan) {
            const end = key === "personal" ? selectedPeriodEnd(options.scope, options.years) : null;
            const text = key === "personal" ? `Plus que ${formatHours(plan - actual)} prévues disponibles${end ? ` d’ici au ${end.label}`
              : " sur la période sélectionnée (date de fin indisponible)"}` : `−${formatHours(plan - actual)} en-dessous ${baseline}`;
            comparison.append(node("p", "project-hours-badge is-below", text));
          }
          if (actual !== null && actual < 0) comparison.append(node("p", "project-hours-credit", "Réalisé négatif après corrections ; le total signé est conservé."));
          const warnings = Array.isArray(summary.warnings) ? summary.warnings : typeof summary.warnings === "string" ? [summary.warnings] : [];
          if (warnings.length) {
            const warningList = node("ul", "project-hours-warnings");
            Array.from(new Set(warnings.filter(warning => typeof warning === "string" && warning.trim())))
              .forEach(warning => warningList.append(node("li", "", warning)));
            comparison.append(warningList);
          }
        }
        comparisons.append(comparison);
      }
      const overview = node("section", "project-browser-section project-browser-overview");
      const overviewTitle = node("h3", "project-browser-section-title", "Projets · 01 / Vue d’ensemble"); overviewTitle.id = `${id}-overview`;
      const planningInfo = planningInfoView(node, data, id, openPlanningDetails, planningInfoOpen);
      overview.setAttribute("aria-labelledby", overviewTitle.id); overview.append(overviewTitle, planningInfo.section, comparisons); detail.append(overview);
      detail.append(employeeTooltip);
      const monthly = monthlyView(doc, node, selected, data, options, employeeAvatar, id, focusedMonthlyKind === "actual" ? focusedMonth : null, tableOpen("actual"));
      const plannedMonthly = Object.hasOwn(data, "plannedMonthly") ? monthlyView(doc, node, selected, data, options, employeeAvatar, id,
        focusedMonthlyKind === "planned" ? focusedMonth : null, tableOpen("planned"), "planned") : null;
      detail.append(monthly.section); if (plannedMonthly) detail.append(plannedMonthly.section);
      monthlyLifecycles.set(container, () => { monthly.cleanup(); plannedMonthly?.cleanup(); planningInfo.cleanup(); });
      const focusedMonthlyView = focusedMonthlyKind === "planned" ? plannedMonthly || monthly : monthly;
      let retryButton = null;
      if (data.error) {
        const failure = node("div", "project-hours-error");
        const message = node("p", "", data.error);
        message.setAttribute("role", "alert");
        failure.append(message);
        if (typeof options.onRetry === "function") {
          const retry = node("button", "project-browser-back project-hours-retry", "Réessayer");
          retry.type = "button";
          retry.disabled = Boolean(data.loading);
          retry.addEventListener("click", () => options.onRetry());
          failure.append(retry);
          retryButton = retry;
        }
        detail.append(failure);
      }
      content.append(detail);
      container.replaceChildren(content);
      monthly.mount(); plannedMonthly?.mount();
      if (options.focusDetail || hadHeadingFocus) heading.focus();
      else if (hadBackFocus) back.focus();
      else if (focusedPanel != null) panelButtons.find(button => button.getAttribute("data-project-view") === focusedPanel)?.focus();
      else if (hadPlanningInfoFocus) planningInfo.infoButton.focus();
      else if (focusedPlanningDetail != null) (planningInfo.controls.get(focusedPlanningDetail) || heading).focus();
      else if (hadRetryFocus) (retryButton || heading).focus();
      else if (hadToggleFocus) (includeToggle || heading).focus();
      else if (hadMonthlyToggleFocus) (focusedMonthlyView.toggle || heading).focus();
      else if (focusedMonthlyMode !== null) (focusedMonthlyView.modeInputs?.find(input => input.value === focusedMonthlyMode) || heading).focus();
      else if (focusedMonthlyEmployee !== null) (focusedMonthlyView.employeeButtons?.find(button => button.getAttribute("data-monthly-employee-choice") === focusedMonthlyEmployee) || focusedMonthlyView.employeeButtons?.[0] || heading).focus();
      else if (hadMonthlyResetFocus) (focusedMonthlyView.employeeReset || focusedMonthlyView.employeeButtons?.[0] || heading).focus();
      else if (hadMonthlyTableFocus) (focusedMonthlyView.tableToggle || heading).focus();
      else if (focusedMonth !== null) focusedMonthlyView.focus(focusedMonth);
      else if (focusedEmployee !== null) {
        const employeeButtons = Array.from(detail.querySelectorAll("[data-employee-id]"))
          .filter(button => button.getAttribute("data-employee-comparison") === focusedComparison);
        const sameKind = employeeButtons.find(button => button.getAttribute("data-employee-id") === focusedEmployee && button.getAttribute("data-employee-kind") === focusedEmployeeKind);
        (sameKind || employeeButtons.find(button => button.getAttribute("data-employee-id") === focusedEmployee) || includeToggle || heading).focus();
      }
      return content;
    }

    if (options.error || options.loading || !projects.length) {
      const status = node("p", "project-browser-status", options.error ||
        (options.loading ? "Chargement de mes projets…" : "Aucun projet avec des heures prévues ou réalisées sur cette période."));
      status.setAttribute("role", "status");
      content.append(status);
    }
    if (projects.length) {
      const grid = node("fieldset", "project-browser-grid");
      grid.append(node("legend", "project-browser-sr-only", "Choisir un projet"));
      projects.forEach(project => {
        const tile = node("label", "project-browser-tile");
        const input = node("input", "project-browser-radio");
        input.type = "radio";
        input.name = "personal-project";
        input.value = String(project.id);
        input.setAttribute("aria-label", project.name);
        input.setAttribute("data-project-choice", String(project.id));
        input.addEventListener("change", () => { if (input.checked) options.onSelect?.(project.id); });
        const manager = project.manager;
        const avatar = node("span", "project-browser-avatar");
        avatar.title = manager?.name ? `Responsable : ${manager.name}` : "Responsable indisponible";
        const fallback = node("span", "project-browser-initials", initials(manager?.name));
        fallback.setAttribute("aria-hidden", "true");
        avatar.append(fallback);
        const source = photoSource(manager?.photoDataUrl);
        if (source) {
          const image = node("img", "project-browser-photo");
          image.src = source;
          image.alt = manager?.name ? `Photo de ${manager.name}` : "Photo du responsable";
          image.width = 56;
          image.height = 56;
          image.addEventListener("error", () => { image.hidden = true; });
          avatar.append(image);
        }
        ProjectCard.mount(tile, input, project, [avatar, ProjectCard.createTitle(doc, project, "project-browser-name")]);
        grid.append(tile);
      });
      content.append(grid);
    }
    const timelineRenderer = options.timelineRenderer;
    const timelineHost = projects.length && typeof timelineRenderer?.renderTimeline === "function"
      ? node("div", "project-browser-calendar") : null;
    if (timelineHost) { timelineHost.setAttribute("data-project-timeline", ""); content.append(timelineHost); }
    container.replaceChildren(content);
    if (timelineHost) {
      timelineLifecycles.set(container, { renderer: timelineRenderer, host: timelineHost });
      timelineRenderer.renderTimeline(timelineHost, projects, {
        heading: "Projets · 02 / Calendrier des projets", now: options.now, onSelect: options.onSelect,
        focusProjectId: options.focusProjectId == null ? focusedTimelineId : null, focusKind: focusedTimelineKind
      });
    }
    if (options.focusProjectId != null) {
      Array.from(content.querySelectorAll("[data-project-choice]"))
        .find(input => input.getAttribute("data-project-choice") === String(options.focusProjectId))?.focus();
    }
    return content;
  }

  function cleanup(container) {
    const timeline = timelineLifecycles.get(container);
    timeline?.renderer.cleanup?.(timeline.host);
    timelineLifecycles.delete(container);
    monthlyLifecycles.get(container)?.(); monthlyLifecycles.delete(container);
    const budget = budgetLifecycles.get(container);
    budget?.renderer?.cleanup?.(budget.host, false);
    budgetLifecycles.delete(container);
  }

  return { render, cleanup, barGeometry, monthlyGeometry, periodTitle };
});
