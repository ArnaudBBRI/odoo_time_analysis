(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./i18n-core-messages") : root.DashboardI18n);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProjectPurchaseFlow = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (I18n) {
  "use strict";
  const t = I18n.t, lifecycles = new WeakMap();
  let sequence = 0;
  const numeric = value => (typeof value === "number" || typeof value === "string" && value.trim()) && Number.isFinite(Number(value)) ? Number(value) : null;
  const identity = value => Number.isSafeInteger(numeric(value)) && numeric(value) > 0 ? numeric(value) : null;
  const text = value => typeof value === "string" ? value.trim() : "";
  const sum = rows => rows.some(row => row.consumed === null) ? null : Math.round(rows.reduce((total, row) => total + row.consumed, 0) * 1e8) / 1e8;
  function date(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return null;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
  }
  function dateLabel(value) {
    return date(value) ? I18n.formatDate(new Date(`${value}T00:00:00Z`), { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }) : t("common.unavailable");
  }
  const money = (value, currency) => numeric(value) === null ? t("common.unavailable") : `${I18n.formatNumber(value, { maximumFractionDigits: 2 })} ${currency || t("purchaseFlow.unknownCurrency")}`;
  const order = (a, b) => String(a).localeCompare(String(b), "fr", { numeric: true });
  function codeColor(code) {
    let hash = 0;
    for (const character of String(code || "unknown")) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    return `hsl(${(hash * 137.508 % 360).toFixed(3)} 52% 48%)`;
  }

  function monthlyExpense(label) {
    // Only a complete monthly NF/FK reference establishes this family. Source
    // formatting marks are optional; initials remain exact, including punctuation.
    const match = /^\*{0,2}NF\/FK\s+(0[1-9]|1[0-2])-(\d{4})\s*:\s*([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ.-]*)\*{0,2}$/.exec(label);
    if (!match || match[2] === "0000") return null;
    return { initials: match[3], month: Number(match[2]) * 12 + Number(match[1]) - 1 };
  }

  function monthLabel(month) {
    return `${String(month % 12 + 1).padStart(2, "0")}-${String(Math.floor(month / 12)).padStart(4, "0")}`;
  }

  // Only source-confirmed purchase allocations belong here. Missing bindings stay
  // explicit; neither a displayed code nor a shared document invents an identity.
  function buildModel(source) {
    const issues = new Set(Array.isArray(source?.issues) ? source.issues : []), records = new Map(), conflicts = new Set();
    const startDate = date(source?.startDate), endDate = date(source?.endDate);
    const validPeriod = startDate && endDate && startDate <= endDate;
    if (!validPeriod) issues.add("invalid-period");
    if (!Array.isArray(source?.items)) issues.add("missing-items");
    for (const item of Array.isArray(source?.items) ? source.items : []) {
      const id = identity(item?.id), consumed = numeric(item?.consumed), day = date(item?.date);
      if (id === null || !day || !validPeriod || day < startDate || day > endDate ||
        !["in_invoice", "in_refund"].includes(item?.documentType)) { issues.add("invalid-entry"); continue; }
      if (consumed === null) issues.add("amountMissing");
      const row = { id, consumed, date: day, documentType: item.documentType, currencyId: identity(item.currencyId), currency: text(item.currency),
        categoryId: identity(item.categoryId), category: text(item.category), codeCategoryId: identity(item.codeCategoryId), codeCategory: text(item.codeCategory),
        code: text(item.code), description: text(item.description), supplierLabel: text(item.supplierLabel), documentLabel: text(item.documentLabel) };
      if (conflicts.has(id)) continue;
      if (records.has(id)) {
        issues.add("duplicate-entry");
        if (JSON.stringify(records.get(id)) !== JSON.stringify(row)) { records.delete(id); conflicts.add(id); issues.add("conflicting-entry"); }
      } else records.set(id, row);
    }
    const groups = new Map();
    for (const row of records.values()) {
      const key = row.currencyId === null ? `unknown:${row.id}` : `currency:${row.currencyId}`;
      if (!groups.has(key)) groups.set(key, { key, currencyId: row.currencyId, currency: row.currencyId === null ? "" : row.currency, items: [] });
      const group = groups.get(key);
      if (row.currencyId === null || !row.currency) issues.add("unknown-currency");
      if (row.currencyId !== null && group.currency !== row.currency) { group.currency = ""; issues.add("conflicting-currency-label"); }
      if (row.categoryId === null || row.codeCategoryId === null || !row.code) issues.add("missing-mapping");
      group.items.push({ ...row, categoryKey: row.categoryId === null ? "unassigned" : `category:${row.categoryId}`,
        codeKey: !row.code ? "unassigned" : row.codeCategoryId === null ? `entry:${row.id}` : `code-category:${row.codeCategoryId}:${row.code}` });
    }
    for (const group of groups.values()) {
      group.items.sort((a, b) => order(a.code, b.code) || order(b.date, a.date) || a.id - b.id);
      group.purchases = group.items.filter(row => row.consumed > 0 && row.documentType === "in_invoice");
      group.corrections = group.items.filter(row => row.consumed !== null && row.consumed !== 0 && (row.consumed < 0 || row.documentType === "in_refund"));
      group.net = sum(group.items);
      group.gross = group.net === null ? null : sum(group.purchases); group.correctionTotal = group.net === null ? null : sum(group.corrections);
    }
    return { status: !["available", "partial"].includes(source?.status) || !validPeriod ? "unavailable"
      : source.status === "partial" || issues.size ? "partial" : "available", startDate, endDate,
      groups: [...groups.values()].sort((a, b) => order(a.key, b.key)), issues: [...issues] };
  }

  function layout(items, options = {}) {
    const categories = new Map(), codes = new Map(), pairs = new Map(), purchases = new Map(), purchasePairs = new Map();
    const magnitude = items.reduce((total, row) => total + Math.abs(row.consumed), 0);
    const scale = numeric(options.scale) > 0 ? numeric(options.scale) : 320 / (magnitude || 1);
    const allocations = items.map(row => ({ ...row, height: Math.max(0.8, Math.abs(row.consumed) * scale) }))
      .sort((a, b) => order(a.code, b.code) || order(b.date, a.date) || a.id - b.id);
    for (const row of allocations) {
      if (!categories.has(row.categoryKey)) categories.set(row.categoryKey, { key: row.categoryKey, label: row.category, height: 0, items: [] });
      if (!codes.has(row.codeKey)) codes.set(row.codeKey, { key: row.codeKey, label: row.code, height: 0, items: [] });
      const category = categories.get(row.categoryKey), code = codes.get(row.codeKey), key = `${row.categoryKey}|${row.codeKey}`;
      category.height += row.height; category.items.push(row); code.height += row.height; code.items.push(row);
      if (!pairs.has(key)) pairs.set(key, { key, source: row.categoryKey, target: row.codeKey, height: 0, items: [] });
      pairs.get(key).height += row.height; pairs.get(key).items.push(row);
      const label = row.description || row.documentLabel || "", monthly = monthlyExpense(label);
      const purchaseKey = monthly ? `purchase:nf-fk:${JSON.stringify(monthly.initials)}` : `purchase:${JSON.stringify(label)}`;
      if (!purchases.has(purchaseKey)) purchases.set(purchaseKey, { key: purchaseKey, label, height: 0, items: [],
        ...(monthly ? { initials: monthly.initials, firstMonth: monthly.month, lastMonth: monthly.month } : {}) });
      const purchase = purchases.get(purchaseKey), purchasePairKey = monthly
        ? `purchase:nf-fk:${JSON.stringify([row.codeKey, monthly.initials])}` : `purchase:${JSON.stringify([row.codeKey, label])}`;
      if (monthly) { purchase.firstMonth = Math.min(purchase.firstMonth, monthly.month); purchase.lastMonth = Math.max(purchase.lastMonth, monthly.month); }
      purchase.height += row.height; purchase.items.push(row);
      if (!purchasePairs.has(purchasePairKey)) purchasePairs.set(purchasePairKey, { key: purchasePairKey, source: row.codeKey, target: purchaseKey, height: 0, items: [] });
      purchasePairs.get(purchasePairKey).height += row.height; purchasePairs.get(purchasePairKey).items.push(row);
    }
    const left = [...categories.values()].sort((a, b) => order(a.label, b.label) || order(a.key, b.key));
    const middle = [...codes.values()].sort((a, b) => order(a.label, b.label) || order(a.key, b.key));
    const right = [...purchases.values()];
    for (const purchase of right) {
      if (purchase.firstMonth !== undefined && purchase.firstMonth !== purchase.lastMonth)
        purchase.label = `NF/FK ${monthLabel(purchase.firstMonth)} --> ${monthLabel(purchase.lastMonth)}: ${purchase.initials}`;
      const sameCode = purchase.items.every(row => row.code === purchase.items[0].code);
      purchase.code = sameCode ? purchase.items[0].code : "";
      purchase.colorKey = sameCode ? null : purchase.key;
      purchase.consumed = sum(purchase.items);
    }
    function measureColumn(column, gap, labelTop, labelBottom, labelClearance = 0) {
      const positions = [];
      let cursor = 0, top = Infinity, bottom = -Infinity;
      for (let index = 0; index < column.length; index++) {
        const row = column[index], previous = column[index - 1];
        if (previous) cursor += previous.height + Math.max(gap, labelClearance - (previous.height + row.height) / 2);
        const center = cursor + row.height / 2;
        positions.push(cursor);
        top = Math.min(top, cursor, center + labelTop);
        bottom = Math.max(bottom, cursor + Math.max(1, row.height), center + labelBottom);
      }
      return { positions, top: column.length ? top : 0, extent: column.length ? bottom - top : 0 };
    }
    // Include the two category text baselines (-4/+15), their font envelopes,
    // and the code backplates. Canvas padding is not part of a column's extent.
    const leftMeasure = measureColumn(left, 52, -18, 19), middleMeasure = measureColumn(middle, 52, -23, 24);
    const targetExtent = leftMeasure.extent * 2;
    function purchaseMeasure(compression) {
      // Tighten rows first, then shrink from 10px (7.5pt) to 8px (6pt).
      const gap = 18 - Math.min(1, compression) * 16;
      const fontSize = 10 - Math.max(0, compression - 1) * 2, lineHeight = fontSize * 1.6;
      return { ...measureColumn(right, gap, -lineHeight / 2, lineHeight / 2, lineHeight + 1), fontSize, lineHeight, gap };
    }
    let rightMeasure = purchaseMeasure(0);
    if (rightMeasure.extent > targetExtent) {
      rightMeasure = purchaseMeasure(2);
      if (rightMeasure.extent <= targetExtent) {
        let low = 0, high = 2;
        for (let iteration = 0; iteration < 32; iteration++) {
          const midpoint = (low + high) / 2, candidate = purchaseMeasure(midpoint);
          if (candidate.extent > targetExtent) low = midpoint;
          else { high = midpoint; rightMeasure = candidate; }
        }
      }
    }
    const columns = [[left, leftMeasure], [middle, middleMeasure], [right, rightMeasure]];
    const extent = Math.max(240, ...columns.map(([, measure]) => measure.extent));
    for (const [column, measure] of columns) for (let index = 0; index < column.length; index++) {
      column[index].y = 70 + (extent - measure.extent) / 2 - measure.top + measure.positions[index];
      column[index].offset = 0;
    }
    const links = [];
    for (const pair of [...pairs.values()].sort((a, b) => order(a.source, b.source) || order(a.target, b.target))) {
      const source = categories.get(pair.source), target = codes.get(pair.target);
      links.push({ ...pair, kind: "allocation", sourceLabel: source.label, targetLabel: target.label,
        x1: 274, x2: 650, y1: source.y + source.offset + pair.height / 2, y2: target.y + target.offset + pair.height / 2, code: target.label });
      source.offset += pair.height; target.offset += pair.height;
    }
    for (const code of middle) code.offset = 0;
    for (const pair of purchasePairs.values()) {
      const source = codes.get(pair.source), target = purchases.get(pair.target);
      links.push({ ...pair, kind: "purchase", sourceLabel: source.label, targetLabel: target.label,
        x1: 664, x2: 990, y1: source.y + source.offset + pair.height / 2, y2: target.y + target.offset + pair.height / 2,
        code: source.label, targetColorKey: target.colorKey });
      source.offset += pair.height; target.offset += pair.height;
    }
    return { categories: left, codes: middle, purchases: right, links, height: extent + 135, width: 1300,
      purchaseStyle: { fontSize: rightMeasure.fontSize, lineHeight: rightMeasure.lineHeight, gap: rightMeasure.gap },
      columnExtents: { categories: leftMeasure.extent, codes: middleMeasure.extent, purchases: rightMeasure.extent } };
  }

  function ribbonPath(link) {
    return `M${link.x1},${link.y1} C${(link.x1 + link.x2) / 2},${link.y1} ${(link.x1 + link.x2) / 2},${link.y2} ${link.x2},${link.y2}`;
  }

  function fitGeometry(sizes, width, height) {
    if (!(width > 0) || !(height > 0) || !sizes.length || sizes.some(size => !(size.width > 0) || !(size.height > 0))) return [];
    const scale = Math.min(width / Math.max(...sizes.map(size => size.width)), height / Math.max(...sizes.map(size => size.height)));
    return sizes.map(size => ({ width: size.width * scale, height: size.height * scale }));
  }

  function cleanup(container) { lifecycles.get(container)?.(); lifecycles.delete(container); }
  function render(container, source, options = {}) {
    const doc = container.ownerDocument || document, oldControl = container.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.("data-purchase-flow-control") : null;
    const oldDetails = options.detailsOpen === true || container.querySelectorAll("[data-purchase-flow-details]")[0]?.open === true;
    const oldCollapsed = typeof options.collapsed === "boolean" ? options.collapsed
      : container.querySelectorAll('[data-purchase-flow-collapsed="true"]').length > 0;
    cleanup(container);
    const model = buildModel(source), uid = `purchase-flow-${++sequence}`, palette = typeof options.codeColor === "function" ? options.codeColor : codeColor;
    const endpointColor = (kind, key) => kind === "category" ? codeColor(key) : palette(key);
    const purchaseColor = (code, key) => key ? codeColor(key) : palette(code);
    const node = (tag, cls, value) => { const element = doc.createElement(tag); if (cls) element.className = cls; if (value !== undefined) element.textContent = value; return element; };
    const svgNode = (tag, attributes = {}, value) => { const element = doc.createElementNS("http://www.w3.org/2000/svg", tag); for (const [key, item] of Object.entries(attributes)) element.setAttribute(key, item); if (value !== undefined) element.textContent = value; return element; };
    const panel = node("section", "purchase-flow"); panel.setAttribute("data-purchase-flow", "");
    const header = node("header", "purchase-flow-header");
    const expand = node("button", "purchase-flow-expand"); expand.type = "button";
    expand.setAttribute("data-purchase-flow-control", "expand"); expand.setAttribute("aria-haspopup", "dialog");
    const expandIcon = svgNode("svg", { viewBox: "0 0 24 24", width: 18, height: 18, "aria-hidden": "true", focusable: "false" });
    const expandPath = svgNode("path", { fill: "none", stroke: "currentColor", "stroke-width": 1.7, "stroke-linecap": "round", "stroke-linejoin": "round" });
    expandIcon.append(expandPath); expand.append(expandIcon);
    const toggle = node("button", "purchase-flow-toggle"); toggle.type = "button";
    toggle.setAttribute("data-purchase-flow-control", "visibility");
    const toggleIcon = svgNode("svg", { viewBox: "0 0 24 24", width: 18, height: 18, "aria-hidden": "true", focusable: "false" });
    const togglePath = svgNode("path", { fill: "none", stroke: "currentColor", "stroke-width": 1.7, "stroke-linecap": "round" });
    toggleIcon.append(togglePath); toggle.append(toggleIcon);
    const heading = node("h4", "purchase-flow-heading", t("purchaseFlow.heading")); heading.id = `${uid}-heading`;
    const body = node("div", "purchase-flow-body"); body.id = `${uid}-body`; body.setAttribute("data-purchase-flow-body", "");
    toggle.setAttribute("aria-controls", body.id);
    header.append(expand, toggle, heading); panel.append(header, body);
    body.append(node("p", "purchase-flow-scope", t("purchaseFlow.basis")));
    if (model.startDate && model.endDate) body.append(node("p", "purchase-flow-scope", t("purchaseFlow.scope", { p0: dateLabel(model.startDate), p1: dateLabel(model.endDate) })));
    if (model.status === "unavailable") body.append(node("p", "purchase-flow-status", t("purchaseFlow.unavailable")));
    else {
      body.append(node("p", "purchase-flow-instruction", t("purchaseFlow.instruction")));
      if (model.status === "partial") body.append(node("p", "purchase-flow-status is-partial", t("purchaseFlow.partial")));
      if (!model.groups.length) body.append(node("p", "purchase-flow-status", t("purchaseFlow.empty")));
    }
    if (model.issues.length) {
      const aliases = { "invalid-period": "startUnavailable", "missing-items": "sourceUnavailable", "invalid-entry": "incomplete",
        "duplicate-entry": "duplicateConflict", "conflicting-entry": "duplicateConflict", "unknown-currency": "currencyMissing",
        "conflicting-currency-label": "currencyMissing", "missing-mapping": "mappingMissing" };
      const allowed = new Set(["sourceUnavailable", "startUnavailable", "documentUnavailable", "incomplete", "mappingMissing", "descriptionsMissing", "currencyMissing", "amountMissing", "duplicateConflict"]);
      const list = node("ul", "purchase-flow-issues"), keys = new Set(model.issues.map(issue => aliases[issue] || (allowed.has(issue) ? issue : "incomplete")));
      for (const key of keys) list.append(node("li", "", t(`purchaseFlow.issue.${key}`)));
      body.append(list);
    }
    const hides = [], diagrams = [];
    function addDiagram(group, items, correction) {
      if (!items.length) return;
      const magnitude = group.items.reduce((total, row) => total + Math.abs(row.consumed || 0), 0);
      const layoutOptions = { scale: 320 / (magnitude || 1) }, shape = layout(items, layoutOptions);
      const region = node("div", `purchase-flow-diagram${correction ? " is-correction" : ""}`), kind = correction ? "corrections" : "purchases";
      const title = node("h5", "purchase-flow-diagram-title", t(`purchaseFlow.${kind}`)); region.append(title);
      const scroller = node("div", "purchase-flow-scroll"); scroller.setAttribute("tabindex", "0"); scroller.setAttribute("role", "region");
      scroller.setAttribute("aria-label", t("purchaseFlow.diagramLabel", { p0: t(`purchaseFlow.${kind}`), p1: group.currency || t("purchaseFlow.unknownCurrency") }));
      scroller.setAttribute("data-purchase-flow-control", `scroll:${group.key}:${kind}`);
      const svg = svgNode("svg", { viewBox: `0 0 ${shape.width} ${shape.height}`, width: shape.width, height: shape.height, class: "purchase-flow-svg",
        role: "group", preserveAspectRatio: "xMidYMid meet", "aria-label": scroller.getAttribute("aria-label") });
      const diagram = { svg, scroller, shape, region, title }; diagrams.push(diagram);
      const definitions = svgNode("defs"), paths = svgNode("g", { class: "purchase-flow-paths" }), nodes = svgNode("g", { class: "purchase-flow-nodes" });
      // An inert foreground copy raises the selected ribbon without reparenting
      // its focusable SVG path (which would discard native keyboard focus).
      const foreground = svgNode("path", { class: "purchase-flow-highlight", visibility: "hidden", fill: "none", "stroke-linejoin": "round", "aria-hidden": "true", "pointer-events": "none" });
      svg.append(definitions, paths, foreground, nodes); scroller.append(svg); region.append(scroller);
      const tooltip = node("div", "purchase-flow-tooltip"); tooltip.id = `${uid}-${group.key.replace(/[^a-z0-9]/gi, "-")}-${kind}`;
      tooltip.hidden = true; tooltip.setAttribute("role", "tooltip"); region.append(tooltip); body.append(region);
      let active = null;
      const hide = () => { if (active) { active.classList.remove("is-active"); active.setAttribute("stroke-opacity", "1"); } active = null;
        foreground.setAttribute("visibility", "hidden"); svg.classList.remove("is-hovering"); tooltip.hidden = true; };
      hides.push(hide);
      const navigation = { scale: 1, x: 0, y: 0, drag: null };
      function transform() {
        svg.style.transformOrigin = "0 0";
        svg.style.transform = `translate(${navigation.x}px, ${navigation.y}px) scale(${navigation.scale})`;
      }
      function endPan(event) {
        const drag = navigation.drag;
        if (!drag || event && event.pointerId !== drag.id) return;
        navigation.drag = null; scroller.classList.remove("is-panning");
        if (event?.type === "pointercancel") suppressPanContextMenu = false;
        if (scroller.hasPointerCapture?.(drag.id)) scroller.releasePointerCapture(drag.id);
      }
      diagram.endPan = endPan;
      diagram.resetNavigation = () => {
        endPan(); navigation.scale = 1; navigation.x = 0; navigation.y = 0;
        svg.style.transform = ""; svg.style.transformOrigin = "";
      };
      scroller.addEventListener("wheel", event => {
        if (!fullscreenDialog || !Number.isFinite(event.deltaY) || !event.deltaY) return;
        event.preventDefault(); endPan(); hide();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientHeight || scroller.getBoundingClientRect().height : 1;
        const delta = Math.max(-500, Math.min(500, event.deltaY * unit));
        const scale = Math.max(.5, Math.min(8, navigation.scale * Math.exp(-delta * .002)));
        const ratio = scale / navigation.scale, bounds = svg.getBoundingClientRect();
        // The current rect includes translation, scaling and flex centering.
        // Keep the diagram point under the mouse fixed in screen coordinates.
        navigation.x += (event.clientX - bounds.left) * (1 - ratio);
        navigation.y += (event.clientY - bounds.top) * (1 - ratio);
        navigation.scale = scale; transform();
      }, { passive: false });
      scroller.addEventListener("pointerdown", event => {
        if (!fullscreenDialog || event.button !== 2 || navigation.drag) return;
        event.preventDefault(); hide();
        suppressPanContextMenu = true;
        navigation.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
        scroller.classList.add("is-panning"); scroller.setPointerCapture?.(event.pointerId);
      });
      scroller.addEventListener("pointermove", event => {
        const drag = navigation.drag;
        if (!fullscreenDialog || !drag || drag.id !== event.pointerId) return;
        if (!(event.buttons & 2)) { endPan(event); return; }
        event.preventDefault(); hide();
        navigation.x += event.clientX - drag.x; navigation.y += event.clientY - drag.y;
        drag.x = event.clientX; drag.y = event.clientY; transform();
      });
      for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) scroller.addEventListener(name, endPan);
      scroller.addEventListener("contextmenu", event => { if (fullscreenDialog) event.preventDefault(); });
      function place(event, target) {
        const bounds = region.getBoundingClientRect(), own = tooltip.getBoundingClientRect(), targetBounds = target.getBoundingClientRect();
        const x = Number.isFinite(event?.clientX) ? event.clientX - bounds.left : targetBounds.left + targetBounds.width / 2 - bounds.left;
        const y = Number.isFinite(event?.clientY) ? event.clientY - bounds.top : targetBounds.top - bounds.top;
        tooltip.style.left = `${Math.max(8, Math.min(x + 14, bounds.width - own.width - 8))}px`;
        tooltip.style.top = `${Math.max(35, y + own.height + 25 > bounds.height ? y - own.height - 12 : y + 16)}px`;
      }
      function show(target, rows, label, event, ribbon) {
        hide();
        if (navigation.drag) return;
        if (ribbon) {
          active = target; svg.classList.add("is-hovering"); target.classList.add("is-active"); target.setAttribute("stroke-opacity", "0");
          for (const key of ["d", "stroke", "stroke-width"]) foreground.setAttribute(key, target.getAttribute(key));
          foreground.setAttribute("visibility", "visible");
        }
        tooltip.replaceChildren(node("strong", "purchase-flow-tooltip-title", label), node("b", "purchase-flow-tooltip-amount", money(sum(rows), group.currency)));
        const codeLabels = rows[0]?.code && rows.every(row => row.codeKey === rows[0].codeKey)
          ? [...new Set(rows.map(row => row.codeCategory).filter(Boolean))] : [];
        for (const codeLabel of codeLabels) tooltip.append(node("span", "", codeLabel));
        if (rows.length === 1) {
          const row = rows[0];
          for (const value of [row.category || t("purchaseFlow.unknownCategory"), codeLabels.length ? null : row.code || t("purchaseFlow.unknownCode"),
            row.supplierLabel || t("purchaseFlow.unknownSupplier"), `${dateLabel(row.date)} · ${row.documentLabel || t("purchaseFlow.unknownDocument")}`, row.description]) {
            if (value) tooltip.append(node("span", "", value));
          }
        }
        tooltip.hidden = false; place(event, target);
      }
      function bind(target, key, rows, label, ribbon) {
        target.setAttribute("tabindex", "0"); target.setAttribute("role", "button"); target.setAttribute("aria-label", label);
        target.setAttribute("aria-describedby", tooltip.id); target.setAttribute("data-purchase-flow-control", `${group.key}:${kind}:${key}`);
        target.addEventListener("pointerenter", event => show(target, rows, label, event, ribbon));
        target.addEventListener("pointermove", event => { if (!tooltip.hidden) place(event, target); });
        target.addEventListener("pointerleave", hide); target.addEventListener("focus", event => show(target, rows, label, event, ribbon)); target.addEventListener("blur", hide);
        target.addEventListener("click", event => { event.stopPropagation?.(); show(target, rows, label, event, ribbon); });
        target.addEventListener("keydown", event => {
          if (event.key === "Escape") { event.preventDefault?.(); hide(); }
          else if (event.key === "Enter" || event.key === " ") { event.preventDefault?.(); show(target, rows, label, event, ribbon); }
        });
      }
      const displayCategory = value => value || t("purchaseFlow.unknownCategory"), displayCode = value => value || t("purchaseFlow.unknownCode");
      for (const [linkIndex, link] of shape.links.entries()) {
        const from = link.kind === "allocation" ? displayCategory(link.sourceLabel) : displayCode(link.sourceLabel);
        const to = link.kind === "allocation" ? displayCode(link.targetLabel) : link.targetLabel || t("purchaseFlow.unknownPurchase");
        const sourceColor = endpointColor(link.kind === "allocation" ? "category" : "code", link.kind === "allocation" ? link.source : link.code);
        const targetColor = link.kind === "allocation" ? palette(link.code) : purchaseColor(link.code, link.targetColorKey);
        let stroke = sourceColor;
        if (sourceColor !== targetColor) {
          const gradientId = `${uid}-diagram-${diagrams.length}-gradient-${linkIndex}`;
          const gradient = svgNode("linearGradient", { id: gradientId, gradientUnits: "userSpaceOnUse", x1: link.x1, y1: link.y1, x2: link.x2, y2: link.y2 });
          gradient.append(svgNode("stop", { offset: "0%", "stop-color": sourceColor }), svgNode("stop", { offset: "100%", "stop-color": targetColor }));
          definitions.append(gradient); stroke = `url(#${gradientId})`;
        }
        const path = svgNode("path", { d: ribbonPath(link),
          fill: "none", stroke, "stroke-width": link.height, "stroke-linejoin": "round", class: "purchase-flow-ribbon", "data-purchase-flow-link": link.key });
        bind(path, `link:${link.key}`, link.items, t("purchaseFlow.flowLabel", { p0: from, p1: to, p2: money(sum(link.items), group.currency) }), true); paths.append(path);
      }
      for (const [column, x, titleKey] of [[shape.categories, 260, "categories"], [shape.codes, 650, "codes"], [shape.purchases, 990, kind]]) {
        svg.append(svgNode("text", { x: x === 260 ? 10 : x === 650 ? 657 : 1009, y: 27, "text-anchor": x === 650 ? "middle" : "start", class: "purchase-flow-column-title" }, t(`purchaseFlow.${titleKey}`)));
        for (const item of column) {
          const rows = item.items || [item], total = sum(rows), isPurchase = x === 990;
          const label = x === 260 ? displayCategory(item.label) : x === 650 ? displayCode(item.label) : item.label || t("purchaseFlow.unknownPurchase");
          const groupNode = svgNode("g", { class: "purchase-flow-node" });
          const block = svgNode("rect", { x, y: item.y, width: 14, height: Math.max(1, item.height), rx: 1,
            fill: isPurchase ? purchaseColor(item.code, item.colorKey) : endpointColor(x === 260 ? "category" : "code", x === 260 ? item.key : item.label) });
          groupNode.append(block);
          const center = item.y + item.height / 2, labelX = x === 260 ? 10 : x === 650 ? 657 : 1009;
          let background = null, frame = null, nameLabel = null, amountLabel = null;
          if (x === 650) { background = svgNode("rect", { x: x - 66, y: center - 23, width: 146, height: 47, rx: 5, class: "purchase-flow-code-label-bg" }); groupNode.append(background); }
          const formattedAmount = money(total, group.currency);
          const maxCharacters = x === 650 ? 20 : 34;
          const displayed = label.length > maxCharacters ? `${label.slice(0, maxCharacters - 1)}…` : label;
          if (isPurchase) {
            frame = svgNode("foreignObject", { x: labelX, y: center - shape.purchaseStyle.lineHeight / 2, width: 277, height: shape.purchaseStyle.lineHeight });
            const inline = node("div", "purchase-flow-node-label purchase-flow-expense-label");
            inline.style.fontSize = `${shape.purchaseStyle.fontSize}px`;
            inline.style.lineHeight = `${shape.purchaseStyle.lineHeight}px`;
            inline.append(node("span", "purchase-flow-expense-name", label), node("span", "purchase-flow-inline-amount", ` · ${formattedAmount}`));
            frame.append(inline); groupNode.append(frame);
          } else {
            nameLabel = svgNode("text", { x: labelX, y: center - 4, "text-anchor": x === 650 ? "middle" : "start", class: "purchase-flow-node-label" }, displayed);
            amountLabel = svgNode("text", { x: labelX, y: center + 15, "text-anchor": x === 650 ? "middle" : "start", class: "purchase-flow-node-amount" }, formattedAmount);
            groupNode.append(nameLabel, amountLabel);
          }
          bind(groupNode, `node:${x}:${item.key}`, rows, `${label} · ${money(total, group.currency)}`, false); nodes.append(groupNode);
        }
      }
      region.addEventListener("keydown", event => { if (event.key === "Escape") hide(); });
      scroller.addEventListener("scroll", hide); svg.addEventListener("click", hide);
    }
    if (model.status !== "unavailable") for (const group of model.groups) {
      const heading = node("h5", "purchase-flow-currency", group.currency || t("purchaseFlow.unknownCurrency")); body.append(heading);
      const summary = node("dl", "purchase-flow-totals");
      for (const [label, value] of [["gross", group.gross], ["correctionTotal", group.correctionTotal], ["net", group.net]]) {
        const item = node("div", ""); item.append(node("dt", "", t(`purchaseFlow.${label}`)), node("dd", "", money(value, group.currency))); summary.append(item);
      }
      body.append(summary); addDiagram(group, group.purchases, false); addDiagram(group, group.corrections, true);
    }
    const all = model.status === "unavailable" ? [] : model.groups.flatMap(group => group.items);
    if (all.length) {
      const details = node("details", "purchase-flow-details"); details.open = oldDetails; details.setAttribute("data-purchase-flow-details", "");
      const toggle = node("summary", "", t("purchaseFlow.details", { p0: I18n.formatNumber(all.length) })); toggle.setAttribute("data-purchase-flow-control", "details"); details.append(toggle);
      const scroll = node("div", "purchase-flow-table-scroll"), table = node("table", "purchase-flow-table"), head = node("thead", ""), header = node("tr", "");
      for (const key of ["date", "categories", "codes", "supplier", "reference", "amount"]) { const cell = node("th", "", t(`purchaseFlow.${key}`)); cell.setAttribute("scope", "col"); header.append(cell); }
      head.append(header); table.append(head); const tableBody = node("tbody", "");
      for (const row of all) {
        const tr = node("tr", ""); tr.setAttribute("data-purchase-flow-entry", row.id);
        for (const value of [dateLabel(row.date), row.category || t("purchaseFlow.unknownCategory"), row.code || t("purchaseFlow.unknownCode"), row.supplierLabel || t("purchaseFlow.unknownSupplier")]) tr.append(node("td", "", value));
        const reference = node("td", ""); reference.append(node("strong", "", row.documentLabel || t("purchaseFlow.unknownDocument")), node("span", "", row.description || t("purchaseFlow.unknownPurchase")));
        if (row.documentType === "in_refund" || row.consumed < 0) reference.append(node("em", "", t("purchaseFlow.corrections")));
        tr.append(reference, node("td", "purchase-flow-table-amount", money(row.consumed, row.currencyId === null ? "" : row.currency))); tableBody.append(tr);
      }
      table.append(tableBody); scroll.append(table); details.append(scroll); body.append(details);
    }
    const fullscreenChrome = [toggle, heading, ...Array.from(body.children).filter(element => !diagrams.some(diagram => diagram.region === element)),
      ...diagrams.map(diagram => diagram.title)].map(element => ({ element, hidden: element.hidden }));
    let fullscreenDialog = null, resizeObserver = null, collapsed = oldCollapsed, suppressPanContextMenu = false;
    const view = doc.defaultView;
    const stopPans = () => { suppressPanContextMenu = false; diagrams.forEach(diagram => diagram.endPan()); };
    function fitExpanded() {
      if (!fullscreenDialog || !diagrams.length) return;
      suppressPanContextMenu = false;
      const bounds = fullscreenDialog.getBoundingClientRect(), first = diagrams[0].scroller.getBoundingClientRect();
      const availableWidth = Math.min(...diagrams.map(({ scroller }) => scroller.clientWidth || scroller.getBoundingClientRect().width)) - 2;
      // Account for the exit button above the first diagram. Add scrollTop so
      // resizing while inspecting later content keeps the same
      // available frame rather than changing scale with the scroll position.
      const precedingHeight = first.top - bounds.top + (fullscreenDialog.scrollTop || 0);
      const availableHeight = Math.max(1, (fullscreenDialog.clientHeight || bounds.height) - precedingHeight - 18);
      const sizes = fitGeometry(diagrams.map(({ shape }) => shape), availableWidth, availableHeight);
      diagrams.forEach(({ svg, resetNavigation }, index) => {
        resetNavigation();
        if (!sizes[index]) return;
        svg.style.width = `${sizes[index].width}px`; svg.style.height = `${sizes[index].height}px`;
      });
      hides.forEach(hide => hide());
    }
    function updateExpand(expanded) {
      const label = t(expanded ? "purchaseFlow.restore" : "purchaseFlow.expand");
      fullscreenChrome.forEach(({ element, hidden }) => { element.hidden = expanded || hidden; });
      expand.setAttribute("aria-label", label); expand.setAttribute("title", label); expand.setAttribute("aria-expanded", String(expanded));
      expandPath.setAttribute("d", expanded ? "M3 8h5V3 M16 3v5h5 M21 16h-5v5 M8 21v-5H3" : "M8 3H3v5 M16 3h5v5 M21 16v5h-5 M3 16v5h5");
    }
    function closeExpanded(restoreFocus = true) {
      const dialog = fullscreenDialog;
      if (!dialog) return;
      fullscreenDialog = null;
      suppressPanContextMenu = false;
      resizeObserver?.disconnect(); resizeObserver = null;
      view?.removeEventListener?.("resize", fitExpanded);
      view?.removeEventListener?.("blur", stopPans);
      hides.forEach(hide => hide());
      diagrams.forEach(diagram => { diagram.resetNavigation(); diagram.svg.style.width = ""; diagram.svg.style.height = ""; });
      if (dialog.open && typeof dialog.close === "function") dialog.close();
      panel.remove(); container.append(panel); dialog.remove();
      updateExpand(false);
      if (restoreFocus && expand.isConnected !== false) expand.focus();
    }
    function setCollapsed(value) {
      collapsed = value; hides.forEach(hide => hide()); body.hidden = value;
      panel.setAttribute("data-purchase-flow-collapsed", String(value));
      panel.classList[value ? "add" : "remove"]("is-collapsed");
      const label = t(value ? "purchaseFlow.show" : "purchaseFlow.hide");
      toggle.setAttribute("aria-label", label); toggle.setAttribute("title", label); toggle.setAttribute("aria-expanded", String(!value));
      togglePath.setAttribute("d", value ? "M5 12h14 M12 5v14" : "M5 12h14");
    }
    toggle.addEventListener("click", () => {
      if (!collapsed) closeExpanded(false);
      setCollapsed(!collapsed); toggle.focus();
    });
    expand.addEventListener("click", () => {
      if (fullscreenDialog) { closeExpanded(); return; }
      setCollapsed(false);
      hides.forEach(hide => hide());
      const dialog = node("dialog", "purchase-flow-fullscreen");
      dialog.setAttribute("data-purchase-flow-fullscreen", ""); dialog.setAttribute("aria-labelledby", heading.id);
      // Chromium can target a right-drag's contextmenu at its release point,
      // outside the plot. Consume only that gesture, not later outside clicks.
      dialog.addEventListener("pointerdown", () => { suppressPanContextMenu = false; }, true);
      dialog.addEventListener("contextmenu", event => {
        if (suppressPanContextMenu) { event.preventDefault(); suppressPanContextMenu = false; }
      }, true);
      dialog.addEventListener("cancel", event => { event.preventDefault?.(); closeExpanded(); });
      dialog.addEventListener("close", () => { if (fullscreenDialog === dialog) closeExpanded(); });
      dialog.addEventListener("keydown", event => {
        if (event.key === "Escape") { event.preventDefault?.(); closeExpanded(); return; }
        if (event.key !== "Tab") return;
        const controls = Array.from(panel.querySelectorAll("[data-purchase-flow-control]")).filter(element => {
          for (let ancestor = element; ancestor && ancestor !== panel; ancestor = ancestor.parentElement) if (ancestor.hidden) return false;
          return true;
        }), current = controls.indexOf(doc.activeElement);
        if (current === -1 || event.shiftKey && current === 0 || !event.shiftKey && current === controls.length - 1) {
          event.preventDefault?.(); (event.shiftKey ? controls.at(-1) : controls[0])?.focus();
        }
      });
      fullscreenDialog = dialog; panel.remove(); dialog.append(panel); container.append(dialog); updateExpand(true);
      if (typeof dialog.showModal === "function") dialog.showModal();
      else { dialog.open = true; dialog.setAttribute("open", ""); }
      fitExpanded();
      view?.addEventListener?.("resize", fitExpanded);
      view?.addEventListener?.("blur", stopPans);
      if (typeof view?.ResizeObserver === "function") {
        resizeObserver = new view.ResizeObserver(fitExpanded); resizeObserver.observe(dialog); resizeObserver.observe(header);
      }
      expand.focus();
    });
    updateExpand(false); setCollapsed(oldCollapsed);
    container.replaceChildren(panel); lifecycles.set(container, () => { hides.forEach(hide => hide()); closeExpanded(false); });
    if (oldControl !== null) {
      const target = Array.from(container.querySelectorAll("[data-purchase-flow-control]")).find(element => element.getAttribute("data-purchase-flow-control") === oldControl);
      (collapsed && body.contains(target) ? toggle : target)?.focus();
    }
    return model;
  }
  return { render, cleanup, buildModel, layout, fitGeometry };
});
