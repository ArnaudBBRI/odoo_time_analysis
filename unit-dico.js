(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./project-card") : root.ProjectCard);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.UnitDico = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (ProjectCard) {
  "use strict";

  const DAY = 86400000;
  const COMPLETED_COLOR = "#98a2ab";
  const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const brusselsFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit"
  });
  const timelineLifecycles = new WeakMap();
  let renderId = 0;

  function isExcludedProjectName(value) {
    if (typeof value !== "string") return false;
    return ["interne", "overhead"].includes(value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .trim().toLocaleLowerCase("fr").replace(/\s+/g, " ").replace(/^(?:\[\d+\]|\d+)(?:\s*[-:·/]\s*|\s+)/, "").trim());
  }

  function exactId(value) {
    if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  function projectDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) return null;
    const time = Date.parse(`${value}T00:00:00Z`);
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) return null;
    return { value, day: time / DAY, label: `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` };
  }

  function currentDate(value) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return projectDate(value);
    if (!(value instanceof Date) && typeof value !== "string" && typeof value !== "number") return null;
    const instant = new Date(value);
    if (!Number.isFinite(instant.getTime())) return null;
    const parts = Object.fromEntries(brusselsFormat.formatToParts(instant).map(part => [part.type, part.value]));
    return projectDate(`${parts.year}-${parts.month}-${parts.day}`);
  }

  function normalizeProjects(input) {
    const seen = new Set();
    return (Array.isArray(input) ? input : []).flatMap(project => {
      if (!project || typeof project !== "object") return [];
      const id = exactId(project.id);
      if (id === null || seen.has(id) || isExcludedProjectName(project.name) || isExcludedProjectName(project.display_name)) return [];
      seen.add(id);
      return [{ ...project, id, name: typeof project.name === "string" && project.name.trim() ? project.name : `Projet ${id}` }];
    }).sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }) || a.id - b.id);
  }

  function colorFor(id) {
    let hash = 2166136261;
    for (const character of String(id)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
    return `hsl(${(hash % 360000 / 1000).toFixed(3)} 53% 43%)`;
  }

  function dateAt(day) { return new Date(day * DAY).toISOString().slice(0, 10); }

  function axisTicks(min, max, days) {
    const first = new Date(min * DAY), last = new Date(max * DAY);
    const firstMonth = first.getUTCFullYear() * 12 + first.getUTCMonth();
    const lastMonth = last.getUTCFullYear() * 12 + last.getUTCMonth();
    const months = lastMonth - firstMonth + 1;
    const step = [1, 2, 3, 6, 12, 24, 60, 120, 240, 600, 1200].find(value => months / value <= 7) || 1200;
    const ticks = [{ date: dateAt(min), position: 0, label: projectDate(dateAt(min)).label, edge: "start" }];
    let previous = 0;
    for (let month = Math.ceil((firstMonth + 1) / step) * step; month <= lastMonth; month += step) {
      const year = Math.floor(month / 12), index = month % 12;
      const day = projectDate(`${String(year).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}-01`)?.day;
      if (day == null) continue;
      const position = (day - min) / days * 100;
      if (position < 10 || position > 90 || position - previous < 12) continue;
      ticks.push({ date: dateAt(day), position, label: step >= 12 ? String(year) : `${MONTHS[index]} ${year}`, edge: null });
      previous = position;
    }
    ticks.push({ date: dateAt(max), position: 100, label: projectDate(dateAt(max)).label, edge: "end" });
    return ticks;
  }

  function buildTimeline(input, now = new Date()) {
    const projects = normalizeProjects(input);
    const today = currentDate(now);
    const rows = projects.map(project => {
      const start = projectDate(project.startDate), end = projectDate(project.endDate);
      const reversed = Boolean(start && end && end.day < start.day);
      return { ...project, start, end, color: colorFor(project.id),
        completed: Boolean(today && end && !reversed && end.day < today.day),
        status: reversed ? "reversed" : start && end ? "available" : "unavailable" };
    }).filter(row => !row.end?.value.startsWith("2999-"))
      .sort((a, b) => Number(a.completed) - Number(b.completed) ||
        (a.start?.day ?? Infinity) - (b.start?.day ?? Infinity) || a.name.localeCompare(b.name, "fr", { numeric: true }) || a.id - b.id);
    const starts = rows.filter(row => row.status !== "reversed" && row.start).map(row => row.start.day);
    const ends = rows.filter(row => row.status !== "reversed" && row.end).map(row => row.end.day);
    const min = starts.length ? Math.min(...starts) : null, max = ends.length ? Math.max(...ends) : null;
    const available = min !== null && max !== null && max >= min;
    const days = available ? max - min + 1 : null;
    return { projects, rows: rows.map(row => ({ ...row,
      left: available && row.status === "available" ? (row.start.day - min) / days * 100 : null,
      width: available && row.status === "available" ? (row.end.day - row.start.day + 1) / days * 100 : null })),
      available, startDate: min === null ? null : dateAt(min), endDate: max === null ? null : dateAt(max), days,
      today: today ? { date: today.value, label: today.label,
        position: available && today.day >= min && today.day <= max ? (today.day - min) / days * 100 : null } : null,
      ticks: available ? axisTicks(min, max, days) : [] };
  }

  function concurrencyFromTimeline(timeline) {
    const intervals = timeline.rows.filter(row => row.status === "available");
    const result = { available: false, startDate: timeline.startDate, endDate: timeline.endDate,
      days: timeline.days, ticks: timeline.ticks, today: timeline.today, months: [], maxCount: null,
      includedCount: intervals.length, omittedCount: timeline.rows.length - intervals.length };
    if (!timeline.available || !intervals.length) return result;
    const min = projectDate(timeline.startDate).day, max = projectDate(timeline.endDate).day;
    const first = new Date(min * DAY), last = new Date(max * DAY);
    const firstMonth = first.getUTCFullYear() * 12 + first.getUTCMonth();
    const lastMonth = last.getUTCFullYear() * 12 + last.getUTCMonth();
    // Keep malformed centuries-long periods from creating an unbounded monthly UI.
    if (lastMonth - firstMonth >= 2400) return { ...result, reason: "range-too-long" };
    const events = new Map();
    for (const row of intervals) {
      events.set(row.start.day, (events.get(row.start.day) || 0) + 1);
      events.set(row.end.day + 1, (events.get(row.end.day + 1) || 0) - 1);
    }
    const changes = [...events].sort((a, b) => a[0] - b[0]);
    const months = [];
    let active = 0, cursor = 0, maxCount = 0;
    for (let index = firstMonth; index <= lastMonth; index++) {
      const year = Math.floor(index / 12), monthIndex = index % 12;
      const month = `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}`;
      const date = new Date(`${month}-01T00:00:00Z`);
      const start = Math.max(min, date.getTime() / DAY);
      date.setUTCMonth(date.getUTCMonth() + 1);
      const end = Math.min(max, date.getTime() / DAY - 1);
      while (cursor < changes.length && changes[cursor][0] <= start) active += changes[cursor++][1];
      let count = active;
      while (cursor < changes.length && changes[cursor][0] <= end) {
        active += changes[cursor++][1]; count = Math.max(count, active);
      }
      maxCount = Math.max(maxCount, count);
      months.push({ month, label: `${MONTHS[monthIndex]} ${year}`, startDate: dateAt(start), endDate: dateAt(end),
        position: (start - min) / timeline.days * 100, width: (end - start + 1) / timeline.days * 100, count });
    }
    return { ...result, available: true, months, maxCount };
  }

  function buildConcurrency(input, now = new Date()) { return concurrencyFromTimeline(buildTimeline(input, now)); }

  function cleanup(container) {
    timelineLifecycles.get(container)?.();
    timelineLifecycles.delete(container);
  }

  function mountTimelineBars(container, bars) {
    if (!bars.length) return;
    const view = container.ownerDocument?.defaultView;
    let observer = null, stopped = false;
    const pending = new Set(bars);
    timelineLifecycles.set(container, () => { stopped = true; observer?.disconnect(); });
    for (const bar of bars) {
      bar.setAttribute("data-unit-timeline-reveal", "complete");
      bar.querySelectorAll(".unit-dico-timeline-fill")[0]?.addEventListener("animationend", event => {
        if (!stopped && event.target === bar.querySelectorAll(".unit-dico-timeline-fill")[0] &&
          (!event.animationName || event.animationName === "unit-dico-bar-fill")) bar.setAttribute("data-unit-timeline-reveal", "complete");
      });
    }
    let reduced = false;
    try { reduced = Boolean(view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches); } catch (_) {}
    if (reduced || !view?.IntersectionObserver) return;
    try {
      observer = new view.IntersectionObserver(entries => {
        if (stopped) return;
        for (const entry of entries) {
          if (!entry.isIntersecting || !pending.delete(entry.target)) continue;
          entry.target.setAttribute("data-unit-timeline-reveal", "running");
          observer.unobserve(entry.target);
        }
        if (!pending.size) observer.disconnect();
      }, { threshold: 0 });
      for (const bar of bars) { bar.setAttribute("data-unit-timeline-reveal", "pending"); observer.observe(bar); }
    } catch (_) {
      observer?.disconnect();
      for (const bar of bars) bar.setAttribute("data-unit-timeline-reveal", "complete");
    }
  }

  function photoSource(value) {
    return typeof value === "string" && value.length <= 400000 &&
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : null;
  }

  function initials(name) {
    return String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => Array.from(part)[0]).join("").toLocaleUpperCase("fr") || "?";
  }

  function datesLabel(row) {
    if (row.status === "reversed") return `Dates incohérentes · ${row.start.label} → ${row.end.label}`;
    return `${row.start?.label || "Début indisponible"} → ${row.end?.label || "Fin indisponible"}`;
  }

  function createCalendar(doc, timeline, options) {
    const node = (tag, className, text) => {
      const element = doc.createElement(tag);
      if (className) element.className = className;
      if (text != null) element.textContent = text;
      return element;
    };
    const id = `project-timeline-${++renderId}`;
    const calendar = node("section", "unit-dico-section unit-dico-calendar");
    const calendarHeading = node("h2", "unit-dico-heading", options.heading || "Unité DiCo · 02 / Calendrier des projets");
    calendarHeading.id = `${id}-calendar`; calendar.setAttribute("aria-labelledby", calendarHeading.id); calendar.append(calendarHeading);
    if (timeline.available) {
      calendar.append(node("p", "unit-dico-caption", `${projectDate(timeline.startDate).label} → ${projectDate(timeline.endDate).label} · Dates de début et de fin incluses. Cliquez sur un projet pour ouvrir sa vue Heures / Budget.`));
      calendar.append(node("p", "unit-dico-calendar-key", `Gris : projets terminés.${timeline.today ? ` Aujourd’hui : ${timeline.today.label}${timeline.today.position === null ? " (hors de la période affichée)" : " · ligne noire pointillée"}.` : ""}`));
    } else {
      calendar.append(node("p", "unit-dico-caption", timeline.rows.length ? "Échelle indisponible : les dates de début et de fin lisibles ne définissent pas une période cohérente." : timeline.projects.length ? "Aucun projet à afficher dans le calendrier : les projets se terminant en 2999 sont exclus." : (options.emptyMessage || "Le calendrier apparaîtra avec les projets de l’unité.")));
    }
    const incomplete = timeline.rows.filter(row => row.status !== "available");
    if (incomplete.length) calendar.append(node("p", "unit-dico-dates-note", `${incomplete.length} projet${incomplete.length > 1 ? "s" : ""} sans période complète et cohérente : ${incomplete.length > 1 ? "ils restent" : "il reste"} dans la liste, sans barre de durée.`));
    const selects = [], bars = [];
    let scrollRegion = null;
    const todayMarker = () => {
      const marker = node("span", "unit-dico-timeline-today");
      marker.style.left = `${timeline.today.position}%`;
      marker.setAttribute("data-unit-timeline-today", timeline.today.date); marker.setAttribute("aria-hidden", "true");
      return marker;
    };
    if (timeline.rows.length) {
      const scroll = node("div", "unit-dico-timeline-scroll"); scroll.setAttribute("tabindex", "0");
      scrollRegion = scroll;
      scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", options.regionLabel || "Calendrier de durée des projets de l’Unité DiCo, défilement horizontal disponible");
      const chart = node("div", "unit-dico-timeline");
      if (timeline.available) { chart.setAttribute("data-unit-timeline-start", timeline.startDate); chart.setAttribute("data-unit-timeline-end", timeline.endDate); }
      const axisRow = node("div", "unit-dico-timeline-row unit-dico-timeline-axis-row");
      axisRow.append(node("span", "unit-dico-timeline-label unit-dico-axis-label", "Projet"));
      const axis = node("div", "unit-dico-timeline-axis");
      for (const tick of timeline.ticks) {
        const mark = node("span", `unit-dico-axis-tick${tick.edge ? ` is-${tick.edge}` : ""}`, tick.label);
        mark.style.left = `${tick.position}%`; mark.setAttribute("data-unit-timeline-tick", tick.date); axis.append(mark);
      }
      if (timeline.today?.position != null) {
        axis.append(todayMarker());
        const todayLabel = node("span", "unit-dico-timeline-today-label", "Aujourd’hui");
        todayLabel.style.left = `${timeline.today.position}%`;
        if (timeline.today.position < 10) todayLabel.style.transform = "none";
        else if (timeline.today.position > 90) todayLabel.style.transform = "translateX(-100%)";
        axis.append(todayLabel);
      }
      axisRow.append(axis); chart.append(axisRow);
      for (const row of timeline.rows) {
        const entry = node("div", "unit-dico-timeline-row");
        const label = node("button", "unit-dico-timeline-label"); label.type = "button";
        label.title = `${row.name}\n${datesLabel(row)}`;
        label.setAttribute("data-unit-project-select", String(row.id)); label.setAttribute("data-unit-project-kind", "name");
        label.setAttribute("aria-label", `${row.name} · ${datesLabel(row)}. Ouvrir la vue du projet.`);
        const dot = node("span", "unit-dico-project-dot"); dot.style.backgroundColor = row.completed ? COMPLETED_COLOR : row.color; dot.setAttribute("aria-hidden", "true");
        const text = node("span", "unit-dico-timeline-name"); text.append(node("strong", "", row.name));
        label.append(dot, text); label.addEventListener("click", () => options.onSelect?.(row.id)); entry.append(label); selects.push(label);
        const track = node("div", "unit-dico-timeline-track"); track.setAttribute("data-unit-timeline-project", String(row.id));
        for (const tick of timeline.ticks) {
          const line = node("span", "unit-dico-timeline-gridline"); line.style.left = `${tick.position}%`; line.setAttribute("aria-hidden", "true"); track.append(line);
        }
        if (row.left !== null && row.width !== null) {
          const bar = node("button", `unit-dico-timeline-bar${row.completed ? " is-completed" : ""}`); bar.type = "button";
          bar.style.left = `${row.left}%`; bar.style.width = `${row.width}%`;
          const fill = node("span", "unit-dico-timeline-fill"); fill.style.backgroundColor = row.completed ? COMPLETED_COLOR : row.color;
          fill.setAttribute("aria-hidden", "true"); bar.append(fill); bars.push(bar);
          bar.setAttribute("data-unit-project-select", String(row.id)); bar.setAttribute("data-unit-project-kind", "bar");
          bar.setAttribute("aria-label", `${row.name} · ${datesLabel(row)}. Ouvrir la vue du projet.`); bar.title = `${row.name}\n${datesLabel(row)}`;
          bar.addEventListener("click", () => options.onSelect?.(row.id)); track.append(bar); selects.push(bar);
        } else {
          track.append(node("span", "unit-dico-timeline-unavailable", row.status === "reversed" ? "Dates incohérentes" : "Dates indisponibles"));
        }
        if (timeline.today?.position != null) track.append(todayMarker());
        entry.append(track); chart.append(entry);
      }
      scroll.append(chart); calendar.append(scroll);
    }
    return { section: calendar, bars, selects, scroll: scrollRegion };
  }

  function createConcurrency(doc, timeline, options = {}) {
    const summary = concurrencyFromTimeline(timeline);
    const node = (tag, className, text) => {
      const element = doc.createElement(tag);
      if (className) element.className = className;
      if (text != null) element.textContent = text;
      return element;
    };
    const id = `unit-concurrency-${++renderId}`;
    const section = node("section", "unit-dico-section unit-dico-concurrency");
    const heading = node("h2", "unit-dico-heading", options.concurrencyHeading || "Unité DiCo · 03 / Projets simultanés");
    heading.id = `${id}-title`; section.setAttribute("aria-labelledby", heading.id); section.append(heading);
    section.append(node("p", "unit-dico-caption", "Maximum de projets simultanés dans chaque mois, d’après leurs dates de début et de fin incluses. Même période que le calendrier, y compris les projets à venir."));
    if (summary.omittedCount) section.append(node("p", "unit-dico-dates-note", `${summary.includedCount} projet${summary.includedCount > 1 ? "s" : ""} avec une période complète pris en compte. ${summary.omittedCount} projet${summary.omittedCount > 1 ? "s" : ""} aux dates manquantes ou incohérentes ${summary.omittedCount > 1 ? "sont exclus" : "est exclu"} du comptage.`));
    if (!summary.available) {
      section.append(node("p", "unit-dico-status", summary.reason === "range-too-long" ? "Période trop longue pour une vue mensuelle : plus de 2 400 mois calendaires." : "Comptage indisponible : aucune période de projet complète sur une échelle de dates cohérente."));
      return { section, scroll: null, buttons: [] };
    }
    const scroll = node("div", "unit-dico-timeline-scroll"); scroll.setAttribute("tabindex", "0");
    scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", "Nombre mensuel de projets simultanés, défilement horizontal disponible");
    const chart = node("div", "unit-dico-timeline");
    chart.setAttribute("data-unit-concurrency-start", summary.startDate); chart.setAttribute("data-unit-concurrency-end", summary.endDate);
    const body = node("div", "unit-dico-concurrency-body"), yAxis = node("div", "unit-dico-concurrency-y-axis");
    yAxis.append(node("span", "unit-dico-concurrency-y-title", "Nombre de projets"));
    const plot = node("div", "unit-dico-concurrency-plot");
    const top = 16, baseline = 200;
    const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, summary.maxCount / 4)));
    const step = [1, 2, 5, 10].map(value => value * magnitude).find(value => value >= summary.maxCount / 4);
    const ceiling = Math.ceil(summary.maxCount / step) * step;
    const y = count => baseline - count / ceiling * (baseline - top);
    for (let count = 0; count <= ceiling; count += step) {
      const label = node("span", "unit-dico-concurrency-y-tick", String(count)); label.style.top = `${y(count)}px`; yAxis.append(label);
      const line = node("span", "unit-dico-concurrency-gridline"); line.style.top = `${y(count)}px`; line.setAttribute("aria-hidden", "true"); plot.append(line);
    }
    for (const tick of summary.ticks) {
      const line = node("span", "unit-dico-timeline-gridline"); line.style.left = `${tick.position}%`; line.setAttribute("aria-hidden", "true"); plot.append(line);
    }
    const svgNode = (tag, attributes) => {
      const element = doc.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
      return element;
    };
    const svg = svgNode("svg", { viewBox: "0 0 1000 220", preserveAspectRatio: "none", "aria-hidden": "true", class: "unit-dico-concurrency-svg" });
    const defs = svgNode("defs", {}), gradient = svgNode("linearGradient", { id: `${id}-fill`, x1: "0", y1: "0", x2: "0", y2: "1" });
    gradient.append(svgNode("stop", { offset: "0%", "stop-color": "#4a85b3", "stop-opacity": 0.55 }), svgNode("stop", { offset: "100%", "stop-color": "#4a85b3", "stop-opacity": 0.08 }));
    defs.append(gradient); svg.append(defs);
    const points = summary.months.flatMap(month => [`${month.position * 10},${y(month.count)}`, `${(month.position + month.width) * 10},${y(month.count)}`]);
    const linePath = `M${points.join(" L")}`;
    svg.append(svgNode("path", { d: `${linePath} L1000,${baseline} L0,${baseline} Z`, fill: `url(#${id}-fill)`, "data-unit-concurrency-area": "" }),
      svgNode("path", { d: linePath, fill: "none", stroke: "#356e9a", "stroke-width": 2.5, "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round" }));
    plot.append(svg);
    if (summary.today?.position != null) {
      const marker = node("span", "unit-dico-timeline-today"); marker.style.left = `${summary.today.position}%`;
      marker.setAttribute("data-unit-concurrency-today", summary.today.date); marker.setAttribute("aria-hidden", "true"); plot.append(marker);
    }
    const tooltip = node("div", "unit-dico-concurrency-tooltip"); tooltip.id = `${id}-tooltip`; tooltip.setAttribute("role", "tooltip"); tooltip.hidden = true;
    const buttons = [];
    let pinned = null;
    const hide = () => { tooltip.hidden = true; pinned = null; };
    const show = index => {
      const month = summary.months[index];
      tooltip.textContent = `${month.label} · ${month.count} projet${month.count > 1 ? "s" : ""} simultané${month.count > 1 ? "s" : ""} au maximum`;
      const center = month.position + month.width / 2;
      tooltip.style.left = `${center}%`; tooltip.style.transform = center < 20 ? "none" : center > 80 ? "translateX(-100%)" : "translateX(-50%)";
      tooltip.hidden = false;
    };
    for (const [index, month] of summary.months.entries()) {
      const button = node("button", "unit-dico-concurrency-month"); button.type = "button";
      button.setAttribute("data-unit-concurrency-month", month.month); button.setAttribute("tabindex", index ? "-1" : "0");
      button.setAttribute("aria-label", `${month.label} : ${month.count} projets simultanés au maximum.`); button.setAttribute("aria-describedby", tooltip.id);
      button.style.left = `${month.position}%`; button.style.width = `${month.width}%`;
      button.addEventListener("pointerenter", () => show(index));
      button.addEventListener("pointerleave", () => { if (pinned === null && doc.activeElement !== button) hide(); });
      button.addEventListener("focus", () => { buttons.forEach(control => control.setAttribute("tabindex", control === button ? "0" : "-1")); show(index); });
      button.addEventListener("blur", hide);
      button.addEventListener("click", () => { if (pinned === index) hide(); else { pinned = index; show(index); } });
      button.addEventListener("keydown", event => {
        if (event.key === "Escape") { event.preventDefault?.(); hide(); return; }
        const target = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : event.key === "ArrowLeft" ? Math.max(0, index - 1) : event.key === "ArrowRight" ? Math.min(buttons.length - 1, index + 1) : null;
        if (target !== null) { event.preventDefault?.(); buttons[target].focus(); }
      });
      buttons.push(button); plot.append(button);
    }
    plot.append(tooltip); body.append(yAxis, plot); chart.append(body);
    const axisRow = node("div", "unit-dico-timeline-row unit-dico-timeline-axis-row");
    axisRow.append(node("span", "unit-dico-timeline-label unit-dico-axis-label", "Mois"));
    const axis = node("div", "unit-dico-timeline-axis");
    for (const tick of summary.ticks) {
      const label = node("span", `unit-dico-axis-tick${tick.edge ? ` is-${tick.edge}` : ""}`, tick.label);
      label.style.left = `${tick.position}%`; label.setAttribute("data-unit-concurrency-tick", tick.date); axis.append(label);
    }
    axisRow.append(axis); chart.append(axisRow); scroll.append(chart); section.append(scroll);
    const details = node("details", "unit-dico-concurrency-details"); details.append(node("summary", "", "Valeurs mensuelles"));
    const table = node("table", "unit-dico-concurrency-table"); table.append(node("caption", "unit-dico-sr-only", "Maximum mensuel de projets simultanés selon les dates de projet"));
    const head = node("thead", ""), headingRow = node("tr", "");
    for (const text of ["Mois", "Maximum simultané"]) { const cell = node("th", "", text); cell.setAttribute("scope", "col"); headingRow.append(cell); }
    head.append(headingRow); table.append(head);
    const tableBody = node("tbody", "");
    for (const month of summary.months) { const row = node("tr", ""), label = node("th", "", month.label); label.setAttribute("scope", "row"); row.append(label, node("td", "", String(month.count))); tableBody.append(row); }
    table.append(tableBody); details.append(table); section.append(details);
    return { section, scroll, buttons };
  }

  function syncTimelineScroll(container, first, second) {
    if (!first || !second) return;
    const firstScroll = () => { if (second.scrollLeft !== first.scrollLeft) second.scrollLeft = first.scrollLeft; };
    const secondScroll = () => { if (first.scrollLeft !== second.scrollLeft) first.scrollLeft = second.scrollLeft; };
    first.addEventListener("scroll", firstScroll); second.addEventListener("scroll", secondScroll);
    const previous = timelineLifecycles.get(container);
    timelineLifecycles.set(container, () => { previous?.(); first.removeEventListener?.("scroll", firstScroll); second.removeEventListener?.("scroll", secondScroll); });
  }

  function renderTimeline(container, projects, options = {}) {
    if (!container) return null;
    const doc = container.ownerDocument || document;
    const focused = container.contains(doc.activeElement) ? doc.activeElement : null;
    const focusedId = options.focusProjectId ?? focused?.getAttribute?.("data-unit-project-select");
    const focusedKind = options.focusKind ?? focused?.getAttribute?.("data-unit-project-kind");
    cleanup(container);
    const timeline = buildTimeline(projects, options.now === undefined ? new Date() : options.now);
    const content = doc.createElement("div"); content.className = "unit-dico";
    const calendar = createCalendar(doc, timeline, {
      heading: "Calendrier des projets", regionLabel: "Calendrier de durée de mes projets, défilement horizontal disponible",
      emptyMessage: "Aucun projet avec des heures prévues ou réalisées sur cette période.", ...options
    });
    content.append(calendar.section); container.replaceChildren(content);
    mountTimelineBars(container, calendar.bars);
    if (focusedId != null) calendar.selects.find(control => control.getAttribute("data-unit-project-select") === String(focusedId) &&
      (!focusedKind || control.getAttribute("data-unit-project-kind") === focusedKind))?.focus();
    return content;
  }

  function render(container, result, options = {}) {
    if (!container) return null;
    cleanup(container);
    const doc = container.ownerDocument || document;
    const node = (tag, className, text) => {
      const element = doc.createElement(tag);
      if (className) element.className = className;
      if (text != null) element.textContent = text;
      return element;
    };
    const focused = container.contains(doc.activeElement) ? doc.activeElement : null;
    const focusedChoice = focused?.getAttribute?.("data-unit-project-choice");
    const focusedSelect = focused?.getAttribute?.("data-unit-project-select");
    const focusedKind = focused?.getAttribute?.("data-unit-project-kind");
    const focusedRefresh = focused?.getAttribute?.("data-unit-refresh") !== null && focused != null;
    const focusedRetry = focused?.getAttribute?.("data-unit-retry") !== null && focused != null;
    const keepRetry = Boolean(options.loading && container.querySelectorAll("[data-unit-retry]").length);
    const focusedMonth = focused?.getAttribute?.("data-unit-concurrency-month");
    const timeline = buildTimeline(result?.projects, options.now === undefined ? new Date() : options.now);
    const content = node("div", "unit-dico");
    const id = `unit-dico-${++renderId}`;
    container.setAttribute("aria-busy", String(Boolean(options.loading)));

    const projectsSection = node("section", "unit-dico-section");
    const header = node("div", "unit-dico-section-header");
    const heading = node("h2", "unit-dico-heading", options.projectsHeading || "Unité DiCo · 01 / Projets");
    heading.id = `${id}-projects`; projectsSection.setAttribute("aria-labelledby", heading.id);
    header.append(heading);
    if (result) header.append(node("span", "unit-dico-count", Number.isSafeInteger(result.coverage?.expected)
      ? `${timeline.projects.length} / ${result.coverage.expected} projets référencés`
      : `${timeline.projects.length} projet${timeline.projects.length > 1 ? "s" : ""}`));
    let refresh = null;
    if (typeof options.onRefresh === "function") {
      refresh = node("button", "unit-dico-action", "Actualiser"); refresh.type = "button";
      refresh.setAttribute("aria-disabled", String(Boolean(options.loading))); refresh.setAttribute("data-unit-refresh", "");
      refresh.addEventListener("click", () => { if (!options.loading) options.onRefresh(); }); header.append(refresh);
    }
    projectsSection.append(header);
    projectsSection.append(node("p", "unit-dico-caption", options.caption || "Tous les projets accessibles de Digital Construction, sur leur durée totale. Interne et Overhead sont exclus."));
    let retry = null;
    if (options.loading || options.error || !result || !timeline.projects.length) {
      const status = node("div", "unit-dico-status"); status.setAttribute("role", "status");
      status.append(node("p", "", options.error || (options.loading ? options.loadingMessage || "Chargement des projets de l’Unité DiCo…" : !result ? options.unavailableMessage || "Les projets de l’Unité DiCo sont indisponibles." : options.emptyMessage || "Aucun projet de l’Unité DiCo accessible.")));
      if ((options.error || keepRetry) && typeof options.onRetry === "function") {
        retry = node("button", "unit-dico-action", "Réessayer"); retry.type = "button";
        retry.setAttribute("aria-disabled", String(Boolean(options.loading))); retry.setAttribute("data-unit-retry", "");
        retry.addEventListener("click", () => { if (!options.loading) options.onRetry(); }); status.append(retry);
      }
      projectsSection.append(status);
    }
    const choices = new Map();
    if (timeline.projects.length) {
      const grid = node("fieldset", "unit-dico-grid");
      grid.append(node("legend", "unit-dico-sr-only", options.legend || "Choisir un projet de l’Unité DiCo"));
      for (const project of timeline.projects) {
        const label = node("label", "unit-dico-tile"); label.title = project.name;
        const input = node("input", "unit-dico-radio"); input.type = "radio"; input.name = options.radioName || "unit-dico-project"; input.value = String(project.id);
        input.setAttribute("data-unit-project-choice", String(project.id)); input.setAttribute("aria-label", project.name);
        input.addEventListener("change", () => { if (input.checked) options.onSelect?.(project.id); });
        const avatar = node("span", "unit-dico-avatar"); avatar.style.borderColor = colorFor(project.id);
        avatar.title = project.manager?.name ? `Responsable : ${project.manager.name}` : "Responsable indisponible";
        const fallback = node("span", "unit-dico-initials", initials(project.manager?.name)); fallback.setAttribute("aria-hidden", "true"); avatar.append(fallback);
        const source = photoSource(project.manager?.photoDataUrl);
        if (source) {
          const photo = node("img", "unit-dico-photo"); photo.src = source; photo.alt = ""; photo.width = 24; photo.height = 24;
          photo.addEventListener("error", () => { photo.hidden = true; }); avatar.append(photo);
        }
        ProjectCard.mount(label, input, project, [avatar, ProjectCard.createTitle(doc, project, "unit-dico-project-name")]);
        grid.append(label); choices.set(String(project.id), input);
      }
      projectsSection.append(grid);
    }
    content.append(projectsSection);

    const { section: calendar, bars, selects, scroll: calendarScroll } = createCalendar(doc, timeline, options);
    content.append(calendar);
    const concurrency = createConcurrency(doc, timeline, options); content.append(concurrency.section);
    const warnings = Array.isArray(result?.warnings) ? Array.from(new Set(result.warnings.filter(value => typeof value === "string" && value.trim()))) : [];
    if (warnings.length) {
      const details = node("details", "unit-dico-warnings"); details.append(node("summary", "", "Informations sur les sources"));
      const list = node("ul", ""); for (const warning of warnings) list.append(node("li", "", warning)); details.append(list); content.append(details);
    }
    container.replaceChildren(content);
    mountTimelineBars(container, bars);
    syncTimelineScroll(container, calendarScroll, concurrency.scroll);
    const restoreId = options.focusProjectId ?? focusedChoice;
    if (restoreId != null) choices.get(String(restoreId))?.focus();
    else if (focusedSelect != null) selects.find(control => control.getAttribute("data-unit-project-select") === focusedSelect && control.getAttribute("data-unit-project-kind") === focusedKind)?.focus();
    else if (focusedRefresh) refresh?.focus();
    else if (focusedRetry) (retry || refresh)?.focus();
    else if (focusedMonth != null) concurrency.buttons.find(button => button.getAttribute("data-unit-concurrency-month") === focusedMonth)?.focus();
    return content;
  }

  return { render, renderTimeline, cleanup, normalizeProjects, buildTimeline, buildConcurrency, isExcludedProjectName, colorFor };
});
