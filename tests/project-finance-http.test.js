"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { startRuntime } = require("./steering-runtime");
const { records, analytic, supplierRecords, purchaseDefinitions, purchaseRecords } = require("./project-finance-fixture");
const cookie = response => response.headers.get("set-cookie").split(";")[0];
const post = (runtime, auth, body) => runtime.request("/api/odoo/project-finance", { method: "POST", headers: { Cookie: auth, "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("finance HTTP protects route/assets and rejects invalid scope/method/origin before upstream work", async t => {
  const runtime = await startRuntime({ finance: true, disabled: true }); t.after(() => runtime.close());
  assert.equal((await runtime.request("/api/odoo/project-finance", { method: "POST", body: '{"projectId":11}' })).status, 401);
  assert.equal(runtime.calls.length, 0);
  for (const file of ["project-budget.js", "project-budget.css"]) assert.equal((await runtime.request("/" + file)).status, 303);
  const auth = cookie(await runtime.login());
  const before = runtime.calls.length;
  assert.equal((await runtime.request("/api/odoo/project-finance", { headers: { Cookie: auth } })).status, 405);
  for (const projectId of [null, "11", 0, -1, 11.5]) assert.equal((await post(runtime, auth, { projectId })).status, 400);
  assert.equal((await runtime.request("/api/odoo/project-finance", { method: "POST", headers: { Cookie: auth }, body: "{" })).status, 400);
  assert.equal((await runtime.request("/api/odoo/project-finance", { method: "POST", headers: { Cookie: auth, Origin: "https://foreign.example.invalid" }, body: '{"projectId":11}' })).status, 403);
  assert.equal(runtime.calls.length, before);
  for (const file of ["project-budget.js", "project-budget.css"]) assert.equal((await runtime.request("/" + file, { headers: { Cookie: auth } })).status, 200);
  assert.equal((await runtime.request("/project-finance-service.js", { headers: { Cookie: auth } })).status, 404);
});

test("finance HTTP uses exact accessible project and session identity independently of DiCo/config and caller fields", async t => {
  const runtime = await startRuntime({ finance: true, disabled: true }); t.after(() => runtime.close());
  const first = cookie(await runtime.login()), second = cookie(await runtime.login("second@example.com"));
  const response = await post(runtime, first, { projectId: 11, uid: 8, employeeId: 999, apiKey: "attacker-key", username: "attacker", odooUrl: "https://foreign.example.invalid", database: "attacker", projectCode: "Other", selectedYears: [2027], excludeOrmitterCosts: true, supplierId: 999, excludedAccountCodes: ["613990"] });
  assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.project.id, 11); assert.equal(result.conventions.length, 1); assert.equal(result.annual.length, 2);
  for (const annual of result.annual) {
    assert.ok(["available", "partial", "unavailable"].includes(annual.ormitterExclusion.status));
    assert.deepEqual(annual.ormitterExclusion.lines.map(line => line.id), annual.lines.filter(line => /^6/.test(line.accountCode)).map(line => line.id));
    assert.ok(annual.ormitterExclusion.lines.every(line => Object.keys(line).sort().join(",") === "committed,consumed,id"));
  }
  assert.equal(result.macro.personnelHours, 200); assert.equal(result.lifetime.currencyId, 1);
  assert.equal((await post(runtime, second, { projectId: 11 })).status, 404);
  const before = runtime.calls.length;
  assert.equal((await post(runtime, first, { projectId: 999 })).status, 404);
  assert.equal(runtime.calls.slice(before).filter(xml => xml.includes("<string>search_read</string>")).length, 1);
  assert.doesNotMatch(JSON.stringify(result), /correct password|ignored-config-secret|attacker-key|Private person|employee_id|move_line_id/);
  assert.ok(!runtime.calls.some(xml => xml.includes("<string>attacker-key</string>") || xml.includes("<string>attacker</string>")));
  const moneyRead = runtime.calls.find(xml => xml.includes("<string>account.analytic.line</string>") && xml.includes("<string>search_read</string>"));
  assert.match(moneyRead, /<string>account_id<\/string><\/value><value><string>=<\/string><\/value><value><int>110<\/int>/);
  assert.match(moneyRead, /<string>lang<\/string>|<name>lang<\/name>/);
  const moneyMetadata = runtime.calls.find(xml => xml.includes("<string>account.analytic.line</string>") && xml.includes("<string>fields_get</string>"));
  assert.match(moneyMetadata, /<string>currency_field<\/string>/); assert.match(moneyMetadata, /<string>related<\/string>/);
  for (const xml of runtime.calls.filter(xml => xml.includes("<methodName>execute_kw</methodName>"))) assert.match(xml, /<string>(?:fields_get|search_read)<\/string>/);
});

test("finance HTTP paginates all cost records; payment rows never inflate consumption", async t => {
  const source = structuredClone(records);
  source["account.analytic.line"] = Array.from({ length: 1103 }, (_, index) => analytic(index + 100, { account_type: "expense", parent_state: "posted", amount: -1, date: "2025-01-01", x_plan7_id: [901, "Services"] }));
  source["account.analytic.line"].push(analytic(5000, { account_type: "asset_cash", parent_state: "posted", amount: -50000, date: "2025-01-01" }));
  const runtime = await startRuntime({ finance: true, financeRecords: source }); t.after(() => runtime.close());
  const auth = cookie(await runtime.login());
  const result = await (await post(runtime, auth, { projectId: 11 })).json();
  assert.equal(result.lifetime.consumed, 1103); assert.equal(result.lifetime.qualifyingRecordCount, 1103);
  const moneyReads = runtime.calls.filter(xml => xml.includes("<string>account.analytic.line</string>") && xml.includes("<string>search_read</string>"));
  assert.equal(moneyReads.length, 2); assert.match(moneyReads[1], /<name>offset<\/name><value><int>1000<\/int>/);
});

test("finance HTTP exposes only exact annual financial allocations and eligible bill descriptions", async t => {
  const source = supplierRecords();
  const entries = source["account.analytic.line"];
  entries.find(row => row.id === 101).name = "Fictional consulting allocation <script>example</script>";
  entries.find(row => row.id === 102).name = "Fictional credit for this category";
  entries.find(row => row.id === 103).name = "Fictional services from another supplier";
  entries.find(row => row.id === 106).name = "Private personnel description must stay on server";
  entries.find(row => row.id === 108).name = "Private payment description must stay on server";
  entries.find(row => row.id === 109).name = "Private draft description must stay on server";
  entries.push(analytic(990, { account_id: [999, "Foreign account"], account_type: "expense", parent_state: "posted", x_plan8_id: [903, "6139 External services"], name: "Private foreign allocation" }));
  const runtime = await startRuntime({ finance: true, financeRecords: source }); t.after(() => runtime.close());
  const auth = cookie(await runtime.login());
  const response = await post(runtime, auth, { projectId: 11, lineId: 999, supplierId: 999, includePersonnel: true });
  assert.equal(response.status, 200);
  const result = await response.json();
  const detail = result.annual.find(budget => budget.id === 60).lines.find(line => line.id === 61).billDetails;
  assert.equal(detail.status, "reconciled");
  assert.equal(detail.sourceConsumed, 375); assert.equal(detail.visibleConsumed, 375); assert.equal(detail.gap, 0);
  assert.deepEqual(detail.items.map(item => item.id).sort((a, b) => a - b), [101, 102, 103]);
  assert.equal(detail.items.find(item => item.id === 102).consumed, -25);
  assert.equal(detail.items.find(item => item.id === 101).description, "Fictional consulting allocation <script>example</script>");
  assert.equal(detail.items.find(item => item.id === 101).isOrmitTalent, true);
  assert.equal(detail.items.find(item => item.id === 103).isOrmitTalent, false);
  assert.ok(detail.items.every(item => item.currencyId === 1 && !Object.hasOwn(item, "employee_id")));
  assert.doesNotMatch(JSON.stringify(result), /Private personnel|Private payment|Private draft|Private foreign|correct password|ignored-config-secret|employee_id|move_line_id/);
  const descriptionReads = runtime.calls.filter(xml => xml.includes("<string>account.analytic.line</string>") && xml.includes("<string>search_read</string>") && xml.includes("<string>name</string>"));
  assert.equal(descriptionReads.length, 1);
  assert.match(descriptionReads[0], /<string>id<\/string><\/value><value><string>in<\/string>/);
  for (const rowId of [101, 102, 103, 104, 105, 107]) assert.match(descriptionReads[0], new RegExp(`<int>${rowId}</int>`));
  for (const rowId of [106, 108, 109, 990]) assert.doesNotMatch(descriptionReads[0], new RegExp(`<int>${rowId}</int>`));
  for (const xml of runtime.calls.filter(xml => xml.includes("<methodName>execute_kw</methodName>"))) assert.match(xml, /<string>(?:fields_get|search_read)<\/string>/);
});

test("finance HTTP sanitizes optional money faults and required project faults", async t => {
  const optional = await startRuntime({ finance: true, failModel: "account.analytic.line" }); t.after(() => optional.close());
  const first = cookie(await optional.login());
  const response = await post(optional, first, { projectId: 11 }); assert.equal(response.status, 200);
  const partial = await response.json(); assert.equal(partial.lifetime.status, "unavailable"); assert.equal(partial.lifetime.consumed, null); assert.equal(partial.conventions[0].budgetedTotal, 1000);
  assert.doesNotMatch(JSON.stringify(partial), /private-upstream-secret/);
  const required = await startRuntime({ finance: true, failModel: "project.project" }); t.after(() => required.close());
  const second = cookie(await required.login());
  const failed = await post(required, second, { projectId: 11 }); assert.equal(failed.status, 502); assert.doesNotMatch(await failed.text(), /private-upstream-secret|correct password/);
});

test("finance HTTP exposes only exact posted supplier invoice and credit allocations with both purchase dimensions", async t => {
  const source = purchaseRecords();
  source["account.analytic.line"].push(analytic(990, { account_id: [999, "Foreign account"], account_type: "expense", parent_state: "posted",
    move_id: [1101, "Document 101"], name: "Private foreign purchase", x_plan7_id: [901, "Services"], x_plan8_id: [903, "6010 Services"] }));
  const runtime = await startRuntime({ finance: true, financeRecords: source, definitions: purchaseDefinitions() }); t.after(() => runtime.close());
  const auth = cookie(await runtime.login());
  const response = await post(runtime, auth, { projectId: 11, startDate: "1900-01-01", endDate: "2099-12-31", selectedYears: [2099],
    moveTypes: ["out_invoice", "entry"], domain: [], includeBwPersonnelCosts: true, purchaseIds: [104, 105, 990] });
  assert.equal(response.status, 200); const result = await response.json(), purchases = result.purchases;
  assert.equal(purchases.status, "available"); assert.equal(purchases.startDate, "2026-01-01");
  assert.deepEqual(purchases.items.map(row => row.id), [101, 112, 102, 103]);
  assert.equal(purchases.items.reduce((total, row) => total + row.consumed, 0), 500);
  assert.deepEqual(purchases.items.map(row => row.code), ["6010", "6020", "6010", "6020"]);
  assert.equal(purchases.items.find(row => row.id === 102).documentType, "in_refund");
  assert.equal(purchases.items[0].description, "Fictional consulting allocation <script>example</script>");
  assert.doesNotMatch(JSON.stringify(purchases), /Private|employee_id|move_line_id|product_uom_id|analytic_distribution|amount_total|amount_residual/);
  const documentRead = runtime.calls.find(xml => xml.includes("<string>account.move</string>") && xml.includes("<string>search_read</string>"));
  assert.match(documentRead, /<string>id<\/string><\/value><value><string>in<\/string>/);
  for (const recordId of [1101, 1102, 1103, 1106, 1107]) assert.match(documentRead, new RegExp(`<int>${recordId}</int>`));
  for (const recordId of [1105, 1108, 1109, 1110]) assert.doesNotMatch(documentRead, new RegExp(`<int>${recordId}</int>`));
  for (const field of ["state", "move_type"]) assert.match(documentRead, new RegExp(`<string>${field}</string>`));
  assert.doesNotMatch(documentRead, /<string>(?:amount_total|amount_residual|invoice_line_ids|partner_id)<\/string>/);
  const descriptions = runtime.calls.filter(xml => xml.includes("<string>account.analytic.line</string>") && xml.includes("<string>search_read</string>") && xml.includes("<string>name</string>"));
  assert.equal(descriptions.length, 1);
  const descriptionIds = /<string>id<\/string><\/value><value><string>in<\/string><\/value><value><array><data>(.*?)<\/data>/s.exec(descriptions[0])?.[1];
  assert.ok(descriptionIds);
  for (const recordId of [101, 102, 103, 112]) assert.match(descriptionIds, new RegExp(`<int>${recordId}</int>`));
  for (const recordId of [104, 105, 106, 107, 108, 109, 110, 990]) assert.doesNotMatch(descriptionIds, new RegExp(`<int>${recordId}</int>`));
  assert.equal((await runtime.request("/project-purchase-service.js", { headers: { Cookie: auth } })).status, 404);
  for (const xml of runtime.calls.filter(xml => xml.includes("<methodName>execute_kw</methodName>"))) assert.match(xml, /<string>(?:fields_get|search_read)<\/string>/);
});

test("finance HTTP keeps denied purchase-document and optional description reads sanitized and independent", async t => {
  const documentsDenied = await startRuntime({ finance: true, financeRecords: purchaseRecords(), definitions: purchaseDefinitions(), failModel: "account.move" });
  t.after(() => documentsDenied.close()); const auth = cookie(await documentsDenied.login());
  const result = await (await post(documentsDenied, auth, { projectId: 11 })).json();
  assert.equal(result.purchases.status, "unavailable"); assert.deepEqual(result.purchases.issues, ["documentUnavailable"]);
  assert.deepEqual(result.purchases.items, []); assert.equal(result.lifetime.expensesOnly.consumed, 2090);
  assert.doesNotMatch(JSON.stringify(result), /private-upstream-secret|correct password/);
  const textDenied = await startRuntime({ finance: true, financeRecords: purchaseRecords(), definitions: purchaseDefinitions(), failReadFields: { "account.analytic.line": ["name"] } });
  t.after(() => textDenied.close()); const textAuth = cookie(await textDenied.login());
  const noText = await (await post(textDenied, textAuth, { projectId: 11 })).json();
  assert.equal(noText.purchases.status, "partial"); assert.deepEqual(noText.purchases.issues, ["descriptionsMissing"]);
  assert.equal(noText.purchases.items.reduce((total, row) => total + row.consumed, 0), 500);
  assert.ok(noText.purchases.items.every(row => row.description === null));
  assert.doesNotMatch(JSON.stringify(noText), /private-upstream-secret|Private employee|secret timesheet/);
});
