(function (root, factory) {
  const commonJS = typeof module === "object" && module.exports;
  if (commonJS) require("./i18n-timeline-messages");
  const api = factory(commonJS ? require("./project-card") : root.ProjectCard,
    commonJS ? require("./i18n") : root.DashboardI18n,
    commonJS ? require("./project-similarity") : root.ProjectSimilarity,
    commonJS ? require("./chart-palette") : root.ChartPalette);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.UnitDico = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (ProjectCard, I18n, ProjectSimilarity, ChartPalette) {
  "use strict";

  const DAY = 86400000;
  const COMPLETED_COLOR = "#98a2ab";
  const t = (key, parameters) => I18n.t(`timeline.${key}`, parameters);
  const number = value => I18n.formatNumber(value);
  const monthLabel = (year, month) => I18n.formatDate(new Date(`${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-01T00:00:00Z`), {
    timeZone: "UTC", month: "short", year: "numeric"
  });
  const brusselsFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit"
  });
  const timelineLifecycles = new WeakMap();
  const similarityHosts = new WeakMap();
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
    return { value, day: time / DAY, label: I18n.formatDate(new Date(time), {
      timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric"
    }) };
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
      return [{ ...project, id, name: typeof project.name === "string" && project.name.trim() ? project.name : t("projectFallback", { id: number(id) }) }];
    }).sort((a, b) => a.name.localeCompare(b.name, I18n.locale(), { numeric: true }) || a.id - b.id);
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
      ticks.push({ date: dateAt(day), position, label: step >= 12 ? String(year) : monthLabel(year, index), edge: null });
      previous = position;
    }
    ticks.push({ date: dateAt(max), position: 100, label: projectDate(dateAt(max)).label, edge: "end" });
    return ticks;
  }

  function shiftedYear(date, offset) {
    const year = Math.max(1, Math.min(9999, Number(date.value.slice(0, 4)) + offset));
    const prefix = `${String(year).padStart(4, "0")}${date.value.slice(4, 8)}`;
    return projectDate(`${prefix}${date.value.slice(8)}`) || projectDate(`${prefix}28`);
  }

  function buildTimeline(input, now = new Date(), options = {}) {
    const projects = normalizeProjects(input);
    const today = currentDate(now);
    const calendarView = options.calendarView === "near" && today ? "near" : "full";
    const sourceRows = projects.map(project => {
      const start = projectDate(project.startDate), end = projectDate(project.endDate);
      const reversed = Boolean(start && end && end.day < start.day);
      return { ...project, start, end, color: colorFor(project.id),
        completed: Boolean(today && end && !reversed && end.day < today.day),
        status: reversed ? "reversed" : start && end ? "available" : "unavailable" };
    }).filter(row => !row.end?.value.startsWith("2999-"))
      .sort((a, b) => Number(a.completed) - Number(b.completed) ||
        (a.start?.day ?? Infinity) - (b.start?.day ?? Infinity) || a.name.localeCompare(b.name, I18n.locale(), { numeric: true }) || a.id - b.id);
    const starts = sourceRows.filter(row => row.status !== "reversed" && row.start).map(row => row.start.day);
    const ends = sourceRows.filter(row => row.status !== "reversed" && row.end).map(row => row.end.day);
    const min = calendarView === "near" ? shiftedYear(today, -3).day : starts.length ? Math.min(...starts) : null;
    const max = calendarView === "near" ? shiftedYear(today, 3).day : ends.length ? Math.max(...ends) : null;
    const available = sourceRows.length > 0 && min !== null && max !== null && max >= min;
    const days = available ? max - min + 1 : null;
    const rows = calendarView === "near" ? sourceRows.filter(row => row.status !== "available" || row.end.day >= min && row.start.day <= max) : sourceRows;
    return { projects, calendarView, outsideCount: sourceRows.length - rows.length,
      knownIntervalCount: sourceRows.filter(row => row.status === "available").length,
      rows: rows.map(row => ({ ...row,
      visibleStart: available && row.status === "available" ? Math.max(row.start.day, min) : null,
      visibleEnd: available && row.status === "available" ? Math.min(row.end.day, max) : null,
      left: available && row.status === "available" ? (Math.max(row.start.day, min) - min) / days * 100 : null,
      width: available && row.status === "available" ? (Math.min(row.end.day, max) - Math.max(row.start.day, min) + 1) / days * 100 : null })),
      available, startDate: min === null ? null : dateAt(min), endDate: max === null ? null : dateAt(max), days,
      today: today ? { date: today.value, label: today.label,
        position: available && today.day >= min && today.day <= max ? (today.day - min) / days * 100 : null } : null,
      ticks: available ? axisTicks(min, max, days) : [] };
  }

  function concurrencyFromTimeline(timeline) {
    const intervals = timeline.rows.filter(row => row.status === "available");
    const result = { available: false, startDate: timeline.startDate, endDate: timeline.endDate,
      days: timeline.days, ticks: timeline.ticks, today: timeline.today, months: [], maxCount: null,
      includedCount: intervals.length, omittedCount: timeline.rows.length - intervals.length,
      outsideCount: timeline.outsideCount };
    if (!timeline.available || !timeline.knownIntervalCount) return result;
    const min = projectDate(timeline.startDate).day, max = projectDate(timeline.endDate).day;
    const first = new Date(min * DAY), last = new Date(max * DAY);
    const firstMonth = first.getUTCFullYear() * 12 + first.getUTCMonth();
    const lastMonth = last.getUTCFullYear() * 12 + last.getUTCMonth();
    // Keep malformed centuries-long periods from creating an unbounded monthly UI.
    if (lastMonth - firstMonth >= 2400) return { ...result, reason: "range-too-long" };
    const events = new Map();
    for (const row of intervals) {
      events.set(row.visibleStart, (events.get(row.visibleStart) || 0) + 1);
      events.set(row.visibleEnd + 1, (events.get(row.visibleEnd + 1) || 0) - 1);
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
      months.push({ month, label: monthLabel(year, monthIndex), startDate: dateAt(start), endDate: dateAt(end),
        position: (start - min) / timeline.days * 100, width: (end - start + 1) / timeline.days * 100, count });
    }
    return { ...result, available: true, months, maxCount };
  }

  function buildConcurrency(input, now = new Date(), options = {}) { return concurrencyFromTimeline(buildTimeline(input, now, options)); }

  function cleanup(container) {
    timelineLifecycles.get(container)?.();
    timelineLifecycles.delete(container);
    const similarityHost = similarityHosts.get(container);
    if (similarityHost) ProjectSimilarity?.cleanup?.(similarityHost);
    similarityHosts.delete(container);
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
    if (row.status === "reversed") return t("reversedDates", { start: row.start.label, end: row.end.label });
    return `${row.start?.label || t("startUnavailable")} → ${row.end?.label || t("endUnavailable")}`;
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
    const calendarHeading = node("h2", "unit-dico-heading", options.heading || t("calendarHeading"));
    calendarHeading.id = `${id}-calendar`; calendar.setAttribute("aria-labelledby", calendarHeading.id);
    const header = node("div", "unit-dico-calendar-header"), views = node("fieldset", "unit-dico-calendar-views");
    const viewInputs = new Map();
    views.append(node("legend", "unit-dico-sr-only", t("viewLabel")));
    for (const value of ["near", "full"]) {
      const label = node("label", "unit-dico-calendar-view");
      const input = node("input", ""); input.type = "radio"; input.name = `${id}-view`; input.value = value;
      input.checked = timeline.calendarView === value;
      input.setAttribute("data-unit-calendar-view", value);
      input.addEventListener("change", () => { if (input.checked && value !== timeline.calendarView) options.onCalendarViewChange?.(value); });
      label.append(input, node("span", "", t(value === "near" ? "viewNear" : "viewFull"))); views.append(label); viewInputs.set(value, input);
    }
    header.append(calendarHeading, views); calendar.append(header);
    if (timeline.available) {
      calendar.append(node("p", "unit-dico-caption", t("calendarPeriod", { start: projectDate(timeline.startDate).label, end: projectDate(timeline.endDate).label })));
      calendar.append(node("p", "unit-dico-calendar-key", `${t("calendarKey")}${timeline.today ? t(timeline.today.position === null ? "todayOutside" : "todayInside", { date: timeline.today.label }) : ""}`));
      if (timeline.calendarView === "near") calendar.append(node("p", "unit-dico-calendar-key", t("nearHelp")));
    } else {
      calendar.append(node("p", "unit-dico-caption", timeline.rows.length ? t("scaleUnavailable") : timeline.projects.length ? t("allExcluded") : (options.emptyMessage || t("calendarEmpty"))));
    }
    if (timeline.outsideCount) calendar.append(node("p", "unit-dico-dates-note", t(timeline.outsideCount === 1 ? "outsideOne" : "outsideMany", { count: number(timeline.outsideCount) })));
    if (timeline.available && !timeline.rows.length) calendar.append(node("p", "unit-dico-caption", t("noVisibleProjects")));
    const incomplete = timeline.rows.filter(row => row.status !== "available");
    if (incomplete.length) calendar.append(node("p", "unit-dico-dates-note", t(incomplete.length === 1 ? "incompleteOne" : "incompleteMany", { count: number(incomplete.length) })));
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
      scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", options.regionLabel || t("calendarRegion"));
      const chart = node("div", "unit-dico-timeline");
      if (timeline.available) { chart.setAttribute("data-unit-timeline-start", timeline.startDate); chart.setAttribute("data-unit-timeline-end", timeline.endDate); }
      const axisRow = node("div", "unit-dico-timeline-row unit-dico-timeline-axis-row");
      axisRow.append(node("span", "unit-dico-timeline-label unit-dico-axis-label", t("project")));
      const axis = node("div", "unit-dico-timeline-axis");
      for (const tick of timeline.ticks) {
        const mark = node("span", `unit-dico-axis-tick${tick.edge ? ` is-${tick.edge}` : ""}`, tick.label);
        mark.style.left = `${tick.position}%`; mark.setAttribute("data-unit-timeline-tick", tick.date); axis.append(mark);
      }
      if (timeline.today?.position != null) {
        axis.append(todayMarker());
        const todayLabel = node("span", "unit-dico-timeline-today-label", t("today"));
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
        label.setAttribute("aria-label", t("openProject", { name: row.name, dates: datesLabel(row) }));
        const dot = node("span", "unit-dico-project-dot"); dot.style.backgroundColor = row.completed ? COMPLETED_COLOR : row.color; dot.setAttribute("aria-hidden", "true");
        const text = node("span", "unit-dico-timeline-name"); text.append(node("strong", "", ProjectCard.nameParts(row).shortName));
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
          bar.setAttribute("aria-label", t("openProject", { name: row.name, dates: datesLabel(row) })); bar.title = `${row.name}\n${datesLabel(row)}`;
          bar.addEventListener("click", () => options.onSelect?.(row.id)); track.append(bar); selects.push(bar);
        } else {
          track.append(node("span", "unit-dico-timeline-unavailable", t(row.status === "reversed" ? "datesReversed" : "datesUnavailable")));
        }
        if (timeline.today?.position != null) track.append(todayMarker());
        entry.append(track); chart.append(entry);
      }
      scroll.append(chart); calendar.append(scroll);
    }
    return { section: calendar, bars, selects, scroll: scrollRegion, viewInputs };
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
    const heading = node("h2", "unit-dico-heading", options.concurrencyHeading || t("concurrencyHeading"));
    heading.id = `${id}-title`; section.setAttribute("aria-labelledby", heading.id); section.append(heading);
    section.append(node("p", "unit-dico-caption", t("concurrencyCaption")));
    if (summary.omittedCount) section.append(node("p", "unit-dico-dates-note", `${t(summary.includedCount === 1 ? "includedOne" : "includedMany", { count: number(summary.includedCount) })} ${t(summary.omittedCount === 1 ? "omittedOne" : "omittedMany", { count: number(summary.omittedCount) })}`));
    if (!summary.available) {
      section.append(node("p", "unit-dico-status", t(summary.reason === "range-too-long" ? "rangeTooLong" : "concurrencyUnavailable")));
      return { section, scroll: null, buttons: [] };
    }
    const scroll = node("div", "unit-dico-timeline-scroll"); scroll.setAttribute("tabindex", "0");
    scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", t("concurrencyRegion"));
    const chart = node("div", "unit-dico-timeline");
    chart.setAttribute("data-unit-concurrency-start", summary.startDate); chart.setAttribute("data-unit-concurrency-end", summary.endDate);
    const body = node("div", "unit-dico-concurrency-body"), yAxis = node("div", "unit-dico-concurrency-y-axis");
    yAxis.append(node("span", "unit-dico-concurrency-y-title", t("projectCountAxis")));
    const plot = node("div", "unit-dico-concurrency-plot");
    const top = 16, baseline = 200;
    const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, summary.maxCount / 4)));
    const step = [1, 2, 5, 10].map(value => value * magnitude).find(value => value >= summary.maxCount / 4);
    const ceiling = Math.max(1, Math.ceil(summary.maxCount / step) * step);
    const y = count => baseline - count / ceiling * (baseline - top);
    for (let count = 0; count <= ceiling; count += step) {
      const label = node("span", "unit-dico-concurrency-y-tick", number(count)); label.style.top = `${y(count)}px`; yAxis.append(label);
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
    const seriesColor = ChartPalette.color(0);
    const stops = [svgNode("stop", { offset: "0%", "stop-color": seriesColor, "stop-opacity": 0.55 }),
      svgNode("stop", { offset: "100%", "stop-color": seriesColor, "stop-opacity": 0.08 })];
    gradient.append(...stops);
    defs.append(gradient); svg.append(defs);
    const points = summary.months.flatMap(month => [`${month.position * 10},${y(month.count)}`, `${(month.position + month.width) * 10},${y(month.count)}`]);
    const linePath = `M${points.join(" L")}`;
    const seriesLine = svgNode("path", { d: linePath, fill: "none", stroke: seriesColor, "stroke-width": 2.5,
      "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round", "data-unit-concurrency-line": "" });
    svg.append(svgNode("path", { d: `${linePath} L1000,${baseline} L0,${baseline} Z`, fill: `url(#${id}-fill)`, "data-unit-concurrency-area": "" }), seriesLine);
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
      tooltip.textContent = t(month.count === 1 ? "concurrentOne" : "concurrentMany", { month: month.label, count: number(month.count) });
      const center = month.position + month.width / 2;
      tooltip.style.left = `${center}%`; tooltip.style.transform = center < 20 ? "none" : center > 80 ? "translateX(-100%)" : "translateX(-50%)";
      tooltip.hidden = false;
    };
    for (const [index, month] of summary.months.entries()) {
      const button = node("button", "unit-dico-concurrency-month"); button.type = "button";
      button.setAttribute("data-unit-concurrency-month", month.month); button.setAttribute("tabindex", index ? "-1" : "0");
      button.setAttribute("aria-label", t("concurrentAria", { month: month.label, count: number(month.count) })); button.setAttribute("aria-describedby", tooltip.id);
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
    axisRow.append(node("span", "unit-dico-timeline-label unit-dico-axis-label", t("month")));
    const axis = node("div", "unit-dico-timeline-axis");
    for (const tick of summary.ticks) {
      const label = node("span", `unit-dico-axis-tick${tick.edge ? ` is-${tick.edge}` : ""}`, tick.label);
      label.style.left = `${tick.position}%`; label.setAttribute("data-unit-concurrency-tick", tick.date); axis.append(label);
    }
    axisRow.append(axis); chart.append(axisRow); scroll.append(chart); section.append(scroll);
    const details = node("details", "unit-dico-concurrency-details"); details.append(node("summary", "", t("monthlyValues")));
    const table = node("table", "unit-dico-concurrency-table"); table.append(node("caption", "unit-dico-sr-only", t("concurrencyTable")));
    const head = node("thead", ""), headingRow = node("tr", "");
    for (const text of [t("month"), t("concurrentMaximum")]) { const cell = node("th", "", text); cell.setAttribute("scope", "col"); headingRow.append(cell); }
    head.append(headingRow); table.append(head);
    const tableBody = node("tbody", "");
    for (const month of summary.months) { const row = node("tr", ""), label = node("th", "", month.label); label.setAttribute("scope", "row"); row.append(label, node("td", "", number(month.count))); tableBody.append(row); }
    table.append(tableBody); details.append(table); section.append(details);
    let paletteActive = true;
    const unsubscribePalette = ChartPalette.subscribe(() => {
      if (!paletteActive) return;
      const color = ChartPalette.color(0);
      stops.forEach(stop => stop.setAttribute("stop-color", color));
      seriesLine.setAttribute("stroke", color);
    });
    return { section, scroll, buttons, cleanup() {
      if (!paletteActive) return;
      paletteActive = false; unsubscribePalette();
    } };
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
    const focusedView = options.focusCalendarView ?? focused?.getAttribute?.("data-unit-calendar-view");
    cleanup(container);
    const timeline = buildTimeline(projects, options.now === undefined ? new Date() : options.now, options);
    const content = doc.createElement("div"); content.className = "unit-dico";
    const calendar = createCalendar(doc, timeline, {
      heading: t("personalCalendarHeading"), regionLabel: t("personalCalendarRegion"),
      emptyMessage: t("personalCalendarEmpty"), ...options
    });
    content.append(calendar.section); container.replaceChildren(content);
    mountTimelineBars(container, calendar.bars);
    if (focusedView != null) calendar.viewInputs.get(focusedView)?.focus();
    else if (focusedId != null) calendar.selects.find(control => control.getAttribute("data-unit-project-select") === String(focusedId) &&
      (!focusedKind || control.getAttribute("data-unit-project-kind") === focusedKind))?.focus();
    return content;
  }

  function render(container, result, options = {}) {
    if (!container) return null;
    const previousSimilarity = similarityHosts.get(container);
    const similarityState = previousSimilarity ? ProjectSimilarity?.captureState?.(previousSimilarity) : null;
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
    const focusedView = options.focusCalendarView ?? focused?.getAttribute?.("data-unit-calendar-view");
    const timeline = buildTimeline(result?.projects, options.now === undefined ? new Date() : options.now, options);
    const content = node("div", "unit-dico");
    const id = `unit-dico-${++renderId}`;
    container.setAttribute("aria-busy", String(Boolean(options.loading)));

    const projectsSection = node("section", "unit-dico-section");
    const header = node("div", "unit-dico-section-header");
    const heading = node("h2", "unit-dico-heading", options.projectsHeading || t("projectsHeading"));
    heading.id = `${id}-projects`; projectsSection.setAttribute("aria-labelledby", heading.id);
    header.append(heading);
    if (result) header.append(node("span", "unit-dico-count", Number.isSafeInteger(result.coverage?.expected)
      ? t("referencedCount", { count: number(timeline.projects.length), expected: number(result.coverage.expected) })
      : t(timeline.projects.length === 1 ? "countOne" : "countMany", { count: number(timeline.projects.length) })));
    let refresh = null;
    if (typeof options.onRefresh === "function") {
      refresh = node("button", "unit-dico-action", t("refresh")); refresh.type = "button";
      refresh.setAttribute("aria-disabled", String(Boolean(options.loading))); refresh.setAttribute("data-unit-refresh", "");
      refresh.addEventListener("click", () => { if (!options.loading) options.onRefresh(); }); header.append(refresh);
    }
    projectsSection.append(header);
    projectsSection.append(node("p", "unit-dico-caption", options.caption || t("projectsCaption")));
    let retry = null;
    if (options.loading || options.error || !result || !timeline.projects.length) {
      const status = node("div", "unit-dico-status"); status.setAttribute("role", "status");
      status.append(node("p", "", options.error ? I18n.message(options.error) : (options.loading ? options.loadingMessage || t("projectsLoading") : !result ? options.unavailableMessage || t("projectsUnavailable") : options.emptyMessage || t("projectsEmpty"))));
      if ((options.error || keepRetry) && typeof options.onRetry === "function") {
        retry = node("button", "unit-dico-action", t("retry")); retry.type = "button";
        retry.setAttribute("aria-disabled", String(Boolean(options.loading))); retry.setAttribute("data-unit-retry", "");
        retry.addEventListener("click", () => { if (!options.loading) options.onRetry(); }); status.append(retry);
      }
      projectsSection.append(status);
    }
    const choices = new Map();
    if (timeline.projects.length) {
      const grid = node("fieldset", "unit-dico-grid");
      grid.append(node("legend", "unit-dico-sr-only", options.legend || t("chooseProject")));
      const cardProjects = timeline.projects.toSorted((a, b) => ProjectCard.nameParts(a).shortName.localeCompare(
        ProjectCard.nameParts(b).shortName, I18n.locale(), { numeric: true, sensitivity: "base" }) || a.id - b.id);
      for (const project of cardProjects) {
        const label = node("label", "unit-dico-tile"); label.title = project.name;
        const input = node("input", "unit-dico-radio"); input.type = "radio"; input.name = options.radioName || "unit-dico-project"; input.value = String(project.id);
        input.setAttribute("data-unit-project-choice", String(project.id)); input.setAttribute("aria-label", project.name);
        input.addEventListener("change", () => { if (input.checked) options.onSelect?.(project.id); });
        const avatar = node("span", "unit-dico-avatar"); avatar.style.borderColor = colorFor(project.id);
        avatar.title = project.manager?.name ? t("manager", { name: project.manager.name }) : t("managerUnavailable");
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

    let similarityHost = null;
    if (options.showSimilarityMap === true && result && ProjectSimilarity) {
      similarityHost = node("div", "unit-dico-similarity-host");
      content.append(similarityHost);
    }
    const { section: calendar, bars, selects, scroll: calendarScroll, viewInputs } = createCalendar(doc, timeline, options);
    content.append(calendar);
    const concurrency = createConcurrency(doc, timeline, options); content.append(concurrency.section);
    const warnings = Array.isArray(result?.warnings) ? Array.from(new Set(result.warnings.filter(value => typeof value === "string" && value.trim()))) : [];
    if (warnings.length) {
      const details = node("details", "unit-dico-warnings"); details.append(node("summary", "", t("sources")));
      const list = node("ul", ""); for (const warning of warnings) list.append(node("li", "", I18n.message(warning))); details.append(list); content.append(details);
    }
    container.replaceChildren(content);
    if (similarityHost) {
      ProjectSimilarity.render(similarityHost, timeline.projects, result.tagMap, {
        onSelect: options.onSelect, state: similarityState, programmeMap: result.programmeMap
      });
      similarityHosts.set(container, similarityHost);
    }
    mountTimelineBars(container, bars);
    syncTimelineScroll(container, calendarScroll, concurrency.scroll);
    const previousCleanup = timelineLifecycles.get(container);
    timelineLifecycles.set(container, () => { previousCleanup?.(); concurrency.cleanup?.(); });
    const restoreId = options.focusProjectId ?? focusedChoice;
    if (focusedView != null) viewInputs.get(focusedView)?.focus();
    else if (restoreId != null) choices.get(String(restoreId))?.focus();
    else if (focusedSelect != null) selects.find(control => control.getAttribute("data-unit-project-select") === focusedSelect && control.getAttribute("data-unit-project-kind") === focusedKind)?.focus();
    else if (focusedRefresh) refresh?.focus();
    else if (focusedRetry) (retry || refresh)?.focus();
    else if (focusedMonth != null) concurrency.buttons.find(button => button.getAttribute("data-unit-concurrency-month") === focusedMonth)?.focus();
    return content;
  }

  return { render, renderTimeline, cleanup, normalizeProjects, buildTimeline, buildConcurrency, isExcludedProjectName, colorFor };
});
