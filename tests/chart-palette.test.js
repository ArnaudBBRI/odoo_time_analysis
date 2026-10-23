"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../chart-palette"), "utf8");
function load(storage) {
  const context = { module: { exports: {} }, localStorage: storage };
  vm.runInNewContext(source, context, { filename: "chart-palette.js" });
  return context.module.exports;
}

test("Dico vibes is the default and all palettes repeat without generating extra colours", () => {
  const palette = load();
  const expected = ["#F89700", "#CAC800", "#4DD000", "#00EF75", "#00E0BF", "#00E7FF", "#00C2FF", "#00B8FF", "#9289FF", "#E480FF", "#FF55FF", "#FF53D3", "#FF3272", "#FF5E00", "#FF7000"];
  assert.equal(palette.current(), "dico-vibes"); assert.deepEqual(Array.from(palette.colors()), expected);
  assert.equal(palette.colors("classic").length, 20);
  assert.deepEqual(Array.from(palette.colors("vibrant-emotions")), ["#FF5733", "#C70039", "#FFC300", "#DAF7A6", "#581845", "#5D3F6A", "#FFC0CB", "#900C3F", "#FF9F00", "#2980B9"]);
  for (const id of ["classic", "dico-vibes", "vibrant-emotions"]) for (let index = 0; index < 61; index++)
    assert.equal(palette.color(index, id), palette.colors(id)[index % palette.colors(id).length]);
  for (const id of ["classic", "dico-vibes", "vibrant-emotions"]) assert.ok(Object.isFrozen(palette.colors(id)));
});

test("initialization reads only the palette key once and never writes a default or stored preference", () => {
  const reads = [], writes = [], storage = { getItem(key) { reads.push(key); return "classic"; }, setItem(...args) { writes.push(args); } };
  const palette = load(storage);
  assert.equal(palette.initialize(), "classic"); assert.equal(palette.initialize({ storage: null }), "classic");
  assert.deepEqual(reads, ["odoo-time-analysis.chart-palette"]); assert.deepEqual(writes, []);
  const empty = load({ getItem() { return null; }, setItem() { throw new Error("No default writes"); } });
  assert.equal(empty.initialize(), "dico-vibes");
});

test("only a changed valid choice is persisted and subscribers repaint once then can unsubscribe", () => {
  const writes = [], palette = load({ getItem() { return null; }, setItem(...args) { writes.push(args); } });
  palette.initialize(); const changes = [], dispose = palette.subscribe(id => changes.push([id, palette.current(), palette.color(0)]));
  assert.equal(palette.set("classic"), true); assert.equal(palette.set("classic"), false);
  assert.equal(palette.set("vibrant-emotions"), true); assert.equal(palette.set("vibrant-emotions"), false);
  for (const invalid of [null, false, {}, "__proto__", "Dico vibes", "Vibrant Emotions", "other"]) assert.equal(palette.set(invalid), false);
  dispose(); dispose(); palette.set("dico-vibes");
  assert.deepEqual(changes, [["classic", "classic", "#f7909f"], ["vibrant-emotions", "vibrant-emotions", "#FF5733"]]);
  assert.deepEqual(writes, [["odoo-time-analysis.chart-palette", "classic"], ["odoo-time-analysis.chart-palette", "vibrant-emotions"], ["odoo-time-analysis.chart-palette", "dico-vibes"]]);
});

test("stored invalid values and blocked reads or writes retain a usable session preference", () => {
  for (const storage of [undefined, { getItem() { return "__proto__"; } }, { getItem() { throw new Error("Blocked"); }, setItem() { throw new Error("Blocked"); } }]) {
    const palette = load(storage); assert.equal(palette.initialize(), "dico-vibes");
    assert.equal(palette.set("classic"), true); assert.equal(palette.current(), "classic");
    assert.equal(palette.color(20), "#f7909f");
  }
});

test("an injected browser store reloads the selected enum without carrying chart or Odoo data", () => {
  for (const id of ["classic", "dico-vibes", "vibrant-emotions"]) {
    const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
    const first = load(); first.initialize({ storage }); first.set("classic"); first.set(id);
    const second = load(storage); assert.equal(second.initialize(), id);
    assert.deepEqual([...values], [["odoo-time-analysis.chart-palette", id]]);
  }
});
