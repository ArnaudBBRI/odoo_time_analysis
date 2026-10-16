"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const createLanguage = require("../language-client");
const { domFixture } = require("./dom-fixture");

const coreSource = fs.readFileSync(path.join(__dirname, "../i18n.js"), "utf8");
const shellSource = fs.readFileSync(path.join(__dirname, "../i18n-shell-messages.js"), "utf8");
const response = (data, ok = true) => ({ ok, json: async () => data });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };

function fixture(fetchHandler) {
  const container = domFixture(), document = container.ownerDocument, listeners = new Map(), calls = [];
  document.documentElement = { lang: "" };
  document.querySelectorAll = selector => container.querySelectorAll(selector);
  document.getElementById = id => container.querySelectorAll(`[id="${id}"]`)[0] || null;
  const node = (tag, attributes = {}, text = "") => {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    element.textContent = text; container.append(element); return element;
  };
  const select = node("select", { id: "languageSelect" }); select.value = "fr";
  const status = node("p", { id: "languageStatus" }); status.dataset = {};
  const translated = node("button", { "data-i18n": "test.language.text", "data-i18n-aria-label": "test.language.aria",
    "data-i18n-title": "test.language.title", "data-i18n-placeholder": "test.language.placeholder", "data-i18n-data-help": "test.language.help" });
  const source = node("span", {}, "Nom Odoo inchangé <script>literal</script>");
  const root = {
    document,
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
    },
    dispatchEvent(event) { for (const callback of listeners.get(event.type) || []) callback(event); },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    fetch(url, options = {}) {
      const call = { url, options }; calls.push(call);
      if (fetchHandler) return fetchHandler(call, calls);
      return Promise.resolve(response({ ok: true, language: "fr" }));
    }
  };
  vm.createContext(root); vm.runInContext(coreSource, root); vm.runInContext(shellSource, root);
  const i18n = root.DashboardI18n;
  i18n.register({
    "test.language.text": { fr: "Texte français", nl: "Nederlandse tekst" },
    "test.language.aria": { fr: "Choisir un élément", nl: "Een item kiezen" },
    "test.language.title": { fr: "Information", nl: "Informatie" },
    "test.language.placeholder": { fr: "Saisir une valeur", nl: "Een waarde invoeren" },
    "test.language.help": { fr: "Aide française", nl: "Nederlandse hulp" }
  });
  const client = createLanguage(root, i18n);
  return { client, root, i18n, calls, select, status, translated, source, document, listeners };
}

test("language client loads only the saved preference and applies explicit Dutch text and accessibility attributes", async () => {
  const f = fixture(() => Promise.resolve(response({ ok: true, language: "nl" })));
  assert.equal(await f.client.ready, "nl");
  assert.deepEqual(f.calls, [{ url: "/api/preferences/language", options: { credentials: "same-origin" } }]);
  assert.equal(f.document.documentElement.lang, "nl"); assert.equal(f.select.value, "nl");
  assert.equal(f.translated.textContent, "Nederlandse tekst");
  assert.equal(f.translated.getAttribute("aria-label"), "Een item kiezen");
  assert.equal(f.translated.getAttribute("title"), "Informatie");
  assert.equal(f.translated.getAttribute("placeholder"), "Een waarde invoeren");
  assert.equal(f.translated.getAttribute("data-help"), "Nederlandse hulp");
  assert.equal(f.source.textContent, "Nom Odoo inchangé <script>literal</script>");
  f.client.initialize(); f.client.initialize();
  assert.equal(f.listeners.get("dashboard:languagechange").size, 1, "Initialization installs only one language listener");
  f.i18n.setLanguage("fr");
  assert.equal(f.translated.textContent, "Texte français"); assert.equal(f.select.value, "fr");
  assert.equal(f.document.documentElement.lang, "fr");
});

test("failed or invalid preference reads retain French without displaying sensitive response details", async () => {
  for (const fetchHandler of [
    () => Promise.reject(new Error("sensitive synthetic detail")),
    () => Promise.resolve(response({ ok: false, error: "sensitive synthetic detail", language: "nl" }, false)),
    () => Promise.resolve({ ok: true, json: async () => { throw new Error("sensitive synthetic detail"); } }),
    () => Promise.resolve(response({ ok: true, language: "de" })),
    () => Promise.resolve(response({ ok: false, language: "nl" }))
  ]) {
    const f = fixture(fetchHandler);
    assert.equal(await f.client.ready, "fr");
    assert.equal(f.select.value, "fr"); assert.equal(f.translated.textContent, "Texte français");
    assert.ok(!f.status.textContent.includes("sensitive"));
    assert.equal(f.calls.length, 1);
  }
});

test("language changes send one exact language-only JSON payload and never call an Odoo endpoint", async () => {
  const f = fixture(call => Promise.resolve(response({ ok: true,
    language: call.options.method === "POST" ? JSON.parse(call.options.body).language : "fr" })));
  await f.client.ready;
  f.select.value = "nl"; f.select.dispatch("change"); await flush();
  assert.equal(f.i18n.language(), "nl");
  assert.deepEqual(f.calls[1], { url: "/api/preferences/language", options: {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: '{"language":"nl"}'
  } });
  assert.equal(f.status.textContent, "Taal opgeslagen."); assert.equal(f.status.dataset.state, "");
  for (const invalid of ["de", "FR", "nl-BE", null, { language: "nl" }, "../config"]) {
    assert.equal(await f.client.select(invalid), false);
  }
  assert.equal(f.calls.length, 2);
  assert.ok(f.calls.every(call => call.url === "/api/preferences/language"));
  assert.equal(f.calls[1].options.body.includes("token"), false);
  assert.equal(f.calls[1].options.body.includes("password"), false);
});

test("rapid language changes serialize saves and only the latest choice announces its result", async () => {
  const pending = [], f = fixture(call => {
    if (call.options.method !== "POST") return Promise.resolve(response({ ok: true, language: "fr" }));
    const next = deferred(); pending.push(next); return next.promise;
  });
  await f.client.ready;
  const saves = [f.client.select("nl"), f.client.select("fr"), f.client.select("nl")];
  await flush();
  assert.equal(f.i18n.language(), "nl"); assert.equal(f.select.value, "nl");
  assert.equal(pending.length, 1, "Only the first save has reached fetch");
  assert.equal(f.status.textContent, "Taal opslaan…");
  pending[0].resolve(response({ ok: true, language: "nl" })); await flush();
  assert.equal(pending.length, 2); assert.equal(f.status.textContent, "Taal opslaan…");
  pending[1].resolve(response({ ok: false, error: "synthetic save failure" }, false)); await flush();
  assert.equal(pending.length, 3); assert.equal(f.status.dataset.state, "", "A stale failed save does not show an obsolete warning");
  pending[2].resolve(response({ ok: true, language: "nl" }));
  assert.deepEqual(await Promise.all(saves), [true, false, true]);
  assert.equal(f.status.textContent, "Taal opgeslagen."); assert.equal(f.i18n.language(), "nl");
  assert.deepEqual(f.calls.filter(call => call.options.method === "POST").map(call => JSON.parse(call.options.body)),
    [{ language: "nl" }, { language: "fr" }, { language: "nl" }]);
});

test("a late initial read cannot replace an earlier explicit language choice", async () => {
  const read = deferred(), f = fixture(call => call.options.method === "POST" ?
    Promise.resolve(response({ ok: true, language: JSON.parse(call.options.body).language })) : read.promise);
  assert.equal(await f.client.select("nl"), true);
  read.resolve(response({ ok: true, language: "fr" }));
  assert.equal(await f.client.ready, "nl");
  assert.equal(f.translated.textContent, "Nederlandse tekst"); assert.equal(f.select.value, "nl");
});

test("the dropdown accepts a user's change while its initial preference read is still pending", async () => {
  const read = deferred(), f = fixture(call => call.options.method === "POST" ?
    Promise.resolve(response({ ok: true, language: JSON.parse(call.options.body).language })) : read.promise);
  f.select.value = "nl"; f.select.dispatch("change"); await flush();
  const chosenBeforeRead = f.i18n.language();
  read.resolve(response({ ok: true, language: "fr" })); await f.client.ready;
  assert.equal(chosenBeforeRead, "nl", "The real DOM listener must be installed before the GET completes");
  assert.equal(f.i18n.language(), "nl"); assert.equal(f.select.value, "nl");
  assert.equal(f.calls.filter(call => call.options.method === "POST").length, 1);
});

test("save failures keep the chosen language and expose a localized generic warning without server details", async () => {
  for (const saveResponse of [
    () => Promise.reject(new Error("sensitive synthetic error")),
    () => Promise.resolve(response({ ok: false, error: "sensitive synthetic error" }, false)),
    () => Promise.resolve(response({ ok: true, language: "fr" })),
    () => Promise.resolve({ ok: true, json: async () => { throw new Error("sensitive synthetic error"); } })
  ]) {
    const f = fixture(call => call.options.method === "POST" ? saveResponse() : Promise.resolve(response({ ok: true, language: "fr" })));
    await f.client.ready; assert.equal(await f.client.select("nl"), false);
    assert.equal(f.i18n.language(), "nl"); assert.equal(f.select.value, "nl");
    assert.equal(f.translated.textContent, "Nederlandse tekst");
    assert.equal(f.status.dataset.state, "warning");
    assert.equal(f.status.textContent, "De taal is toegepast, maar kon niet worden opgeslagen in het lokale configuratiebestand.");
    assert.ok(!f.status.textContent.includes("sensitive"));
    assert.ok(f.calls.every(call => call.url === "/api/preferences/language"));
  }
});
