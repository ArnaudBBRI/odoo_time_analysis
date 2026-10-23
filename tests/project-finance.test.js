"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const service = require("../project-finance-service");
const { fixtureRpc, records, definitions, analytic, budgetLine, parent, supplierRecords, purchaseDefinitions, purchaseRecords } = require("./project-finance-fixture");
const now = new Date("2026-10-09T12:00:00Z");
const load = rpc => service.load(11, rpc, now);
const supplierRpc = options => fixtureRpc({ records: supplierRecords(), ...options });
const annual = result => result.annual.find(budget => budget.id === 60);
const purchaseRpc = options => fixtureRpc({ records: purchaseRecords(), definitions: purchaseDefinitions(), ...options });

test("purchases map exact posted supplier allocations across both dimensions without budget-version joins", async () => {
  const rpc = purchaseRpc(), sourceBefore = structuredClone(rpc.source), result = await load(rpc), purchases = result.purchases;
  assert.equal(purchases.status, "available"); assert.deepEqual(purchases.issues, []);
  assert.equal(purchases.startDate, "2026-01-01"); assert.equal(purchases.endDate, "2026-10-09");
  assert.deepEqual(purchases.items.map(item => item.id), [101, 112, 102, 103]);
  assert.deepEqual(purchases.items.map(item => [item.categoryId, item.codeCategoryId, item.code]), [[901, 903, "6010"], [901, 904, "6020"], [901, 903, "6010"], [902, 904, "6020"]]);
  assert.equal(purchases.items.reduce((total, item) => total + item.consumed, 0), 500);
  assert.equal(purchases.items.find(item => item.id === 102).consumed, -25);
  assert.equal(purchases.items.find(item => item.id === 102).documentType, "in_refund");
  assert.equal(purchases.items[0].description, "Fictional consulting allocation <script>example</script>");
  assert.equal(purchases.items[0].supplierLabel, "Fictional supplier");
  assert.deepEqual(Object.keys(purchases.items[0]).sort(), ["id", "date", "consumed", "currencyId", "currency", "categoryId", "category", "codeCategoryId", "codeCategory", "code", "description", "supplierLabel", "documentLabel", "documentType"].sort());
  assert.doesNotMatch(JSON.stringify(purchases), /Private|employee_id|move_line_id|product_uom_id|analytic_distribution/);
  const documentRead = rpc.calls.find(call => call.model === "account.move" && call.method === "search_read");
  assert.deepEqual(documentRead.domain, [["id", "in", [1101, 1102, 1103, 1106, 1107]]]);
  assert.deepEqual(documentRead.requested, ["id", "state", "move_type"]);
  assert.ok(rpc.calls.every(call => ["fields_get", "search_read"].includes(call.method)));
  assert.deepEqual(rpc.source, sourceBefore);
});

test("purchase dates include project start and Brussels today, retain post-end purchases and exclude other periods", async () => {
  const rpc = purchaseRpc();
  rpc.source["account.analytic.line"].find(row => row.id === 103).date = "2026-10-09 22:00:00";
  const today = await service.load(11, rpc, new Date("2026-10-08T22:30:00Z"));
  assert.equal(today.purchases.endDate, "2026-10-09");
  assert.deepEqual(today.purchases.items.map(row => row.id), [101, 112, 102, 103]);
  assert.ok(today.purchases.items.some(row => row.date > today.project.endDate));
  rpc.source["account.analytic.line"].find(row => row.id === 103).date = "2026-10-10";
  const tomorrow = await load(rpc); assert.ok(!tomorrow.purchases.items.some(row => row.id === 103));
  assert.equal(tomorrow.purchases.status, "available");
});

test("purchase projection leaves existing lifetime, annual and convention source outputs unchanged", async () => {
  const withDocuments = await load(purchaseRpc()), withoutDocuments = await load(fixtureRpc({ records: purchaseRecords() }));
  for (const field of ["lifetime", "annual", "conventions", "macro", "warnings"]) assert.deepEqual(withDocuments[field], withoutDocuments[field]);
  assert.equal(withDocuments.lifetime.expensesOnly.consumed, 2090);
  assert.equal(withDocuments.purchases.items.reduce((total, item) => total + item.consumed, 0), 500);
});

test("purchase detail remains expense-only even when invoice allocations have employee and Hours dimensions", async () => {
  const rpc = purchaseRpc(), row = rpc.source["account.analytic.line"].find(item => item.id === 101);
  row.employee_id = [20, "Private employee"]; row.product_uom_id = [7, "Hours"];
  const result = await load(rpc);
  assert.equal(result.purchases.status, "available"); assert.equal(result.purchases.items.length, 4);
  assert.equal(result.purchases.items[0].consumed, 300);
  assert.doesNotMatch(JSON.stringify(result.purchases), /Private employee|employee_id|product_uom_id|secret timesheet/);
});

test("purchase source deduplicates identical allocations and rejects conflicts in either category, money, date or document", async () => {
  const identical = purchaseRpc(); identical.source["account.analytic.line"].push(structuredClone(identical.source["account.analytic.line"][0]));
  assert.equal((await load(identical)).purchases.items.length, 4);
  for (const change of [row => { row.x_plan7_id = [999, "Other convention"]; }, row => { row.x_plan8_id = [999, "6030 Other code"]; },
    row => { row.amount = -999; }, row => { row.date = "2099-01-01"; }, row => { row.move_id = [999, "Other invoice"]; }, row => { row.currency_id = [2, "USD"]; }]) {
    const rpc = purchaseRpc(), duplicate = structuredClone(rpc.source["account.analytic.line"][0]); change(duplicate); rpc.source["account.analytic.line"].push(duplicate);
    const result = (await load(rpc)).purchases;
    assert.equal(result.status, "partial"); assert.ok(result.issues.includes("duplicateConflict"));
    assert.ok(!result.items.some(item => item.id === 101));
  }
});

test("purchase mappings retain missing dimensions explicitly instead of guessing from budgets or accounts", async () => {
  for (const change of [row => { row.x_plan7_id = false; }, row => { row.x_plan8_id = false; }, row => { row.x_plan8_id = [903, "Services without a code"]; }]) {
    const rpc = purchaseRpc(); change(rpc.source["account.analytic.line"][0]);
    const purchases = (await load(rpc)).purchases, item = purchases.items.find(row => row.id === 101);
    assert.equal(purchases.status, "partial"); assert.ok(purchases.issues.includes("mappingMissing")); assert.equal(item.consumed, 300);
    assert.ok(item.categoryId === null || item.code === null);
  }
  const rpc = purchaseRpc(); delete rpc.definitions["account.analytic.line"].x_plan7_id;
  const item = (await load(rpc)).purchases.items.find(row => row.id === 101);
  assert.equal(item.categoryId, null); assert.equal(item.category, null);
});

test("purchase amounts and currencies remain unknown or separately identified without conversion", async () => {
  const missing = purchaseRpc(); missing.source["account.analytic.line"][0].amount = false; missing.source["account.analytic.line"][1].currency_id = false;
  const purchases = (await load(missing)).purchases;
  assert.equal(purchases.status, "partial"); assert.ok(purchases.issues.includes("amountMissing")); assert.ok(purchases.issues.includes("currencyMissing"));
  assert.equal(purchases.items.find(row => row.id === 101).consumed, null); assert.equal(purchases.items.find(row => row.id === 102).currencyId, null);
  const mixed = purchaseRpc(); mixed.source["account.analytic.line"][0].currency_id = [2, "USD"];
  const currencies = (await load(mixed)).purchases;
  assert.equal(currencies.status, "available"); assert.deepEqual([...new Set(currencies.items.map(row => row.currencyId))].sort(), [1, 2]);
  const unbound = purchaseRpc(); delete unbound.definitions["account.analytic.line"].amount.currency_field;
  const unknown = (await load(unbound)).purchases;
  assert.ok(unknown.issues.includes("currencyMissing")); assert.ok(unknown.items.every(row => row.currencyId === null));
});

test("purchase source rejects missing dates and IDs while source start/date/schema failures cannot invent all-history scope", async () => {
  const invalid = purchaseRpc(); invalid.source["account.analytic.line"][0].date = "2026-02-30"; invalid.source["account.analytic.line"][1].id = false;
  const partial = (await load(invalid)).purchases;
  assert.equal(partial.status, "partial"); assert.ok(partial.issues.includes("incomplete")); assert.deepEqual(partial.items.map(row => row.id), [112, 103]);
  const missingStart = purchaseRpc(); missingStart.source["project.project"][0].date_start = false;
  assert.deepEqual((await load(missingStart)).purchases, { status: "unavailable", startDate: null, endDate: "2026-10-09", items: [], issues: ["startUnavailable"] });
  assert.ok(!missingStart.calls.some(call => call.model === "account.move"));
  const missingState = purchaseRpc(); delete missingState.definitions["account.analytic.line"].parent_state;
  assert.equal((await load(missingState)).purchases.status, "unavailable");
});

test("purchase document type and posted state require exact confirmed metadata rather than names", async () => {
  for (const change of [defs => { delete defs["account.move"]; }, defs => { defs["account.move"].move_type.type = "char"; },
    defs => { defs["account.move"].move_type.selection = [["in_invoice", "Invoice"]]; }, defs => { defs["account.move"].state.type = "char"; }]) {
    const rpc = purchaseRpc(); change(rpc.definitions);
    const result = await load(rpc); assert.equal(result.purchases.status, "unavailable"); assert.deepEqual(result.purchases.issues, ["documentUnavailable"]);
    assert.equal(result.lifetime.expensesOnly.consumed, 2090);
  }
  const rpc = purchaseRpc({ failRead: "account.move" }), unavailable = await load(rpc);
  assert.equal(unavailable.purchases.status, "unavailable"); assert.doesNotMatch(JSON.stringify(unavailable), /private-source-secret/);
});

test("missing or conflicting purchase documents exclude only their allocations and disclose partial coverage", async () => {
  const missing = purchaseRpc(); missing.source["account.move"] = missing.source["account.move"].filter(row => row.id !== 1102);
  const purchases = (await load(missing)).purchases;
  assert.equal(purchases.status, "partial"); assert.ok(purchases.issues.includes("documentUnavailable")); assert.ok(!purchases.items.some(row => row.id === 102));
  const conflict = purchaseRpc(); conflict.source["account.move"].push({ id: 1101, state: "posted", move_type: "out_invoice" });
  const conflicting = (await load(conflict)).purchases;
  assert.ok(conflicting.issues.includes("duplicateConflict")); assert.ok(!conflicting.items.some(row => row.id === 101 || row.id === 112));
  const unknownType = purchaseRpc(); unknownType.source["account.move"].find(row => row.id === 1102).move_type = "unknown";
  assert.ok((await load(unknownType)).purchases.issues.includes("documentUnavailable"));
});

test("purchase descriptions read only confirmed exact purchase IDs and retain amounts when optional text fails", async () => {
  const rpc = purchaseRpc(); await load(rpc);
  const read = rpc.calls.find(call => call.model === "account.analytic.line" && call.requested?.includes("name"));
  assert.deepEqual(read.domain, [["account_id", "=", 110], ["id", "in", [101, 102, 103, 112]], ["account_type", "in", ["expense", "expense_direct_cost", "expense_depreciation"]], ["parent_state", "=", "posted"]]);
  for (const field of ["amount", "move_id", "currency_id", "x_plan7_id", "x_plan8_id"]) assert.ok(read.requested.includes(field));
  for (const field of ["employee_id", "product_uom_id", "analytic_distribution"]) assert.ok(!read.requested.includes(field));
  const failed = purchaseRpc(), originalRead = failed.read;
  failed.read = async (model, domain, fields) => { if (model === "account.analytic.line" && fields.includes("name")) throw new Error("private-description-secret"); return originalRead(model, domain, fields); };
  const unavailableText = await load(failed);
  assert.equal(unavailableText.purchases.status, "partial"); assert.deepEqual(unavailableText.purchases.issues, ["descriptionsMissing"]);
  assert.equal(unavailableText.purchases.items.reduce((total, row) => total + row.consumed, 0), 500);
  assert.ok(unavailableText.purchases.items.every(row => row.description === null)); assert.doesNotMatch(JSON.stringify(unavailableText), /private-description-secret/);
});

test("changed monetary, category, scope or document evidence cannot attach purchase descriptions", async () => {
  for (const change of [row => { row.amount = -999; }, row => { row.x_plan7_id = [999, "Other"]; }, row => { row.x_plan8_id = [999, "6030 Other"]; },
    row => { row.account_id = [999, "Other account"]; }, row => { row.move_id = [999, "Other document"]; }, row => { row.currency_id = [2, "USD"]; }]) {
    const rpc = purchaseRpc(), read = rpc.read;
    rpc.read = async (model, domain, fields) => { const rows = await read(model, domain, fields); if (model === "account.analytic.line" && fields.includes("name")) change(rows.find(row => row.id === 101)); return rows; };
    const purchases = (await load(rpc)).purchases, item = purchases.items.find(row => row.id === 101);
    assert.equal(item.consumed, 300); assert.equal(item.description, null); assert.ok(purchases.issues.includes("descriptionsMissing"));
  }
});

test("purchase source failures and shared analytic accounts remain isolated and unavailable", async () => {
  for (const rpc of [purchaseRpc({ failRead: "account.analytic.line" }), purchaseRpc({ denied: "account.analytic.line" })]) {
    const result = await load(rpc); assert.equal(result.purchases.status, "unavailable"); assert.deepEqual(result.purchases.items, []);
    assert.ok(!rpc.calls.some(call => call.model === "account.move")); assert.doesNotMatch(JSON.stringify(result), /private-source-secret/);
  }
  const shared = purchaseRpc(); shared.source["project.project"][1].account_id = [110, "Shared"];
  const result = await load(shared); assert.deepEqual(result.purchases.issues, ["sourceUnavailable"]); assert.ok(!shared.calls.some(call => call.model === "account.move"));
});

test("unknown financial classification or state cannot silently disappear from purchase coverage", async () => {
  for (const change of [row => { row.account_type = "custom_unknown"; row.move_id = false; }, row => { row.account_type = false; row.move_id = false; },
    row => { row.parent_state = "unknown"; }]) {
    const rpc = purchaseRpc(); change(rpc.source["account.analytic.line"][0]);
    const purchases = (await load(rpc)).purchases;
    assert.equal(purchases.status, "partial"); assert.ok(purchases.issues.includes("incomplete")); assert.ok(!purchases.items.some(row => row.id === 101));
  }
});

test("contradictory purchase description snapshots cannot be rescued by another apparently matching duplicate", async () => {
  const rpc = purchaseRpc(), read = rpc.read;
  rpc.read = async (model, domain, fields) => {
    const rows = await read(model, domain, fields);
    if (model === "account.analytic.line" && fields.includes("name")) rows.push({ ...structuredClone(rows.find(row => row.id === 101)), amount: -999 });
    return rows;
  };
  const purchases = (await load(rpc)).purchases;
  assert.equal(purchases.items.find(row => row.id === 101).description, null);
  assert.ok(purchases.issues.includes("descriptionsMissing"));
});

test("finance reads exact project and referenced budgets; versions, future years and zero-budget consumption survive", async () => {
  const rpc = fixtureRpc();
  rpc.source["budget.analytic"].push({ ...parent(80, "convention", [81]), state: "revised" });
  rpc.source["budget.line"].push(budgetLine(81, 80, [909, "Other rubric"], 0, -25, 0));
  const result = await load(rpc);
  assert.equal(result.project.id, 11); assert.equal(result.macro.conventionTotal, 1000); assert.equal(result.macro.personnelEuros, 600);
  assert.equal(result.macro.personnelHours, 200); assert.equal(result.macro.fundingType, "Grant");
  assert.deepEqual(result.conventions.map(row => row.id), [50, 80]);
  assert.equal(result.conventions[1].lines[0].budgeted, 0); assert.equal(result.conventions[1].lines[0].consumed, -25);
  assert.equal(result.conventions[1].status.code, "revised");
  assert.deepEqual(result.annual.map(row => row.startDate), ["2026-01-01", "2027-01-01"]);
  assert.deepEqual(result.annual[1].status, { code: "under_validation", label: "Under Validation" });
  assert.deepEqual(rpc.calls[0].domain, [["id", "=", 11]]);
  const parents = rpc.calls.find(call => call.model === "budget.analytic" && call.method === "search_read");
  assert.deepEqual(parents.domain, [["project_id", "=", 11]]);
  const lines = rpc.calls.find(call => call.model === "budget.line" && call.method === "search_read");
  assert.deepEqual(lines.domain, [["id", "in", [51, 52, 61, 62, 71, 72, 81]]]);
  assert.ok(rpc.calls.every(call => ["fields_get", "search_read"].includes(call.method)));
});

test("lifetime combines posted expenses and recorded Hours money once; credits, unmapped hours and late costs remain", async () => {
  const rpc = fixtureRpc();
  // An expense with employee/Hours dimensions is still one financial expense.
  rpc.source["account.analytic.line"][0].employee_id = [20, "Private person"];
  rpc.source["account.analytic.line"][0].product_uom_id = [7, "Hours"];
  const result = await load(rpc), lifetime = result.lifetime;
  assert.equal(lifetime.status, "available"); assert.equal(lifetime.consumed, 530);
  assert.equal(lifetime.expenseCost, 190); assert.equal(lifetime.personnelCost, 340);
  assert.deepEqual(lifetime.byRubric, [{ categoryId: 901, category: "Services", consumed: 180 }]);
  assert.deepEqual(lifetime.unmapped, [
    { label: "Coût des heures · rubrique non renseignée", labelMessageKey: "budget.unmappedPersonnel", consumed: 340 },
    { label: "Dépenses · rubrique non renseignée", labelMessageKey: "budget.unmappedExpense", consumed: 10 }
  ]);
  assert.equal(lifetime.zeroValuedHoursCount, 1); assert.equal(lifetime.qualifyingRecordCount, 6);
  assert.deepEqual(lifetime.outOfPeriod, { beforeStart: { count: 1, consumed: 10 }, afterEnd: { count: 1, consumed: 40 } });
  assert.equal(result.conventions[0].billedTotal, 200); assert.equal(result.conventions[0].lines[1].consumed, 0);
  assert.doesNotMatch(JSON.stringify(result), /Private person|employee_id|move_line_id|private-source-secret/);
  const read = rpc.calls.find(call => call.model === "account.analytic.line" && call.method === "search_read");
  assert.deepEqual(read.domain, [["account_id", "=", 110]]);
});

test("expense-only lifetime removes Hours costs from mixed exact rubrics without changing the full source", async () => {
  const rpc = fixtureRpc();
  rpc.source["account.analytic.line"][1].x_plan7_id = [901, "Services"];
  const lifetime = (await load(rpc)).lifetime, expenses = lifetime.expensesOnly;
  assert.equal(lifetime.consumed, 530); assert.equal(lifetime.personnelCost, 340);
  assert.deepEqual(lifetime.byRubric, [{ categoryId: 901, category: "Services", consumed: 480 }]);
  assert.equal(expenses.status, "available"); assert.equal(expenses.currencyId, 1); assert.equal(expenses.currency, "EUR");
  assert.equal(expenses.consumed, 190); assert.equal(expenses.expenseCost, 190); assert.equal(expenses.personnelCost, 0);
  assert.deepEqual(expenses.byRubric, [{ categoryId: 901, category: "Services", consumed: 180 }]);
  assert.deepEqual(expenses.unmapped, [{ label: "Dépenses · rubrique non renseignée", labelMessageKey: "budget.unmappedExpense", consumed: 10 }]);
  assert.equal(expenses.qualifyingRecordCount, 3); assert.equal(expenses.zeroValuedHoursCount, 0);
  assert.deepEqual(expenses.outOfPeriod, { beforeStart: { count: 1, consumed: 10 }, afterEnd: { count: 0, consumed: 0 } });
  assert.ok(!expenses.warnings.some(text => /coût enregistré nul/.test(text)));
});

test("expense-only lifetime retains Ormit and subcontracting invoices even with employee and Hours dimensions", async () => {
  const rpc = supplierRpc();
  rpc.source["account.analytic.line"][0].employee_id = [20, "Private person"];
  rpc.source["account.analytic.line"][0].product_uom_id = [7, "Hours"];
  const result = await load(rpc), lifetime = result.lifetime, expenses = lifetime.expensesOnly;
  assert.equal(lifetime.consumed, 705); assert.equal(lifetime.personnelCost, 80);
  assert.equal(expenses.status, "available"); assert.equal(expenses.consumed, 625);
  assert.equal(expenses.expenseCost, 625); assert.equal(expenses.personnelCost, 0);
  assert.equal(expenses.qualifyingRecordCount, 5);
  assert.equal(annual(result).totals.consumed, 625); assert.equal(annual(result).ormitterExclusion.consumed, 150);
  assert.doesNotMatch(JSON.stringify(expenses), /Private person|employee_id|Ormit|secret timesheet/);
});

test("excluded personnel currency and missing monetary costs cannot invalidate a verified expense basis", async () => {
  for (const change of [row => { row.currency_id = [2, "USD"]; }, row => { row.currency_id = false; }, row => { row.amount = false; }]) {
    const rpc = fixtureRpc(); change(rpc.source["account.analytic.line"][1]);
    const lifetime = (await load(rpc)).lifetime, expenses = lifetime.expensesOnly;
    assert.equal(lifetime.status, "partial"); assert.equal(expenses.status, "available");
    assert.equal(expenses.currencyId, 1); assert.equal(expenses.consumed, 190);
    assert.deepEqual(expenses.byRubric, [{ categoryId: 901, category: "Services", consumed: 180 }]);
    assert.ok(!expenses.warnings.some(text => /devise|monétaire\(s\).*absents/.test(text)));
  }
});

test("expense-only empty sources require verified monetary binding and preserve project currency", async () => {
  for (const rows of [[], [analytic(2, { employee_id: [20, "Person"], product_uom_id: [7, "Hours"], amount: false, currency_id: false })]]) {
    const rpc = fixtureRpc(); rpc.source["account.analytic.line"] = rows;
    const expenses = (await load(rpc)).lifetime.expensesOnly;
    assert.equal(expenses.status, "available"); assert.equal(expenses.currencyId, 1); assert.equal(expenses.consumed, 0);
    assert.equal(expenses.expenseCost, 0); assert.equal(expenses.personnelCost, 0);
    assert.deepEqual(expenses.byRubric, []); assert.deepEqual(expenses.unmapped, []);
    delete rpc.definitions["account.analytic.line"].amount.currency_field;
    const unknown = (await load(rpc)).lifetime.expensesOnly;
    assert.equal(unknown.status, "partial"); assert.equal(unknown.consumed, null); assert.equal(unknown.currencyId, null);
    assert.ok(unknown.warnings.some(text => /champ monétaire/.test(text)));
  }
});

test("expense basis preserves genuine unknown classification, missing expense money and invalid source dates", async () => {
  for (const row of [analytic(20, { account_type: "new_unknown_type", amount: -500 }),
    analytic(21, { account_type: "expense", parent_state: "posted", amount: false }),
    analytic(22, { employee_id: [20, "Person"], product_uom_id: [7, "Hours"], date: "2026-02-30", amount: -100 })]) {
    const rpc = fixtureRpc(); rpc.source["account.analytic.line"].push(row);
    const expenses = (await load(rpc)).lifetime.expensesOnly;
    assert.equal(expenses.status, "partial"); assert.equal(expenses.consumed, 190); assert.ok(expenses.warnings.length);
  }
  const denied = fixtureRpc({ denied: "uom.uom" }), unknownHours = (await load(denied)).lifetime.expensesOnly;
  assert.equal(unknownHours.status, "partial"); assert.equal(unknownHours.consumed, 190);
  assert.ok(unknownHours.warnings.some(text => /classification/.test(text)));
});

test("expense basis never combines its own unknown currencies or invents entirely missing expense amounts", async () => {
  for (const currency of [false, [2, "USD"]]) {
    const rpc = fixtureRpc(); rpc.source["account.analytic.line"][0].currency_id = currency;
    const expenses = (await load(rpc)).lifetime.expensesOnly;
    assert.equal(expenses.status, "partial"); assert.equal(expenses.consumed, null); assert.equal(expenses.currencyId, null);
    assert.deepEqual(expenses.byRubric, []);
  }
  const rpc = fixtureRpc(); rpc.source["account.analytic.line"] = [analytic(1, { amount: false, account_type: "expense", parent_state: "posted", x_plan7_id: [901, "Services"] })];
  const expenses = (await load(rpc)).lifetime.expensesOnly;
  assert.equal(expenses.status, "partial"); assert.equal(expenses.consumed, null); assert.equal(expenses.expenseCost, null);
  assert.equal(expenses.byRubric[0].consumed, null);
});

test("inaccessible or shared lifetime sources also expose an unavailable expense-only projection", async () => {
  for (const scenario of ["missing", "shared", "denied"]) {
    const rpc = fixtureRpc(scenario === "denied" ? { failRead: "account.analytic.line" } : {});
    if (scenario === "missing") rpc.source["project.project"][0].account_id = false;
    if (scenario === "shared") rpc.source["project.project"][1].account_id = [110, "Shared"];
    const expenses = (await load(rpc)).lifetime.expensesOnly;
    assert.equal(expenses.status, "unavailable"); assert.equal(expenses.consumed, null); assert.equal(expenses.expenseCost, null);
    assert.deepEqual(expenses.byRubric, []); assert.ok(expenses.warnings.length);
    assert.doesNotMatch(JSON.stringify(expenses), /private-source-secret/);
  }
});

test("personnel category markers use exact source labels rather than account-code assumptions", async () => {
  for (const value of ["Frais de personnel", "  FRAIS  DE  PERSONNEL  BW ", "Personnel", "6200 · Personnel BW", "6000: Personnel", "BW personnel"])
    assert.equal(service.isBwPersonnelCategory(value), true, value);
  for (const value of ["6000 Equipment", "6200 Consultancy", "6139 External services", "6170 External staff", "Frais de personnel externes", "Ormit Talent"])
    assert.equal(service.isBwPersonnelCategory(value), false, value);
  for (const value of [null, undefined, false, "", "   "])
    assert.equal(service.isBwPersonnelCategory(value), null);
  const rpc = fixtureRpc(), result = await load(rpc);
  assert.equal(result.conventions[0].lines.find(line => line.id === 52).isBwPersonnel, true);
  assert.equal(result.conventions[0].lines.find(line => line.id === 51).isBwPersonnel, false);
  assert.equal(result.annual[0].lines.find(line => line.id === 61).isBwPersonnel, true);
  assert.equal(result.annual[1].lines.find(line => line.id === 71).isBwPersonnel, false);
  rpc.source["budget.line"][0].x_plan7_id = false;
  assert.equal((await load(rpc)).conventions[0].lines.find(line => line.id === 51).isBwPersonnel, null);
  assert.ok(rpc.calls.every(call => ["fields_get", "search_read"].includes(call.method)));
});

test("contradictory expense identities keep both lifetime projections partial", async () => {
  for (const change of [row => { row.amount = -999; }, row => { row.x_plan7_id = [999, "Other rubric"]; },
    row => { row.account_type = "income"; }]) {
    const rpc = fixtureRpc(), duplicate = { ...rpc.source["account.analytic.line"][0] };
    change(duplicate); rpc.source["account.analytic.line"].push(duplicate);
    const lifetime = (await load(rpc)).lifetime;
    for (const projection of [lifetime, lifetime.expensesOnly]) {
      assert.equal(projection.status, "partial");
      assert.ok(projection.warnings.some(text => /valeurs contradictoires/.test(text)));
    }
  }
});

test("unverifiable current expense identities cannot establish a complete expense subtotal", async () => {
  for (const entry of [analytic(null, { account_type: "expense", parent_state: "posted", amount: -700 }),
    analytic(false, { account_type: "new_unknown_type", amount: -700 })]) {
    const rpc = fixtureRpc(); rpc.source["account.analytic.line"].push(entry);
    const lifetime = (await load(rpc)).lifetime;
    assert.equal(lifetime.status, "partial"); assert.equal(lifetime.expensesOnly.status, "partial");
    assert.equal(lifetime.expensesOnly.consumed, 190);
    assert.ok(lifetime.expensesOnly.warnings.some(text => /identifiant vérifiable/.test(text)));
  }
});

test("verified personnel-only identity gaps do not taint expense completeness", async () => {
  for (const entry of [analytic(null, { employee_id: [20, "Person"], product_uom_id: [7, "Hours"], amount: -100 }),
    { ...records["account.analytic.line"][1], amount: -900 }]) {
    const rpc = fixtureRpc(); rpc.source["account.analytic.line"].push(entry);
    const lifetime = (await load(rpc)).lifetime;
    assert.equal(lifetime.status, "partial"); assert.equal(lifetime.expensesOnly.status, "available");
    assert.equal(lifetime.expensesOnly.consumed, 190);
    assert.ok(!lifetime.expensesOnly.warnings.some(text => /identifiant vérifiable|valeurs contradictoires/.test(text)));
  }
});

test("irrelevant future and non-expense identity gaps do not taint current lifetime costs", async () => {
  const rpc = fixtureRpc();
  rpc.source["account.analytic.line"].push(analytic(null, { account_type: "expense", parent_state: "posted", date: "2026-12-01", amount: -700 }),
    analytic(null, { account_type: "expense", parent_state: "draft", amount: -700 }),
    analytic(null, { account_type: "income", parent_state: "posted", amount: -700 }),
    { ...records["account.analytic.line"][4], amount: -999 });
  const lifetime = (await load(rpc)).lifetime;
  assert.equal(lifetime.status, "available"); assert.equal(lifetime.expensesOnly.status, "available");
  assert.equal(lifetime.consumed, 530); assert.equal(lifetime.expensesOnly.consumed, 190);
});

test("unrelated malicious rows never alter parent, line, analytic or UOM scope", async () => {
  const rpc = fixtureRpc({ unscoped: {
    "project.project": [{ id: 99, name: "Foreign", account_id: [990, "Foreign"] }],
    "budget.analytic": [{ ...parent(99, "annual", [99]), project_id: [99, "Foreign"] }],
    "budget.line": [budgetLine(99, 99, [1, "Foreign"], 999999, 999999)],
    "account.analytic.line": [analytic(99, { account_id: [990, "Foreign"], account_type: "expense", parent_state: "posted", amount: -999999 }), analytic(100, { project_id: [99, "Foreign"], employee_id: [20, "Foreign"], product_uom_id: [7, "Hours"], amount: -999999 })],
    "uom.uom": [{ id: 99, name: "Hours", category_id: [8, "Time"] }]
  } });
  const result = await load(rpc);
  assert.equal(result.lifetime.consumed, 530); assert.equal(result.conventions.length, 1); assert.equal(result.annual.length, 2);
  assert.doesNotMatch(JSON.stringify(result), /Foreign|999999/);
});

test("invalid project ID performs no read; absent exact project performs no metadata or related queries", async () => {
  const rpc = fixtureRpc();
  for (const invalid of [null, "11", 0, -1, 1.5]) await assert.rejects(service.load(invalid, rpc, now), /positive integer/);
  assert.equal(rpc.calls.length, 0);
  const result = await service.load(999, rpc, now);
  assert.equal(result.notFound, true); assert.equal(rpc.calls.length, 1);
});

test("missing or misowned referenced budget lines leave visible details but no false totals", async () => {
  for (const change of [source => source["budget.line"].splice(1, 1), source => { source["budget.line"][1].budget_analytic_id = [999, "Foreign"]; }, source => { source["budget.line"][1].project_id = [999, "Foreign"]; }]) {
    const rpc = fixtureRpc(); change(rpc.source);
    const result = await load(rpc);
    assert.equal(result.conventions[0].quality, "partial"); assert.equal(result.conventions[0].budgetedTotal, null); assert.equal(result.conventions[0].billedTotal, null);
    assert.equal(result.lifetime.consumed, 530);
  }
});

test("signed annual expense totals remain distinct from income and 9xxx adjustments", async () => {
  const rpc = fixtureRpc();
  const result = await load(rpc), annual = result.annual[0];
  assert.deepEqual(annual.totals, { budgeted: 1000, consumed: 200, committed: 500, pending: 0, balance: 500 });
  assert.deepEqual(annual.income, { budgeted: 1050, consumed: 300 }); assert.equal(annual.quality, "reconciled");
  rpc.source["budget.analytic"][1].budget_line_ids.push(63);
  rpc.source["budget.line"].push(budgetLine(63, 60, [908, "9000 Adjustment"], -10, -2, -2));
  const changed = (await load(rpc)).annual[0];
  assert.equal(changed.adjustments.budgeted, -10); assert.equal(changed.totals.budgeted, 1000); assert.equal(changed.quality, "not-checkable");
});

test("missing measures stay null while actual zero and signed amounts survive", async () => {
  const rpc = fixtureRpc();
  delete rpc.source["budget.line"][0].achieved_amount;
  rpc.source["budget.line"][1].on_approval = -5;
  const convention = (await load(rpc)).conventions[0];
  assert.equal(convention.lines[0].consumed, null); assert.equal(convention.lines[1].consumed, 0);
  assert.equal(convention.billedTotal, null); assert.equal(convention.pendingApprovalTotal, -5);
  delete rpc.definitions["budget.line"].achieved_amount;
  const absent = (await load(rpc)).conventions[0]; assert.ok(absent.lines.every(line => line.consumed === null));
});

test("missing, mixed or blank confirmed line currencies cannot be combined", async () => {
  for (const value of [false, [2, "USD"]]) {
    const rpc = fixtureRpc(); rpc.source["budget.line"][0].currency_id = value;
    const convention = (await load(rpc)).conventions[0];
    assert.equal(convention.budgetedTotal, null); assert.equal(convention.quality, "partial");
  }
});

test("unknown annual account codes or missing parent controls do not claim reconciliation", async () => {
  const rpc = fixtureRpc(); rpc.source["budget.line"][2].x_plan8_id = [99, "Personnel without account code"];
  const unknown = (await load(rpc)).annual[0]; assert.equal(unknown.totals.budgeted, null); assert.equal(unknown.quality, "partial");
  const fresh = fixtureRpc(); delete fresh.source["budget.analytic"][1].sum_accounts_60;
  assert.equal((await load(fresh)).annual[0].quality, "not-checkable");
});

test("denied budget source preserves independent lifetime and sanitized warnings", async () => {
  const result = await load(fixtureRpc({ denied: "budget.analytic" }));
  assert.deepEqual(result.conventions, []); assert.deepEqual(result.annual, []); assert.equal(result.lifetime.consumed, 530);
  assert.doesNotMatch(JSON.stringify(result), /private-source-secret/); assert.ok(result.warnings.length);
});

test("parent references are the only fallback if direct parent project relation is unavailable", async () => {
  const rpc = fixtureRpc(); delete rpc.definitions["budget.analytic"].project_id;
  const result = await load(rpc); assert.equal(result.conventions.length, 1); assert.equal(result.conventions[0].budgetedTotal, 1000);
  const read = rpc.calls.find(call => call.model === "budget.analytic" && call.method === "search_read");
  assert.deepEqual(read.domain, [["id", "in", [50, 60, 70]]]);
  const noScope = fixtureRpc(); delete noScope.definitions["budget.analytic"].project_id; delete noScope.definitions["project.project"].budget_ids;
  const unavailable = await load(noScope); assert.equal(unavailable.conventions.length, 0);
  assert.ok(!noScope.calls.some(call => call.model === "budget.analytic" && call.method === "search_read"));
});

test("missing analytic account, shared account and denied financial source never use an unfiltered fallback", async () => {
  for (const scenario of ["missing", "shared", "denied"]) {
    const rpc = fixtureRpc(scenario === "denied" ? { failRead: "account.analytic.line" } : {});
    if (scenario === "missing") rpc.source["project.project"][0].account_id = false;
    if (scenario === "shared") rpc.source["project.project"][1].account_id = [110, "Shared"];
    const result = await load(rpc); assert.equal(result.lifetime.status, "unavailable"); assert.equal(result.lifetime.consumed, null);
    assert.equal(result.conventions[0].budgetedTotal, 1000); assert.doesNotMatch(JSON.stringify(result), /private-source-secret/);
    if (scenario !== "denied") assert.ok(!rpc.calls.some(call => call.model === "account.analytic.line" && call.method === "search_read"));
  }
});

test("unavailable UOM or accounting dimensions never invent personnel classification", async () => {
  for (const scenario of ["unit", "movement"]) {
    const rpc = fixtureRpc(scenario === "unit" ? { denied: "uom.uom" } : {});
    if (scenario === "movement") delete rpc.definitions["account.analytic.line"].move_id;
    const result = await load(rpc); assert.equal(result.lifetime.status, "partial"); assert.equal(result.lifetime.expenseCost, 190); assert.equal(result.lifetime.personnelCost, 0);
    assert.ok(result.lifetime.warnings.length); assert.doesNotMatch(JSON.stringify(result), /private-source-secret/);
  }
});

test("unposted expense, balance-sheet/payment and financial Hour rows are not personnel cost", async () => {
  const rpc = fixtureRpc(); rpc.source["account.analytic.line"].push(
    analytic(20, { account_type: "liability_current", employee_id: [20, "Person"], product_uom_id: [7, "Hours"], amount: -500 }),
    analytic(21, { employee_id: [20, "Person"], product_uom_id: [7, "Hours"], amount: -100, move_line_id: [70, "Unknown financial line"] }),
    analytic(22, { account_type: "expense_direct_cost", parent_state: "cancel", amount: -100 }),
    analytic(23, { account_type: "expense_depreciation", parent_state: "posted", amount: -20 }));
  const result = await load(rpc); assert.equal(result.lifetime.personnelCost, 340); assert.equal(result.lifetime.expenseCost, 210); assert.equal(result.lifetime.consumed, 550); assert.equal(result.lifetime.status, "partial");
});

test("unknown classification, missing amount or invalid dates disclose partial known costs", async () => {
  const rpc = fixtureRpc(); rpc.source["account.analytic.line"].push(
    analytic(20, { account_type: "new_unknown_type", amount: -500 }),
    analytic(21, { employee_id: [20, "Person"], product_uom_id: [7, "Hours"], amount: false }),
    analytic(22, { account_type: "expense", parent_state: "posted", amount: -100, date: "2026-02-30" }));
  const result = await load(rpc); assert.equal(result.lifetime.status, "partial"); assert.equal(result.lifetime.consumed, 530);
  assert.ok(result.lifetime.warnings.some(text => /classification/.test(text))); assert.ok(result.lifetime.warnings.some(text => /absents/.test(text))); assert.ok(result.lifetime.warnings.some(text => /date exploitable/.test(text)));
});

test("mixed or unknown qualifying currencies suppress financial totals and rubric stacks", async () => {
  for (const change of [row => { row.currency_id = [2, "USD"]; row.company_currency_id = [2, "USD"]; }, row => { row.currency_id = false; row.company_currency_id = false; }]) {
    const rpc = fixtureRpc(); change(rpc.source["account.analytic.line"][1]);
    const lifetime = (await load(rpc)).lifetime;
    assert.equal(lifetime.status, "partial"); assert.equal(lifetime.consumed, null); assert.equal(lifetime.personnelCost, null); assert.equal(lifetime.expenseCost, null);
    assert.deepEqual(lifetime.byRubric, []); assert.deepEqual(lifetime.unmapped, []);
  }
});

test("a metadata-bound company currency can be used while unrelated currencies are ignored", async () => {
  const rpc = fixtureRpc(); rpc.definitions["account.analytic.line"].amount.currency_field = "company_currency_id";
  for (const row of rpc.source["account.analytic.line"]) { row.company_currency_id = [1, "EUR"]; row.currency_id = [2, "USD"]; }
  const result = await load(rpc); assert.equal(result.lifetime.currencyId, 1); assert.equal(result.lifetime.consumed, 530);
});

test("Brussels today includes local next day at UTC evening and invalid dates are not normalized", async () => {
  assert.equal(service.brusselsDate(new Date("2026-10-08T22:30:00Z")), "2026-10-09");
  const rpc = fixtureRpc(); rpc.source["project.project"][0].date_start = "2026-02-30";
  const result = await load(rpc); assert.equal(result.project.startDate, null); assert.equal(result.lifetime.consumed, 530); assert.equal(result.lifetime.outOfPeriod.beforeStart.consumed, null);
});

test("missing money never becomes zero for an entire cost component, rubric or outside-period group", async () => {
  const rpc = fixtureRpc(); rpc.source["account.analytic.line"] = [analytic(1, { amount: false, account_type: "expense", parent_state: "posted", date: "2025-12-01", x_plan7_id: [901, "Services"] })];
  const lifetime = (await load(rpc)).lifetime;
  assert.equal(lifetime.consumed, null); assert.equal(lifetime.expenseCost, null); assert.equal(lifetime.outOfPeriod.beforeStart.consumed, null);
  assert.equal(lifetime.byRubric[0].consumed, null); assert.equal(lifetime.status, "partial");
  rpc.source["account.analytic.line"] = [analytic(2, { amount: false, employee_id: [20, "Person"], product_uom_id: [7, "Hours"] })];
  const hours = (await load(rpc)).lifetime; assert.equal(hours.personnelCost, null); assert.equal(hours.unmapped[0].consumed, null);
});

test("blank bound currency cannot reuse an unrelated populated currency", async () => {
  const rpc = fixtureRpc(); rpc.definitions["account.analytic.line"].amount.currency_field = "company_currency_id";
  for (const row of rpc.source["account.analytic.line"]) row.company_currency_id = [1, "EUR"];
  rpc.source["account.analytic.line"][1].company_currency_id = false;
  const lifetime = (await load(rpc)).lifetime; assert.equal(lifetime.consumed, null); assert.equal(lifetime.status, "partial");
});

test("standard amount-bound currency retains personnel costs despite blank move-linked company currency", async () => {
  const rpc = fixtureRpc();
  const result = await load(rpc); assert.equal(result.lifetime.consumed, 530); assert.equal(result.lifetime.personnelCost, 340);
  assert.equal(result.lifetime.currencyId, 1); assert.ok(result.lifetime.unmapped.some(row => /Coût des heures/.test(row.label)));
  const read = rpc.calls.find(call => call.model === "account.analytic.line" && call.method === "search_read");
  assert.ok(read.requested.includes("currency_id")); assert.ok(!read.requested.includes("company_currency_id"));
  rpc.source["account.analytic.line"][1].currency_id = false;
  rpc.source["account.analytic.line"][1].company_currency_id = [1, "EUR"];
  const missing = (await load(rpc)).lifetime; assert.equal(missing.consumed, null); assert.equal(missing.status, "partial");
});

test("absent or incompatible monetary currency metadata never guesses an amount currency", async () => {
  for (const binding of [undefined, "unknown_currency", "currency_id"] ) {
    const rpc = fixtureRpc(); rpc.definitions["account.analytic.line"].amount.currency_field = binding;
    if (binding === "currency_id") rpc.definitions["account.analytic.line"].currency_id.type = "char";
    const lifetime = (await load(rpc)).lifetime; assert.equal(lifetime.consumed, null); assert.equal(lifetime.currencyId, null); assert.equal(lifetime.status, "partial");
    assert.ok(lifetime.warnings.some(text => /champ monétaire/.test(text)));
  }
});

test("empty financial source still needs a confirmed currency binding before known zero totals", async () => {
  const rpc = fixtureRpc(); rpc.source["account.analytic.line"] = [];
  const known = (await load(rpc)).lifetime; assert.equal(known.status, "available"); assert.equal(known.consumed, 0);
  delete rpc.definitions["account.analytic.line"].amount.currency_field;
  const unavailable = (await load(rpc)).lifetime;
  assert.equal(unavailable.status, "partial"); assert.equal(unavailable.currencyId, null); assert.equal(unavailable.consumed, null);
  assert.equal(unavailable.expenseCost, null); assert.equal(unavailable.personnelCost, null);
});

test("Hours label also requires an accessible confirmed time category", async () => {
  for (const scenario of ["wrong-category", "denied-category"]) {
    const rpc = fixtureRpc(scenario === "denied-category" ? { denied: "uom.category" } : {});
    if (scenario === "wrong-category") rpc.source["uom.category"][0].name = "Unit";
    const lifetime = (await load(rpc)).lifetime; assert.equal(lifetime.expenseCost, 190); assert.equal(lifetime.personnelCost, 0); assert.equal(lifetime.status, "partial");
  }
});

test("annual supplier exclusion reconciles exact codes and periods, signed credits and independent commitments", async () => {
  const rpc = supplierRpc(), result = await load(rpc), budget = annual(result), filtered = budget.ormitterExclusion;
  assert.equal(budget.quality, "reconciled");
  assert.deepEqual(budget.totals, { budgeted: 1000, consumed: 625, committed: 725, pending: 0, balance: 275 });
  assert.equal(filtered.status, "available"); assert.equal(filtered.consumed, 150); assert.equal(filtered.committed, 250); assert.equal(filtered.excludedConsumed, 475);
  assert.deepEqual(filtered.lines, [{ id: 61, consumed: 100, committed: 100 }, { id: 63, consumed: 0, committed: 0 }, { id: 64, consumed: 50, committed: 150 }]);
  assert.deepEqual(budget.income, { budgeted: 1050, consumed: 300 }); assert.equal(budget.lines.find(row => row.id === 61).balance, 25);
  assert.equal(result.lifetime.consumed, 705); assert.equal(result.lifetime.personnelCost, 80);
  const future = result.annual.find(row => row.id === 70).ormitterExclusion;
  assert.equal(future.status, "available"); assert.equal(future.consumed, 0); assert.equal(future.excludedConsumed, 100);
  const purchase = rpc.calls.find(call => call.model === "purchase.order.line" && call.method === "search_read");
  assert.deepEqual(purchase.domain, [["distribution_analytic_account_ids", "in", [110]], ["state", "in", ["purchase", "done"]]]);
  assert.deepEqual(purchase.requested, ["id", "distribution_analytic_account_ids", "analytic_distribution", "state", "partner_id"]);
  assert.ok(rpc.calls.every(call => ["search_read", "fields_get"].includes(call.method)));
  assert.doesNotMatch(JSON.stringify(result), /Private employee|secret timesheet text|partner_id|analytic_distribution|qty_invoiced/);
});

test("supplier identity follows exact commercial roots and never a substring, display label, GL code or description", async () => {
  for (const [supplierId, expected] of [[501, 275], [503, -25], [504, -25], [505, 275], [506, -25]]) {
    const rpc = supplierRpc(); rpc.source["account.analytic.line"][0].partner_id = [supplierId, "Ormit Talent display hint"];
    const filtered = annual(await load(rpc)).ormitterExclusion;
    assert.equal(filtered.lines.find(row => row.id === 61).consumed, 375 - expected);
  }
  const rpc = supplierRpc(); rpc.source["res.partner"].find(row => row.id === 501).name = "  ORMIT   TALENT  ";
  assert.equal(annual(await load(rpc)).ormitterExclusion.excludedConsumed, 475);
});

test("missing supplier names or unresolved commercial roots leave billed exclusion unknown", async () => {
  for (const scenario of ["missing-supplier", "missing-root", "cycle", "missing-metadata", "denied", "blank-name", "blank-root"]) {
    const rpc = supplierRpc(scenario === "denied" ? { denied: "res.partner" } : {});
    if (scenario === "missing-supplier") rpc.source["account.analytic.line"][0].partner_id = false;
    if (scenario === "missing-root") rpc.source["res.partner"].find(row => row.id === 501).commercial_partner_id = [999, "Missing root"];
    if (scenario === "cycle") { rpc.source["res.partner"].find(row => row.id === 501).commercial_partner_id = [505, "Contact"]; }
    if (scenario === "missing-metadata") delete rpc.definitions["res.partner"].commercial_partner_id;
    if (scenario === "blank-name") rpc.source["res.partner"].find(row => row.id === 501).name = false;
    if (scenario === "blank-root") rpc.source["res.partner"].find(row => row.id === 501).commercial_partner_id = false;
    const filtered = annual(await load(rpc)).ormitterExclusion;
    assert.equal(filtered.consumed, null, scenario); assert.equal(filtered.status, "unavailable", scenario);
    assert.equal(filtered.lines.find(row => row.id === 61).consumed, null, scenario);
    assert.doesNotMatch(JSON.stringify(filtered), /private-source-secret/);
  }
});

test("conflicting exact-ID canonical supplier rows cannot certify exclusion", async () => {
  const identical = supplierRpc(); identical.source["res.partner"].push(structuredClone(identical.source["res.partner"][0]));
  assert.equal(annual(await load(identical)).ormitterExclusion.excludedConsumed, 475);
  for (const change of [row => { row.name = "Other supplier"; }, row => { row.commercial_partner_id = [502, "Other supplier"]; }]) {
    const rpc = supplierRpc(), conflicting = structuredClone(rpc.source["res.partner"][0]); change(conflicting);
    rpc.source["res.partner"].push(conflicting);
    assert.equal(annual(await load(rpc)).ormitterExclusion.consumed, null);
  }
});

test("credits retain their sign and a zero-valued expense does not invent an unknown supplier cost", async () => {
  const rpc = supplierRpc();
  rpc.source["account.analytic.line"][0].amount = 300;
  rpc.source["budget.line"].find(row => row.id === 61).achieved_amount = -225;
  rpc.source["budget.line"].find(row => row.id === 61).committed_amount = -225;
  rpc.source["account.analytic.line"].push(analytic(200, { amount: 0, account_type: "expense", parent_state: "posted", x_plan8_id: [903, "6139"], partner_id: false }));
  const filtered = annual(await load(rpc)).ormitterExclusion;
  assert.equal(filtered.lines.find(row => row.id === 61).consumed, 100); assert.equal(filtered.lines.find(row => row.id === 61).committed, 100);
  assert.equal(filtered.excludedConsumed, -125); assert.equal(filtered.status, "available");
});

test("each budget line uses its own verified period despite a coincidentally reconciled parent-year sum", async () => {
  const rpc = supplierRpc(), line = rpc.source["budget.line"].find(row => row.id === 61);
  Object.assign(line, { date_from: "2026-01-01", date_to: "2026-06-30", achieved_amount: 100, committed_amount: 100 });
  rpc.source["account.analytic.line"] = rpc.source["account.analytic.line"].filter(row => row.x_plan8_id?.[0] !== 903);
  rpc.source["account.analytic.line"].push(
    analytic(301, { account_type: "expense", parent_state: "posted", amount: -100, x_plan8_id: [903, "6139"], partner_id: [502, "Other supplier"], date: "2026-04-01" }),
    analytic(302, { account_type: "expense", parent_state: "posted", amount: -100, x_plan8_id: [903, "6139"], partner_id: [501, "Ormit Talent"], date: "2026-08-01" }),
    analytic(303, { account_type: "expense", parent_state: "posted", amount: 100, x_plan8_id: [903, "6139"], partner_id: [502, "Other supplier"], date: "2026-08-01" })
  );
  const budget = annual(await load(rpc));
  assert.equal(budget.lines.find(row => row.id === 61).endDate, "2026-06-30");
  assert.deepEqual(budget.ormitterExclusion.lines.find(row => row.id === 61), { id: 61, consumed: 100, committed: 100 });
});

test("unreadable, invalid or out-of-parent child periods cannot inherit annual supplier attribution", async () => {
  for (const scenario of ["missing-value", "invalid", "outside-parent", "missing-field"]) {
    const rpc = supplierRpc(), line = rpc.source["budget.line"].find(row => row.id === 61);
    if (scenario === "missing-value") line.date_to = false;
    if (scenario === "invalid") line.date_to = "2026-02-30";
    if (scenario === "outside-parent") line.date_from = "2025-12-01";
    if (scenario === "missing-field") delete rpc.definitions["budget.line"].date_from;
    const filtered = annual(await load(rpc)).ormitterExclusion;
    assert.equal(filtered.lines.find(row => row.id === 61).consumed, null, scenario); assert.equal(filtered.consumed, null, scenario);
  }
});

test("annual supplier exclusion fails closed for classification, posting state, amount, currency and reconciliation gaps", async () => {
  for (const scenario of ["unknown-type", "missing-state", "invalid-date", "missing-amount", "blank-currency", "foreign-currency", "missing-binding", "unreconciled"]) {
    const rpc = supplierRpc(), expense = rpc.source["account.analytic.line"][0];
    if (scenario === "unknown-type") rpc.source["account.analytic.line"].push(analytic(300, { account_type: "custom_unknown", parent_state: "posted", amount: -50, x_plan8_id: [903, "6139"], partner_id: [501, "Ormit Talent"], move_id: [300, "Unknown move"] }));
    if (scenario === "missing-state") expense.parent_state = false;
    if (scenario === "invalid-date") expense.date = "2026-02-30";
    if (scenario === "missing-amount") expense.amount = false;
    if (scenario === "blank-currency") { expense.currency_id = false; expense.company_currency_id = [1, "EUR"]; }
    if (scenario === "foreign-currency") expense.currency_id = [2, "USD"];
    if (scenario === "missing-binding") delete rpc.definitions["account.analytic.line"].amount.currency_field;
    if (scenario === "unreconciled") rpc.source["budget.line"].find(row => row.id === 61).achieved_amount = 376;
    const filtered = annual(await load(rpc)).ormitterExclusion;
    assert.equal(filtered.lines.find(row => row.id === 61).consumed, null, scenario); assert.equal(filtered.consumed, null, scenario);
  }
});

test("unknown financial classifications cannot disappear through cancelling amounts or a coincidentally matching ledger", async () => {
  const rpc = supplierRpc();
  rpc.source["account.analytic.line"].push(
    analytic(300, { account_type: false, parent_state: "posted", amount: -50, x_plan8_id: [903, "6139"], partner_id: [501, "Ormit Talent"], move_line_id: [300, "Unknown move line"] }),
    analytic(301, { account_type: "custom_unknown", parent_state: "posted", amount: 50, x_plan8_id: [903, "6139"], partner_id: [502, "Other supplier"] })
  );
  assert.equal(annual(await load(rpc)).ormitterExclusion.lines.find(row => row.id === 61).consumed, null);
});

test("missing or denied sources preserve original annual measures and never fabricate a zero exclusion", async () => {
  for (const scenario of ["category", "supplier", "shared-account", "read-denied"]) {
    const rpc = supplierRpc(scenario === "read-denied" ? { failRead: "account.analytic.line" } : {});
    if (scenario === "category") delete rpc.definitions["account.analytic.line"].x_plan8_id;
    if (scenario === "supplier") delete rpc.definitions["account.analytic.line"].partner_id;
    if (scenario === "shared-account") rpc.source["project.project"][1].account_id = [110, "Shared"];
    const budget = annual(await load(rpc));
    assert.equal(budget.totals.consumed, 625); assert.equal(budget.totals.committed, 725);
    assert.equal(budget.ormitterExclusion.consumed, null, scenario); assert.equal(budget.ormitterExclusion.excludedConsumed, null, scenario);
    assert.doesNotMatch(JSON.stringify(budget), /private-source-secret/);
  }
});

test("affected commitment requires no accessible Ormit order and source committed equal to billed", async () => {
  for (const scenario of ["ormit-order", "unknown-order", "unallocated-order", "outstanding-source"]) {
    const rpc = supplierRpc();
    if (scenario === "ormit-order") rpc.source["purchase.order.line"].push({ id: 202, state: "done", partner_id: [501, "Ormit Talent"], distribution_analytic_account_ids: [110, 906, 901], analytic_distribution: { "110,906,901": 100 } });
    if (scenario === "unknown-order") rpc.source["purchase.order.line"][0].partner_id = false;
    if (scenario === "unallocated-order") rpc.source["purchase.order.line"][0] = { id: 201, state: "purchase", partner_id: [501, "Ormit Talent"], distribution_analytic_account_ids: [110], analytic_distribution: { "110": 100 } };
    if (scenario === "outstanding-source") rpc.source["budget.line"].find(row => row.id === 61).committed_amount = 475;
    const filtered = annual(await load(rpc)).ormitterExclusion;
    assert.equal(filtered.consumed, 150, scenario); assert.equal(filtered.committed, null, scenario); assert.equal(filtered.status, "partial", scenario);
    assert.equal(filtered.lines.find(row => row.id === 61).committed, null, scenario);
  }
});

test("unknown or Ormit orders block only attributable unaffected categories; unrelated commitments remain original", async () => {
  const rpc = supplierRpc(); rpc.source["purchase.order.line"][0].partner_id = [501, "Ormit Talent"];
  const filtered = annual(await load(rpc)).ormitterExclusion;
  assert.equal(filtered.lines.find(row => row.id === 64).committed, null);
  assert.equal(filtered.lines.find(row => row.id === 64).consumed, 50);
  assert.equal(filtered.lines.find(row => row.id === 61).committed, null);
  assert.equal(filtered.lines.find(row => row.id === 63).committed, null);
  const other = supplierRpc(); other.source["purchase.order.line"][0].partner_id = false;
  const unknown = annual(await load(other)).ormitterExclusion;
  assert.equal(unknown.lines.find(row => row.id === 64).committed, null);
});

test("unavailable purchase source keeps known supplier-filtered billed costs but does not replace engagements with billed", async () => {
  for (const scenario of ["denied", "missing-scope", "missing-related-supplier", "unknown-states"]) {
    const rpc = supplierRpc(scenario === "denied" ? { failRead: "purchase.order.line" } : {});
    if (scenario === "missing-scope") delete rpc.definitions["purchase.order.line"].distribution_analytic_account_ids;
    if (scenario === "missing-related-supplier") delete rpc.definitions["purchase.order.line"].partner_id.related;
    if (scenario === "unknown-states") rpc.definitions["purchase.order.line"].state.selection = [["draft", "Draft"]];
    const budget = annual(await load(rpc)), filtered = budget.ormitterExclusion;
    assert.equal(filtered.consumed, 150, scenario); assert.equal(filtered.committed, null, scenario); assert.equal(budget.totals.committed, 725);
    assert.equal(filtered.lines.find(row => row.id === 64).committed, null, scenario);
    assert.doesNotMatch(JSON.stringify(filtered), /private-source-secret/);
  }
  const empty = supplierRpc({ failRead: "purchase.order.line" });
  empty.source["account.analytic.line"] = empty.source["account.analytic.line"].filter(row => row.x_plan8_id?.[0] !== 907);
  Object.assign(empty.source["budget.line"].find(row => row.id === 64), { achieved_amount: 0, committed_amount: 0 });
  assert.equal(annual(await load(empty)).ormitterExclusion.lines.find(row => row.id === 64).committed, 0);
});

test("composite and apportioned purchase distributions keep exact project scope without amount reconstruction", async () => {
  const rpc = supplierRpc();
  rpc.source["purchase.order.line"][0].analytic_distribution = { "110,907,901": 40, "120,990,991": 60 };
  rpc.source["purchase.order.line"][0].distribution_analytic_account_ids = [110, 120, 907, 901, 990, 991];
  const filtered = annual(await load(rpc)).ormitterExclusion;
  assert.equal(filtered.status, "available"); assert.equal(filtered.committed, 250);
  const foreign = { id: 999, state: "done", partner_id: [501, "Ormit Talent"], distribution_analytic_account_ids: [120, 903], analytic_distribution: { "120,903": 100 } };
  const mixed = supplierRpc({ unscoped: { "purchase.order.line": [foreign] } });
  assert.equal(annual(await load(mixed)).ormitterExclusion.committed, 250);
});

test("unknown purchase scope, state, malformed allocation or conflicting duplicates fail commitment proof", async () => {
  for (const scenario of ["inconsistent-scope", "state", "overallocated", "malformed", "duplicate"]) {
    const rpc = supplierRpc(), purchase = rpc.source["purchase.order.line"][0];
    if (scenario === "inconsistent-scope") purchase.analytic_distribution = { "120,907": 100 };
    if (scenario === "overallocated") purchase.analytic_distribution = { "110,907": 100, "120,990": 50 };
    if (scenario === "malformed") purchase.analytic_distribution = { "110,907": "100" };
    if (scenario === "duplicate") rpc.source["purchase.order.line"].push({ ...purchase, partner_id: [501, "Ormit Talent"] });
    if (scenario === "state") {
      const originalRead = rpc.read;
      rpc.read = async (model, domain, fields) => (await originalRead(model, domain, fields)).map(row => model === "purchase.order.line" ? { ...row, state: false } : row);
    }
    assert.equal(annual(await load(rpc)).ormitterExclusion.committed, null, scenario);
  }
});

test("duplicate annual categories and conflicting analytic rows cannot double-count supplier exclusions", async () => {
  const duplicateCategory = supplierRpc();
  duplicateCategory.source["budget.analytic"][1].budget_line_ids.push(65);
  duplicateCategory.source["budget.line"].push(budgetLine(65, 60, [903, "6139 Duplicate"], 0, 0));
  const ambiguous = annual(await load(duplicateCategory)).ormitterExclusion;
  assert.equal(ambiguous.lines.find(row => row.id === 61).consumed, null); assert.equal(ambiguous.lines.find(row => row.id === 65).consumed, null);
  const identical = supplierRpc(); identical.source["account.analytic.line"].push(structuredClone(identical.source["account.analytic.line"][0]));
  assert.equal(annual(await load(identical)).ormitterExclusion.excludedConsumed, 475);
  const conflicting = supplierRpc(); conflicting.source["account.analytic.line"].push({ ...conflicting.source["account.analytic.line"][0], amount: -500 });
  assert.equal(annual(await load(conflicting)).ormitterExclusion.consumed, null);
});

test("future-only hours do not add a new UOM dependency or degrade today's lifetime status", async () => {
  const rpc = supplierRpc(); rpc.source["account.analytic.line"].push(analytic(300, { date: "2027-04-01", employee_id: [20, "Private employee"], product_uom_id: [999, "New future unit"], amount: -500 }));
  const originalRead = rpc.read;
  rpc.read = async (model, domain, fields) => {
    if (model === "uom.uom" && domain[0][2].includes(999)) throw new Error("Future unit is inaccessible");
    return originalRead(model, domain, fields);
  };
  const result = await load(rpc); assert.equal(result.lifetime.status, "available"); assert.equal(result.lifetime.consumed, 705);
  assert.equal(result.annual.find(row => row.id === 70).ormitterExclusion.excludedConsumed, 100);
});

test("bill details explain exact annual expense allocations with signed credits and settlement descriptions", async () => {
  const rpc = supplierRpc(), result = await load(rpc), budget = annual(result), details = budget.lines.find(row => row.id === 61).billDetails;
  assert.equal(details.status, "reconciled"); assert.equal(details.sourceConsumed, 375); assert.equal(details.visibleConsumed, 375); assert.equal(details.gap, 0);
  assert.deepEqual(details.items.map(row => [row.id, row.consumed, row.isOrmitTalent]), [[101, 300, true], [102, -25, true], [103, 100, false]]);
  assert.deepEqual(Object.keys(details.items[0]).sort(), ["id", "date", "description", "consumed", "currencyId", "currency", "documentLabel", "supplierLabel", "isOrmitTalent"].sort());
  assert.equal(details.items[0].description, "Supplier charge"); assert.equal(details.items[2].description, "Ormit description alone");
  assert.equal(details.items[0].documentLabel, "Financial entry"); assert.equal(details.items[0].currencyId, 1);
  assert.equal(details.items.filter(row => row.isOrmitTalent === false).reduce((total, row) => total + row.consumed, 0), budget.ormitterExclusion.lines.find(row => row.id === 61).consumed);
  const future = result.annual.find(row => row.id === 70).lines.find(row => row.id === 71).billDetails;
  assert.equal(future.status, "reconciled"); assert.deepEqual(future.items.map(row => [row.id, row.date, row.consumed]), [[107, "2027-03-01", 100]]);
  assert.equal(result.lifetime.consumed, 705); assert.equal(result.lifetime.personnelCost, 80);
  assert.equal(budget.lines.find(row => row.id === 62).billDetails, undefined);
  assert.doesNotMatch(JSON.stringify(result), /secret timesheet text|Private employee|analytic_distribution|qty_invoiced|amount_residual|employee_id|move_line_id/);
});

test("description enrichment reads only exact annual financial IDs and never personnel, payments, drafts or unrelated periods", async () => {
  const rpc = supplierRpc();
  rpc.source["account.analytic.line"].push(analytic(400, { account_type: "expense", parent_state: "posted", x_plan8_id: [903, "6139"], date: "2025-12-31", name: "Expense outside annual period" }));
  await load(rpc);
  const reads = rpc.calls.filter(call => call.model === "account.analytic.line" && call.method === "search_read"), descriptions = reads.find(call => call.requested.includes("name"));
  assert.equal(reads.length, 2); assert.ok(!reads[0].requested.includes("name"));
  assert.deepEqual(descriptions.domain, [["account_id", "=", 110], ["id", "in", [101, 102, 103, 104, 105, 107]], ["account_type", "in", ["expense", "expense_direct_cost", "expense_depreciation"]], ["parent_state", "=", "posted"]]);
  assert.ok(!descriptions.requested.includes("amount")); assert.ok(!descriptions.requested.includes("employee_id"));
  const noCategory = fixtureRpc(); await load(noCategory);
  assert.ok(!noCategory.calls.some(call => call.model === "account.analytic.line" && call.requested?.includes("name")));
});

test("optional missing or denied descriptions preserve bill reconciliation, annual measures and lifetime totals", async () => {
  for (const scenario of ["unsupported-field", "denied-read", "empty-name"]) {
    const rpc = supplierRpc();
    if (scenario === "unsupported-field") delete rpc.definitions["account.analytic.line"].name;
    if (scenario === "empty-name") rpc.source["account.analytic.line"][0].name = false;
    if (scenario === "denied-read") {
      const originalRead = rpc.read;
      rpc.read = async (model, domain, fields) => { if (model === "account.analytic.line" && fields.includes("name")) throw new Error("private-description-secret"); return originalRead(model, domain, fields); };
    }
    const result = await load(rpc), details = annual(result).lines.find(row => row.id === 61).billDetails;
    assert.equal(details.status, "reconciled", scenario); assert.equal(details.visibleConsumed, 375); assert.equal(details.items[0].description, null, scenario);
    assert.equal(result.lifetime.consumed, 705); assert.equal(annual(result).ormitterExclusion.consumed, 150); assert.equal(annual(result).totals.committed, 725);
    assert.ok(details.warnings.some(warning => /libellé/.test(warning)), scenario); assert.doesNotMatch(JSON.stringify(result), /private-description-secret/);
  }
});

test("description postfilters reject changed account, project, category, period, currency, type or posting status", async () => {
  for (const [field, value] of [["account_id", [999, "Foreign"]], ["project_id", [12, "Foreign"]], ["x_plan8_id", [999, "Foreign"]], ["date", "2027-02-01"], ["currency_id", [2, "USD"]], ["account_type", false], ["parent_state", "draft"]]) {
    const rpc = supplierRpc(), originalRead = rpc.read;
    rpc.read = async (model, domain, fields) => (await originalRead(model, domain, fields)).map(row => model === "account.analytic.line" && fields.includes("name") && row.id === 101 ? { ...row, [field]: value, name: "Private person / secret timesheet text" } : row);
    const result = await load(rpc), details = annual(result).lines.find(row => row.id === 61).billDetails;
    assert.equal(details.items[0].description, null, field); assert.equal(details.status, "reconciled", field); assert.equal(details.visibleConsumed, 375);
    assert.doesNotMatch(JSON.stringify(result), /secret timesheet text/, field);
  }
});

test("conflicting enrichment descriptions become unavailable without changing allocated bill costs", async () => {
  const rpc = supplierRpc(), originalRead = rpc.read;
  rpc.read = async (model, domain, fields) => {
    const rows = await originalRead(model, domain, fields);
    if (model === "account.analytic.line" && fields.includes("name")) rows.push({ ...rows[0], name: "Conflicting optional description" });
    return rows;
  };
  const result = await load(rpc), details = annual(result).lines.find(row => row.id === 61).billDetails;
  assert.equal(details.items[0].description, null); assert.equal(details.visibleConsumed, 375); assert.equal(details.items.length, 3); assert.equal(details.status, "reconciled");
  assert.ok(details.warnings.some(warning => /libellé/.test(warning)));
});

test("unknown suppliers remain explicit in bill rows while unfiltered money can still reconcile", async () => {
  for (const scenario of ["missing-value", "missing-metadata", "unresolved-root"]) {
    const rpc = supplierRpc();
    if (scenario === "missing-value") rpc.source["account.analytic.line"][0].partner_id = false;
    if (scenario === "missing-metadata") delete rpc.definitions["account.analytic.line"].partner_id;
    if (scenario === "unresolved-root") rpc.source["res.partner"][0].commercial_partner_id = [999, "Unknown parent"];
    const budget = annual(await load(rpc)), details = budget.lines.find(row => row.id === 61).billDetails;
    assert.equal(details.status, "reconciled", scenario); assert.equal(details.items[0].isOrmitTalent, null, scenario);
    assert.equal(budget.ormitterExclusion.lines.find(row => row.id === 61).consumed, null, scenario);
    assert.ok(details.warnings.some(warning => /fournisseurs/.test(warning)));
  }
});

test("annual bill gaps, classification uncertainty, currencies and missing amounts remain partial rather than invented zeros", async () => {
  for (const scenario of ["gap", "unknown-type", "missing-state", "missing-amount", "blank-currency", "foreign-currency", "missing-source-amount"]) {
    const rpc = supplierRpc(), expense = rpc.source["account.analytic.line"][0], line = rpc.source["budget.line"].find(row => row.id === 61);
    if (scenario === "gap") line.achieved_amount = 400;
    if (scenario === "unknown-type") rpc.source["account.analytic.line"].push(analytic(300, { account_type: "custom_unknown", amount: -50, x_plan8_id: [903, "6139"], name: "Unknown financial description" }));
    if (scenario === "missing-state") expense.parent_state = false;
    if (scenario === "missing-amount") expense.amount = false;
    if (scenario === "blank-currency") expense.currency_id = false;
    if (scenario === "foreign-currency") expense.currency_id = [2, "USD"];
    if (scenario === "missing-source-amount") line.achieved_amount = false;
    const details = annual(await load(rpc)).lines.find(row => row.id === 61).billDetails;
    assert.equal(details.status, "partial", scenario);
    if (["missing-amount", "blank-currency", "foreign-currency"].includes(scenario)) assert.equal(details.visibleConsumed, null, scenario);
    if (["blank-currency", "foreign-currency", "missing-state"].includes(scenario)) assert.ok(!details.items.some(item => item.id === 101), scenario);
    if (scenario === "gap") { assert.equal(details.visibleConsumed, 375); assert.equal(details.sourceConsumed, 400); assert.equal(details.gap, -25); }
    if (scenario === "missing-source-amount") assert.equal(details.sourceConsumed, null);
    assert.ok(details.warnings.length > 1);
  }
});

test("missing finance sources or invalid exact periods produce bill placeholders on every annual expense line", async () => {
  for (const scenario of ["denied-source", "shared-account", "missing-currency-binding", "missing-category", "invalid-period"]) {
    const rpc = supplierRpc(scenario === "denied-source" ? { failRead: "account.analytic.line" } : {});
    if (scenario === "shared-account") rpc.source["project.project"][1].account_id = [110, "Shared"];
    if (scenario === "missing-currency-binding") delete rpc.definitions["account.analytic.line"].amount.currency_field;
    if (scenario === "missing-category") delete rpc.definitions["account.analytic.line"].x_plan8_id;
    if (scenario === "invalid-period") rpc.source["budget.line"].find(row => row.id === 61).date_to = "2026-02-30";
    const result = await load(rpc), details = annual(result).lines.find(row => row.id === 61).billDetails;
    assert.equal(details.status, "unavailable", scenario); assert.equal(details.sourceConsumed, 375); assert.equal(details.visibleConsumed, null); assert.equal(details.gap, null); assert.deepEqual(details.items, []);
    if (scenario !== "invalid-period") assert.ok(result.annual.flatMap(budget => budget.lines.filter(line => /^6/.test(line.accountCode))).every(line => line.billDetails.status === "unavailable"));
    assert.doesNotMatch(JSON.stringify(result), /private-source-secret|secret timesheet text/);
  }
});

test("duplicate annual category lines disclose ambiguity and duplicate settlement identities do not multiply bill rows", async () => {
  const rpc = supplierRpc();
  rpc.source["budget.analytic"][1].budget_line_ids.push(65); rpc.source["budget.line"].push(budgetLine(65, 60, [903, "6139 Duplicate"], 0, 375));
  rpc.source["account.analytic.line"].push(structuredClone(rpc.source["account.analytic.line"][0]));
  const budget = annual(await load(rpc)), first = budget.lines.find(row => row.id === 61).billDetails, second = budget.lines.find(row => row.id === 65).billDetails;
  assert.equal(first.status, "partial"); assert.equal(second.status, "partial"); assert.equal(first.items.length, 3); assert.equal(first.visibleConsumed, 375);
  assert.ok(first.warnings.some(warning => /plusieurs fois/.test(warning)));
  const union = new Map([...first.items, ...second.items].map(item => [item.id, item])); assert.equal(union.size, 3);
  const conflicting = supplierRpc(); conflicting.source["account.analytic.line"].push({ ...conflicting.source["account.analytic.line"][0], amount: -500 });
  assert.equal(annual(await load(conflicting)).lines.find(row => row.id === 61).billDetails.status, "unavailable");
});

test("bill detail period follows the child line and known empty billed costs stay zero", async () => {
  const rpc = supplierRpc(), line = rpc.source["budget.line"].find(row => row.id === 61);
  Object.assign(line, { date_from: "2026-06-01", date_to: "2026-06-30", achieved_amount: 0, committed_amount: 0 });
  const result = await load(rpc), details = annual(result).lines.find(row => row.id === 61).billDetails;
  assert.deepEqual({ status: details.status, source: details.sourceConsumed, visible: details.visibleConsumed, gap: details.gap, items: details.items }, { status: "reconciled", source: 0, visible: 0, gap: 0, items: [] });
  const enrichment = rpc.calls.find(call => call.model === "account.analytic.line" && call.requested?.includes("name"));
  assert.ok(!enrichment.domain[1][2].some(rowId => [101, 102, 103].includes(rowId)));
});
