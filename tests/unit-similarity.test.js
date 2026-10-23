"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const Unit = require("../unit-dico"), I18n = require("../i18n");
const { domFixture } = require("./dom-fixture");
const first = (host, selector) => host.querySelectorAll(selector)[0];
function fixture() {
  return { ok: true, projects: [{ id: 1, name: "[Alpha] [12345678] Exact source Alpha", startDate: "2026-01-01", endDate: "2027-12-31" },
    { id: 2, name: "[Beta] [23456789] Exact source Beta", startDate: "2026-01-01", endDate: "2027-12-31" },
    { id: 3, name: "Untagged source project", startDate: "2026-01-01", endDate: "2027-12-31" }],
    tagMap: { status: "available", scannedAt: "2026-10-22T08:00:00Z",
      tagDefinitions: { bim: { fr: "BIM", nl: "BIM" }, vision: { fr: "Vision par ordinateur", nl: "Computervisie" } },
      projects: [{ id: 1, tags: ["bim", "vision"] }, { id: 2, tags: ["bim"] }, { id: 999, tags: ["vision"] }] } };
}

test("the unit forwards scoped programme membership and retains cloud mode without changing its graph", () => {
  const host = domFixture(), data = fixture(), previous = I18n.language();
  data.programmeMap = { status: "available", programmes: [
    { id: "DC1", code: "DC1", subtitle: "Backbone", projectIds: [1] },
    { id: "DC2", code: "DC2", subtitle: "Insight", projectIds: [2, 999] },
    { id: "DC3", code: "DC3", subtitle: "Manufacturing", projectIds: [] }
  ] };
  try {
    I18n.setLanguage("fr"); Unit.render(host, data, { showSimilarityMap: true });
    const input = first(host, '[data-similarity-cloud-mode="programmes"]'); input.checked = true; input.dispatch("change"); input.focus();
    assert.equal(host.querySelectorAll('[data-similarity-cloud="programme:DC1"]').length, 1);
    assert.equal(host.querySelectorAll('[data-similarity-cloud="programme:DC2"]').length, 1);
    I18n.setLanguage("nl"); Unit.render(host, data, { showSimilarityMap: true });
    assert.equal(first(host, '[data-similarity-cloud-mode="programmes"]').checked, true);
    assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-cloud-mode"), "programmes");
    assert.equal(host.querySelectorAll(".project-similarity-node").length, 2);
    assert.equal(first(host, ".unit-dico-calendar").textContent.includes("02 / Projectkalender"), true);
  } finally { I18n.setLanguage(previous); }
});

test("the unit map sits between the project cards and unchanged 02 calendar, excluding untagged and foreign projects", () => {
  const host = domFixture(), data = fixture(), before = structuredClone(data);
  Unit.render(host, data, { showSimilarityMap: true });
  const content = first(host, ".unit-dico"), chart = first(host, ".unit-dico-similarity-host");
  assert.equal(content.children[1], chart);
  assert.equal(content.children[2], first(host, ".unit-dico-calendar"));
  assert.ok(content.children[0].textContent.includes("01 /"));
  assert.match(content.children[2].textContent, /02 \/ Calendrier des projets/);
  assert.equal(chart.querySelectorAll(".project-similarity-node").length, 2);
  assert.equal(chart.querySelectorAll('[data-similarity-project="3"]').length, 0);
  assert.equal(chart.querySelectorAll('[data-similarity-project="999"]').length, 0);
  assert.deepEqual(data, before);
});

test("map details open the shared project selection only explicitly, and parent cleanup makes old controls inert", () => {
  const host = domFixture(), chosen = [];
  Unit.render(host, fixture(), { showSimilarityMap: true, onSelect: id => chosen.push(id) });
  first(host, '[data-similarity-project="1"]').dispatch("click");
  assert.deepEqual(chosen, []);
  const open = first(host, '[data-similarity-open="1"]'); open.dispatch("click");
  assert.deepEqual(chosen, [1]);
  Unit.cleanup(host); open.dispatch("click"); assert.deepEqual(chosen, [1]);
});

test("unit language and cached rerenders preserve active map detail and exact keyboard focus", () => {
  const host = domFixture(), data = fixture(), previous = I18n.language();
  try {
    I18n.setLanguage("fr"); Unit.render(host, data, { showSimilarityMap: true });
    first(host, '[data-similarity-project="1"]').focus();
    assert.match(first(host, ".project-similarity-details").textContent, /Vision par ordinateur/);
    I18n.setLanguage("nl"); Unit.render(host, data, { showSimilarityMap: true });
    assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-project"), "1");
    assert.match(first(host, ".project-similarity-details").textContent, /Computervisie/);
    assert.match(first(host, ".unit-dico-calendar").textContent, /02 \/ Projectkalender/);
    const outside = host.ownerDocument.createElement("button"); outside.focus();
    Unit.render(host, data, { showSimilarityMap: true }); assert.equal(host.ownerDocument.activeElement, outside);
  } finally { I18n.setLanguage(previous); }
});

test("shared programme/personal calendars opt out, and optional tag failures leave unit calendar available", () => {
  const host = domFixture(), data = fixture();
  Unit.render(host, data); assert.equal(host.querySelectorAll(".project-similarity").length, 0);
  Unit.render(host, data, { showSimilarityMap: false }); assert.equal(host.querySelectorAll(".project-similarity").length, 0);
  Unit.renderTimeline(host, data.projects); assert.equal(host.querySelectorAll(".project-similarity").length, 0);
  Unit.render(host, { ...data, tagMap: { status: "unavailable" } }, { showSimilarityMap: true });
  assert.ok(first(host, ".project-similarity")); assert.ok(first(host, ".unit-dico-calendar"));
  assert.equal(host.querySelectorAll(".project-similarity-node").length, 0);
});

test("the unit tag explorer retains its selection and keyboard focus across parent language refreshes", () => {
  const host = domFixture(), data = fixture(), previous = I18n.language();
  try {
    I18n.setLanguage("fr"); Unit.render(host, data, { showSimilarityMap: true });
    first(host, ".project-similarity-accessible").open = true;
    const button = first(host, '[data-similarity-tag="vision"]'); button.focus(); button.dispatch("click");
    assert.deepEqual(host.querySelectorAll("[data-similarity-tag-project]").map(item => item.getAttribute("data-similarity-tag-project")), ["1"]);
    I18n.setLanguage("nl"); Unit.render(host, data, { showSimilarityMap: true });
    assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-tag"), "vision");
    assert.equal(first(host, ".project-similarity-accessible").open, true);
    assert.match(first(host, ".project-similarity-detail-content").textContent, /Computervisie.*1 project met deze tag/);
  } finally { I18n.setLanguage(previous); }
});
