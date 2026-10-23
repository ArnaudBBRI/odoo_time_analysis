const assert = require("node:assert/strict");
const test = require("node:test");
const { buildModel, layout, render, cleanup, fitGeometry } = require("../project-purchase-flow");
const I18n = require("../i18n-core-messages");
const { domFixture } = require("./dom-fixture");

const entry = (id, consumed, extra = {}) => ({ id, consumed, date: "2026-05-12", currencyId: 1, currency: "EUR", categoryId: 10,
  category: "Équipement", codeCategoryId: 20, codeCategory: "6010 Fournitures", code: "6010", description: `Achat ${id}`,
  supplierLabel: "Fournisseur exemple", documentLabel: `INV-${id}`, documentType: "in_invoice", ...extra });
const source = (items = [entry(1, 150), entry(2, 50)]) => ({ status: "available", startDate: "2025-02-01", endDate: "2026-10-21", items, issues: [] });
const find = (host, selector) => host.querySelectorAll(selector)[0];
const links = host => host.querySelectorAll("[data-purchase-flow-link]");
const purchaseLink = (host, label, codeKey = "code-category:20:6010") => links(host)
  .find(link => link.getAttribute("data-purchase-flow-link") === `purchase:${JSON.stringify([codeKey, label])}`);
const contentBounds = (column, labelTop, labelBottom) => column.length ? {
  top: Math.min(...column.flatMap(row => [row.y, row.y + row.height / 2 + labelTop])),
  bottom: Math.max(...column.flatMap(row => [row.y + Math.max(1, row.height), row.y + row.height / 2 + labelBottom]))
} : { top: 0, bottom: 0 };
function assertReadablePurchaseColumn(shape) {
  const { fontSize, lineHeight, gap } = shape.purchaseStyle;
  assert.ok(fontSize >= 8 && fontSize <= 10); assert.ok(lineHeight >= 12.8 && lineHeight <= 16);
  assert.ok(gap >= 2 && gap <= 18);
  const bounds = contentBounds(shape.purchases, -lineHeight / 2, lineHeight / 2);
  assert.ok(Math.abs(bounds.bottom - bounds.top - shape.columnExtents.purchases) < 1e-7);
  assert.ok(bounds.top >= 70 - 1e-7); assert.ok(bounds.bottom <= shape.height - 65 + 1e-7);
  for (let index = 1; index < shape.purchases.length; index++) {
    const previous = shape.purchases[index - 1], current = shape.purchases[index];
    assert.ok(current.y - previous.y - previous.height >= gap - 1e-7);
    assert.ok(current.y > previous.y + Math.max(1, previous.height));
    const previousLabelBottom = previous.y + previous.height / 2 + lineHeight / 2;
    const currentLabelTop = current.y + current.height / 2 - lineHeight / 2;
    assert.ok(currentLabelTop - previousLabelBottom >= 1 - 1e-7);
  }
}

test("purchase model reconciles positive purchases, signed refunds and negative corrections without mutating input", () => {
  const data = source([entry(1, 150), entry(2, -20, { documentType: "in_refund" }), entry(3, -5), entry(4, 0)]), original = structuredClone(data);
  const result = buildModel(data), group = result.groups[0];
  assert.equal(result.status, "available"); assert.equal(group.gross, 150); assert.equal(group.correctionTotal, -25); assert.equal(group.net, 125);
  assert.deepEqual(group.purchases.map(row => row.id), [1]); assert.deepEqual(group.corrections.map(row => row.id), [2, 3]);
  assert.equal(group.items.length, 4); assert.deepEqual(data, original);
});

test("an invoice credit and a refund of either sign are always displayed in the correction diagram", () => {
  const model = buildModel(source([entry(1, 100), entry(2, 5, { documentType: "in_refund" }), entry(3, -10)]));
  const group = model.groups[0]; assert.equal(group.gross, 100); assert.equal(group.correctionTotal, -5); assert.equal(group.net, 95);
  assert.deepEqual(group.corrections.map(row => row.id), [2, 3]);
});

test("inclusive project-start and current-day entries survive while pre-start, future and invalid dates cannot enter", () => {
  const model = buildModel(source([entry(1, 10, { date: "2025-02-01" }), entry(2, 20, { date: "2026-10-21" }),
    entry(3, 30, { date: "2025-01-31" }), entry(4, 40, { date: "2026-10-22" }), entry(5, 50, { date: "2026-02-30" })]));
  assert.equal(model.status, "partial"); assert.equal(model.groups[0].net, 30); assert.equal(model.groups[0].items.length, 2);
});

test("absent or reversed lifetime bounds are unavailable instead of estimating a purchase period", () => {
  for (const change of [{ startDate: null }, { endDate: "2025-01-01" }, { startDate: "2025-02-29" }]) {
    const model = buildModel({ ...source(), ...change }); assert.equal(model.status, "unavailable"); assert.deepEqual(model.groups, []);
  }
});

test("unconfirmed documents and invalid identities are omitted while unknown amounts remain disclosed in the detail table", () => {
  const model = buildModel(source([entry(1, 10), entry(2, 20, { documentType: "entry" }), entry(3, null), entry(4, NaN), entry(null, 40)]));
  assert.equal(model.status, "partial"); assert.equal(model.groups[0].net, null); assert.equal(model.groups[0].items.length, 3);
  assert.equal(model.groups[0].purchases.length, 1); assert.equal(model.groups[0].gross, null);
  const host = domFixture(); render(host, source([entry(1, 10), entry(2, null)]));
  assert.equal(host.querySelectorAll("[data-purchase-flow-entry]").length, 2); assert.match(host.textContent, /Certains montants sont inconnus/);
});

test("duplicate allocations count once and contradictory exact identities are excluded completely", () => {
  let data = source([entry(1, 10), entry(1, 10), entry(2, 20)]), model = buildModel(data);
  assert.equal(model.status, "partial"); assert.equal(model.groups[0].net, 30);
  model = buildModel(source([entry(1, 10), entry(1, 90), entry(1, 90), entry(2, 20)]));
  assert.equal(model.groups[0].net, 20); assert.deepEqual(model.groups[0].items.map(row => row.id), [2]);
});

test("separate analytic allocations of one invoice remain distinct purchases", () => {
  const data = source([entry(1, 10, { documentLabel: "same invoice" }), entry(2, 20, { documentLabel: "same invoice" })]);
  const group = buildModel(data).groups[0]; assert.equal(group.net, 30); assert.equal(group.items.length, 2);
  const geometry = layout(group.purchases); assert.equal(geometry.purchases.length, 2); assert.equal(geometry.links.length, 3);
});

test("currency identity isolates known units and never combines two unverified currencies", () => {
  const model = buildModel(source([entry(1, 10), entry(2, 20, { currencyId: 2, currency: "USD" }),
    entry(3, 30, { currencyId: null, currency: "EUR" }), entry(4, 40, { currencyId: null, currency: "EUR" })]));
  assert.equal(model.status, "partial"); assert.equal(model.groups.length, 4);
  assert.deepEqual(model.groups.map(group => group.net), [10, 20, 30, 40]);
  assert.equal(model.groups[2].currency, ""); assert.equal(model.groups[3].currency, "");
});

test("exact convention and internal-code identities govern graph nodes even when labels match", () => {
  const group = buildModel(source([entry(1, 10), entry(2, 20, { categoryId: 11, codeCategoryId: 21 }),
    entry(3, 30, { codeCategoryId: null }), entry(4, 40, { codeCategoryId: null })])).groups[0];
  const shape = layout(group.purchases); assert.equal(shape.categories.length, 2); assert.equal(shape.codes.length, 4);
  assert.equal(shape.purchases.length, 4);
});

test("missing internal codes share one middle node per diagram without merging purchases, currencies or unverified named codes", () => {
  const data = source([entry(1, 10, { code: null, codeCategoryId: null }),
    entry(2, 20, { code: "  ", categoryId: 11, codeCategoryId: 21 }), entry(3, 30, { code: "", codeCategoryId: null }),
    entry(4, -5, { code: null, codeCategoryId: null, documentType: "in_refund" }),
    entry(5, 40, { code: "", currencyId: 2, currency: "USD" }), entry(6, 50, { code: "", currencyId: 2, currency: "USD" }),
    entry(7, 60, { codeCategoryId: null }), entry(8, 70, { codeCategoryId: null }),
    entry(9, -6, { code: "", documentType: "in_refund" })]);
  const original = structuredClone(data), model = buildModel(data), [eur, usd] = model.groups;
  assert.equal(model.status, "partial"); assert.ok(model.issues.includes("missing-mapping"));
  assert.equal(eur.net, 179); assert.equal(usd.net, 90); assert.deepEqual(data, original);
  const purchases = layout(eur.purchases), missing = purchases.codes.find(code => code.key === "unassigned");
  assert.equal(purchases.codes.length, 3); assert.equal(missing.label, "");
  assert.deepEqual(missing.items.map(row => row.id).sort((a, b) => a - b), [1, 2, 3]);
  assert.equal(missing.items.reduce((total, row) => total + row.consumed, 0), 60);
  assert.equal(purchases.purchases.length, 5);
  const incoming = purchases.links.filter(link => link.kind === "allocation" && link.target === missing.key);
  const outgoing = purchases.links.filter(link => link.kind === "purchase" && link.items[0].codeKey === missing.key);
  assert.equal(incoming.length, 2); assert.equal(outgoing.length, 3);
  for (const paths of [incoming, outgoing]) assert.ok(Math.abs(paths.reduce((total, link) => total + link.height, 0) - missing.height) < 1e-8);
  for (const rows of [eur.corrections, usd.purchases]) {
    const shape = layout(rows); assert.equal(shape.codes.length, 1); assert.equal(shape.codes[0].key, "unassigned");
    assert.equal(shape.codes[0].items.length, 2); assert.equal(shape.purchases.length, 2);
  }
});

test("ribbon thickness is conserved at each node, tiny purchases survive, and dense layouts grow without omissions", () => {
  const data = source(Array.from({ length: 90 }, (_, index) => entry(index + 1, index ? .001 : 100000, { codeCategoryId: index % 3 + 20, code: String(index % 3 + 6010) })));
  const shape = layout(buildModel(data).groups[0].purchases);
  assert.equal(shape.purchases.length, 90); assert.ok(shape.height > 1000 && shape.height < 2000);
  for (const code of shape.codes) {
    const incoming = shape.links.filter(link => link.kind === "allocation" && link.target === code.key).reduce((total, link) => total + link.height, 0);
    const outgoing = shape.links.filter(link => link.kind === "purchase" && link.items[0].codeKey === code.key).reduce((total, link) => total + link.height, 0);
    assert.ok(Math.abs(incoming - code.height) < 1e-8); assert.ok(Math.abs(outgoing - code.height) < 1e-8);
  }
  assert.ok(shape.links.every(link => Number.isFinite(link.y1) && Number.isFinite(link.y2) && link.height >= .8));
  assertReadablePurchaseColumn(shape);
});

test("renderer exposes separate purchase and signed-correction diagrams, totals and every allocation in a table", () => {
  const host = domFixture(); render(host, source([entry(1, 100), entry(2, -20, { documentType: "in_refund" }), entry(3, 0)]));
  assert.equal(host.querySelectorAll(".purchase-flow-diagram").length, 2);
  assert.equal(host.querySelectorAll("[data-purchase-flow-entry]").length, 3);
  assert.match(host.textContent, /Avoirs et corrections/); assert.match(host.textContent, /80 EUR/);
  assert.match(host.textContent, /Factures fournisseurs et avoirs comptabilisés/);
});

test("purchase and correction diagrams retain the same amount-to-thickness scale within one currency", () => {
  const host = domFixture(); render(host, source([entry(1, 200000), entry(2, -20000, { documentType: "in_refund" })]));
  const purchase = purchaseLink(host, "Achat 1");
  const credit = purchaseLink(host, "Achat 2");
  assert.ok(Math.abs(Number(purchase.getAttribute("stroke-width")) / Number(credit.getAttribute("stroke-width")) - 10) < 1e-10);
});

test("hover isolates exactly one ribbon and exposes safe amount/source detail; leaving resets it", () => {
  const host = domFixture(); render(host, source()); const ribbon = links(host)[0], svg = find(host, ".purchase-flow-svg"), tip = find(host, ".purchase-flow-tooltip");
  ribbon.dispatch("pointerenter", { clientX: 120, clientY: 180 });
  assert.match(svg.className, /is-hovering/); assert.match(ribbon.className, /is-active/); assert.equal(tip.hidden, false);
  assert.match(tip.textContent, /200 EUR/); assert.equal(host.querySelectorAll(".is-active").length, 1);
  const other = links(host).find(element => element !== ribbon); other.dispatch("pointerenter");
  assert.equal(host.querySelectorAll(".is-active").length, 1); assert.doesNotMatch(ribbon.className, /is-active/);
  other.dispatch("pointerleave"); assert.doesNotMatch(svg.className, /is-hovering/); assert.equal(tip.hidden, true);
});

test("keyboard focus isolates a ribbon and Escape, blur, scroll and blank-chart tap clear the selection", () => {
  const host = domFixture(); render(host, source()); const ribbon = links(host)[0], svg = find(host, ".purchase-flow-svg"), tip = find(host, ".purchase-flow-tooltip");
  ribbon.focus(); assert.equal(tip.hidden, false); assert.match(svg.className, /is-hovering/);
  assert.equal(host.ownerDocument.activeElement, ribbon); assert.equal(find(host, ".purchase-flow-highlight").getAttribute("visibility"), "visible");
  ribbon.dispatch("keydown", { key: "Escape" }); assert.equal(tip.hidden, true);
  ribbon.dispatch("keydown", { key: "Enter" }); assert.equal(tip.hidden, false); ribbon.dispatch("blur"); assert.equal(tip.hidden, true);
  ribbon.dispatch("click"); assert.equal(tip.hidden, false); find(host, ".purchase-flow-scroll").dispatch("scroll"); assert.equal(tip.hidden, true);
  ribbon.dispatch("click"); svg.dispatch("click"); assert.equal(tip.hidden, true);
});

test("node focus shows its total without propagating ribbon highlighting", () => {
  const host = domFixture(); render(host, source()); links(host)[0].dispatch("pointerenter"); const node = find(host, ".purchase-flow-node"); node.focus();
  assert.equal(host.querySelectorAll(".is-active").length, 0); assert.doesNotMatch(find(host, ".purchase-flow-svg").className, /is-hovering/);
  assert.equal(find(host, ".purchase-flow-tooltip").hidden, false);
});

test("aggregated code nodes and allocation ribbons retain available full code labels without purchase-specific details", () => {
  const host = domFixture(), fullLabel = "6153 Annonces, relations publiques";
  render(host, source([entry(1, 30, { code: "6153", codeCategory: null }),
    entry(2, 20, { code: "6153", codeCategory: fullLabel }), entry(3, 10, { code: "6153", codeCategory: fullLabel })]));
  const code = host.querySelectorAll(".purchase-flow-node").find(node => node.getAttribute("data-purchase-flow-control").includes(":node:650:"));
  const allocation = links(host).find(link => !link.getAttribute("data-purchase-flow-link").startsWith("purchase:"));
  const tooltip = find(host, ".purchase-flow-tooltip");
  for (const control of [code, allocation]) {
    control.focus(); assert.ok(tooltip.textContent.includes(fullLabel));
    assert.equal(tooltip.querySelectorAll("span").filter(span => span.textContent === fullLabel).length, 1);
    assert.doesNotMatch(tooltip.textContent, /Fournisseur exemple|INV-|Achat [123]/);
  }
  purchaseLink(host, "Achat 2", "code-category:20:6153").focus();
  assert.ok(tooltip.textContent.includes(fullLabel)); assert.match(tooltip.textContent, /Fournisseur exemple/);
  assert.match(tooltip.textContent, /INV-2/); assert.match(tooltip.textContent, /Achat 2/);
});

test("mixed-code category nodes and the missing-code bucket do not inherit an unrelated code description", () => {
  const host = domFixture(), fullLabel = '6153 <img src=x onerror="boom()">';
  render(host, source([entry(1, 10, { code: "6153", codeCategory: fullLabel }),
    entry(2, 20, { code: "6020", codeCategoryId: 21, codeCategory: "6020 Logiciels" }),
    entry(3, 5, { code: null, codeCategoryId: null, codeCategory: "Unverified label" }),
    entry(4, 5, { code: null, codeCategoryId: null, codeCategory: "Another unverified label" })]));
  const tooltip = find(host, ".purchase-flow-tooltip"), nodes = host.querySelectorAll(".purchase-flow-node");
  for (const ending of [":node:260:category:10", ":node:650:unassigned"]) {
    nodes.find(node => node.getAttribute("data-purchase-flow-control").endsWith(ending)).focus();
    assert.doesNotMatch(tooltip.textContent, /<img|Logiciels|[Uu]nverified label/);
  }
  nodes.find(node => node.getAttribute("data-purchase-flow-control").endsWith(":node:650:code-category:20:6153")).focus();
  assert.ok(tooltip.textContent.includes(fullLabel)); assert.equal(tooltip.querySelectorAll("img").length, 0);
});

test("cleanup hides tooltip but preserves DOM and focus for parent navigation lifecycle", () => {
  const host = domFixture(); render(host, source()); const ribbon = links(host)[0]; ribbon.focus(); cleanup(host); cleanup(host);
  assert.equal(find(host, ".purchase-flow-tooltip").hidden, true); assert.equal(host.ownerDocument.activeElement, ribbon); assert.ok(host.contains(ribbon));
  assert.equal(host.ownerDocument.listeners.size, 0);
});

test("stable control identities and detail disclosure survive a renderer refresh", () => {
  const host = domFixture(); render(host, source()); find(host, "[data-purchase-flow-details]").open = true;
  const ribbon = links(host)[1]; ribbon.focus(); const key = ribbon.getAttribute("data-purchase-flow-control");
  render(host, source()); assert.equal(find(host, "[data-purchase-flow-details]").open, true);
  assert.equal(host.ownerDocument.activeElement.getAttribute("data-purchase-flow-control"), key);
  const replacement = domFixture(); render(replacement, source(), { detailsOpen: true }); assert.equal(find(replacement, "[data-purchase-flow-details]").open, true);
});

test("unavailable, confirmed-empty and partial sources have distinct translated disclosures", () => {
  const host = domFixture(); render(host, undefined); assert.match(host.textContent, /indisponibles/); assert.equal(links(host).length, 0);
  render(host, source([])); assert.match(host.textContent, /Aucun achat comptabilisé/); assert.doesNotMatch(host.textContent, /Liste partielle/);
  render(host, { ...source(), status: "partial", issues: ["mappingMissing"] }); assert.match(host.textContent, /Liste partielle/); assert.match(host.textContent, /code interne vérifié/);
});

test("source descriptions are literal safe text and all UI strings render in Dutch", () => {
  const host = domFixture(), marker = '<img src=x onerror="boom()">';
  render(host, source([entry(1, 10, { description: marker, supplierLabel: marker })]));
  assert.match(host.textContent, /<img src=x/); assert.equal(host.querySelectorAll("img").length, 0);
  purchaseLink(host, marker).dispatch("pointerenter");
  assert.match(find(host, ".purchase-flow-tooltip").textContent, /<img src=x/);
  I18n.setLanguage("nl");
  try { render(host, source()); assert.match(host.textContent, /Aankopen sinds de projectstart/); assert.match(host.textContent, /Interne codes/); assert.doesNotMatch(host.textContent, /purchaseFlow\./); }
  finally { I18n.setLanguage("fr"); }
});

test("different endpoint colours use source-to-target gradients and matching endpoint colours remain solid", () => {
  const host = domFixture(); render(host, source(), { codeColor: code => code === "6010" ? "#00bfb6" : "#111111" });
  const gradient = find(host, "linearGradient"), stops = gradient.querySelectorAll("stop");
  const categoryColor = find(find(host, ".purchase-flow-node"), "rect").getAttribute("fill");
  assert.deepEqual(stops.map(stop => stop.getAttribute("stop-color")), [categoryColor, "#00bfb6"]);
  assert.deepEqual(stops.map(stop => stop.getAttribute("offset")), ["0%", "100%"]);
  assert.equal(gradient.getAttribute("gradientUnits"), "userSpaceOnUse");
  assert.equal(gradient.getAttribute("x1"), "274"); assert.equal(gradient.getAttribute("x2"), "650");
  const first = links(host)[0]; assert.equal(first.getAttribute("stroke"), `url(#${gradient.getAttribute("id")})`);
  first.focus(); assert.equal(find(host, ".purchase-flow-highlight").getAttribute("stroke"), first.getAttribute("stroke"));
  assert.ok(links(host).filter(link => link.getAttribute("data-purchase-flow-link").startsWith("purchase:")).every(link => link.getAttribute("stroke") === "#00bfb6"));
  cleanup(host); render(host, source(), { codeColor: () => categoryColor });
  assert.equal(host.querySelectorAll("linearGradient").length, 0);
  assert.ok(links(host).every(link => link.getAttribute("stroke") === categoryColor));
});

test("convention colours follow exact category identities across diagrams, currencies, labels and source order", () => {
  const host = domFixture(), items = [entry(1, 100), entry(2, 40, { categoryId: 11 }),
    entry(3, -20, { documentType: "in_refund" }), entry(4, 15, { currencyId: 2, currency: "USD" }),
    entry(5, 10, { categoryId: null, category: null })];
  const categoryColors = () => host.querySelectorAll(".purchase-flow-node")
    .filter(node => node.getAttribute("data-purchase-flow-control").includes(":node:260:"))
    .map(node => ({ key: node.getAttribute("data-purchase-flow-control").split(":node:260:")[1], color: find(node, "rect").getAttribute("fill") }));
  render(host, source(items));
  const original = categoryColors(), colors = new Map(original.map(row => [row.key, row.color]));
  assert.equal(colors.size, 3); assert.equal(new Set(colors.values()).size, 3);
  assert.equal(original.filter(row => row.key === "category:10").length, 3);
  for (const row of original) assert.equal(row.color, colors.get(row.key));
  for (const svg of host.querySelectorAll(".purchase-flow-svg")) for (const link of links(svg).filter(link => !link.getAttribute("data-purchase-flow-link").startsWith("purchase:"))) {
    const category = link.getAttribute("data-purchase-flow-link").split("|")[0], gradientId = link.getAttribute("stroke").slice(5, -1);
    const gradient = svg.querySelectorAll("linearGradient").find(node => node.getAttribute("id") === gradientId);
    assert.equal(find(gradient, "stop").getAttribute("stop-color"), colors.get(category));
  }
  I18n.setLanguage("nl");
  try {
    render(host, source(items.toReversed().map(row => ({ ...row, category: row.categoryId === null ? null : "Renamed category" }))));
    for (const row of categoryColors()) assert.equal(row.color, colors.get(row.key));
  } finally { cleanup(host); I18n.setLanguage("fr"); }
});

test("expense names and complete localized amounts share one line while full source text remains accessible", () => {
  const host = domFixture(), description = "Une dépense avec une description volontairement très longue et complète";
  for (const language of ["fr", "nl"]) {
    I18n.setLanguage(language);
    try {
      render(host, source([entry(1, 1234567.89, { description }), entry(2, -43.21, { description, documentType: "in_refund" })]));
      for (const [id, amount] of [[1, 1234567.89], [2, -43.21]]) {
        const control = host.querySelectorAll(".purchase-flow-node").find(node => {
          const key = node.getAttribute("data-purchase-flow-control");
          return key.includes(id === 1 ? ":purchases:" : ":corrections:") && key.endsWith(`node:990:purchase:${JSON.stringify(description)}`);
        });
        assert.equal(control.querySelectorAll("text").length, 0);
        const frame = find(control, "foreignObject"); assert.equal(frame.getAttribute("width"), "277");
        const labels = control.querySelectorAll(".purchase-flow-expense-label"); assert.equal(labels.length, 1);
        const spans = labels[0].querySelectorAll("span"); assert.equal(spans.length, 2);
        assert.equal(spans[1].textContent, ` · ${I18n.formatNumber(amount, { maximumFractionDigits: 2 })} EUR`);
        assert.equal(spans[0].textContent, description); assert.ok(control.getAttribute("aria-label").includes(description));
        control.focus(); assert.ok(find(host, ".purchase-flow-tooltip").textContent.includes(description));
      }
    } finally { cleanup(host); I18n.setLanguage("fr"); }
  }
});

test("gradient IDs stay unique across purchase and credit diagrams, multiple graphs and rerenders", () => {
  const data = source([entry(1, 100), entry(2, -20, { documentType: "in_refund" })]), one = domFixture(), two = domFixture();
  render(one, data); render(two, data);
  const ids = host => host.querySelectorAll("linearGradient").map(node => node.getAttribute("id"));
  const original = ids(one); assert.equal(original.length, 2);
  assert.equal(new Set([...original, ...ids(two)]).size, 4);
  render(one, data); assert.equal(new Set([...original, ...ids(one)]).size, 4);
  for (const svg of one.querySelectorAll(".purchase-flow-svg")) {
    const defined = new Set(svg.querySelectorAll("linearGradient").map(node => `url(#${node.getAttribute("id")})`));
    for (const link of links(svg)) if (link.getAttribute("stroke").startsWith("url(")) assert.ok(defined.has(link.getAttribute("stroke")));
  }
});

test("top-left expand control opens the existing graph modally and restores it with its detail state intact", () => {
  const host = domFixture(), original = source(); render(host, original);
  const panel = find(host, "[data-purchase-flow]"), button = find(host, '[data-purchase-flow-control="expand"]');
  const detail = find(host, "[data-purchase-flow-details]"); detail.open = true;
  const paths = links(host), amounts = paths.map(path => path.getAttribute("stroke-width"));
  assert.equal(panel.children[0].children[0], button);
  assert.equal(button.getAttribute("aria-label"), "Afficher le graphique en plein écran");
  button.focus(); button.dispatch("click");
  const dialog = find(host, "[data-purchase-flow-fullscreen]");
  assert.equal(dialog.open, true); assert.equal(host.ownerDocument.modalElement, dialog);
  assert.equal(panel.parentElement, dialog); assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(host.ownerDocument.activeElement, button);
  assert.deepEqual(links(host), paths); assert.deepEqual(links(host).map(path => path.getAttribute("stroke-width")), amounts);
  button.dispatch("click");
  assert.equal(dialog.open, false); assert.equal(dialog.parentElement, null); assert.equal(panel.parentElement, host);
  assert.equal(host.ownerDocument.modalElement, null); assert.equal(detail.open, true);
  assert.equal(button.getAttribute("aria-expanded"), "false"); assert.equal(host.ownerDocument.activeElement, button);
});

test("square hide/show control retains the graph and details while clearing emphasis and preserving collapsed rerenders", () => {
  const host = domFixture(); render(host, source());
  const panel = find(host, "[data-purchase-flow]"), body = find(host, "[data-purchase-flow-body]");
  let toggle = find(host, '[data-purchase-flow-control="visibility"]');
  assert.equal(panel.children[0].children[1], toggle);
  assert.equal(toggle.getAttribute("aria-controls"), body.id); assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.equal(toggle.getAttribute("aria-label"), "Masquer le diagramme");
  assert.equal(find(host, ".purchase-flow-heading").textContent, "Achats depuis le début du projet - Diagramme Sankey");
  const original = links(host), detail = find(host, "[data-purchase-flow-details]"); detail.open = true;
  original[0].focus(); toggle.dispatch("click");
  assert.equal(body.hidden, true); assert.equal(toggle.getAttribute("aria-expanded"), "false");
  assert.equal(toggle.getAttribute("aria-label"), "Afficher le diagramme");
  assert.equal(find(host, ".purchase-flow-tooltip").hidden, true); assert.equal(host.querySelectorAll(".is-active").length, 0);
  assert.equal(host.ownerDocument.activeElement, toggle); assert.deepEqual(links(host), original); assert.equal(detail.open, true);
  render(host, source()); toggle = find(host, '[data-purchase-flow-control="visibility"]');
  assert.equal(find(host, "[data-purchase-flow-body]").hidden, true); assert.equal(host.ownerDocument.activeElement, toggle);
  toggle.dispatch("click"); assert.equal(find(host, "[data-purchase-flow-body]").hidden, false);
  assert.equal(find(host, "[data-purchase-flow-details]").open, true);
});

test("hiding from fullscreen closes native modality and expanding a hidden graph restores its content", () => {
  const host = domFixture(); render(host, source());
  const expand = find(host, '[data-purchase-flow-control="expand"]'), toggle = find(host, '[data-purchase-flow-control="visibility"]');
  expand.dispatch("click"); const dialog = find(host, "[data-purchase-flow-fullscreen]");
  links(host)[0].focus(); toggle.dispatch("click");
  assert.equal(dialog.open, false); assert.equal(dialog.parentElement, null); assert.equal(host.ownerDocument.modalElement, null);
  assert.equal(find(host, "[data-purchase-flow]").parentElement, host); assert.equal(find(host, "[data-purchase-flow-body]").hidden, true);
  assert.equal(host.ownerDocument.activeElement, toggle); assert.equal(find(host, ".purchase-flow-tooltip").hidden, true);
  expand.dispatch("click"); assert.equal(find(host, "[data-purchase-flow-body]").hidden, false);
  assert.equal(find(host, "[data-purchase-flow-fullscreen]").open, true);
  cleanup(host); assert.equal(host.ownerDocument.modalElement, null);
});

test("expanded graph Escape and native cancellation close the modal while retaining ordinary ribbon Escape behavior", () => {
  const host = domFixture(); render(host, source()); const button = find(host, '[data-purchase-flow-control="expand"]');
  button.dispatch("click"); const ribbon = links(host)[0]; ribbon.focus();
  assert.equal(find(host, ".purchase-flow-tooltip").hidden, false);
  let prevented = false;
  find(host, "[data-purchase-flow-fullscreen]").dispatch("keydown", { key: "Escape", target: ribbon, preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(host.ownerDocument.modalElement, null);
  assert.equal(find(host, ".purchase-flow-tooltip").hidden, true); assert.equal(host.ownerDocument.activeElement, button);
  button.dispatch("click"); find(host, "[data-purchase-flow-fullscreen]").dispatch("cancel", { preventDefault() {} });
  assert.equal(host.ownerDocument.modalElement, null);
  ribbon.focus(); ribbon.dispatch("keydown", { key: "Escape" });
  assert.equal(find(host, ".purchase-flow-tooltip").hidden, true); assert.equal(host.ownerDocument.activeElement, ribbon);
});

test("expanded graph wraps keyboard focus and cleanup closes before rerender without stale modal callbacks", () => {
  const host = domFixture(); render(host, source()); let button = find(host, '[data-purchase-flow-control="expand"]');
  button.dispatch("click"); const dialog = find(host, "[data-purchase-flow-fullscreen]");
  const last = host.querySelectorAll("[data-purchase-flow-control]").at(-1);
  dialog.dispatch("keydown", { key: "Tab", shiftKey: true, preventDefault() {} }); assert.equal(host.ownerDocument.activeElement, last);
  dialog.dispatch("keydown", { key: "Tab", preventDefault() {} }); assert.equal(host.ownerDocument.activeElement, button);
  render(host, source()); assert.equal(dialog.open, false); assert.equal(dialog.parentElement, null); assert.equal(host.ownerDocument.modalElement, null);
  button = find(host, '[data-purchase-flow-control="expand"]'); button.dispatch("click");
  const current = find(host, "[data-purchase-flow-fullscreen]"); dialog.dispatch("close");
  assert.equal(host.ownerDocument.modalElement, current);
  cleanup(host); cleanup(host); assert.equal(host.ownerDocument.modalElement, null); assert.equal(current.open, false);
  assert.equal(find(host, "[data-purchase-flow]").parentElement, host); assert.equal(host.ownerDocument.listeners.size, 0);
});

test("expand and restore labels follow Dutch while original purchase data remains unchanged", () => {
  const host = domFixture(), data = source(), original = structuredClone(data); I18n.setLanguage("nl");
  try {
    render(host, data); const button = find(host, '[data-purchase-flow-control="expand"]');
    assert.equal(find(host, ".purchase-flow-heading").textContent, "Aankopen sinds de projectstart - Sankeydiagram");
    const toggle = find(host, '[data-purchase-flow-control="visibility"]');
    assert.equal(toggle.getAttribute("aria-label"), "Diagram verbergen"); toggle.dispatch("click");
    assert.equal(toggle.getAttribute("aria-label"), "Diagram weergeven");
    assert.equal(button.getAttribute("aria-label"), "Grafiek schermvullend weergeven"); button.dispatch("click");
    assert.equal(button.getAttribute("aria-label"), "Grafiek verkleinen");
    assert.deepEqual(data, original); cleanup(host);
  } finally { I18n.setLanguage("fr"); }
});

test("expanded geometry fits the limiting dimension and retains one physical scale for purchases and credits", () => {
  const shapes = [{ width: 1300, height: 1200 }, { width: 1300, height: 375 }];
  for (const [width, height] of [[1200, 400], [320, 700], [1800, 650], [2400, 1400]]) {
    const sizes = fitGeometry(shapes, width, height);
    assert.equal(sizes.length, 2);
    sizes.forEach((size, index) => {
      assert.ok(size.width <= width + 1e-8 && size.height <= height + 1e-8);
      assert.ok(Math.abs(size.width / size.height - shapes[index].width / shapes[index].height) < 1e-10);
    });
    assert.ok(Math.abs(sizes[0].width / shapes[0].width - sizes[1].height / shapes[1].height) < 1e-10);
    assert.ok(Math.abs(sizes[0].width - width) < 1e-8 || Math.abs(sizes[0].height - height) < 1e-8);
  }
  assert.deepEqual(fitGeometry(shapes, 0, 300), []);
});

test("expanded resize observers and fitted dimensions are released when restoring or cleaning up the graph", () => {
  const host = domFixture(), observers = [], resizeListeners = new Set();
  host.ownerDocument.defaultView = {
    addEventListener(name, callback) { if (name === "resize") resizeListeners.add(callback); },
    removeEventListener(name, callback) { if (name === "resize") resizeListeners.delete(callback); },
    ResizeObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } }
  };
  render(host, source()); const button = find(host, '[data-purchase-flow-control="expand"]'), svg = find(host, ".purchase-flow-svg");
  button.dispatch("click"); assert.match(svg.style.width, /px$/); assert.match(svg.style.height, /px$/);
  assert.equal(resizeListeners.size, 1);
  button.dispatch("click"); assert.equal(svg.style.width, ""); assert.equal(svg.style.height, "");
  assert.equal(resizeListeners.size, 0); assert.equal(observers[0].disconnected, true);
  button.dispatch("click"); cleanup(host); assert.equal(resizeListeners.size, 0); assert.equal(observers[1].disconnected, true);
});

test("identical right-hand names sum allocations while preserving category and code connections", () => {
  const name = "**NF/FK 10-2024: MLU", data = source([
    entry(1, 10.1, { description: name }), entry(2, 20.2, { description: name, categoryId: 11, category: "Communication" }),
    entry(3, 30.3, { description: name, codeCategoryId: 21, code: "6020", codeCategory: "6020 Logiciels" }),
    entry(4, 5, { description: "Another purchase" })
  ]), original = structuredClone(data), model = buildModel(data), originalModel = structuredClone(model);
  const shape = layout(model.groups[0].purchases), merged = shape.purchases.find(node => node.label === name);
  assert.equal(model.groups[0].items.length, 4); assert.equal(shape.purchases.length, 2);
  assert.equal(merged.consumed, 60.6); assert.deepEqual(merged.items.map(row => row.id).sort((a, b) => a - b), [1, 2, 3]);
  assert.equal(shape.categories.length, 2); assert.equal(shape.codes.length, 2);
  const incoming = shape.links.filter(link => link.kind === "purchase" && link.target === merged.key);
  assert.equal(incoming.length, 2);
  assert.deepEqual(incoming.map(link => link.items.map(row => row.id).sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]), [[1, 2], [3]]);
  assert.ok(Math.abs(incoming.reduce((total, link) => total + link.height, 0) - merged.height) < 1e-8);
  for (const code of shape.codes) {
    const before = shape.links.filter(link => link.kind === "allocation" && link.target === code.key).reduce((total, link) => total + link.height, 0);
    const after = shape.links.filter(link => link.kind === "purchase" && link.source === code.key).reduce((total, link) => total + link.height, 0);
    assert.ok(Math.abs(before - code.height) < 1e-8); assert.ok(Math.abs(after - code.height) < 1e-8);
  }
  assert.deepEqual(data, original); assert.deepEqual(model, originalModel);
});

test("right-hand grouping follows full display names and their document fallback rather than shortened prefixes", () => {
  const prefix = "A very long purchase name with an identical visible beginning ".repeat(3);
  const shape = layout(buildModel(source([
    entry(1, 10, { description: null, documentLabel: "NF/FK 10-2024: MLU" }),
    entry(2, 20, { description: "NF/FK 10-2024: MLU", documentLabel: "Another document" }),
    entry(3, 5, { description: "nf/fk 10-2024: MLU" }),
    entry(4, 7, { description: `${prefix}first` }), entry(5, 8, { description: `${prefix}second` }),
    entry(6, 1, { description: null, documentLabel: null }), entry(7, 2, { description: "", documentLabel: "" })
  ])).groups[0].purchases);
  assert.equal(shape.purchases.length, 5);
  assert.equal(shape.purchases.find(node => node.label === "NF/FK 10-2024: MLU").consumed, 30);
  assert.equal(shape.purchases.find(node => node.label === "nf/fk 10-2024: MLU").consumed, 5);
  assert.equal(shape.purchases.find(node => node.label === `${prefix}first`).consumed, 7);
  assert.equal(shape.purchases.find(node => node.label === `${prefix}second`).consumed, 8);
  assert.equal(shape.purchases.find(node => node.label === "").consumed, 3);
});

test("same-name groups keep currencies and correction diagrams separate and retain signed zero totals", () => {
  const description = "Shared purchase name", model = buildModel(source([
    entry(1, .1, { description }), entry(2, .2, { description }),
    entry(3, -5, { description, documentType: "in_refund" }), entry(4, 5, { description, documentType: "in_refund" }),
    entry(5, 4, { description, currencyId: 2, currency: "USD" }), entry(6, 6, { description, currencyId: 2, currency: "USD" }),
    entry(7, 3, { description, currencyId: null }), entry(8, 7, { description, currencyId: null })
  ]));
  const eur = model.groups.find(group => group.currencyId === 1), usd = model.groups.find(group => group.currencyId === 2);
  assert.equal(model.groups.length, 4);
  const positive = layout(eur.purchases), correction = layout(eur.corrections), dollar = layout(usd.purchases);
  assert.equal(positive.purchases.length, 1); assert.equal(positive.purchases[0].consumed, .3);
  assert.equal(correction.purchases.length, 1); assert.equal(correction.purchases[0].consumed, 0);
  assert.equal(correction.purchases[0].items.length, 2); assert.ok(correction.purchases[0].height > 0);
  assert.equal(dollar.purchases.length, 1); assert.equal(dollar.purchases[0].consumed, 10);
  assert.deepEqual(model.groups.filter(group => group.currencyId === null).map(group => layout(group.purchases).purchases[0].consumed), [3, 7]);
  assert.equal(eur.net, .3); assert.equal(eur.gross, .3); assert.equal(eur.correctionTotal, 0);
});

test("merged purchase nodes show summed totals, retain detail rows and use matching gradients from multiple codes", () => {
  const name = "**NF/FK 10-2024: MLU", host = domFixture(), codeColor = code => code === "6010" ? "#123456" : "#abcdef";
  const items = [entry(1, 20, { description: name }), entry(2, 30, { description: name }),
    entry(3, 40, { description: name, codeCategoryId: 21, code: "6020", codeCategory: "6020 Logiciels" }),
    entry(4, 5, { description: "Other expense" })];
  render(host, source(items), { codeColor });
  const rightNodes = () => host.querySelectorAll(".purchase-flow-node").filter(node => node.getAttribute("data-purchase-flow-control").includes(":node:990:"));
  const merged = rightNodes().find(node => node.getAttribute("aria-label") === `${name} · 90 EUR`);
  assert.equal(rightNodes().length, 2); assert.ok(merged);
  assert.equal(find(merged, ".purchase-flow-inline-amount").textContent, " · 90 EUR");
  assert.equal(host.querySelectorAll("[data-purchase-flow-entry]").length, 4);
  const fill = find(merged, "rect").getAttribute("fill"), svg = find(host, ".purchase-flow-svg");
  const incoming = links(host).filter(link => link.getAttribute("data-purchase-flow-link").startsWith("purchase:") && link.getAttribute("aria-label").includes(`→ ${name} :`));
  assert.equal(incoming.length, 2);
  for (const link of incoming) {
    const stroke = link.getAttribute("stroke"); assert.ok(stroke.startsWith("url(#"));
    const gradient = svg.querySelectorAll("linearGradient").find(node => node.getAttribute("id") === stroke.slice(5, -1));
    const stops = gradient.querySelectorAll("stop");
    assert.ok(["#123456", "#abcdef"].includes(stops[0].getAttribute("stop-color")));
    assert.equal(stops.at(-1).getAttribute("stop-color"), fill);
    link.focus(); assert.equal(find(host, ".purchase-flow-highlight").getAttribute("stroke"), stroke);
  }
  merged.focus(); const tooltip = find(host, ".purchase-flow-tooltip"), controlKey = merged.getAttribute("data-purchase-flow-control");
  assert.match(tooltip.textContent, /90 EUR/); assert.doesNotMatch(tooltip.textContent, /Fournisseur exemple|INV-|6010 Fournitures|6020 Logiciels/);
  render(host, source(items.slice(1).concat(entry(5, 10, { description: name, codeCategoryId: 21, code: "6020" })).reverse()), { codeColor });
  assert.equal(host.ownerDocument.activeElement.getAttribute("data-purchase-flow-control"), controlKey);
  const updated = rightNodes().find(node => node.getAttribute("aria-label") === `${name} · 80 EUR`);
  assert.ok(updated); assert.equal(find(updated, "rect").getAttribute("fill"), fill);
  assert.match(find(host, ".purchase-flow-tooltip").textContent, /80 EUR/);
  assert.equal(host.querySelectorAll("[data-purchase-flow-entry]").length, 4);
});

test("NF/FK initials merge across months using chronological year-month endpoints without changing source rows", () => {
  const data = source([
    entry(1, 10.1, { description: "NF/FK 02-2025: MLU" }),
    entry(2, 20.2, { description: "NF/FK 11-2024: MLU" }),
    entry(3, 30.3, { description: "NF/FK 01-2025: MLU" }),
    entry(4, 5, { description: "NF/FK 11-2024: MLU" })
  ]), original = structuredClone(data), model = buildModel(data), before = structuredClone(model);
  const shape = layout(model.groups[0].purchases), merged = shape.purchases[0];
  assert.equal(shape.purchases.length, 1);
  assert.equal(merged.label, "NF/FK 11-2024 --> 02-2025: MLU");
  assert.equal(merged.key, 'purchase:nf-fk:"MLU"');
  assert.equal(merged.consumed, 65.6);
  assert.deepEqual(merged.items.map(row => row.id).sort((a, b) => a - b), [1, 2, 3, 4]);
  assert.deepEqual(merged.items.map(row => row.description).sort(), data.items.map(row => row.description).sort());
  const reordered = layout(buildModel(source(data.items.toReversed())).groups[0].purchases).purchases[0];
  assert.equal(reordered.label, merged.label); assert.equal(reordered.key, merged.key);
  assert.equal(reordered.consumed, merged.consumed);
  assert.deepEqual(data, original); assert.deepEqual(model, before);
});

test("NF/FK grouping accepts existing asterisk wrappers and document fallback while retaining exact initials", () => {
  const shape = layout(buildModel(source([
    entry(1, 10, { description: "**NF/FK 10-2024: MLU" }),
    entry(2, 20, { description: "**NF/FK 12-2024 : MLU**" }),
    entry(3, 30, { description: null, documentLabel: "NF/FK 01-2025: MLU" }),
    entry(4, 7, { description: "Laptop", documentLabel: "NF/FK 02-2025: MLU" }),
    entry(5, 8, { description: "NF/FK 10-2024: M.L.U." }),
    entry(6, 9, { description: "NF/FK 12-2024: M.L.U." }),
    entry(7, 11, { description: "NF/FK 10-2024: M-LU" }),
    entry(8, 12, { description: "NF/FK 11-2024: M-LU" }),
    entry(9, 13, { description: "**NF/FK 10-2024: MLA" }),
    entry(10, 14, { description: "NF/FK 10-2024: MLA" })
  ])).groups[0].purchases);
  assert.equal(shape.purchases.length, 5);
  const totals = new Map(shape.purchases.map(node => [node.label, node.consumed]));
  assert.deepEqual(totals, new Map([
    ["NF/FK 10-2024 --> 01-2025: MLU", 60], ["Laptop", 7],
    ["NF/FK 10-2024 --> 12-2024: M.L.U.", 17],
    ["NF/FK 10-2024 --> 11-2024: M-LU", 23], ["**NF/FK 10-2024: MLA", 27]
  ]));
  assert.equal(new Set(shape.purchases.map(node => node.key)).size, 5);
});

test("malformed NF/FK dates, partial matches and changed case retain ordinary exact-name grouping", () => {
  const invalid = ["NF/FK 00-2024: MLU", "NF/FK 13-2024: MLU", "NF/FK 1-2024: MLU",
    "NF/FK 10-0000: MLU", "NF/FK 10-024: MLU", "NF/FK 10-20245: MLU",
    "NF/FK 10/2024: MLU", "nf/fk 10-2024: MLU", "NF/FK 10-2024: mlu",
    "NF/FK 10-2024: ", "Invoice NF/FK 10-2024: MLU", "NF/FK 10-2024: MLU extra",
    "NF/FK 10-2024: MLU 25 EUR", "NF/FK 10-2024 --> 12-2024: MLU",
    "***NF/FK 10-2024: MLU***", 'purchase:nf-fk:"MLU"'];
  const items = invalid.map((description, index) => entry(index + 10, 1, { description }));
  items.push(entry(1, 10, { description: "NF/FK 10-2024: MLU" }),
    entry(2, 20, { description: "NF/FK 12-2024: MLU" }),
    entry(99, 2, { description: invalid[0] }));
  const shape = layout(buildModel(source(items)).groups[0].purchases);
  assert.equal(shape.purchases.length, invalid.length + 1);
  assert.equal(shape.purchases.find(node => node.label === "NF/FK 10-2024 --> 12-2024: MLU").consumed, 30);
  for (const label of invalid) {
    const node = shape.purchases.find(node => node.key === `purchase:${JSON.stringify(label.trim())}`);
    assert.ok(node, `Ordinary name retained: ${label}`);
    assert.equal(node.consumed, label === invalid[0] ? 3 : 1);
    assert.ok(!node.key.startsWith("purchase:nf-fk:"));
    const incomingRows = shape.links.filter(link => link.kind === "purchase" && link.target === node.key)
      .flatMap(link => link.items.map(row => row.id)).sort((a, b) => a - b);
    assert.deepEqual(incomingRows, node.items.map(row => row.id).sort((a, b) => a - b), "Ordinary labels cannot collide with an internal NF/FK family link key");
  }
});

test("NF/FK month ranges remain isolated by currency and purchase or signed-correction diagram", () => {
  const model = buildModel(source([
    entry(1, .1, { description: "NF/FK 11-2024: MLU" }),
    entry(2, .2, { description: "NF/FK 02-2025: MLU" }),
    entry(3, -5, { description: "NF/FK 01-2024: MLU", documentType: "in_refund" }),
    entry(4, 5, { description: "NF/FK 12-2025: MLU", documentType: "in_refund" }),
    entry(5, 4, { description: "NF/FK 03-2024: MLU", currencyId: 2, currency: "USD" }),
    entry(6, 6, { description: "NF/FK 04-2024: MLU", currencyId: 2, currency: "USD" }),
    entry(7, 3, { description: "NF/FK 01-2024: MLU", currencyId: null }),
    entry(8, 7, { description: "NF/FK 12-2025: MLU", currencyId: null })
  ]));
  const eur = model.groups.find(group => group.currencyId === 1), usd = model.groups.find(group => group.currencyId === 2);
  const positive = layout(eur.purchases).purchases, correction = layout(eur.corrections).purchases, dollar = layout(usd.purchases).purchases;
  assert.equal(model.groups.length, 4);
  assert.equal(positive.length, 1); assert.equal(positive[0].label, "NF/FK 11-2024 --> 02-2025: MLU");
  assert.equal(positive[0].consumed, .3);
  assert.equal(correction.length, 1); assert.equal(correction[0].label, "NF/FK 01-2024 --> 12-2025: MLU");
  assert.equal(correction[0].consumed, 0); assert.ok(correction[0].height > 0);
  assert.equal(correction[0].items.length, 2);
  assert.equal(dollar.length, 1); assert.equal(dollar[0].label, "NF/FK 03-2024 --> 04-2024: MLU");
  assert.equal(dollar[0].consumed, 10);
  assert.deepEqual(model.groups.filter(group => group.currencyId === null)
    .map(group => layout(group.purchases).purchases[0].consumed), [3, 7]);
  assert.equal(eur.net, .3); assert.equal(eur.gross, .3); assert.equal(eur.correctionTotal, 0);
});

test("multi-month NF/FK nodes retain mixed-code gradients, row details, hover isolation and stable range-extension focus", () => {
  const host = domFixture(), codeColor = code => code === "6010" ? "#123456" : "#abcdef";
  const items = [entry(1, 20, { description: "**NF/FK 10-2024: MLU" }),
    entry(2, 30, { description: "NF/FK 11-2024: MLU", categoryId: 11, category: "Communication" }),
    entry(3, 40, { description: "NF/FK 02-2025: MLU", codeCategoryId: 21, code: "6020", codeCategory: "6020 Logiciels" }),
    entry(4, 5, { description: "Other expense" })];
  const data = source(items), before = structuredClone(data), label = "NF/FK 10-2024 --> 02-2025: MLU";
  try {
    const shape = layout(buildModel(data).groups[0].purchases), grouped = shape.purchases.find(node => node.label === label);
    assert.equal(shape.categories.length, 2); assert.equal(shape.codes.length, 2);
    const incomingShape = shape.links.filter(link => link.kind === "purchase" && link.target === grouped.key);
    assert.equal(incomingShape.length, 2);
    assert.deepEqual(incomingShape.map(link => link.items.map(row => row.id).sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]), [[1, 2], [3]]);
    assert.ok(Math.abs(incomingShape.reduce((total, link) => total + link.height, 0) - grouped.height) < 1e-8);
    render(host, data, { codeColor });
    const rightNodes = () => host.querySelectorAll(".purchase-flow-node").filter(node => node.getAttribute("data-purchase-flow-control").includes(":node:990:"));
    const merged = rightNodes().find(node => node.getAttribute("aria-label") === `${label} · 90 EUR`);
    assert.equal(rightNodes().length, 2); assert.ok(merged);
    assert.equal(find(merged, ".purchase-flow-expense-name").textContent, label);
    assert.equal(find(merged, ".purchase-flow-inline-amount").textContent, " · 90 EUR");
    const fill = find(merged, "rect").getAttribute("fill"), svg = find(host, ".purchase-flow-svg");
    const incoming = links(host).filter(link => link.getAttribute("data-purchase-flow-link").startsWith("purchase:")
      && link.getAttribute("aria-label").includes(`→ ${label} :`));
    assert.equal(incoming.length, 2);
    for (const link of incoming) {
      const stroke = link.getAttribute("stroke"), gradient = svg.querySelectorAll("linearGradient")
        .find(node => node.getAttribute("id") === stroke.slice(5, -1));
      assert.ok(gradient);
      const stops = gradient.querySelectorAll("stop");
      assert.ok(["#123456", "#abcdef"].includes(stops[0].getAttribute("stop-color")));
      assert.equal(stops.at(-1).getAttribute("stop-color"), fill);
      link.dispatch("pointerenter");
      assert.equal(host.querySelectorAll(".is-active").length, 1);
      assert.equal(find(host, ".purchase-flow-highlight").getAttribute("stroke"), stroke);
      assert.equal(find(host, ".purchase-flow-tooltip").hidden, false);
      link.dispatch("pointerleave");
      assert.equal(host.querySelectorAll(".is-active").length, 0);
      assert.equal(find(host, ".purchase-flow-tooltip").hidden, true);
    }
    for (const item of items) {
      const row = host.querySelectorAll("[data-purchase-flow-entry]").find(node => node.getAttribute("data-purchase-flow-entry") === String(item.id));
      assert.ok(row); assert.ok(row.textContent.includes(item.description));
    }
    merged.focus();
    const controlKey = merged.getAttribute("data-purchase-flow-control");
    assert.match(find(host, ".purchase-flow-tooltip").textContent, /90 EUR/);
    render(host, source(items.concat(entry(5, 10, { description: "NF/FK 03-2025: MLU", code: "6020", codeCategoryId: 21 })).toReversed()), { codeColor });
    assert.equal(host.ownerDocument.activeElement.getAttribute("data-purchase-flow-control"), controlKey);
    const extended = rightNodes().find(node => node.getAttribute("aria-label") === "NF/FK 10-2024 --> 03-2025: MLU · 100 EUR");
    assert.ok(extended); assert.equal(find(extended, "rect").getAttribute("fill"), fill);
    assert.equal(host.querySelectorAll("[data-purchase-flow-entry]").length, 5);
    assert.match(find(host, ".purchase-flow-tooltip").textContent, /100 EUR/);
    assert.deepEqual(data, before);
  } finally { cleanup(host); }
});

test("sparse Sankeys retain the current maximum purchase font and spacing", () => {
  for (const separateCategories of [false, true]) {
    const items = buildModel(source(Array.from({ length: 5 }, (_, index) => entry(index + 1, 10,
      separateCategories ? { categoryId: index + 10, category: `Rubrique ${index}` } : {})))).groups[0].purchases;
    const shape = layout(items);
    assert.deepEqual(shape.purchaseStyle, { fontSize: 10, lineHeight: 16, gap: 18 });
    assert.ok(shape.columnExtents.purchases <= shape.columnExtents.categories * 2);
    assertReadablePurchaseColumn(shape);
  }
});

test("crowded Sankeys tighten purchase spacing before reducing the font", () => {
  const items = buildModel(source(Array.from({ length: 30 }, (_, index) => entry(index + 1, 10)))).groups[0].purchases;
  const shape = layout(items);
  assert.equal(shape.purchaseStyle.fontSize, 10); assert.equal(shape.purchaseStyle.lineHeight, 16);
  assert.ok(shape.purchaseStyle.gap > 2 && shape.purchaseStyle.gap < 18);
  assert.ok(shape.columnExtents.purchases <= shape.columnExtents.categories * 2);
  assert.ok(shape.columnExtents.categories * 2 - shape.columnExtents.purchases < .001);
  assertReadablePurchaseColumn(shape);
});

test("purchase fonts shrink only as far as needed to fit twice the actual left column", () => {
  const items = buildModel(source(Array.from({ length: 40 }, (_, index) => entry(index + 1, 10)))).groups[0].purchases;
  const shape = layout(items), left = contentBounds(shape.categories, -18, 19);
  assert.ok(shape.purchaseStyle.fontSize > 8 && shape.purchaseStyle.fontSize < 10);
  assert.equal(shape.purchaseStyle.gap, 2);
  assert.ok(Math.abs(shape.columnExtents.categories - left.bottom + left.top) < 1e-7);
  assert.ok(shape.columnExtents.purchases <= (left.bottom - left.top) * 2);
  assert.ok((left.bottom - left.top) * 2 - shape.columnExtents.purchases < .001);
  assertReadablePurchaseColumn(shape);
});

test("minimum purchase typography permits taller content without hiding or overlapping rows", () => {
  const items = buildModel(source(Array.from({ length: 90 }, (_, index) => entry(index + 1, 10)))).groups[0].purchases;
  const shape = layout(items);
  assert.deepEqual(shape.purchaseStyle, { fontSize: 8, lineHeight: 12.8, gap: 2 });
  assert.ok(shape.columnExtents.purchases > shape.columnExtents.categories * 2);
  assert.equal(shape.purchases.length, 90); assert.equal(shape.links.filter(link => link.kind === "purchase").length, 90);
  assertReadablePurchaseColumn(shape);
});

test("column density includes category text and excludes canvas padding and code backplates", () => {
  const items = buildModel(source(Array.from({ length: 8 }, (_, index) => entry(index + 1, 1,
    { code: String(6010 + index), codeCategoryId: 20 + index })))).groups[0].purchases;
  const shape = layout(items, { scale: .01 });
  assert.equal(shape.columnExtents.categories, 37);
  assert.ok(shape.columnExtents.codes > shape.columnExtents.categories * 2);
  assert.ok(shape.height >= 375);
  assert.deepEqual(shape.purchaseStyle, { fontSize: 8, lineHeight: 12.8, gap: 2 });
  assert.ok(shape.columnExtents.purchases > 74 && shape.columnExtents.purchases < 240);
  const left = contentBounds(shape.categories, -18, 19), middle = contentBounds(shape.codes, -23, 24);
  assert.equal(left.bottom - left.top, 37);
  assert.ok(Math.abs(middle.bottom - middle.top - shape.columnExtents.codes) < 1e-7);
  assert.ok(left.top >= 70); assert.ok(middle.top >= 70);
  assert.ok(middle.bottom <= shape.height - 65 + 1e-7);
  assertReadablePurchaseColumn(shape);
});

test("rendered purchase and credit label frames match their separate bounded density styles", () => {
  const items = Array.from({ length: 40 }, (_, index) => entry(index + 1, 10));
  items.push(...Array.from({ length: 20 }, (_, index) => entry(index + 101, -2, { documentType: "in_refund" })));
  const data = source(items), original = structuredClone(data), group = buildModel(data).groups[0], host = domFixture();
  const scale = 320 / 440;
  try {
    render(host, data);
    const svgs = host.querySelectorAll(".purchase-flow-svg"); assert.equal(svgs.length, 2);
    for (const [index, rows] of [group.purchases, group.corrections].entries()) {
      const shape = layout(rows, { scale }), frames = svgs[index].querySelectorAll("foreignObject");
      assertReadablePurchaseColumn(shape); assert.equal(frames.length, rows.length);
      assert.ok(shape.purchaseStyle.fontSize < 10);
      for (const [purchaseIndex, frame] of frames.entries()) {
        const row = shape.purchases[purchaseIndex], inline = find(frame, ".purchase-flow-expense-label");
        assert.equal(Number(frame.getAttribute("height")), shape.purchaseStyle.lineHeight);
        assert.equal(Number(frame.getAttribute("y")), row.y + row.height / 2 - shape.purchaseStyle.lineHeight / 2);
        assert.equal(inline.style.fontSize, `${shape.purchaseStyle.fontSize}px`);
        assert.equal(inline.style.lineHeight, `${shape.purchaseStyle.lineHeight}px`);
        assert.ok(inline.textContent.includes(index ? "-2 EUR" : "10 EUR"));
      }
    }
    assert.ok(Number.parseFloat(find(svgs[0], ".purchase-flow-expense-label").style.fontSize) >
      Number.parseFloat(find(svgs[1], ".purchase-flow-expense-label").style.fontSize));
    assert.equal(host.querySelectorAll("[data-purchase-flow-entry]").length, items.length);
    const purchase = purchaseLink(host, "Achat 1"), correction = purchaseLink(host, "Achat 101");
    assert.ok(Math.abs(Number(purchase.getAttribute("stroke-width")) / Number(correction.getAttribute("stroke-width")) - 5) < 1e-10);
    correction.dispatch("pointerenter");
    assert.ok(host.querySelectorAll(".purchase-flow-tooltip").some(tooltip => !tooltip.hidden && tooltip.textContent.includes("-2 EUR")));
    assert.deepEqual(data, original);
  } finally { cleanup(host); }
});

test("dense purchase lists keep one right column in normal and expanded layout options", () => {
  for (const amounts of [Array(90).fill(10), Array.from({ length: 90 }, (_, index) => index ? .001 : 100000)]) {
    const data = source(amounts.map((amount, index) => entry(index + 1, amount,
      { codeCategoryId: index % 3 + 20, code: String(index % 3 + 6010) })));
    const original = structuredClone(data), items = buildModel(data).groups[0].purchases, before = structuredClone(items);
    const ordinary = layout(items), expanded = layout(items, { expanded: true });
    assert.deepEqual(expanded, ordinary); assert.equal(expanded.width, 1300); assert.ok(expanded.height > 1000 && expanded.height < 2000);
    assert.equal(expanded.purchases.length, 90); assert.equal(new Set(expanded.purchases.map(row => row.key)).size, 90);
    assert.ok(expanded.links.filter(link => link.kind === "purchase").every(link => link.x2 === 990));
    assertReadablePurchaseColumn(expanded);
    assert.deepEqual(items, before); assert.deepEqual(data, original);
  }
});

test("dense fullscreen Sankeys preserve one purchase column, SVG identities and all original geometry", () => {
  const items = Array.from({ length: 90 }, (_, index) => entry(index + 1, 10 + index % 7));
  items.push(entry(200, 7, { description: "Achat 61", code: "6020", codeCategoryId: 21 }));
  const data = source(items), original = structuredClone(data), host = domFixture();
  render(host, data, { codeColor: code => code === "6010" ? "#123456" : "#abcdef" });
  const svg = find(host, ".purchase-flow-svg"), button = find(host, '[data-purchase-flow-control="expand"]');
  const detail = find(host, "[data-purchase-flow-details]"); detail.open = true;
  const paths = links(host), nodes = host.querySelectorAll(".purchase-flow-node"), frames = host.querySelectorAll("foreignObject");
  const gradients = host.querySelectorAll("linearGradient"), originalViewBox = svg.getAttribute("viewBox");
  const attributes = (elements, names) => elements.map(element => names.map(name => element.getAttribute(name)));
  const pathGeometry = attributes(paths, ["d", "stroke", "stroke-width"]), gradientGeometry = attributes(gradients, ["id", "x1", "y1", "x2", "y2"]);
  const frameGeometry = attributes(frames, ["x", "y", "width", "height"]), nodeGeometry = attributes(nodes, ["data-purchase-flow-control", "aria-label"]);
  assert.match(originalViewBox, /^0 0 1300 /); assert.ok(Number(originalViewBox.split(" ")[3]) > 1000 && Number(originalViewBox.split(" ")[3]) < 2000);
  assert.equal(frames.length, 90);
  button.dispatch("click");
  assert.equal(svg.getAttribute("viewBox"), originalViewBox); assert.deepEqual(links(host), paths);
  assert.deepEqual(host.querySelectorAll(".purchase-flow-node"), nodes); assert.deepEqual(host.querySelectorAll("foreignObject"), frames);
  assert.deepEqual(host.querySelectorAll("linearGradient"), gradients);
  assert.deepEqual(attributes(paths, ["d", "stroke", "stroke-width"]), pathGeometry);
  assert.deepEqual(attributes(gradients, ["id", "x1", "y1", "x2", "y2"]), gradientGeometry);
  assert.deepEqual(attributes(frames, ["x", "y", "width", "height"]), frameGeometry);
  assert.deepEqual(attributes(nodes, ["data-purchase-flow-control", "aria-label"]), nodeGeometry);
  const purchaseNodes = nodes.filter(node => find(node, "foreignObject"));
  assert.equal(purchaseNodes.length, 90);
  for (const node of purchaseNodes) {
    assert.equal(find(node, "rect").getAttribute("x"), "990");
    assert.equal(find(node, "foreignObject").getAttribute("x"), "1009");
  }
  const merged = purchaseNodes.find(node => node.getAttribute("data-purchase-flow-control").endsWith('purchase:"Achat 61"'));
  assert.ok(merged); merged.focus();
  const exactAmount = `${I18n.formatNumber(21, { maximumFractionDigits: 2 })} EUR`;
  assert.ok(find(host, ".purchase-flow-tooltip").textContent.includes(exactAmount));
  const ribbon = purchaseLink(host, "Achat 61", "code-category:21:6020"); ribbon.dispatch("pointerenter");
  assert.equal(host.querySelectorAll(".is-active").length, 1);
  assert.equal(find(host, ".purchase-flow-highlight").getAttribute("d"), ribbon.getAttribute("d"));
  assert.ok(find(host, ".purchase-flow-tooltip").textContent.includes("7 EUR"));
  ribbon.dispatch("pointerleave"); assert.equal(host.querySelectorAll(".is-active").length, 0);
  assert.equal(host.querySelectorAll("[data-purchase-flow-entry]").length, items.length); assert.equal(detail.open, true);
  button.dispatch("click");
  assert.equal(svg.getAttribute("viewBox"), originalViewBox); assert.deepEqual(links(host), paths);
  assert.equal(svg.style.width, ""); assert.equal(svg.style.height, "");
  assert.equal(detail.open, true); assert.equal(host.ownerDocument.activeElement, button);
  assert.deepEqual(data, original); cleanup(host);
});

test("dense single-column diagrams retain common fit and FR/NL refresh, resize and native-close cleanup", () => {
  const items = Array.from({ length: 90 }, (_, index) => entry(index + 1, index + .25));
  items.push(entry(100, -5, { documentType: "in_refund" }), entry(101, -2, { documentType: "in_refund" }),
    entry(200, 3, { currencyId: 2, currency: "USD" }), entry(201, 7, { currencyId: 2, currency: "USD" }));
  const data = source(items), original = structuredClone(data);
  for (const language of ["fr", "nl"]) {
    I18n.setLanguage(language);
    const host = domFixture(), observers = [], listeners = new Set();
    host.ownerDocument.defaultView = {
      addEventListener(name, callback) { if (name === "resize") listeners.add(callback); },
      removeEventListener(name, callback) { if (name === "resize") listeners.delete(callback); },
      ResizeObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } }
    };
    try {
      render(host, data); const button = find(host, '[data-purchase-flow-control="expand"]'); button.dispatch("click");
      const dialog = find(host, "[data-purchase-flow-fullscreen]"), diagrams = host.querySelectorAll(".purchase-flow-svg"), paths = links(host);
      assert.equal(diagrams.length, 3);
      assert.ok(diagrams.every(svg => Number(svg.getAttribute("viewBox").split(" ")[2]) === 1300));
      const scales = diagrams.map(svg => Number.parseFloat(svg.style.width) / 1300);
      assert.ok(scales.every(scale => scale > 0 && Math.abs(scale - scales[0]) < 1e-10));
      assert.equal(host.querySelectorAll("[data-purchase-flow-entry]").length, items.length);
      const purchase = host.querySelectorAll(".purchase-flow-node").find(node => node.getAttribute("data-purchase-flow-control").endsWith('purchase:"Achat 61"'));
      const key = purchase.getAttribute("data-purchase-flow-control"); purchase.focus();
      const geometry = paths.map(path => path.getAttribute("d"));
      for (const callback of listeners) callback(); observers[0].callback();
      assert.deepEqual(links(host), paths); assert.deepEqual(paths.map(path => path.getAttribute("d")), geometry);
      assert.equal(host.ownerDocument.activeElement, purchase);
      find(host, "[data-purchase-flow-details]").open = true;
      render(host, source(items.toReversed()));
      assert.equal(dialog.open, false); assert.equal(dialog.parentElement, null); assert.equal(listeners.size, 0); assert.equal(observers[0].disconnected, true);
      const restored = host.ownerDocument.activeElement; assert.equal(restored.getAttribute("data-purchase-flow-control"), key);
      assert.equal(find(restored, "rect").getAttribute("x"), "990"); assert.equal(find(host, "[data-purchase-flow-details]").open, true);
      assert.equal(find(host, ".purchase-flow-tooltip").hidden, false);
      const freshButton = find(host, '[data-purchase-flow-control="expand"]'); freshButton.dispatch("click");
      const freshDialog = find(host, "[data-purchase-flow-fullscreen]"); freshDialog.dispatch("cancel", { preventDefault() {} });
      assert.equal(host.ownerDocument.activeElement, freshButton); assert.equal(host.ownerDocument.modalElement, null);
      assert.equal(listeners.size, 0); assert.equal(observers[1].disconnected, true);
      assert.equal(freshButton.getAttribute("aria-label"), language === "fr" ? "Afficher le graphique en plein écran" : "Grafiek schermvullend weergeven");
      assert.equal(find(host, ".purchase-flow-svg").style.width, ""); assert.deepEqual(data, original);
    } finally { cleanup(host); I18n.setLanguage("fr"); }
  }
});
