(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProjectBudget = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const numbers = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 2 });
  const percentages = new Intl.NumberFormat("fr-BE", { style: "percent", maximumFractionDigits: 1 });
  let renderId = 0;
  const billDialogs = new WeakMap();
  const annualPlotHeight = 225;

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

  function currencyLabel(budget) { return String(budget?.currency || "Devise inconnue"); }
  function amount(value, currency) {
    const number = numeric(value);
    return number === null ? "Indisponible" : `${numbers.format(number)}${currency ? ` ${currency}` : ""}`;
  }
  function dateLabel(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? `${value.slice(8)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : null;
  }
  function period(budget) {
    const start = dateLabel(budget?.startDate), end = dateLabel(budget?.endDate);
    return start && end ? `Du ${start} au ${end}` : "Période indisponible";
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
      typeof value === "string" ? value : String(value.message || value.label || value.title || "Information de source indisponible")))];
  }

  const annualMeasures = ["budgeted", "consumed", "committed", "pending", "balance"];
  const isExpenseLine = line => line?.isExpense === true || /^6/.test(String(line?.accountCode || ""));

  function retainAnnualLine(line) {
    return !annualMeasures.every(field => numeric(line?.[field]) === 0);
  }

  function effectiveAnnual(budget, excludeOrmitterCosts = false) {
    if (!excludeOrmitterCosts) return budget;
    const exclusion = budget?.ormitterExclusion;
    const replacements = new Map((Array.isArray(exclusion?.lines) ? exclusion.lines : []).map(line => [String(line.id), line]));
    return { ...budget, totals: { ...budget.totals, consumed: numeric(exclusion?.consumed), committed: numeric(exclusion?.committed) },
      lines: (Array.isArray(budget.lines) ? budget.lines : []).map(line => isExpenseLine(line) ? {
        ...line, consumed: numeric(replacements.get(String(line.id))?.consumed), committed: numeric(replacements.get(String(line.id))?.committed)
      } : line) };
  }

  function codeColor(code) {
    let hash = 0;
    for (const character of String(code || "unknown")) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    return `hsl(${(hash * 137.508 % 360).toFixed(3)} 52% 48%)`;
  }

  function annualCodes(budget) {
    const groups = new Map();
    for (const line of (Array.isArray(budget?.lines) ? budget.lines : []).filter(isExpenseLine)) {
      const key = `${line.categoryId == null ? `line:${line.id}` : `category:${line.categoryId}`}:${currencyKey(line, line.id)}`;
      if (!groups.has(key)) groups.set(key, { key, code: String(line.accountCode || "?"), name: String(line.category || "Catégorie non renseignée"),
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
    if (overlaps) warnings.push("Des écritures se retrouvent dans plusieurs lignes budgétaires de cette catégorie ; elles ne sont comptées qu’une fois dans la liste.");
    if (conflicts) warnings.push("Des écritures identiques présentent des montants, devises ou statuts contradictoires ; aucun rapprochement complet n’est confirmé.");
    if (invalidItems) warnings.push("Certaines écritures ont une identité illisible ; le détail accessible est incomplet.");
    if (uncertainItems.length) warnings.push("Certains fournisseurs ne sont pas vérifiés. Ces écritures restent signalées séparément et ne confirment pas le sous-total filtré.");
    if (!sourceMatches || gap === null || Math.abs(gap) > 0.05) warnings.push("Le montant de la liste ne peut pas être rapproché entièrement du consommé affiché ; les montants accessibles restent visibles.");
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
    let retry = null, exclusionInput = null;
    function status(text, kind = "status") {
      const message = node("p", `project-budget-status${kind === "alert" ? " is-error" : ""}`, text);
      message.setAttribute("role", kind); return message;
    }
    function warningList(values, target) {
      if (!values.length) return;
      const list = node("ul", "project-budget-warnings");
      values.forEach(value => list.append(node("li", "", value)));
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
      const label = String(status?.label || "Statut indisponible");
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
      const title = node("h3", "project-budget-bills-title", `Factures et écritures · ${code.code} · ${year}`);
      title.id = `${unique}-bill-title`; title.setAttribute("tabindex", "-1"); dialog.setAttribute("aria-labelledby", title.id);
      const closeButton = node("button", "project-budget-bills-close", "Fermer"); closeButton.type = "button";
      closeButton.setAttribute("aria-label", "Fermer les factures et écritures associées"); closeButton.setAttribute("data-budget-bills-close", "");
      const header = node("header", "project-budget-bills-header"); header.append(title, closeButton);
      const body = node("div", "project-budget-bills-body");
      const intro = node("p", "project-budget-bills-intro", code.name); intro.id = `${unique}-bill-description`;
      dialog.setAttribute("aria-describedby", intro.id); body.append(intro);
      const periods = [...new Set(code.lines.map(period))];
      body.append(node("p", "project-budget-small-note", `Périmètre des lignes : ${periods.join(" · ")} · montants imputés à cette catégorie, et non totaux des factures.`));
      const measures = { budgeted: "Budgeté", consumed: "Consommé · facturé", committed: "Engagé" };
      const summary = node("dl", "project-budget-bills-summary");
      [[`Barre sélectionnée · ${measures[kind]}`, amount(code.values[kind], currencyLabel(code))],
        [detail.status === "reconciled" ? "Dépenses associées" : "Dépenses accessibles · détail incomplet", amount(detail.visibleConsumed, currencyLabel(code))],
        ["Écritures associées", numbers.format(detail.items.length)]].forEach(([label, value]) => {
        const item = node("div", ""); item.append(node("dt", "", label), node("dd", "", value)); summary.append(item);
      });
      body.append(summary);
      if (kind !== "consumed") body.append(node("p", "project-budget-bills-scope-note",
        "Cette liste présente les dépenses facturées associées. Elle ne détaille pas les allocations budgétaires ni les commandes non facturées de la barre sélectionnée."));
      if (options.excludeOrmitterCosts === true) {
        body.append(node("p", "project-budget-bills-scope-note", `Filtre fournisseur Ormit Talent actif · ${numbers.format(detail.excludedCount)} écriture(s) vérifiée(s) retirée(s) (${amount(detail.excludedConsumed, currencyLabel(code))}).`));
      }
      if (detail.status === "unavailable") body.append(status("Le détail des factures est indisponible dans cette lecture. Aucun montant de facture n’est inventé."));
      else if (detail.status !== "reconciled") body.append(status("Liste partielle ou non rapprochée du consommé affiché. Les écritures accessibles restent visibles ; leur somme ne confirme pas une liste complète."));
      else if (!detail.items.length) body.append(status("Aucune dépense facturée associée à cette catégorie sur la période confirmée."));
      if (detail.gap !== null && Math.abs(detail.gap) > 0.05) body.append(node("p", "project-budget-bills-scope-note", `Écart liste − consommé affiché : ${amount(detail.gap, currencyLabel(code))}.`));
      const rows = [...detail.items.map(item => ({ ...item, supplierUncertain: false })),
        ...detail.uncertainItems.map(item => ({ ...item, supplierUncertain: true }))];
      let scroll = null;
      if (rows.length) {
        scroll = node("div", "project-budget-bills-scroll"); scroll.setAttribute("tabindex", "0");
        scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", "Écritures et descriptions associées"); scroll.setAttribute("data-budget-bill-scroll", "");
        const table = node("table", "project-budget-bills-table"), head = node("thead", ""), row = node("tr", "");
        for (const label of ["Date", "Fournisseur", "Référence / Description Settlements New", "Montant imputé"]) {
          const cell = node("th", "", label); cell.setAttribute("scope", "col"); row.append(cell);
        }
        head.append(row); table.append(head);
        const tableBody = node("tbody", "");
        for (const item of rows) {
          const row = node("tr", ""); row.setAttribute("data-budget-bill-id", String(item.id));
          if (item.supplierUncertain) row.setAttribute("data-budget-bill-supplier-unknown", "true");
          const date = node("td", "", dateLabel(item.date) || "Date indisponible"); date.setAttribute("data-bill-label", "Date");
          const supplier = node("td", "", item.supplierLabel || "Fournisseur indisponible"); supplier.setAttribute("data-bill-label", "Fournisseur");
          if (item.supplierUncertain) supplier.append(node("span", "project-budget-bill-unknown", "Fournisseur non vérifié · hors sous-total filtré"));
          const document = node("th", "project-budget-bill-reference"); document.setAttribute("scope", "row"); document.setAttribute("data-bill-label", "Référence / Description");
          document.append(node("strong", "", item.documentLabel || "Référence indisponible"),
            node("span", "project-budget-bill-description", typeof item.description === "string" && item.description.trim() ? item.description : "Description non renseignée"));
          const value = node("td", "project-budget-bill-amount", amount(item.consumed, currencyLabel(item))); value.setAttribute("data-bill-label", "Montant imputé");
          row.append(date, supplier, document, value); tableBody.append(row);
        }
        table.append(tableBody); scroll.append(table); body.append(scroll);
      }
      warningList(detail.warnings, body);
      const footer = node("footer", "project-budget-bills-footer", "Détail des écritures accessibles avec vos droits Odoo · lecture seule.");
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

    if (!data && options.loading) panel.append(status("Chargement des budgets du projet…"));
    if (options.error) {
      const failure = node("div", "project-budget-error"); failure.append(status(options.error, "alert"));
      if (typeof options.onRetry === "function") {
        retry = node("button", "project-browser-back project-budget-retry", "Réessayer"); retry.type = "button";
        retry.disabled = options.loading === true; retry.setAttribute("data-budget-retry", "");
        retry.addEventListener("click", () => options.onRetry()); failure.append(retry);
      }
      panel.append(failure);
    }
    if (!data) {
      if (!options.loading && !options.error) panel.append(status("Budgets indisponibles."));
      container.replaceChildren(panel);
      if (oldRetry && retry) retry.focus();
      return panel;
    }

    const macro = data.macro || {}, lifetime = data.lifetime || {};
    const conventions = Array.isArray(data.conventions) ? data.conventions : [];
    const requested = options.selectedConventionId == null ? null : conventions.find(budget => String(budget.id) === String(options.selectedConventionId));
    const selected = requested || (conventions.length === 1 ? conventions[0] : null);
    const convention = section("Budget · 01 / Convention", "Budget conventionnel et coûts enregistrés sur toute la durée du projet · hors filtre d’années.", "convention");
    const macroGrid = node("div", "project-budget-macro-grid");
    const macroCurrency = currencyLabel(macro);
    macroGrid.append(metric("Budget total · fiche projet", amount(macro.conventionTotal, macroCurrency), "Montant conventionnel renseigné dans Odoo"),
      metric("Budget personnel", amount(macro.personnelEuros, macroCurrency), `${amount(macro.personnelHours, "h")} conventionnelles`),
      metric("Financement maximum", amount(macro.maxFunding, macroCurrency), String(macro.fundingType || "Type non renseigné")));
    convention.append(macroGrid);
    const metadata = node("dl", "project-budget-metadata");
    const metadataValues = [["Dates du projet", period(data.project)], ["Organisme de financement", macro.fundingOrganism || "Non renseigné"],
      ["Référence convention", macro.externalReference || "Non renseignée"]];
    metadataValues.forEach(([label, value]) => { const item = node("div", ""); item.append(node("dt", "", label), node("dd", "", value)); metadata.append(item); });
    convention.append(metadata);
    if (conventions.length > 1) {
      const choices = node("fieldset", "project-budget-convention-choices"); choices.append(node("legend", "", "Convention à comparer"));
      conventions.forEach(budget => {
        const label = node("label", "project-budget-convention-choice"), input = node("input", "");
        input.type = "radio"; input.name = `${unique}-convention`; input.value = String(budget.id); input.checked = selected?.id === budget.id;
        input.setAttribute("data-budget-convention-choice", String(budget.id));
        input.addEventListener("change", () => { if (input.checked) options.onConventionChange?.(budget.id); });
        label.append(input, node("span", "", `${budget.name || `Convention ${budget.id}`} · ${period(budget)}`), badge(budget)); choices.append(label);
      });
      convention.append(choices);
    }
    if (selected) {
      const identity = node("div", "project-budget-selected-convention");
      identity.append(node("strong", "", selected.name || `Convention ${selected.id}`), badge(selected), node("span", "", `${period(selected)} · ${currencyLabel(selected)}`));
      convention.append(identity);
      if (selected.quality && selected.quality !== "reconciled" && selected.quality !== "available") convention.append(node("p", "project-budget-quality",
        "Contrôle de la convention incomplet ou non réconcilié · les montants affichés ne constituent pas un budget contrôlé."));
    } else if (conventions.length > 1) convention.append(status("Choisissez une convention pour comparer son budget aux coûts du projet. Les différentes versions ne sont pas additionnées."));
    const benchmark = selected || (!conventions.length ? { ...macro, budgetedTotal: macro.conventionTotal } : null);
    const sameCurrency = benchmark && currencyKey(benchmark, "benchmark") === currencyKey(lifetime, "lifetime");
    const cost = numeric(lifetime.consumed), budgeted = numeric(benchmark?.budgetedTotal);
    const validCost = lifetime.status === "available" || lifetime.status === "partial";
    const comparable = Boolean(sameCurrency && validCost && cost !== null && budgeted !== null);
    const totals = node("div", "project-budget-total-grid");
    totals.append(metric("Budget conventionnel", amount(budgeted, benchmark?.currency), selected ? "Convention sélectionnée" : "Fiche projet", "budgeted"),
      metric(lifetime.status === "partial" ? "Consommation connue · partielle" : "Consommation enregistrée", amount(validCost ? cost : null, lifetime.currency), "Dépenses + coût monétaire des heures", "consumed"),
      metric("Solde calculé", amount(comparable ? budgeted - cost : null, benchmark?.currency), "Budget − consommation", "balance"));
    convention.append(totals);
    if (comparable) {
      const headline = node("p", `project-budget-consumption-ratio${cost > budgeted && budgeted > 0 ? " is-overrun" : ""}`,
        budgeted > 0 ? `${percentages.format(cost / budgeted)} du budget consommé${lifetime.status === "partial" ? " · source partielle" : ""}` : "Ratio indisponible · budget nul ou négatif");
      headline.setAttribute("data-budget-ratio", ""); convention.append(headline);
      horizontal([budgeted, cost], ["Budget conventionnel", "Consommation enregistrée"], benchmark.currency, convention, "total");
    } else if (benchmark && validCost && cost !== null && budgeted !== null) convention.append(status("Comparaison indisponible : les devises des coûts et du budget ne sont pas confirmées identiques."));
    if (lifetime.status === "partial") convention.append(status("Consommation partielle : seuls les coûts accessibles et identifiables sont inclus. Le solde ne constitue pas une disponibilité financière confirmée."));
    const sourceCost = node("p", "project-budget-cost-basis", `Coûts de dépenses : ${amount(lifetime.expenseCost, lifetime.currency)} · Coût enregistré des heures : ${amount(lifetime.personnelCost, lifetime.currency)}.`);
    convention.append(sourceCost);
    const outOfPeriod = lifetime.outOfPeriod || {};
    const beforeCount = numeric(outOfPeriod.beforeStart?.count), afterCount = numeric(outOfPeriod.afterEnd?.count);
    if (beforeCount > 0 || afterCount > 0) convention.append(node("p", "project-budget-small-note",
      `Écritures hors dates du projet, incluses dans le total : ${numbers.format(beforeCount || 0)} avant le début (${amount(outOfPeriod.beforeStart?.consumed, lifetime.currency)}), ${numbers.format(afterCount || 0)} après la fin (${amount(outOfPeriod.afterEnd?.consumed, lifetime.currency)}).`));
    if (numeric(lifetime.zeroValuedHoursCount) > 0) convention.append(node("p", "project-budget-small-note",
      `${numbers.format(numeric(lifetime.zeroValuedHoursCount))} écriture(s) d’heures sans coût monétaire enregistré · aucun coût n’est estimé à partir des heures.`));
    const rubricCosts = Array.isArray(lifetime.byRubric) ? lifetime.byRubric : [];
    const lines = Array.isArray(selected?.lines) ? selected.lines : [];
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
      convention.append(node("h4", "project-budget-subtitle", "Consommation par rubrique conventionnelle"));
      combinedLines.forEach(line => {
        const key = line.categoryId == null ? null : String(line.categoryId), matching = key === null ? null : costs.get(key);
        const lineCurrencyCompatible = currencyKey(line, `line:${line.id}`) === currencyKey(lifetime, "lifetime");
        // A readable, complete exact-rubric source may establish known zero. Partial reads cannot.
        const consumed = !validCost || !sameCurrency || !lineCurrencyCompatible ? null : matching ? numeric(matching.consumed) : lifetime.status === "available" && key !== null ? 0 : null;
        if (key !== null) seen.add(key);
        const row = node("div", "project-budget-rubric"); row.setAttribute("data-budget-rubric", key ?? `line:${line.id}`);
        row.append(node("strong", "project-budget-rubric-name", line.category || "Rubrique non renseignée"));
        horizontal([line.budgeted, consumed], ["Budgeté", "Consommé"], currencyLabel(line), row, `rubric:${key ?? line.id}`);
        convention.append(row);
        rubricRows.push([line.category || "Rubrique non renseignée", amount(line.budgeted, currencyLabel(line)), amount(consumed, lifetime.currency),
          amount(consumed !== null && numeric(line.budgeted) !== null ? line.budgeted - consumed : null, currencyLabel(line))]);
      });
      costs.forEach((row, key) => { if (!seen.has(key)) rubricRows.push([`${row.category || "Rubrique non renseignée"} · hors lignes de la convention sélectionnée`, "Indisponible", amount(row.consumed, lifetime.currency), "Indisponible"]); });
    }
    const unmapped = Array.isArray(lifetime.unmapped) ? lifetime.unmapped : [];
    if (unmapped.length) {
      const unassigned = node("div", "project-budget-unmapped"); unassigned.append(node("h4", "project-budget-subtitle", "Coûts sans rapprochement de rubrique"));
      unmapped.forEach(row => {
        const item = node("p", ""); item.append(node("span", "", row.label || "Rubrique non renseignée"), node("strong", "", amount(row.consumed, lifetime.currency))); unassigned.append(item);
        rubricRows.push([row.label || "Rubrique non renseignée", "Indisponible", amount(row.consumed, lifetime.currency), "Indisponible"]);
      });
      unassigned.append(node("p", "project-budget-small-note", "Ces coûts restent dans la consommation totale. Aucune correspondance de rubrique n’est déduite de leur libellé."));
      convention.append(unassigned);
    }
    if (rubricRows.length) details(`convention:${selected?.id || "none"}`, "Détail des rubriques conventionnelles", ["Rubrique", "Budgeté", "Consommé", "Solde calculé"], rubricRows, convention);
    if (!conventions.length) convention.append(status("Aucune ligne de convention disponible dans cette lecture. Le budget de la fiche projet reste affiché lorsqu’il est renseigné ; consultez les informations de source en cas de lecture incomplète."));
    warningList(warningsOf([selected?.warnings, lifetime.warnings]), convention);

    const annualSection = section("Budget · 02 / Budgets annuels", "Tous les budgets annuels accessibles, y compris les années futures · catégories annuelles distinctes de la convention.", "annual");
    const legend = node("ul", "project-budget-legend");
    [["budgeted", "Budgeté"], ["consumed", "Consommé · facturé"], ["committed", "Engagé"]].forEach(([kind, label]) => {
      const item = node("li", ""); item.append(node("span", `project-budget-legend-dot is-${kind}`), node("span", "", label)); legend.append(item);
    });
    annualSection.append(legend, node("p", "project-budget-section-note", "Engagé comprend le facturé et les commandes confirmées selon Odoo. Consommé et engagé se chevauchent : ils ne s’additionnent pas. La consommation annuelle ci-dessous est facturée ; le total de durée du projet inclut aussi le coût enregistré des heures."));
    const exclusionToggle = node("label", "project-budget-exclusion-toggle"); exclusionInput = node("input", "");
    exclusionInput.type = "checkbox"; exclusionInput.checked = options.excludeOrmitterCosts === true;
    exclusionInput.setAttribute("data-budget-exclude-ormitter-costs", "");
    exclusionInput.addEventListener("change", () => options.onExcludeOrmitterCostsChange?.(exclusionInput.checked));
    exclusionToggle.append(exclusionInput, node("span", "", "Exclure les coûts des Ormitters")); annualSection.append(exclusionToggle);
    annualSection.append(node("p", "project-budget-small-note", "Filtre des dépenses liées au fournisseur Ormit Talent · les coûts monétaires des heures et la convention restent inchangés."));
    if (options.excludeOrmitterCosts === true) annualSection.append(node("p", "project-budget-section-note",
      "Les montants consommés et engagés ci-dessous excluent les coûts identifiés des Ormitters. Les allocations budgétaires, l’approbation et le solde Odoo restent inchangés. Un engagement filtré non vérifiable reste indisponible."));
    const annual = (Array.isArray(data.annual) ? data.annual : []).map(budget => effectiveAnnual(budget, options.excludeOrmitterCosts === true))
      .sort((a, b) => String(a.startDate || "9999").localeCompare(String(b.startDate || "9999")) || Number(a.id) - Number(b.id));
    const currencyGroups = new Map();
    annual.forEach(budget => {
      const key = currencyKey(budget, budget.id);
      if (!currencyGroups.has(key)) currencyGroups.set(key, []);
      currencyGroups.get(key).push(budget);
    });
    if (!annual.length) annualSection.append(status("Aucun budget annuel accessible pour ce projet."));
    currencyGroups.forEach((budgets, key) => {
      const currency = currencyLabel(budgets[0]);
      const group = node("div", "project-budget-currency-group"); group.setAttribute("data-budget-currency-group", key);
      group.append(node("p", "project-budget-currency-note", `${currency} · même échelle pour les budgets de ce groupe${key.startsWith("unknown:") ? " · devise à confirmer" : ""}`));
      const codesByBudget = new Map(budgets.map(budget => [budget, annualCodes(budget)]));
      const scale = budgets.flatMap(budget => [budget.totals?.budgeted, budget.totals?.consumed, budget.totals?.committed,
        ...codesByBudget.get(budget).filter(code => code.compatible).flatMap(code => Object.values(code.values))]);
      const grid = node("div", "project-budget-annual-grid");
      budgets.forEach(budget => {
        const year = dateLabel(budget.startDate) ? budget.startDate.slice(0, 4) : "Année inconnue";
        const card = node("article", "project-budget-annual-card"); card.setAttribute("data-budget-annual", String(budget.id)); card.setAttribute("data-budget-year", year);
        const top = node("div", "project-budget-annual-header"); top.append(node("h4", "project-budget-annual-year", year), badge(budget));
        card.append(top, node("p", "project-budget-annual-name", budget.name || `Budget ${budget.id}`), node("p", "project-budget-annual-period", period(budget)));
        const values = [budget.totals?.budgeted, budget.totals?.consumed, budget.totals?.committed], geometry = chartGeometry(values, scale), codes = codesByBudget.get(budget);
        const chart = node("div", "project-budget-annual-chart"); chart.setAttribute("role", "group");
        chart.setAttribute("aria-label", `${year}, ${budget.name || `budget ${budget.id}`} : budgeté ${amount(values[0], currency)}, consommé facturé ${amount(values[1], currency)}, engagé ${amount(values[2], currency)}. Échelle ${amount(geometry.min, currency)} à ${amount(geometry.max, currency)}.`);
        const axis = node("div", "project-budget-annual-axis"); axis.setAttribute("aria-hidden", "true");
        axisLabels(geometry, annualPlotHeight).forEach(value => { const tick = node("span", "", numbers.format(value)); tick.style.top = `${(geometry.max - value) / (geometry.max - geometry.min) * 100}%`; axis.append(tick); });
        const scroll = node("div", "project-budget-annual-scroll"), plot = node("div", "project-budget-annual-plot");
        const minimumWidth = 3 * (30 + codes.length * 15) + 28;
        plot.style.minWidth = `${minimumWidth}px`; plot.setAttribute("data-budget-plot-min-width", String(minimumWidth));
        geometry.ticks.forEach(value => { const gridline = node("span", `project-budget-annual-gridline${value === 0 ? " is-zero" : ""}`); gridline.style.top = `${(geometry.max - value) / (geometry.max - geometry.min) * 100}%`; gridline.setAttribute("aria-hidden", "true"); plot.append(gridline); });
        const tooltip = node("div", "project-budget-code-tooltip"); tooltip.hidden = true; tooltip.setAttribute("role", "tooltip"); tooltip.id = `${unique}-codes-${budget.id}`;
        let pinnedCode = null;
        const measureLabels = { budgeted: "Budgeté", consumed: "Consommé · facturé", committed: "Engagé" };
        const hideCode = force => { if (force || pinnedCode === null) { pinnedCode = null; tooltip.hidden = true; } };
        const attachCode = (button, code, kind) => {
          const targetKey = `${budget.id}:${kind}:${code.key}`;
          button.setAttribute("data-budget-code-detail", targetKey); button.setAttribute("aria-describedby", tooltip.id);
          const show = () => {
            tooltip.replaceChildren(node("strong", "", code.name));
            for (const field of kind === "all" ? ["budgeted", "consumed", "committed"] : [kind]) tooltip.append(node("span", "", `${measureLabels[field]} : ${amount(code.values[field], currencyLabel(code))}`));
            if (!code.compatible) tooltip.append(node("span", "", "Devise différente ou inconnue · échelle de la barre indisponible."));
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
        [["budgeted", "Budgeté"], ["consumed", "Consommé"], ["committed", "Engagé"]].forEach(([kind, label], index) => {
          const cluster = node("div", "project-budget-annual-cluster"); cluster.setAttribute("data-budget-measure", kind);
          const clusterBars = node("div", "project-budget-cluster-bars");
          const column = node("div", "project-budget-annual-column"), rect = geometry.bars[index];
          column.setAttribute("data-budget-bar", kind); column.setAttribute("data-budget-value", rect.value === null ? "unavailable" : String(rect.value));
          column.setAttribute("aria-label", `Total ${label} : ${amount(rect.value, currency)}`);
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
            companion.setAttribute("aria-label", `${code.name}, ${label} : ${amount(code.values[kind], currencyLabel(code))}${code.compatible ? "" : "; échelle indisponible"}`);
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
            button.setAttribute("aria-label", `${code.name} : détail des trois montants`); attachCode(button, code, "all");
            const swatch = node("span", "project-budget-code-dot"); swatch.style.backgroundColor = code.color; swatch.setAttribute("aria-hidden", "true");
            button.append(swatch, node("span", "", code.name)); item.append(button); codeLegend.append(item);
          });
          card.append(codeLegend, tooltip);
        }
        const exact = node("dl", "project-budget-annual-values");
        [["Budgeté", "budgeted"], ["Consommé · facturé", "consumed"], ["Engagé", "committed"]].forEach(([label, kind]) => {
          const item = node("div", `is-${kind}`); item.append(node("dt", "", label), node("dd", "", amount(budget.totals?.[kind], currency))); exact.append(item);
        });
        card.append(exact);
        const sourceLines = Array.isArray(budget.lines) ? budget.lines : [];
        const annualLines = sourceLines.filter(isExpenseLine).filter(retainAnnualLine);
        if (annualLines.length) details(`annual:${budget.id}`, "Détail des dépenses annuelles", ["Catégorie annuelle", "Budgeté", "Consommé · facturé", "Engagé", "En approbation", "Solde Odoo"],
          annualLines.map(line => [line.category || "Catégorie non renseignée", amount(line.budgeted, currencyLabel(line)), amount(line.consumed, currencyLabel(line)),
            amount(line.committed, currencyLabel(line)), amount(line.pending, currencyLabel(line)), amount(line.balance, currencyLabel(line))]), card);
        const otherLines = sourceLines.filter(line => !isExpenseLine(line)).filter(retainAnnualLine);
        if (otherLines.length) details(`annual-other:${budget.id}`, "Recettes, ajustements et lignes non classées", ["Catégorie annuelle", "Budgeté", "Consommé · facturé", "Engagé", "En approbation", "Solde Odoo"],
          otherLines.map(line => [line.category || "Catégorie non renseignée", amount(line.budgeted, currencyLabel(line)), amount(line.consumed, currencyLabel(line)),
            amount(line.committed, currencyLabel(line)), amount(line.pending, currencyLabel(line)), amount(line.balance, currencyLabel(line))]), card);
        const income = budget.income;
        if (income) card.append(node("p", "project-budget-annual-income", `Recettes séparées · budgetées : ${amount(income.budgeted, currency)} · facturées : ${amount(income.consumed, currency)}.`));
        if (numeric(budget.parentTotal) !== null) card.append(node("p", "project-budget-small-note", `Total net Odoo : ${amount(budget.parentTotal, currency)} · ne représente pas l’enveloppe des dépenses.`));
        if (budget.quality && budget.quality !== "reconciled" && budget.quality !== "available") card.append(node("p", "project-budget-quality", "Contrôle des lignes incomplet ou non réconcilié · consultez les informations de source."));
        warningList(warningsOf([budget.warnings]), card); grid.append(card);
        if (options.excludeOrmitterCosts === true) warningList(warningsOf([budget.ormitterExclusion?.warnings]), card);
        if (options.excludeOrmitterCosts === true && !budget.ormitterExclusion) card.append(node("p", "project-budget-quality", "Exclusion Ormit Talent indisponible dans cette lecture · montants consommés et engagés indisponibles."));
      });
      group.append(grid); annualSection.append(group);
    });
    warningList(warningsOf([data.warnings]), panel);
    if (data.asOf) panel.append(node("p", "project-budget-asof", `Lecture Odoo : ${String(data.asOf)} · données accessibles avec vos droits Odoo · lecture seule.`));
    container.replaceChildren(panel);
    if (oldChoice !== null) Array.from(panel.querySelectorAll("[data-budget-convention-choice]")).find(input => input.value === oldChoice)?.focus();
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

  return { render, cleanup, numeric, chartGeometry, axisLabels, currencyKey, effectiveAnnual, annualCodes, retainAnnualLine, codeColor, billDetailsForCode };
});
