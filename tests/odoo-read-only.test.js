const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const serverPath = path.join(__dirname, "..", "server.js");
const source = fs.readFileSync(serverPath, "utf8");
const baseUrl = "https://odoo.example.invalid";
const policyError = /Odoo is strictly read-only/;

function loadServer() {
  const requests = [];
  const timers = [];
  const server = {
    listen(port, host, callback) {
      assert.equal(host, "127.0.0.1");
      callback();
    },
    address() { return {port: 8765}; },
    on() {}
  };
  const context = {
    __dirname: path.dirname(serverPath),
    process: { env: {} },
    console: { log() {}, error() {} },
    URL,
    AbortController,
    Buffer,
    require(name) {
      if (["crypto", "async_hooks"].includes(name)) return require(name);
      if (name === "./steering-service") return require("../steering-service");
      if (name === "http") {
        return { createServer: () => server };
      }
      if (name === "path") {
        return path;
      }
      if (name === "fs") {
        return {
          existsSync: () => false,
          readFileSync() {
            throw new Error("Tests must not read local configuration files");
          }
        };
      }
      throw new Error(`Unexpected server dependency: ${name}`);
    },
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimeout() {},
    async fetch(endpoint, options) {
      requests.push({ endpoint, options });
      return {
        ok: true,
        async text() {
          return "<methodResponse><params><param><value><array><data></data></array></value></param></params></methodResponse>";
        }
      };
    }
  };

  // Run the actual unexported server functions while stubbing all I/O and boot.
  vm.runInNewContext(source, context, { filename: serverPath, timeout: 1000 });
  return { context, requests, timers };
}

function objectParams(method, args = [], kwargs = {}) {
  return ["test-db", 42, "test-key", "project.project", method, args, kwargs];
}

test("every current RPC operation is allowed and retains its XML-RPC request", async (t) => {
  const calls = [
    { service: "object", method: "execute_kw", params: objectParams("read_group", [[]], { fields: ["effective_hours:sum"], groupby: ["project_id"] }) },
    { service: "common", method: "authenticate", params: ["test-db", "test-user", "test-key", {}] },
    { service: "common", method: "version", params: [] },
    { service: "db", method: "list", params: [] },
    { service: "object", method: "execute_kw", params: objectParams("fields_get", [], { attributes: ["string"] }) },
    { service: "object", method: "execute_kw", params: objectParams("search_read", [[]], { fields: ["id"], limit: 1000 }) }
  ];
  for (const call of calls) {
    await t.test(`${call.service}.${call.params[4] || call.method}`, async () => {
      const { context, requests, timers } = loadServer();
      const endpoint = `${baseUrl}/xmlrpc/2/${call.service}`;
      const result = await context.xmlRpcCall(endpoint, call.method, call.params);

      assert.equal(result.length, 0);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].endpoint, endpoint);
      assert.equal(requests[0].options.method, "POST");
      assert.match(requests[0].options.body, new RegExp(`<methodName>${call.method}</methodName>`));
      if (call.service === "object") {
        assert.ok(requests[0].options.body.includes(`<string>${call.params[4]}</string>`));
      }
      assert.equal(timers.length, 1);
      assert.equal(timers[0].delay, 15000);
    });
  }
});

test("existing helpers and an Odoo base-path prefix remain supported", async () => {
  const { context, requests } = loadServer();
  await context.authenticateOdoo(`${baseUrl}/odoo`, "test-db", "test-user", "test-key");
  await context.getModelFields(baseUrl, "test-db", 42, "test-key", "planning.slot");
  await context.searchReadAll(baseUrl, "test-db", 42, "test-key", "account.analytic.line", [], ["id"]);
  assert.equal(requests.length, 3);
  assert.equal(requests[0].endpoint, `${baseUrl}/odoo/xmlrpc/2/common`);
  assert.match(requests[1].options.body, /<string>fields_get<\/string>/);
  assert.match(requests[2].options.body, /<string>search_read<\/string>/);
});

test("mutations and unknown model methods are blocked before serialization or network access", async () => {
  const { context, requests, timers } = loadServer();
  const cyclic = {};
  cyclic.self = cyclic;
  for (const method of ["create", "write", "unlink", "copy", "load", "action_confirm", "button_validate", "custom_action", "read", "search", "unknown_method"]) {
    // A circular argument would fail XML serialization if the guard ran too late.
    await assert.rejects(context.executeKw(baseUrl, "test-db", 42, "test-key", "project.project", method, [cyclic]), policyError);
  }
  assert.equal(requests.length, 0);
  assert.equal(timers.length, 0);
});

test("unknown RPCs, legacy execute, and wrong services are blocked", async () => {
  const { context, requests, timers } = loadServer();
  const calls = [
    ["common", "execute_kw", objectParams("search_read")],
    ["common", "search_read", []],
    ["db", "authenticate", ["test-db", "test-user", "test-key", {}]],
    ["db", "create_database", []],
    ["db", "drop", []],
    ["db", "restore", []],
    ["object", "version", []],
    ["object", "execute", objectParams("write")],
    ["object", "execute", objectParams("search_read")],
    ["object", "write", []],
    ["object", "unknown_rpc", []],
    ["unknown", "version", []]
  ];
  for (const [service, method, params] of calls) {
    await assert.rejects(context.xmlRpcCall(`${baseUrl}/xmlrpc/2/${service}`, method, params), policyError);
  }
  assert.equal(requests.length, 0);
  assert.equal(timers.length, 0);
});

test("malformed requests and endpoints fail closed", async () => {
  const { context, requests, timers } = loadServer();
  const endpoint = `${baseUrl}/xmlrpc/2/object`;
  const malformedCalls = [
    [endpoint, "execute_kw", undefined],
    [endpoint, "execute_kw", null],
    [endpoint, "execute_kw", {}],
    [endpoint, "execute_kw", []],
    [endpoint, "execute_kw", objectParams(undefined)],
    [endpoint, "execute_kw", objectParams({ toString: () => "search_read" })],
    [endpoint, "execute_kw", objectParams("SEARCH_READ")],
    [endpoint, "execute_kw", objectParams("search_read", {}, {})],
    [endpoint, "execute_kw", objectParams("search_read", [], null)],
    [endpoint, "execute_kw", objectParams("search_read", [], [])],
    [endpoint, "execute_kw", ["test-db", 42, "test-key", "", "search_read", [], {}]],
    [endpoint, "execute_kw", [...objectParams("search_read"), "extra"]],
    [`${baseUrl}/xmlrpc/2/common`, "authenticate", []],
    [`${baseUrl}/xmlrpc/2/common`, "authenticate", ["test-db", "test-user", "test-key", null]],
    [`${baseUrl}/xmlrpc/2/common`, "version", ["extra"]],
    [`${baseUrl}/xmlrpc/2/db`, "list", ["extra"]],
    ["invalid-url", "execute_kw", objectParams("search_read")],
    [`file:///xmlrpc/2/object`, "execute_kw", objectParams("search_read")],
    [`${baseUrl}/xmlrpc/object`, "execute_kw", objectParams("search_read")],
    [`${baseUrl}/jsonrpc`, "execute_kw", objectParams("search_read")],
    [`${endpoint}?action=write`, "execute_kw", objectParams("search_read")],
    [`${endpoint}#other-service`, "execute_kw", objectParams("search_read")],
    [`${endpoint}/`, "execute_kw", objectParams("search_read")]
  ];
  for (const call of malformedCalls) {
    await assert.rejects(context.xmlRpcCall(...call), policyError);
  }
  assert.equal(requests.length, 0);
  assert.equal(timers.length, 0);
});

test("configuration and request approval flags cannot enable Odoo writes", async () => {
  const { context, requests } = loadServer();
  context.process.env.ODOO_ALLOW_WRITES = "true";
  await assert.rejects(context.executeKw(baseUrl, "test-db", 42, "test-key", "project.project", "write", [[1], { name: "blocked" }], {
    approved: true,
    allowWrites: true
  }), policyError);
  assert.equal(requests.length, 0);
});
