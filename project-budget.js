(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./i18n-core-messages") : root.DashboardI18n);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProjectBudget = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (I18n) {
  "use strict";
  const t = I18n.t;

  const numbers = { format: value => I18n.formatNumber(value, { maximumFractionDigits: 2 }) };
  const percentages = { format: value => I18n.formatNumber(value, { style: "percent", maximumFractionDigits: 1 }) };
  let renderId = 0;
  const billDialogs = new WeakMap();
  const annualPlotHeight = 225;
  const statusKeys = Object.freeze({ draft: "budget.status.draft", under_validation: "budget.status.underValidation",
    confirmed: "budget.status.confirmed", revised: "budget.status.revised", done: "budget.status.done",
    canceled: "budget.status.canceled", cancelled: "budget.status.canceled", cancel: "budget.status.canceled" });

  function cleanup(container, restoreFocus = true) {
    const current = billDialogs.get(container);
    if (!current) return null;
    const key = current.triggerKey;
    current.close(restoreFocus);
    return key;
  }

  function numeric(value) {
    if (typeof value !== "number" && typeof value !== "string" || typeof value === "string" && !value.trim()) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function currencyKey(budget, fallback) {
    const id = numeric(budget?.currencyId);
    return id !== null && Number.isSafeInteger(id) && id > 0 ? `currency:${id}` : `unknown:${String(fallback ?? budget?.id ?? "budget")}`;
  }

  function currencyLabel(budget) { return String(budget?.currency || t("budget.currencyUnknown")); }
  function amount(value, currency) {
    const number = numeric(value);
    return number === null ? t("common.unavailable") : `${numbers.format(number)}${currency ? ` ${currency}` : ""}`;
  }
  function dateLabel(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? `${value.slice(8)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : null;
  }
  function period(budget) {
    const start = dateLabel(budget?.startDate), end = dateLabel(budget?.endDate);
    return start && end ? t("budget.rangePeriod", { p0: start, p1: end }) : t("common.periodUnavailable");
  }

  function niceLimit(value) {
    if (!(value > 0)) return 0;
    const power = 10 ** Math.floor(Math.log10(value));
    return Math.ceil(value / power * 2) / 2 * power;
  }

  // All bars in one currency group use the same signed, zero-based scale.
  function chartGeometry(input, domainValues = input) {
    const values = (Array.isArray(input) ? input : []).map(numeric);
    const domain = (Array.isArray(domainValues) ? domainValues : []).map(numeric).filter(value => value !== null);
    const minimum = niceLimit(Math.abs(Math.min(0, ...domain)));
    const maximum = niceLimit(Math.max(0, ...domain));
    const min = minimum ? -minimum : 0, max = maximum || (minimum ? 0 : 1), range = max - min;
    const zero = max / range * 100;
    const bars = values.map(value => {
      if (value === null) return { value: null, top: zero, height: null, negative: false, available: false };
      return { value, top: (max - Math.max(0, value)) / range * 100,
        height: Math.abs(value) / range * 100, negative: value < 0, available: true };
    });
    const ticks = [max, (max + min) / 2, min];
    if (!ticks.some(value => value === 0)) ticks.push(0);
    return { min, max, zero, bars, ticks: [...new Set(ticks)].sort((a, b) => b - a) };
  }

  function axisLabels(geometry, height = annualPlotHeight, spacing = 14) {
    const chosen = [], range = geometry.max - geometry.min;
    const position = value => (geometry.max - value) / range * height;
    // Zero stays visible even when a small credit is very close to the lower limit.
    for (const value of [...new Set([0, geometry.max, geometry.min, ...geometry.ticks])]) {
      if (chosen.every(other => Math.abs(position(value) - position(other)) >= spacing)) chosen.push(value);
    }
    return geometry.ticks.filter(value => chosen.includes(value));
  }

  function warningsOf(items) {
    return [...new Set(items.flatMap(item => Array.isArray(item) ? item : []).filter(Boolean).map(value =>
      typeof value === "string" ? value : String(value.message || value.label || value.title || t("budget.sourceInformationUnavailable"))))];
  }

  function unmappedLabel(row) {
    // These markers identify server-authored fallback labels, never Odoo rubrics.
    if (["budget.unmappedPersonnel", "budget.unmappedExpense"].includes(row?.labelMessageKey)) return t(row.labelMessageKey);
    return row?.label || t("budget.rubricMissing");
  }

  const annualMeasures = ["budgeted", "consumed", "committed", "pending", "balance"];
  const isExpenseLine = line => line?.isExpense === true || /^6/.test(String(line?.accountCode || ""));

  function isBwPersonnelCategory(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    const name = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      .replace(/^\d{4,6}\s*(?:[-:·]\s*)?/, "").replace(/\s+/g, " ").trim();
    return ["frais de personnel", "personnel", "frais de personnel bw", "personnel bw", "bw personnel", "bw frais de personnel"].includes(name);
  }

  function isBwPersonnelLine(line) {
    return typeof line?.isBwPersonnel === "boolean" ? line.isBwPersonnel : isBwPersonnelCategory(line?.category) === true;
  }

  function effectiveLifetime(lifetime, showBwPersonnelCosts = false) {
    if (showBwPersonnelCosts) return lifetime || {};
    if (lifetime?.expensesOnly && typeof lifetime.expensesOnly === "object") return lifetime.expensesOnly;
    return { status: "unavailable", currencyId: null, currency: null, consumed: null, expenseCost: null, personnelCost: null,
      byRubric: [], unmapped: [], outOfPeriod: {}, warnings: [t("budget.noExpensesOnlySource")] };
  }

  function effectiveConventionBudget(benchmark, showBwPersonnelCosts = false, fromMacro = false) {
    const source = numeric(benchmark?.budgetedTotal);
    if (showBwPersonnelCosts || !benchmark) return { budgetedTotal: source, warnings: [] };
    const unavailable = { budgetedTotal: null, warnings: [t("budget.noExpensesOnlyBudget")] };
    if (source === null || currencyKey(benchmark, "benchmark").startsWith("unknown:")) return unavailable;
    if (fromMacro) {
      const personnel = numeric(benchmark.personnelEuros);
      return personnel === null ? unavailable : { budgetedTotal: Math.round((source - personnel + Number.EPSILON) * 100) / 100, warnings: [] };
    }
    if (!Array.isArray(benchmark.lines)) return unavailable;
    const seen = new Set(); let retainedTotal = 0, detailTotal = 0;
    for (const line of benchmark.lines) {
      const id = numeric(line?.id), value = numeric(line?.budgeted);
      const classification = typeof line?.isBwPersonnel === "boolean" ? line.isBwPersonnel
        : line?.isBwPersonnel === null ? null : isBwPersonnelCategory(line?.category);
      if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id) || classification === null || value === null ||
        currencyKey(line, line?.id) !== currencyKey(benchmark, "benchmark")) return unavailable;
      seen.add(id);
      detailTotal += value;
      if (!classification) retainedTotal += value;
    }
    if (Math.round((detailTotal + Number.EPSILON) * 100) !== Math.round((source + Number.EPSILON) * 100)) return unavailable;
    return { budgetedTotal: Math.round((retainedTotal + Number.EPSILON) * 100) / 100, warnings: [] };
  }

  function retainAnnualLine(line) {
    return !annualMeasures.every(field => numeric(line?.[field]) === 0);
  }

  function effectiveAnnual(budget, excludeOrmitterCosts = false) {
    const exclusion = budget?.ormitterExclusion;
    const replacements = new Map((Array.isArray(exclusion?.lines) ? exclusion.lines : []).map(line => [String(line.id), line]));
    const lines = (Array.isArray(budget?.lines) ? budget.lines : []).filter(line => !isBwPersonnelLine(line))
      .map(line => excludeOrmitterCosts && isExpenseLine(line) ? {
        ...line, consumed: numeric(replacements.get(String(line.id))?.consumed), committed: numeric(replacements.get(String(line.id))?.committed)
      } : line);
    const expenses = lines.filter(isExpenseLine);
    const compatible = Array.isArray(budget?.lines) && !currencyKey(budget, budget?.id).startsWith("unknown:") &&
      expenses.every(line => currencyKey(line, line.id) === currencyKey(budget, budget?.id));
    const totals = Object.fromEntries(annualMeasures.map(field => [field,
      compatible && numeric(budget?.totals?.[field]) !== null && expenses.every(line => numeric(line[field]) !== null)
        ? Math.round((expenses.reduce((sum, line) => sum + numeric(line[field]), 0) + Number.EPSILON) * 100) / 100 : null]));
    return { ...budget, totals, lines };
  }

  function codeColor(code) {
    let hash = 0;
    for (const character of String(code || "unknown")) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    return `hsl(${(hash * 137.508 % 360).toFixed(3)} 52% 48%)`;
  }

  function annualCodes(budget) {
    const groups = new Map();
    for (const line of (Array.isArray(budget?.lines) ? budget.lines : []).filter(line => isExpenseLine(line) && !isBwPersonnelLine(line))) {
      const key = `${line.categoryId == null ? `line:${line.id}` : `category:${line.categoryId}`}:${currencyKey(line, line.id)}`;
      if (!groups.has(key)) groups.set(key, { key, code: String(line.accountCode || "?"), name: String(line.category || t("budget.categoryMissing")),
        categoryId: line.categoryId, currencyId: line.currencyId, currency: line.currency, lines: [] });
      groups.get(key).lines.push(line);
    }
    return [...groups.values()].map(group => {
      const values = Object.fromEntries(["budgeted", "consumed", "committed"].map(field => [field,
        group.lines.every(line => numeric(line[field]) !== null) ? Math.round((group.lines.reduce((sum, line) => sum + numeric(line[field]), 0) + Number.EPSILON) * 100) / 100 : null]));
      return { ...group, values, compatible: currencyKey(group, group.key) === currencyKey(budget, budget.id), color: codeColor(group.code) };
    }).filter(group => Object.values(group.values).some(value => value !== 0))
      .sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true }) || a.key.localeCompare(b.key, "fr", { numeric: true }));
  }

  function billDetailsForCode(code, { excludeOrmitterCosts = false } = {}) {
    const lines = Array.isArray(code?.lines) ? code.lines : [], warnings = [], records = new Map();
    let sourceUnavailable = false, sourcePartial = false, overlaps = 0, conflicts = 0, invalidItems = 0;
    let sourceConsumed = 0;
    for (const line of lines) {
      const detail = line.billDetails;
      if (!detail || detail.status === "unavailable") sourceUnavailable = true;
      if (detail?.status !== "reconciled") sourcePartial = true;
      warnings.push(...warningsOf([detail?.warnings]));
      if (sourceConsumed !== null) sourceConsumed = numeric(detail?.sourceConsumed) === null ? null : sourceConsumed + numeric(detail.sourceConsumed);
      for (const item of Array.isArray(detail?.items) ? detail.items : []) {
        const id = numeric(item?.id);
        if (!Number.isSafeInteger(id) || id <= 0) { invalidItems++; continue; }
        const previous = records.get(id);
        if (previous) {
          if (!previous.lineIds.has(String(line.id))) overlaps++;
          previous.lineIds.add(String(line.id));
          if (numeric(previous.item.consumed) !== numeric(item.consumed) || currencyKey(previous.item, id) !== currencyKey(item, id) ||
            previous.item.date !== item.date || previous.item.isOrmitTalent !== item.isOrmitTalent) conflicts++;
        } else records.set(id, { item: { ...item, id }, lineIds: new Set([String(line.id)]) });
      }
    }
    const all = [...records.values()].map(record => record.item), items = [], uncertainItems = [], excluded = [];
    for (const item of all) {
      if (excludeOrmitterCosts && item.isOrmitTalent === true) excluded.push(item);
      else if (excludeOrmitterCosts && item.isOrmitTalent !== false && numeric(item.consumed) !== 0) uncertainItems.push(item);
      else items.push(item);
    }
    const compatible = rows => numeric(code?.currencyId) > 0 && rows.every(item =>
      numeric(item.consumed) !== null && currencyKey(item, item.id) === currencyKey(code, code.key));
    const sum = rows => compatible(rows) ? Math.round((rows.reduce((total, item) => total + numeric(item.consumed), 0) + Number.EPSILON) * 100) / 100 : null;
    let visibleConsumed = sum(items);
    const targetConsumed = numeric(code?.values?.consumed);
    if (!items.length && (sourcePartial || uncertainItems.length || targetConsumed === null)) visibleConsumed = null;
    const sourceVisible = sum(all);
    const gap = visibleConsumed === null || targetConsumed === null ? null : Math.round((visibleConsumed - targetConsumed + Number.EPSILON) * 100) / 100;
    const sourceMatches = sourceConsumed !== null && sourceVisible !== null && Math.abs(sourceConsumed - sourceVisible) <= 0.05;
    if (overlaps) warnings.push(t("budget.duplicateEntries"));
    if (conflicts) warnings.push(t("budget.conflictingEntries"));
    if (invalidItems) warnings.push(t("budget.illegibleEntryIdentity"));
    if (uncertainItems.length) warnings.push(t("budget.unverifiedSuppliers"));
    if (!sourceMatches || gap === null || Math.abs(gap) > 0.05) warnings.push(t("budget.unreconciledList"));
    const reconciled = !sourcePartial && !overlaps && !conflicts && !invalidItems && !uncertainItems.length && sourceMatches && gap !== null && Math.abs(gap) <= 0.05;
    const status = reconciled ? "reconciled" : sourceUnavailable && !all.length ? "unavailable" : "partial";
    const ordered = rows => rows.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || b.id - a.id);
    return { status, items: ordered(items), uncertainItems: ordered(uncertainItems), visibleConsumed, targetConsumed, sourceConsumed, gap,
      excludedCount: excluded.length, excludedConsumed: sum(excluded), overlaps, warnings: [...new Set(warnings)] };
  }

  function render(container, data, options = {}) {
    const doc = container.ownerDocument || document;
    const modalTrigger = cleanup(container, false);
    const focused = doc.activeElement;
    const oldChoice = container.contains(focused) ? focused?.getAttribute?.("data-budget-convention-choice") : null;
    const oldDetails = container.contains(focused) ? focused?.getAttribute?.("data-budget-details") : null;
    const oldRetry = container.contains(focused) && focused?.getAttribute?.("data-budget-retry") !== null;
    const oldExclusion = container.contains(focused) && focused?.getAttribute?.("data-budget-exclude-ormitter-costs") !== null;
    const oldPersonnelChoice = container.contains(focused) && focused?.getAttribute?.("data-budget-show-bw-personnel-costs") !== null;
    const oldCodeDetail = modalTrigger || (container.contains(focused) ? focused?.getAttribute?.("data-budget-code-detail") : null);
    const expanded = new Set(Array.from(container.querySelectorAll("[data-budget-details-panel]"))
      .filter(element => element.open).map(element => element.getAttribute("data-budget-details-panel")));
    const node = (tag, className, text) => {
      const element = doc.createElement(tag);
      if (className) element.className = className;
      if (text != null) element.textContent = String(text);
      return element;
    };
    const panel = node("div", "project-budget");
    panel.setAttribute("data-project-budget", String(data?.project?.id || ""));
    panel.setAttribute("aria-busy", String(options.loading === true));
    const unique = `project-budget-${++renderId}`;
    let retry = null, exclusionInput = null, personnelInput = null;
    function status(text, kind = "status") {
      const message = node("p", `project-budget-status${kind === "alert" ? " is-error" : ""}`, I18n.message(text));
      message.setAttribute("role", kind); return message;
    }
    function warningList(values, target) {
      if (!values.length) return;
      const list = node("ul", "project-budget-warnings");
      values.forEach(value => list.append(node("li", "", I18n.message(value))));
      target.append(list);
    }
    function section(title, subtitle, kind) {
      const section = node("section", `project-budget-section is-${kind}`);
      const heading = node("h3", "project-browser-section-title", title); heading.id = `${unique}-${kind}`;
      section.setAttribute("aria-labelledby", heading.id); section.append(heading);
      if (subtitle) section.append(node("p", "project-budget-section-note", subtitle));
      panel.append(section); return section;
    }
    function metric(label, value, note = "", kind = "") {
      const card = node("div", `project-budget-metric${kind ? ` is-${kind}` : ""}`);
      card.append(node("span", "project-budget-metric-label", label), node("strong", "project-budget-metric-value", value));
      if (note) card.append(node("span", "project-budget-metric-note", note));
      return card;
    }
    function badge(budget) {
      const status = budget?.status;
      const code = String(status?.code || "unknown");
      const label = Object.hasOwn(statusKeys, code) ? t(statusKeys[code]) : String(status?.label || t("budget.statusUnavailable"));
      const badge = node("span", "project-budget-badge", label);
      badge.setAttribute("data-budget-status", code);
      return badge;
    }
    function details(key, label, headings, rows, target) {
      const detail = node("details", "project-budget-details");
      detail.setAttribute("data-budget-details-panel", key); detail.open = expanded.has(key);
      const summary = node("summary", "project-budget-details-toggle", label); summary.setAttribute("data-budget-details", key);
      const wrap = node("div", "project-budget-table-wrap"), table = node("table", "project-budget-table");
      const caption = node("caption", "project-budget-table-caption", label); table.append(caption);
      const head = node("thead", ""), headRow = node("tr", "");
      headings.forEach(text => { const cell = node("th", "", text); cell.setAttribute("scope", "col"); headRow.append(cell); });
      head.append(headRow); table.append(head);
      const body = node("tbody", "");
      rows.forEach(values => {
        const row = node("tr", "");
        values.forEach((value, index) => { const cell = node(index ? "td" : "th", "", value); if (!index) cell.setAttribute("scope", "row"); row.append(cell); });
        body.append(row);
      });
      table.append(body); wrap.append(table); detail.append(summary, wrap); target.append(detail);
    }
    function horizontal(values, labels, unit, target, attribute) {
      const geometry = chartGeometry(values);
      const group = node("div", "project-budget-horizontal");
      group.setAttribute("role", "img"); group.setAttribute("aria-label", labels.map((label, index) => `${label} : ${amount(values[index], unit)}`).join(" ; "));
      labels.forEach((label, index) => {
        const bar = geometry.bars[index], row = node("div", "project-budget-horizontal-row");
        row.append(node("span", "project-budget-horizontal-label", label), node("strong", "project-budget-horizontal-value", amount(values[index], unit)));
        const track = node("div", "project-budget-horizontal-track"); track.setAttribute("aria-hidden", "true");
        const origin = (0 - geometry.min) / (geometry.max - geometry.min) * 100;
        const baseline = node("span", "project-budget-horizontal-zero"); baseline.style.left = `${origin}%`; track.append(baseline);
        if (bar.available) {
          const fill = node("span", `project-budget-horizontal-fill is-${index ? "consumed" : "budgeted"}${bar.negative ? " is-negative" : ""}`);
          fill.style.left = `${bar.negative ? origin - bar.height : origin}%`; fill.style.width = `${bar.height}%`;
          fill.setAttribute("data-budget-horizontal", `${attribute}:${index ? "consumed" : "budgeted"}`);
          fill.setAttribute("data-budget-value", String(bar.value)); track.append(fill);
        } else track.classList.add("is-unavailable");
        row.append(track); group.append(row);
      });
      target.append(group);
    }

    function openBills(trigger, code, budget, kind, year) {
      cleanup(container, false);
      const triggerKey = trigger.getAttribute("data-budget-code-detail"), detail = billDetailsForCode(code, options);
      const dialog = node("dialog", "project-budget-bills-dialog");
      dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("data-budget-bills-modal", triggerKey);
      const title = node("h3", "project-budget-bills-title", t("budget.billsTitle", { p0: code.code, p1: year }));
      title.id = `${unique}-bill-title`; title.setAttribute("tabindex", "-1"); dialog.setAttribute("aria-labelledby", title.id);
      const closeButton = node("button", "project-budget-bills-close", t("common.close")); closeButton.type = "button";
      closeButton.setAttribute("aria-label", t("budget.closeBills")); closeButton.setAttribute("data-budget-bills-close", "");
      const header = node("header", "project-budget-bills-header"); header.append(title, closeButton);
      const body = node("div", "project-budget-bills-body");
      const intro = node("p", "project-budget-bills-intro", code.name); intro.id = `${unique}-bill-description`;
      dialog.setAttribute("aria-describedby", intro.id); body.append(intro);
      const periods = [...new Set(code.lines.map(period))];
      body.append(node("p", "project-budget-small-note", t("budget.billsPeriodScope", { p0: periods.join(" · ") })));
      const measures = { budgeted: t("budget.budgeted"), consumed: t("budget.invoicedConsumed"), committed: t("budget.committed") };
      const summary = node("dl", "project-budget-bills-summary");
      [[t("budget.selectedBar", { p0: measures[kind] }), amount(code.values[kind], currencyLabel(code))],
        [detail.status === "reconciled" ? t("budget.relatedExpenses") : t("budget.incompleteExpenses"), amount(detail.visibleConsumed, currencyLabel(code))],
        [t("budget.relatedEntries"), numbers.format(detail.items.length)]].forEach(([label, value]) => {
        const item = node("div", ""); item.append(node("dt", "", label), node("dd", "", value)); summary.append(item);
      });
      body.append(summary);
      if (kind !== "consumed") body.append(node("p", "project-budget-bills-scope-note",
        t("budget.billsScope")));
      if (options.excludeOrmitterCosts === true) {
        body.append(node("p", "project-budget-bills-scope-note", t("budget.ormitterBillsFiltered", { p0: numbers.format(detail.excludedCount), p1: amount(detail.excludedConsumed, currencyLabel(code)) })));
      }
      if (detail.status === "unavailable") body.append(status(t("budget.billsUnavailable")));
      else if (detail.status !== "reconciled") body.append(status(t("budget.partialBills")));
      else if (!detail.items.length) body.append(status(t("budget.noBills")));
      if (detail.gap !== null && Math.abs(detail.gap) > 0.05) body.append(node("p", "project-budget-bills-scope-note", t("budget.billsGap", { p0: amount(detail.gap, currencyLabel(code)) })));
      const rows = [...detail.items.map(item => ({ ...item, supplierUncertain: false })),
        ...detail.uncertainItems.map(item => ({ ...item, supplierUncertain: true }))];
      let scroll = null;
      if (rows.length) {
        scroll = node("div", "project-budget-bills-scroll"); scroll.setAttribute("tabindex", "0");
        scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", t("budget.entriesRegion")); scroll.setAttribute("data-budget-bill-scroll", "");
        const table = node("table", "project-budget-bills-table"), head = node("thead", ""), row = node("tr", "");
        for (const label of [t("budget.date"), t("budget.supplier"), t("budget.settlementsDescription"), t("budget.postedAmount")]) {
          const cell = node("th", "", label); cell.setAttribute("scope", "col"); row.append(cell);
        }
        head.append(row); table.append(head);
        const tableBody = node("tbody", "");
        for (const item of rows) {
          const row = node("tr", ""); row.setAttribute("data-budget-bill-id", String(item.id));
          if (item.supplierUncertain) row.setAttribute("data-budget-bill-supplier-unknown", "true");
          const date = node("td", "", dateLabel(item.date) || t("common.dateUnavailableCapital")); date.setAttribute("data-bill-label", t("budget.date"));
          const supplier = node("td", "", item.supplierLabel || t("budget.supplierUnavailable")); supplier.setAttribute("data-bill-label", t("budget.supplier"));
          if (item.supplierUncertain) supplier.append(node("span", "project-budget-bill-unknown", t("budget.unverifiedSupplier")));
          const document = node("th", "project-budget-bill-reference"); document.setAttribute("scope", "row"); document.setAttribute("data-bill-label", t("budget.referenceDescription"));
          document.append(node("strong", "", item.documentLabel || t("budget.referenceUnavailable")),
            node("span", "project-budget-bill-description", typeof item.description === "string" && item.description.trim() ? item.description : t("budget.descriptionMissing")));
          const value = node("td", "project-budget-bill-amount", amount(item.consumed, currencyLabel(item))); value.setAttribute("data-bill-label", t("budget.postedAmount"));
          row.append(date, supplier, document, value); tableBody.append(row);
        }
        table.append(tableBody); scroll.append(table); body.append(scroll);
      }
      warningList(detail.warnings, body);
      const footer = node("footer", "project-budget-bills-footer", t("budget.billsFooter"));
      dialog.append(header, body, footer);
      let closed = false;
      const close = (restore = true) => {
        if (closed) return; closed = true;
        if (dialog.open && typeof dialog.close === "function") dialog.close();
        dialog.remove?.(); billDialogs.delete(container);
        if (restore) {
          const current = Array.from(container.querySelectorAll("[data-budget-code-detail]")).find(button => button.getAttribute("data-budget-code-detail") === triggerKey);
          if (current && current.isConnected !== false) current.focus();
        }
      };
      billDialogs.set(container, { triggerKey, dialog, close });
      closeButton.addEventListener("click", () => close(true));
      dialog.addEventListener("cancel", event => { event.preventDefault?.(); close(true); });
      dialog.addEventListener("close", () => close(true));
      dialog.addEventListener("click", event => {
        if (event.target !== dialog || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.left + bounds.width || event.clientY < bounds.top || event.clientY > bounds.top + bounds.height) close(true);
      });
      dialog.addEventListener("keydown", event => {
        if (event.key === "Escape") { event.preventDefault?.(); close(true); return; }
        if (event.key !== "Tab") return;
        const targets = scroll ? [closeButton, scroll] : [closeButton], current = targets.indexOf(doc.activeElement);
        if (current === -1 || !event.shiftKey && current === targets.length - 1 || event.shiftKey && current === 0) {
          event.preventDefault?.(); (event.shiftKey ? targets.at(-1) : targets[0]).focus();
        }
      });
      panel.append(dialog);
      if (typeof dialog.showModal === "function") dialog.showModal();
      else { dialog.open = true; dialog.setAttribute("open", ""); }
      title.focus();
      return dialog;
    }

    if (!data && options.loading) panel.append(status(t("budget.loading")));
    if (options.error) {
      const failure = node("div", "project-budget-error"); failure.append(status(options.error, "alert"));
      if (typeof options.onRetry === "function") {
        retry = node("button", "project-browser-back project-budget-retry", t("common.retry")); retry.type = "button";
        retry.disabled = options.loading === true; retry.setAttribute("data-budget-retry", "");
        retry.addEventListener("click", () => options.onRetry()); failure.append(retry);
      }
      panel.append(failure);
    }
    if (!data) {
      if (!options.loading && !options.error) panel.append(status(t("budget.unavailable")));
      container.replaceChildren(panel);
      if (oldRetry && retry) retry.focus();
      return panel;
    }

    const showBwPersonnelCosts = options.showBwPersonnelCosts === true;
    const macro = data.macro || {}, lifetime = effectiveLifetime(data.lifetime, showBwPersonnelCosts);
    const conventions = Array.isArray(data.conventions) ? data.conventions : [];
    const requested = options.selectedConventionId == null ? null : conventions.find(budget => String(budget.id) === String(options.selectedConventionId));
    const selected = requested || (conventions.length === 1 ? conventions[0] : null);
    const convention = section(t("budget.conventionHeading"), t("budget.conventionDescription"), "convention");
    const personnelToggle = node("label", "project-budget-exclusion-toggle project-budget-personnel-toggle"); personnelInput = node("input", "");
    personnelInput.type = "checkbox"; personnelInput.checked = showBwPersonnelCosts;
    personnelInput.setAttribute("data-budget-show-bw-personnel-costs", "");
    personnelInput.addEventListener("change", () => options.onShowBwPersonnelCostsChange?.(personnelInput.checked));
    personnelToggle.append(personnelInput, node("span", "", t("budget.showBwPersonnel"))); convention.append(personnelToggle);
    const macroGrid = node("div", "project-budget-macro-grid");
    const macroCurrency = currencyLabel(macro);
    macroGrid.append(metric(t("budget.projectSheetTotal"), amount(macro.conventionTotal, macroCurrency), t("budget.conventionAmountSource")),
      metric(t("budget.personnelBudget"), amount(macro.personnelEuros, macroCurrency), t("budget.conventionHoursCaption", { p0: amount(macro.personnelHours, "h") })),
      metric(t("budget.maximumFunding"), amount(macro.maxFunding, macroCurrency), String(macro.fundingType || t("budget.typeMissing"))));
    convention.append(macroGrid);
    const metadata = node("dl", "project-budget-metadata");
    const metadataValues = [[t("budget.projectDates"), period(data.project)], [t("budget.fundingOrganisation"), macro.fundingOrganism || t("budget.notProvided")],
      [t("budget.conventionReference"), macro.externalReference || t("budget.notProvidedFeminine")]];
    metadataValues.forEach(([label, value]) => { const item = node("div", ""); item.append(node("dt", "", label), node("dd", "", value)); metadata.append(item); });
    convention.append(metadata);
    if (conventions.length > 1) {
      const choices = node("fieldset", "project-budget-convention-choices"); choices.append(node("legend", "", t("budget.chooseConvention")));
      conventions.forEach(budget => {
        const label = node("label", "project-budget-convention-choice"), input = node("input", "");
        input.type = "radio"; input.name = `${unique}-convention`; input.value = String(budget.id); input.checked = selected?.id === budget.id;
        input.setAttribute("data-budget-convention-choice", String(budget.id));
        input.addEventListener("change", () => { if (input.checked) options.onConventionChange?.(budget.id); });
        label.append(input, node("span", "", `${budget.name || t("budget.conventionWithId", { p0: budget.id })} · ${period(budget)}`), badge(budget)); choices.append(label);
      });
      convention.append(choices);
    }
    if (selected) {
      const identity = node("div", "project-budget-selected-convention");
      identity.append(node("strong", "", selected.name || t("budget.conventionWithId", { p0: selected.id })), badge(selected), node("span", "", `${period(selected)} · ${currencyLabel(selected)}`));
      convention.append(identity);
      if (selected.quality && selected.quality !== "reconciled" && selected.quality !== "available") convention.append(node("p", "project-budget-quality",
        t("budget.conventionCheckIncomplete")));
    } else if (conventions.length > 1) convention.append(status(t("budget.chooseConventionHelp")));
    const benchmark = selected || (!conventions.length ? { ...macro, budgetedTotal: macro.conventionTotal } : null);
    const budgetBasis = effectiveConventionBudget(benchmark, showBwPersonnelCosts, !selected);
    const sameCurrency = benchmark && currencyKey(benchmark, "benchmark") === currencyKey(lifetime, "lifetime");
    const cost = numeric(lifetime.consumed), budgeted = budgetBasis.budgetedTotal;
    const validCost = lifetime.status === "available" || lifetime.status === "partial";
    const comparable = Boolean(sameCurrency && validCost && cost !== null && budgeted !== null);
    const totals = node("div", "project-budget-total-grid");
    totals.append(metric(t("budget.conventionBudget"), amount(budgeted, benchmark?.currency), `${selected ? t("budget.selectedConvention") : t("budget.projectSheet")}${showBwPersonnelCosts ? "" : t("budget.excludingBwPersonnelSuffix")}`, "budgeted"),
      metric(lifetime.status === "partial" ? t("budget.partialConsumed") : t("budget.recordedConsumed"), amount(validCost ? cost : null, lifetime.currency), showBwPersonnelCosts ? t("budget.costWithBw") : t("budget.costWithoutBw"), "consumed"),
      metric(t("budget.calculatedBalance"), amount(comparable ? budgeted - cost : null, benchmark?.currency), t("budget.budgetMinusConsumed"), "balance"));
    convention.append(totals);
    if (comparable) {
      const headline = node("p", `project-budget-consumption-ratio${cost > budgeted && budgeted > 0 ? " is-overrun" : ""}`,
        budgeted > 0 ? t("budget.consumptionRatio", { p0: percentages.format(cost / budgeted), p1: lifetime.status === "partial" ? t("budget.partialSourceSuffix") : "" }) : t("budget.ratioUnavailable"));
      headline.setAttribute("data-budget-ratio", ""); convention.append(headline);
      horizontal([budgeted, cost], [t("budget.conventionBudget"), t("budget.recordedConsumed")], benchmark.currency, convention, "total");
    } else if (benchmark && validCost && cost !== null && budgeted !== null) convention.append(status(t("budget.currencyComparisonUnavailable")));
    if (lifetime.status === "partial") convention.append(status(t("budget.partialConsumptionWarning")));
    const sourceCost = node("p", "project-budget-cost-basis", t("budget.sourceCost", { p0: amount(lifetime.expenseCost, lifetime.currency), p1: showBwPersonnelCosts ? t("budget.bwRecordedCostSuffix", { p0: amount(lifetime.personnelCost, lifetime.currency) }) : t("budget.bwCostHiddenSuffix"), p2: showBwPersonnelCosts ? t("budget.fullConventionBasis") : t("budget.excludingBwConventionBasis") }));
    convention.append(sourceCost);
    const outOfPeriod = lifetime.outOfPeriod || {};
    const beforeCount = numeric(outOfPeriod.beforeStart?.count), afterCount = numeric(outOfPeriod.afterEnd?.count);
    if (beforeCount > 0 || afterCount > 0) convention.append(node("p", "project-budget-small-note",
      t("budget.outsideProjectDates", { p0: numbers.format(beforeCount || 0), p1: amount(outOfPeriod.beforeStart?.consumed, lifetime.currency), p2: numbers.format(afterCount || 0), p3: amount(outOfPeriod.afterEnd?.consumed, lifetime.currency) })));
    if (numeric(lifetime.zeroValuedHoursCount) > 0) convention.append(node("p", "project-budget-small-note",
      t("budget.unvaluedHours", { p0: numbers.format(numeric(lifetime.zeroValuedHoursCount)) })));
    const rubricCosts = Array.isArray(lifetime.byRubric) ? lifetime.byRubric : [];
    const sourceConventionLines = Array.isArray(selected?.lines) ? selected.lines : [];
    const hiddenPersonnelRubrics = new Set(sourceConventionLines.filter(isBwPersonnelLine).map(line => String(line.categoryId)));
    const lines = showBwPersonnelCosts ? sourceConventionLines : sourceConventionLines.filter(line => !isBwPersonnelLine(line));
    const costs = new Map();
    rubricCosts.forEach(row => {
      if (row.categoryId != null) {
        const key = String(row.categoryId), current = costs.get(key);
        costs.set(key, { ...row, consumed: current ? numeric(current.consumed) === null || numeric(row.consumed) === null ? null : numeric(current.consumed) + numeric(row.consumed) : numeric(row.consumed) });
      }
    });
    const rubricRows = [], seen = new Set();
    const combinedLines = new Map();
    lines.forEach(line => {
      const key = `${line.categoryId == null ? `line:${line.id}` : `category:${line.categoryId}`}:${currencyKey(line, line.id)}`;
      const entry = combinedLines.get(key);
      if (!entry) combinedLines.set(key, { ...line, budgeted: numeric(line.budgeted) });
      else entry.budgeted = numeric(entry.budgeted) === null || numeric(line.budgeted) === null ? null : numeric(entry.budgeted) + numeric(line.budgeted);
    });
    if (combinedLines.size || rubricCosts.length) {
      convention.append(node("h4", "project-budget-subtitle", t("budget.consumptionByRubric")));
      combinedLines.forEach(line => {
        const key = line.categoryId == null ? null : String(line.categoryId), matching = key === null ? null : costs.get(key);
        const lineCurrencyCompatible = currencyKey(line, `line:${line.id}`) === currencyKey(lifetime, "lifetime");
        // A readable, complete exact-rubric source may establish known zero. Partial reads cannot.
        const consumed = !validCost || !sameCurrency || !lineCurrencyCompatible ? null : matching ? numeric(matching.consumed) : lifetime.status === "available" && key !== null ? 0 : null;
        if (key !== null) seen.add(key);
        const row = node("div", "project-budget-rubric"); row.setAttribute("data-budget-rubric", key ?? `line:${line.id}`);
        row.append(node("strong", "project-budget-rubric-name", line.category || t("budget.rubricMissing")));
        horizontal([line.budgeted, consumed], [t("budget.budgeted"), t("budget.consumed")], currencyLabel(line), row, `rubric:${key ?? line.id}`);
        convention.append(row);
        rubricRows.push([line.category || t("budget.rubricMissing"), amount(line.budgeted, currencyLabel(line)), amount(consumed, lifetime.currency),
          amount(consumed !== null && numeric(line.budgeted) !== null ? line.budgeted - consumed : null, currencyLabel(line))]);
      });
      costs.forEach((row, key) => {
        if (!seen.has(key)) rubricRows.push([!showBwPersonnelCosts && hiddenPersonnelRubrics.has(key)
          ? t("budget.hiddenPersonnelRubricExpense", { p0: row.category || t("budget.rubricMissing") })
          : t("budget.outsideConventionLines", { p0: row.category || t("budget.rubricMissing") }),
        t("common.unavailable"), amount(row.consumed, lifetime.currency), t("common.unavailable")]);
      });
    }
    const unmapped = Array.isArray(lifetime.unmapped) ? lifetime.unmapped : [];
    if (unmapped.length) {
      const unassigned = node("div", "project-budget-unmapped"); unassigned.append(node("h4", "project-budget-subtitle", t("budget.unmatchedCosts")));
      unmapped.forEach(row => {
        const item = node("p", ""); item.append(node("span", "", unmappedLabel(row)), node("strong", "", amount(row.consumed, lifetime.currency))); unassigned.append(item);
        rubricRows.push([unmappedLabel(row), t("common.unavailable"), amount(row.consumed, lifetime.currency), t("common.unavailable")]);
      });
      unassigned.append(node("p", "project-budget-small-note", t("budget.unmatchedCostHelp")));
      convention.append(unassigned);
    }
    if (rubricRows.length) details(`convention:${selected?.id || "none"}`, t("budget.conventionRubricDetails"), [t("budget.rubric"), t("budget.budgeted"), t("budget.consumed"), t("budget.calculatedBalance")], rubricRows, convention);
    if (!conventions.length) convention.append(status(t("budget.noConventionLines")));
    warningList(warningsOf([selected?.warnings, lifetime.warnings, budgetBasis.warnings]), convention);

    const annualSection = section(t("budget.annualHeading"), t("budget.annualDescription"), "annual");
    const legend = node("ul", "project-budget-legend");
    [["budgeted", t("budget.budgeted")], ["consumed", t("budget.invoicedConsumed")], ["committed", t("budget.committed")]].forEach(([kind, label]) => {
      const item = node("li", ""); item.append(node("span", `project-budget-legend-dot is-${kind}`), node("span", "", label)); legend.append(item);
    });
    annualSection.append(legend, node("p", "project-budget-section-note", t("budget.annualAccountingNote")));
    const exclusionToggle = node("label", "project-budget-exclusion-toggle"); exclusionInput = node("input", "");
    exclusionInput.type = "checkbox"; exclusionInput.checked = options.excludeOrmitterCosts === true;
    exclusionInput.setAttribute("data-budget-exclude-ormitter-costs", "");
    exclusionInput.addEventListener("change", () => options.onExcludeOrmitterCostsChange?.(exclusionInput.checked));
    exclusionToggle.append(exclusionInput, node("span", "", t("budget.excludeOrmitters"))); annualSection.append(exclusionToggle);
    annualSection.append(node("p", "project-budget-small-note", t("budget.ormitterScope")));
    if (options.excludeOrmitterCosts === true) annualSection.append(node("p", "project-budget-section-note",
      t("budget.ormitterFilteredNote")));
    const annual = (Array.isArray(data.annual) ? data.annual : []).map(budget => effectiveAnnual(budget, options.excludeOrmitterCosts === true))
      .sort((a, b) => String(a.startDate || "9999").localeCompare(String(b.startDate || "9999")) || Number(a.id) - Number(b.id));
    const currencyGroups = new Map();
    annual.forEach(budget => {
      const key = currencyKey(budget, budget.id);
      if (!currencyGroups.has(key)) currencyGroups.set(key, []);
      currencyGroups.get(key).push(budget);
    });
    if (!annual.length) annualSection.append(status(t("budget.noAnnualBudgets")));
    currencyGroups.forEach((budgets, key) => {
      const currency = currencyLabel(budgets[0]);
      const group = node("div", "project-budget-currency-group"); group.setAttribute("data-budget-currency-group", key);
      group.append(node("p", "project-budget-currency-note", t("budget.currencyGroupScale", { p0: currency, p1: key.startsWith("unknown:") ? t("budget.confirmCurrencySuffix") : "" })));
      const codesByBudget = new Map(budgets.map(budget => [budget, annualCodes(budget)]));
      const scale = budgets.flatMap(budget => [budget.totals?.budgeted, budget.totals?.consumed, budget.totals?.committed,
        ...codesByBudget.get(budget).filter(code => code.compatible).flatMap(code => Object.values(code.values))]);
      const grid = node("div", "project-budget-annual-grid");
      budgets.forEach(budget => {
        const year = dateLabel(budget.startDate) ? budget.startDate.slice(0, 4) : t("common.unknownYear");
        const card = node("article", "project-budget-annual-card"); card.setAttribute("data-budget-annual", String(budget.id)); card.setAttribute("data-budget-year", year);
        const top = node("div", "project-budget-annual-header"); top.append(node("h4", "project-budget-annual-year", year), badge(budget));
        card.append(top, node("p", "project-budget-annual-name", budget.name || `Budget ${budget.id}`), node("p", "project-budget-annual-period", period(budget)));
        const values = [budget.totals?.budgeted, budget.totals?.consumed, budget.totals?.committed], geometry = chartGeometry(values, scale), codes = codesByBudget.get(budget);
        const chart = node("div", "project-budget-annual-chart"); chart.setAttribute("role", "group");
        chart.setAttribute("aria-label", t("budget.annualChartAria", { p0: year, p1: budget.name || `budget ${budget.id}`, p2: amount(values[0], currency), p3: amount(values[1], currency), p4: amount(values[2], currency), p5: amount(geometry.min, currency), p6: amount(geometry.max, currency) }));
        const axis = node("div", "project-budget-annual-axis"); axis.setAttribute("aria-hidden", "true");
        axisLabels(geometry, annualPlotHeight).forEach(value => { const tick = node("span", "", numbers.format(value)); tick.style.top = `${(geometry.max - value) / (geometry.max - geometry.min) * 100}%`; axis.append(tick); });
        const scroll = node("div", "project-budget-annual-scroll"), plot = node("div", "project-budget-annual-plot");
        const minimumWidth = 3 * (30 + codes.length * 15) + 28;
        plot.style.minWidth = `${minimumWidth}px`; plot.setAttribute("data-budget-plot-min-width", String(minimumWidth));
        geometry.ticks.forEach(value => { const gridline = node("span", `project-budget-annual-gridline${value === 0 ? " is-zero" : ""}`); gridline.style.top = `${(geometry.max - value) / (geometry.max - geometry.min) * 100}%`; gridline.setAttribute("aria-hidden", "true"); plot.append(gridline); });
        const tooltip = node("div", "project-budget-code-tooltip"); tooltip.hidden = true; tooltip.setAttribute("role", "tooltip"); tooltip.id = `${unique}-codes-${budget.id}`;
        let pinnedCode = null;
        const measureLabels = { budgeted: t("budget.budgeted"), consumed: t("budget.invoicedConsumed"), committed: t("budget.committed") };
        const hideCode = force => { if (force || pinnedCode === null) { pinnedCode = null; tooltip.hidden = true; } };
        const attachCode = (button, code, kind) => {
          const targetKey = `${budget.id}:${kind}:${code.key}`;
          button.setAttribute("data-budget-code-detail", targetKey); button.setAttribute("aria-describedby", tooltip.id);
          const show = () => {
            tooltip.replaceChildren(node("strong", "", code.name));
            for (const field of kind === "all" ? ["budgeted", "consumed", "committed"] : [kind]) tooltip.append(node("span", "", `${measureLabels[field]} : ${amount(code.values[field], currencyLabel(code))}`));
            if (!code.compatible) tooltip.append(node("span", "", t("budget.currencyScaleUnavailable")));
            tooltip.hidden = false;
          };
          button.addEventListener("pointerenter", show); button.addEventListener("pointerleave", () => hideCode(false));
          button.addEventListener("focus", show); button.addEventListener("blur", () => hideCode(true));
          if (kind !== "all") {
            button.setAttribute("aria-haspopup", "dialog");
            button.addEventListener("click", () => { hideCode(true); openBills(button, code, budget, kind, year); });
          } else button.addEventListener("click", () => { if (pinnedCode === targetKey) hideCode(true); else { pinnedCode = targetKey; show(); } });
          button.addEventListener("keydown", event => { if (event.key === "Escape") { event.preventDefault?.(); hideCode(true); } });
        };
        const bars = node("div", "project-budget-annual-bars");
        const codeTargets = [];
        [["budgeted", t("budget.budgeted")], ["consumed", t("budget.consumed")], ["committed", t("budget.committed")]].forEach(([kind, label], index) => {
          const cluster = node("div", "project-budget-annual-cluster"); cluster.setAttribute("data-budget-measure", kind);
          const clusterBars = node("div", "project-budget-cluster-bars");
          const column = node("div", "project-budget-annual-column"), rect = geometry.bars[index];
          column.setAttribute("data-budget-bar", kind); column.setAttribute("data-budget-value", rect.value === null ? "unavailable" : String(rect.value));
          column.setAttribute("aria-label", t("budget.totalMeasure", { p0: label, p1: amount(rect.value, currency) }));
          if (rect.available) {
            const fill = node("span", `project-budget-annual-fill is-${kind}${rect.negative ? " is-negative" : ""}`);
            fill.style.top = `${rect.top}%`; fill.style.height = `${rect.height}%`; fill.setAttribute("data-budget-height", String(rect.height)); column.append(fill);
          } else column.append(node("span", "project-budget-annual-unavailable", "?"));
          clusterBars.append(column);
          codes.forEach(code => {
            const scaledValue = code.compatible ? code.values[kind] : null, shape = chartGeometry([scaledValue], scale).bars[0];
            const companion = node("button", "project-budget-code-column"); companion.type = "button";
            companion.setAttribute("data-budget-code", code.code); companion.setAttribute("data-budget-code-key", code.key);
            companion.setAttribute("data-budget-code-measure", kind); companion.setAttribute("data-budget-value", shape.value === null ? "unavailable" : String(shape.value));
            companion.setAttribute("aria-label", `${code.name}, ${label} : ${amount(code.values[kind], currencyLabel(code))}${code.compatible ? "" : t("budget.scaleUnavailableSuffix")}`);
            companion.setAttribute("tabindex", codeTargets.length ? "-1" : "0");
            attachCode(companion, code, kind); codeTargets.push(companion);
            if (shape.available) {
              const fill = node("span", `project-budget-annual-fill is-code${shape.negative ? " is-negative" : ""}`);
              fill.style.top = `${shape.top}%`; fill.style.height = `${shape.height}%`; fill.style.backgroundColor = code.color;
              fill.style.backgroundImage = "linear-gradient(0deg, rgb(255 255 255 / 0%), rgb(255 255 255 / 45%))";
              fill.setAttribute("data-budget-code-color", code.color); fill.setAttribute("data-budget-height", String(shape.height)); companion.append(fill);
            } else companion.append(node("span", "project-budget-annual-unavailable", "?"));
            clusterBars.append(companion);
          });
          cluster.append(clusterBars, node("span", "project-budget-cluster-label", label)); bars.append(cluster);
        });
        codeTargets.forEach((button, index) => button.addEventListener("keydown", event => {
          if (event.key === "Escape") { event.preventDefault?.(); hideCode(true); return; }
          let next = null;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % codeTargets.length;
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + codeTargets.length - 1) % codeTargets.length;
          if (event.key === "Home") next = 0; if (event.key === "End") next = codeTargets.length - 1;
          if (next !== null) { event.preventDefault?.(); codeTargets.forEach((target, position) => target.setAttribute("tabindex", position === next ? "0" : "-1")); codeTargets[next].focus(); codeTargets[next].scrollIntoView?.({ block: "nearest", inline: "nearest" }); }
        }));
        plot.append(bars); scroll.append(plot); chart.append(axis, scroll); card.append(chart);
        if (codes.length) {
          const codeLegend = node("ul", "project-budget-code-legend");
          codes.forEach(code => {
            const item = node("li", ""), button = node("button", "project-budget-code-key"); button.type = "button";
            button.setAttribute("aria-label", t("budget.codeThreeAmounts", { p0: code.name })); attachCode(button, code, "all");
            const swatch = node("span", "project-budget-code-dot"); swatch.style.backgroundColor = code.color; swatch.setAttribute("aria-hidden", "true");
            button.append(swatch, node("span", "", code.name)); item.append(button); codeLegend.append(item);
          });
          card.append(codeLegend, tooltip);
        }
        const exact = node("dl", "project-budget-annual-values");
        [[t("budget.budgeted"), "budgeted"], [t("budget.invoicedConsumed"), "consumed"], [t("budget.committed"), "committed"]].forEach(([label, kind]) => {
          const item = node("div", `is-${kind}`); item.append(node("dt", "", label), node("dd", "", amount(budget.totals?.[kind], currency))); exact.append(item);
        });
        card.append(exact);
        const sourceLines = Array.isArray(budget.lines) ? budget.lines : [];
        const annualLines = sourceLines.filter(isExpenseLine).filter(retainAnnualLine);
        if (annualLines.length) details(`annual:${budget.id}`, t("budget.annualExpenseDetails"), [t("budget.annualCategory"), t("budget.budgeted"), t("budget.invoicedConsumed"), t("budget.committed"), t("budget.pendingApproval"), t("budget.odooBalance")],
          annualLines.map(line => [line.category || t("budget.categoryMissing"), amount(line.budgeted, currencyLabel(line)), amount(line.consumed, currencyLabel(line)),
            amount(line.committed, currencyLabel(line)), amount(line.pending, currencyLabel(line)), amount(line.balance, currencyLabel(line))]), card);
        const otherLines = sourceLines.filter(line => !isExpenseLine(line)).filter(retainAnnualLine);
        if (otherLines.length) details(`annual-other:${budget.id}`, t("budget.otherAnnualLines"), [t("budget.annualCategory"), t("budget.budgeted"), t("budget.invoicedConsumed"), t("budget.committed"), t("budget.pendingApproval"), t("budget.odooBalance")],
          otherLines.map(line => [line.category || t("budget.categoryMissing"), amount(line.budgeted, currencyLabel(line)), amount(line.consumed, currencyLabel(line)),
            amount(line.committed, currencyLabel(line)), amount(line.pending, currencyLabel(line)), amount(line.balance, currencyLabel(line))]), card);
        const income = budget.income;
        if (income) card.append(node("p", "project-budget-annual-income", t("budget.incomeSeparate", { p0: amount(income.budgeted, currency), p1: amount(income.consumed, currency) })));
        if (numeric(budget.parentTotal) !== null) card.append(node("p", "project-budget-small-note", t("budget.odooNetTotal", { p0: amount(budget.parentTotal, currency) })));
        if (budget.quality && budget.quality !== "reconciled" && budget.quality !== "available") card.append(node("p", "project-budget-quality", t("budget.lineCheckIncomplete")));
        warningList(warningsOf([budget.warnings]), card); grid.append(card);
        if (options.excludeOrmitterCosts === true) warningList(warningsOf([budget.ormitterExclusion?.warnings]), card);
        if (options.excludeOrmitterCosts === true && !budget.ormitterExclusion) card.append(node("p", "project-budget-quality", t("budget.ormitterExclusionUnavailable")));
      });
      group.append(grid); annualSection.append(group);
    });
    warningList(warningsOf([data.warnings]), panel);
    if (data.asOf) panel.append(node("p", "project-budget-asof", t("budget.readAsOf", { p0: String(data.asOf) })));
    container.replaceChildren(panel);
    if (oldChoice !== null) Array.from(panel.querySelectorAll("[data-budget-convention-choice]")).find(input => input.value === oldChoice)?.focus();
    else if (oldPersonnelChoice && personnelInput) personnelInput.focus();
    else if (oldExclusion && exclusionInput) exclusionInput.focus();
    else if (oldCodeDetail !== null) {
      const target = Array.from(panel.querySelectorAll("[data-budget-code-detail]")).find(button => button.getAttribute("data-budget-code-detail") === oldCodeDetail);
      if (target?.getAttribute("data-budget-code-measure") !== null) {
        const card = Array.from(panel.querySelectorAll("[data-budget-annual]")).find(card => card.contains(target));
        Array.from(card?.querySelectorAll("[data-budget-code-measure]") || []).forEach(button => button.setAttribute("tabindex", button === target ? "0" : "-1"));
      }
      target?.focus();
    }
    else if (oldDetails !== null) Array.from(panel.querySelectorAll("[data-budget-details]")).find(summary => summary.getAttribute("data-budget-details") === oldDetails)?.focus();
    else if (oldRetry && retry) retry.focus();
    return panel;
  }

  return { render, cleanup, numeric, chartGeometry, axisLabels, currencyKey, effectiveLifetime, effectiveConventionBudget, isBwPersonnelCategory, isBwPersonnelLine, effectiveAnnual, annualCodes, retainAnnualLine, codeColor, billDetailsForCode };
});
