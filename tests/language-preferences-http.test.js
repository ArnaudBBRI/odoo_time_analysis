"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const { startRuntime } = require("./steering-runtime");
const route = "/api/preferences/language";

test("language preference is public to read but session/origin/strict-input protected to change", async t => {
  const runtime = await startRuntime(); t.after(() => runtime.close());
  assert.deepEqual(await (await runtime.request(route)).json(), { ok: true, language: "fr" });
  assert.equal(runtime.calls.length, 0);
  for (const asset of ["i18n.js", "i18n-core-messages.js", "i18n-shell-messages.js", "i18n-project-messages.js",
    "i18n-timeline-messages.js", "i18n-steering-messages.js", "i18n-server-messages.js", "language-client.js"]) {
    const response = await runtime.request(`/${asset}`);
    assert.equal(response.status, 200, `${asset} must load on the unauthenticated welcome page`);
    assert.match(response.headers.get("content-type"), /javascript/);
    assert.equal((await runtime.request(`/${asset}`, { method: "POST", body: "{}" })).status, 405);
  }
  assert.equal(runtime.calls.length, 0, "Public language assets never contact Odoo");
  const config = path.join(runtime.directory, "config.local.json"), original = fs.readFileSync(config, "utf8");
  const send = (body, headers = {}) => runtime.request(route, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
  assert.equal((await send({ language: "nl" })).status, 401);
  const Cookie = (await runtime.login()).headers.get("set-cookie"), before = runtime.calls.length;
  assert.equal((await runtime.request(route, { method: "PUT", headers: { Cookie } })).status, 405);
  assert.equal((await send({ language: "nl" }, { Cookie, Origin: "https://unapproved.invalid" })).status, 403);
  for (const body of ["{", "[]", "null", "{}", '{"language":"NL"}', '{"language":"de"}', '{"language":"nl","apiKey":"forged"}', '{"language":"nl","path":"../other"}']) {
    assert.equal((await send(body, { Cookie })).status, 400);
  }
  assert.equal(fs.readFileSync(config, "utf8"), original);
  const saved = await send({ language: "nl" }, { Cookie });
  assert.deepEqual(await saved.json(), { ok: true, language: "nl" });
  assert.deepEqual(JSON.parse(fs.readFileSync(config, "utf8")), { ...JSON.parse(original), language: "nl" });
  assert.deepEqual(await (await runtime.request(route)).json(), { ok: true, language: "nl" });
  assert.equal(runtime.calls.length, before, "Reading/saving language never contacts Odoo");
  for (const privateRoute of ["/config.local.json", "/language-preferences.js"]) {
    assert.equal((await runtime.request(privateRoute, { headers: { Cookie } })).status, 404);
  }
});

test("a missing config is created with only language, while invalid config is preserved without leaking its content", async t => {
  const runtime = await startRuntime(); t.after(() => runtime.close());
  const Cookie = (await runtime.login()).headers.get("set-cookie"), before = runtime.calls.length;
  const config = path.join(runtime.directory, "config.local.json"); fs.unlinkSync(config);
  const send = () => runtime.request(route, { method: "POST", headers: { Cookie }, body: '{"language":"nl"}' });
  assert.deepEqual(await (await send()).json(), { ok: true, language: "nl" });
  assert.deepEqual(JSON.parse(fs.readFileSync(config, "utf8")), { language: "nl" });
  fs.writeFileSync(config, "broken synthetic-private-config-value");
  const rejected = await send(); assert.equal(rejected.status, 503);
  const result = await rejected.json(); assert.equal(result.code, "LANGUAGE_CONFIG_INVALID");
  assert.doesNotMatch(JSON.stringify(result), /synthetic-private|config\.local|apiKey|username/);
  assert.equal(fs.readFileSync(config, "utf8"), "broken synthetic-private-config-value");
  assert.deepEqual(await (await runtime.request(route)).json(), { ok: true, language: "fr" });
  assert.equal(runtime.calls.length, before);
});
