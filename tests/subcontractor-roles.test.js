const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const serverPath = path.join(__dirname, "..", "server.js");
const source = fs.readFileSync(serverPath, "utf8");
const settings = ["https://odoo.example.invalid", "test-db", 42, "test-key"];
const employeeFields = {
  id: { type: "integer" }, name: { type: "char" }, job_title: { type: "char" },
  job_id: { type: "many2one" }, resource_id: { type: "many2one" }
};

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadServer(respond) {
  const calls = [];
  let context;
  context = {
    __dirname: path.dirname(serverPath),
    process: { env: {} }, console: { log() {}, error() {} }, URL, AbortController, Buffer,
    require(name) {
      if (["crypto", "async_hooks"].includes(name)) return require(name);
      if (name === "./steering-service") return require("../steering-service");
      if (name === "http") {
        return { createServer: () => ({ listen() {}, on() {} }) };
      }
      if (name === "path") {
        return path;
      }
      if (name === "fs") {
        return { existsSync: () => false, readFileSync() { throw new Error("Private config must not be read"); } };
      }
      throw new Error(`Unexpected dependency ${name}`);
    },
    setTimeout() { return 1; }, clearTimeout() {},
    async fetch(endpoint, options) {
      assert.match(endpoint, /^https:\/\/odoo\.example\.invalid\/xmlrpc\/2\/(common|object)$/);
      const params = [];
      const paramXml = context.extractElement(options.body, "params").content;
      let cursor = 0;
      while (cursor < paramXml.length) {
        const param = context.extractElement(paramXml, "param", cursor);
        if (!param) break;
        params.push(context.parseValue(context.extractElement(param.content, "value").content));
        cursor = param.end;
      }
      const method = context.extractElement(options.body, "methodName").content;
      const call = plain({ endpoint, method, params });
      calls.push(call);
      const result = await respond(call);
      return { ok: true, async text() {
        return `<methodResponse><params><param>${context.xmlRpcValue(result)}</param></params></methodResponse>`;
      } };
    }
  };
  vm.runInNewContext(source, context, { filename: serverPath, timeout: 1000 });
  return { context, calls };
}

function metadataServer(rows, extraRespond) {
  return loadServer((call) => {
    const model = call.params[3];
    const method = call.params[4];
    assert.equal(call.method, "execute_kw");
    assert.ok(["fields_get", "search_read"].includes(method), "Only existing read operations may be sent");
    if (extraRespond) {
      const extra = extraRespond(call);
      if (extra !== undefined) return extra;
    }
    assert.equal(model, "hr.employee");
    if (method === "fields_get") return employeeFields;
    return rows;
  });
}

function normalizedLine(context, employeeId, hours = 8, name = "Same Name") {
  return context.normalizeTimesheetLine({
    id: employeeId, date: "2026-10-01", unit_amount: hours,
    employee_id: [employeeId, name], project_id: [71, "Project A"], task_id: [81, "Task A"]
  });
}

test("subcontractor functions match exact names after case and whitespace normalization", () => {
  const { context } = loadServer(() => { throw new Error("No requests expected"); });
  for (const value of ["AI Consultant", "AI Consultant Ormit", " ai   consultant ORMIT ", "AI\tConsultant\n"]) {
    assert.equal(context.isSubcontractorFunction(value), true, value);
  }
  for (const value of ["Consultant", "Senior AI Consultant", "AI Consultant Ormit Manager", "AI Consultant Ormitters", "AI-Consultant", "", null]) {
    assert.equal(context.isSubcontractorFunction(value), false, String(value));
  }
});

test("same-name employees remain distinct by ID and job-title/job-position matching", async () => {
  const { context, calls } = metadataServer([
    { id: 11, name: "Same Name", job_title: "Engineer", job_id: [1, "Engineer"] },
    { id: 12, name: "Same Name", job_title: " AI consultant ", job_id: false },
    { id: 13, name: "Same Name", job_title: "Consultant", job_id: [2, "AI Consultant Ormit"] },
    { id: 99, name: "Unrequested", job_title: "AI Consultant" }
  ]);
  const records = [11, 12, 13].map((id) => normalizedLine(context, id));
  const warnings = [];
  await context.enrichEmployeeFunctions(...settings, records, warnings);
  assert.deepEqual(records.map((record) => record.isSubcontractor), [false, true, true]);
  assert.equal(records[2].employeeFunctionSource, "hr.employee.job_id");
  assert.deepEqual(records.map((record) => record.subcontractorClassification), ["employee-function", "employee-function", "employee-function"]);
  assert.deepEqual(warnings, []);
  const read = calls.find((call) => call.params[4] === "search_read");
  assert.deepEqual(read.params[5], [[["id", "in", [11, 12, 13]]]]);
  assert.deepEqual(read.params[6].fields, ["id", "name", "job_title", "job_id", "resource_id"]);
  assert.deepEqual(read.params[6].context, { active_test: false });
  assert.equal(context.buildMonthlyTimesheetSummary(records)[0].totalHours, 24);
  assert.equal(context.buildMonthlyTimesheetSummary(records.filter((record) => !record.isSubcontractor))[0].totalHours, 8);
});

test("planning resource IDs are resolved instead of being mistaken for employee IDs", async () => {
  const { context, calls } = metadataServer([
    { id: 111, name: "Subcontractor", job_title: "AI Consultant Ormit", resource_id: [12, "Subcontractor"] }
  ]);
  const slot = context.normalizePlanningSlot({ id: 5, allocated_hours: 8, resource_id: [12, "Subcontractor"], role_id: [1, "Engineer"], start_datetime: "2026-10-01 09:00:00" });
  assert.equal(slot.employeeId, null);
  assert.equal(slot.resourceId, 12);
  await context.enrichEmployeeFunctions(...settings, [slot], []);
  assert.equal(slot.employeeId, 111);
  assert.equal(slot.isSubcontractor, true);
  assert.equal(slot.employeeFunctionSource, "hr.employee.job_title");
  assert.deepEqual(calls[1].params[5], [[["resource_id", "in", [12]]]]);
});

test("public function enrichment follows a resource mapping even when the public model hides resource_id", async () => {
  const { context, calls } = loadServer((call) => {
    if (call.params[3] === "hr.employee") {
      return call.params[4] === "fields_get" ? employeeFields
        : [{ id: 111, name: "Subcontractor", resource_id: [12, "Subcontractor"], job_title: false, job_id: false }];
    }
    assert.equal(call.params[3], "hr.employee.public");
    return call.params[4] === "fields_get"
      ? { id: { type: "integer" }, name: { type: "char" }, job_title: { type: "char" } }
      : [{ id: 111, name: "Subcontractor", job_title: "AI Consultant" }];
  });
  const slot = context.normalizePlanningSlot({ id: 5, allocated_hours: 8, resource_id: [12, "Subcontractor"] });
  const warnings = [];
  await context.enrichEmployeeFunctions(...settings, [slot], warnings);
  assert.equal(slot.employeeId, 111);
  assert.equal(slot.resourceId, 12);
  assert.equal(slot.isSubcontractor, true);
  assert.equal(slot.employeeFunctionSource, "hr.employee.public.job_title");
  assert.deepEqual(calls[3].params[5], [[["id", "in", [111]]]]);
  assert.deepEqual(warnings, []);
});

test("employee metadata takes precedence over a conflicting planning role", async () => {
  const { context } = metadataServer([{ id: 11, job_title: "Engineer" }]);
  const slot = context.normalizePlanningSlot({ id: 5, allocated_hours: 8, employee_id: [11, "Engineer"], role_id: [1, "AI Consultant"] });
  await context.enrichEmployeeFunctions(...settings, [slot], []);
  assert.equal(slot.isSubcontractor, false);
  assert.equal(slot.employeeFunction, "Engineer");
  assert.equal(slot.subcontractorClassification, "employee-function");
});

test("public employee metadata is used when private employee access is denied", async () => {
  const { context, calls } = loadServer((call) => {
    if (call.params[3] === "hr.employee") throw new Error("Access denied");
    assert.equal(call.params[3], "hr.employee.public");
    return call.params[4] === "fields_get" ? employeeFields : [{ id: 11, job_title: "AI Consultant" }];
  });
  const record = normalizedLine(context, 11);
  const warnings = [];
  await context.enrichEmployeeFunctions(...settings, [record], warnings);
  assert.equal(record.isSubcontractor, true);
  assert.equal(record.employeeFunctionSource, "hr.employee.public.job_title");
  assert.match(warnings.join(" "), /hr.employee failed:.*Access denied/);
  assert.ok(calls.every((call) => ["fields_get", "search_read"].includes(call.params[4])));
});

test("missing metadata gives a disclosed planning-role fallback and preserves unknown actuals", async () => {
  const { context } = loadServer((call) => call.params[4] === "fields_get" ? employeeFields : []);
  const line = normalizedLine(context, 11);
  const slot = context.normalizePlanningSlot({ id: 5, allocated_hours: 8, employee_id: [12, "Subcontractor"], role_id: [1, "AI Consultant Ormit"] });
  const warnings = [];
  await context.enrichEmployeeFunctions(...settings, [line, slot], warnings);
  assert.equal(line.isSubcontractor, false);
  assert.equal(line.subcontractorClassification, "unknown");
  assert.equal(slot.isSubcontractor, true);
  assert.equal(slot.employeeFunctionSource, "planning.role_id");
  assert.match(warnings.join(" "), /planning role instead/);
  assert.match(warnings.join(" "), /hours remain included/);
});

test("empty records perform no metadata or network lookup", async () => {
  const { context, calls } = loadServer(() => { throw new Error("No requests expected"); });
  await context.enrichEmployeeFunctions(...settings, [], []);
  assert.deepEqual(calls, []);
});

test("denied metadata on both employee models preserves hours with explicit warnings", async () => {
  const { context, calls } = loadServer(() => { throw new Error("Access denied"); });
  const record = normalizedLine(context, 11);
  const warnings = [];
  await context.enrichEmployeeFunctions(...settings, [record], warnings);
  assert.equal(record.hours, 8);
  assert.equal(record.isSubcontractor, false);
  assert.equal(record.subcontractorClassification, "unknown");
  assert.equal(calls.length, 2);
  assert.match(warnings.join(" "), /hr.employee failed/);
  assert.match(warnings.join(" "), /hr.employee.public failed/);
  assert.match(warnings.join(" "), /hours remain included/);
});

test("fallback public lookup targets only employee functions still missing", async () => {
  const { context, calls } = loadServer((call) => {
    if (call.params[4] === "fields_get") return employeeFields;
    return call.params[3] === "hr.employee"
      ? [{ id: 11, job_title: "Engineer" }, { id: 12, job_title: false, job_id: false }]
      : [{ id: 12, job_title: "AI Consultant Ormit" }];
  });
  const records = [11, 12].map((id) => normalizedLine(context, id));
  await context.enrichEmployeeFunctions(...settings, records, []);
  assert.equal(records[0].isSubcontractor, false);
  assert.equal(records[1].isSubcontractor, true);
  assert.deepEqual(calls[3].params[5], [[["id", "in", [12]]]]);
});

async function callHandler(context, name) {
  context.getMergedConnectorSettings = body => body;
  context.readJsonBody = async () => ({ odooUrl: settings[0], database: settings[1], username: "test-user", apiKey: settings[3], employeeName: "Employee", projectCode: "71" });
  let status;
  let payload;
  await context[name]({ method: "POST" }, {
    writeHead(value) { status = value; },
    end(value) { payload = JSON.parse(value); }
  });
  assert.equal(status, 200);
  return payload;
}

test("all hour endpoints retain inclusive totals and expose employee-only summaries", async (t) => {
  const planningFields = Object.fromEntries(["id", "name", "allocated_hours", "employee_id", "resource_id", "role_id", "project_id", "start_datetime", "end_datetime"].map((field) => [field, { type: "char" }]));
  for (const handler of ["handleEmployeeTimesheets", "handleEmployeePlanning", "handleProjectTimesheets", "handleProjectPlanning", "handleDicoProjects"]) {
    await t.test(handler, async () => {
      const { context, calls } = loadServer((call) => {
        if (call.method === "authenticate") return 42;
        assert.equal(call.method, "execute_kw");
        const model = call.params[3];
        const method = call.params[4];
        assert.ok(["search_read", "fields_get"].includes(method));
        if (model === "hr.employee") return method === "fields_get" ? employeeFields : [
          { id: 11, job_title: "Engineer" }, { id: 12, job_title: "AI Consultant" }
        ];
        if (model === "project.project") return method === "fields_get"
          ? { id: { type: "integer" }, name: { type: "char" }, responsible_unit: { type: "char" } }
          : [{ id: 71, name: "Project A", responsible_unit: "DIGITAL CONSTRUCTION UNIT" }];
        if (model === "account.analytic.line") return [11, 12].map((id) => ({ id, date: "2026-10-01", unit_amount: 8, employee_id: [id, "Same Name"], project_id: [71, "Project A"] }));
        if (model === "planning.slot") return method === "fields_get" ? planningFields : [11, 12].map((id) => ({ id, allocated_hours: 8, start_datetime: "2026-10-01 09:00:00", end_datetime: "2026-10-01 17:00:00", employee_id: [id, "Same Name"], project_id: [71, "Project A"] }));
        throw new Error(`Unexpected model ${model}`);
      });
      const result = await callHandler(context, handler);
      if (handler === "handleDicoProjects") {
        assert.equal(result.actualTotalHours, 16);
        assert.equal(result.plannedTotalHours, 16);
        assert.equal(result.actualMonthly[0].totalHours, 16);
        assert.equal(result.plannedMonthly[0].totalHours, 16);
        assert.equal(result.employeeActualMonthly[0].totalHours, 8);
        assert.equal(result.employeePlannedMonthly[0].totalHours, 8);
        assert.equal(result.lines.length, 2);
        assert.equal(result.slots.length, 2);
      } else {
        assert.equal(result.totalHours, 16);
        assert.equal(result.monthly[0].totalHours, 16);
        assert.equal(result.employeeMonthly[0].totalHours, 8);
        assert.deepEqual((result.lines || result.slots).map((record) => record.isSubcontractor), [false, true]);
      }
      assert.ok(calls.every((call) => call.method === "authenticate" || ["fields_get", "search_read"].includes(call.params[4])));
    });
  }
});

test("an all-subcontractor response includes an empty employeeMonthly without dropping inclusive data", async () => {
  const { context } = loadServer((call) => {
    if (call.method === "authenticate") return 42;
    if (call.params[3] === "account.analytic.line") return [{ id: 1, date: "2026-10-01", unit_amount: 8, employee_id: [12, "Subcontractor"], project_id: [71, "Project A"] }];
    assert.equal(call.params[3], "hr.employee");
    return call.params[4] === "fields_get" ? employeeFields : [{ id: 12, job_title: "AI Consultant" }];
  });
  const result = await callHandler(context, "handleEmployeeTimesheets");
  assert.equal(result.totalHours, 8);
  assert.equal(result.monthly[0].totalHours, 8);
  assert.deepEqual(result.employeeMonthly, []);
  assert.equal(result.lines[0].isSubcontractor, true);
});
