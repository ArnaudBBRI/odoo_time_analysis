"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { EventEmitter, once } = require("node:events");
const source = fs.readFileSync(path.join(__dirname, "steering-runtime.js"), "utf8");

for (const failure of ["timeout", "exit"]) test(`isolated runtime ${failure} cleans its child, mock listener and fixture before rejecting`, async () => {
  const directory = path.join(require("node:os").tmpdir(), "bw-pilotage-fixture-cleanup-test");
  const removed = [], module = { exports: {} };
  let mockClosed = false, childKilled = false;
  const mock = new EventEmitter();
  mock.listen = () => queueMicrotask(() => mock.emit("listening"));
  mock.address = () => ({ port: 12345 });
  mock.close = callback => { mockClosed = true; callback(); };
  const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.exitCode = null;
  child.kill = () => {
    childKilled = true;
    if (child.exitCode === null) queueMicrotask(() => { child.exitCode = -1; child.emit("exit", -1); });
  };
  const context = {
    module, __dirname, process: { execPath: "synthetic-node", env: {} }, queueMicrotask,
    setTimeout(callback) {
      queueMicrotask(() => {
        if (failure === "timeout") callback();
        else { child.exitCode = 3; child.emit("exit", 3); }
      });
      return 1;
    }, clearTimeout() {},
    require(name) {
      if (name === "node:http") return { createServer: () => mock };
      if (name === "node:fs") return {
        mkdtempSync: () => directory, copyFileSync() {}, readFileSync: () => "<body>",
        writeFileSync() {}, mkdirSync() {}, rmSync(target) { removed.push(target); }
      };
      if (name === "node:os") return require("node:os");
      if (name === "node:path") return path;
      if (name === "node:child_process") return { spawn: () => child };
      if (name === "node:events") return { once };
      if (name === "./steering-fixture") return { definitions: {}, records: {}, config: {} };
      throw new Error(`Unexpected test dependency: ${name}`);
    }, fetch() { throw new Error("No network is allowed in this lifecycle test"); }
  };
  vm.runInNewContext(source, context, { filename: "steering-runtime.js" });
  await assert.rejects(module.exports.startRuntime(), failure === "timeout" ? /startup timeout/ : /Fixture exited 3/);
  assert.equal(childKilled, true);
  assert.equal(mockClosed, true);
  assert.deepEqual(removed, [directory]);
});
