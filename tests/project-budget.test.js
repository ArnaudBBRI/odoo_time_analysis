const assert = require("node:assert/strict");
const test = require("node:test");
const { render, cleanup, numeric, chartGeometry, axisLabels, currencyKey, effectiveLifetime, effectiveConventionBudget, isBwPersonnelCategory, isBwPersonnelLine, effectiveAnnual, annualCodes, retainAnnualLine, codeColor, billDetailsForCode } = require("../project-budget");
const { domFixture } = require("./dom-fixture");

function line(id, categoryId, category, budgeted, consumed, accountCode = null) {
  return { id, categoryId, category, budgeted, consumed, committed: consumed, pending: 0, balance: budgeted - consumed,
    accountCode, currencyId: 1, currency: "EUR" };
}
function annual(id, year, budgeted = 1000, consumed = 250, committed = 400) {
  return { id, name: `Budget ${year}`, startDate: `${year}-01-01`, endDate: `${year}-12-31`,
    status: { code: "confirmed", label: "Ouvert" }, currencyId: 1, currency: "EUR", quality: "reconciled",
    totals: { budgeted, consumed, committed, pending: 0, balance: budgeted - consumed }, income: { budgeted: 800, consumed: 50 },
    parentTotal: -200, lines: [{ ...line(1, 4, "6124 Services", budgeted, consumed, "6124"), committed }, line(2, 5, "7000 Recettes", 800, 50, "7000")] };
}
function fixture() {
  const result = { ok: true, project: { id: 101, name: "Example", startDate: "2025-12-01", endDate: "2028-05-31" },
    asOf: "2026-10-09", macro: { conventionTotal: 12000, personnelEuros: 5000, personnelHours: 200,
      maxFunding: 10000, fundingType: "Example funding", fundingOrganism: "Example body", externalReference: "ABC",
      currencyId: 1, currency: "EUR" },
    conventions: [{ id: 10, name: "Convention source", startDate: "2025-12-01", endDate: "2028-05-31",
      currencyId: 1, currency: "EUR", budgetedTotal: 10000, billedTotal: 900, status: { code: "confirmed", label: "Ouvert" },
      lines: [line(11, 21, "Personnel", 8000, 0), line(12, 22, "Équipement", 2000, 900)] }],
    annual: [annual(27, 2027), annual(26, 2026)], lifetime: { status: "available", currencyId: 1, currency: "EUR",
      consumed: 2000, expenseCost: 900, personnelCost: 1100, byRubric: [{ categoryId: 22, category: "Équipement", consumed: 900 }],
      unmapped: [{ label: "Coût des heures · rubrique non renseignée", consumed: 1100 }], zeroValuedHoursCount: 0,
      outOfPeriod: { beforeStart: { count: 0, consumed: 0 }, afterEnd: { count: 0, consumed: 0 } } } };
  result.lifetime.expensesOnly = { ...structuredClone(result.lifetime), consumed: 900, expenseCost: 900, personnelCost: 0, unmapped: [] };
  return result;
}
function get(container, selector) { return container.querySelectorAll(selector)[0]; }

test("numeric preserves zero and signed amounts while rejecting missing and invalid measures", () => {
  assert.equal(numeric(0), 0); assert.equal(numeric("-12.25"), -12.25);
  for (const value of [null, undefined, "", "  ", false, {}, Infinity, "oops"]) assert.equal(numeric(value), null);
});

test("signed chart geometry uses one baseline, retains zero and does not mutate source", () => {
  const input = [100, -25, 0, null], original = [...input], geometry = chartGeometry(input);
  assert.equal(geometry.max, 100); assert.equal(geometry.min, -25); assert.equal(geometry.zero, 80);
  assert.deepEqual(geometry.bars.map(bar => [bar.top, bar.height]), [[0, 80], [80, 20], [80, 0], [80, null]]);
  assert.equal(geometry.bars[1].negative, true); assert.equal(geometry.bars[3].available, false);
  assert.equal(Object.is(chartGeometry([100, 0]).min, -0), false, "A positive-money axis must label its baseline as zero");
  assert.deepEqual(input, original);
  for (const values of [[0, 0, 0], [null, undefined], [-10], [], [0.0001, -0.00005]]) {
    const result = chartGeometry(values);
    assert.ok(Number.isFinite(result.zero));
    assert.ok(result.bars.every(bar => Number.isFinite(bar.top) && (bar.height === null || Number.isFinite(bar.height))));
  }
});

test("shared domains give comparable heights without converting or mixing unknown currencies", () => {
  assert.equal(chartGeometry([100], [100, 400]).bars[0].height, 25);
  assert.equal(currencyKey({ currencyId: 1, currency: "EUR" }), "currency:1");
  assert.notEqual(currencyKey({ id: 1, currency: "EUR" }), currencyKey({ id: 2, currency: "EUR" }));
  assert.notEqual(currencyKey({ currencyId: 1 }), currencyKey({ currencyId: 2 }));
});

test("BW personnel category classification matches exact source labels and authoritative Boolean markers", () => {
  for (const name of ["Personnel", " Frais  de personnel ", "6200 - Frais de personnel BW", "617000: BW personnel", "PERSONNEL BW", "6200·BW frais de personnel"]) {
    assert.equal(isBwPersonnelCategory(name), true, name);
    assert.equal(isBwPersonnelLine({ category: name }), true);
  }
  for (const name of ["6200 Equipment", "Personnel externe", "613990 Ormit Talent", "617000 Ormit", "Frais de personnel sous-traité", "BW personnel services"]) {
    assert.equal(isBwPersonnelCategory(name), false, name);
    assert.equal(isBwPersonnelLine({ category: name }), false);
  }
  for (const value of [null, undefined, false, " ", 6200]) assert.equal(isBwPersonnelCategory(value), null);
  assert.equal(isBwPersonnelLine({ category: "Personnel", isBwPersonnel: false }), false, "Source false wins over optional legacy-label interpretation");
  assert.equal(isBwPersonnelLine({ category: "Services", isBwPersonnel: true }), true);
  assert.equal(isBwPersonnelLine({ category: "Personnel", isBwPersonnel: null }), true);
});

test("French BW personnel checkbox defaults off and restores full convention budget and costs while retaining focus", () => {
  const container = domFixture(), data = fixture(), original = structuredClone(data);
  data.annual[0].lines.push({ ...line(99, 99, "6200 Personnel", 500, 200, "6200"), isBwPersonnel: true });
  const options = { onShowBwPersonnelCostsChange(checked) { options.showBwPersonnelCosts = checked; render(container, data, options); } };
  render(container, data, options);
  const checkbox = get(container, "[data-budget-show-bw-personnel-costs]");
  assert.equal(checkbox.checked, false); assert.equal(checkbox.parentElement.textContent, "Afficher les coûts de personnel BW");
  assert.equal(get(container, '[data-budget-horizontal="total:budgeted"]').getAttribute("data-budget-value"), "2000");
  assert.equal(get(container, '[data-budget-horizontal="total:consumed"]').getAttribute("data-budget-value"), "900");
  assert.match(get(container, "[data-budget-ratio]").textContent, /45/);
  assert.match(get(container, ".project-budget-total-grid").textContent, /Solde calculé1[\s\u202f]?100 EUR/);
  assert.match(get(container, ".project-budget-macro-grid").textContent, /12[\s\u202f]?000 EUR.*5[\s\u202f]?000 EUR/);
  assert.equal(container.querySelectorAll('[data-budget-rubric="21"]').length, 0);
  assert.doesNotMatch(container.textContent, /Coût des heures · rubrique non renseignée/);
  const annualBefore = container.querySelectorAll("[data-budget-annual]").map(card => card.querySelectorAll("[data-budget-bar]").map(bar => bar.getAttribute("data-budget-value")));
  checkbox.focus(); checkbox.checked = true; checkbox.dispatch("change");
  assert.equal(options.showBwPersonnelCosts, true);
  assert.equal(container.ownerDocument.activeElement, get(container, "[data-budget-show-bw-personnel-costs]"));
  assert.equal(get(container, '[data-budget-horizontal="total:budgeted"]').getAttribute("data-budget-value"), "10000");
  assert.equal(get(container, '[data-budget-horizontal="total:consumed"]').getAttribute("data-budget-value"), "2000");
  assert.match(get(container, "[data-budget-ratio]").textContent, /20/);
  assert.ok(get(container, '[data-budget-rubric="21"]'));
  assert.match(container.textContent, /Coût des heures · rubrique non renseignée/);
  assert.deepEqual(container.querySelectorAll("[data-budget-annual]").map(card => card.querySelectorAll("[data-budget-bar]").map(bar => bar.getAttribute("data-budget-value"))), annualBefore);
  assert.equal(container.querySelectorAll('[data-budget-code="6200"]').length, 0);
  assert.match(container.textContent, /coûts BW de personnel ne sont jamais inclus/i);
  const checked = get(container, "[data-budget-show-bw-personnel-costs]"); checked.checked = false; checked.dispatch("change");
  assert.equal(get(container, '[data-budget-horizontal="total:budgeted"]').getAttribute("data-budget-value"), "2000");
  assert.equal(get(container, '[data-budget-horizontal="total:consumed"]').getAttribute("data-budget-value"), "900");
  assert.match(get(container, "[data-budget-ratio]").textContent, /45/);
  assert.deepEqual(data.lifetime, original.lifetime); assert.deepEqual(data.conventions, original.conventions);
});

test("filtered convention reference uses selected line allocations and canonical categories, preserving supplier budgets", () => {
  const budget = fixture().conventions[0];
  budget.lines[0].isBwPersonnel = true;
  budget.lines.push({ ...line(13, 23, "613990 Ormit Talent", 350, 0), isBwPersonnel: false },
    { ...line(14, 24, "Frais de personnel sous-traité", 650, 0), isBwPersonnel: false });
  budget.budgetedTotal = 11000; budget.quality = "not-reconciled"; budget.parentTotal = 12000;
  const before = structuredClone(budget);
  assert.equal(effectiveConventionBudget(budget).budgetedTotal, 3000);
  assert.equal(effectiveConventionBudget(budget, true).budgetedTotal, 11000);
  budget.lines[0].isBwPersonnel = false;
  assert.equal(effectiveConventionBudget(budget).budgetedTotal, 11000, "The source Boolean wins over a display label");
  budget.lines[0].isBwPersonnel = true;
  assert.deepEqual(budget, before, "Filtering does not alter source lines or parent reconciliation");
});

test("filtered convention reference fails closed for incomplete identity, allocations, classifications and currencies", () => {
  const invalid = [
    budget => { budget.budgetedTotal = null; },
    budget => { delete budget.lines; },
    budget => { budget.lines = []; },
    budget => { budget.lines[0].id = null; },
    budget => { budget.lines.push({ ...budget.lines[0] }); },
    budget => { budget.lines[0].isBwPersonnel = null; },
    budget => { budget.lines[0].category = null; },
    budget => { budget.lines[0].budgeted = null; },
    budget => { budget.lines[1].budgeted = Infinity; },
    budget => { budget.lines[0].currencyId = null; },
    budget => { budget.lines[0].currencyId = 2; },
    budget => { budget.currencyId = null; },
    budget => { budget.budgetedTotal += 100; }
  ];
  for (const invalidate of invalid) {
    const budget = fixture().conventions[0]; invalidate(budget);
    const result = effectiveConventionBudget(budget);
    assert.equal(result.budgetedTotal, null, invalidate.toString());
    assert.match(result.warnings.join(" "), /hors personnel BW indisponible/);
  }
  assert.deepEqual(effectiveConventionBudget(null), { budgetedTotal: null, warnings: [] });
});

test("filtered convention reference preserves signed allocations, zero and rounded source sums", () => {
  const budget = fixture().conventions[0];
  budget.lines = [line(1, 21, "Frais de personnel", 100, 0), line(2, 22, "Services", -20, 0)];
  budget.budgetedTotal = 80;
  assert.equal(effectiveConventionBudget(budget).budgetedTotal, -20);
  budget.lines = [line(1, 21, "Frais de personnel", 100, 0)]; budget.budgetedTotal = 100;
  assert.equal(effectiveConventionBudget(budget).budgetedTotal, 0);
  budget.lines = []; budget.budgetedTotal = 0;
  assert.equal(effectiveConventionBudget(budget).budgetedTotal, 0);
  budget.lines = [line(1, 21, "Personnel", 0.1, 0), line(2, 22, "Services", 0.2, 0)]; budget.budgetedTotal = 0.3;
  assert.equal(effectiveConventionBudget(budget).budgetedTotal, 0.2);
  budget.lines[0].budgeted = -0.1; budget.budgetedTotal = 0.1;
  assert.equal(effectiveConventionBudget(budget).budgetedTotal, 0.2);
  budget.lines = [line(1, 21, "Personnel", 0.008, 0), line(2, 22, "Services", 0.006, 0)]; budget.budgetedTotal = 0.01;
  const before = structuredClone(budget);
  assert.equal(effectiveConventionBudget(budget).budgetedTotal, 0.01, "Round the retained source allocations once, not the already-rounded total minus personnel");
  assert.equal(effectiveConventionBudget(budget, true).budgetedTotal, 0.01);
  assert.deepEqual(budget, before);
});

test("unverified personnel allocation never displays a full-budget comparison as a filtered reference", () => {
  const container = domFixture(), data = fixture(); data.conventions[0].lines[0].isBwPersonnel = null;
  render(container, data);
  assert.equal(container.querySelectorAll('[data-budget-horizontal="total:budgeted"]').length, 0);
  assert.equal(container.querySelectorAll("[data-budget-ratio]").length, 0);
  assert.match(container.textContent, /Budget conventionnel hors personnel BW indisponible/);
  assert.match(get(container, ".project-budget-total-grid").textContent, /Budget conventionnelIndisponible/);
  render(container, data, { showBwPersonnelCosts: true });
  assert.equal(get(container, '[data-budget-horizontal="total:budgeted"]').getAttribute("data-budget-value"), "10000");
  assert.equal(get(container, '[data-budget-horizontal="total:consumed"]').getAttribute("data-budget-value"), "2000");
});

test("macro fallback excludes its own known personnel amount and otherwise stays unavailable", () => {
  const macro = fixture().macro, benchmark = { ...macro, budgetedTotal: macro.conventionTotal };
  assert.equal(effectiveConventionBudget(benchmark, false, true).budgetedTotal, 7000);
  assert.equal(effectiveConventionBudget(benchmark, true, true).budgetedTotal, 12000);
  for (const values of [{ personnelEuros: null }, { personnelEuros: Infinity }, { budgetedTotal: null }, { currencyId: null }]) {
    assert.equal(effectiveConventionBudget({ ...benchmark, ...values }, false, true).budgetedTotal, null);
  }
  assert.equal(effectiveConventionBudget({ ...benchmark, personnelEuros: 0 }, false, true).budgetedTotal, 12000);
  assert.equal(effectiveConventionBudget({ ...benchmark, personnelEuros: -100 }, false, true).budgetedTotal, 12100);
});

test("expense-only source preserves actual supplier expenses sharing a hidden Personnel rubric ID", () => {
  const container = domFixture(), data = fixture();
  Object.assign(data.lifetime, { consumed: 550, expenseCost: 250, personnelCost: 300,
    byRubric: [{ categoryId: 21, category: "Personnel", consumed: 500 }, { categoryId: 22, category: "Équipement", consumed: 50 }], unmapped: [] });
  Object.assign(data.lifetime.expensesOnly, { consumed: 250, expenseCost: 250, personnelCost: 0,
    byRubric: [{ categoryId: 21, category: "Personnel", consumed: 200 }, { categoryId: 22, category: "Équipement", consumed: 50 }], unmapped: [] });
  render(container, data);
  assert.equal(get(container, '[data-budget-horizontal="total:consumed"]').getAttribute("data-budget-value"), "250");
  assert.equal(container.querySelectorAll('[data-budget-rubric="21"]').length, 0);
  assert.equal(get(container, '[data-budget-horizontal="rubric:22:consumed"]').getAttribute("data-budget-value"), "50");
  const details = get(container, '[data-budget-details-panel="convention:10"]');
  assert.match(details.textContent, /Dépenses · Personnel · rubrique personnel masquée.*200 EUR/);
  assert.doesNotMatch(details.textContent, /8[\s\u00a0\u202f]?000 EUR/);
  render(container, data, { showBwPersonnelCosts: true });
  assert.equal(get(container, '[data-budget-horizontal="rubric:21:consumed"]').getAttribute("data-budget-value"), "500");
  assert.equal(get(container, '[data-budget-horizontal="total:consumed"]').getAttribute("data-budget-value"), "550");
});

test("unmapped supplier and out-of-period expense amounts come from the selected projection", () => {
  const container = domFixture(), data = fixture();
  data.lifetime.unmapped = [{ label: "Coût des heures · rubrique non renseignée", consumed: 1100 }, { label: "Dépenses Ormit Talent", consumed: 100 }];
  data.lifetime.outOfPeriod.beforeStart = { count: 3, consumed: 800 };
  data.lifetime.expensesOnly.unmapped = [{ label: "Dépenses Ormit Talent", consumed: 100 }];
  data.lifetime.expensesOnly.outOfPeriod.beforeStart = { count: 1, consumed: 100 };
  render(container, data, { excludeOrmitterCosts: true });
  assert.match(get(container, ".project-budget-unmapped").textContent, /Dépenses Ormit Talent.*100 EUR/);
  assert.doesNotMatch(get(container, ".project-budget-unmapped").textContent, /Coût des heures/);
  assert.match(container.textContent, /1 avant le début.*100 EUR/);
  render(container, data, { showBwPersonnelCosts: true, excludeOrmitterCosts: true });
  assert.match(container.textContent, /3 avant le début.*800 EUR/);
  assert.match(get(container, ".project-budget-unmapped").textContent, /Coût des heures.*1[\s\u00a0\u202f]?100 EUR/);
});

test("missing expense projection fails closed instead of subtracting full lifetime personnel or inventing zero", () => {
  const container = domFixture(), data = fixture(); delete data.lifetime.expensesOnly;
  assert.equal(effectiveLifetime(data.lifetime).status, "unavailable");
  assert.equal(effectiveLifetime(data.lifetime).consumed, null);
  assert.equal(effectiveLifetime(data.lifetime, true), data.lifetime);
  render(container, data);
  assert.equal(container.querySelectorAll('[data-budget-horizontal="total:consumed"]').length, 0);
  assert.equal(container.querySelectorAll("[data-budget-ratio]").length, 0);
  assert.equal(container.querySelectorAll('[data-budget-horizontal="rubric:22:consumed"]').length, 0);
  assert.match(container.textContent, /consommation hors personnel BW est indisponible/i);
  render(container, data, { showBwPersonnelCosts: true });
  assert.equal(get(container, '[data-budget-horizontal="total:consumed"]').getAttribute("data-budget-value"), "2000");
});

test("independent expense currency and partiality govern their own ratio without inheriting full-source uncertainty", () => {
  const container = domFixture(), data = fixture();
  Object.assign(data.lifetime, { currencyId: null, currency: null, consumed: null, status: "partial" });
  render(container, data);
  assert.equal(get(container, '[data-budget-horizontal="total:consumed"]').getAttribute("data-budget-value"), "900");
  assert.ok(get(container, "[data-budget-ratio]"));
  render(container, data, { showBwPersonnelCosts: true });
  assert.equal(container.querySelectorAll("[data-budget-ratio]").length, 0);
  Object.assign(data.lifetime.expensesOnly, { currencyId: 2, currency: "USD" }); render(container, data);
  assert.equal(container.querySelectorAll("[data-budget-ratio]").length, 0);
  assert.match(container.textContent, /devises.*ne sont pas confirmées identiques/);
  Object.assign(data.lifetime.expensesOnly, { currencyId: 1, currency: "EUR", status: "partial", consumed: 50 }); render(container, data);
  assert.match(container.textContent, /Consommation connue · partielle/);
  assert.equal(get(container, '[data-budget-horizontal="total:consumed"]').getAttribute("data-budget-value"), "50");
  assert.equal(container.querySelectorAll('[data-budget-horizontal="rubric:21:consumed"]').length, 0);
});

test("annual totals and code companions sum retained expenses after Ormit replacements in every checkbox combination", () => {
  const container = domFixture(), data = fixture(), budget = annual(26, 2026, 1300, 330, 480);
  budget.lines = [{ ...line(1, 41, "6200 Personnel BW", 1000, 250, "6200"), committed: 400, isBwPersonnel: true },
    { ...line(2, 42, "6139 Ormit Talent", 200, 60, "6139"), committed: 60, isBwPersonnel: false },
    { ...line(3, 43, "6124 Services", 100, 20, "6124"), committed: 20, isBwPersonnel: false }];
  budget.ormitterExclusion = { consumed: null, committed: null,
    lines: [{ id: 1, consumed: null, committed: null }, { id: 2, consumed: 0, committed: 0 }, { id: 3, consumed: 20, committed: 20 }] };
  data.annual = [budget]; const original = structuredClone(data);
  for (const showBwPersonnelCosts of [false, true]) for (const excludeOrmitterCosts of [false, true]) {
    render(container, data, { showBwPersonnelCosts, excludeOrmitterCosts });
    const card = get(container, "[data-budget-annual]");
    assert.deepEqual(card.querySelectorAll("[data-budget-bar]").map(bar => bar.getAttribute("data-budget-value")), excludeOrmitterCosts ? ["300", "20", "20"] : ["300", "80", "80"]);
    assert.equal(card.querySelectorAll('[data-budget-code="6200"]').length, 0);
    assert.doesNotMatch(get(card, '[data-budget-details-panel="annual:26"]').textContent, /Personnel BW/);
    for (const kind of ["budgeted", "consumed", "committed"]) {
      const companions = card.querySelectorAll("[data-budget-code-measure]").filter(bar => bar.getAttribute("data-budget-code-measure") === kind);
      assert.equal(companions.reduce((sum, bar) => sum + Number(bar.getAttribute("data-budget-value")), 0),
        Number(card.querySelectorAll("[data-budget-bar]").find(bar => bar.getAttribute("data-budget-bar") === kind).getAttribute("data-budget-value")));
    }
  }
  assert.deepEqual(data, original);
});

test("annual personnel-only known sources become known zero while unknown currency, source totals and retained values stay unavailable", () => {
  const budget = annual(26, 2026, 100, 25, 25);
  budget.lines = [{ ...line(1, 4, "6200 Personnel", 100, 25, "6200"), isBwPersonnel: true }];
  assert.deepEqual(effectiveAnnual(budget).totals, { budgeted: 0, consumed: 0, committed: 0, pending: 0, balance: 0 });
  assert.deepEqual(annualCodes(budget), []);
  budget.lines.push(line(2, 5, "6124 Services", 50, 10, "6124"));
  assert.equal(effectiveAnnual(budget).totals.consumed, 10);
  budget.lines[1].currencyId = null; assert.equal(effectiveAnnual(budget).totals.consumed, null);
  budget.lines[1].currencyId = 2; assert.equal(effectiveAnnual(budget).totals.budgeted, null);
  budget.lines[1].currencyId = 1; budget.totals.consumed = null;
  assert.equal(effectiveAnnual(budget).totals.consumed, null, "Unavailable source totals cannot become verified filtered totals");
  budget.totals.consumed = 35; budget.lines[1].committed = null;
  assert.equal(effectiveAnnual(budget).totals.committed, null);
  assert.equal(effectiveAnnual(budget).totals.consumed, 10);
  budget.currencyId = null; assert.equal(effectiveAnnual(budget).totals.consumed, null);
});

test("annual label fallback retains external personnel, Ormit and unknown categories without classifying numeric codes alone", () => {
  const budget = annual(26, 2026, 400, 40, 40);
  budget.lines = [line(1, 1, "6200 Personnel externe", 100, 10, "6200"),
    line(2, 2, "617000 Ormit Talent", 100, 10, "6170"), line(3, 3, "Rubrique non renseignée", 100, 10, "6200"),
    { ...line(4, 4, "6200 Personnel", 100, 10, "6200"), isBwPersonnel: false }];
  assert.equal(effectiveAnnual(budget).lines.length, 4);
  assert.equal(effectiveAnnual(budget).totals.consumed, 40);
  assert.equal(annualCodes(budget).length, 4);
});

test("convention compares recorded lifetime cost to the selected source without double counting billed totals", () => {
  const container = domFixture(), data = fixture(); render(container, data, { showBwPersonnelCosts: true });
  assert.equal(get(container, "[data-project-budget]").getAttribute("data-project-budget"), "101");
  assert.equal(get(container, '[data-budget-horizontal="total:budgeted"]').getAttribute("data-budget-value"), "10000");
  assert.equal(get(container, '[data-budget-horizontal="total:consumed"]').getAttribute("data-budget-value"), "2000");
  assert.match(get(container, "[data-budget-ratio]").textContent, /20/);
  assert.match(container.textContent, /12[\s\u00a0\u202f]?000 EUR/);
  assert.match(container.textContent, /1[\s\u00a0\u202f]?100 EUR/);
  assert.match(container.textContent, /Coût des heures · rubrique non renseignée/);
  render(container, data, { selectedConventionId: 999 });
  assert.equal(get(container, '[data-budget-horizontal="total:budgeted"]').getAttribute("data-budget-value"), "2000",
    "A removed convention preference must not prevent selecting the sole current source");
});

test("convention rubric consumption matches exact IDs, keeps unassigned time separate and known zeros", () => {
  const container = domFixture(), data = fixture(); render(container, data, { showBwPersonnelCosts: true });
  assert.equal(get(container, '[data-budget-horizontal="rubric:21:consumed"]').getAttribute("data-budget-value"), "0");
  assert.equal(get(container, '[data-budget-horizontal="rubric:22:consumed"]').getAttribute("data-budget-value"), "900");
  data.lifetime.byRubric[0].categoryId = 99; data.lifetime.byRubric[0].category = "Personnel";
  render(container, data, { showBwPersonnelCosts: true });
  assert.equal(get(container, '[data-budget-horizontal="rubric:21:consumed"]').getAttribute("data-budget-value"), "0");
  assert.match(container.textContent, /Personnel · hors lignes de la convention sélectionnée/);
});

test("same-category convention lines sum only matching exact currencies", () => {
  const container = domFixture(), data = fixture();
  data.conventions[0].lines.push(line(13, 22, "Équipement", 500, 50));
  render(container, data);
  assert.equal(get(container, '[data-budget-horizontal="rubric:22:budgeted"]').getAttribute("data-budget-value"), "2500");
  data.conventions[0].lines[2].currencyId = 2; data.conventions[0].lines[2].currency = "USD";
  render(container, data);
  assert.deepEqual(container.querySelectorAll('[data-budget-horizontal="rubric:22:budgeted"]').map(fill => fill.getAttribute("data-budget-value")), ["2000", "500"]);
  assert.equal(container.querySelectorAll('[data-budget-horizontal="rubric:22:consumed"]').length, 1);
});

test("multiple conventions require an explicit selection and preserve native-radio focus", () => {
  const container = domFixture(), data = fixture(); data.conventions.push({ ...data.conventions[0], id: 20, name: "Revision", budgetedTotal: 99999,
    lines: [line(31, 21, "Personnel", 8000, 0), line(32, 22, "Équipement", 91999, 900)] });
  const options = { onConventionChange(id) { options.selectedConventionId = id; render(container, data, options); } };
  render(container, data, options);
  assert.equal(container.querySelectorAll('[data-budget-horizontal="total:budgeted"]').length, 0);
  let choices = container.querySelectorAll("[data-budget-convention-choice]");
  assert.deepEqual(choices.map(input => input.checked), [false, false]);
  choices[1].focus(); choices[1].checked = true; choices[1].dispatch("change");
  assert.equal(options.selectedConventionId, 20);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-budget-convention-choice"), "20");
  assert.equal(get(container, '[data-budget-horizontal="total:budgeted"]').getAttribute("data-budget-value"), "91999");
});

test("annual budgets retain future years and distinct repeated-year versions, sorted chronologically", () => {
  const container = domFixture(), data = fixture();
  data.annual.push({ ...annual(28, 2027), name: "Revision 2027", status: { code: "under_validation", label: "En validation" } });
  render(container, data);
  assert.deepEqual(container.querySelectorAll("[data-budget-annual]").map(card => card.getAttribute("data-budget-annual")), ["26", "27", "28"]);
  assert.deepEqual(container.querySelectorAll("[data-budget-year]").map(card => card.getAttribute("data-budget-year")), ["2026", "2027", "2027"]);
  assert.ok(container.querySelectorAll('[data-budget-status="under_validation"]').length);
  assert.match(container.textContent, /Revision 2027/);
});

test("annual three adjacent bars preserve overlaps and exact amounts rather than summing them", () => {
  const container = domFixture(), data = fixture(); data.annual = [annual(26, 2026, 1000, 250, 250)]; render(container, data);
  const bars = get(container, "[data-budget-annual]").querySelectorAll("[data-budget-bar]");
  assert.deepEqual(bars.map(bar => bar.getAttribute("data-budget-bar")), ["budgeted", "consumed", "committed"]);
  assert.deepEqual(bars.map(bar => bar.getAttribute("data-budget-value")), ["1000", "250", "250"]);
  assert.match(container.textContent, /se chevauchent.*ne s’additionnent pas/);
  assert.match(container.textContent, /la consommation annuelle ci-dessous est facturée/i);
  const table = get(container, '[data-budget-details-panel="annual:26"]').querySelectorAll("table")[0];
  assert.match(table.textContent, /6124 Services/); assert.doesNotMatch(table.textContent, /7000 Recettes/);
  assert.match(get(container, "[data-budget-annual]").textContent, /Recettes séparées.*800 EUR/);
  assert.match(get(container, "[data-budget-annual]").textContent, /Total net Odoo.*[-−]200 EUR/);
});

test("annual charts share exact currency axes while isolating different and unknown currencies", () => {
  const container = domFixture(), data = fixture();
  data.annual = [annual(26, 2026, 100, 50, 75), annual(27, 2027, 400, 200, 300),
    { ...annual(28, 2028, 900, 450, 500), currencyId: 2, currency: "USD" },
    { ...annual(29, 2029), currencyId: null, currency: null }, { ...annual(30, 2030), currencyId: null, currency: null }];
  render(container, data);
  const groups = container.querySelectorAll("[data-budget-currency-group]"); assert.equal(groups.length, 4);
  assert.deepEqual(groups.map(group => group.querySelectorAll("[data-budget-annual]").length), [2, 1, 1, 1]);
  const first = groups[0].querySelectorAll("[data-budget-annual]")[0];
  assert.equal(get(first, "[data-budget-height]").getAttribute("data-budget-height"), "25");
  assert.match(groups[2].textContent, /Devise inconnue.*devise à confirmer/);
});

test("annual signed corrections, accessible zero and missing values have distinct geometry and labels", () => {
  const container = domFixture(), data = fixture(); data.annual = [annual(26, 2026, 0, -50, null)]; render(container, data);
  const card = get(container, "[data-budget-annual]"), bars = card.querySelectorAll("[data-budget-bar]");
  assert.deepEqual(bars.map(bar => bar.getAttribute("data-budget-value")), ["0", "-50", "unavailable"]);
  assert.equal(get(bars[0], "[data-budget-height]").getAttribute("data-budget-height"), "0");
  assert.ok(bars[1].querySelectorAll(".is-negative").length); assert.match(card.textContent, /Indisponible/);
  assert.ok(!card.textContent.includes("NaN"));
});

test("partial or unavailable lifetime sources avoid fake known zero and label the subtotal", () => {
  const container = domFixture(), data = fixture(); data.lifetime.status = "partial"; data.lifetime.warnings = ["Source incomplète"];
  render(container, data, { showBwPersonnelCosts: true });
  assert.equal(container.querySelectorAll('[data-budget-horizontal="rubric:21:consumed"]').length, 0);
  assert.match(container.textContent, /Consommation connue · partielle/);
  assert.match(container.textContent, /Source incomplète/);
  data.lifetime.status = "unavailable"; data.lifetime.consumed = null; render(container, data, { showBwPersonnelCosts: true });
  assert.equal(container.querySelectorAll('[data-budget-horizontal="total:consumed"]').length, 0);
  assert.equal(container.querySelectorAll("[data-budget-ratio]").length, 0);
});

test("different or unknown convention currency cannot imply a ratio or calculated balance", () => {
  const container = domFixture(), data = fixture(); data.lifetime.currencyId = 2; data.lifetime.currency = "USD";
  render(container, data, { showBwPersonnelCosts: true }); assert.equal(container.querySelectorAll("[data-budget-ratio]").length, 0);
  assert.match(container.textContent, /devises.*ne sont pas confirmées identiques/);
  data.lifetime.currencyId = null; data.conventions[0].currencyId = null; render(container, data, { showBwPersonnelCosts: true });
  assert.equal(container.querySelectorAll("[data-budget-ratio]").length, 0);
});

test("macro-only fallback is explicit and never invents a budget when missing", () => {
  const container = domFixture(), data = fixture(); data.conventions = []; render(container, data);
  assert.equal(get(container, '[data-budget-horizontal="total:budgeted"]').getAttribute("data-budget-value"), "7000");
  assert.match(container.textContent, /Aucune ligne de convention disponible dans cette lecture/);
  data.macro.conventionTotal = null; render(container, data);
  assert.equal(container.querySelectorAll("[data-budget-ratio]").length, 0);
});

test("out-of-period and unvalued hours disclose source limits without adding estimated costs", () => {
  const container = domFixture(), data = fixture(); data.lifetime.zeroValuedHoursCount = 9;
  data.lifetime.outOfPeriod.beforeStart = { count: 2, consumed: 300 }; render(container, data, { showBwPersonnelCosts: true });
  assert.match(container.textContent, /2 avant le début.*300 EUR/);
  assert.match(container.textContent, /hors dates du projet, incluses dans le total/);
  assert.match(container.textContent, /9 écriture\(s\) d’heures sans coût monétaire enregistré/);
  assert.equal(get(container, '[data-budget-horizontal="total:consumed"]').getAttribute("data-budget-value"), "2000");
});

test("details retain expansion and focus across rerenders of a persistent host", () => {
  const container = domFixture(), data = fixture(); render(container, data);
  get(container, '[data-budget-details-panel="annual:26"]').open = true;
  get(container, '[data-budget-details="annual:26"]').focus(); render(container, data);
  assert.equal(get(container, '[data-budget-details-panel="annual:26"]').open, true);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-budget-details"), "annual:26");
});

test("loading, failed retry and empty sources remain usable without a DTO", () => {
  const container = domFixture(), options = { error: "Local sample failure", onRetry() { options.loading = true; render(container, null, options); } };
  render(container, null, { loading: true }); assert.match(container.textContent, /Chargement/);
  render(container, null, options); const retry = get(container, "[data-budget-retry]"); retry.focus(); retry.dispatch("click");
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-budget-retry"), "");
  assert.equal(container.ownerDocument.activeElement.disabled, true);
  render(container, null); assert.match(container.textContent, /Budgets indisponibles/);
  render(container, { project: { id: 1 }, conventions: [], annual: [], lifetime: { status: "unavailable" } });
  assert.match(container.textContent, /Aucun budget annuel accessible/);
});

test("source names, categories and warnings use safe text without injected markup", () => {
  const container = domFixture(), data = fixture(), marker = '<img src=x onerror="alert(1)">';
  data.macro.externalReference = marker; data.conventions[0].name = marker; data.annual[0].name = marker;
  data.annual[0].lines[0].category = marker; data.warnings = [marker]; render(container, data);
  assert.ok(container.textContent.includes(marker)); assert.equal(container.querySelectorAll("img").length, 0);
  assert.equal(container.querySelectorAll("script").length, 0);
});

test("render and geometry do not mutate the source DTO", () => {
  const container = domFixture(), data = fixture(), original = structuredClone(data);
  render(container, data); assert.deepEqual(data, original);
});

test("unreconciled conventions disclose quality and annual nonexpense source rows remain separate", () => {
  const container = domFixture(), data = fixture(); data.conventions[0].quality = "not-reconciled";
  data.annual[0].lines.push(line(99, 88, "9000 Ajustements", 42, 12, "9000"));
  render(container, data);
  assert.match(container.textContent, /Contrôle de la convention incomplet ou non réconcilié/);
  const other = get(container, '[data-budget-details-panel="annual-other:27"]');
  assert.match(other.textContent, /7000 Recettes/); assert.match(other.textContent, /9000 Ajustements/);
  assert.doesNotMatch(get(container, '[data-budget-details-panel="annual:27"]').textContent, /Recettes|Ajustements/);
});

test("annual rows omit only all-five confirmed zero measures, retaining unknown, credit and pending-only rows", () => {
  const zero = line(1, 1, "6124 All zero", 0, 0, "6124");
  assert.equal(retainAnnualLine(zero), false);
  assert.equal(retainAnnualLine({ ...zero, pending: 5 }), true);
  assert.equal(retainAnnualLine({ ...zero, balance: -2 }), true);
  assert.equal(retainAnnualLine({ ...zero, consumed: -1 }), true);
  assert.equal(retainAnnualLine({ ...zero, committed: null }), true);
  const container = domFixture(), data = fixture();
  data.annual = [{ ...annual(26, 2026), lines: [zero, { ...zero, id: 2, category: "6124 Credit", consumed: -2 },
    { ...zero, id: 3, category: "6124 Unknown", committed: null }, { ...zero, id: 4, category: "6124 Pending", pending: 3 },
    line(5, 5, "7000 All zero income", 0, 0, "7000")] }];
  render(container, data);
  const detail = get(container, '[data-budget-details-panel="annual:26"]');
  assert.doesNotMatch(detail.textContent, /All zero/); assert.match(detail.textContent, /Credit|Unknown|Pending/);
  assert.equal(container.querySelectorAll('[data-budget-details-panel="annual-other:26"]').length, 0);
});

test("code companions group exact category and currency, rather than unrelated IDs sharing a code", () => {
  const budget = annual(26, 2026); budget.lines = [line(1, 91, "6124 Services", 100.01, 20, "6124"),
    line(2, 91, "6124 Services", 200.02, 30, "6124"), line(3, 92, "6124 Other ID", 50, 5, "6124"),
    { ...line(4, 91, "6124 USD", 99, 9, "6124"), currencyId: 2, currency: "USD" },
    line(5, 94, "6133 Other code", 100, -4, "6133"), line(6, 95, "7000 Income", 9999, 9999, "7000")];
  const original = structuredClone(budget), codes = annualCodes(budget);
  assert.equal(codes.length, 4); assert.equal(codes[0].values.budgeted, 300.03);
  assert.equal(codes.filter(code => code.code === "6124").length, 3);
  assert.equal(codes.find(code => code.currencyId === 2).compatible, false);
  assert.equal(codes.find(code => code.code === "6133").values.consumed, -4);
  assert.equal(new Set(codes.filter(code => code.code === "6124").map(code => code.color)).size, 1);
  assert.notEqual(codeColor("6124"), codeColor("6133")); assert.deepEqual(budget, original);
  budget.lines[1].consumed = null; assert.equal(annualCodes(budget)[0].values.consumed, null);
});

test("code companions are repeated beside each total with stable colors, including future years", () => {
  const container = domFixture(), data = fixture();
  data.annual.forEach(budget => { budget.lines = [line(1, 91, "6124 Services", 100, 25, "6124"), line(2, 92, "6133 Travel", 50, 5, "6133")]; });
  render(container, data);
  for (const card of container.querySelectorAll("[data-budget-annual]")) {
    assert.deepEqual(card.querySelectorAll("[data-budget-measure]").map(cluster => cluster.getAttribute("data-budget-measure")), ["budgeted", "consumed", "committed"]);
    assert.equal(card.querySelectorAll("[data-budget-bar]").length, 3); assert.equal(card.querySelectorAll("[data-budget-code]").length, 6);
  }
  const colors = container.querySelectorAll('[data-budget-code="6124"]').map(column => get(column, "[data-budget-code-color]").getAttribute("data-budget-code-color"));
  assert.equal(new Set(colors).size, 1);
  assert.ok(container.querySelectorAll('[data-budget-code="6124"]').every(column => get(column, "[data-budget-code-color]").style.backgroundImage.includes("linear-gradient")));
});

test("shared signed axis includes code amounts above net totals and below zero", () => {
  const container = domFixture(), data = fixture(); data.annual = [annual(26, 2026, 1000, 100, 100), annual(27, 2027, 500, 50, 50)];
  data.annual[0].lines = [line(1, 91, "6124 Positive", 2000, 200, "6124"), line(2, 92, "6133 Credit", -1000, -100, "6133")];
  data.annual[1].lines = [];
  render(container, data); const first = get(container, "[data-budget-annual]");
  const totalHeight = Number(get(get(first, "[data-budget-bar]"), "[data-budget-height]").getAttribute("data-budget-height"));
  assert.ok(Math.abs(totalHeight - 1000 / 3000 * 100) < 1e-10);
  const credit = first.querySelectorAll('[data-budget-code="6133"]')[0]; assert.ok(credit.querySelectorAll(".is-negative").length);
  assert.ok(Number(get(credit, "[data-budget-height]").getAttribute("data-budget-height")) > 0);
});

test("code tooltips retain keyboard arrows, focus and legend pinning while thin clicks open the dialog", () => {
  const container = domFixture(), data = fixture(), label = '6124 <img src=x onerror="x">';
  data.annual = [annual(26, 2026)]; data.annual[0].lines = [line(1, 91, label, 100, -25, "6124")]; render(container, data);
  const card = get(container, "[data-budget-annual]"), buttons = card.querySelectorAll("[data-budget-code-measure]"), tooltip = get(card, ".project-budget-code-tooltip");
  assert.equal(get(card, ".project-budget-annual-chart").getAttribute("role"), "group");
  buttons[0].focus(); assert.equal(tooltip.hidden, false); assert.match(tooltip.textContent, /Budgeté : 100 EUR/);
  buttons[0].dispatch("keydown", { key: "ArrowRight" }); assert.equal(container.ownerDocument.activeElement, buttons[1]);
  assert.match(tooltip.textContent, /Consommé · facturé : -25 EUR/);
  buttons[1].dispatch("click"); assert.equal(tooltip.hidden, true);
  const modal = get(container, "[data-budget-bills-modal]"); assert.ok(modal.open);
  modal.dispatch("keydown", { key: "Escape" }); assert.equal(modal.open, false);
  render(container, data); assert.equal(container.ownerDocument.activeElement.getAttribute("data-budget-code-measure"), "consumed");
  const legend = get(get(container, "[data-budget-annual]"), ".project-budget-code-key"); legend.focus();
  assert.match(get(container, ".project-budget-code-tooltip").textContent, /Budgeté.*Consommé.*Engagé/);
  legend.dispatch("click"); legend.dispatch("pointerleave"); assert.equal(get(container, ".project-budget-code-tooltip").hidden, false);
  assert.equal(container.querySelectorAll("img").length, 0);
});

test("unknown and mixed code currency preserve source amounts without inheriting the parent scale or unit", () => {
  const container = domFixture(), data = fixture(); data.annual = [annual(26, 2026)];
  data.annual[0].lines = [{ ...line(1, 91, "6124 Unknown", 100, 25, "6124"), currencyId: null, currency: null },
    { ...line(2, 92, "6133 USD", 50000, 99999, "6133"), currencyId: 2, currency: "USD" }]; render(container, data);
  const columns = container.querySelectorAll("[data-budget-code]"); assert.ok(columns.every(column => column.getAttribute("data-budget-value") === "unavailable"));
  assert.equal(columns.filter(column => column.querySelectorAll("[data-budget-height]").length).length, 0);
  const detail = get(container, '[data-budget-details-panel="annual:26"]');
  assert.match(detail.textContent, /100 Devise inconnue/); assert.match(detail.textContent, /50[\s\u202f]?000 USD/);
  columns[0].focus(); assert.match(get(container, ".project-budget-code-tooltip").textContent, /échelle.*indisponible/);
});

test("dense charts expose a bounded scroll plot with a readable minimum-width calculation", () => {
  const container = domFixture(), data = fixture(); data.annual = [annual(26, 2026)];
  data.annual[0].lines = Array.from({ length: 16 }, (_, index) => line(index + 1, index + 91, `${6100 + index} Category`, 10, 5, String(6100 + index)));
  render(container, data); const scroll = get(container, ".project-budget-annual-scroll"), plot = get(scroll, "[data-budget-plot-min-width]");
  assert.ok(Number(plot.getAttribute("data-budget-plot-min-width")) > 700);
  assert.equal(container.querySelectorAll("[data-budget-code]").length, 48);
});

test("Ormitter checkbox defaults off, filters only exact expense IDs and preserves allocations and other measures", () => {
  const container = domFixture(), data = fixture(); data.annual = [annual(26, 2026)];
  data.annual[0].ormitterExclusion = { status: "available", consumed: 150, committed: 280,
    lines: [{ id: 1, consumed: 150, committed: 280 }], excludedConsumed: 100, warnings: [] };
  const original = structuredClone(data), options = { onExcludeOrmitterCostsChange(checked) { options.excludeOrmitterCosts = checked; render(container, data, options); } };
  render(container, data, options); const checkbox = get(container, "[data-budget-exclude-ormitter-costs]");
  assert.equal(checkbox.checked, false); checkbox.focus(); checkbox.checked = true; checkbox.dispatch("change");
  assert.equal(options.excludeOrmitterCosts, true);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-budget-exclude-ormitter-costs"), "");
  const card = get(container, "[data-budget-annual]");
  assert.deepEqual(card.querySelectorAll("[data-budget-bar]").map(column => column.getAttribute("data-budget-value")), ["1000", "150", "280"]);
  const filtered = effectiveAnnual(data.annual[0], true);
  assert.equal(filtered.lines[0].consumed, 150); assert.equal(filtered.lines[0].committed, 280);
  assert.equal(filtered.lines[0].budgeted, 1000); assert.equal(filtered.lines[0].pending, 0); assert.equal(filtered.lines[0].balance, 750);
  assert.equal(filtered.lines[1].consumed, 50); assert.equal(filtered.income.budgeted, 800);
  assert.match(container.textContent, /fournisseur Ormit Talent/); assert.match(container.textContent, /solde Odoo restent inchangés/);
  assert.deepEqual(data, original);
});

test("missing filtered measures, line IDs or entire exclusion DTO stay unavailable rather than reuse originals", () => {
  const container = domFixture(), data = fixture(); data.annual = [annual(26, 2026)];
  data.annual[0].ormitterExclusion = { status: "partial", consumed: 150, committed: null, lines: [], warnings: ["Engagement non vérifiable"] };
  render(container, data, { excludeOrmitterCosts: true });
  const card = get(container, "[data-budget-annual]");
  assert.deepEqual(card.querySelectorAll("[data-budget-bar]").map(column => column.getAttribute("data-budget-value")), ["1000", "unavailable", "unavailable"]);
  assert.equal(effectiveAnnual(data.annual[0], true).lines[0].consumed, null);
  assert.match(card.textContent, /Engagement non vérifiable/);
  delete data.annual[0].ormitterExclusion; render(container, data, { excludeOrmitterCosts: true });
  assert.match(container.textContent, /Exclusion Ormit Talent indisponible/);
  assert.deepEqual(get(container, "[data-budget-annual]").querySelectorAll("[data-budget-bar]").map(column => column.getAttribute("data-budget-value")), ["1000", "unavailable", "unavailable"]);
});

test("axis labels retain zero and avoid collisions for small credits without altering signed bars", () => {
  const geometry = chartGeometry([25000, -150]), before = structuredClone(geometry), labels = axisLabels(geometry);
  assert.ok(labels.includes(0)); assert.ok(labels.includes(25000)); assert.ok(!labels.includes(-150));
  const positions = labels.map(value => (geometry.max - value) / (geometry.max - geometry.min) * 225);
  for (let index = 0; index < positions.length - 1; index++) assert.ok(Math.abs(positions[index] - positions[index + 1]) >= 14);
  assert.deepEqual(geometry, before); assert.ok(geometry.bars[1].height > 0); assert.equal(geometry.bars[1].negative, true);
  assert.deepEqual(axisLabels(chartGeometry([0, 0])), [1, 0.5, 0]);
});

test("a convention line with unknown or different currency cannot acquire known-zero consumption", () => {
  const container = domFixture(), data = fixture();
  data.conventions[0].lines[0].currencyId = null; data.conventions[0].lines[0].currency = null;
  render(container, data, { showBwPersonnelCosts: true });
  assert.equal(container.querySelectorAll('[data-budget-horizontal="rubric:21:consumed"]').length, 0);
  assert.match(get(container, '[data-budget-details-panel="convention:10"]').textContent, /8[\s\u202f]?000 Devise inconnue/);
  data.conventions[0].lines[0].currencyId = 2; data.conventions[0].lines[0].currency = "USD"; render(container, data, { showBwPersonnelCosts: true });
  assert.equal(container.querySelectorAll('[data-budget-horizontal="rubric:21:consumed"]').length, 0);
});

function bill(id, consumed, values = {}) {
  return { id, consumed, date: "2026-02-01", currencyId: 1, currency: "EUR", supplierLabel: "Example supplier",
    documentLabel: "BILL/2026/01", description: "Description from Settlements New", isOrmitTalent: false, ...values };
}
function billsFixture(items = [bill(101, 80), bill(102, -5)], consumed = 75) {
  const data = fixture(); data.annual = [annual(26, 2026, 100, consumed, 95)];
  data.annual[0].lines = [{ ...line(1, 91, "6124 Services", 100, consumed, "6124"), startDate: "2026-01-01", endDate: "2026-12-31",
    billDetails: { status: "reconciled", sourceConsumed: consumed, visibleConsumed: consumed, gap: 0, items, warnings: [] } }];
  return data;
}

test("bill detail grouping preserves distinct allocations of the same invoice and signed credits", () => {
  const data = billsFixture(), code = annualCodes(data.annual[0])[0], original = structuredClone(code);
  const result = billDetailsForCode(code);
  assert.equal(result.status, "reconciled"); assert.equal(result.visibleConsumed, 75); assert.equal(result.gap, 0);
  assert.deepEqual(result.items.map(item => item.id), [102, 101]);
  assert.equal(result.items[0].documentLabel, result.items[1].documentLabel); assert.equal(result.items[0].consumed, -5);
  assert.deepEqual(code, original);
});

test("repeated analytic IDs are deduplicated and cross-line overlap cannot appear reconciled", () => {
  const data = billsFixture([bill(101, 75), bill(101, 75)], 75), code = annualCodes(data.annual[0])[0];
  const clean = billDetailsForCode(code); assert.equal(clean.items.length, 1); assert.equal(clean.status, "reconciled");
  data.annual[0].lines.push({ ...data.annual[0].lines[0], id: 2 });
  const result = billDetailsForCode(annualCodes(data.annual[0])[0]);
  assert.equal(result.items.length, 1); assert.equal(result.visibleConsumed, 75); assert.equal(result.targetConsumed, 150);
  assert.equal(result.status, "partial"); assert.equal(result.overlaps, 1); assert.match(result.warnings.join(" "), /plusieurs lignes budgétaires/);
});

test("conflicting duplicate amounts, missing metadata and currency conflicts stay explicit", () => {
  const data = billsFixture([bill(101, 75), bill(101, 85)], 75);
  const conflict = billDetailsForCode(annualCodes(data.annual[0])[0]); assert.equal(conflict.status, "partial");
  assert.match(conflict.warnings.join(" "), /contradictoires/);
  data.annual[0].lines[0].billDetails.items = [bill(101, 75, { currencyId: 2, currency: "USD" })];
  const currency = billDetailsForCode(annualCodes(data.annual[0])[0]); assert.equal(currency.visibleConsumed, null); assert.equal(currency.gap, null);
  delete data.annual[0].lines[0].billDetails;
  assert.equal(billDetailsForCode(annualCodes(data.annual[0])[0]).status, "unavailable");
});

test("active supplier exclusion removes verified Ormit entries and flags unknown suppliers without claiming zero", () => {
  const data = billsFixture([bill(101, 50, { isOrmitTalent: true, supplierLabel: "Ormit Talent" }), bill(102, 25)], 75);
  data.annual[0].ormitterExclusion = { consumed: 25, committed: null, lines: [{ id: 1, consumed: 25, committed: null }] };
  let code = annualCodes(effectiveAnnual(data.annual[0], true))[0], result = billDetailsForCode(code, { excludeOrmitterCosts: true });
  assert.equal(result.status, "reconciled"); assert.equal(result.visibleConsumed, 25); assert.equal(result.excludedConsumed, 50);
  assert.deepEqual(result.items.map(item => item.id), [102]);
  data.annual[0].lines[0].billDetails.items[1].isOrmitTalent = null; data.annual[0].ormitterExclusion.consumed = null;
  data.annual[0].ormitterExclusion.lines[0].consumed = null; code = annualCodes(effectiveAnnual(data.annual[0], true))[0];
  result = billDetailsForCode(code, { excludeOrmitterCosts: true });
  assert.equal(result.status, "partial"); assert.equal(result.visibleConsumed, null); assert.equal(result.uncertainItems.length, 1);
  assert.match(result.warnings.join(" "), /fournisseurs ne sont pas vérifiés/);
});

test("exact zero with an unknown supplier does not prevent a verified filtered zero reconciliation", () => {
  const data = billsFixture([bill(101, 0, { isOrmitTalent: null, supplierLabel: null })], 0);
  data.annual[0].ormitterExclusion = { consumed: 0, committed: 0, lines: [{ id: 1, consumed: 0, committed: 0 }] };
  let code = annualCodes(effectiveAnnual(data.annual[0], true))[0], result = billDetailsForCode(code, { excludeOrmitterCosts: true });
  assert.equal(result.status, "reconciled"); assert.equal(result.visibleConsumed, 0); assert.equal(result.gap, 0);
  assert.equal(result.items.length, 1); assert.equal(result.items[0].isOrmitTalent, null); assert.equal(result.uncertainItems.length, 0);
  const container = domFixture(); render(container, data, { excludeOrmitterCosts: true });
  get(container, "[data-budget-code-measure]").dispatch("click"); const modal = get(container, "[data-budget-bills-modal]");
  assert.match(modal.textContent, /Fournisseur indisponible/); assert.doesNotMatch(modal.textContent, /Liste partielle/);
  data.annual[0].lines[0].billDetails.items[0].consumed = 1;
  data.annual[0].lines[0].billDetails.sourceConsumed = 1;
  data.annual[0].ormitterExclusion.consumed = null; data.annual[0].ormitterExclusion.lines[0].consumed = null;
  code = annualCodes(effectiveAnnual(data.annual[0], true))[0]; result = billDetailsForCode(code, { excludeOrmitterCosts: true });
  assert.equal(result.status, "partial"); assert.equal(result.visibleConsumed, null); assert.equal(result.uncertainItems.length, 1);
  data.annual[0].lines[0].billDetails.items[0].consumed = 0;
  data.annual[0].lines[0].billDetails.items[0].currencyId = null;
  result = billDetailsForCode(annualCodes(effectiveAnnual(data.annual[0], true))[0], { excludeOrmitterCosts: true });
  assert.equal(result.status, "partial"); assert.equal(result.visibleConsumed, null);
});

test("native bill dialog opens from a thin bar and exposes allocated values and safe source descriptions", () => {
  const container = domFixture(), marker = '<img src=x onerror="x">', data = billsFixture([bill(101, 75, { description: marker, supplierLabel: marker })]);
  render(container, data); const trigger = get(container, "[data-budget-code-measure]"); trigger.focus(); trigger.dispatch("click");
  const modal = get(container, "[data-budget-bills-modal]");
  assert.equal(modal.open, true); assert.equal(container.ownerDocument.modalElement, modal); assert.equal(modal.getAttribute("aria-modal"), "true");
  assert.equal(container.ownerDocument.activeElement, get(modal, ".project-budget-bills-title"));
  assert.match(modal.textContent, /Factures et écritures · 6124 · 2026/); assert.ok(modal.textContent.includes(marker));
  assert.match(modal.textContent, /montants imputés.*et non totaux des factures/);
  assert.match(modal.textContent, /75 EUR/); assert.match(modal.textContent, /allocations budgétaires.*commandes non facturées/);
  assert.equal(modal.querySelectorAll("img").length, 0); assert.equal(get(container, ".project-budget-code-tooltip").hidden, true);
  get(modal, "[data-budget-bills-close]").dispatch("click");
  assert.equal(modal.open, false); assert.equal(container.querySelectorAll("[data-budget-bills-modal]").length, 0);
  assert.equal(container.ownerDocument.activeElement, trigger); assert.equal(container.ownerDocument.modalElement, null);
});

test("bill dialog traps Tab, closes with Escape/cancel/backdrop and returns exact trigger", () => {
  const container = domFixture(), data = billsFixture(); render(container, data);
  const trigger = container.querySelectorAll("[data-budget-code-measure]")[1]; trigger.dispatch("click");
  let modal = get(container, "[data-budget-bills-modal]"), close = get(modal, "[data-budget-bills-close]"), scroll = get(modal, "[data-budget-bill-scroll]");
  modal.dispatch("keydown", { key: "Tab" }); assert.equal(container.ownerDocument.activeElement, close);
  modal.dispatch("keydown", { key: "Tab", shiftKey: true }); assert.equal(container.ownerDocument.activeElement, scroll);
  modal.dispatch("keydown", { key: "Tab" }); assert.equal(container.ownerDocument.activeElement, close);
  modal.dispatch("keydown", { key: "Escape" }); assert.equal(container.ownerDocument.activeElement, trigger);
  trigger.dispatch("click"); modal = get(container, "[data-budget-bills-modal]"); modal.dispatch("cancel"); assert.equal(modal.open, false);
  trigger.dispatch("click"); modal = get(container, "[data-budget-bills-modal]");
  modal.dispatch("click", { clientX: 100, clientY: 100 }); assert.equal(modal.open, true);
  modal.dispatch("click", { clientX: 900, clientY: 700 }); assert.equal(modal.open, false);
});

test("modal rerender and explicit project lifecycle cleanup remove native state without leaking listeners", () => {
  const container = domFixture(), data = billsFixture(); render(container, data);
  const trigger = container.querySelectorAll("[data-budget-code-measure]")[1], key = trigger.getAttribute("data-budget-code-detail");
  trigger.dispatch("click"); const modal = get(container, "[data-budget-bills-modal]");
  render(container, data, { excludeOrmitterCosts: true });
  assert.equal(modal.open, false); assert.equal(container.ownerDocument.modalElement, null);
  assert.equal(container.ownerDocument.activeElement.getAttribute("data-budget-code-detail"), key);
  container.ownerDocument.activeElement.dispatch("click"); const next = get(container, "[data-budget-bills-modal]");
  assert.equal(cleanup(container, false), key); assert.equal(next.open, false);
  assert.equal(container.querySelectorAll("[data-budget-bills-modal]").length, 0); assert.equal(cleanup(container, false), null);
  assert.equal(container.ownerDocument.listeners.size, 0);
});

test("known empty bills differ from unavailable or unreconciled lists and optional description gaps", () => {
  const container = domFixture(), data = billsFixture([], 0); render(container, data);
  get(container, "[data-budget-code-measure]").dispatch("click");
  assert.match(get(container, "[data-budget-bills-modal]").textContent, /Aucune dépense facturée associée/);
  data.annual[0].lines[0].billDetails = { status: "unavailable", sourceConsumed: 0, items: [] }; render(container, data);
  get(container, "[data-budget-code-measure]").dispatch("click");
  assert.match(get(container, "[data-budget-bills-modal]").textContent, /détail des factures est indisponible/);
  data.annual[0].lines[0].billDetails = { status: "partial", sourceConsumed: 10, items: [bill(101, 7, { description: null })] }; render(container, data);
  get(container, "[data-budget-code-measure]").dispatch("click");
  const modal = get(container, "[data-budget-bills-modal]"); assert.match(modal.textContent, /Liste partielle/);
  assert.match(modal.textContent, /Description non renseignée/); assert.match(modal.textContent, /Écart liste/);
});
