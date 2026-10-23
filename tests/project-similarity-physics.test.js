"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { buildModel, layout } = require("../project-similarity");
const { createProjectMap } = require("../programme-service");
const saved = require("../data/project-tags.json");

function portfolio() {
  const model = buildModel(saved.projects, { status: "available", tagDefinitions: saved.tagDefinitions, projects: saved.projects });
  const programmes = createProjectMap(saved.projects).programmes;
  const assigned = new Set(programmes.flatMap(programme => programme.projectIds));
  const groups = programmes.map(programme => ({ key: programme.id, ids: programme.projectIds, color: "#556a99" }));
  groups.push({ key: "other", ids: model.nodes.filter(node => !assigned.has(node.id)).map(node => node.id), color: "#607f88", other: true });
  return { model, groups };
}
function assertBounds(positions) {
  for (const point of positions.values()) {
    assert.ok(Number.isFinite(point.x) && point.x >= 85 && point.x <= 915);
    assert.ok(Number.isFinite(point.y) && point.y >= 95 && point.y <= 505);
  }
}
function radius(ids, positions) {
  const points = ids.filter(id => positions.has(id)).map(id => positions.get(id));
  const centre = { x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length };
  return { ...centre, radius: points.reduce((sum, p) => sum + Math.hypot(p.x - centre.x, p.y - centre.y), 0) / points.length };
}
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

test("real portfolio solver records deterministic bounded particle frames and retains immutable graph evidence", () => {
  const { model, groups } = portfolio(), original = structuredClone(model), originalGroups = structuredClone(groups);
  assert.equal(model.nodes.length, 36);
  for (const selected of [null, groups]) {
    const geometry = layout(model, { groups: selected, recordFrames: true });
    const again = layout(model, { groups: selected, recordFrames: true });
    assert.deepEqual(geometry, again);
    assert.ok(geometry.frames.length >= 100 && geometry.frames.length <= 140);
    for (const frame of geometry.frames) { assert.equal(frame.size, geometry.positions.size); assertBounds(frame); }
    assert.deepEqual(geometry.frames.at(-1), geometry.positions);
    assert.notStrictEqual(geometry.frames.at(-1), geometry.positions);
    const plain = layout(model, { groups: selected });
    assert.deepEqual(plain.frames, []); assert.deepEqual(plain.positions, geometry.positions);
    assert.deepEqual(model, original); assert.deepEqual(groups, originalGroups);
  }
});

test("theme particles start centrally and follow force trajectories instead of interpolating final coordinates", () => {
  const { model } = portfolio(), { positions, frames } = layout(model, { recordFrames: true });
  const initial = [...frames[0].values()], final = [...positions.values()];
  assert.ok(Math.max(...initial.map(p => p.x)) - Math.min(...initial.map(p => p.x)) < 100);
  assert.ok(Math.max(...final.map(p => p.x)) - Math.min(...final.map(p => p.x)) > 650);
  const halfway = Math.floor(frames.length / 2), ratio = halfway / (frames.length - 1);
  assert.ok([...positions].some(([id, point]) => {
    const start = frames[0].get(id), middle = frames[halfway].get(id);
    return Math.hypot(middle.x - start.x - (point.x - start.x) * ratio,
      middle.y - start.y - (point.y - start.y) * ratio) > 30;
  }));
  const firstId = model.nodes[0].id, untouched = frames[1].get(firstId).x;
  frames[0].get(firstId).x = -100;
  assert.equal(frames[1].get(firstId).x, untouched);
  assertBounds(positions);
});

test("programme forces maintain cohesive separate centres while unassigned projects remain spread by tag forces", () => {
  const { model, groups } = portfolio(), thematic = layout(model), programme = layout(model, { groups, recordFrames: true });
  const named = groups.filter(group => !group.other);
  const means = named.map(group => radius(group.ids, programme.positions));
  assert.deepEqual(named.map(group => group.ids.filter(id => programme.positions.has(id)).length), [7, 7, 5]);
  for (let index = 0; index < named.length; index++) {
    const initial = radius(named[index].ids, programme.frames[0]);
    assert.ok(initial.radius < 45, "Programme members begin around their own seed centre");
    assert.ok(means[index].radius < 100);
    assert.ok(means[index].radius < radius(named[index].ids, thematic.positions).radius * .8);
    for (let next = index + 1; next < means.length; next++)
      assert.ok(Math.hypot(means[index].x - means[next].x, means[index].y - means[next].y) > 250);
  }
  assert.ok(radius(groups.find(group => group.other).ids, programme.positions).radius > 140,
    "Unassigned projects are not compressed into a fourth programme cluster");
  assert.deepEqual(programme.regions.map(group => group.key), groups.map(group => group.key));
});

test("both settled layouts preserve visible bubble separation and collision-free bounded project labels", () => {
  const { model, groups } = portfolio();
  for (const selected of [null, groups]) {
    const geometry = layout(model, { groups: selected }), points = [...geometry.positions.values()], labels = [...geometry.labels.values()];
    assertBounds(geometry.positions);
    assert.ok(points.filter(p => p.x < 90 || p.x > 910 || p.y < 100 || p.y > 500).length <= 6,
      "Most particles settle in the interior rather than a rectangle of boundary-pinned nodes");
    assert.equal(labels.length, points.length);
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++)
      assert.ok(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) >= 60);
    for (let i = 0; i < labels.length; i++) {
      const box = labels[i];
      assert.ok(box.x >= 0 && box.x + box.w <= 1000 && box.y >= 0 && box.y + box.h <= 585);
      for (let j = i + 1; j < labels.length; j++) assert.ok(!overlaps(box, labels[j]));
      for (const point of points) {
        const x = Math.max(box.x, Math.min(point.x, box.x + box.w));
        const y = Math.max(box.y, Math.min(point.y, box.y + box.h));
        assert.ok(Math.hypot(point.x - x, point.y - y) >= 20);
      }
    }
  }
});

test("empty active graphs and unplotted group IDs do not invent particles or regions", () => {
  const empty = layout({ nodes: [], edges: [], communities: [], isolates: [] }, { recordFrames: true });
  assert.deepEqual(empty, { positions: new Map(), labels: new Map(), regions: [], frames: [] });
  const { model, groups } = portfolio();
  const geometry = layout(model, { groups: [...groups, { key: "hidden", ids: [999999], color: "#000" }] });
  assert.equal(geometry.positions.has(999999), false);
  assert.equal(geometry.regions.some(group => group.key === "hidden"), false);
});
