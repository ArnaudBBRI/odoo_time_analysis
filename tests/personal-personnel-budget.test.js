"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const serverPath = path.join(__dirname, "..", "server.js"), source = fs.readFileSync(serverPath, "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const args = ["fixture.invalid", "fixture", 7, "fixture-key"];
const now = new Date("2026-10-12T22:30:00Z"); // Already 13 October in Brussels.
const relation = model => ({ type: "many2one", relation: model });
const unavailable = { status: "unavailable", conventionHours: null, actualHours: null, actualStatus: "unavailable" };

function loadServer() {
  const context = vm.createContext({ __dirname: path.dirname(serverPath), process: { env: {} },
    console: { log() {}, error() {} }, URL, AbortController, Buffer,
    require(name) {
      if (["crypto", "async_hooks", "path"].includes(name)) return require(name);
      if (["./steering-service", "./project-finance-service", "./unit-dico-service", "./project-tag-view"].includes(name)) return require(path.join(path.dirname(serverPath), name));
      if (name === "http") return { createServer: () => ({ listen() {}, on() {} }) };
      if (name === "fs") return { existsSync: () => false, readFileSync() { throw new Error("Offline tests must not read local configuration"); } };
      throw new Error(`Unexpected server dependency ${name}`);
    },
    setTimeout() { throw new Error("Offline tests must not start request timers"); }, clearTimeout() {},
    fetch() { throw new Error("Offline tests must not contact Odoo"); }
  });
  vm.runInContext(source, context, { filename: serverPath, timeout: 1000 });
  return context;
}

function fixture(options = {}) {
  const context = loadServer(), calls = [];
  const projects = new Map(options.projects || [
    [11, { id: 11, name: "Own project", startDate: "2025-12-01", endDate: "2026-01-01", manager: { id: 501, name: "Manager" } }],
    [12, { id: 12, name: "Second project", startDate: "2026-01-01", endDate: "2028-12-31" }]
  ]);
  const definitions = {
    "project.project": { budget_staffing_convention_hours: { type: "float" } },
    "account.analytic.line": { project_id: relation("project.project"), employee_id: relation("hr.employee"),
      date: { type: "date" }, unit_amount: { type: "float" } },
    "hr.employee": { job_title: { type: "char" }, job_id: relation("hr.job") },
    "hr.employee.public": { job_title: { type: "char" }, job_id: relation("hr.job") },
    ...(options.definitions || {})
  };
  const budgets = options.budgets || [
    { id: 11, budget_staffing_convention_hours: 3890.3967484570226, total_budget_convention: 987654, password: "private-budget-secret" },
    { id: 12, budget_staffing_convention_hours: 200 },
    { id: 99, budget_staffing_convention_hours: 1, password: "foreign-project-secret" }
  ];
  const rows = options.rows || [
    { id: 1, project_id: [11, "Own project"], employee_id: [20, "Private colleague"], date: "2026-10-13", unit_amount: 10.1234, name: "private-timesheet-description" },
    { id: 2, project_id: [11, "Own project"], employee_id: [21, "Another colleague"], date: "2025-12-01", unit_amount: -0.1234 },
    { id: 3, project_id: [11, "Own project"], employee_id: [22, "Known Ormitter"], date: "2026-10-13", unit_amount: 300 },
    { id: 4, project_id: [11, "Own project"], employee_id: [80, "Unknown old employee"], date: "2025-11-30", unit_amount: 999 },
    { id: 5, project_id: [11, "Own project"], employee_id: false, date: "2026-10-13", unit_amount: 70, name: "Nonemployee expense quantity" },
    { id: 6, project_id: [11, "Own project"], employee_id: [81, "Unknown future employee"], date: "2026-10-14", unit_amount: 999 },
    { id: 7, project_id: [12, "Second project"], employee_id: [20, "Private colleague"], date: "2026-10-13", unit_amount: 50 },
    { id: 8, project_id: [99, "Foreign project"], employee_id: [99, "Foreign private person"], date: "2026-10-13", unit_amount: 12345 }
  ];
  const employeeRows = options.employeeRows || [
    { id: 20, name: "Private colleague", job_title: "Engineer", job_id: false },
    { id: 21, name: "Another colleague", job_title: "Researcher", job_id: false },
    { id: 22, name: "Known Ormitter", job_title: "Engineer", job_id: [2, " AI Consultant Ormit "] },
    { id: 99, name: "Foreign private person", job_title: "Engineer", job_id: false }
  ];
  context.getModelFields = async (...values) => {
    const model = values[4]; calls.push({ method: "fields_get", model });
    if (options.deniedMetadata?.includes(model)) throw new Error("private-upstream-fault-secret");
    return definitions[model] || {};
  };
  context.searchReadAll = async (...values) => {
    const [model, domain, fields, readOptions] = values.slice(4);
    calls.push({ method: "search_read", model, domain: plain(domain), fields: plain(fields), options: plain(readOptions) });
    if (options.deniedReads?.includes(model)) throw new Error("private-upstream-fault-secret");
    if (model === "project.project") return budgets;
    if (model === "account.analytic.line") return rows;
    if (model === "hr.employee") return employeeRows;
    if (model === "hr.employee.public") return options.publicEmployeeRows || [];
    throw new Error(`Unexpected read ${model}`);
  };
  return { context, calls, projects, rows, budgets, read: date => context.enrichPersonalPersonnelBudgets(args, projects, date || now) };
}

test("personal personnel comparison uses canonical hours, exact involved IDs, Brussels cutoff and backend-only colleague totals", async () => {
  const f = fixture(); await f.read();
  const result = plain([...f.projects.values()]);
  assert.equal(result[0].personnelBudget.conventionHours, 3890.3967484570226, "No money conversion or premature convention rounding");
  assert.deepEqual(result[0].personnelBudget, { status: "available", conventionHours: 3890.3967484570226, actualHours: 10, actualStatus: "available" });
  assert.deepEqual(result[1].personnelBudget, { status: "available", conventionHours: 200, actualHours: 50, actualStatus: "available" });
  assert.equal(result[0].manager.name, "Manager");
  assert.equal(result[0].endDate, "2026-01-01", "Actual imputations after project end are still counted through today");
  assert.doesNotMatch(JSON.stringify(result), /secret|Private colleague|Another colleague|Ormitter|description|employeeId|employee_id|unit_amount/);
  const reads = f.calls.filter(call => call.method === "search_read");
  assert.deepEqual(reads[0].domain, [["id", "in", [11, 12]]]);
  assert.deepEqual(reads[0].fields, ["id", "budget_staffing_convention_hours"]);
  const actualRead = reads.find(call => call.model === "account.analytic.line");
  assert.deepEqual(actualRead.domain, [["project_id", "in", [11, 12]], ["employee_id", "!=", false], ["date", ">=", "2025-12-01"], ["date", "<=", "2026-10-13"]]);
  assert.deepEqual(actualRead.fields, ["id", "date", "unit_amount", "employee_id", "project_id"]);
  const hrReads = reads.filter(call => /^hr\.employee/.test(call.model));
  assert.deepEqual(hrReads.map(call => call.domain), [[["id", "in", [20, 21, 22]]]]);
  assert.ok(reads.every(call => call.options.context.active_test === false));
});

test("unknown employee functions make only their relevant project's personnel actuals unavailable", async () => {
  const f = fixture({ employeeRows: [{ id: 20, job_title: "Engineer", job_id: false }, { id: 21, job_title: false, job_id: false },
    { id: 22, job_title: "AI Consultant", job_id: false }] }); await f.read();
  assert.deepEqual(plain(f.projects.get(11).personnelBudget), { status: "available", conventionHours: 3890.3967484570226, actualHours: null, actualStatus: "unavailable" });
  assert.equal(f.projects.get(12).personnelBudget.actualHours, 50);
  assert.equal(f.projects.get(12).personnelBudget.actualStatus, "available");
  assert.doesNotMatch(JSON.stringify([...f.projects.values()]), /fault|secret|Employee function/);
});

test("public HR fallback can confirm BW hours without broadening the exact employee IDs", async () => {
  const f = fixture({ deniedReads: ["hr.employee"], publicEmployeeRows: [
    { id: 20, job_title: "Engineer", job_id: false }, { id: 21, job_title: "Researcher", job_id: false }, { id: 22, job_title: "AI Consultant Ormit", job_id: false },
    { id: 99, job_title: "Engineer", job_id: false }
  ] }); await f.read();
  assert.equal(f.projects.get(11).personnelBudget.actualHours, 10);
  assert.deepEqual(f.calls.filter(call => call.method === "search_read" && /^hr\.employee/.test(call.model)).map(call => call.domain),
    [[["id", "in", [20, 21, 22]]], [["id", "in", [20, 21, 22]]]]);
});

test("personnel totals exclude retained Viktor names without HR records while other unknown people remain unavailable", async () => {
  const rows = [
    { id: 1, project_id: [11, "Own project"], employee_id: [80, "  VIKTOR\u00a0DE  GROOTE "], date: "2026-10-13", unit_amount: 100 },
    { id: 2, project_id: [11, "Own project"], employee_id: [80, "Viktor de Groote"], date: "2026-10-13", unit_amount: -10 },
    { id: 3, project_id: [11, "Own project"], employee_id: [20, "Private colleague"], date: "2026-10-13", unit_amount: 4.25 },
    { id: 4, project_id: [12, "Second project"], employee_id: [81, "Viktor de Groot"], date: "2026-10-13", unit_amount: 2 }
  ];
  const before = structuredClone(rows), f = fixture({ rows, employeeRows: [{ id: 20, job_title: "Engineer", job_id: false }] });
  await f.read();
  assert.equal(f.projects.get(11).personnelBudget.actualStatus, "available");
  assert.equal(f.projects.get(11).personnelBudget.actualHours, 4.25);
  assert.equal(f.projects.get(12).personnelBudget.actualStatus, "unavailable");
  assert.equal(f.projects.get(12).personnelBudget.actualHours, null);
  assert.deepEqual(rows, before);
  assert.doesNotMatch(JSON.stringify([...f.projects.values()]), /Viktor|VIKTOR|Private colleague|employee_id|named-override/);
  const actual = f.calls.find(call => call.model === "account.analytic.line" && call.method === "search_read");
  assert.deepEqual(actual.fields, ["id", "date", "unit_amount", "employee_id", "project_id"]);
});

test("the explicit named Ormitter exception covers personnel totals despite missing function schema or conflicting HR", async () => {
  const rows = [{ id: 1, project_id: [11, "Own project"], employee_id: [80, "Viktor de Groote"], date: "2026-10-13", unit_amount: 8 }];
  for (const options of [
    { employeeRows: [{ id: 80, job_title: "Engineer", job_id: false }] },
    { deniedReads: ["hr.employee", "hr.employee.public"] },
    { definitions: { "hr.employee": {}, "hr.employee.public": {} } }
  ]) {
    const f = fixture({ rows, ...options }); await f.read();
    assert.equal(f.projects.get(11).personnelBudget.actualStatus, "available");
    assert.equal(f.projects.get(11).personnelBudget.actualHours, 0);
    assert.equal(f.projects.get(12).personnelBudget.actualHours, 0);
    assert.ok(f.calls.every(call => ["fields_get", "search_read"].includes(call.method)));
  }
});

test("personnel attribution requires typed HR function metadata without trusting unrelated fields", async () => {
  const wrongFunctionSchema = { job_title: { type: "float" }, job_id: relation("res.partner") };
  const f = fixture({ definitions: { "hr.employee": wrongFunctionSchema, "hr.employee.public": wrongFunctionSchema } });
  await f.read();
  for (const project of f.projects.values()) {
    assert.equal(project.personnelBudget.status, "available");
    assert.equal(project.personnelBudget.actualStatus, "unavailable");
    assert.equal(project.personnelBudget.actualHours, null);
  }
  assert.ok(!f.calls.some(call => call.method === "search_read" && /^hr\.employee/.test(call.model)),
    "A non-function field schema cannot establish employee or Ormitter status");
});

for (const [label, invalidEmployee] of [
  ["numeric job title", { id: 20, job_title: 44, job_id: false }],
  ["object job title", { id: 20, job_title: { name: "Engineer" }, job_id: false }],
  ["missing requested job title", { id: 20, job_id: [2, "Engineer"] }],
  ["missing requested job relation", { id: 20, job_title: "Engineer" }],
  ["scalar job relation", { id: 20, job_title: "Engineer", job_id: "2" }],
  ["string job relation ID", { id: 20, job_title: "Engineer", job_id: ["2", "Engineer"] }],
  ["missing job relation label", { id: 20, job_title: "Engineer", job_id: [2, false] }],
  ["empty job relation label", { id: 20, job_title: "Engineer", job_id: [2, " "] }]
]) {
  test(`corrupt private HR function evidence stays unavailable despite readable public fallback (${label})`, async () => {
    const f = fixture({ employeeRows: [invalidEmployee,
      { id: 21, job_title: "Researcher", job_id: false }, { id: 22, job_title: "AI Consultant Ormit", job_id: false }],
      publicEmployeeRows: [{ id: 20, job_title: "Engineer", job_id: false }] });
    await f.read();
    for (const project of f.projects.values()) {
      assert.equal(project.personnelBudget.actualStatus, "unavailable");
      assert.equal(project.personnelBudget.actualHours, null);
    }
    assert.ok(!f.calls.some(call => call.method === "search_read" && call.model === "hr.employee.public"),
      "Public fallback is for missing evidence, not overriding malformed private evidence");
    const hrRead = f.calls.find(call => call.method === "search_read" && call.model === "hr.employee");
    assert.deepEqual(hrRead.domain, [["id", "in", [20, 21, 22]]]);
    assert.deepEqual(hrRead.fields, ["id", "job_title", "job_id"], "Colleague names and untyped dimensions are unnecessary");
    assert.doesNotMatch(JSON.stringify([...f.projects.values()]), /secret|fault|employeeId|job_title|job_id/);
  });
}

for (const duplicateTitle of ["Engineer", "AI Consultant Ormit"]) {
  test(`repeated private HR IDs cannot establish a unique function or be repaired by public fallback (${duplicateTitle})`, async () => {
    const f = fixture({ employeeRows: [{ id: 20, job_title: "Engineer", job_id: false },
      { id: 20, job_title: duplicateTitle, job_id: false },
      { id: 21, job_title: "Researcher", job_id: false }, { id: 22, job_title: "AI Consultant Ormit", job_id: false }],
      publicEmployeeRows: [{ id: 20, job_title: "Engineer", job_id: false }] });
    await f.read();
    for (const project of f.projects.values()) {
      assert.equal(project.personnelBudget.actualStatus, "unavailable");
      assert.equal(project.personnelBudget.actualHours, null);
    }
    assert.ok(!f.calls.some(call => call.method === "search_read" && call.model === "hr.employee.public"));
  });
}

test("genuinely absent private employee evidence targets only the missing ID in public HR", async () => {
  const f = fixture({ employeeRows: [{ id: 21, job_title: "Researcher", job_id: false },
    { id: 22, job_title: "AI Consultant Ormit", job_id: false }],
    publicEmployeeRows: [{ id: 20, job_title: "Engineer", job_id: false }, { id: 99, job_title: "Engineer", job_id: false }] });
  await f.read();
  assert.equal(f.projects.get(11).personnelBudget.actualHours, 10);
  assert.equal(f.projects.get(12).personnelBudget.actualHours, 50);
  const publicRead = f.calls.find(call => call.method === "search_read" && call.model === "hr.employee.public");
  assert.deepEqual(publicRead.domain, [["id", "in", [20]]]);
  assert.deepEqual(publicRead.fields, ["id", "job_title", "job_id"]);
});

test("an empty successful identified employee-time read proves zero without HR metadata reads", async () => {
  const f = fixture({ rows: [] }); await f.read();
  assert.ok([...f.projects.values()].every(project => project.personnelBudget.actualStatus === "available" && project.personnelBudget.actualHours === 0));
  assert.ok(!f.calls.some(call => /^hr\.employee/.test(call.model)));
});

test("signed personnel corrections retain source precision and can produce a negative actual total", async () => {
  const f = fixture({ rows: [
    { id: 1, project_id: [11, "Own project"], employee_id: [20, "Private colleague"], date: "2026-10-13", unit_amount: "12.3456" },
    { id: 2, project_id: [11, "Own project"], employee_id: [20, "Private colleague"], date: "2026-10-13", unit_amount: "-14.4456" }
  ] }); await f.read();
  assert.ok(Math.abs(f.projects.get(11).personnelBudget.actualHours - -2.1) < 1e-12);
  assert.equal(f.projects.get(11).personnelBudget.actualStatus, "available");
});

test("empty, unavailable or undated conventions skip colleague reads, and a known future start proves zero", async () => {
  const f = fixture({ projects: [
    [11, { id: 11, name: "Future", startDate: "2026-10-14" }],
    [12, { id: 12, name: "Undated", startDate: null }],
    [13, { id: 13, name: "Empty", startDate: "2026-01-01" }],
    [14, { id: 14, name: "Missing", startDate: "2026-01-01" }],
    [15, { id: 15, name: "Invalid date", startDate: "2026-02-30" }]
  ], budgets: [{ id: 11, budget_staffing_convention_hours: 100 }, { id: 12, budget_staffing_convention_hours: 100 },
    { id: 13, budget_staffing_convention_hours: 0 }, { id: 14 }, { id: 15, budget_staffing_convention_hours: 100 }] });
  await f.read();
  assert.deepEqual(plain(f.projects.get(11).personnelBudget), { status: "available", conventionHours: 100, actualHours: 0, actualStatus: "available" });
  assert.equal(f.projects.get(12).personnelBudget.actualStatus, "unavailable");
  assert.deepEqual(plain(f.projects.get(13).personnelBudget), { status: "empty", conventionHours: null, actualHours: null, actualStatus: "unavailable" });
  assert.deepEqual(plain(f.projects.get(14).personnelBudget), unavailable);
  assert.equal(f.projects.get(15).personnelBudget.actualStatus, "unavailable");
  assert.ok(!f.calls.some(call => call.model === "account.analytic.line" || /^hr\.employee/.test(call.model)));
});

for (const options of [
  { deniedMetadata: ["project.project"] }, { deniedReads: ["project.project"] },
  { definitions: { "project.project": { budget_staffing_convention_hours: { type: "monetary" }, total_budget_convention: { type: "float" } } } },
  { definitions: { "project.project": { total_budget_convention: { type: "float" } } } }
]) {
  test(`unavailable canonical personnel convention never falls back to money or breaks catalogue (${JSON.stringify(options)})`, async () => {
    const f = fixture(options); await f.read();
    assert.ok([...f.projects.values()].every(project => JSON.stringify(plain(project.personnelBudget)) === JSON.stringify(unavailable)));
    assert.equal(f.projects.get(11).manager.name, "Manager");
    assert.ok(!f.calls.some(call => call.model === "account.analytic.line" || /^hr\.employee/.test(call.model)));
    assert.doesNotMatch(JSON.stringify([...f.projects.values()]), /secret|fault/);
  });
}

for (const options of [
  { deniedMetadata: ["account.analytic.line"] }, { deniedReads: ["account.analytic.line"] },
  { deniedReads: ["hr.employee", "hr.employee.public"] },
  { definitions: { "account.analytic.line": { project_id: relation("project.project"), employee_id: relation("res.partner"), date: { type: "date" }, unit_amount: { type: "float" } } } }
]) {
  test(`optional source failure cannot invent zero BW hours (${JSON.stringify(options)})`, async () => {
    const f = fixture(options); await f.read();
    assert.ok([...f.projects.values()].every(project => project.personnelBudget.status === "available" && project.personnelBudget.actualStatus === "unavailable" && project.personnelBudget.actualHours === null));
    assert.doesNotMatch(JSON.stringify([...f.projects.values()]), /secret|fault/);
  });
}

test("malformed relevant source values and repeated line IDs cannot fabricate a complete personnel aggregate", async () => {
  for (const invalid of [{ unit_amount: null }, { unit_amount: false }, { unit_amount: "" }, { unit_amount: "bad" },
    { employee_id: ["20", "Bad employee"] }, { employee_id: "20" }, { date: "2026-02-30" }, { id: null }]) {
    const row = { id: 1, project_id: [11, "Own project"], employee_id: [20, "Private colleague"], date: "2026-10-13", unit_amount: 10, ...invalid };
    const f = fixture({ rows: [row] }); await f.read();
    assert.equal(f.projects.get(11).personnelBudget.actualStatus, "unavailable", JSON.stringify(invalid));
    assert.equal(f.projects.get(11).personnelBudget.actualHours, null);
    assert.equal(f.projects.get(12).personnelBudget.actualHours, 0);
  }
  const row = { id: 1, project_id: [11, "Own project"], employee_id: [20, "Private colleague"], date: "2026-10-13", unit_amount: 10 };
  const f = fixture({ rows: [row, { ...row }] }); await f.read();
  assert.equal(f.projects.get(11).personnelBudget.actualStatus, "unavailable");
});

test("duplicate or malformed convention values stay unavailable or explicitly empty", async () => {
  for (const value of [false, null, "", 0, -10]) {
    const f = fixture({ budgets: [{ id: 11, budget_staffing_convention_hours: value }] }); await f.read();
    assert.equal(f.projects.get(11).personnelBudget.status, "empty");
    assert.equal(f.projects.get(11).personnelBudget.conventionHours, null);
  }
  for (const budgets of [[{ id: 11, budget_staffing_convention_hours: NaN }],
    [{ id: 11, budget_staffing_convention_hours: "bad" }],
    [{ id: 11, budget_staffing_convention_hours: 100 }, { id: 11, budget_staffing_convention_hours: 1000 }]]) {
    const f = fixture({ budgets }); await f.read();
    assert.deepEqual(plain(f.projects.get(11).personnelBudget), unavailable);
  }
});

test("personnel source pagination uses the same exact IDs and cutoff on every page", async () => {
  const f = fixture({ projects: [[11, { id: 11, name: "Own project", startDate: "2026-01-01" }]], budgets: [{ id: 11, budget_staffing_convention_hours: 10000 }] });
  const pages = [];
  // The real paginator is exercised with an offline executeKw replacement;
  // no HTTP listener, outbound fetch or request timer is permitted.
  const realContext = loadServer();
  realContext.getModelFields = f.context.getModelFields;
  realContext.executeKw = async (...values) => {
    const [model, method, [domain], kwargs] = values.slice(4);
    assert.equal(method, "search_read");
    if (model !== "account.analytic.line") return f.context.searchReadAll(...values.slice(0, 4), model, domain, kwargs.fields, kwargs);
    pages.push({ domain: plain(domain), fields: plain(kwargs.fields), offset: kwargs.offset, limit: kwargs.limit });
    if (!kwargs.offset) return Array.from({ length: 1000 }, (_, index) => ({ id: index + 1, project_id: [11, "Own project"],
      employee_id: [20, "Private colleague"], date: "2026-10-13", unit_amount: 0.1 }));
    return [{ id: 1001, project_id: [11, "Own project"], employee_id: [20, "Private colleague"], date: "2026-10-13", unit_amount: -0.05 }];
  };
  await realContext.enrichPersonalPersonnelBudgets(args, f.projects, now);
  assert.equal(pages.length, 2);
  assert.deepEqual(pages.map(page => [page.offset, page.limit]), [[0, 1000], [1000, 1000]]);
  assert.deepEqual(pages[0].domain, [["project_id", "in", [11]], ["employee_id", "!=", false], ["date", ">=", "2026-01-01"], ["date", "<=", "2026-10-13"]]);
  assert.deepEqual(pages[1].domain, pages[0].domain);
  assert.deepEqual(pages[1].fields, pages[0].fields);
  assert.equal(f.projects.get(11).personnelBudget.actualStatus, "available");
  assert.equal(f.projects.get(11).personnelBudget.actualHours, 99.95, "Compensated raw summation avoids accumulating floating-point cent drift");
});

test("an empty personal project catalogue avoids optional personnel reads entirely", async () => {
  const f = fixture({ projects: [] }); await f.read(); assert.deepEqual(f.calls, []);
});

test("my-time keeps own actuals, planning failure and catalogue metadata when optional colleague access is denied", async () => {
  const context = loadServer(), calls = [];
  context.readJsonBody = async () => ({ employeeId: 99, projectId: 99 });
  context.getAuthSettings = () => ({ odooUrl: args[0], database: args[1], username: "fixture", apiKey: args[3] });
  context.authenticateOdoo = async () => 7;
  context.resolvePersonalEmployee = async () => ({ ids: [20], resourceIds: [], name: "Own person" });
  context.readPersonalPlanning = async () => { throw new Error("private-planning-fault"); };
  context.enrichPersonalProjectDates = async (_, projects) => { for (const project of projects.values()) { project.startDate = "2026-01-01"; project.endDate = "2028-12-31"; } };
  context.enrichPersonalProjectBudgets = async (_, projects) => { for (const project of projects.values()) project.totalBudget = { amount: 12345, currencyId: 1, currency: "EUR" }; };
  context.enrichPersonalProjectManagers = async (_, projects) => { for (const project of projects.values()) project.manager = { id: 501, name: "Manager", photoDataUrl: null }; };
  context.getModelFields = async (...values) => values[4] === "project.project"
    ? { budget_staffing_convention_hours: { type: "float" } }
    : { project_id: relation("project.project"), employee_id: relation("hr.employee"), date: { type: "date" }, unit_amount: { type: "float" } };
  context.searchReadAll = async (...values) => {
    const [model, domain, fields] = values.slice(4); calls.push({ model, domain: plain(domain), fields: plain(fields) });
    if (model === "project.project") return [{ id: 11, budget_staffing_convention_hours: 100 }];
    if (domain[0][0] === "employee_id") return [
      { id: 1, project_id: [11, "Own project"], employee_id: [20, "Own person"], date: "2026-10-13", unit_amount: 3.5 },
      { id: 99, project_id: [99, "Foreign project"], employee_id: [99, "Foreign person"], date: "2026-10-13", unit_amount: 100 }
    ];
    throw new Error("private-colleague-access-fault");
  };
  let result, status;
  context.sendJson = (_, code, value) => { status = code; result = plain(value); };
  await vm.runInContext("authContext.run({ uid: 7 }, () => handleMyTime({ method: 'POST' }, {}))", context);
  assert.equal(status, 200);
  assert.equal(result.timesheets.totalHours, 3.5);
  assert.equal(result.timesheets.lines.length, 1);
  assert.equal(result.planning, null);
  assert.match(result.planningError, /Personal planning is unavailable/);
  assert.equal(result.projects.length, 1);
  assert.equal(result.projects[0].manager.name, "Manager");
  assert.equal(result.projects[0].totalBudget.amount, 12345);
  assert.deepEqual(result.projects[0].personnelBudget, { status: "available", conventionHours: 100, actualHours: null, actualStatus: "unavailable" });
  assert.deepEqual(calls.find(call => call.model === "project.project").domain, [["id", "in", [11]]]);
  assert.deepEqual(calls.filter(call => call.model === "account.analytic.line").at(-1).domain[0], ["project_id", "in", [11]]);
  assert.doesNotMatch(JSON.stringify(result), /Foreign|private-.*-fault|colleague/);
});
