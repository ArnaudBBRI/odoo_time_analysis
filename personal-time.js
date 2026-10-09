(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PersonalTime = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TAU = Math.PI * 2;
  const MAX_YEARS = 150;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const PALETTE = ["#008bab", "#1c9c8c", "#6368ae", "#cd8747", "#b65c7b", "#488c62",
    "#5b88b4", "#8865a5", "#bc7057", "#86933f", "#448d8d", "#637d94"];
  const projectColors = new Map(), assignedColors = new Set();
  let extraColorIndex = 0;
  const numberFormat = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 1 });
  const percentFormat = new Intl.NumberFormat("fr-BE", { style: "percent", maximumFractionDigits: 0 });
  const brusselsFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit"
  });
  let renderId = 0;

  function hours(value) {
    if (typeof value !== "number" && typeof value !== "string") return 0;
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
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
    const year = Number(value);
    return Number.isInteger(year) && year >= 1 && year <= 9998 ? year : null;
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

  function calendarProgress(years, now = new Date()) {
    const selected = Array.from(new Set(Array.from(years || []).map(validYear)
      .filter(year => year !== null))).sort((a, b) => a - b).slice(0, MAX_YEARS);
    const today = dateKey(now);
    if (!selected.length || !today) return null;
    // Treat Brussels calendar dates as UTC ordinals so DST does not change
    // the weight of a day. Unselected years contribute no elapsed time.
    const day = new Date(`${today}T00:00:00Z`).getTime();
    let totalDays = 0, elapsedDays = 0;
    for (const year of selected) {
      const start = yearStart(year), end = yearStart(year + 1);
      totalDays += (end - start) / 864e5;
      elapsedDays += Math.max(0, Math.min(day, end) - start) / 864e5;
    }
    // Day-position anchors Jan 1 at the center and the final Dec 31 at the rim.
    const fraction = Math.max(0, Math.min(1, elapsedDays / (totalDays - 1)));
    return { fraction, radiusRatio: Math.sqrt(fraction) };
  }

  function projectCalendarProgress(years, startDate, endDate, now = new Date()) {
    const projectDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && !value.startsWith("0000") ? dateKey(value) : null;
    const first = projectDate(startDate), last = projectDate(endDate);
    const today = typeof now === "boolean" ? null : dateKey(now);
    if (!first || !last || first > last || !today) return null;
    const selected = Array.from(new Set(Array.from(years || []).map(validYear)
      .filter(year => year !== null))).sort((a, b) => a - b).slice(0, MAX_YEARS);
    const projectStart = Date.parse(`${first}T00:00:00Z`);
    const projectEnd = Date.parse(`${last}T00:00:00Z`) + 864e5;
    const periods = selected.map(year => ({
      start: Math.max(projectStart, yearStart(year)), end: Math.min(projectEnd, yearStart(year + 1))
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

  function summarizeProjects(data, years, now = new Date()) {
    const selected = new Set(Array.from(years == null ? availableYears(data) : years)
      .map(validYear).filter(year => year !== null).slice(0, MAX_YEARS));
    if (!selected.size) return [];
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
          name: String(source?.name || record.project || (key === "unassigned" ? "Sans projet" : `Projet ${key}`)),
          planned: knownPlanning ? 0 : null, actual: 0, involved: true
        });
      }
      return projects.get(key);
    };
    for (const line of data?.timesheets?.lines || []) {
      const key = dateKey(line.date);
      if (!key || !selected.has(Number(key.slice(0, 4)))) continue;
      const project = ensureProject(line);
      if (today && key <= today) project.actual += hours(line.hours);
    }
    if (knownPlanning) {
      for (const slot of data.planning.slots) {
        const period = slotPeriod(slot);
        if (!period) continue;
        let overlap = 0;
        for (const year of selected) {
          overlap += Math.max(0, Math.min(period.end, yearStart(year + 1)) - Math.max(period.start, yearStart(year)));
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
    return value == null ? "Indisponible" : `${numberFormat.format(hours(value))} h`;
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
    const calendar = calendarProgress(options.years, options.now);
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
    headingText.append(node("p", "personal-time-eyebrow", "Mon temps"),
      node("h2", "personal-time-title", options.title || "Vue d’ensemble"),
      node("p", "personal-time-description", "Le prévu dessine les parts ; le réalisé les remplit, jusqu’à aujourd’hui."));
    heading.append(headingText);
    if (options.scopeLabel) heading.append(node("span", "personal-time-period", options.scopeLabel));
    if (!options.embedded) card.append(heading);
    else if (options.scopeLabel) card.append(node("span", "personal-time-period personal-time-embedded-period", options.scopeLabel));

    const metrics = node("div", "personal-time-metrics");
    const known = visible.filter(project => project.planned != null);
    const planned = known.reduce((sum, project) => sum + hours(project.planned), 0);
    const actual = visible.reduce((sum, project) => sum + hours(project.actual), 0);
    for (const [label, value, detail] of [
      ["Prévu sur la période", visible.length && !known.length ? null : planned, known.length < visible.length ? "Planning partiel ou indisponible" : "Sur les projets affichés"],
      ["Réalisé à ce jour", actual, "Corrections d’heures incluses"]
    ]) {
      const metric = node("div", "personal-time-metric");
      metric.append(node("span", "personal-time-metric-label", label), node("strong", "personal-time-metric-value", formatHours(value)),
        node("span", "personal-time-metric-note", detail));
      metrics.append(metric);
    }
    card.append(metrics);

    const body = node("div", "personal-time-body");
    const chartArea = node("div", "personal-time-chart-area");
    const legendArea = node("div", "personal-time-legend-area");
    const legendHeading = node("div", "personal-time-legend-heading");
    legendHeading.append(node("h3", "personal-time-legend-title", "Mes projets"),
      node("span", "personal-time-project-count", `${visible.length} / ${list.length} affichés`));
    legendArea.append(legendHeading, node("p", "personal-time-legend-help", "Sélectionnez un projet pour le masquer ou l’afficher."));
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
      for (const [label, value] of [["Prévu sur la période", project.planned], ["Réalisé à ce jour", project.actual]]) {
        const row = node("div", "personal-time-tooltip-row");
        row.append(node("span", "", label), node("strong", "", formatHours(value)));
        tooltip.append(row);
      }
      if (project.planned != null && hours(project.actual) > Math.max(0, hours(project.planned))) {
        tooltip.append(node("p", "personal-time-tooltip-overrun", `+${formatHours(hours(project.actual) - Math.max(0, hours(project.planned)))} au-delà du prévu`));
      } else if (hours(project.actual) < 0) {
        tooltip.append(node("p", "personal-time-tooltip-note", "Solde réalisé négatif après corrections."));
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
        "aria-label": "Répartition des heures prévues par projet et réalisé à ce jour" });
      const defs = svgNode("defs");
      svg.append(defs);
      sectors.forEach((sector, index) => {
        const color = colorFor(sector.id), radius = 190 * sector.fillRadiusRatio;
        const group = svgNode("g", { class: "personal-time-sector", tabindex: "0", role: "button",
          "data-personal-sector": sector.id,
          "aria-label": `${sector.name} : ${formatHours(sector.planned)} prévus, ${formatHours(sector.actual)} réalisés. Afficher le détail.` });
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
          "aria-label": `Repère calendaire : ${percentFormat.format(calendar.fraction)} de la période écoulée. Référence linéaire sur les années sélectionnées.` });
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
      for (const [className, label] of [["is-planned", "Prévu"], ["is-actual", "Réalisé à ce jour"]]) {
        const item = node("span", "personal-time-key-item");
        item.append(node("span", `personal-time-key-swatch ${className}`), node("span", "", label));
        key.append(item);
      }
      if (calendar) {
        const item = node("span", "personal-time-key-item");
        item.append(node("span", "personal-time-key-swatch is-today"),
          node("span", "", `Repère du jour · ${percentFormat.format(calendar.fraction)}`));
        key.append(item);
      }
      chartArea.append(key, node("p", "personal-time-chart-note", "La surface colorée représente le réalisé. Les dépassements restent indiqués dans la légende." +
        (calendar ? " Le cercle suit le calendrier de façon linéaire, indépendamment des dates du planning." : "")));
    } else {
      const allHidden = list.length > 0 && !visible.length;
      const unknown = visible.some(project => project.planned == null);
      const empty = node("div", "personal-time-chart-empty");
      empty.append(node("span", "personal-time-empty-symbol", "◌"),
        node("strong", "", allHidden ? "Tous les projets sont masqués" : !list.length ? "Aucune heure pour cette période" : unknown ? "Planning indisponible" : "Aucune heure prévue"),
        node("p", "", allHidden ? "Affichez un projet dans la légende pour retrouver le graphique." : !list.length ? "Choisissez une autre période ou actualisez vos données." : "Le réalisé reste disponible dans la légende ; aucune répartition prévue ne peut être dessinée."));
      if (allHidden) {
        const restore = node("button", "personal-time-restore", "Tout afficher");
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
      button.setAttribute("aria-label", `${shown ? "Masquer" : "Afficher"} ${project.name} : ${formatHours(project.planned)} prévus, ${formatHours(project.actual)} réalisés`);
      const dot = node("span", "personal-time-legend-dot");
      dot.style.backgroundColor = colorFor(project.id);
      dot.setAttribute("aria-hidden", "true");
      const text = node("span", "personal-time-legend-text");
      text.append(node("span", "personal-time-legend-name", project.name),
        node("span", "personal-time-legend-values", `${formatHours(project.actual)} réalisés · ${formatHours(project.planned)} prévus`));
      if (project.planned == null) text.append(node("span", "personal-time-legend-badge is-unknown", "Planning indisponible"));
      else if (hours(project.planned) <= 0 && hours(project.actual) > 0) text.append(node("span", "personal-time-legend-badge is-overrun", "Sans heures prévues"));
      else if (hours(project.actual) > hours(project.planned)) text.append(node("span", "personal-time-legend-badge is-overrun", `+${formatHours(hours(project.actual) - hours(project.planned))} au-delà du prévu`));
      if (hours(project.actual) < 0) text.append(node("span", "personal-time-legend-badge is-credit", "Correction nette"));
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
      { key: "planned", label: "Projets avec heures prévues", projects: plannedProjects },
      { key: "unknown", label: "Planning indisponible", projects: unknownProjects },
      { key: "corrections", label: correctedProjects.every(project => hours(project.planned) < 0) ? "Corrections de planning" : "Aucune heure prévue", projects: correctedProjects },
      { key: "unplanned", label: "Hors planning", projects: unplannedProjects }
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
          total.setAttribute("aria-label", `Réalisé hors planning sur les projets affichés : ${formatHours(subtotal)}`);
          total.append(node("strong", "", formatHours(subtotal)), node("span", "", "réalisés affichés"));
          groupHeading.append(total);
        }
        section.append(groupHeading);
      }
      group.projects.forEach(project => legend.append(legendItem(project)));
      section.append(legend);
      legendArea.append(section);
    });
    if (!list.length) legendArea.append(node("p", "personal-time-legend-empty", "Aucun projet impliqué dans la période sélectionnée."));

    const focusedId = container.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-personal-id") : null;
    container.replaceChildren(card);
    if (focusedId !== null) {
      const buttons = legendArea.querySelectorAll("[data-personal-id]");
      Array.from(buttons).find(button => button.getAttribute("data-personal-id") === focusedId)?.focus({ preventScroll: true });
    }
    return card;
  }

  return { availableYears, calendarProgress, projectCalendarProgress, summarizeProjects, buildSectors, render };
});
