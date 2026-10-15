"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { startRuntime } = require("./steering-runtime");
const { unitFixture } = require("./unit-dico-fixture");
const route = "/api/odoo/unit-dico-projects";
const cookie = response => response.headers.get("set-cookie").split(";")[0];
const post = (runtime, auth, body = {}) => runtime.request(route, {
  method: "POST", headers: { Cookie: auth, "Content-Type": "application/json" }, body: JSON.stringify(body)
});
const projectReads = calls => calls.filter(xml => xml.includes("<string>project.project</string>") && xml.includes("<string>search_read</string>"));
function assertReadOnly(calls) {
  for (const xml of calls.filter(xml => xml.includes("<methodName>execute_kw</methodName>"))) {
    assert.match(xml, /<string>(?:fields_get|search_read)<\/string>/);
    assert.doesNotMatch(xml, /<string>(?:create|write|unlink|copy|action_[^<]*)<\/string>/);
  }
}

test("Unit DiCo HTTP protects catalogue/assets and rejects method, origin and invalid JSON before RPC", async t => {
  const runtime = await startRuntime({ ...unitFixture(), disabled: true }); t.after(() => runtime.close());
  assert.equal((await runtime.request(route, { method: "POST", body: "{}" })).status, 401);
  assert.equal(runtime.calls.length, 0);
  for (const file of ["unit-dico.js", "unit-dico.css"]) {
    assert.equal((await runtime.request("/" + file)).status, 303);
  }
  const auth = cookie(await runtime.login()), before = runtime.calls.length;
  assert.equal((await runtime.request(route, { headers: { Cookie: auth } })).status, 405);
  assert.equal((await runtime.request(route, { method: "POST", headers: { Cookie: auth }, body: "{" })).status, 400);
  assert.equal((await runtime.request(route, { method: "POST", headers: { Cookie: auth, Origin: "https://foreign.example.invalid" }, body: "{}" })).status, 403);
  assert.equal(runtime.calls.length, before);
  for (const file of ["unit-dico.js", "unit-dico.css"]) {
    assert.equal((await runtime.request("/" + file, { headers: { Cookie: auth } })).status, 200);
  }
  assert.equal((await runtime.request("/unit-dico-service.js", { headers: { Cookie: auth } })).status, 404);
});

test("Unit DiCo HTTP uses fixed confirmed department and session visibility independently of disabled steering or overrides", async t => {
  const runtime = await startRuntime({ ...unitFixture(), disabled: true }); t.after(() => runtime.close());
  const first = cookie(await runtime.login()), second = cookie(await runtime.login("second@example.com"));
  const response = await post(runtime, first, { uid: 8, unitId: 207, departmentId: 207, responsibleField: "foreign_id",
    unitDomain: [["id", "=", 13]], pilotage: { unitConfirmed: true }, username: "attacker", apiKey: "attacker-key",
    odooUrl: "https://foreign.example.invalid", database: "attacker", selectedYears: [1900], projectId: 13 });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.ok, true); assert.equal(result.unit.id, 206); assert.equal(result.responsibleField, "lead_unit_id");
  assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
  assert.deepEqual(result.projects.map(project => [project.startDate, project.endDate]), [["2025-12-01", "2028-05-31"], ["2026-02-01", "2027-06-30"]]);
  assert.ok(result.projects.every(project => project.manager?.name));
  assert.deepEqual(result.warnings, []);
  const limited = await (await post(runtime, second, { uid: 7, unitId: 206 })).json();
  assert.deepEqual(limited.projects.map(project => project.id), [12]);
  assert.doesNotMatch(JSON.stringify(result) + JSON.stringify(limited), /Foreign unit|Interne|Overhead|Foreign manager|Hidden manager|correct password|ignored-config-secret|attacker-key/);
  assert.ok(!runtime.calls.some(xml => /<string>(?:attacker-key|attacker|foreign_id)<\/string>/.test(xml)));
  const catalogue = projectReads(runtime.calls).find(xml => xml.includes("<string>date_start</string>"));
  assert.match(catalogue, /<string>lead_unit_id<\/string><\/value><value><string>=<\/string><\/value><value><int>206<\/int>/);
  assert.match(catalogue, /<name>active_test<\/name><value><boolean>0<\/boolean>/);
  assert.match(catalogue, /<name>lang<\/name><value><string>en_US<\/string>/);
  assert.ok(!runtime.calls.some(xml => /<string>(?:account\.analytic\.line|planning\.slot|budget\.analytic|bw\.staffing\.convention)<\/string>/.test(xml)));
  assertReadOnly(runtime.calls);
});

test("Unit DiCo HTTP paginates large accessible catalogues and applies department/pseudo-project postfilters", async t => {
  const source = unitFixture();
  source.records["project.project"] = Array.from({ length: 1103 }, (_, index) => ({ id: index + 100, name: `Fictional project ${String(index).padStart(4, "0")}`,
    lead_unit_id: [206, "Fictional DiCo"], date_start: "2025-01-01", date: "2028-12-31", user_id: false }));
  source.records["project.project"].push(
    { id: 9000, name: "Foreign unit project", lead_unit_id: [207, "Fictional DiCo"], date_start: "1900-01-01", date: "2200-01-01" },
    { id: 9001, name: "Interne", lead_unit_id: [206, "Fictional DiCo"], date_start: "1900-01-01", date: "2200-01-01" }
  );
  const runtime = await startRuntime({ ...source, disabled: true }); t.after(() => runtime.close());
  const auth = cookie(await runtime.login()), response = await post(runtime, auth);
  assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.projects.length, 1103);
  assert.ok(result.projects.every(project => project.id >= 100 && project.id < 1203));
  const catalogue = projectReads(runtime.calls).filter(xml => xml.includes("<string>date_start</string>"));
  assert.equal(catalogue.length, 2); assert.match(catalogue[1], /<name>offset<\/name><value><int>1000<\/int>/);
  assertReadOnly(runtime.calls);
});

test("Unit DiCo HTTP retains known dates and project names when optional fields or manager photos are unavailable", async t => {
  const source = unitFixture(); delete source.definitions["project.project"].date_start;
  const runtime = await startRuntime({ ...source, disabled: true, failModel: "res.users" }); t.after(() => runtime.close());
  const auth = cookie(await runtime.login()), response = await post(runtime, auth);
  assert.equal(response.status, 200); const result = await response.json();
  assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
  assert.ok(result.projects.every(project => project.startDate === null && project.endDate));
  assert.ok(result.projects.every(project => project.manager?.name && project.manager.photoDataUrl === null));
  assert.match(result.warnings.join(" "), /dates absentes, invalides ou indisponibles/);
  assert.ok(!projectReads(runtime.calls)[0].includes("<string>date_start</string>"));
  assert.doesNotMatch(JSON.stringify(result), /private-upstream-secret|correct password/);
  assertReadOnly(runtime.calls);
});

test("Unit DiCo HTTP sanitizes required catalogue errors and refuses an unverified unit relation", async t => {
  const denied = await startRuntime({ ...unitFixture(), disabled: true, failModel: "project.project" }); t.after(() => denied.close());
  const auth = cookie(await denied.login()), response = await post(denied, auth);
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private-upstream-secret|correct password|ignored-config-secret/);
  assertReadOnly(denied.calls);
  const source = unitFixture(); source.definitions["project.project"].lead_unit_id.relation = "res.company";
  const unsupported = await startRuntime({ ...source, disabled: true }); t.after(() => unsupported.close());
  const second = cookie(await unsupported.login()), failed = await post(unsupported, second);
  assert.equal(failed.status, 502); assert.equal(projectReads(unsupported.calls).length, 0);
});

test("Unit DiCo HTTP recovers the catalogue after an optional date permission denial", async t => {
  const runtime = await startRuntime({ ...unitFixture(), disabled: true, failReadFields: { "project.project": ["date_start"] } }); t.after(() => runtime.close());
  const auth = cookie(await runtime.login()), response = await post(runtime, auth);
  assert.equal(response.status, 200); const result = await response.json();
  assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
  assert.ok(result.projects.every(project => project.startDate === null && project.endDate));
  assert.match(result.warnings.join(" "), /informations facultatives.*indisponibles/);
  assert.doesNotMatch(JSON.stringify(result), /private-upstream-secret/);
  const datedRecovery = projectReads(runtime.calls).find(xml => xml.includes("<string>date</string>") && !xml.includes("<string>date_start</string>"));
  assert.match(datedRecovery, /<string>id<\/string><\/value><value><string>in<\/string>/);
  assert.match(datedRecovery, /<string>lead_unit_id<\/string><\/value><value><string>=<\/string><\/value><value><int>206<\/int>/);
  assertReadOnly(runtime.calls);
});

test("Unit DiCo HTTP rejects reauthenticated UID changes before any project metadata/read", async t => {
  let authentications = 0;
  const runtime = await startRuntime({ ...unitFixture(), disabled: true, authenticate: () => ++authentications === 1 ? 7 : 8 }); t.after(() => runtime.close());
  const auth = cookie(await runtime.login()), before = runtime.calls.length;
  const response = await post(runtime, auth);
  assert.equal(response.status, 401); assert.equal((await response.json()).authenticationRequired, true);
  assert.ok(runtime.calls.slice(before).every(xml => !xml.includes("<methodName>execute_kw</methodName>")));
});

function unitBudgetFixture() {
  const source = unitFixture();
  Object.assign(source.definitions["project.project"], {
    total_budget_convention: { type: "monetary", currency_field: "currency_id" },
    currency_id: { type: "many2one", relation: "res.currency" }
  });
  for (const row of source.records["project.project"]) {
    row.total_budget_convention = row.id === 11 ? 234567.89 : row.id === 12 ? 0 : 99999999;
    row.currency_id = row.id === 11 ? [1, "EUR"] : row.id === 12 ? [2, "USD"] : [99, "Foreign currency"];
  }
  return source;
}

test("Unit DiCo HTTP projects carry exact lifetime macro totals/currencies without broad financial reads or caller overrides", async t => {
  const runtime = await startRuntime({ ...unitBudgetFixture(), disabled: true }); t.after(() => runtime.close());
  const auth = cookie(await runtime.login());
  const response = await post(runtime, auth, { budgetField: "private_field", currencyField: "private_currency",
    projectIds: [13, 14], domain: [["id", "in", [13, 14]]], totalBudget: 99999999 });
  assert.equal(response.status, 200); const result = await response.json();
  assert.deepEqual(result.projects.map(project => [project.id, project.totalBudget]), [
    [11, { amount: 234567.89, currencyId: 1, currency: "EUR" }], [12, { amount: 0, currencyId: 2, currency: "USD" }]
  ]);
  assert.ok(result.projects.every(project => project.startDate && project.endDate && project.manager?.name));
  const queries = projectReads(runtime.calls).filter(xml => xml.includes("<string>total_budget_convention</string>"));
  assert.equal(queries.length, 1);
  assert.match(queries[0], /<string>id<\/string><\/value><value><string>in<\/string>/);
  assert.match(queries[0], /<string>lead_unit_id<\/string><\/value><value><string>=<\/string><\/value><value><int>206<\/int>/);
  assert.match(queries[0], /<int>11<\/int><\/value><value><int>12<\/int>/);
  assert.ok(runtime.calls.some(xml => xml.includes("<string>fields_get</string>") && xml.includes("<string>currency_field</string>")),
    "The source's monetary binding must be requested in metadata");
  assert.doesNotMatch(JSON.stringify(result), /99999999|Foreign currency|private_field|private_currency|correct password/);
  assert.ok(!runtime.calls.some(xml => /<string>(?:account\.analytic\.line|planning\.slot|budget\.analytic|budget_staffing_convention_hours)<\/string>/.test(xml)));
  assertReadOnly(runtime.calls);
});

test("Unit DiCo HTTP retains dates/managers and known optional budget counterparts after amount or currency denial", async t => {
  for (const denied of ["total_budget_convention", "currency_id"]) {
    const runtime = await startRuntime({ ...unitBudgetFixture(), disabled: true, failReadFields: { "project.project": [denied] } });
    t.after(() => runtime.close());
    const response = await post(runtime, cookie(await runtime.login()));
    assert.equal(response.status, 200); const result = await response.json();
    assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
    assert.deepEqual(result.projects[0].totalBudget, denied === "total_budget_convention"
      ? { amount: null, currencyId: 1, currency: "EUR" } : { amount: 234567.89, currencyId: null, currency: null });
    assert.ok(result.projects.every(project => project.startDate && project.endDate && project.manager?.name));
    assert.doesNotMatch(JSON.stringify(result), /private-upstream-secret|Foreign currency|99999999/);
    assertReadOnly(runtime.calls);
  }
});

test("Unit DiCo HTTP does not attach currency_id to a total using a conflicting monetary binding", async t => {
  const source = unitBudgetFixture(); source.definitions["project.project"].total_budget_convention.currency_field = "company_currency_id";
  source.definitions["project.project"].company_currency_id = { type: "many2one", relation: "res.currency" };
  const runtime = await startRuntime({ ...source, disabled: true }); t.after(() => runtime.close());
  const result = await (await post(runtime, cookie(await runtime.login()))).json();
  assert.deepEqual(result.projects[0].totalBudget, { amount: 234567.89, currencyId: null, currency: null });
  const query = projectReads(runtime.calls).find(xml => xml.includes("<string>total_budget_convention</string>"));
  assert.ok(!query.includes("<string>currency_id</string>"));
  assert.ok(!query.includes("<string>company_currency_id</string>"));
  assertReadOnly(runtime.calls);
});
