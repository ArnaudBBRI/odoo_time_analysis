"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { startRuntime } = require("./steering-runtime");
const relation = target => ({ type: "many2one", relation: target });

function fixtureData() {
  return {
    definitions: {
      "project.project": { id: { type: "integer" }, name: { type: "char" } },
      "account.analytic.line": { id: { type: "integer" }, project_id: relation("project.project"),
        employee_id: relation("hr.employee"), date: { type: "date" }, unit_amount: { type: "float" } },
      "planning.slot": { id: { type: "integer" }, project_id: relation("project.project"), employee_id: relation("hr.employee"),
        resource_id: relation("resource.resource"), start_datetime: { type: "datetime" }, end_datetime: { type: "datetime" }, allocated_hours: { type: "float" } },
      "hr.employee": { id: { type: "integer" }, name: { type: "char" }, user_id: relation("res.users"),
        resource_id: relation("resource.resource"), job_title: { type: "char" } },
      "hr.employee.public": { id: { type: "integer" }, resource_id: relation("resource.resource") },
      "resource.resource": { id: { type: "integer" }, name: { type: "char" }, employee_id: { type: "one2many", relation: "hr.employee" } },
      "bw.staffing.convention": { id: { type: "integer" }, project_id: relation("project.project"), employee_id: relation("hr.employee") }
    },
    records: {
      "project.project": [{ id: 11, name: "Projet fictif" }, { id: 12, name: "Projet étranger" }],
      "account.analytic.line": [{ id: 3, project_id: [11, "Projet"], employee_id: [20, "Employé"], date: "2026-03-01", unit_amount: 10 }],
      "planning.slot": [
        { id: 31, project_id: [11, "Projet"], employee_id: [20, "Employé"], resource_id: [201, "Personne"],
          start_datetime: "2026-01-01", end_datetime: "2027-01-01", allocated_hours: 100 },
        { id: 32, project_id: [11, "Projet"], employee_id: false, resource_id: [202, "TH_DiCo"],
          start_datetime: "2026-01-01", end_datetime: "2027-01-01", allocated_hours: 50 },
        { id: 33, project_id: [11, "Projet"], employee_id: false, resource_id: [203, "Autre ressource"],
          start_datetime: "2026-01-01", end_datetime: "2027-01-01", allocated_hours: 25 },
        { id: 34, project_id: [11, "Projet"], employee_id: false, resource_id: [204, "TH_Ambigu"],
          start_datetime: "2026-01-01", end_datetime: "2027-01-01", allocated_hours: 10 },
        { id: 35, project_id: [12, "Étranger"], employee_id: false, resource_id: [999, "TH_Étranger"],
          start_datetime: "2026-01-01", end_datetime: "2027-01-01", allocated_hours: 999 }
      ],
      "hr.employee": [
        { id: 20, name: "Employé fictif", user_id: [7, "Compte"], resource_id: [201, "Personne"], job_title: "Engineer" },
        { id: 21, name: "Premier lien ambigu", user_id: [8, "Autre"], resource_id: [204, "TH_Ambigu"], job_title: "Engineer" },
        { id: 22, name: "Deuxième lien ambigu", user_id: [9, "Autre"], resource_id: [204, "TH_Ambigu"], job_title: "Engineer" }
      ],
      "resource.resource": [
        { id: 201, name: "Personne", employee_id: [20] }, { id: 202, name: "TH_DiCo", employee_id: [] },
        { id: 203, name: "Autre ressource", employee_id: [] }, { id: 204, name: "TH_Ambigu", employee_id: [21, 22] },
        { id: 999, name: "TH_Étranger", employee_id: [], private_note: "PRIVATE_RESOURCE_NOTE" }
      ],
      "hr.employee.public": [], "bw.staffing.convention": []
    }
  };
}

async function hours(runtime, extra = {}) {
  const login = await runtime.login(); assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const response = await runtime.request("/api/odoo/project-hours", { method: "POST", headers: {
    Cookie: cookie, "Content-Type": "application/json"
  }, body: JSON.stringify({ projectId: 11, ...extra }) });
  assert.equal(response.status, 200);
  return { result: await response.json(), cookie };
}

function linkedPlaceholderFixture() {
  const data = fixtureData();
  Object.assign(data.definitions["project.project"], { date_start: { type: "date" }, date: { type: "date" },
    budget_staffing_convention_hours: { type: "float" } });
  Object.assign(data.records["project.project"][0], { date_start: "2026-01-01", date: "2027-12-31",
    budget_staffing_convention_hours: 500 });
  data.records["resource.resource"].push({ id: 205, name: "TH_Unité fictive", employee_id: [23] });
  data.records["hr.employee"].push({ id: 23, name: "TH_Unité fictive", resource_id: [205, "TH_Unité fictive"], job_title: "Engineer" });
  for (const [id, allocated_hours] of [[36, 250], [37, -20]]) data.records["planning.slot"].push({ id,
    project_id: [11, "Projet"], employee_id: [23, "TH_Unité fictive"], resource_id: [205, "TH_Unité fictive"],
    start_datetime: "2027-01-01", end_datetime: "2028-01-01", allocated_hours });
  return data;
}

test("a linked TH planned in a later year remains collective through HTTP normalization and lifetime coverage", async t => {
  const runtime = await startRuntime(linkedPlaceholderFixture()); t.after(() => runtime.close());
  const { result } = await hours(runtime);
  const resource = result.planning.resources.find(row => row.id === 205);
  assert.equal(resource.linkStatus, "linked"); assert.equal(resource.employeeId, 23); assert.equal(resource.isToHire, true);
  const collective = result.planning.slots.filter(row => row.resourceId === 205);
  assert.deepEqual(collective.map(row => row.employeeId), [23, 23], "Original technical IDs remain intact");
  assert.ok(collective.every(row => row.planningIdentity.status === "to-hire" && row.planningIdentity.employeeId === null));
  assert.deepEqual(collective.map(row => row.hours), [250, -20]);
  const summary = require("../project-planning").summarize(result, { now: "2027-01-01" });
  assert.equal(summary.totalPlanned, 415); assert.equal(summary.knownToHireHours, 290);
  assert.equal(summary.plannedWithoutKnownToHire, 125);
  assert.deepEqual(summary.toHireResources.find(row => row.id === 205), { id: 205, name: "TH_Unité fictive", hours: 230 });
  assert.equal(summary.coverage.status, "gaps"); assert.equal(summary.coverage.gapDays, 364);
  assert.deepEqual(summary.coverage.gaps, [{ startDate: "2027-01-02", endDate: "2027-12-31", days: 364 }],
    "The preceding real-person slot touches Brussels 1 January but TH planning cannot cover the remaining days");
  assert.ok(runtime.calls.every(xml => !/<string>(?:write|create|unlink|copy|action_[^<]*)<\/string>/.test(xml)));
});

test("an optional planning identity service failure does not turn technically linked resources into confirmed real people", async t => {
  const data = linkedPlaceholderFixture();
  data.records["planning.slot"].push({ id: 38, project_id: [11, "Projet"], employee_id: [20, "Employé fictif"],
    resource_id: false, start_datetime: "2027-01-01", end_datetime: "2028-01-01", allocated_hours: 15 });
  const runtime = await startRuntime(data); t.after(() => runtime.close());
  require("node:fs").writeFileSync(require("node:path").join(runtime.directory, "project-planning-service.js"),
    'throw new Error("PRIVATE_OPTIONAL_IDENTITY_FAILURE");\n');
  const { result } = await hours(runtime);
  assert.ok(result.planning.resources.every(row => row.name === null && row.isToHire === null));
  assert.ok(result.planning.slots.filter(row => row.resourceId).every(row => row.planningIdentity.status === "unknown"));
  assert.deepEqual(result.planning.slots.find(row => row.id === 38).planningIdentity, { status: "person", employeeId: 20 });
  assert.equal(result.planning.totalHours, 430); assert.doesNotMatch(JSON.stringify(result), /PRIVATE_OPTIONAL_IDENTITY_FAILURE/);
  const summary = require("../project-planning").summarize(result, { now: "2027-01-02" });
  assert.equal(summary.totalPlanned, 430); assert.equal(summary.toHireStatus, "partial");
  assert.match(summary.warnings.join(" "), /identité de certaines ressources/);
});

test("denied or duplicated linked TH resource names keep positive employee slots unknown rather than guessing person or TH", async t => {
  for (const mode of ["denied", "duplicate"]) {
    const data = linkedPlaceholderFixture();
    if (mode === "denied") data.failReadFields = { "resource.resource": ["name"] };
    else data.records["resource.resource"].push(structuredClone(data.records["resource.resource"].find(row => row.id === 205)));
    const runtime = await startRuntime(data); t.after(() => runtime.close());
    const { result } = await hours(runtime);
    const resource = result.planning.resources.find(row => row.id === 205);
    assert.equal(resource.name, null); assert.equal(resource.isToHire, null);
    assert.ok(result.planning.slots.filter(row => row.resourceId === 205).every(row => row.employeeId === 23 &&
      row.planningIdentity.status === "unknown" && row.planningIdentity.employeeId === null));
    assert.equal(result.planning.totalHours, 415);
  }
});

test("project-hour HTTP adds exact optional planning identities before the old role lookup mutates resource-only IDs", async t => {
  const data = fixtureData(), runtime = await startRuntime(data); t.after(() => runtime.close());
  const { result, cookie } = await hours(runtime, { resourceIds: [999], employeeId: 999 });
  assert.deepEqual(result.planning.resources.map(row => row.id), [201, 202, 203, 204]);
  assert.deepEqual(result.planning.resources.map(row => row.linkStatus), ["linked", "unlinked", "unlinked", "unknown"]);
  assert.deepEqual(result.planning.resources.map(row => row.isToHire), [false, true, false, true]);
  assert.deepEqual(result.planning.slots.map(row => row.planningIdentity.status), ["person", "to-hire", "unlinked", "to-hire"]);
  assert.equal(result.planning.slots[3].employeeId, 21, "The original classifier's first-match behavior remains unchanged");
  assert.equal(result.planning.slots[3].planningIdentity.employeeId, null, "The collective marker must not become a person after the older resolver runs");
  assert.equal(result.planning.totalHours, 185); assert.equal(result.timesheets.totalHours, 10);
  assert.doesNotMatch(JSON.stringify(result.planning.resources), /PRIVATE|Étranger/);
  const resourceReads = runtime.calls.filter(xml => xml.includes("<string>resource.resource</string>") && xml.includes("<string>search_read</string>"));
  assert.equal(resourceReads.length, 1);
  for (const id of [201, 202, 203, 204]) assert.ok(resourceReads[0].includes(`<int>${id}</int>`));
  assert.ok(!resourceReads[0].includes("<int>999</int>"));
  assert.ok(resourceReads[0].includes("<string>employee_id</string>"));
  assert.ok(!resourceReads[0].includes("<string>user_id</string>"));
  assert.equal((await runtime.request("/project-planning-service.js", { headers: { Cookie: cookie } })).status, 404);
  assert.ok(runtime.calls.every(xml => !/<string>(?:write|create|unlink|copy|action_[^<]*)<\/string>/.test(xml)));
});

test("denied resource names leave TH unknown while denied employee links retain exact-name collective evidence", async t => {
  for (const field of ["employee_id", "name"]) {
    const runtime = await startRuntime({ ...fixtureData(), failReadFields: { "resource.resource": [field] } });
    t.after(() => runtime.close());
    const { result } = await hours(runtime);
    const th = result.planning.resources.find(row => row.id === 202);
    assert.equal(th.isToHire, field === "name" ? null : true);
    assert.equal(result.planning.slots[1].planningIdentity.status, field === "name" ? "unknown" : "to-hire");
    assert.equal(result.planning.totalHours, 185); assert.equal(result.timesheets.totalHours, 10);
    assert.doesNotMatch(JSON.stringify(result), /private-upstream-secret|PRIVATE_RESOURCE_NOTE/);
    assert.equal(th.name, field === "name" ? null : "TH_DiCo");
  }
});

test("resource employee metadata absence preserves exact-name TH evidence without proving an empty technical link", async t => {
  const data = fixtureData(); delete data.definitions["resource.resource"].employee_id;
  const runtime = await startRuntime(data); t.after(() => runtime.close());
  const { result } = await hours(runtime);
  const th = result.planning.resources.find(row => row.id === 202);
  assert.equal(th.name, "TH_DiCo"); assert.equal(th.linkStatus, "unknown"); assert.equal(th.isToHire, true);
  assert.equal(result.planning.slots[1].planningIdentity.status, "to-hire");
  assert.equal(result.planning.totalHours, 185);
  const resourceReads = runtime.calls.filter(xml => xml.includes("<string>resource.resource</string>") && xml.includes("<string>search_read</string>"));
  assert.ok(resourceReads.every(xml => !xml.includes("<string>employee_id</string>")));
});

test("malformed or duplicate resource identity evidence remains unknown without breaking the project-hour response", async t => {
  const data = fixtureData();
  data.records["resource.resource"].push({ id: 202, name: "TH_DiCo", employee_id: [] });
  data.records["resource.resource"].find(row => row.id === 203).employee_id = false;
  const runtime = await startRuntime(data); t.after(() => runtime.close());
  const { result } = await hours(runtime);
  assert.equal(result.planning.resources.find(row => row.id === 202).isToHire, null);
  assert.equal(result.planning.resources.find(row => row.id === 203).linkStatus, "unknown");
  assert.deepEqual(result.planning.slots.slice(1).map(row => row.planningIdentity.status), ["unknown", "unknown", "to-hire"]);
  assert.equal(result.planning.totalHours, 185);
});
