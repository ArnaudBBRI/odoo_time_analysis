"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const I18n = require("./i18n-fixture");
const { domFixture } = require("./dom-fixture");

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const seam = "const originalFetch = window.fetch.bind(window);";
const paletteSource = fs.readFileSync(path.join(__dirname, "../chart-palette.js"), "utf8");
const storageKey = "odoo-time-analysis.chart-palette";

function fixture({ saved = null, width = 1280, blockedStorage = false } = {}) {
  const root = domFixture(), document = root.ownerDocument, elements = new Map(), reads = [], writes = [];
  const requests = [], renders = [], bindings = new Map(), windowListeners = new Map();
  const element = id => {
    if (!elements.has(id)) {
      const tag = id === "toolbarSettings" ? "details" : id === "toolbarSettingsToggle" ? "summary" :
        id.startsWith("chartPalette") ? "input" : "div";
      const node = document.createElement(tag); node.id = id; node.dataset = {};
      const add = node.addEventListener.bind(node);
      node.addEventListener = (name, listener) => {
        const key = `${id}:${name}`; bindings.set(key, (bindings.get(key) || 0) + 1); add(name, listener);
      };
      elements.set(id, node);
    }
    return elements.get(id);
  };
  document.getElementById = element;
  const menu = element("toolbarSettings"), summary = element("toolbarSettingsToggle"), panel = element("toolbarSettingsPanel");
  root.append(menu, element("dashboardMain")); menu.append(summary, panel);
  const previews = new Map();
  for (const [id, value] of [["chartPaletteDicoVibes", "dico-vibes"], ["chartPaletteClassic", "classic"], ["chartPaletteVibrantEmotions", "vibrant-emotions"]]) {
    const input = element(id); input.value = value; input.checked = value === "dico-vibes";
    const preview = document.createElement("span"); preview.setAttribute("data-chart-palette-preview", value);
    previews.set(value, preview); panel.append(input, preview);
  }
  menu.getBoundingClientRect = () => ({ left: width - 500, width: 120 });
  panel.getBoundingClientRect = () => ({ left: 0, width: Math.min(320, width - 32) });
  const storage = { getItem(key) { reads.push(key); if (blockedStorage) throw new Error("Denied"); return saved; },
    setItem(key, value) { writes.push([key, value]); if (blockedStorage) throw new Error("Denied"); saved = value; } };
  const window = { innerWidth: width, localStorage: storage, fetch(url) { requests.push(url); throw new Error("Offline fixture"); },
    DashboardLanguage: { applyStatic() {} },
    addEventListener(name, listener) {
      if (!windowListeners.has(name)) windowListeners.set(name, new Set()); windowListeners.get(name).add(listener);
    } };
  const context = vm.createContext({ window, document, DashboardI18n: I18n, localStorage: storage, renders });
  vm.runInContext(paletteSource, context, { filename: "chart-palette.js" });
  window.ChartPalette = context.ChartPalette;
  const instrumented = script.replace(seam, `
    renderYearFilters = renderPersonalTimeMacro = renderProgrammes = renderPersonalProjects = () => globalThis.renders.push("view");
    globalThis.dashboard = { state, els, initializeChartPaletteSettings, applyChartPaletteSettings,
      positionToolbarSettings, applyDashboardLanguage, chartLineColor, repaintLegacyLineCharts,
      renderLineChart, renderPlannedActualChart, renderLineLegend, renderPieChart, buildEmployeeColorMap,
      legacyLineRepaints, legacyLineColorIndexes };
    return;
    ${seam}`);
  assert.equal(script.split(seam).length, 2);
  vm.runInContext(instrumented, context, { filename: "index.html" });
  return { root, document, menu, summary, panel, element, previews, window, windowListeners,
    palette: window.ChartPalette, dashboard: context.dashboard, reads, writes, requests, renders, bindings };
}

function chartCanvas(f) {
  const canvas = f.document.createElement("canvas"), colors = [], operations = [];
  const ctx = new Proxy({ measureText: text => ({ width: String(text).length * 6 }) }, {
    get(target, key) { if (!(key in target)) target[key] = (...args) => operations.push([key, ...args]); return target[key]; },
    set(target, key, value) { if (key === "strokeStyle" || key === "fillStyle") colors.push([key, value]); target[key] = value; return true; }
  });
  canvas.getContext = () => ctx; canvas.isConnected = true; f.root.append(canvas);
  return { canvas, colors, operations };
}

function lineData() {
  const months = [{ key: "2026-01", year: 2026, month: 0, date: new Date("2026-01-01"), label: "janv. 2026" },
    { key: "2026-02", year: 2026, month: 1, date: new Date("2026-02-01"), label: "févr. 2026" }];
  const entries = [{ name: "Alice Source", color: "#101010", value: 30, values: new Map([["2026-01", 10], ["2026-02", 20]]) },
    { name: "Benoît Source", color: "#202020", value: 60, values: new Map([["2026-01", 20], ["2026-02", 40]]) }];
  return { months, entries, project: { name: "Source project", months, rows: entries },
    plan: { months, rows: entries, allocationMode: "monthly" } };
}

test("the permanent toolbar offers accessible native palette choices with Dico vibes selected by default", () => {
  const header = html.match(/<header class="app-header">([\s\S]*?)<\/header>/)?.[1];
  assert.match(header, /<details id="toolbarSettings"/);
  assert.match(header, /<summary id="toolbarSettingsToggle">/);
  assert.match(header, /<fieldset>\s*<legend data-i18n="shell\.settings\.chartPalette"/);
  const radios = [...header.matchAll(/<input\b[^>]*\bname="chartPalette"[^>]*>/g)].map(match => match[0]);
  assert.equal(radios.length, 3); assert.ok(radios.every(input => input.includes('type="radio"')));
  assert.match(radios[0], /value="dico-vibes" checked/); assert.match(radios[1], /value="classic"/);
  assert.match(radios[2], /value="vibrant-emotions"/); assert.ok(!radios[2].includes(" checked"));
  assert.ok(html.indexOf('src="/chart-palette.js"') < html.indexOf('src="/project-browser.js"'));
  assert.ok(html.indexOf('src="/chart-palette.js"') < html.indexOf('src="/unit-dico.js"'));
  assert.match(html, /summary:focus-visible, \.chart-palette-option:focus-within/);
});

test("settings restore the local choice before rendering and initialize listeners and complete previews once", () => {
  for (const saved of [null, "classic", "dico-vibes", "vibrant-emotions", "invalid"]) {
    const f = fixture({ saved });
    const expected = ["classic", "vibrant-emotions"].includes(saved) ? saved : "dico-vibes";
    assert.equal(f.palette.current(), expected);
    assert.equal(f.element("chartPaletteDicoVibes").checked, expected === "dico-vibes");
    assert.equal(f.element("chartPaletteClassic").checked, expected === "classic");
    assert.equal(f.element("chartPaletteVibrantEmotions").checked, expected === "vibrant-emotions");
    assert.deepEqual(f.reads, [storageKey]); assert.deepEqual(f.writes, []);
    assert.equal(f.previews.get("dico-vibes").children.length, 15);
    assert.equal(f.previews.get("classic").children.length, 20);
    assert.equal(f.previews.get("vibrant-emotions").children.length, 10);
    for (const id of ["dico-vibes", "classic", "vibrant-emotions"])
      assert.deepEqual(f.previews.get(id).children.map(node => node.style.backgroundColor), Array.from(f.palette.colors(id)));
    f.dashboard.initializeChartPaletteSettings();
    assert.equal(f.bindings.get("chartPaletteClassic:change"), 1);
    assert.equal(f.bindings.get("chartPaletteVibrantEmotions:change"), 1);
    assert.equal(f.document.listeners.get("keydown").size, 1);
    assert.deepEqual(f.requests, []); assert.deepEqual(f.renders, []);
  }
});

test("changing a native radio applies immediately without closing the menu, replacing focused controls or requesting data", () => {
  const f = fixture(), classic = f.element("chartPaletteClassic"), dico = f.element("chartPaletteDicoVibes"), vibrant = f.element("chartPaletteVibrantEmotions");
  const content = f.document.createElement("details"); content.open = true; f.element("dashboardMain").append(content);
  f.menu.open = true; classic.focus(); classic.checked = true; classic.dispatch("change");
  assert.equal(f.palette.current(), "classic"); assert.equal(dico.checked, false); assert.equal(classic.checked, true);
  assert.equal(f.menu.open, true); assert.equal(f.document.activeElement, classic);
  assert.equal(f.element("dashboardMain").children[0], content); assert.equal(content.open, true);
  vibrant.focus(); vibrant.checked = true; vibrant.dispatch("change");
  assert.equal(f.palette.current(), "vibrant-emotions"); assert.equal(vibrant.checked, true);
  assert.equal(dico.checked, false); assert.equal(classic.checked, false);
  assert.deepEqual(f.writes, [[storageKey, "classic"], [storageKey, "vibrant-emotions"]]);
  f.palette.set("dico-vibes"); assert.equal(dico.checked, true); assert.equal(classic.checked, false); assert.equal(vibrant.checked, false);
  assert.equal(f.document.activeElement, vibrant); assert.equal(f.menu.open, true);
  assert.deepEqual(f.requests, []); assert.deepEqual(f.renders, []);
});

test("blocked browser storage leaves settings and immediate palette switching usable", () => {
  const f = fixture({ blockedStorage: true }), vibrant = f.element("chartPaletteVibrantEmotions");
  assert.equal(f.palette.current(), "dico-vibes"); vibrant.checked = true; vibrant.dispatch("change");
  assert.equal(f.palette.current(), "vibrant-emotions"); assert.equal(vibrant.checked, true);
  assert.deepEqual(f.requests, []); assert.deepEqual(f.renders, []);
});

test("Escape restores summary focus while outside dismissal preserves the user's destination focus", () => {
  const f = fixture(), radio = f.element("chartPaletteClassic"); let prevented = 0;
  f.menu.open = true; radio.focus();
  f.document.dispatch("pointerdown", { target: radio }); assert.equal(f.menu.open, true);
  f.document.dispatch("keydown", { key: "Enter", preventDefault() { prevented++; } }); assert.equal(f.menu.open, true);
  f.document.dispatch("keydown", { key: "Escape", preventDefault() { prevented++; } });
  assert.equal(f.menu.open, false); assert.equal(f.document.activeElement, f.summary); assert.equal(prevented, 1);
  const outside = f.element("dashboardMain"); outside.focus(); f.menu.open = true;
  f.document.dispatch("pointerdown", { target: outside });
  assert.equal(f.menu.open, false); assert.equal(f.document.activeElement, outside);
});

test("the open settings panel stays within phone and desktop viewport gutters", () => {
  for (const width of [320, 390, 800, 1600, 3440]) {
    const f = fixture({ width }); f.menu.open = true; f.menu.dispatch("toggle");
    const anchor = f.menu.getBoundingClientRect(), panel = f.panel.getBoundingClientRect();
    const left = anchor.left + Number.parseFloat(f.panel.style.left);
    assert.ok(left >= 16); assert.ok(left + panel.width <= width - 16);
    f.window.innerWidth = width + 120;
    for (const listener of f.windowListeners.get("resize")) listener();
    assert.ok(Number.isFinite(Number.parseFloat(f.panel.style.left)));
  }
});

test("settings terminology is French/Dutch and language updates retain choice, open state and radio focus", () => {
  const f = fixture({ saved: "vibrant-emotions" }), radio = f.element("chartPaletteVibrantEmotions");
  const previous = I18n.language();
  try {
    assert.equal(I18n.t("shell.settings.label", {}, "fr"), "Paramètres");
    assert.equal(I18n.t("shell.settings.label", {}, "nl"), "Instellingen");
    assert.equal(I18n.t("shell.settings.paletteClassic", {}, "fr"), "Classique");
    assert.equal(I18n.t("shell.settings.paletteClassic", {}, "nl"), "Klassiek");
    assert.equal(I18n.t("shell.settings.paletteDicoVibes", {}, "nl"), "Dico vibes");
    assert.equal(I18n.t("shell.settings.paletteVibrantEmotions", {}, "fr"), "Vibrant Emotions");
    assert.equal(I18n.t("shell.settings.paletteVibrantEmotions", {}, "nl"), "Vibrant Emotions");
    assert.match(I18n.t("shell.settings.chartPalette", {}, "nl"), /lijn- en vlakgrafieken/);
    f.menu.open = true; radio.focus(); I18n.setLanguage("nl"); f.dashboard.applyDashboardLanguage();
    assert.equal(f.menu.open, true); assert.equal(f.document.activeElement, radio); assert.equal(radio.checked, true);
    assert.equal(f.palette.current(), "vibrant-emotions"); assert.deepEqual(f.writes, []); assert.deepEqual(f.requests, []);
  } finally { I18n.setLanguage(previous); }
});

test("legacy monthly/cumulative/comparison lines recolour in place with stable people and unchanged source/pie colours", () => {
  const f = fixture(), data = lineData(), monthly = chartCanvas(f), cumulative = chartCanvas(f), comparison = chartCanvas(f);
  f.dashboard.state.selectedYears = new Set([2026]);
  const before = data.entries.map(entry => entry.color);
  f.dashboard.renderLineChart(monthly.canvas, data.project, data.entries);
  f.dashboard.renderLineChart(cumulative.canvas, data.project, data.entries, { cumulative: true });
  f.dashboard.renderPlannedActualChart(comparison.canvas, data.project, data.entries, data.plan);
  for (const chart of [monthly, cumulative, comparison]) {
    assert.ok(chart.colors.some(([, color]) => color === "#F89700"));
    assert.ok(chart.colors.some(([, color]) => color === "#CAC800")); chart.colors.length = 0;
  }
  f.palette.set("classic");
  for (const chart of [monthly, cumulative, comparison]) {
    assert.ok(chart.colors.some(([, color]) => color === "#f7909f"));
    assert.ok(chart.colors.some(([, color]) => color === "#e2647f"));
    assert.equal(chart.canvas.parentElement, f.root);
    chart.colors.length = 0;
  }
  f.palette.set("vibrant-emotions");
  for (const chart of [monthly, cumulative, comparison]) {
    assert.ok(chart.colors.some(([, color]) => color === "#FF5733"));
    assert.ok(chart.colors.some(([, color]) => color === "#C70039"));
    assert.equal(chart.canvas.parentElement, f.root);
  }
  assert.deepEqual(data.entries.map(entry => entry.color), before);
  assert.deepEqual(Array.from(f.dashboard.buildEmployeeColorMap(data.entries, data.plan).values()), before);
  const pie = chartCanvas(f); f.dashboard.renderPieChart(pie.canvas, data.entries);
  assert.ok(pie.colors.some(([, color]) => color === "#101010")); assert.ok(pie.colors.some(([, color]) => color === "#202020"));
  assert.deepEqual(f.requests, []); assert.deepEqual(f.renders, []);
});

test("legacy palette repaint retires detached canvases and keeps repeating assignments across filtering", () => {
  const f = fixture(), { project, entries } = lineData(), retired = chartCanvas(f), visible = chartCanvas(f);
  f.dashboard.state.selectedYears = new Set([2026]);
  f.dashboard.renderLineChart(retired.canvas, project, entries);
  f.dashboard.renderLineChart(visible.canvas, project, [entries[1]]);
  retired.canvas.isConnected = false; retired.colors.length = 0; visible.colors.length = 0;
  f.palette.set("classic");
  assert.equal(f.dashboard.legacyLineRepaints.has(retired.canvas), false); assert.deepEqual(retired.colors, []);
  assert.ok(visible.colors.some(([, color]) => color === "#e2647f"));
  for (let index = 2; index < 40; index++) f.dashboard.chartLineColor(`person-${index}`);
  assert.equal(f.dashboard.chartLineColor("person-20"), "#f7909f");
  f.palette.set("dico-vibes"); assert.equal(f.dashboard.chartLineColor("person-15"), "#F89700");
  f.palette.set("vibrant-emotions"); assert.equal(f.dashboard.chartLineColor("person-10"), "#FF5733");
});

test("legacy legend palette changes preserve mounted buttons, listeners, hidden-series choice and focus", () => {
  const f = fixture(), { entries } = lineData(), container = f.document.createElement("div");
  Object.defineProperty(container, "innerHTML", { set() { this.replaceChildren(); } });
  container.appendChild = child => container.append(child);
  const originalCreate = f.document.createElement;
  f.document.createElement = tag => {
    const node = originalCreate(tag);
    node.dataset = {};
    if (tag === "button") Object.defineProperty(node, "innerHTML", { set(value) {
      const key = /data-line-person-key="([^"]*)"/.exec(value)?.[1], color = /style="background:([^"]*)"/.exec(value)?.[1];
      const swatch = originalCreate("span"); swatch.setAttribute("data-line-person-key", key); swatch.style.backgroundColor = color;
      node.append(swatch);
    } });
    return node;
  };
  f.root.append(container); let toggles = 0;
  f.dashboard.renderLineLegend(container, entries, { hiddenSeries: new Set(["benoit source"]), onToggle() { toggles++; } });
  const [first, second] = container.children; first.focus();
  const swatches = container.querySelectorAll("[data-line-person-key]");
  assert.deepEqual(swatches.map(node => node.style.backgroundColor), ["#F89700", "#CAC800"]);
  f.palette.set("classic");
  assert.equal(container.children[0], first); assert.equal(container.children[1], second);
  assert.equal(f.document.activeElement, first); assert.equal(second.getAttribute("aria-pressed"), "false");
  assert.deepEqual(swatches.map(node => node.style.backgroundColor), ["#f7909f", "#e2647f"]);
  f.palette.set("vibrant-emotions");
  assert.equal(container.children[0], first); assert.equal(container.children[1], second);
  assert.equal(f.document.activeElement, first); assert.equal(second.getAttribute("aria-pressed"), "false");
  assert.deepEqual(swatches.map(node => node.style.backgroundColor), ["#FF5733", "#C70039"]);
  first.dispatch("click"); assert.equal(toggles, 1);
});
