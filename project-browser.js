(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProjectBrowser = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const numberFormat = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 2 });
  const exactNumberFormat = new Intl.NumberFormat("fr-BE", { maximumSignificantDigits: 17 });
  const percentFormat = new Intl.NumberFormat("fr-BE", { style: "percent", maximumFractionDigits: 0 });
  let renderId = 0;
  const employeeColors = new Map(), assignedEmployeeColors = new Set();
  const employeePalette = ["#008bab", "#1c9c8c", "#6368ae", "#cd8747", "#b65c7b", "#488c62", "#5b88b4", "#8865a5", "#bc7057", "#86933f", "#448d8d", "#637d94"];
  let extraEmployeeColor = 0;
  const monthlyLifecycles = new WeakMap(), revealedMonthlyProjects = new Map();

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
    if (selectedEmployee) {
      const id = String(selectedEmployee.id);
      series.push({ key: id, id, kind: "employee-actual", values: values(selectedEmployee.values) });
      if (selectedEmployee.plannedStatus === "available" && Array.isArray(selectedEmployee.plannedReference)
        && selectedEmployee.plannedReference.length === months.length && selectedEmployee.plannedReference.every(value => numeric(value) !== null)) {
        series.push({ key: `planned:${id}`, id, kind: "employee-planned", values: values(selectedEmployee.plannedReference) });
      }
    } else for (const employee of employees) {
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
    if (!selectedEmployee) {
      if (Array.isArray(data?.convention)) series.push({ key: "convention", kind: "convention", values: values(data.convention) });
      series.push({ key: "total", kind: "total", values: values(data?.total) });
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

  function monthlyView(doc, node, selected, data, options, makeAvatar, id, focusMonth, tableOpen) {
    const summary = data.monthly;
    const mode = data.monthlyMode === "monthly" || data.monthlyMode === "cumulative" ? data.monthlyMode : summary?.mode === "cumulative" ? "cumulative" : "monthly";
    const cumulative = mode === "cumulative";
    const section = node("section", "project-monthly project-browser-section");
    section.setAttribute("data-monthly-project", String(selected.id));
    section.setAttribute("data-monthly-mode", mode);
    const heading = node("h3", "project-browser-section-title", "Projets · 02 / Évolution mensuelle");
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
    modeGroup.append(node("legend", "project-browser-sr-only", "Affichage des heures"));
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
      const message = node("p", "project-monthly-status", status === "loading" ? "Chargement de l’évolution mensuelle…" :
        status === "not-started" ? "Le projet n’a pas encore commencé." : "Évolution mensuelle indisponible : vérifiez les dates du projet.");
      message.setAttribute("role", "status"); section.append(message); addWarnings();
      return { section, toggle, modeInputs, cleanup, mount() {}, focus() {} };
    }
    const employees = (Array.isArray(summary.employees) ? summary.employees : []).filter(employee => employee?.id != null)
      .map(employee => ({ ...employee, name: String(employee.name || "Employé non identifié") }));
    const names = new Map();
    employees.forEach(employee => names.set(employee.name, (names.get(employee.name) || 0) + 1));
    employees.forEach(employee => { employee.label = names.get(employee.name) > 1 ? `${employee.name} (ID ${employee.id})` : employee.name; });
    const selectedEmployee = data.monthlyEmployeeId == null ? null : employees.find(employee => String(employee.id) === String(data.monthlyEmployeeId));
    const visibleEmployees = selectedEmployee ? [selectedEmployee] : employees;
    const plannedLabel = cumulative ? "Prévu cumulé · projection linéaire" : "Prévu · projection linéaire";
    const plannedAvailable = selectedEmployee?.plannedStatus === "available" && Array.isArray(selectedEmployee.plannedReference)
      && selectedEmployee.plannedReference.length === summary.months.length && selectedEmployee.plannedReference.every(value => numeric(value) !== null);
    const plannedValues = plannedAvailable ? selectedEmployee.plannedReference : null;
    const employeeButtons = [];
    let employeeReset = null;
    section.setAttribute("data-monthly-selected-employee", selectedEmployee ? String(selectedEmployee.id) : "");
    if (selectedEmployee) {
      employeeReset = node("button", "project-monthly-employee-reset", "Tous les employés"); employeeReset.type = "button";
      employeeReset.setAttribute("data-monthly-employee-reset", "");
      employeeReset.addEventListener("click", () => options.onMonthlyEmployeeChange?.(null)); controls.append(employeeReset);
    }
    const start = projectDate(summary.startDate), through = projectDate(summary.throughDate);
    const period = node("p", "project-monthly-period", start && through ?
      `Du ${start.label} au ${through.label} · hors filtre d’années · ${data.includeOrmitters ? "Ormitters inclus" : "hors Ormitters"}` : "Période du projet · hors filtre d’années");
    section.append(period);
    const months = summary.months;
    const currentKey = summary.throughDate?.slice(0, 7);
    const monthLabel = month => `${month.label || month.key}${month.key === currentKey ? ` · au ${through?.label || summary.throughDate} (mois en cours)` : ""}`;
    section.append(node("p", "project-monthly-note", selectedEmployee ?
      `${selectedEmployee.label} · ${cumulative ? "heures cumulées" : "heures de chaque mois"}, du début du projet à aujourd’hui. Le mois en cours est partiel. La projection répartit ses heures planifiées linéairement sur les dates du projet.` : cumulative ?
      "Heures cumulées mois après mois depuis le début du projet. Le mois en cours est partiel. La convention s’accumule au prorata des jours du projet, puis reste constante après sa fin." :
      "Heures de chaque mois, du début du projet à aujourd’hui. Le mois en cours est partiel. La convention est répartie par jour sur les dates du projet, puis nulle après sa fin."));
    if (selectedEmployee) {
      const planning = node("p", "project-monthly-note", plannedAvailable ?
        `Planning de ${selectedEmployee.label} sur la durée du projet : ${formatHours(selectedEmployee.plannedHours)}${numeric(selectedEmployee.plannedHours) === 0 ? " · aucune heure planifiée." : "."}` :
        `Planning de ${selectedEmployee.label} indisponible ; la projection linéaire ne peut pas être affichée.`);
      planning.setAttribute("data-monthly-employee-planning", plannedAvailable ? "available" : "unavailable"); section.append(planning);
      if (typeof selectedEmployee.plannedWarning === "string" && selectedEmployee.plannedWarning.trim()) {
        const warning = node("p", "project-monthly-note", selectedEmployee.plannedWarning);
        warning.setAttribute("data-monthly-planned-warning", ""); section.append(warning);
      }
    }
    if (visibleEmployees.some(employee => employee.values?.some(value => numeric(value) < 0))) {
      const note = node("p", "project-monthly-note", selectedEmployee ? "Les corrections négatives restent visibles sous zéro." : "Les corrections négatives sont empilées sous zéro. La ligne Total indique la somme nette des employés.");
      note.setAttribute("data-monthly-corrections", ""); section.append(note);
    }
    const totalLabel = cumulative ? "Total cumulé du projet" : "Total du projet";
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
        content.addEventListener("click", () => options.onMonthlyEmployeeChange?.(isSelected ? null : String(employee.id)));
        item.append(content); employeeButtons.push(content);
      }
      const sample = node("span", `project-monthly-legend-line is-${kind}`); sample.style.borderTopColor = color;
      if (kind === "employee" && !selectedEmployee) sample.style.backgroundColor = color;
      if (kind === "employee" && selectedEmployee) sample.classList.add("is-line");
      sample.setAttribute("aria-hidden", "true");
      content.append(sample);
      if (employee) content.append(makeAvatar(employee));
      content.append(node("span", "project-monthly-legend-name", label), node("span", "project-browser-sr-only", kind === "convention" || kind === "employee-planned" ? "courbe pointillée" : kind === "total" ? "courbe pleine épaisse" : selectedEmployee ? "courbe pleine" : "aire empilée"));
      if (employee?.isSubcontractor) content.append(node("span", "project-hours-employee-tag", "Ormitter"));
      legend.append(item);
    };
    employees.forEach(employee => legendItem(String(employee.id), employee.label, "employee", employeeColor(employee.id), employee));
    if (selectedEmployee) {
      if (plannedAvailable) legendItem(`planned:${selectedEmployee.id}`, plannedLabel, "employee-planned", employeeColor(selectedEmployee.id));
    } else {
      legendItem("total", totalLabel, "total", "#183b53");
      if (Array.isArray(summary.convention)) legendItem("convention", conventionLabel, "convention", "#8496a2");
    }
    section.append(legend);
    const chart = node("div", "project-monthly-chart-wrap");
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "project-monthly-chart"); svg.setAttribute("data-monthly-chart", "");
    svg.setAttribute("role", "group"); svg.setAttribute("aria-label", `${cumulative ? "Évolution cumulée" : "Évolution mensuelle"} de ${selectedEmployee ? selectedEmployee.label : selected.name}, ${selectedEmployee ? "réalisé et prévu en lignes" : "en aires empilées"} et en heures. Flèches gauche et droite pour parcourir les mois.`);
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
      if (selectedEmployee) {
        valueItem(String(selectedEmployee.id), `${selectedEmployee.label} · Réalisé${cumulative ? " cumulé" : ""}`, selectedEmployee.values?.[index], "employee-actual", employeeColor(selectedEmployee.id));
        valueItem(`planned:${selectedEmployee.id}`, plannedLabel, plannedValues?.[index], "employee-planned", employeeColor(selectedEmployee.id));
      } else {
        valueItem("total", totalLabel, summary.total?.[index], "total", "#183b53");
        if (Array.isArray(summary.convention)) valueItem("convention", cumulative ? "Convention cumulée" : "Convention", summary.convention[index], "convention", "#8496a2");
        employees.forEach(employee => valueItem(String(employee.id), employee.label, employee.values?.[index], "employee", employeeColor(employee.id)));
      }
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
    table.append(node("caption", "project-browser-sr-only", `Heures ${cumulative ? "cumulées" : "mensuelles"} de ${selectedEmployee ? selectedEmployee.label : selected.name}`));
    const tableHead = node("thead", ""), headerRow = node("tr", "");
    const columnLabels = selectedEmployee ? ["Mois", `${selectedEmployee.label} · Réalisé${cumulative ? " cumulé" : ""}`, plannedLabel] :
      ["Mois", ...employees.map(employee => employee.label), totalLabel, ...(Array.isArray(summary.convention) ? [cumulative ? "Convention cumulée" : "Convention"] : [])];
    for (const text of columnLabels) {
      const cell = node("th", "", text); cell.setAttribute("scope", "col"); headerRow.append(cell);
    }
    tableHead.append(headerRow); table.append(tableHead);
    const body = node("tbody", "");
    months.forEach((month, index) => {
      const row = node("tr", ""), label = node("th", "", monthLabel(month)); label.setAttribute("scope", "row"); row.append(label);
      const values = selectedEmployee ? [selectedEmployee.values?.[index], plannedValues?.[index]] :
        [...employees.map(employee => employee.values?.[index]), summary.total?.[index], ...(Array.isArray(summary.convention) ? [summary.convention[index]] : [])];
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
      const focusKey = doc.activeElement?.getAttribute?.("data-monthly-month");
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
      svg.append(svgNode("text", { x: plot.left + plot.width, y: geometry.height - 8, "text-anchor": "end", class: "project-monthly-axis-title" }, "Mois · * en cours"));
      const definitions = svgNode("defs"), clip = svgNode("clipPath", { id: `${id}-monthly-clip`, clipPathUnits: "userSpaceOnUse" });
      const reveal = svgNode("rect", { x: plot.left - 4, y: plot.top - 5, width: plot.width + 8, height: plot.height + 10, class: "project-monthly-reveal-window" });
      reveal.addEventListener("animationend", () => section.setAttribute("data-monthly-reveal", "complete")); clip.append(reveal); definitions.append(clip); svg.append(definitions);
      const lines = svgNode("g", { "clip-path": `url(#${id}-monthly-clip)`, "data-monthly-lines": "" });
      for (const item of geometry.series) {
        const color = item.id ? employeeColor(item.id) : item.kind === "total" ? "#183b53" : "#8496a2";
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
          "aria-label": selectedEmployee ? `${monthLabel(month)} : ${selectedEmployee.label}, ${formatHours(selectedEmployee.values?.[index])} réalisé${cumulative ? " cumulé" : ""} ; ${plannedLabel}, ${formatHours(plannedValues?.[index])}. Afficher le détail.` :
            `${monthLabel(month)} : ${formatHours(summary.total?.[index])} au total. Afficher le détail.`, "aria-describedby": tooltip.id, class: "project-monthly-month" });
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
      const projectKey = String(selected.id), revision = numeric(data.monthlyRevealKey) ?? 0;
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
    const content = node("div", "project-browser");
    container.setAttribute("aria-busy", String(Boolean(options.loading)));

    if (selected) {
      const previous = Array.from(container.querySelectorAll(".project-browser-detail"))
        .find(element => element.getAttribute("data-selected-project") === String(selected.id));
      const hadHeadingFocus = Array.from(previous?.querySelectorAll(".project-browser-title") || []).includes(doc.activeElement);
      const hadBackFocus = Array.from(previous?.querySelectorAll("[data-project-back]") || []).includes(doc.activeElement);
      const hadRetryFocus = Array.from(previous?.querySelectorAll(".project-hours-retry") || []).includes(doc.activeElement);
      const hadToggleFocus = Array.from(previous?.querySelectorAll("[data-include-ormitters]") || []).includes(doc.activeElement);
      const hadMonthlyToggleFocus = Array.from(previous?.querySelectorAll("[data-monthly-include-ormitters]") || []).includes(doc.activeElement);
      const focusedMonthlyMode = previous?.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-monthly-mode-choice") : null;
      const focusedMonthlyEmployee = previous?.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-monthly-employee-choice") : null;
      const hadMonthlyResetFocus = Array.from(previous?.querySelectorAll("[data-monthly-employee-reset]") || []).includes(doc.activeElement);
      const hadMonthlyTableFocus = Array.from(previous?.querySelectorAll("[data-monthly-table-toggle]") || []).includes(doc.activeElement);
      const tableOpen = Array.from(previous?.querySelectorAll(".project-monthly-details") || []).some(element => element.open);
      const focusedMonth = previous?.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-monthly-month") : null;
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
      if (options.years && Array.from(options.years).length) {
        header.append(node("span", "project-hours-period", Array.from(options.years).join(" · ")));
      }
      detail.append(header);
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
            node("span", "", comparisonKey === "lifetime" ? "Sur les dates du projet" : "Sur les années sélectionnées"));
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
      for (const [key, title] of [["personal", "Mes heures"], ["project", `Heures du projet · tous les employés (${inclusionLabel})`],
        ["lifetime", `Convention · durée du projet (${inclusionLabel})`]]) {
        const lifetime = key === "lifetime";
        const source = data[key];
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
            `Du ${startDate.label} au ${endDate.label} · hors filtre d’années` : "Dates du projet indisponibles · hors filtre d’années");
          period.setAttribute("data-project-lifetime-period", "");
          comparison.append(period);
        } else if (hasCalendarScope && validCalendarScope) {
          const period = node("p", "project-hours-scale-note",
            `Repère linéaire du ${scopedStart.label} au ${scopedEnd.label} · années sélectionnées dans les dates du projet.`);
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
              if (kind === "actual" && stacked) {
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
          pair.append(labels, tracks);
          comparison.append(pair);
          const note = missingBudget ? "Répartition du réalisé · sans échelle conventionnelle." : lifetime ?
            "Convention : Budget personnel BW, réparti linéairement sur les dates du projet ; le repère du jour suit le calendrier." :
            geometry.scaleAvailable ? hasCalendarScope ? validCalendarScope ?
              "Prévu réparti linéairement sur les années sélectionnées, dans les dates du projet ; le repère du jour suit cette période." :
              "Prévu sur les années sélectionnées ; repère linéaire indisponible sans dates valides du projet." :
              "Prévu réparti linéairement sur les années sélectionnées ; le repère du jour suit le calendrier." :
            geometry.unplanned ? "Hors planning · aucune heure prévue sur la période." : plan === null ? "Planning indisponible · échelle de comparaison indisponible." :
              plan < 0 ? "Planning net négatif après corrections · échelle de comparaison indisponible." : "Aucune heure prévue · échelle de comparaison indisponible.";
          comparison.append(node("p", "project-hours-scale-note", note));
          if (lifetime && !validDates) comparison.append(node("p", "project-hours-date-warning", "Dates du projet absentes ou invalides ; le réalisé est indisponible."));
          if (!lifetime && hasCalendarScope && !validCalendarScope) comparison.append(node("p", "project-hours-date-warning",
            "Repère du jour indisponible · dates du projet absentes, invalides ou hors des années sélectionnées."));
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
      overview.setAttribute("aria-labelledby", overviewTitle.id); overview.append(overviewTitle, comparisons); detail.append(overview);
      detail.append(employeeTooltip);
      const monthly = monthlyView(doc, node, selected, data, options, employeeAvatar, id, focusedMonth, tableOpen);
      detail.append(monthly.section); monthlyLifecycles.set(container, monthly.cleanup);
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
      monthly.mount();
      if (options.focusDetail || hadHeadingFocus) heading.focus();
      else if (hadBackFocus) back.focus();
      else if (hadRetryFocus) (retryButton || heading).focus();
      else if (hadToggleFocus) (includeToggle || heading).focus();
      else if (hadMonthlyToggleFocus) (monthly.toggle || heading).focus();
      else if (focusedMonthlyMode !== null) (monthly.modeInputs?.find(input => input.value === focusedMonthlyMode) || heading).focus();
      else if (focusedMonthlyEmployee !== null) (monthly.employeeButtons?.find(button => button.getAttribute("data-monthly-employee-choice") === focusedMonthlyEmployee) || monthly.employeeButtons?.[0] || heading).focus();
      else if (hadMonthlyResetFocus) (monthly.employeeReset || monthly.employeeButtons?.[0] || heading).focus();
      else if (hadMonthlyTableFocus) (monthly.tableToggle || heading).focus();
      else if (focusedMonth !== null) monthly.focus(focusedMonth);
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
        tile.append(input, avatar, node("span", "project-browser-name", project.name));
        grid.append(tile);
      });
      content.append(grid);
    }
    container.replaceChildren(content);
    if (options.focusProjectId != null) {
      Array.from(content.querySelectorAll("[data-project-choice]"))
        .find(input => input.getAttribute("data-project-choice") === String(options.focusProjectId))?.focus();
    }
    return content;
  }

  return { render, barGeometry, monthlyGeometry };
});
