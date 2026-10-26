"use strict";

const test = require("node:test"), assert = require("node:assert/strict");
const { render, cleanup, captureState } = require("../project-similarity");
const I18n = require("../i18n"), { domFixture } = require("./dom-fixture");

const projects = [1, 2, 3, 4].map(id => ({ id, name: `[Demo ${id}] [1234567${id}] Exact project ${id}` }));
const source = () => ({ status: "available",
  tagDefinitions: Object.fromEntries(["bim", "vision", "data", "ventilation"]
    .map(tag => [tag, { fr: `FR ${tag}`, nl: `NL ${tag}` }])),
  projects: [{ id: 1, tags: ["bim", "vision"] }, { id: 2, tags: ["bim", "vision"] },
    { id: 3, tags: ["bim", "data"] }, { id: 4, tags: ["ventilation"] }] });
const programmeMap = () => ({ status: "available", programmes: [
  { id: "DC1", code: "DC1", subtitle: "Backbone", projectIds: [1] },
  { id: "DC2", code: "DC2", subtitle: "Insight", projectIds: [2] },
  { id: "DC3", code: "DC3", subtitle: "Manufacturing", projectIds: [3] }
] });
const organismMap = () => ({ status: "available", organisms: [
  { id: 501, name: "Innoviris", projectIds: [1, 2] }
] });
const first = (host, selector) => host.querySelectorAll(selector)[0];

function animationFixture({ reduced = false, legacyMedia = false } = {}) {
  const host = domFixture(), pending = new Map(), callbacks = new Map(), cancelled = [], listeners = new Set();
  let nextId = 0;
  const media = { matches: reduced };
  if (legacyMedia) {
    media.addListener = callback => listeners.add(callback);
    media.removeListener = callback => listeners.delete(callback);
  } else {
    media.addEventListener = (name, callback) => { assert.equal(name, "change"); listeners.add(callback); };
    media.removeEventListener = (name, callback) => { assert.equal(name, "change"); listeners.delete(callback); };
  }
  host.ownerDocument.defaultView = {
    requestAnimationFrame(callback) {
      const id = nextId++; pending.set(id, callback); callbacks.set(id, callback); return id;
    },
    cancelAnimationFrame(id) { cancelled.push(id); pending.delete(id); },
    matchMedia(query) { assert.equal(query, "(prefers-reduced-motion: reduce)"); return media; }
  };
  return { host, pending, callbacks, cancelled, listeners,
    frame(timestamp) {
      const queued = [...pending.values()]; pending.clear();
      for (const callback of queued) callback(timestamp);
    },
    reduced(value) {
      media.matches = value;
      for (const callback of [...listeners]) callback({ matches: value });
    }
  };
}

function choose(host, mode) {
  const input = first(host, `[data-similarity-cloud-mode="${mode}"]`);
  input.checked = true; input.dispatch("change"); return input;
}
function points(host) {
  return new Map(host.querySelectorAll("circle").map(circle => [
    Number(circle.parentElement.getAttribute("data-similarity-project")),
    { x: Number(circle.getAttribute("cx")), y: Number(circle.getAttribute("cy")) }
  ]));
}
function appearance(host) {
  return host.querySelectorAll("circle").map(circle => [...circle.attributes]);
}
function lineFacts(host) {
  return host.querySelectorAll("[data-similarity-edge]").filter(element => element.tagName === "g")
    .map(group => ({ attributes: [...group.attributes], lines: group.children.map(line =>
      [...line.attributes].filter(([name]) => !["x1", "y1", "x2", "y2"].includes(name))) }));
}
function assertAnchored(host) {
  const positions = points(host);
  for (const point of positions.values()) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.ok(point.x >= 0 && point.x <= 1000 && point.y >= 0 && point.y <= 585);
  }
  for (const group of host.querySelectorAll("[data-similarity-edge]").filter(element => element.tagName === "g")) {
    const [sourceId, targetId] = group.getAttribute("data-similarity-edge").split(":").map(Number);
    const a = positions.get(sourceId), b = positions.get(targetId);
    for (const line of group.children) {
      assert.equal(Number(line.getAttribute("x1")), a.x); assert.equal(Number(line.getAttribute("y1")), a.y);
      assert.equal(Number(line.getAttribute("x2")), b.x); assert.equal(Number(line.getAttribute("y2")), b.y);
    }
  }
}
function tree(element) {
  return { tag: element.tagName, attributes: [...element.attributes], style: { ...element.style },
    text: element.ownText, checked: element.checked, children: element.children.map(tree) };
}

test("initial physical motion stops at saved coordinates while every visible and hit-test link stays anchored", () => {
  const clock = animationFixture(), result = render(clock.host, projects, source(), { programmeMap: programmeMap() });
  const { host } = clock, originalModel = structuredClone(result.model), edges = host.querySelectorAll("[data-similarity-edge]");
  const facts = lineFacts(host), initial = points(host);
  assert.equal(clock.pending.size, 1);
  assert.ok(Number(first(host, "[data-similarity-cloud-layer]").getAttribute("opacity")) < 1, "Clouds fade while particles settle");
  for (const text of host.querySelectorAll(".project-similarity-label")) assert.equal(text.getAttribute("opacity"), "0");
  first(host, '[data-similarity-project="1"]').dispatch("pointerenter");
  assert.match(first(host, ".project-similarity-detail-content").textContent, /Explorer les proximités/);
  for (const timestamp of [0, 400, 1100, 1800, 2200]) { clock.frame(timestamp); assertAnchored(host); }
  assert.equal(clock.pending.size, 0, "Cooling must stop scheduling frames");
  assert.notDeepEqual(initial, result.geometry.positions);
  assert.deepEqual(points(host), result.geometry.positions);
  assert.deepEqual(result.model, originalModel); assert.deepEqual(lineFacts(host), facts);
  assert.deepEqual(host.querySelectorAll("[data-similarity-edge]"), edges);
  for (const text of host.querySelectorAll(".project-similarity-label")) assert.equal(text.getAttribute("opacity"), "1");
  cleanup(host);
});

test("reduced motion uses final layouts immediately for introduction, replay and programme switching", () => {
  const clock = animationFixture({ reduced: true }), { host } = clock;
  const result = render(host, projects, source(), { programmeMap: programmeMap() });
  const original = appearance(host), facts = lineFacts(host), originalModel = structuredClone(result.model);
  assert.deepEqual(points(host), result.geometry.positions); assert.equal(clock.pending.size, 0);
  first(host, "[data-similarity-replay]").dispatch("click");
  assert.equal(clock.pending.size, 0);
  choose(host, "programmes");
  assert.equal(clock.pending.size, 0); assert.deepEqual(points(host), result.geometry.positions);
  for (const [id, programmeId] of [[1, "DC1"], [2, "DC2"], [3, "DC3"]]) {
    const circle = first(first(host, `[data-similarity-project="${id}"]`), "circle");
    assert.equal(circle.getAttribute("fill"), first(host, `[data-similarity-cloud="programme:${programmeId}"]`).getAttribute("fill"));
  }
  assert.deepEqual(lineFacts(host), facts); assert.deepEqual(result.model, originalModel);
  choose(host, "themes");
  assert.deepEqual(appearance(host), original, "The thematic target and its bubble colours return exactly");
  cleanup(host);
});

test("organism switching uses the saved physical target immediately under reduced motion", () => {
  const clock = animationFixture({ reduced: true }), { host } = clock;
  const result = render(host, projects, source(), { organismMap: organismMap() });
  const thematic = structuredClone(result.geometry.positions);
  choose(host, "organisms");
  assert.equal(clock.pending.size, 0); assert.deepEqual(points(host), result.geometry.positions);
  assert.notDeepEqual(result.geometry.positions, thematic);
  const organismCloud = first(host, '[data-similarity-cloud="organism:501"]');
  for (const id of [1, 2]) assert.equal(first(first(host, `[data-similarity-project="${id}"]`), "circle").getAttribute("fill"), organismCloud.getAttribute("fill"));
  assert.equal(host.querySelectorAll('[data-similarity-cloud="organism:other"]').length, 0);
  cleanup(host);
});

test("changing reduced-motion preference during a transition settles and unregisters modern or legacy media listeners", () => {
  for (const legacyMedia of [false, true]) {
    const clock = animationFixture({ legacyMedia }), result = render(clock.host, projects, source());
    clock.frame(0); clock.frame(600);
    const stale = clock.callbacks.get([...clock.pending.keys()][0]);
    assert.equal(clock.listeners.size, 1);
    clock.reduced(true);
    assert.deepEqual(points(clock.host), result.geometry.positions); assert.equal(clock.pending.size, 0);
    const saved = tree(clock.host); stale(2000); assert.deepEqual(tree(clock.host), saved);
    cleanup(clock.host); assert.equal(clock.listeners.size, 0);
  }
});

test("cleanup cancels even frame ID zero and retired frames, replay and controls cannot write or reschedule", () => {
  const clock = animationFixture(), { host } = clock;
  render(host, projects, source(), { programmeMap: programmeMap() });
  assert.deepEqual([...clock.pending.keys()], [0]);
  const stale = clock.callbacks.get(0), replay = first(host, "[data-similarity-replay]");
  cleanup(host);
  assert.ok(clock.cancelled.includes(0)); assert.equal(clock.pending.size, 0); assert.equal(clock.listeners.size, 0);
  const retiredToggle = first(host, '[data-similarity-cloud-mode="programmes"]'); retiredToggle.checked = true;
  const stopped = tree(host);
  stale(900); replay.dispatch("click"); retiredToggle.dispatch("change");
  assert.deepEqual(tree(host), stopped, "Retired callbacks cannot repaint the old graph");
  assert.equal(clock.pending.size, 0);
});

test("rapid mode reversals start at displayed coordinates and cancelled transitions cannot overwrite the exact saved target", () => {
  const clock = animationFixture(), { host } = clock;
  const result = render(host, projects, source(), { programmeMap: programmeMap(), state: { layoutReady: true } });
  const original = appearance(host), originalPositions = points(host), facts = lineFacts(host);
  assert.equal(clock.pending.size, 0);
  choose(host, "programmes");
  assert.deepEqual(points(host), originalPositions, "Switching starts where the bubbles are currently displayed");
  clock.frame(0); clock.frame(425); assertAnchored(host);
  const midway = points(host), stale = clock.callbacks.get([...clock.pending.keys()][0]);
  assert.notDeepEqual(midway, originalPositions); assert.notDeepEqual(midway, result.geometry.positions);
  choose(host, "themes");
  assert.deepEqual(points(host), midway, "Reversal must not jump to the previous mode's target");
  const active = tree(host); stale(850);
  assert.deepEqual(tree(host), active); assert.equal(clock.pending.size, 1);
  clock.frame(500); clock.frame(1350);
  assert.equal(clock.pending.size, 0); assert.deepEqual(appearance(host), original);
  assert.deepEqual(lineFacts(host), facts); assertAnchored(host);
  cleanup(host);
});

test("rerenders retain mode, focused replay and tag details without replaying introduction or accepting old frames", () => {
  const clock = animationFixture(), { host } = clock, previous = I18n.language();
  try {
    I18n.setLanguage("fr");
    render(host, projects, source(), { programmeMap: programmeMap() });
    first(host, '[data-similarity-tag="bim"]').dispatch("click");
    choose(host, "programmes");
    first(host, "[data-similarity-replay]").focus();
    const retained = captureState(host), oldFrame = clock.callbacks.get([...clock.pending.keys()][0]);
    assert.equal(retained.layoutReady, true); assert.equal(retained.activeTagId, "bim");
    I18n.setLanguage("nl");
    const next = render(host, projects, source(), { programmeMap: programmeMap(), state: retained });
    assert.equal(clock.pending.size, 0); assert.equal(clock.listeners.size, 1);
    assert.equal(captureState(host).cloudMode, "programmes");
    assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-replay"), "");
    assert.equal(first(host, '[data-similarity-tag="bim"]').getAttribute("aria-pressed"), "true");
    assert.match(first(host, ".project-similarity-detail-content").textContent, /NL bim/);
    assert.deepEqual(points(host), next.geometry.positions);
    const current = tree(host); oldFrame(3000);
    assert.deepEqual(tree(host), current); assert.equal(clock.pending.size, 0);
  } finally { cleanup(host); I18n.setLanguage(previous); }
});

test("keyboard focus and deliberate clicks settle motion before exposing usable project controls", () => {
  const clock = animationFixture(), { host } = clock, opened = [];
  const result = render(host, projects, source(), { onSelect: id => opened.push(id) });
  const bubble = first(host, '[data-similarity-project="1"]');
  bubble.focus();
  assert.equal(clock.pending.size, 0); assert.deepEqual(points(host), result.geometry.positions);
  assert.equal(host.ownerDocument.activeElement, bubble);
  assert.match(first(host, ".project-similarity-detail-content").textContent, /FR vision/);
  first(host, "[data-similarity-replay]").dispatch("click"); assert.equal(clock.pending.size, 1);
  bubble.dispatch("pointerenter"); bubble.dispatch("click");
  assert.equal(clock.pending.size, 0);
  assert.equal(first(host, '[data-similarity-project="4"]').getAttribute("opacity"), ".17");
  bubble.dispatch("pointerleave");
  assert.equal(first(host, '[data-similarity-project="4"]').getAttribute("opacity"), "1", "Clicking during motion must still ungrey projects when the pointer leaves");
  first(host, '[data-similarity-open="1"]').dispatch("click"); assert.deepEqual(opened, [1]);
  cleanup(host);
});

test("physics-triggered pointer exits cannot clear the retained tag or project emphasis during replay", () => {
  const clock = animationFixture(), { host } = clock;
  render(host, projects, source(), { state: { layoutReady: true } });
  const bubble = first(host, '[data-similarity-project="1"]');
  bubble.dispatch("pointerenter");
  const before = lineFacts(host), details = first(host, ".project-similarity-detail-content").textContent;
  first(host, "[data-similarity-replay]").dispatch("click");
  bubble.dispatch("pointerleave"); clock.frame(0); clock.frame(500);
  assert.deepEqual(lineFacts(host), before);
  assert.equal(first(host, ".project-similarity-detail-content").textContent, details);
  assert.equal(first(host, '[data-similarity-project="4"]').getAttribute("opacity"), ".17");
  cleanup(host);
});

test("the bundled portfolio settles without late collision jumps at 60 Hz in thematic introduction and programme replay", context => {
  const saved = require("../data/project-tags.json"), { createProjectMap } = require("../programme-service");
  const clock = animationFixture(), { host } = clock;
  const result = render(host, saved.projects, { status: "available", tagDefinitions: saved.tagDefinitions, projects: saved.projects },
    { programmeMap: createProjectMap(saved.projects) });
  assert.ok(result.model.nodes.length >= 30, "Exercise the real dense portfolio rather than a small synthetic fixture");
  const sample = (start, phase) => {
    const duration = 2200, intervals = Math.ceil(duration / (1000 / 60));
    let previous = points(host), maximum = 0, lateMaximum = 0;
    for (let index = 0; index <= intervals; index++) {
      const elapsed = index === intervals ? duration : index * 1000 / 60;
      clock.frame(start + elapsed);
      const current = points(host);
      for (const [id, point] of current) {
        const old = previous.get(id), movement = Math.hypot(point.x - old.x, point.y - old.y);
        maximum = Math.max(maximum, movement);
        if (elapsed >= duration * .75) lateMaximum = Math.max(lateMaximum, movement);
      }
      assertAnchored(host); previous = current;
    }
    assert.ok(maximum <= 15, `${phase} maximum displacement ${maximum.toFixed(2)}px exceeds a smooth 60 Hz step`);
    assert.ok(lateMaximum <= 15, `${phase} late displacement ${lateMaximum.toFixed(2)}px reveals a collision-relaxation jump`);
    assert.equal(clock.pending.size, 0, `${phase} stops after settling`);
    assert.deepEqual(points(host), result.geometry.positions, `${phase} reaches the exact saved target`);
    context.diagnostic(`${phase}: ${result.model.nodes.length} projects, maximum ${maximum.toFixed(2)}px/frame, last quarter ${lateMaximum.toFixed(2)}px/frame`);
  };
  try {
    sample(0, "Thematic introduction");
    choose(host, "programmes"); clock.frame(3000); clock.frame(3850);
    assert.equal(clock.pending.size, 0);
    first(host, "[data-similarity-replay]").dispatch("click");
    sample(4000, "Programme replay");
  } finally { cleanup(host); }
});
