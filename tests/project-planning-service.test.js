"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { load } = require("../project-planning-service");

const relation = target => ({ type: "many2one", relation: target });
const metadata = () => ({
  "resource.resource": { id: { type: "integer" }, name: { type: "char" }, employee_id: relation("hr.employee") },
  "hr.employee": { id: { type: "integer" }, resource_id: relation("resource.resource") },
  "hr.employee.public": { id: { type: "integer" }, resource_id: relation("resource.resource") }
});
const slot = (resourceId, employeeId = null, extra = {}) => ({ projectId: 11, resourceId, employeeId,
  start: "2026-01-01", end: "2027-01-01", hours: 100, ...extra });
function fixture(options = {}) {
  const calls = [], definitions = options.definitions || metadata();
  const rows = options.rows || {};
  return { calls,
    async fields(model) {
      calls.push({ model, method: "fields_get" });
      if (options.deniedMetadata?.includes(model)) throw new Error("PRIVATE_METADATA_FAULT");
      return structuredClone(definitions[model] || {});
    },
    async read(model, domain, fields, kwargs) {
      calls.push({ model, method: "search_read", domain, fields, kwargs });
      if (options.deniedModels?.includes(model) || fields.some(field => options.deniedFields?.[model]?.includes(field))) {
        throw new Error("PRIVATE_READ_FAULT");
      }
      // Return foreign and contradictory rows deliberately: the service must
      // enforce each requested identity instead of trusting this fixture.
      return structuredClone(rows[model] || []);
    }
  };
}

test("explicit project employee IDs need no resource read and planning values stay untouched", async () => {
  const rpc = fixture(), input = [slot(null, 20), slot(null, 21, { hours: -1.25 })], before = structuredClone(input);
  assert.deepEqual(await load(rpc, 11, input), { resources: [], identities: [
    { status: "person", employeeId: 20 }, { status: "person", employeeId: 21 }
  ] });
  assert.deepEqual(rpc.calls, []); assert.deepEqual(input, before);
});

test("exact TH resource names identify collective placeholders independently of their technical employee links", async () => {
  const rpc = fixture({ rows: { "resource.resource": [
    { id: 201, name: "TH_DiCo", employee_id: false, private_note: "DO_NOT_EXPOSE" },
    { id: 202, name: "TH_Linked", employee_id: [20, "Person"] },
    { id: 203, name: "Other unlinked resource", employee_id: null },
    { id: 204, name: "TH_Unknown" }, { id: 999, name: "TH_Foreign", employee_id: false }
  ] } });
  const input = [slot(201), slot(202), slot(203), slot(204)], before = structuredClone(input);
  const result = await load(rpc, 11, input);
  assert.deepEqual(result.identities, [{ status: "to-hire", employeeId: null }, { status: "to-hire", employeeId: null },
    { status: "unlinked", employeeId: null }, { status: "to-hire", employeeId: null }]);
  assert.deepEqual(result.resources.map(row => row.isToHire), [true, true, false, true]);
  assert.deepEqual(result.resources.map(row => row.linkStatus), ["unlinked", "linked", "unlinked", "unknown"]);
  assert.equal(result.resources[1].employeeId, 20, "The placeholder keeps its technical HR link separately");
  assert.doesNotMatch(JSON.stringify(result), /DO_NOT_EXPOSE|Foreign/); assert.deepEqual(input, before);
  const reads = rpc.calls.filter(call => call.method === "search_read");
  assert.deepEqual(reads[0].domain, [["id", "in", [201, 202, 203, 204]]]);
  assert.deepEqual(reads[0].fields, ["id", "name", "employee_id"]);
  assert.ok(reads.every(call => call.kwargs.context.active_test === false));
  assert.ok(reads.filter(call => call.model.startsWith("hr.employee")).every(call =>
    JSON.stringify(call.domain) === JSON.stringify([["resource_id", "in", [204]]]) &&
    JSON.stringify(call.fields) === JSON.stringify(["id", "resource_id"])));
});

test("a readable TH marker confirms the placeholder but an empty employee search does not prove an unlinked resource", async () => {
  const definitions = metadata(); delete definitions["resource.resource"].employee_id;
  const rpc = fixture({ definitions, rows: { "resource.resource": [{ id: 201, name: "TH_DiCo", employee_id: false }] } });
  const result = await load(rpc, 11, [slot(201)]);
  assert.equal(result.resources[0].name, "TH_DiCo");
  assert.equal(result.resources[0].linkStatus, "unknown"); assert.equal(result.resources[0].isToHire, true);
  assert.deepEqual(result.identities, [{ status: "to-hire", employeeId: null }]);
  assert.equal(rpc.calls.filter(call => call.model.startsWith("hr.employee") && call.method === "search_read").length, 2);
  assert.ok(rpc.calls.filter(call => call.model === "resource.resource" && call.method === "search_read")
    .every(call => !call.fields.includes("employee_id")));
});

test("resource-name and employee-field denials recover independently without reflecting faults or guessing TH zero", async () => {
  const rows = { "resource.resource": [{ id: 201, name: "TH_DiCo", employee_id: false }] };
  for (const denied of ["name", "employee_id"]) {
    const rpc = fixture({ rows, deniedFields: { "resource.resource": [denied] } });
    const result = await load(rpc, 11, [slot(201)]);
    assert.deepEqual(result.identities, [{ status: denied === "name" ? "unknown" : "to-hire", employeeId: null }]);
    assert.equal(result.resources[0].isToHire, denied === "name" ? null : true);
    assert.equal(result.resources[0].name, denied === "name" ? null : "TH_DiCo");
    assert.equal(result.resources[0].linkStatus, denied === "employee_id" ? "unknown" : "unlinked");
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
  }
  const denied = await load(fixture({ deniedMetadata: ["resource.resource", "hr.employee", "hr.employee.public"] }), 11, [slot(201)]);
  assert.deepEqual(denied.resources, [{ id: 201, name: null, employeeId: null, linkStatus: "unknown", isToHire: null }]);
});

test("exact unique resource ownership proves a person while conflicting HR IDs and resource reuse remain unknown", async () => {
  const definitions = metadata(); delete definitions["resource.resource"].employee_id;
  const rpc = fixture({ definitions, rows: { "resource.resource": [201, 202, 203, 204].map(id => ({ id, name: "Resource Test" })),
    "hr.employee": [{ id: 20, resource_id: [201, "R1"] }, { id: 21, resource_id: [202, "R2"] },
      { id: 22, resource_id: [202, "R2"] }, { id: 23, resource_id: [203, "R3"] },
      { id: 24, resource_id: [999, "Foreign"] }],
    "hr.employee.public": [{ id: 20, resource_id: [201, "R1"] }, { id: 23, resource_id: [204, "R4"] }]
  } });
  const result = await load(rpc, 11, [slot(201), slot(202), slot(203), slot(204)]);
  assert.deepEqual(result.identities, [{ status: "person", employeeId: 20 }, ...Array.from({ length: 3 }, () => ({ status: "unknown", employeeId: null }))]);
  assert.ok(result.resources.every(row => row.isToHire === false));
  assert.deepEqual(result.resources.map(row => row.linkStatus), ["linked", "unknown", "unknown", "unknown"]);
});

test("technical original owners remain linked but unavailable resource names cannot establish real-person identity", async () => {
  const rpc = fixture({ deniedMetadata: ["resource.resource"] });
  const result = await load(rpc, 11, [slot(201, 20), slot(201), slot(202, 21), slot(202, 22), slot(202)]);
  assert.ok(result.identities.every(row => row.status === "unknown" && row.employeeId === null));
  assert.equal(result.resources[0].employeeId, 20);
  assert.equal(result.resources[0].linkStatus, "linked"); assert.equal(result.resources[0].isToHire, null);
  assert.ok(!rpc.calls.some(call => call.model.startsWith("hr.employee")), "Known original owners need no HR search");
});

test("a confirmed TH marker remains collective when its technical employee-link evidence conflicts", async () => {
  const rpc = fixture({ rows: { "resource.resource": [{ id: 201, name: "TH_DiCo", employee_id: false }] } });
  const result = await load(rpc, 11, [slot(201, 20), slot(201)]);
  assert.deepEqual(result.identities, [{ status: "to-hire", employeeId: null }, { status: "to-hire", employeeId: null }]);
  assert.equal(result.resources[0].linkStatus, "unknown"); assert.equal(result.resources[0].isToHire, true);
});

test("typed employee lists accept only a unique owner or confirmed empty list and fail closed on contradictions", async () => {
  const definitions = metadata(); definitions["resource.resource"].employee_ids = { type: "one2many", relation: "hr.employee" };
  const rpc = fixture({ definitions, rows: { "resource.resource": [
    { id: 201, name: "TH_Empty", employee_id: false, employee_ids: [] },
    { id: 202, name: "TH_Linked", employee_id: [20, "Person"], employee_ids: [20] },
    { id: 203, name: "TH_Contradiction", employee_id: false, employee_ids: [21] },
    { id: 204, name: "TH_Multiple", employee_ids: [22, 23] },
    { id: 205, name: "TH_Invalid", employee_ids: [true] }
  ] } });
  const result = await load(rpc, 11, [201, 202, 203, 204, 205].map(id => slot(id)));
  assert.ok(result.identities.every(row => row.status === "to-hire"));
  assert.deepEqual(result.resources.map(row => row.linkStatus), ["unlinked", "linked", "unknown", "unknown", "unknown"]);
});

test("the confirmed singular employee_id one2many uses strict empty, unique and ambiguous ID-array semantics", async () => {
  const definitions = metadata(); definitions["resource.resource"].employee_id = { type: "one2many", relation: "hr.employee" };
  const rpc = fixture({ definitions, rows: { "resource.resource": [
    { id: 201, name: "TH_DiCo", employee_id: [] }, { id: 202, name: "TH_Linked", employee_id: [20] },
    { id: 203, name: "TH_Ambiguous", employee_id: [21, 22] }, { id: 204, name: "TH_Malformed", employee_id: false },
    { id: 205, name: "TH_Invalid", employee_id: [0] }
  ] } });
  const result = await load(rpc, 11, [201, 202, 203, 204, 205].map(id => slot(id)));
  assert.ok(result.identities.every(row => row.status === "to-hire"));
  assert.deepEqual(result.resources.map(row => row.linkStatus), ["unlinked", "linked", "unknown", "unknown", "unknown"]);
  assert.ok(result.resources.every(row => row.isToHire === true));
  assert.equal(result.resources[1].employeeId, 20);
});

test("wrong employee relation types leave linkage unknown while missing or duplicate names leave placeholder identity unknown", async () => {
  const definitions = metadata(); definitions["resource.resource"].employee_id = relation("res.users");
  const rpc = fixture({ definitions, rows: { "resource.resource": [
    { id: 201, name: "TH_DiCo", employee_id: false },
    { id: 202, name: "TH_Duplicate", employee_id: false }, { id: 202, name: "TH_Duplicate", employee_id: false }
  ] } });
  const result = await load(rpc, 11, [slot(201), slot(202), slot(203)]);
  assert.deepEqual(result.identities.map(row => row.status), ["to-hire", "unknown", "unknown"]);
  assert.equal(result.resources[1].name, null); assert.equal(result.resources[2].isToHire, null);
  assert.ok(rpc.calls.filter(call => call.model === "resource.resource" && call.method === "search_read")
    .every(call => !call.fields.includes("employee_id")));
});

test("a linked TH placeholder outranks explicit slot employee IDs with only a reserved nonempty name prefix", async () => {
  const names = ["  th_DiCo  ", "TH_", "TH_  ", "Projet_TH_DiCo", "THX_DiCo", "Employé fictif"];
  const rpc = fixture({ rows: { "resource.resource": names.map((name, index) => ({ id: 201 + index, name,
    employee_id: [20 + index, "Lien technique"] })) } });
  const input = names.map((_, index) => slot(201 + index, 20 + index, { start: "2027-01-01", end: "2028-01-01" }));
  const before = structuredClone(input), result = await load(rpc, 11, input);
  assert.deepEqual(result.identities, [{ status: "to-hire", employeeId: null }, ...Array.from({ length: 5 }, (_, index) =>
    ({ status: "person", employeeId: 21 + index }))]);
  assert.ok(result.resources.every(row => row.linkStatus === "linked"));
  assert.equal(result.resources[0].employeeId, 20); assert.equal(result.resources[0].name, "th_DiCo");
  assert.equal(result.resources[0].isToHire, true); assert.deepEqual(input, before);
});

test("denied or duplicate exact resource names do not borrow TH aliases from explicit employees", async () => {
  for (const options of [
    { rows: { "resource.resource": [{ id: 201, name: "TH_DiCo", employee_id: [20, "Employé"] }] }, deniedFields: { "resource.resource": ["name"] } },
    { rows: { "resource.resource": [{ id: 201, name: "TH_DiCo", employee_id: [20, "Employé"] },
      { id: 201, name: "TH_DiCo", employee_id: [20, "Employé"] }] } }
  ]) {
    const result = await load(fixture(options), 11, [slot(201, 20, { employee: "TH_Alias" })]);
    assert.equal(result.resources[0].name, null); assert.equal(result.resources[0].isToHire, null);
    assert.deepEqual(result.identities, [{ status: "unknown", employeeId: null }]);
  }
});

test("linked collective planning is subtracted with signed lifetime hours and does not cover real-person gaps", async () => {
  const { summarize } = require("../project-planning");
  const input = [slot(201, 20, { start: "2027-01-01", end: "2028-01-01", hours: 250 }),
    slot(201, 20, { start: "2027-01-01", end: "2028-01-01", hours: -20 }),
    slot(202, 21, { start: "2027-01-01", end: "2028-01-01", hours: 100, isSubcontractor: true })];
  const identities = await load(fixture({ rows: { "resource.resource": [
    { id: 201, name: "TH_Unité fictive", employee_id: [20, "Lien technique"] },
    { id: 202, name: "TH_Autre unité fictive", employee_id: [21, "Lien technique"] }
  ] } }), 11, input);
  const data = { project: { id: 11 }, lifetime: { startDate: "2027-01-01", endDate: "2027-12-31",
    conventionHours: 300, conventionStatus: "available" }, planning: { ok: true, resources: identities.resources,
      slots: input.map((value, index) => ({ ...value, planningIdentity: identities.identities[index] })) } };
  const summary = summarize(data, { now: "2027-01-01" });
  assert.equal(summary.totalPlanned, 230); assert.equal(summary.knownToHireHours, 230);
  assert.equal(summary.plannedWithoutKnownToHire, 0); assert.equal(summary.toHireStatus, "complete");
  assert.deepEqual(summary.toHireResources, [{ id: 201, name: "TH_Unité fictive", hours: 230 }]);
  assert.equal(summary.coverage.status, "gaps"); assert.equal(summary.coverage.gapDays, 365);
  assert.equal(summarize(data, { now: "2027-01-01", includeOrmitters: true }).knownToHireHours, 330);
});

test("invalid employee identities cannot borrow a coincident resource and foreign project identities are never queried", async () => {
  const rpc = fixture({ rows: { "resource.resource": [{ id: 201, name: "Person", employee_id: [20, "Person"] }] } });
  const input = [slot(201, "invalid employee"), slot(999, 21, { projectId: 12 }), slot(null)];
  const result = await load(rpc, 11, input);
  assert.ok(result.identities.every(row => row.status === "unknown"));
  assert.deepEqual(result.resources.map(row => row.id), [201]);
  for (const invalid of [null, false, true, 0, -1, "invalid", "toString", Number.MAX_SAFE_INTEGER + 1]) {
    const invalidRpc = fixture(); await assert.rejects(load(invalidRpc, invalid, input)); assert.deepEqual(invalidRpc.calls, []);
  }
});
