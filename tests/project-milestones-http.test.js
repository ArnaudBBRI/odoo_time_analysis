"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { startRuntime } = require("./steering-runtime");
const relation = (type = "many2one", target = "project.project") => ({ type, relation: target });

function milestoneFixture() {
  return {
    definitions: {
      "project.project": { id: { type: "integer" }, name: { type: "char" } },
      "project.milestone": { id: { type: "integer" }, name: { type: "char" }, display_name: { type: "char" },
        project_id: relation(), deadline: { type: "date" }, reached_date: { type: "date" }, is_reached: { type: "boolean" } }
    },
    records: {
      "project.project": [{ id: 11, name: "Archived exact project", active: false }, { id: 12, name: "Other project" }],
      // The mock deliberately ignores relation domains, exercising the server's post-filter too.
      "project.milestone": [
        { id: 81, project_id: [11, "Archived exact project"], name: "Review", deadline: "2026-06-15", is_reached: true, reached_date: "2026-06-16" },
        { id: 82, project_id: [11, "Archived exact project"], name: "Report", deadline: "2026-12-20", is_reached: false },
        { id: 83, project_id: [11, "Archived exact project"], name: "Undated", deadline: false },
        { id: 91, project_id: [12, "Other project"], name: "id:11", deadline: "2026-03-01", private_note: "PRIVATE_OTHER_PROJECT" }
      ]
    }
  };
}

async function authenticatedMilestones(runtime, body = { projectId: 11 }) {
  const login = await runtime.login(); assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  return runtime.request("/api/odoo/project-milestones", { method: "POST", headers: { Cookie: cookie,
    "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

function milestoneReads(runtime) {
  return runtime.calls.filter(xml => xml.includes("<string>project.milestone</string>") && xml.includes("<string>search_read</string>"));
}

test("milestone markers reuse authenticated exact archived-project read-only scope and scheduled source dates", async t => {
  const runtime = await startRuntime(milestoneFixture()); t.after(() => runtime.close());
  const denied = await runtime.request("/api/odoo/project-milestones", { method: "POST", body: '{"projectId":11}' });
  assert.equal(denied.status, 401); assert.equal(runtime.calls.length, 0);
  const response = await authenticatedMilestones(runtime, { projectId: 11, odooUrl: "https://invalid.example", username: "ignored", apiKey: "CALLER_OVERRIDE" });
  assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.available, true); assert.deepEqual(result.projectIds, [11]); assert.equal(result.milestoneCount, 2);
  assert.deepEqual(result.milestones.map(row => [row.id, row.name, row.date]), [[81, "Review", "2026-06-15"], [82, "Report", "2026-12-20"]]);
  assert.equal(result.milestones[0].reachedDate, "2026-06-16"); assert.equal(result.milestones[0].isReached, true);
  assert.equal(result.milestones[0].sourceFields.date, "deadline");
  assert.ok(!JSON.stringify(result).includes("PRIVATE_OTHER_PROJECT"));
  const reads = milestoneReads(runtime); assert.equal(reads.length, 1);
  assert.ok(reads.every(xml => xml.includes("<string>project_id</string>") && !xml.includes("<string>ilike</string>")));
  assert.ok(runtime.calls.some(xml => xml.includes("<string>project.project</string>") && xml.includes("<name>active_test</name><value><boolean>0")));
  assert.ok(runtime.calls.every(xml => !xml.includes("CALLER_OVERRIDE")));
  for (const xml of runtime.calls.filter(xml => xml.includes("<methodName>execute_kw</methodName>"))) {
    assert.match(xml, /<string>(?:fields_get|search_read)<\/string>/);
    assert.doesNotMatch(xml, /<string>(?:create|write|unlink|copy)<\/string>/);
  }
});

test("an exact project with no dated milestones stays known-empty and never falls back to matching names", async t => {
  const data = milestoneFixture(); data.records["project.milestone"] = data.records["project.milestone"].filter(row => row.id >= 91);
  const runtime = await startRuntime(data); t.after(() => runtime.close());
  const response = await authenticatedMilestones(runtime); assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.available, true); assert.deepEqual(result.milestones, []);
  assert.equal(milestoneReads(runtime).length, 1); assert.ok(!milestoneReads(runtime)[0].includes("<string>ilike</string>"));
});

test("audit and generic dates never invent a scheduled milestone while explicit deadline and custom target dates remain usable", async t => {
  const data = milestoneFixture();
  const auditFields = ["create_date", "write_date", "__last_update", "created_at", "updated_at", "date_created", "date_modified", "last_updated", "created_on", "updated_on", "last_modified"];
  for (const field of auditFields) data.definitions["project.milestone"][field] = { type: "datetime", string: "Milestone audit date" };
  Object.assign(data.definitions["project.milestone"], { x_other_date: { type: "date", string: "Other date" },
    x_delivery_target: { type: "date", string: "Delivery target date" }, date: { type: "date" } });
  const auditValues = Object.fromEntries(auditFields.map(field => [field, "2026-01-02 09:00:00"]));
  data.records["project.milestone"] = [
    { id: 81, project_id: [11, "Project"], name: "Scheduled", ...auditValues, deadline: "2026-06-15", x_delivery_target: "2026-06-20" },
    { id: 82, project_id: [11, "Project"], name: "Undated", deadline: false, ...auditValues, x_other_date: "2026-05-01" },
    { id: 83, project_id: [11, "Project"], name: "Custom target", deadline: false, ...auditValues, x_delivery_target: "2026-07-01" },
    { id: 84, project_id: [11, "Project"], name: "Exact date field", deadline: false, ...auditValues, date: "2026-08-01" }
  ];
  const runtime = await startRuntime(data); t.after(() => runtime.close());
  const response = await authenticatedMilestones(runtime); assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.available, true);
  assert.deepEqual(result.milestones.map(row => [row.id, row.date, row.sourceFields.date]), [
    [81, "2026-06-15", "deadline"], [83, "2026-07-01", "x_delivery_target"], [84, "2026-08-01", "date"]
  ]);
  for (const field of auditFields) {
    assert.ok(!result.fields.includes(field));
    assert.ok(milestoneReads(runtime).every(xml => !xml.includes(`<string>${field}</string>`)), `${field} must not be requested`);
  }
});

test("exact project milestones support project_ids metadata and deduplicate shared relation results", async t => {
  const data = milestoneFixture(); data.definitions["project.milestone"].project_ids = relation("many2many");
  data.records["project.milestone"].push(
    { id: 84, project_id: false, project_ids: [11, 12], name: "Shared review", deadline: "2026-07-01" },
    { id: 92, project_id: false, project_ids: [12], name: "Foreign review", deadline: "2026-08-01" });
  const runtime = await startRuntime(data); t.after(() => runtime.close());
  const response = await authenticatedMilestones(runtime); assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.available, true); assert.deepEqual(result.milestones.map(row => row.id), [81, 84, 82]);
  const reads = milestoneReads(runtime); assert.equal(reads.length, 2);
  assert.ok(reads.every(xml => !xml.includes("<string>ilike</string>")));
  assert.ok(reads.some(xml => xml.includes("<string>project_ids</string>")));
});

test("a project_ids-only one-to-many relation is requested and remains exact-project scoped", async t => {
  const data = milestoneFixture(); delete data.definitions["project.milestone"].project_id;
  Object.assign(data.definitions["project.milestone"], { project_ids: relation("one2many"),
    related_project_ids: relation("one2many"), milestone_task_ids: relation("one2many", "project.task") });
  data.records["project.milestone"] = [
    { id: 84, project_ids: [11], name: "Related project review", deadline: "2026-07-01" },
    { id: 92, project_ids: [12], name: "Foreign review", deadline: "2026-08-01" }
  ];
  const runtime = await startRuntime(data); t.after(() => runtime.close());
  const response = await authenticatedMilestones(runtime); assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.available, true);
  assert.deepEqual(result.milestones.map(row => row.id), [84]);
  assert.ok(result.fields.includes("project_ids"));
  assert.ok(!result.fields.includes("related_project_ids")); assert.ok(!result.fields.includes("milestone_task_ids"));
  const reads = milestoneReads(runtime); assert.equal(reads.length, 1);
  const requestedFields = /<name>fields<\/name><value><array><data>([\s\S]*?)<\/data><\/array>/.exec(reads[0])?.[1];
  assert.ok(requestedFields?.includes("<string>project_ids</string>"), "The relation must be returned so the exact-project post-filter can verify membership");
  assert.ok(!reads[0].includes("<string>ilike</string>"));
});

for (const kind of ["missing", "wrong-target", "wrong-type"]) {
  test(`unverifiable ${kind} project relation leaves optional milestones unavailable without unscoped reads`, async t => {
    const data = milestoneFixture();
    if (kind === "missing") delete data.definitions["project.milestone"].project_id;
    else data.definitions["project.milestone"].project_id = kind === "wrong-target" ? relation("many2one", "project.task") : { type: "char" };
    const runtime = await startRuntime(data); t.after(() => runtime.close());
    const response = await authenticatedMilestones(runtime); assert.equal(response.status, 200); const result = await response.json();
    assert.equal(result.available, false); assert.deepEqual(result.milestones, []); assert.equal(milestoneReads(runtime).length, 0);
  });
}

test("optional milestone read denial does not return private upstream fault details", async t => {
  const runtime = await startRuntime({ ...milestoneFixture(), failModel: "project.milestone" }); t.after(() => runtime.close());
  const response = await authenticatedMilestones(runtime); assert.equal(response.status, 500);
  const result = await response.json(); assert.equal(result.ok, false); assert.doesNotMatch(JSON.stringify(result), /private-upstream-secret/);
  assert.match(result.error, /milestone.*unavailable/i);
});

test("one unreadable exact relation cannot present the remaining query as a complete milestone set", async t => {
  const data = milestoneFixture(); data.definitions["project.milestone"].project_ids = relation("many2many");
  const runtime = await startRuntime({ ...data, failRead: (model, xml) => model === "project.milestone" &&
    xml.includes("<string>project_ids</string></value><value><string>in</string>") }); t.after(() => runtime.close());
  const response = await authenticatedMilestones(runtime); assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.available, false); assert.equal(milestoneReads(runtime).length, 2);
  assert.doesNotMatch(JSON.stringify(result), /private-upstream-secret/);
});

test("legacy code-based dashboard milestone callers retain their readable name fallback", async t => {
  const data = milestoneFixture(); delete data.definitions["project.milestone"].project_id;
  data.records["project.milestone"] = [{ id: 81, name: "Legacy project review", deadline: "2026-06-15" }];
  const runtime = await startRuntime(data); t.after(() => runtime.close());
  const response = await authenticatedMilestones(runtime, { projectCode: "Legacy" }); assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.available, true); assert.equal(result.milestones.length, 1);
  assert.ok(milestoneReads(runtime).some(xml => xml.includes("<string>ilike</string>")));
});
