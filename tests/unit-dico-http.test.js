"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const { startRuntime } = require("./steering-runtime");
const { unitFixture } = require("./unit-dico-fixture");
const { sourceKeyFor, emptyCatalogue, mergeNew } = require("../project-tags");
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
  for (const file of ["unit-dico.js", "unit-dico.css", "project-similarity.js", "project-similarity.css"]) {
    assert.equal((await runtime.request("/" + file)).status, 303);
  }
  const auth = cookie(await runtime.login()), before = runtime.calls.length;
  assert.equal((await runtime.request(route, { headers: { Cookie: auth } })).status, 405);
  assert.equal((await runtime.request(route, { method: "POST", headers: { Cookie: auth }, body: "{" })).status, 400);
  assert.equal((await runtime.request(route, { method: "POST", headers: { Cookie: auth, Origin: "https://foreign.example.invalid" }, body: "{}" })).status, 403);
  assert.equal(runtime.calls.length, before);
  for (const file of ["unit-dico.js", "unit-dico.css", "project-similarity.js", "project-similarity.css"]) {
    assert.equal((await runtime.request("/" + file, { headers: { Cookie: auth } })).status, 200);
  }
  assert.equal((await runtime.request("/unit-dico-service.js", { headers: { Cookie: auth } })).status, 404);
  for (const file of ["project-tag-view.js", "project-tags.js", "data/project-tags.json"]) {
    assert.equal((await runtime.request("/" + file, { headers: { Cookie: auth } })).status, 404);
  }
});

function installFictionalTags(runtime) {
  const config = JSON.parse(fs.readFileSync(path.join(runtime.directory, "config.local.json"), "utf8"));
  const scannedAt = "2026-10-22T08:00:00.000Z";
  const row = (id, tags) => ({ id, name: `PRIVATE_TAG_SOURCE_NAME_${id}`, code: `PRIVATE_TAG_CODE_${id}`, tags,
    scanCompleted: true, descriptionStatus: "available", descriptionCharacterCount: 300, scannedAt,
    sourceVersionId: 800000 + id, sourceVersionDate: "2026-01-01 12:00:00", sourceHash: "a".repeat(64),
    descriptionText: "PRIVATE_TAG_SOURCE_NARRATIVE", privateMetadata: "PRIVATE_TAG_EXTRA" });
  const catalogue = mergeNew(emptyCatalogue({ sourceKey: sourceKeyFor(config.odooUrl, config.database), unitId: 206,
    tagDefinitions: { bim: { en: "BIM", fr: "BIM", nl: "BIM" },
      vision: { en: "Computer vision", fr: "Vision par ordinateur", nl: "Computervisie" },
      hidden: { en: "PRIVATE_ONLY_HIDDEN", fr: "PRIVATE_ONLY_HIDDEN", nl: "PRIVATE_ONLY_HIDDEN" } } }),
    [row(11, ["bim", "vision"]), row(12, ["bim"]), row(13, ["hidden"])], { scannedAt });
  fs.mkdirSync(path.join(runtime.directory, "data"), { recursive: true });
  const file = path.join(runtime.directory, "data", "project-tags.json");
  fs.writeFileSync(file, JSON.stringify(catalogue));
  return { catalogue, file };
}

test("Unit DiCo HTTP projects include only each session's saved tag identities without description reads", async t => {
  const runtime = await startRuntime({ ...unitFixture(), disabled: true }); t.after(() => runtime.close());
  installFictionalTags(runtime);
  const first = cookie(await runtime.login()), second = cookie(await runtime.login("second@example.com"));
  const full = await (await post(runtime, first, { projectIds: [13], sourceKey: "attacker", tagMap: { projects: [13] } })).json();
  assert.deepEqual(full.tagMap, { status: "available", scannedAt: "2026-10-22T08:00:00.000Z",
    tagDefinitions: { bim: { fr: "BIM", nl: "BIM" }, vision: { fr: "Vision par ordinateur", nl: "Computervisie" } },
    projects: [{ id: 11, tags: ["bim", "vision"] }, { id: 12, tags: ["bim"] }] });
  const limited = await (await post(runtime, second, { projectIds: [11, 13] })).json();
  assert.deepEqual(limited.projects.map(project => project.id), [12]);
  assert.deepEqual(limited.tagMap.projects, [{ id: 12, tags: ["bim"] }]);
  assert.deepEqual(limited.tagMap.tagDefinitions, { bim: { fr: "BIM", nl: "BIM" } });
  assert.doesNotMatch(JSON.stringify(full.tagMap) + JSON.stringify(limited.tagMap),
    /PRIVATE_|sourceKey|sourceVersion|sourceHash|description|attacker|hidden|"name"|"code"|"en"/);
  assert.ok(!runtime.calls.some(xml => /<string>(?:description_version_ids|bw\.project\.description\.version|description)<\/string>/.test(xml)),
    "Tag display must reuse local scans without reading descriptions");
  assertReadOnly(runtime.calls);
});

test("Unit DiCo HTTP keeps project catalogue available when optional saved tags are missing, corrupt or from another source", async t => {
  const runtime = await startRuntime({ ...unitFixture(), disabled: true }); t.after(() => runtime.close());
  const auth = cookie(await runtime.login());
  const expectUnavailable = async () => {
    const response = await post(runtime, auth); assert.equal(response.status, 200);
    const result = await response.json(); assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
    assert.deepEqual(result.tagMap, { status: "unavailable", scannedAt: null, tagDefinitions: {}, projects: [] });
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_TAG_|private-upstream-secret|sourceKey|sourceVersion|sourceHash/);
  };
  await expectUnavailable();
  const { catalogue, file } = installFictionalTags(runtime);
  fs.writeFileSync(file, "{invalid catalogue"); await expectUnavailable();
  catalogue.scope.sourceKey = "https://other.example.invalid|other-db";
  fs.writeFileSync(file, JSON.stringify(catalogue)); await expectUnavailable();
  assertReadOnly(runtime.calls);
});

test("Unit DiCo HTTP projects fixed programme memberships only onto exact session-visible IDs without extra reads", async t => {
  const source = unitFixture();
  source.records["project.project"][0].display_name = "[54232014] Fictional North project";
  source.records["project.project"][1].name = "[54252043] Fictional South project";
  source.records["project.project"][2].display_name = "[56232072] Foreign unit project";
  const runtime = await startRuntime({ ...source, disabled: true }); t.after(() => runtime.close());
  const first = cookie(await runtime.login()), second = cookie(await runtime.login("second@example.com"));
  const before = runtime.calls.length;
  const response = await post(runtime, first, { programmeMap: { status: "available", programmes: [{ id: "DC2", projectIds: [13, 999] }] },
    programmeId: "DC2", projectIds: [13, 999] });
  assert.equal(response.status, 200); const full = await response.json();
  assert.deepEqual(full.programmeMap, { status: "available", programmes: [
    { id: "DC1", code: "DC1", subtitle: "Backbone", projectIds: [11] },
    { id: "DC2", code: "DC2", subtitle: "Insight", projectIds: [] },
    { id: "DC3", code: "DC3", subtitle: "Manufacturing", projectIds: [12] }
  ] });
  const firstReads = projectReads(runtime.calls.slice(before));
  assert.equal(firstReads.length, 2, "Reuse the existing unit catalogue and manager-link reads only");
  assert.ok(firstReads.every(xml => !xml.includes("<string>ilike</string>")));
  const limited = await (await post(runtime, second, { programmeMap: full.programmeMap })).json();
  assert.deepEqual(limited.programmeMap.programmes.map(p => p.projectIds), [[], [], [12]]);
  assert.deepEqual(limited.projects.map(project => project.id), [12]);
  assert.doesNotMatch(JSON.stringify(full.programmeMap) + JSON.stringify(limited.programmeMap),
    /Foreign|54232014|54252043|56232072|51232020|responsible|manager|references|999/);
  assertReadOnly(runtime.calls);
});

test("Unit DiCo HTTP retains its catalogue if the optional pure programme projection fails", async t => {
  const runtime = await startRuntime({ ...unitFixture(), disabled: true }); t.after(() => runtime.close());
  fs.appendFileSync(path.join(runtime.directory, "programme-service.js"),
    '\nmodule.exports.createProjectMap = () => { throw new Error("private-programme-projection-secret"); };\n');
  const auth = cookie(await runtime.login()), response = await post(runtime, auth);
  assert.equal(response.status, 200); const result = await response.json();
  assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
  assert.deepEqual(result.programmeMap, { status: "unavailable", programmes: [] });
  assert.doesNotMatch(JSON.stringify(result), /private-programme-projection-secret/);
  assert.equal(projectReads(runtime.calls).length, 2);
  assertReadOnly(runtime.calls);
});

test("Unit DiCo HTTP projects financing bodies only onto exact session-visible IDs", async t => {
  const source = unitFixture();
  source.definitions["project.project"].organism_id = { type: "many2one", relation: "res.partner" };
  source.definitions["project.project"].bw_partner_ids = { type: "many2many", relation: "res.partner" };
  source.definitions["res.partner"] = { id: { type: "integer" }, name: { type: "char" } };
  source.records["project.project"][0].bw_partner_ids = [501, 502];
  source.records["project.project"][1].bw_partner_ids = [502];
  source.records["project.project"][0].organism_id = [601, "Funding Alpha BE0123"];
  source.records["project.project"][1].organism_id = [602, "Funding Beta BE0456"];
  source.records["project.project"][2].organism_id = [999, "PRIVATE_FOREIGN_BODY"];
  source.records["res.partner"] = [{ id: 601, name: "Funding Alpha" }, { id: 602, name: "Funding Beta" },
    { id: 999, name: "PRIVATE_FOREIGN_BODY" }];
  const runtime = await startRuntime({ ...source, disabled: true }); t.after(() => runtime.close());
  const first = cookie(await runtime.login()), second = cookie(await runtime.login("second@example.com"));
  const response = await post(runtime, first, { organismMap: { status: "available", organisms: [
    { id: 999, name: "PRIVATE_ATTACKER_BODY", projectIds: [13] }
  ] }, organismField: "funding_type_id", projectIds: [13] });
  assert.equal(response.status, 200); const full = await response.json();
  assert.deepEqual(full.organismMap, { status: "available", organisms: [
    { id: 601, name: "Funding Alpha", projectIds: [11] },
    { id: 602, name: "Funding Beta", projectIds: [12] }
  ] });
  const limited = await (await post(runtime, second, { organismMap: full.organismMap })).json();
  assert.deepEqual(limited.projects.map(project => project.id), [12]);
  assert.deepEqual(limited.organismMap, { status: "unavailable", organisms: [] },
    "Denied body-name visibility fails closed without losing the unit catalogue");
  assert.doesNotMatch(JSON.stringify(full.organismMap) + JSON.stringify(limited.organismMap), /PRIVATE_|999|Foreign|BE0123|BE0456/);
  assert.deepEqual(full.partnerMap, { status: "unavailable", partners: [] });
  assert.ok(!runtime.calls.some(xml => xml.includes("<string>bw_partner_ids</string>") || xml.includes("<string>funding_type_id</string>")));
  const bodyReads = projectReads(runtime.calls).filter(xml => xml.includes("<string>organism_id</string>"));
  assert.equal(bodyReads.length, 2);
  assert.ok(bodyReads.every(xml => /<string>id<\/string><\/value><value><string>in<\/string>/.test(xml)
    && /<string>lead_unit_id<\/string><\/value><value><string>=<\/string><\/value><value><int>206<\/int>/.test(xml)));
  const nameReads = runtime.calls.filter(xml => xml.includes("<string>res.partner</string>") && xml.includes("<string>search_read</string>"));
  assert.equal(nameReads.length, 2); assert.ok(nameReads.every(xml => !xml.includes("<string>ilike</string>")));
  assert.match(nameReads[0], /<string>id<\/string><\/value><value><string>in<\/string>.*<int>601<\/int>.*<int>602<\/int>/s);
  assert.match(nameReads[1], /<string>id<\/string><\/value><value><string>in<\/string>.*<int>602<\/int>/s);
  assertReadOnly(runtime.calls);
});

test("Unit DiCo HTTP keeps the catalogue when optional financing metadata is denied", async t => {
  const source = unitFixture();
  source.definitions["project.project"].organism_id = { type: "many2one", relation: "res.partner" };
  source.records["project.project"][0].organism_id = [601, "Funding Alpha"];
  const runtime = await startRuntime({ ...source, disabled: true,
    failReadFields: { "project.project": ["organism_id"] } }); t.after(() => runtime.close());
  const auth = cookie(await runtime.login()), response = await post(runtime, auth);
  assert.equal(response.status, 200); const result = await response.json();
  assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
  assert.deepEqual(result.organismMap, { status: "unavailable", organisms: [] });
  assertReadOnly(runtime.calls);
});

test("Unit DiCo HTTP refreshes financing-body labels and memberships on each catalogue request", async t => {
  const source = unitFixture();
  source.definitions["project.project"].organism_id = { type: "many2one", relation: "res.partner" };
  source.definitions["res.partner"] = { id: { type: "integer" }, name: { type: "char" } };
  source.records["project.project"][0].organism_id = [601, "Funding Alpha"];
  source.records["project.project"][1].organism_id = false;
  source.records["res.partner"] = [{ id: 601, name: "Funding Alpha" }];
  const runtime = await startRuntime({ ...source, disabled: true }); t.after(() => runtime.close());
  const auth = cookie(await runtime.login());
  const first = await (await post(runtime, auth)).json();
  assert.deepEqual(first.organismMap, { status: "available", organisms: [
    { id: 601, name: "Funding Alpha", projectIds: [11] }
  ] });
  source.records["project.project"][1].organism_id = [601, "Funding Alpha"];
  source.records["res.partner"][0].name = "Funding Alpha renamed";
  const refreshed = await (await post(runtime, auth)).json();
  assert.deepEqual(refreshed.organismMap, { status: "available", organisms: [
    { id: 601, name: "Funding Alpha renamed", projectIds: [11, 12] }
  ] });
  assertReadOnly(runtime.calls);
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
