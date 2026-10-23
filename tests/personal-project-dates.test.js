"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const serverPath = path.join(__dirname, "..", "server.js");
const source = fs.readFileSync(serverPath, "utf8");
const plain = value => JSON.parse(JSON.stringify(value));

function loadServer() {
  const server = { listen(_, host, callback) { assert.equal(host, "127.0.0.1"); callback(); },
    address() { return { port: 8765 }; }, on() {} };
  const context = vm.createContext({ __dirname: path.dirname(serverPath), process: { env: {} },
    console: { log() {}, error() {} }, URL, AbortController, Buffer,
    require(name) {
      if (["crypto", "async_hooks", "path"].includes(name)) return require(name);
      if (["./steering-service", "./project-finance-service", "./unit-dico-service", "./project-tag-view"].includes(name)) {
        return require(path.join(path.dirname(serverPath), name));
      }
      if (name === "http") return { createServer: () => server };
      if (name === "fs") return { existsSync: () => false,
        readFileSync() { throw new Error("Offline tests must not read local configuration"); } };
      throw new Error(`Unexpected server dependency: ${name}`);
    },
    setTimeout() { throw new Error("Offline tests must not start request timers"); }, clearTimeout() {},
    fetch() { throw new Error("Offline tests must not contact Odoo"); }
  });
  vm.runInContext(source, context, { filename: serverPath, timeout: 1000 });
  return context;
}

function datesFixture(options = {}) {
  const context = loadServer(), calls = [];
  const definitions = options.definitions === undefined
    ? { date_start: { type: "date" }, date: { type: "datetime" } } : options.definitions;
  context.getModelFields = async (...args) => {
    calls.push({ method: "fields_get", model: args[4] });
    if (options.metadataDenied) throw new Error("private-upstream-secret");
    return definitions;
  };
  context.searchReadAll = async (...args) => {
    const [model, domain, fields, readOptions] = args.slice(4);
    calls.push({ method: "search_read", model, domain: plain(domain), fields: plain(fields), options: plain(readOptions) });
    if (fields.some(field => options.deniedFields?.includes(field))) throw new Error("private-upstream-secret");
    // Deliberately over-return IDs and columns to verify local identity/column projection.
    return options.rows || [
      { id: 11, date_start: "2025-12-01", date: "2028-05-31 17:30:00", password: "private-upstream-secret" },
      { id: 12, date_start: "2024-02-29", date: "2026-12-31", password: "private-upstream-secret" },
      { id: 99, date_start: "1900-01-01", date: "2200-01-01", password: "foreign-project-secret" }
    ];
  };
  const projects = new Map([[11, { id: 11, name: "Own project", manager: { id: 501, name: "Manager" } }],
    [12, { id: 12, name: "Planning project", manager: null }]]);
  return { context, calls, projects, read: () => context.enrichPersonalProjectDates(["fixture.invalid", "fixture", 7, "fixture-key"], projects) };
}

test("personal lifetime dates use one confirmed batched exact-ID read and preserve catalogue/manager fields", async () => {
  const fixture = datesFixture(); await fixture.read();
  assert.deepEqual([...fixture.projects.values()], [
    { id: 11, name: "Own project", manager: { id: 501, name: "Manager" }, startDate: "2025-12-01", endDate: "2028-05-31" },
    { id: 12, name: "Planning project", manager: null, startDate: "2024-02-29", endDate: "2026-12-31" }
  ]);
  assert.deepEqual(fixture.calls, [
    { method: "fields_get", model: "project.project" },
    { method: "search_read", model: "project.project", domain: [["id", "in", [11, 12]]],
      fields: ["id", "date_start", "date"], options: { context: { active_test: false } } }
  ]);
  assert.doesNotMatch(JSON.stringify([...fixture.projects.values()]), /secret|password|1900|2200/);
});

for (const denied of ["date_start", "date"]) {
  test(`personal lifetime dates recover the readable counterpart after ${denied} denial`, async () => {
    const fixture = datesFixture({ deniedFields: [denied] }); await fixture.read();
    assert.deepEqual([...fixture.projects.values()].map(project => [project.startDate, project.endDate]),
      denied === "date_start" ? [[null, "2028-05-31"], [null, "2026-12-31"]]
        : [["2025-12-01", null], ["2024-02-29", null]]);
    const reads = fixture.calls.filter(call => call.method === "search_read");
    assert.equal(reads.length, 3);
    assert.deepEqual(reads.map(call => call.fields), [["id", "date_start", "date"], ["id", "date_start"], ["id", "date"]]);
    assert.ok(reads.every(call => JSON.stringify(call.domain) === JSON.stringify([["id", "in", [11, 12]]])));
    assert.equal(fixture.projects.get(11).manager.name, "Manager");
    assert.doesNotMatch(JSON.stringify([...fixture.projects.values()]), /private-upstream-secret/);
  });
}

test("personal date enrichment ignores unconfirmed source columns and does not depend on a manager relation", async () => {
  const fixture = datesFixture({ definitions: { date_start: { type: "char" }, date: { type: "date" },
    user_id: { type: "one2many", relation: "res.users" } } });
  await fixture.read();
  assert.ok([...fixture.projects.values()].every(project => project.startDate === null));
  assert.equal(fixture.projects.get(11).endDate, null,
    "A timestamp returned for a confirmed date-only field is invalid");
  const reads = fixture.calls.filter(call => call.method === "search_read");
  assert.deepEqual(reads[0].fields, ["id", "date"]);
  assert.equal(fixture.projects.get(11).manager.name, "Manager");
  assert.equal(fixture.projects.get(12).endDate, "2026-12-31");
});

for (const options of [{ metadataDenied: true }, { definitions: {} }, { definitions: null },
  { definitions: { date_start: { type: "float" }, date: { type: "char" } } }]) {
  test(`unavailable personal date metadata retains projects with unknown dates (${JSON.stringify(options)})`, async () => {
    const fixture = datesFixture(options); await fixture.read();
    assert.equal(fixture.projects.size, 2);
    assert.ok([...fixture.projects.values()].every(project => project.startDate === null && project.endDate === null));
    assert.equal(fixture.projects.get(11).manager.name, "Manager");
    assert.ok(!fixture.calls.some(call => call.method === "search_read"));
  });
}

test("personal dates strictly reject impossible calendar/timestamp values and ignore duplicate/foreign rows", async () => {
  const fixture = datesFixture({ rows: [
    { id: 11, date_start: "2025-02-29", date: "2026-12-31 24:00:00" },
    { id: 11, date_start: "2025-01-01", date: "2026-12-31" },
    { id: 12, date_start: "0000-01-01", date: "2026-13-01" },
    { id: "12", date_start: "2025-01-01", date: "2026-12-31" },
    { id: 99, date_start: "1900-01-01", date: "2200-01-01" }
  ] });
  await fixture.read();
  assert.ok([...fixture.projects.values()].every(project => project.startDate === null && project.endDate === null));
  assert.equal(fixture.projects.size, 2);
});

test("an empty personal project catalogue skips optional metadata and reads", async () => {
  const fixture = datesFixture(); fixture.projects.clear(); await fixture.read();
  assert.deepEqual(fixture.calls, []);
});

test("denied personal project date reads preserve catalogue names and manager metadata", async () => {
  const fixture = datesFixture({ deniedFields: ["date_start", "date"] }); await fixture.read();
  assert.equal(fixture.projects.size, 2);
  assert.ok([...fixture.projects.values()].every(project => project.startDate === null && project.endDate === null));
  assert.equal(fixture.projects.get(11).name, "Own project");
  assert.equal(fixture.projects.get(11).manager.name, "Manager");
  assert.doesNotMatch(JSON.stringify([...fixture.projects.values()]), /private-upstream-secret/);
});

test("my-time enriches only involved personal projects with lifetime dates while retaining hours and managers", async () => {
  const context = loadServer(), calls = [], relation = model => ({ type: "many2one", relation: model });
  context.readJsonBody = async () => ({ projectId: 99, employeeId: 21, dateFields: ["private_field"] });
  context.getAuthSettings = () => ({ odooUrl: "fixture.invalid", database: "fixture", username: "fixture", apiKey: "fixture-key" });
  context.authenticateOdoo = async () => 7;
  context.resolvePersonalEmployee = async () => ({ ids: [20], resourceIds: [], name: "Own person" });
  context.readPersonalPlanning = async () => ({ slots: [{ id: 2, projectId: 12, project: "Planning project",
    start: "2026-01-01T00:00:00.000Z", end: "2026-01-02T00:00:00.000Z", hours: 4 }] });
  context.getModelFields = async (...args) => args[4] === "account.analytic.line"
    ? { employee_id: relation("hr.employee"), project_id: relation("project.project"), date: { type: "date" }, unit_amount: { type: "float" } }
    : args[4] === "project.project"
      ? { date_start: { type: "date" }, date: { type: "date" }, user_id: relation("res.users"),
        total_budget_convention: { type: "float" }, currency_id: relation("res.currency") }
      : { name: { type: "char" } };
  context.searchReadAll = async (...args) => {
    const [model, domain, fields] = args.slice(4); calls.push({ model, domain: plain(domain), fields: plain(fields) });
    if (model === "account.analytic.line") return [
      { id: 1, project_id: [11, "Own project"], employee_id: [20, "Own person"], date: "2026-01-01", unit_amount: 3 },
      { id: 99, project_id: [99, "Foreign project"], employee_id: [21, "Foreign person"], date: "2026-01-01", unit_amount: 100 }
    ];
    if (model === "project.project") return [
      { id: 11, date_start: "2025-12-01", date: "2028-05-31", user_id: [501, "Manager A"],
        total_budget_convention: 234567.89, currency_id: [1, "EUR"] },
      { id: 12, date_start: "2026-01-01", date: "2027-12-31", user_id: false,
        total_budget_convention: 0, currency_id: [2, "USD"] },
      { id: 99, date_start: "1900-01-01", date: "2200-12-31", user_id: [599, "Foreign manager"],
        total_budget_convention: 99999999, currency_id: [99, "Foreign currency"] }
    ];
    return [{ id: 501, name: "Manager A" }, { id: 599, name: "Foreign manager" }];
  };
  let result, status;
  context.sendJson = (_, code, data) => { status = code; result = plain(data); };
  await vm.runInContext("authContext.run({ uid: 7 }, () => handleMyTime({ method: 'POST' }, {}))", context);
  assert.equal(status, 200);
  assert.deepEqual(result.projects, [
    { id: 11, name: "Own project", startDate: "2025-12-01", endDate: "2028-05-31",
      totalBudget: { amount: 234567.89, currencyId: 1, currency: "EUR" },
      personnelBudget: { status: "unavailable", conventionHours: null, actualHours: null, actualStatus: "unavailable" },
      manager: { id: 501, name: "Manager A", photoDataUrl: null } },
    { id: 12, name: "Planning project", startDate: "2026-01-01", endDate: "2027-12-31",
      totalBudget: { amount: 0, currencyId: 2, currency: "USD" },
      personnelBudget: { status: "unavailable", conventionHours: null, actualHours: null, actualStatus: "unavailable" }, manager: null }
  ]);
  assert.equal(result.timesheets.totalHours, 3);
  assert.equal(result.planning.slots[0].hours, 4);
  const projectReads = calls.filter(call => call.model === "project.project");
  assert.ok(projectReads.every(call => JSON.stringify(call.domain) === JSON.stringify([["id", "in", [11, 12]]])));
  assert.deepEqual(projectReads.map(call => call.fields), [["id", "date_start", "date"],
    ["id", "total_budget_convention", "currency_id"], ["id", "user_id"]]);
  assert.doesNotMatch(JSON.stringify(result), /Foreign|1900|2200|private_field/);
});

function budgetFixture(options = {}) {
  const fixture = datesFixture({ ...options,
    definitions: options.definitions === undefined ? {
      total_budget_convention: { type: "monetary", currency_field: "currency_id", string: "Total convention budget" },
      currency_id: { type: "many2one", relation: "res.currency" },
      budget_staffing_convention_hours: { type: "float" }, annual_budget: { type: "monetary" }
    } : options.definitions,
    rows: options.rows || [
      { id: 11, total_budget_convention: 234567.89123, currency_id: [1, "EUR"],
        budget_staffing_convention_hours: 3890.4, annual_budget: 12345, password: "private-upstream-secret" },
      { id: 12, total_budget_convention: 0, currency_id: [2, "USD"] },
      { id: 99, total_budget_convention: 99999999, currency_id: [99, "Foreign currency"] }
    ]
  });
  fixture.projects.get(11).startDate = "2025-12-01";
  fixture.projects.get(11).endDate = "2028-05-31";
  fixture.read = () => fixture.context.enrichPersonalProjectBudgets(["fixture.invalid", "fixture", 7, "fixture-key"], fixture.projects);
  return fixture;
}

test("personal card budget reads the full convention scalar and currency only for exact involved project IDs", async () => {
  const fixture = budgetFixture(); await fixture.read();
  assert.deepEqual([...fixture.projects.values()].map(project => project.totalBudget), [
    { amount: 234567.89123, currencyId: 1, currency: "EUR" }, { amount: 0, currencyId: 2, currency: "USD" }
  ]);
  assert.deepEqual(fixture.calls, [
    { method: "fields_get", model: "project.project" },
    { method: "search_read", model: "project.project", domain: [["id", "in", [11, 12]]],
      fields: ["id", "total_budget_convention", "currency_id"], options: { context: { active_test: false } } }
  ]);
  assert.equal(fixture.projects.get(11).manager.name, "Manager");
  assert.equal(fixture.projects.get(11).startDate, "2025-12-01");
  assert.equal(fixture.projects.get(11).endDate, "2028-05-31");
  assert.doesNotMatch(JSON.stringify([...fixture.projects.values()]), /secret|password|3890|12345|99999999|Foreign/);
});

for (const denied of ["total_budget_convention", "currency_id"]) {
  test(`personal budget metadata independently recovers its readable counterpart after ${denied} denial`, async () => {
    const fixture = budgetFixture({ deniedFields: [denied] }); await fixture.read();
    assert.deepEqual(fixture.projects.get(11).totalBudget, denied === "total_budget_convention"
      ? { amount: null, currencyId: 1, currency: "EUR" } : { amount: 234567.89123, currencyId: null, currency: null });
    const reads = fixture.calls.filter(call => call.method === "search_read");
    assert.deepEqual(reads.map(call => call.fields), [["id", "total_budget_convention", "currency_id"],
      ["id", "total_budget_convention"], ["id", "currency_id"]]);
    assert.ok(reads.every(call => JSON.stringify(call.domain) === JSON.stringify([["id", "in", [11, 12]]])));
    assert.equal(fixture.projects.get(11).manager.name, "Manager");
    assert.equal(fixture.projects.get(11).startDate, "2025-12-01");
    assert.doesNotMatch(JSON.stringify([...fixture.projects.values()]), /secret/);
  });
}

test("personal budget technical source ignores labels and rejects unsupported fields rather than substituting hours or annual budgets", async () => {
  for (const type of ["float", "integer", "monetary"]) {
    const fixture = budgetFixture({ definitions: { total_budget_convention: { type, string: "Unrelated translation" },
      currency_id: { type: "many2one", relation: "res.currency" } } });
    await fixture.read(); assert.equal(fixture.projects.get(11).totalBudget.amount, 234567.89123);
  }
  const fixture = budgetFixture({ definitions: { total_budget_convention: { type: "char", string: "Total budget" },
    budget_staffing_convention_hours: { type: "float", string: "Total budget" }, annual_budget: { type: "monetary" },
    currency_id: { type: "many2one", relation: "res.company" } } });
  await fixture.read();
  assert.deepEqual(fixture.projects.get(11).totalBudget, { amount: null, currencyId: null, currency: null });
  assert.ok(!fixture.calls.some(call => call.method === "search_read"));
});

test("monetary convention totals with conflicting currency bindings keep their amount without inventing a project currency", async () => {
  for (const binding of ["company_currency_id", "private.currency", "", [], 1]) {
    const fixture = budgetFixture({ definitions: { total_budget_convention: { type: "monetary", currency_field: binding },
      currency_id: { type: "many2one", relation: "res.currency" }, company_currency_id: { type: "many2one", relation: "res.currency" } } });
    await fixture.read();
    assert.deepEqual(fixture.projects.get(11).totalBudget, { amount: 234567.89123, currencyId: null, currency: null });
    assert.deepEqual(fixture.calls[1].fields, ["id", "total_budget_convention"]);
  }
});

test("personal budgets preserve finite signed/zero numbers and reject coercion or malformed currency identities", async () => {
  for (const value of [0, -123.456, 1000.001]) {
    const fixture = budgetFixture({ rows: [{ id: 11, total_budget_convention: value, currency_id: [1, "EUR"] }] });
    await fixture.read(); assert.equal(fixture.projects.get(11).totalBudget.amount, value);
  }
  for (const value of [null, false, "1000", NaN, Infinity, -Infinity, undefined]) {
    const fixture = budgetFixture({ rows: [{ id: 11, total_budget_convention: value, currency_id: ["1", "EUR"] }] });
    await fixture.read();
    assert.deepEqual(fixture.projects.get(11).totalBudget, { amount: null, currencyId: null, currency: null });
  }
  const fixture = budgetFixture({ rows: [{ id: 11, total_budget_convention: 10, currency_id: 1 },
    { id: 12, total_budget_convention: 20, currency_id: [2, false] }] });
  await fixture.read();
  assert.deepEqual([...fixture.projects.values()].map(project => project.totalBudget), [
    { amount: 10, currencyId: 1, currency: null }, { amount: 20, currencyId: 2, currency: null }
  ]);
});

test("personal budget projection rejects duplicate/foreign/string IDs and never fills unreadable fields from extra source columns", async () => {
  const fixture = budgetFixture({ rows: [
    { id: 11, total_budget_convention: false, currency_id: false },
    { id: 11, total_budget_convention: 99999, currency_id: [99, "Foreign currency"] },
    { id: "12", total_budget_convention: 99999, currency_id: [99, "Foreign currency"] },
    { id: 99, total_budget_convention: 99999, currency_id: [99, "Foreign currency"] }
  ] });
  await fixture.read();
  assert.ok([...fixture.projects.values()].every(project => project.totalBudget.amount === null && project.totalBudget.currencyId === null));
  assert.equal(fixture.projects.size, 2);
  assert.doesNotMatch(JSON.stringify([...fixture.projects.values()]), /99999|Foreign/);
});

test("missing or denied personal budget metadata/read access keeps catalogue dates and managers", async () => {
  for (const options of [{ metadataDenied: true }, { definitions: null }, { definitions: {} },
    { deniedFields: ["total_budget_convention", "currency_id"] }]) {
    const fixture = budgetFixture(options); await fixture.read();
    assert.equal(fixture.projects.size, 2);
    assert.deepEqual(fixture.projects.get(11).totalBudget, { amount: null, currencyId: null, currency: null });
    assert.equal(fixture.projects.get(11).manager.name, "Manager");
    assert.equal(fixture.projects.get(11).startDate, "2025-12-01");
    assert.doesNotMatch(JSON.stringify([...fixture.projects.values()]), /secret/);
  }
  const fixture = budgetFixture(); fixture.projects.clear(); await fixture.read();
  assert.deepEqual(fixture.calls, [], "An empty involved-project union must skip optional metadata/reads");
});
