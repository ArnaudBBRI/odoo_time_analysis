"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { startRuntime } = require("./steering-runtime");
const route = "/api/odoo/programmes-catalogue";
const cookie = response => response.headers.get("set-cookie").split(";")[0];
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ekAAAAASUVORK5CYII=";
const post = (runtime, auth, body = {}) => runtime.request(route, {
  method: "POST", headers: { Cookie: auth, "Content-Type": "application/json" }, body: JSON.stringify(body)
});
function source() {
  return { disabled: true,
    definitions: { "res.users": { id: { type: "integer" }, name: { type: "char" }, image_128: { type: "binary" } } },
    records: { "res.users": [
      { id: 21, name: "Pauline Dewez", image_128: png },
      { id: 22, name: "Lonfils Timothee", image_128: png, project_id: [12, "Only second account may see"] },
      { id: 23, name: "Denis François", image_128: png },
      { id: 99, name: "Foreign person", image_128: png }
    ] }
  };
}
function assertReadOnly(calls) {
  const executions = calls.filter(xml => xml.includes("<methodName>execute_kw</methodName>"));
  assert.ok(executions.every(xml => /<string>(?:fields_get|search_read)<\/string>/.test(xml)));
  assert.ok(executions.every(xml => xml.includes("<string>res.users</string>")));
  assert.ok(!calls.some(xml => /<string>(?:create|write|unlink|copy|action_[^<]*|hr\.employee|hr\.employee\.public|project\.project|account\.analytic\.line|planning\.slot|budget\.analytic)<\/string>/.test(xml)));
}

test("programme catalogue/assets require authentication; method, origin and nonempty input fail before RPC", async t => {
  const runtime = await startRuntime(source()); t.after(() => runtime.close());
  assert.equal((await runtime.request(route, { method: "POST", body: "{}" })).status, 401);
  assert.equal(runtime.calls.length, 0);
  for (const asset of ["programme-browser.js", "programme-browser.css"]) assert.equal((await runtime.request("/" + asset)).status, 303);
  const auth = cookie(await runtime.login()), before = runtime.calls.length;
  assert.equal((await runtime.request(route, { headers: { Cookie: auth } })).status, 405);
  assert.equal((await runtime.request(route, { method: "POST", headers: { Cookie: auth }, body: "{" })).status, 400);
  assert.equal((await runtime.request(route, { method: "POST", headers: { Cookie: auth, Origin: "https://foreign.example.invalid" }, body: "{}" })).status, 403);
  for (const body of [null, [], "names", { names: ["Foreign person"] }, { uid: 8 }, { username: "attacker", apiKey: "attacker-secret" }, { model: "hr.employee", domain: [] }]) {
    assert.equal((await post(runtime, auth, body)).status, 400);
  }
  assert.equal(runtime.calls.length, before);
  for (const asset of ["programme-browser.js", "programme-browser.css"]) assert.equal((await runtime.request("/" + asset, { headers: { Cookie: auth } })).status, 200);
  assert.equal((await runtime.request("/programme-service.js", { headers: { Cookie: auth } })).status, 404);
});

test("fixed catalogue returns safe exact-name portraits independently of legacy steering, years and configuration", async t => {
  const runtime = await startRuntime(source()); t.after(() => runtime.close());
  const response = await post(runtime, cookie(await runtime.login()));
  assert.equal(response.status, 200); const result = await response.json();
  assert.deepEqual(result.programmes.map(p => [p.id, p.subtitle, p.catchphrase, p.manager.id]), [
    ["DC1", "Backbone", "To Structure", 21], ["DC2", "Insight", "To Act", 22], ["DC3", "Manufacturing", "To Make", 23]
  ]);
  assert.deepEqual(result.programmes.map(p => p.manager.name), ["Pauline Dewez", "Timothée Lonfils", "François Denis"]);
  assert.ok(result.programmes.every(p => p.manager.photoDataUrl === `data:image/png;base64,${png}`));
  const queries = runtime.calls.filter(xml => xml.includes("<string>search_read</string>"));
  assert.equal(queries.length, 2); assert.match(queries[0], /<string>=ilike<\/string>/);
  assert.ok(!queries[0].includes("<string>image_128</string>"));
  assert.match(queries[1], /<string>id<\/string><\/value><value><string>in<\/string>/);
  assert.match(queries[1], /<int>21<\/int><\/value><value><int>22<\/int><\/value><value><int>23<\/int>/);
  assert.ok(queries.every(xml => xml.includes("<name>active_test</name><value><boolean>0</boolean>")));
  assert.doesNotMatch(JSON.stringify(result), /Foreign person|ignored-config-secret|correct password|Only second/);
  assertReadOnly(runtime.calls);
});

test("responsible photos respect the current session visibility", async t => {
  const runtime = await startRuntime(source()); t.after(() => runtime.close());
  const first = cookie(await runtime.login()), second = cookie(await runtime.login("second@example.com"));
  const full = await (await post(runtime, first)).json(), limited = await (await post(runtime, second)).json();
  assert.deepEqual(full.programmes.map(p => p.manager.id), [21, 22, 23]);
  assert.deepEqual(limited.programmes.map(p => p.manager.id), [null, 22, null]);
  assert.equal(limited.programmes.length, 3);
  assert.deepEqual(limited.programmes.map(p => Boolean(p.manager.photoDataUrl)), [false, true, false]);
  assertReadOnly(runtime.calls);
});

test("denied identity/image access and unsafe image data retain the three fixed cards without fault leakage", async t => {
  for (const options of [{ failModel: "res.users" }, { failReadFields: { "res.users": ["image_128"] } }]) {
    const runtime = await startRuntime({ ...source(), ...options }); t.after(() => runtime.close());
    const response = await post(runtime, cookie(await runtime.login()));
    assert.equal(response.status, 200); const result = await response.json();
    assert.equal(result.programmes.length, 3); assert.ok(result.programmes.every(p => p.manager.photoDataUrl === null));
    assert.deepEqual(result.programmes.map(p => p.manager.id), options.failModel ? [null, null, null] : [21, 22, 23]);
    assert.doesNotMatch(JSON.stringify(result), /private-upstream-secret|correct password|ignored-config-secret/);
    assertReadOnly(runtime.calls);
  }
  const fixture = source();
  fixture.records["res.users"][0].image_128 = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>").toString("base64");
  fixture.records["res.users"][1].image_128 = "https://foreign.example.invalid/photo.png";
  fixture.records["res.users"][2].image_128 = false;
  const unsafe = await startRuntime(fixture); t.after(() => unsafe.close());
  const result = await (await post(unsafe, cookie(await unsafe.login()))).json();
  assert.deepEqual(result.programmes.map(p => p.manager.id), [21, 22, 23]);
  assert.ok(result.programmes.every(p => p.manager.photoDataUrl === null));
  assert.doesNotMatch(JSON.stringify(result), /svg|foreign\.example/);
  assertReadOnly(unsafe.calls);
});

test("ambiguous or substring-only responsible records cannot supply a wrong profile picture", async t => {
  const fixture = source();
  fixture.records["res.users"].push({ id: 29, name: "Dewez Pauline", image_128: png });
  fixture.records["res.users"][2].name = "François Denis Jr";
  const runtime = await startRuntime(fixture); t.after(() => runtime.close());
  const result = await (await post(runtime, cookie(await runtime.login()))).json();
  assert.deepEqual(result.programmes.map(p => p.manager.id), [null, 22, null]);
  assert.deepEqual(result.programmes.map(p => Boolean(p.manager.photoDataUrl)), [false, true, false]);
  const imageQuery = runtime.calls.find(xml => xml.includes("<string>image_128</string>") && xml.includes("<string>search_read</string>"));
  assert.match(imageQuery, /<value><int>22<\/int><\/value>/);
  assert.doesNotMatch(imageQuery, /<value><int>(?:21|23|29|99)<\/int><\/value>/);
  assertReadOnly(runtime.calls);
});

test("changed reauthentication UID fails before any person metadata or photo query", async t => {
  let authentications = 0;
  const runtime = await startRuntime({ ...source(), authenticate: () => ++authentications === 1 ? 7 : 8 }); t.after(() => runtime.close());
  const auth = cookie(await runtime.login()), before = runtime.calls.length;
  const response = await post(runtime, auth);
  assert.equal(response.status, 401); assert.equal((await response.json()).authenticationRequired, true);
  assert.ok(runtime.calls.slice(before).every(xml => !xml.includes("<methodName>execute_kw</methodName>")));
});

const projectsRoute = "/api/odoo/programme-projects";
const postProjects = (runtime, auth, body = { programmeId: "DC3" }) => runtime.request(projectsRoute, {
  method: "POST", headers: { Cookie: auth, "Content-Type": "application/json" }, body: JSON.stringify(body)
});
function projectSource() {
  const fixture = source();
  fixture.definitions["project.project"] = { id: { type: "integer" }, name: { type: "char" }, display_name: { type: "char" },
    date_start: { type: "date" }, date: { type: "date" }, user_id: { type: "many2one", relation: "res.users" },
    total_budget_convention: { type: "monetary", currency_field: "currency_id" }, currency_id: { type: "many2one", relation: "res.currency" } };
  fixture.records["project.project"] = [
    { id: 12, name: "[eXtRAI] [54252043] Fictional Extrai", display_name: "[eXtRAI] [54252043] Fictional Extrai",
      date_start: "2025-12-01", date: "2028-12-31", user_id: [21, "Pauline Dewez"],
      total_budget_convention: 123456.78, currency_id: [1, "EUR"], lead_unit_id: [207, "Another responsible unit"] },
    { id: 31, name: "[Renolab] [56232072] Fictional Renolab", display_name: "[Renolab] [56232072] Fictional Renolab",
      date_start: "2023-01-01", date: "2025-12-31", user_id: [23, "François Denis"],
      total_budget_convention: 0, currency_id: [1, "EUR"], lead_unit_id: [207, "Another responsible unit"] },
    { id: 99, name: "[Foreign] [99999999] Unlisted project", display_name: "[Foreign] [99999999] Unlisted project",
      date_start: "1900-01-01", date: "2999-12-31", user_id: [99, "Foreign person"], total_budget_convention: 99999999 }
  ];
  return fixture;
}
function assertProjectReads(calls) {
  for (const xml of calls.filter(call => call.includes("<methodName>execute_kw</methodName>"))) {
    assert.match(xml, /<string>(?:fields_get|search_read)<\/string>/);
    assert.match(xml, /<string>(?:project\.project|res\.users)<\/string>/);
  }
  assert.ok(!calls.some(xml => /<string>(?:create|write|unlink|copy|action_[^<]*|hr\.employee|hr\.employee\.public|account\.analytic\.line|planning\.slot|budget\.analytic|lead_unit_id)<\/string>/.test(xml)));
}

test("programme project input rejects unknown programmes and every caller override before RPC", async t => {
  const runtime = await startRuntime(projectSource()); t.after(() => runtime.close());
  assert.equal((await runtime.request(projectsRoute, { method: "POST", body: '{"programmeId":"DC3"}' })).status, 401);
  assert.equal(runtime.calls.length, 0);
  const auth = cookie(await runtime.login()), before = runtime.calls.length;
  assert.equal((await runtime.request(projectsRoute, { headers: { Cookie: auth } })).status, 405);
  assert.equal((await runtime.request(projectsRoute, { method: "POST", headers: { Cookie: auth }, body: "{" })).status, 400);
  assert.equal((await runtime.request(projectsRoute, { method: "POST", headers: { Cookie: auth, Origin: "https://foreign.example.invalid" }, body: '{"programmeId":"DC3"}' })).status, 403);
  for (const body of [null, [], {}, { programmeId: "OTHER" }, { programmeId: "dc3" }, { programmeId: 3 },
    { programmeId: "DC3", projectIds: [99] }, { programmeId: "DC3", unitId: 207 },
    { programmeId: "DC3", domain: [] }, { programmeId: "DC3", username: "attacker", apiKey: "attacker-secret" }]) {
    assert.equal((await postProjects(runtime, auth, body)).status, 400);
  }
  assert.equal(runtime.calls.length, before);
});

test("programme projects resolve fixed codes and exact IDs with dates, budgets and safe manager portraits beyond department 206", async t => {
  const runtime = await startRuntime(projectSource()); t.after(() => runtime.close());
  const response = await postProjects(runtime, cookie(await runtime.login()));
  assert.equal(response.status, 200); const result = await response.json();
  assert.deepEqual(new Set(result.projects.map(project => project.id)), new Set([12, 31]));
  assert.equal(result.programme.id, "DC3"); assert.equal(result.coverage.expected, 5); assert.equal(result.coverage.matched, 2);
  assert.equal(result.coverage.missing.length, 3); assert.deepEqual(result.coverage.ambiguous, []);
  const extrai = result.projects.find(project => project.id === 12), renolab = result.projects.find(project => project.id === 31);
  assert.deepEqual([extrai.startDate, extrai.endDate], ["2025-12-01", "2028-12-31"]);
  assert.deepEqual(extrai.totalBudget, { amount: 123456.78, currencyId: 1, currency: "EUR" });
  assert.equal(renolab.totalBudget.amount, 0); assert.equal(extrai.manager.name, "Pauline Dewez");
  assert.ok(result.projects.every(project => project.manager.photoDataUrl === `data:image/png;base64,${png}`));
  const projectQueries = runtime.calls.filter(xml => xml.includes("<string>project.project</string>") && xml.includes("<string>search_read</string>"));
  const searches = projectQueries.filter(xml => xml.includes("<string>ilike</string>"));
  assert.equal(searches.length, 2);
  for (const xml of searches) {
    for (const code of ["56232072", "56242022", "54252043", "55232032", "62261858"]) assert.ok(xml.includes(`<string>${code}</string>`));
    assert.ok(!xml.includes("<string>99999999</string>"));
  }
  for (const xml of projectQueries.filter(xml => !xml.includes("<string>ilike</string>"))) {
    assert.match(xml, /<string>id<\/string><\/value><value><string>in<\/string>/);
    assert.doesNotMatch(xml, /<value><int>99<\/int><\/value>/);
  }
  assert.doesNotMatch(JSON.stringify(result), /Unlisted project|Foreign person|Another responsible unit|ignored-config-secret|correct password|99999999/);
  assertProjectReads(runtime.calls);
});

test("programme project membership follows account visibility and does not replace unavailable references", async t => {
  const runtime = await startRuntime(projectSource()); t.after(() => runtime.close());
  const auth = cookie(await runtime.login("second@example.com"));
  const result = await (await postProjects(runtime, auth)).json();
  assert.deepEqual(result.projects.map(project => project.id), [12]);
  assert.equal(result.coverage.expected, 5); assert.equal(result.coverage.matched, 1); assert.equal(result.coverage.missing.length, 4);
  assert.match(result.warnings.join(" "), /données accessibles/);
  assertProjectReads(runtime.calls);
});

test("programme project ambiguity cannot select an arbitrary project sharing a business number", async t => {
  const fixture = projectSource(); fixture.records["project.project"].push({ ...fixture.records["project.project"][0], id: 13, name: "[54252043] Duplicate Extrai" });
  const runtime = await startRuntime(fixture); t.after(() => runtime.close());
  const result = await (await postProjects(runtime, cookie(await runtime.login()))).json();
  assert.deepEqual(result.projects.map(project => project.id), [31]);
  assert.deepEqual(result.coverage.ambiguous.map(reference => reference.code), ["54252043"]);
  assert.match(result.warnings.join(" "), /ambigu/); assert.doesNotMatch(JSON.stringify(result), /Duplicate Extrai/);
  assertProjectReads(runtime.calls);
});

test("optional programme dates and budget denial preserve names and managers with honest unknown values", async t => {
  const runtime = await startRuntime({ ...projectSource(), failReadFields: { "project.project": ["date_start", "total_budget_convention"] } });
  t.after(() => runtime.close());
  const response = await postProjects(runtime, cookie(await runtime.login()));
  assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.projects.length, 2); assert.ok(result.projects.every(project => project.startDate === null && project.endDate && project.manager));
  assert.ok(result.projects.every(project => project.totalBudget.amount === null && project.totalBudget.currency === "EUR"));
  assert.match(result.warnings.join(" "), /dates/); assert.doesNotMatch(JSON.stringify(result), /private-upstream-secret/);
  assertProjectReads(runtime.calls);
});

test("required programme project failures stay sanitized and changed UID stops before any catalogue read", async t => {
  const failed = await startRuntime({ ...projectSource(), failModel: "project.project" }); t.after(() => failed.close());
  const response = await postProjects(failed, cookie(await failed.login()));
  assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /private-upstream-secret|correct password|ignored-config-secret/);
  let authentications = 0;
  const changed = await startRuntime({ ...projectSource(), authenticate: () => ++authentications === 1 ? 7 : 8 }); t.after(() => changed.close());
  const auth = cookie(await changed.login()), before = changed.calls.length;
  const rejected = await postProjects(changed, auth);
  assert.equal(rejected.status, 401); assert.equal((await rejected.json()).authenticationRequired, true);
  assert.ok(changed.calls.slice(before).every(xml => !xml.includes("<methodName>execute_kw</methodName>")));
});
