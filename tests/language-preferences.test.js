"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const { createStore, validLanguage } = require("../language-preferences");

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bw-language-test-"));
  t.after(() => {
    const target = path.resolve(directory);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith("bw-language-test-"));
    fs.rmSync(target, { recursive: true, force: true });
  });
  return { directory, file: path.join(directory, "config.local.json"), store: createStore(directory) };
}

test("a missing config defaults to French and creates a credential-free language preference", t => {
  const { store, file } = fixture(t);
  assert.equal(store.read(), "fr"); assert.equal(fs.existsSync(file), false);
  assert.equal(store.save("nl"), "nl");
  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { language: "nl" });
  assert.equal(store.read(), "nl");
});

test("language-only config works independently of tokens and invalid language values fall back to French", t => {
  const { store, file } = fixture(t);
  for (const value of ["fr", "nl", "de", null, 1]) {
    fs.writeFileSync(file, JSON.stringify({ language: value }));
    assert.equal(store.read(), value === "nl" ? "nl" : "fr");
  }
  assert.ok(validLanguage("fr")); assert.ok(validLanguage("nl"));
  for (const value of ["FR", "NL", "nl-BE", "de", null, {}, "../config"]) {
    const previous = fs.readFileSync(file, "utf8");
    assert.throws(() => store.save(value), { code: "LANGUAGE_INVALID" });
    assert.equal(fs.readFileSync(file, "utf8"), previous);
  }
});

test("saving merges only language and preserves credentials, aliases and nested unknown configuration", t => {
  const { store, file, directory } = fixture(t);
  const original = { username: "fixture@example.invalid", apiKey: "  synthetic-token\n ", api_key: "other-synthetic-token",
    odooUrl: "http://127.0.0.1:12345", database: "fixture", pilotage: { nested: [1, { enabled: false }] }, extra: null };
  fs.writeFileSync(file, JSON.stringify(original)); store.save("nl");
  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { ...original, language: "nl" });
  store.save("fr"); assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { ...original, language: "fr" });
  assert.deepEqual(fs.readdirSync(directory), ["config.local.json"]);
});

test("malformed or nonobject configuration is never overwritten", t => {
  const { store, file, directory } = fixture(t);
  for (const source of ["not json", "[]", "null", '"text"', "42"]) {
    fs.writeFileSync(file, source); assert.equal(store.read(), "fr");
    assert.throws(() => store.save("nl"), { code: "LANGUAGE_CONFIG_INVALID" });
    assert.equal(fs.readFileSync(file, "utf8"), source);
    assert.deepEqual(fs.readdirSync(directory), ["config.local.json"]);
  }
});

test("failed writes or replacements preserve the original configuration and clean their temporary file", t => {
  const { file, directory } = fixture(t), original = '{"language":"fr","apiKey":"synthetic-secret"}';
  fs.writeFileSync(file, original);
  for (const method of ["writeFileSync", "renameSync"]) {
    const denied = { ...fs, [method]() { const error = new Error("sensitive path or details"); error.code = "EACCES"; throw error; } };
    const store = createStore(directory, denied);
    assert.throws(() => store.save("nl"), error => error.code === "LANGUAGE_SAVE_FAILED" && !error.message.includes("sensitive"));
    assert.equal(fs.readFileSync(file, "utf8"), original);
    assert.deepEqual(fs.readdirSync(directory), ["config.local.json"]);
  }
});

test("an external configuration edit wins over a conflicting preference save", t => {
  const { file, directory } = fixture(t);
  fs.writeFileSync(file, '{"language":"fr"}');
  const changed = { ...fs, writeFileSync(target, ...args) {
    fs.writeFileSync(target, ...args);
    fs.writeFileSync(file, '{"language":"fr","externallyEdited":true}');
  } };
  assert.throws(() => createStore(directory, changed).save("nl"), { code: "LANGUAGE_CONFIG_CHANGED" });
  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { language: "fr", externallyEdited: true });
  assert.deepEqual(fs.readdirSync(directory), ["config.local.json"]);
});

test("a partial temporary write is closed and removed without changing the existing configuration", t => {
  const { file, directory } = fixture(t), original = '{"language":"fr","apiKey":"synthetic-secret"}';
  fs.writeFileSync(file, original);
  let writtenDescriptor = null, closed = false;
  const partial = { ...fs,
    writeFileSync(descriptor) {
      writtenDescriptor = descriptor;
      fs.writeFileSync(descriptor, '{"apiKey":"synthetic-partial-secret');
      const error = new Error("Disk full, sensitive implementation details"); error.code = "ENOSPC"; throw error;
    },
    closeSync(descriptor) { if (descriptor === writtenDescriptor) closed = true; return fs.closeSync(descriptor); }
  };
  assert.throws(() => createStore(directory, partial).save("nl"), error => error.code === "LANGUAGE_SAVE_FAILED" && !error.message.includes("sensitive"));
  assert.equal(typeof writtenDescriptor, "number"); assert.equal(closed, true);
  assert.equal(fs.readFileSync(file, "utf8"), original);
  assert.deepEqual(fs.readdirSync(directory), ["config.local.json"]);
});

test("an exclusive-open collision does not remove a temporary file owned by another writer", t => {
  const { file, directory } = fixture(t), original = '{"language":"fr"}';
  fs.writeFileSync(file, original);
  let foreignTemporary = null;
  const collision = { ...fs, openSync(target) {
    foreignTemporary = target; fs.writeFileSync(target, "synthetic-other-writer");
    const error = new Error("Already exists"); error.code = "EEXIST"; throw error;
  } };
  assert.throws(() => createStore(directory, collision).save("nl"), { code: "LANGUAGE_SAVE_FAILED" });
  assert.equal(fs.readFileSync(file, "utf8"), original);
  assert.equal(fs.readFileSync(foreignTemporary, "utf8"), "synthetic-other-writer");
});
