"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { buildModel, layout, render, cleanup, captureState } = require("../project-similarity");
const I18n = require("../i18n"), { domFixture } = require("./dom-fixture");
const definitions = Object.fromEntries(["bim", "computer-vision", "data-spaces", "ventilation"].map(tag => [tag, { fr: `FR ${tag}`, nl: `NL ${tag}` }]));
const projects = [1, 2, 3, 4, 5].map(id => ({ id, name: `[Demo ${id}] [1234567${id}] Project ${id}` }));
const source = () => ({ status: "available", tagDefinitions: structuredClone(definitions), projects: [
  { id: 1, tags: ["bim", "computer-vision"] }, { id: 2, tags: ["bim", "computer-vision"] },
  { id: 3, tags: ["bim", "data-spaces"] }, { id: 4, tags: ["ventilation"] }, { id: 5, tags: [] } ] });
const first = (host, selector) => host.querySelectorAll(selector)[0];
const programmeMap = () => ({ status: "available", programmes: [
  { id: "DC1", code: "DC1", subtitle: "Backbone", projectIds: [1, 2, 4, 99] },
  { id: "DC2", code: "DC2", subtitle: "Insight", projectIds: [2] },
  { id: "DC3", code: "DC3", subtitle: "Manufacturing", projectIds: [] }
] });
const organismMap = () => ({ status: "available", organisms: [
  { id: 10, name: "Innoviris", projectIds: [1, 99] },
  { id: 20, name: "VLAIO", projectIds: [2] }
] });
function chooseClouds(host, mode) {
  const input = first(host, `[data-similarity-cloud-mode="${mode}"]`);
  input.checked = true; input.dispatch("change"); return input;
}

test("weighted Jaccard uses canonical tag IDs and gives identical tag sets similarity one", () => {
  const model = buildModel(projects, source());
  assert.equal(model.nodes.length, 4); assert.equal(model.edges.length, 3);
  assert.equal(model.edges.find(edge => edge.key === "1:2").similarity, 1);
  const wb = Math.log(1 + 4 / 3), wc = Math.log(1 + 4 / 2), wd = Math.log(1 + 4);
  assert.ok(Math.abs(model.edges.find(edge => edge.key === "1:3").similarity - wb / (wb + wc + wd)) < 1e-12);
  assert.deepEqual(model.isolates, [4]);
});

test("exact authorized IDs exclude foreign, untagged and malformed/contradictory source rows", () => {
  const data = source();
  data.projects.push({ id: 99, tags: ["bim"] }, { id: 1, tags: ["data-spaces"] }, { id: 3, tags: ["unknown"] });
  const model = buildModel(projects, data);
  assert.deepEqual(model.nodes.map(node => node.id), [2, 4]);
  assert.ok(!model.nodes.some(node => node.id === 99));
  const duplicate = buildModel([...projects, { id: 2, name: "Contradiction" }], source());
  assert.ok(!duplicate.nodes.some(node => node.id === 2));
});

test("input order, language and duplicates cannot change topology or mutate source data", () => {
  const data = source(), before = structuredClone(data), old = I18n.language();
  try {
    const a = buildModel(projects, data); I18n.setLanguage("nl");
    const b = buildModel(projects.slice().reverse(), { ...data, projects: data.projects.slice().reverse() });
    assert.deepEqual(a, b); assert.deepEqual(layout(a), layout(b)); assert.deepEqual(data, before);
  } finally { I18n.setLanguage(old); }
});

test("switching layouts moves and recolours bubbles while retaining tag links, active details and exact thematic roundtrips", () => {
  const host = domFixture(), map = programmeMap(), before = structuredClone(map);
  const result = render(host, projects, source(), { programmeMap: map });
  first(host, '[data-similarity-tag="bim"]').dispatch("click");
  const circles = host.querySelectorAll("circle"), edges = host.querySelectorAll("[data-similarity-edge]").filter(element => element.tagName === "g");
  const lines = edges.flatMap(edge => edge.children), labels = host.querySelectorAll(".project-similarity-label");
  const appearance = () => [...circles, ...edges, ...lines, ...labels].map(element => [...element.attributes]);
  const positions = () => circles.map(circle => [circle.getAttribute("cx"), circle.getAttribute("cy")]);
  const colors = () => circles.map(circle => circle.getAttribute("fill"));
  const linkStyles = () => [...edges, ...lines].map(element => [...element.attributes]
    .filter(([name]) => !["x1", "y1", "x2", "y2"].includes(name)));
  const initialPositions = positions(), initialColors = colors(), initialLinkStyles = linkStyles();
  const snapshot = appearance(), model = structuredClone(result.model), geometry = structuredClone(result.geometry);
  const details = first(host, ".project-similarity-details").textContent;
  const clouds = () => host.querySelectorAll("[data-similarity-cloud]").map(element => [...element.attributes]);
  const originalClouds = clouds();
  const selected = chooseClouds(host, "programmes");
  assert.equal(selected.checked, true); assert.equal(first(host, '[data-similarity-cloud-mode="themes"]').checked, false);
  assert.deepEqual(host.querySelectorAll("[data-similarity-cloud]").map(element => element.getAttribute("data-similarity-cloud")), ["programme:DC1", "programme:DC2"]);
  assert.match(first(host, ".project-similarity-legend").textContent, /DC1 · Backbone.*DC2 · Insight.*Autres projets/);
  const programmeLabels = host.querySelectorAll(".project-similarity-family");
  assert.match(programmeLabels[0].textContent, /2 projets/);
  assert.equal(programmeLabels[0].getAttribute("title"), "Projets : Demo 1, Demo 2");
  assert.equal(programmeLabels[2].getAttribute("title"), "Projets : Demo 3");
  assert.equal(circles[2].getAttribute("fill"), programmeLabels[2].children[0].style.backgroundColor,
    "Unassigned projects retain their programme-mode bubble colour without a cloud");
  assert.notDeepEqual(clouds(), originalClouds);
  assert.deepEqual(host.querySelectorAll("circle"), circles);
  assert.deepEqual(host.querySelectorAll("[data-similarity-edge]").filter(element => element.tagName === "g"), edges);
  assert.notDeepEqual(positions(), initialPositions, "Programme attraction produces a different saved layout");
  assert.notDeepEqual(colors(), initialColors, "Bubble colours follow their programme cloud colours");
  assert.deepEqual(linkStyles(), initialLinkStyles, "Link identity, stroke, width, opacity and accessibility stay tag based");
  assert.equal(first(host, ".project-similarity-details").textContent, details);
  assert.equal(first(host, '[data-similarity-tag="bim"]').getAttribute("aria-pressed"), "true");
  assert.deepEqual(result.model, model); assert.notDeepEqual(result.geometry.positions, geometry.positions); assert.deepEqual(map, before);
  chooseClouds(host, "themes"); assert.deepEqual(clouds(), originalClouds); assert.deepEqual(appearance(), snapshot);
  assert.equal(captureState(host).cloudMode, "themes");
});

test("programme zones retain overlapping memberships and singleton nodes while unassigned bubbles have no cloud", () => {
  const host = domFixture(), result = render(host, projects, source(), { programmeMap: programmeMap() });
  chooseClouds(host, "programmes");
  for (const [key, ids] of [["programme:DC1", [1, 2]], ["programme:DC2", [2]]]) {
    const polygon = first(host, `[data-similarity-cloud="${key}"]`);
    const points = polygon.getAttribute("points").split(" ").map(pair => pair.split(",").map(Number));
    const centres = ids.map(id => result.geometry.positions.get(id));
    assert.equal(Math.min(...points.map(p => p[0])), Math.min(...centres.map(p => p.x)) - 47);
    assert.equal(Math.max(...points.map(p => p[0])), Math.max(...centres.map(p => p.x)) + 47);
    assert.ok(points.every(point => point.every(Number.isFinite)));
    assert.equal(polygon.getAttribute("pointer-events"), "none"); assert.equal(polygon.getAttribute("aria-hidden"), "true");
  }
  assert.equal(host.querySelectorAll('[data-similarity-cloud="programme:DC3"]').length, 0);
  assert.equal(host.querySelectorAll('[data-similarity-cloud="programme:other"]').length, 0);
  assert.match(first(host, ".project-similarity-legend").textContent, /Autres projets · 1 projet/);
  assert.equal(host.querySelectorAll("circle").length, 3);
  assert.equal(host.querySelectorAll(".project-similarity-isolated").length, 1);
});

test("organism mode groups exact financing bodies, omits the unassigned cloud and retains tag evidence on roundtrips", () => {
  const host = domFixture(), map = organismMap(), before = structuredClone(map);
  const result = render(host, projects, source(), { programmeMap: programmeMap(), organismMap: map });
  first(host, '[data-similarity-tag="bim"]').dispatch("click");
  const originalModel = structuredClone(result.model), edges = host.querySelectorAll("[data-similarity-edge]");
  const details = first(host, ".project-similarity-details").textContent;
  const thematic = structuredClone(result.geometry.positions), selected = chooseClouds(host, "organisms");
  assert.equal(selected.checked, true);
  assert.deepEqual(host.querySelectorAll("[data-similarity-cloud]").map(element => element.getAttribute("data-similarity-cloud")),
    ["organism:10", "organism:20"]);
  assert.equal(host.querySelectorAll('[data-similarity-cloud="organism:other"]').length, 0);
  assert.match(first(host, ".project-similarity-legend").textContent, /Innoviris · 1 projet.*VLAIO · 1 projet.*Organisme non renseigné · 1 projet/);
  const circles = host.querySelectorAll("circle"), labels = host.querySelectorAll(".project-similarity-family");
  assert.equal(circles[0].getAttribute("fill"), first(host, '[data-similarity-cloud="organism:10"]').getAttribute("fill"));
  assert.equal(circles[1].getAttribute("fill"), first(host, '[data-similarity-cloud="organism:20"]').getAttribute("fill"));
  assert.equal(circles[2].getAttribute("fill"), labels[2].children[0].style.backgroundColor);
  assert.notDeepEqual(result.geometry.positions, thematic);
  assert.deepEqual(map, before);
  const organismTarget = structuredClone(result.geometry.positions);
  assert.deepEqual(result.model, originalModel); assert.deepEqual(host.querySelectorAll("[data-similarity-edge]"), edges);
  assert.equal(first(host, ".project-similarity-details").textContent, details);
  chooseClouds(host, "themes"); assert.deepEqual(result.geometry.positions, thematic);
  chooseClouds(host, "organisms"); assert.deepEqual(result.geometry.positions, organismTarget);
});

test("cloud mode and toggle focus survive localized cached renders while details, ungreyed state and unavailable fallback stay correct", () => {
  const host = domFixture(), previous = I18n.language(), options = { programmeMap: programmeMap() };
  try {
    I18n.setLanguage("fr"); render(host, projects, source(), options);
    const bubble = first(host, '[data-similarity-project="1"]'); bubble.dispatch("pointerenter"); bubble.dispatch("pointerleave");
    const input = chooseClouds(host, "programmes"); input.focus();
    const state = captureState(host); assert.equal(state.clearEmphasis, true); assert.equal(state.focusCloudMode, "programmes");
    I18n.setLanguage("nl"); render(host, projects, source(), { ...options, state });
    assert.equal(captureState(host).cloudMode, "programmes");
    assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-cloud-mode"), "programmes");
    assert.match(first(host, ".project-similarity-cloud-controls").textContent, /Thema’s.*Programma’s.*Financier/);
    assert.match(first(host, ".project-similarity-legend").textContent, /Andere projecten/);
    assert.equal(first(host, '[data-similarity-project="4"]').getAttribute("opacity"), "1");
    assert.match(first(host, ".project-similarity-detail-content").textContent, /NL computer-vision/);
    render(host, projects, source());
    assert.equal(captureState(host).cloudMode, "themes");
    assert.equal(first(host, '[data-similarity-cloud-mode="programmes"]').disabled, true);
    assert.equal(first(host, '[data-similarity-cloud-mode="organisms"]').disabled, true);
    assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-cloud-mode"), "themes");
  } finally { I18n.setLanguage(previous); }
});

test("missing or malformed organism maps cannot invent financing-body zones", () => {
  const malformed = [undefined, { status: "unavailable", organisms: [] }, { status: "available", organisms: null },
    { status: "available", organisms: [{ id: 10, name: "Innoviris", projectIds: [1] }, { id: 10, name: "Duplicate", projectIds: [2] }] },
    { status: "available", organisms: [{ id: 10, name: "Innoviris", projectIds: ["1"] }] },
    { status: "available", organisms: [{ id: 10, name: "Innoviris", projectIds: [1] }, { id: 20, name: "VLAIO", projectIds: [1] }] }];
  for (const map of malformed) {
    const host = domFixture(); render(host, projects, source(), { organismMap: map });
    assert.equal(first(host, '[data-similarity-cloud-mode="organisms"]').disabled, true);
    assert.equal(host.querySelectorAll("[data-similarity-cloud]")
      .filter(element => element.getAttribute("data-similarity-cloud").startsWith("organism:")).length, 0);
    assert.equal(captureState(host).cloudMode, "themes");
  }
});

test("Partenaires stays hidden and its retained mode or focus falls back to themes", () => {
  const host = domFixture();
  render(host, projects, source(), { organismMap: organismMap(),
    partnerMap: { status: "available", partners: [{ id: 10, name: "Old partner", projectIds: [1, 2] }] },
    state: { cloudMode: "partners", focusCloudMode: "partners", layoutReady: true } });
  assert.equal(host.querySelectorAll('[data-similarity-cloud-mode="partners"]').length, 0);
  assert.doesNotMatch(first(host, ".project-similarity-cloud-controls").textContent, /Partenaires|Partners/);
  assert.equal(captureState(host).cloudMode, "themes");
  assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-cloud-mode"), "themes");
});

test("missing or malformed programme maps cannot invent programme zones and retired toggles are inert", () => {
  for (const map of [undefined, { status: "unavailable", programmes: [] }, { status: "available", programmes: [] },
    { status: "available", programmes: [programmeMap().programmes[0], programmeMap().programmes[0], programmeMap().programmes[2]] }]) {
    const host = domFixture(); render(host, projects, source(), { programmeMap: map });
    assert.equal(first(host, '[data-similarity-cloud-mode="programmes"]').disabled, true);
    assert.equal(host.querySelectorAll('[data-similarity-cloud="programme:other"]').length, 0);
    assert.equal(captureState(host).cloudMode, "themes");
  }
  const host = domFixture(); render(host, projects, source(), { programmeMap: programmeMap() });
  const toggle = first(host, '[data-similarity-cloud-mode="programmes"]');
  const oldClouds = host.querySelectorAll("[data-similarity-cloud]");
  cleanup(host); toggle.checked = true; toggle.dispatch("change");
  assert.deepEqual(host.querySelectorAll("[data-similarity-cloud]"), oldClouds);
});

test("the original Odoo-described subset retains its reviewed 18 nodes, 62 edges and four communities", () => {
  const saved = require("../data/project-tags.json");
  const original = saved.projects.filter(project => project.descriptionStatus === "available");
  const model = buildModel(original, { status: "available", tagDefinitions: saved.tagDefinitions, projects: original });
  assert.equal(model.nodes.length, 18); assert.equal(model.edges.length, 62);
  assert.deepEqual(model.communities.map(group => group.ids.length), [5, 4, 4, 3]);
  assert.deepEqual(model.isolates, [2031, 2702]);
  assert.equal(model.edges.find(edge => edge.key === "2117:2118").similarity, 1);
  assert.equal(model.edges.find(edge => edge.key === "2546:2659").similarity, 1);
  const result = layout(model);
  assert.equal(result.positions.size, 16);
  for (const point of result.positions.values()) { assert.ok(Number.isFinite(point.x) && point.x >= 80 && point.x <= 920); assert.ok(Number.isFinite(point.y) && point.y >= 90 && point.y <= 510); }
});

test("all web-enriched projects join the map and each link reconciles with exact shared canonical tags", () => {
  const saved = require("../data/project-tags.json"), before = JSON.stringify(saved);
  const included = saved.projects.filter(project => project.tags.length);
  const model = buildModel(saved.projects, { status: "available", tagDefinitions: saved.tagDefinitions, projects: saved.projects });
  assert.deepEqual(model.nodes.map(node => node.id).sort((a, b) => a - b), included.map(row => row.id).sort((a, b) => a - b));
  const expected = [];
  for (let i = 0; i < included.length; i++) for (let j = i + 1; j < included.length; j++) {
    const a = included[i], b = included[j];
    if (a.tags.some(tag => b.tags.includes(tag))) expected.push([a.id, b.id].sort((x, y) => x - y).join(":"));
  }
  assert.deepEqual(model.edges.map(edge => edge.key).sort(), expected.sort());
  const placed = layout(model);
  assert.equal(placed.positions.size + model.isolates.length, included.length);
  for (const point of placed.positions.values()) assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
  assert.equal(JSON.stringify(saved), before);
});

test("the enriched portfolio keeps bubbles and labels separate inside the existing chart", () => {
  const saved = require("../data/project-tags.json");
  const data = { status: "available", tagDefinitions: saved.tagDefinitions, projects: saved.projects };
  const model = buildModel(saved.projects, data), before = JSON.stringify(model), placed = layout(model);
  const points = [...placed.positions.values()], labels = [...placed.labels.values()];
  assert.ok(placed.labels.get(2085).w >= 93, "DATA2TOTEM needs space for its wide bold capitals and text stroke");
  assert.equal(points.length, model.nodes.length - model.isolates.length);
  assert.equal(labels.length, points.length);
  assert.ok(Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)) > 650, "Use the available chart width");
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    assert.ok(point.x >= 80 && point.x <= 920 && point.y >= 90 && point.y <= 510);
    for (let j = i + 1; j < points.length; j++)
      assert.ok(Math.hypot(point.x - points[j].x, point.y - points[j].y) >= 60, "Bubbles retain visible separation after bounds are enforced");
  }
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    assert.ok(label.x >= 0 && label.x + label.w <= 1000 && label.y >= 0 && label.y + label.h <= 585, "Labels remain inside the viewBox");
    for (let j = i + 1; j < labels.length; j++) assert.ok(!overlaps(label, labels[j]), "Project labels do not overlap");
    for (const point of points) {
      const x = Math.max(label.x, Math.min(point.x, label.x + label.w));
      const y = Math.max(label.y, Math.min(point.y, label.y + label.h));
      assert.ok(Math.hypot(point.x - x, point.y - y) >= 20, "Labels stay clear of bubble fills and strokes");
    }
  }
  assert.equal(JSON.stringify(model), before, "Layout cannot change weighted links or communities");
  assert.deepEqual(placed, layout(buildModel(saved.projects.slice().reverse(), { ...data, projects: saved.projects.slice().reverse() })));
});

test("displaced project labels retain noninteractive guides to their own bubbles", () => {
  const saved = require("../data/project-tags.json"), host = domFixture();
  const { model } = render(host, saved.projects, { status: "available", tagDefinitions: saved.tagDefinitions, projects: saved.projects });
  const leaders = host.querySelectorAll(".project-similarity-label-leader").filter(leader => Number(leader.getAttribute("opacity")) > 0);
  assert.ok(leaders.length > 0, "Dense labels have visible guides");
  for (const leader of leaders) {
    assert.equal(leader.tagName, "line");
    assert.equal(leader.getAttribute("aria-hidden"), "true");
    assert.equal(leader.getAttribute("pointer-events"), "none");
    assert.equal(leader.getAttribute("tabindex"), null);
    assert.equal(leader.getAttribute("data-similarity-edge"), null);
    assert.equal(leader.getAttribute("data-similarity-project"), null);
    assert.ok(leader.getAttribute("stroke-dasharray"));
    const group = leader.parentElement, id = Number(group.getAttribute("data-similarity-project"));
    assert.ok(model.nodes.some(project => project.id === id));
    assert.equal(first(group, "title").textContent, model.nodes.find(project => project.id === id).name);
  }
  const guided = leaders[0].parentElement, id = Number(guided.getAttribute("data-similarity-project"));
  const unrelated = model.edges.find(edge => edge.source !== id && edge.target !== id);
  first(host, `[data-similarity-edge="${unrelated.key}"]`).dispatch("pointerenter");
  assert.equal(guided.getAttribute("opacity"), ".17", "The guide dims with its own project");
});

test("empty, unavailable, single project and all-isolated maps remain honest without invented edges", () => {
  for (const data of [null, { status: "unavailable" }, { status: "available", projects: [], tagDefinitions: {} }]) {
    const host = domFixture(); render(host, projects, data); assert.equal(host.querySelectorAll("svg").length, 0);
    assert.match(host.textContent, /indisponible|Aucun projet/);
  }
  const host = domFixture(), result = render(host, projects.slice(3, 4), source());
  assert.equal(result.model.nodes.length, 1); assert.equal(result.model.edges.length, 0);
  assert.equal(host.querySelectorAll("svg").length, 0); assert.equal(host.querySelectorAll(".project-similarity-isolated").length, 1);
});

test("SVG hover and keyboard focus expose real tag details and emphasize related projects", () => {
  const host = domFixture(); render(host, projects, source());
  const bubble = first(host, '[data-similarity-project="1"]'); bubble.dispatch("pointerenter");
  assert.match(first(host, ".project-similarity-details").textContent, /FR computer-vision/);
  const isolate = first(host, '[data-similarity-project="4"]'); assert.equal(isolate.getAttribute("opacity"), ".17");
  assert.equal(first(host, '[data-similarity-edge="1:2"]').getAttribute("opacity"), ".9");
  assert.equal(first(host, '[data-similarity-edge="2:3"]').getAttribute("opacity"), ".055", "A neighbor-to-neighbor connection is unrelated to the hovered project");
  const edge = first(host, '[data-similarity-edge="1:3"]'); edge.focus();
  const text = first(host, ".project-similarity-detail-content").textContent;
  assert.match(text, /FR bim/); assert.ok(!text.includes("FR computer-vision"));
  assert.equal(first(host, '[data-similarity-edge="1:2"]').getAttribute("opacity"), ".055");
  edge.dispatch("keydown", { key: "Escape" }); assert.match(first(host, ".project-similarity-details").textContent, /Explorer les proximités/);
});

test("SVG links skip the tab order while native relation controls reveal shared tags and keep focus", () => {
  const host = domFixture(); render(host, projects, source());
  for (const edge of host.querySelectorAll("[data-similarity-edge]")) assert.equal(edge.getAttribute("tabindex"), "-1");
  first(host, '[data-similarity-project="1"]').focus();
  const relation = first(host, '[data-similarity-relation="1:3"]');
  assert.equal(relation.tagName, "button"); relation.focus();
  assert.ok(host.contains(relation)); assert.equal(host.ownerDocument.activeElement, relation);
  assert.match(first(host, ".project-similarity-detail-content").textContent, /FR bim/);
  assert.ok(!first(host, ".project-similarity-detail-content").textContent.includes("FR computer-vision"));
  assert.equal(first(host, '[data-similarity-edge="1:3"]').getAttribute("opacity"), ".9");
  assert.equal(first(host, '[data-similarity-edge="1:2"]').getAttribute("opacity"), ".055");
});

test("leaving a bubble, label, link or project control restores the initial graph while retaining usable details", () => {
  const host = domFixture(), opened = [];
  render(host, projects, source(), { onSelect: id => opened.push(id) });
  const graphAppearance = () => [...host.querySelectorAll("[data-similarity-project]"), ...host.querySelectorAll("[data-similarity-edge]")]
    .filter(element => element.getAttribute("opacity") !== null)
    .map(element => [element.getAttribute("data-similarity-project"), element.getAttribute("data-similarity-edge"), element.getAttribute("opacity"), element.style.opacity]);
  const initial = graphAppearance();
  for (const element of [first(host, '[data-similarity-project="1"]'),
    first(host, '[data-similarity-project="4"]'),
    first(host, '[data-similarity-edge="1:3"]')]) {
    element.dispatch("pointerenter");
    assert.notDeepEqual(graphAppearance(), initial);
    element.dispatch("pointerleave");
    assert.deepEqual(graphAppearance(), initial);
  }
  const bubble = first(host, '[data-similarity-project="1"]');
  bubble.dispatch("pointerenter"); bubble.dispatch("pointerleave");
  assert.match(first(host, ".project-similarity-detail-content").textContent, /FR computer-vision/);
  first(host, '[data-similarity-open="1"]').dispatch("click"); assert.deepEqual(opened, [1]);
  const next = first(host, '[data-similarity-project="3"]'); next.dispatch("pointerenter");
  assert.equal(first(host, '[data-similarity-project="4"]').getAttribute("opacity"), ".17");
  cleanup(host); const stopped = graphAppearance();
  next.dispatch("pointerleave"); assert.deepEqual(graphAppearance(), stopped);
});

test("hover-cleared colours survive cached and language rerenders while keyboard exploration remains available", () => {
  const host = domFixture(), previous = I18n.language();
  try {
    render(host, projects, source());
    const bubble = first(host, '[data-similarity-project="1"]');
    bubble.focus(); bubble.dispatch("pointerenter"); bubble.dispatch("pointerleave");
    const state = captureState(host); assert.equal(state.clearEmphasis, true);
    I18n.setLanguage("nl"); render(host, projects, source(), { state });
    assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-project"), "1");
    for (const element of host.querySelectorAll("[data-similarity-project]"))
      if (element.getAttribute("opacity") !== null) assert.equal(element.getAttribute("opacity"), "1");
    assert.match(first(host, ".project-similarity-detail-content").textContent, /NL computer-vision/);
    first(host, '[data-similarity-project="3"]').focus();
    assert.equal(first(host, '[data-similarity-project="4"]').getAttribute("opacity"), ".17");
    assert.equal(captureState(host).clearEmphasis, false);
  } finally { I18n.setLanguage(previous); }
});

test("the explorer orders unique used tags by visible-project popularity with localized alphabetical ties", () => {
  const host = domFixture(), data = source(), previous = I18n.language();
  data.tagDefinitions.bim = { fr: "Z BIM", nl: "Z BIM" };
  data.tagDefinitions["computer-vision"] = { fr: "B Vision", nl: "B Visie" };
  data.tagDefinitions["data-spaces"] = { fr: "Z Données", nl: "A Data" };
  data.tagDefinitions.ventilation = { fr: "A Ventilation", nl: "Z Ventilatie" };
  data.tagDefinitions.hidden = { fr: "Secret", nl: "Geheim" };
  data.tagDefinitions.unused = { fr: "Inutilisé", nl: "Ongebruikt" };
  data.projects[0].tags.push("bim");
  data.projects.push({ id: 99, tags: ["hidden", "ventilation"] });
  try {
    for (const language of ["fr", "nl"]) {
      I18n.setLanguage(language); render(host, projects, data);
      const explorer = first(host, ".project-similarity-accessible");
      assert.equal(first(explorer, "summary").textContent, language === "fr" ? "Explorer par tag" : "Verkennen op tag");
      const buttons = host.querySelectorAll("[data-similarity-tag]");
      assert.deepEqual(buttons.map(button => button.getAttribute("data-similarity-tag")).sort(), ["bim", "computer-vision", "data-spaces", "ventilation"]);
      assert.deepEqual(buttons.map(button => button.getAttribute("data-similarity-tag")), language === "fr"
        ? ["bim", "computer-vision", "ventilation", "data-spaces"] : ["bim", "computer-vision", "data-spaces", "ventilation"]);
      for (const button of buttons) { assert.equal(button.tagName, "button"); assert.equal(button.type, "button"); assert.equal(button.getAttribute("aria-pressed"), "false"); }
      assert.equal(host.querySelectorAll(".project-similarity-project-list").length, 0);
    }
  } finally { I18n.setLanguage(previous); }
});

test("selecting a tag lists all exact related projects and highlights only its matching links", () => {
  const host = domFixture(), opened = [];
  render(host, projects, source(), { onSelect: id => opened.push(id) });
  const vision = first(host, '[data-similarity-tag="computer-vision"]');
  vision.focus(); vision.dispatch("click");
  assert.equal(vision.getAttribute("aria-pressed"), "true");
  assert.deepEqual(host.querySelectorAll("[data-similarity-tag-project]").map(button => button.getAttribute("data-similarity-tag-project")), ["1", "2"]);
  assert.match(first(host, ".project-similarity-detail-content").textContent, /FR computer-vision.*2 projets/);
  assert.equal(first(host, '[data-similarity-project="3"]').getAttribute("opacity"), ".17");
  assert.equal(first(host, '[data-similarity-edge="1:2"]').getAttribute("opacity"), ".9");
  assert.equal(first(host, '[data-similarity-edge="1:3"]').getAttribute("opacity"), ".055");
  vision.dispatch("pointerleave"); assert.equal(captureState(host).activeTagId, "computer-vision");
  assert.deepEqual(opened, []);
  first(host, '[data-similarity-tag-project="2"]').dispatch("click");
  assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-project"), "2");
  assert.equal(vision.getAttribute("aria-pressed"), "false");
  first(host, '[data-similarity-open="2"]').dispatch("click"); assert.deepEqual(opened, [2]);
  first(host, '[data-similarity-tag="ventilation"]').dispatch("click");
  assert.deepEqual(host.querySelectorAll("[data-similarity-tag-project]").map(button => button.getAttribute("data-similarity-tag-project")), ["4"]);
  assert.match(first(host, ".project-similarity-detail-content").textContent, /1 projet avec ce tag/);
  assert.equal(first(host, '[data-similarity-project="4"]').getAttribute("opacity"), "1");
});

test("tag selection, explorer openness and tag/result focus survive localized rerenders without stealing outside focus", () => {
  const host = domFixture(), previous = I18n.language();
  try {
    I18n.setLanguage("fr"); render(host, projects, source());
    first(host, ".project-similarity-accessible").open = true;
    const tag = first(host, '[data-similarity-tag="bim"]'); tag.focus(); tag.dispatch("click");
    const selected = captureState(host); assert.equal(selected.activeTagId, "bim"); assert.equal(selected.tagExplorerOpen, true);
    I18n.setLanguage("nl"); render(host, projects, source(), { state: selected });
    assert.equal(first(host, ".project-similarity-accessible").open, true);
    assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-tag"), "bim");
    assert.match(first(host, ".project-similarity-detail-content").textContent, /NL bim.*3 projecten/);
    first(host, '[data-similarity-tag-project="3"]').focus();
    render(host, projects, source());
    assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-tag-project"), "3");
    const outside = host.ownerDocument.createElement("button"); outside.focus();
    render(host, projects, source()); assert.equal(host.ownerDocument.activeElement, outside);
    assert.equal(first(host, '[data-similarity-tag="bim"]').getAttribute("aria-pressed"), "true");
  } finally { I18n.setLanguage(previous); }
});

test("tag controls reset on Escape, ignore stale bubble exits and become inert after cleanup", () => {
  const host = domFixture(); render(host, projects, source());
  const bubble = first(host, '[data-similarity-project="1"]'), tag = first(host, '[data-similarity-tag="ventilation"]');
  bubble.dispatch("pointerenter"); tag.dispatch("click"); bubble.dispatch("pointerleave");
  assert.equal(first(host, '[data-similarity-project="1"]').getAttribute("opacity"), ".17");
  assert.equal(first(host, '[data-similarity-project="4"]').getAttribute("opacity"), "1");
  tag.dispatch("keydown", { key: "Escape" });
  assert.equal(tag.getAttribute("aria-pressed"), "false");
  assert.equal(first(host, '[data-similarity-project="1"]').getAttribute("opacity"), "1");
  cleanup(host); tag.dispatch("click"); assert.match(first(host, ".project-similarity-detail-content").textContent, /Explorer les proximités/);
  render(host, projects, source()); first(host, '[data-similarity-tag="computer-vision"]').dispatch("click");
  const data = source(); for (const row of data.projects) row.tags = row.tags.filter(id => id !== "computer-vision");
  render(host, projects, data);
  assert.match(first(host, ".project-similarity-detail-content").textContent, /Explorer les proximités/);
  assert.equal(host.querySelectorAll('[data-similarity-tag="computer-vision"]').length, 0);
});

test("a late leave from an older bubble cannot clear a newer pointer or keyboard selection", () => {
  const host = domFixture(); render(host, projects, source());
  const firstBubble = first(host, '[data-similarity-project="1"]'), second = first(host, '[data-similarity-project="3"]');
  firstBubble.dispatch("pointerenter"); second.dispatch("pointerenter"); firstBubble.dispatch("pointerleave");
  assert.equal(first(host, '[data-similarity-edge="1:2"]').getAttribute("opacity"), ".055");
  assert.equal(first(host, '[data-similarity-project="4"]').getAttribute("opacity"), ".17");
  second.dispatch("pointerleave");
  assert.equal(first(host, '[data-similarity-project="4"]').getAttribute("opacity"), "1");
  firstBubble.dispatch("pointerenter"); first(host, '[data-similarity-relation="1:3"]').focus(); firstBubble.dispatch("pointerleave");
  assert.equal(first(host, '[data-similarity-edge="1:2"]').getAttribute("opacity"), ".055");
  assert.equal(first(host, '[data-similarity-edge="1:3"]').getAttribute("opacity"), ".9");
});

test("project opening is explicit and old controls become inert after cleanup", () => {
  const host = domFixture(), selected = [];
  render(host, projects, source(), { onSelect: id => selected.push(id) });
  first(host, '[data-similarity-project="1"]').dispatch("click"); assert.deepEqual(selected, []);
  const open = first(host, '[data-similarity-open="1"]'); open.dispatch("click"); assert.deepEqual(selected, [1]);
  cleanup(host); open.dispatch("click"); assert.deepEqual(selected, [1]);
});

test("native relation focus and its project context survive localized parent rerenders", () => {
  const host = domFixture(), previous = I18n.language();
  try {
    render(host, projects, source()); first(host, '[data-similarity-project="1"]').focus();
    first(host, '[data-similarity-relation="1:3"]').focus();
    const state = captureState(host); assert.equal(state.contextProjectId, 1); assert.equal(state.focusRelationKey, "1:3");
    I18n.setLanguage("nl"); render(host, projects, source(), { state });
    assert.equal(host.ownerDocument.activeElement.tagName, "button");
    assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-relation"), "1:3");
    assert.match(first(host, ".project-similarity-detail-content").textContent, /NL bim/);
    assert.match(first(host, ".project-similarity-relations").textContent, /Projecten verwant aan Demo 1/);
  } finally { I18n.setLanguage(previous); }
});

test("focus and active relation survive a language rerender without stealing outside focus", () => {
  const host = domFixture(), previous = I18n.language();
  try {
    render(host, projects, source()); first(host, '[data-similarity-edge="1:3"]').focus();
    const state = captureState(host); assert.equal(state.focusEdgeKey, "1:3");
    I18n.setLanguage("nl"); render(host, projects, source(), { state });
    assert.equal(host.ownerDocument.activeElement.getAttribute("data-similarity-edge"), "1:3");
    assert.match(first(host, ".project-similarity-details").textContent, /Gedeelde tags/);
    assert.match(first(host, ".project-similarity-details").textContent, /NL bim/);
    const outside = host.ownerDocument.createElement("button"); outside.focus();
    render(host, projects, source()); assert.equal(host.ownerDocument.activeElement, outside);
  } finally { I18n.setLanguage(previous); }
});

test("unsafe names and labels are rendered as literal text and never create HTML", () => {
  const data = source(); data.tagDefinitions.bim.fr = '<img src=x onerror="bad">';
  const rows = projects.map(row => ({ ...row, name: row.id === 1 ? '<svg onload="bad">' : row.name }));
  const host = domFixture(); render(host, rows, data); first(host, '[data-similarity-project="1"]').dispatch("click");
  assert.match(host.textContent, /<svg onload="bad">/); assert.match(host.textContent, /<img src=x/);
  assert.equal(host.querySelectorAll("img").length, 0);
});

test("responsive CSS contains the wide SVG in its own keyboard-scrollable region", () => {
  const fs = require("node:fs"), host = domFixture(); render(host, projects, source());
  const scroll = first(host, ".project-similarity-scroll"); assert.equal(scroll.getAttribute("tabindex"), "0");
  const css = fs.readFileSync(require.resolve("../project-similarity.css"), "utf8");
  assert.match(css, /overflow-x: auto/); assert.match(css, /minmax\(0, 1fr\)/); assert.match(css, /max-width: 600px/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) 345px/);
  assert.equal(first(host, "svg").getAttribute("viewBox"), "0 0 1000 585");
});
