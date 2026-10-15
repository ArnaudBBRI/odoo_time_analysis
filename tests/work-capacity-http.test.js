"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { startRuntime } = require("./steering-runtime");
const { fixture } = require("./work-capacity-fixture");

async function runtimeFixture(options = {}) {
  const source = fixture();
  const employeeFields = source.definitions["hr.employee"];
  employeeFields.user_id = { type: "many2one", relation: "res.users" };
  employeeFields.name = { type: "char" };
  source.rows["hr.employee"][0].user_id = [7, "Personne fictive"];
  source.rows["hr.employee"][0].name = "Personne fictive";
  return startRuntime({ definitions: source.definitions, records: source.rows, ...options });
}

test("capacity endpoint requires a session and valid bounded years before source reads", async t => {
  const runtime = await runtimeFixture(); t.after(() => runtime.close());
  const anonymous = await runtime.request("/api/odoo/my-work-capacity", { method: "POST", body: '{"years":[2026]}' });
  assert.equal(anonymous.status, 401);
  const cookie = (await runtime.login()).headers.get("set-cookie");
  assert.equal((await runtime.request("/api/odoo/my-work-capacity", { headers: { Cookie: cookie } })).status, 405);
  const initialCalls = runtime.calls.length;
  for (const body of ["{", "{}", '{"years":[]}', '{"years":[2026,"2027"]}', '{"years":[1899]}', JSON.stringify({ years: Array(31).fill(2026) })]) {
    const response = await runtime.request("/api/odoo/my-work-capacity", { method: "POST", headers: { Cookie: cookie }, body });
    assert.equal(response.status, 400);
  }
  assert.equal(runtime.calls.length, initialCalls, "Invalid requests do not contact Odoo");
});

test("capacity endpoint scopes every own read to the authenticated identity and ignores caller overrides", async t => {
  const runtime = await runtimeFixture(); t.after(() => runtime.close());
  const cookie = (await runtime.login()).headers.get("set-cookie");
  const response = await runtime.request("/api/odoo/my-work-capacity", {
    method: "POST", headers: { Cookie: cookie },
    body: JSON.stringify({ years: [2026, 2027, 2026], employeeId: 999, resourceId: 999, calendarId: 999,
      username: "other@example.com", apiKey: "forged-secret", url: "https://unapproved.invalid" })
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.ok, true);
  assert.equal(result.schedule.status, "available");
  assert.equal(result.schedule.hoursPerWeek, 39.75);
  assert.equal(result.years.find(year => year.year === 2026).leaveDays, 27);
  assert.ok(Math.abs(result.years.find(year => year.year === 2026).leaveHours - 214.65) < 1e-9);
  assert.equal(result.years.find(year => year.year === 2027).calendarStatus, "missing");
  assert.equal(result.years.find(year => year.year === 2027).entitlementStatus, "missing");
  const xml = runtime.calls.join("\n");
  assert.doesNotMatch(xml, /forged-secret|other@example\.com|unapproved\.invalid|<int>999<\/int>/);
  assert.doesNotMatch(xml, /<string>hr\.leave<\/string>|<string>leaves_taken<\/string>|<string>remaining_leaves<\/string>/);
  assert.match(xml, /<string>employee_id<\/string>[\s\S]*?<int>20<\/int>/);
  assert.doesNotMatch(JSON.stringify(result), /Personne fictive|salary|wage|leaves_taken/);
});

test("denied own rights remain optional unavailable data without leaking upstream error details", async t => {
  const runtime = await runtimeFixture({ failModel: "hr.leave.allocation" }); t.after(() => runtime.close());
  const cookie = (await runtime.login()).headers.get("set-cookie");
  const response = await runtime.request("/api/odoo/my-work-capacity", {
    method: "POST", headers: { Cookie: cookie }, body: '{"years":[2026,2027]}'
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.schedule.status, "available");
  assert.equal(result.years.find(year => year.year === 2026).entitlementStatus, "unavailable");
  assert.equal(result.years.find(year => year.year === 2027).entitlementStatus, "unavailable");
  assert.doesNotMatch(JSON.stringify(result), /private-upstream-secret/);
});

test("a changed upstream UID cannot redirect a capacity session to another employee", async t => {
  let attempts = 0;
  const runtime = await runtimeFixture({ authenticate() { return ++attempts === 1 ? 7 : 8; } });
  t.after(() => runtime.close());
  const cookie = (await runtime.login()).headers.get("set-cookie");
  const response = await runtime.request("/api/odoo/my-work-capacity", {
    method: "POST", headers: { Cookie: cookie }, body: '{"years":[2026]}'
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).authenticationRequired, true);
  assert.equal(runtime.calls.filter(call => call.includes("<methodName>execute_kw</methodName>")).length, 0,
    "A changed identity is rejected before reading any HR/calendar data");
});
