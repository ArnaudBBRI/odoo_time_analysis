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
const storageKey = "odoo-time-analysis.mon-temps.layout";

function fixture({ width = 2200, saved = null, readError = false, writeError = false,
  media = "modern", storageUnavailable = false, projectController = false } = {}) {
  assert.ok(script); assert.equal(script.split(seam).length, 2);
  const root = domFixture(), document = root.ownerDocument, elements = new Map(), bindings = new Map();
  const queries = new Map(), windowListeners = new Map(), reads = [], writes = [], requests = [], renders = [], staticRenders = [];
  const projectRenders = [], projectLoads = [];
  const element = id => {
    if (!elements.has(id)) {
      const node = document.createElement(id === "personalTimeLayoutMode" ? "input" : "div");
      node.id = id; node.value = ""; node.checked = false; node.dataset = {};
      node.classList.toggle = (name, active) => active ? node.classList.add(name) : node.classList.remove(name);
      const add = node.addEventListener.bind(node);
      node.addEventListener = (name, listener) => {
        const key = `${id}:${name}`; bindings.set(key, (bindings.get(key) || 0) + 1); add(name, listener);
      };
      elements.set(id, node);
    }
    return elements.get(id);
  };
  document.getElementById = element;
  const storage = {
    getItem(key) { reads.push(key); if (readError) throw new Error("Storage denied"); return saved; },
    setItem(key, value) { writes.push([key, value]); if (writeError) throw new Error("Storage denied"); saved = value; }
  };
  const window = { innerWidth: width, fetch(url) { requests.push(url); throw new Error("No network is authorized in this layout test"); },
    DashboardLanguage: { applyStatic() { staticRenders.push(I18n.language()); } },
    addEventListener(name, listener) {
      if (!windowListeners.has(name)) windowListeners.set(name, new Set()); windowListeners.get(name).add(listener);
    } };
  if (storageUnavailable) Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage unavailable"); } });
  else window.localStorage = storage;
  if (projectController) {
    window.PersonalTime = require("../personal-time");
    window.ProjectBrowser = { render(container, options) {
      projectRenders.push({ options,
        mainWide: element("dashboardMain").getAttribute("data-project-hours-superwide"),
        hostWide: container.getAttribute("data-project-hours-superwide") });
      const detail = document.createElement("section");
      if (options.selectedId != null) {
        detail.setAttribute("data-selected-project", options.selectedId);
        detail.setAttribute("data-project-panel", options.panel);
      }
      container.replaceChildren(detail);
    }, cleanup() {} };
  }
  if (media !== "missing") window.matchMedia = query => {
    if (media === "throw") throw new Error("Media API unavailable");
    if (!queries.has(query)) {
      const threshold = Number(/min-width\s*:\s*(\d+)px/.exec(query)?.[1]);
      assert.ok(Number.isFinite(threshold), `Recognized width query: ${query}`);
      const listeners = new Set(), entry = { media: query, listeners, registrations: 0,
        get matches() { return window.innerWidth >= threshold; } };
      const add = (name, listener) => { assert.equal(name, "change"); entry.registrations++; listeners.add(listener); };
      if (media === "legacy") entry.addListener = listener => add("change", listener);
      else entry.addEventListener = add;
      queries.set(query, entry);
    }
    return queries.get(query);
  };
  const context = { window, document, DashboardI18n: I18n, renders, projectController, projectLoads, fetch: window.fetch };
  const instrumented = script.replace(seam, `
    const renderProjectController = renderPersonalProjects;
    render = () => globalThis.renders.push("full");
    renderYearFilters = () => globalThis.renders.push("years");
    renderPersonalTimeMacro = () => globalThis.renders.push("macro");
    renderProgrammes = () => globalThis.renders.push("programmes");
    renderPersonalProjects = () => {
      globalThis.renders.push("projects");
      if (globalThis.projectController) renderProjectController();
    };
    if (globalThis.projectController) {
      loadPersonalProjectHours = id => globalThis.projectLoads.push(["hours", id]);
      loadPersonalProjectFinance = id => globalThis.projectLoads.push(["budget", id]);
    }
    globalThis.dashboard = { state, els, initializePersonalTimeLayout, setPersonalTimeLayout,
      applyPersonalTimeLayout, applyDashboardLanguage, handleDashboardViewChange, renderChartsOnly,
      renderProjectController, choosePersonalProject, clearPersonalProject, setPersonalProjectView };
    return;
    ${seam}`);
  vm.runInNewContext(instrumented, context, { filename: "index.html" });
  const dashboard = context.dashboard;
  root.append(dashboard.els.personalTimeLayoutControl, dashboard.els.dashboardMain);
  dashboard.els.personalTimeLayoutControl.append(dashboard.els.personalTimeLayoutMode, dashboard.els.personalTimeLayoutStatus);
  dashboard.els.dashboardMain.append(dashboard.els.personalTimeMacro, dashboard.els.personalProjectsContent);
  dashboard.els.personalTimeMacro.append(dashboard.els.personalTimeRecommendations,
    dashboard.els.personalTimeCapacity, dashboard.els.personalTimeContent);
  const resize = next => {
    const previous = new Map([...queries].map(([key, query]) => [key, query.matches]));
    window.innerWidth = next;
    for (const [key, query] of queries) if (query.matches !== previous.get(key)) {
      for (const listener of [...query.listeners]) listener({ matches: query.matches, media: key });
    }
    for (const listener of windowListeners.get("resize") || []) listener({ type: "resize" });
  };
  const active = () => [dashboard.els.dashboardMain, dashboard.els.personalTimeMacro]
    .map(node => node.getAttribute("data-personal-superwide") === "true");
  const projectActive = () => [dashboard.els.dashboardMain, dashboard.els.personalProjectsContent]
    .map(node => node.getAttribute("data-project-hours-superwide") === "true");
  return { dashboard, root, document, element, queries, windowListeners, window, resize, active,
    projectActive, projectRenders, projectLoads, reads, writes, requests, renders, staticRenders, bindings };
}

function populatePersonalProjects(f) {
  const data = { ok: true, employee: { ids: [7], resourceIds: [17] },
    projects: [{ id: 11, name: "Source project", startDate: "2026-01-01", endDate: "2027-12-31" }],
    timesheets: { lines: [{ projectId: 11, employeeId: 7, date: "2026-05-01", hours: 12 }] },
    planning: { ok: true, slots: [] } };
  f.dashboard.state.personalTimeResult = data;
  f.dashboard.state.selectedYears = new Set([2026]);
  f.dashboard.state.dashboardView = "projects";
  return data;
}

test("the binary layout switch lives in the top bar and uses native checkbox semantics", () => {
  const header = html.match(/<header class="app-header">([\s\S]*?)<\/header>/)?.[1];
  assert.ok(header);
  assert.match(header, /id="personalTimeLayoutControl"/);
  const input = header.match(/<input\b[^>]*\bid="personalTimeLayoutMode"[^>]*>/)?.[0];
  assert.ok(input, "The existing layout control ID belongs to a native header input");
  assert.match(input, /\btype="checkbox"/);
  assert.match(input, /\brole="switch"/);
  assert.match(input, /\baria-label="[^"]+"/);
  assert.match(input, /\bdata-i18n-aria-label="personal\.layout\.switchLabel"/);
  assert.match(input, /\baria-describedby="personalTimeLayoutStatus"/);
  assert.equal((html.match(/\bid="personalTimeLayoutMode"/g) || []).length, 1);
  assert.equal((html.match(/\bid="personalTimeLayoutControl"/g) || []).length, 1);
});

test("personal layout defaults to Normal and initializes its switch and width listener once", () => {
  const f = fixture();
  f.dashboard.initializePersonalTimeLayout();
  assert.equal(f.dashboard.state.personalTimeLayout, "standard");
  assert.equal(f.dashboard.els.personalTimeLayoutMode.checked, false);
  assert.equal(f.dashboard.els.personalTimeLayoutControl.hidden, false);
  assert.deepEqual(f.active(), [false, false]);
  assert.equal(f.dashboard.els.personalTimeLayoutStatus.textContent, "Vue verticale habituelle.");
  assert.deepEqual(f.reads, [storageKey]); assert.deepEqual(f.writes, []);
  assert.equal(f.bindings.get("personalTimeLayoutMode:change"), 1);
  assert.equal(f.queries.size, 1);
  assert.ok([...f.queries.values()].every(query => query.registrations === 1 && query.listeners.size === 1));
  f.dashboard.setPersonalTimeLayout("wide");
  f.dashboard.initializePersonalTimeLayout();
  assert.equal(f.dashboard.state.personalTimeLayout, "wide");
  assert.deepEqual(f.reads, [storageKey]);
  assert.equal(f.bindings.get("personalTimeLayoutMode:change"), 1);
  assert.ok([...f.queries.values()].every(query => query.registrations === 1));
});

test("Wide uses an inclusive 1600 CSS-pixel boundary and retains the checked choice below that width", () => {
  const f = fixture({ width: 1599 }); f.dashboard.initializePersonalTimeLayout();
  f.dashboard.setPersonalTimeLayout("wide"); assert.deepEqual(f.active(), [false, false]);
  assert.equal(f.dashboard.els.personalTimeLayoutMode.checked, true);
  assert.match(f.dashboard.els.personalTimeLayoutStatus.textContent, /^Quatre colonnes dès /);
  f.resize(1600); assert.deepEqual(f.active(), [true, true]);
  assert.equal(f.dashboard.els.personalTimeLayoutStatus.textContent, "Quatre colonnes actives.");
  f.resize(1599); assert.deepEqual(f.active(), [false, false]);
  assert.equal(f.dashboard.state.personalTimeLayout, "wide");
  assert.equal(f.dashboard.els.personalTimeLayoutMode.checked, true);
  f.resize(1999); assert.deepEqual(f.active(), [true, true]);
  f.resize(2000); assert.deepEqual(f.active(), [true, true]);
  f.resize(3000); assert.deepEqual(f.active(), [true, true]);
  f.dashboard.setPersonalTimeLayout("standard"); assert.deepEqual(f.active(), [false, false]);
  assert.equal(f.dashboard.els.personalTimeLayoutMode.checked, false);
  f.resize(320); f.resize(3000); assert.deepEqual(f.active(), [false, false]);
  assert.deepEqual(f.renders, []); assert.deepEqual(f.requests, []);
});

test("binary preferences restore, legacy Automatic migrates without a write, and native changes persist checked state", () => {
  for (const saved of ["standard", "wide", "auto", null, "", "superwide", "WIDE", " wide ", '{"layout":"wide"}']) {
    const f = fixture({ saved }); f.dashboard.initializePersonalTimeLayout();
    const expected = ["wide", "auto"].includes(saved) ? "wide" : "standard";
    assert.equal(f.dashboard.state.personalTimeLayout, expected);
    assert.equal(f.dashboard.els.personalTimeLayoutMode.checked, expected === "wide");
    assert.deepEqual(f.writes, [], "Restoring a legacy value changes only in-memory presentation");
    assert.deepEqual(f.reads, [storageKey]); assert.deepEqual(f.requests, []);
  }
  const migrated = fixture({ saved: "auto", width: 1800 }); migrated.dashboard.initializePersonalTimeLayout();
  assert.deepEqual(migrated.active(), [true, true], "Legacy Automatic now follows Wide's single 1600px threshold");
  migrated.resize(1599);
  assert.equal(migrated.dashboard.els.personalTimeLayoutMode.checked, true);
  assert.deepEqual(migrated.active(), [false, false]); assert.deepEqual(migrated.writes, []);
  const f = fixture(); f.dashboard.initializePersonalTimeLayout();
  const toggle = f.dashboard.els.personalTimeLayoutMode;
  toggle.focus(); toggle.checked = true; toggle.value = "standard"; toggle.dispatch("change");
  assert.equal(f.dashboard.state.personalTimeLayout, "wide");
  assert.equal(f.document.activeElement, toggle);
  toggle.checked = false; toggle.value = "wide"; toggle.dispatch("change");
  assert.equal(f.dashboard.state.personalTimeLayout, "standard");
  assert.equal(f.document.activeElement, toggle);
  f.dashboard.setPersonalTimeLayout("wide");
  const expectedWrites = [[storageKey, "wide"], [storageKey, "standard"], [storageKey, "wide"]];
  assert.deepEqual(f.writes, expectedWrites);
  for (const invalid of [null, undefined, false, true, 1, "", "auto", "wide ", "WIDE", "superwide", {}, ["wide"]]) {
    f.dashboard.setPersonalTimeLayout(invalid);
    assert.equal(f.dashboard.state.personalTimeLayout, "wide");
    assert.equal(toggle.checked, true);
  }
  assert.deepEqual(f.writes, expectedWrites);
  assert.deepEqual(f.renders, []); assert.deepEqual(f.requests, []);
});

test("blocked preference reads or writes keep layout usable without network or configuration access", () => {
  for (const options of [{ readError: true }, { storageUnavailable: true }]) {
    const f = fixture(options);
    assert.doesNotThrow(() => f.dashboard.initializePersonalTimeLayout());
    assert.equal(f.dashboard.state.personalTimeLayout, "standard");
    assert.doesNotThrow(() => f.dashboard.setPersonalTimeLayout("wide"));
    assert.equal(f.dashboard.state.personalTimeLayout, "wide");
    assert.deepEqual(f.active(), [true, true]); assert.deepEqual(f.requests, []);
  }
  const f = fixture({ writeError: true }); f.dashboard.initializePersonalTimeLayout();
  assert.doesNotThrow(() => f.dashboard.setPersonalTimeLayout("wide"));
  assert.equal(f.dashboard.state.personalTimeLayout, "wide"); assert.deepEqual(f.active(), [true, true]);
  assert.deepEqual(f.writes, [[storageKey, "wide"]]);
});

test("unsupported navigation keeps the switch visible and the shared choice while retaining normal layout", () => {
  const f = fixture({ saved: "wide" }); f.dashboard.initializePersonalTimeLayout();
  assert.deepEqual(f.active(), [true, true]);
  assert.equal(f.dashboard.els.personalTimeLayoutControl.hidden, false);
  for (const view of ["projects", "unit-dico", "programmes", "unit"]) {
    f.dashboard.state.dashboardView = view; f.dashboard.applyPersonalTimeLayout();
    assert.deepEqual(f.active(), [false, false]);
    assert.equal(f.dashboard.els.personalTimeLayoutControl.hidden, false);
    assert.equal(f.dashboard.els.personalTimeLayoutMode.checked, true);
    assert.equal(f.dashboard.state.personalTimeLayout, "wide");
  }
  f.dashboard.handleDashboardViewChange({ detail: { view: "time" } });
  assert.deepEqual(f.active(), [true, true]);
  assert.equal(f.dashboard.els.personalTimeLayoutControl.hidden, false);
  f.dashboard.handleDashboardViewChange({ detail: { view: "projects" } });
  assert.deepEqual(f.active(), [false, false]);
  assert.equal(f.dashboard.els.personalTimeLayoutControl.hidden, false);
  assert.deepEqual(f.writes, []); assert.deepEqual(f.requests, []);
});

test("French and Dutch language repaint preserves the checked layout switch and translates Normal and Wide", () => {
  const f = fixture({ saved: "wide" }); f.dashboard.initializePersonalTimeLayout();
  const toggle = f.dashboard.els.personalTimeLayoutMode; toggle.focus();
  try {
    for (const [language, activeHint, waitingHint, normalLabel, wideLabel, accessibleLabel] of [
      ["fr", "Quatre colonnes actives.", /^Quatre colonnes dès /, "Normal", "Large", "Affichage large"],
      ["nl", "Vier kolommen actief.", /^Vier kolommen vanaf /, "Normaal", "Breed", "Brede weergave"]
    ]) {
      I18n.setLanguage(language); f.resize(2200); f.dashboard.applyDashboardLanguage();
      assert.equal(f.dashboard.els.personalTimeLayoutStatus.textContent, activeHint);
      assert.equal(f.dashboard.state.personalTimeLayout, "wide"); assert.equal(toggle.checked, true);
      assert.equal(f.document.activeElement, toggle); assert.deepEqual(f.active(), [true, true]);
      f.resize(1599); assert.match(f.dashboard.els.personalTimeLayoutStatus.textContent, waitingHint);
      assert.equal(toggle.checked, true);
      assert.equal(I18n.t("personal.layout.standard"), normalLabel);
      assert.equal(I18n.t("personal.layout.wide"), wideLabel);
      assert.equal(I18n.t("personal.layout.switchLabel"), accessibleLabel);
    }
    assert.deepEqual(f.staticRenders, ["fr", "nl"]);
    assert.deepEqual(f.renders, ["years", "macro", "programmes", "projects", "years", "macro", "programmes", "projects"]);
    assert.deepEqual(f.requests, []); assert.deepEqual(f.writes, []);
  } finally { I18n.setLanguage("fr"); }
});

test("layout and width changes preserve live controls, cached evidence, visibility and calculation state", () => {
  const f = fixture(), { state, els } = f.dashboard;
  const data = { employee: { ids: [7], resourceIds: [17] }, projects: [{ id: 1, name: "Source project" }],
    timesheets: { lines: [{ projectId: 1, employeeId: 7, hours: 12 }] } };
  state.personalTimeResult = data; state.personalTimeRecommendationTolerance = 27;
  state.hiddenPersonalProjects.add("1"); state.selectedYears = new Set([2025, 2026]);
  state.customDateRange = { startDate: "2026-06-01", endDate: "2026-09-30" };
  const cache = { result: { fixture: "unchanged" } }; state.personalCapacityCache.set("[2026]", cache);
  const original = structuredClone(data), scope = state.customDateRange, hidden = state.hiddenPersonalProjects;
  const slider = f.document.createElement("input"); slider.value = "27";
  const details = f.document.createElement("details"); details.open = true;
  const summary = f.document.createElement("summary"); details.append(summary);
  els.personalTimeRecommendations.append(slider); els.personalTimeCapacity.append(details);
  const pie = f.document.createElement("svg"); els.personalTimeContent.append(pie);
  f.dashboard.initializePersonalTimeLayout(); slider.focus();
  for (const mode of ["wide", "standard", "wide", "standard"]) {
    f.dashboard.setPersonalTimeLayout(mode); f.resize(1599); f.resize(2200);
    assert.equal(f.document.activeElement, slider); assert.equal(slider.value, "27");
    assert.equal(els.personalTimeRecommendations.children[0], slider);
    assert.equal(els.personalTimeCapacity.children[0], details); assert.equal(details.open, true);
    assert.equal(els.personalTimeContent.children[0], pie);
    assert.equal(state.personalTimeResult, data); assert.deepEqual(data, original);
    assert.equal(state.personalCapacityCache.get("[2026]"), cache);
    assert.equal(state.customDateRange, scope); assert.equal(state.hiddenPersonalProjects, hidden);
    assert.deepEqual([...hidden], ["1"]); assert.deepEqual([...state.selectedYears], [2025, 2026]);
    assert.equal(state.personalTimeRecommendationTolerance, 27);
  }
  assert.deepEqual(f.renders, []); assert.deepEqual(f.requests, []);
});

test("legacy or unavailable media APIs use viewport changes without duplicate initialization", () => {
  for (const media of ["legacy", "missing", "throw"]) {
    const f = fixture({ media, width: 1599, saved: "wide" });
    f.dashboard.initializePersonalTimeLayout(); f.dashboard.initializePersonalTimeLayout();
    assert.deepEqual(f.active(), [false, false]);
    f.resize(1600); assert.deepEqual(f.active(), [true, true]);
    f.resize(1599); assert.deepEqual(f.active(), [false, false]);
    assert.equal(f.bindings.get("personalTimeLayoutMode:change"), 1);
    if (media === "legacy") assert.ok([...f.queries.values()].every(query => query.registrations === 1));
    else assert.equal(f.windowListeners.get("resize")?.size, 1);
    assert.deepEqual(f.renders, []); assert.deepEqual(f.requests, []);
  }
});

test("the existing debounced chart-resize path does not rebuild loaded personal Mon temps", () => {
  const f = fixture({ saved: "wide" }); f.dashboard.initializePersonalTimeLayout();
  f.dashboard.state.personalTimeResult = { projects: [], employee: { ids: [7], resourceIds: [] } };
  f.dashboard.state.employee = { type: "employee", source: "api", months: [], rows: [], lines: [] };
  f.resize(1599); f.dashboard.renderChartsOnly(); f.resize(1600); f.dashboard.renderChartsOnly();
  assert.deepEqual(f.renders, [], "Responsive personal SVG layout must not run the legacy full dashboard renderer");
  assert.deepEqual(f.requests, []);
  f.dashboard.state.personalTimeResult = null;
  f.dashboard.renderChartsOnly();
  assert.deepEqual(f.renders, ["full"], "Legacy canvas resize keeps its existing rendering path");
});

test("the shared layout switch stays visible while wide layout activates only in Mon temps or selected personal Hours", () => {
  const f = fixture({ saved: "wide" }), { state, els } = f.dashboard;
  f.dashboard.initializePersonalTimeLayout();
  assert.deepEqual(f.active(), [true, true]); assert.deepEqual(f.projectActive(), [false, false]);
  state.dashboardView = "projects"; f.dashboard.applyPersonalTimeLayout();
  assert.equal(els.personalTimeLayoutControl.hidden, false);
  state.selectedPersonalProjectId = 11; f.dashboard.applyPersonalTimeLayout();
  assert.equal(els.personalTimeLayoutControl.hidden, false);
  assert.deepEqual(f.active(), [false, false]); assert.deepEqual(f.projectActive(), [true, true]);
  state.personalProjectView.set("11", "budget"); f.dashboard.applyPersonalTimeLayout();
  assert.equal(els.personalTimeLayoutControl.hidden, false);
  assert.deepEqual(f.projectActive(), [false, false]);
  state.personalProjectView.set("11", "hours");
  for (const view of ["unit-dico", "programmes", "unit"]) {
    state.dashboardView = view; state.selectedUnitProjectId = 11; state.selectedProgrammeProjectId = 11;
    f.dashboard.applyPersonalTimeLayout();
    assert.equal(els.personalTimeLayoutControl.hidden, false);
    assert.deepEqual(f.active(), [false, false]); assert.deepEqual(f.projectActive(), [false, false]);
  }
  state.dashboardView = "projects"; f.dashboard.applyPersonalTimeLayout(); f.resize(1599);
  assert.equal(els.personalTimeLayoutControl.hidden, false); assert.equal(els.personalTimeLayoutMode.checked, true);
  assert.deepEqual(f.projectActive(), [false, false]);
  f.resize(1600); assert.deepEqual(f.projectActive(), [true, true]);
  f.dashboard.setPersonalTimeLayout("standard"); assert.deepEqual(f.projectActive(), [false, false]);
  state.dashboardView = "time"; f.dashboard.applyPersonalTimeLayout();
  assert.equal(els.personalTimeLayoutMode.checked, false); assert.deepEqual(f.active(), [false, false]);
  assert.deepEqual(f.writes, [[storageKey, "standard"]]); assert.deepEqual(f.requests, []);
});

test("every unsupported view retains an enabled shared switch with a neutral localized hint and no layout side effects", () => {
  const f = fixture({ saved: "wide" }), { state, els } = f.dashboard;
  f.dashboard.initializePersonalTimeLayout();
  const toggle = els.personalTimeLayoutMode; toggle.focus();
  const source = { fixture: "unchanged source" }, cached = { fixture: "unchanged cached hours" };
  state.personalTimeResult = source; state.personalProjectHoursCache.set("11", cached);
  const controlClass = els.personalTimeLayoutControl.className;
  try {
    for (const [language, hint] of [
      ["fr", "Affichage large pas encore disponible dans cette vue."],
      ["nl", "Brede weergave is nog niet beschikbaar in deze weergave."]
    ]) {
      I18n.setLanguage(language);
      for (const [view, selected, panel] of [["projects", null, "hours"], ["projects", 11, "budget"],
        ["unit-dico", 11, "hours"], ["programmes", 11, "hours"], ["unit", 11, "hours"]]) {
        state.dashboardView = view; state.selectedPersonalProjectId = selected;
        state.selectedUnitProjectId = 11; state.selectedProgrammeProjectId = 11;
        state.personalProjectView.set("11", panel); f.dashboard.applyPersonalTimeLayout();
        assert.equal(els.personalTimeLayoutControl.hidden, false);
        assert.equal(els.personalTimeLayoutControl.className, controlClass);
        assert.notEqual(toggle.disabled, true); assert.notEqual(toggle.getAttribute("aria-disabled"), "true");
        assert.notEqual(toggle.getAttribute("tabindex"), "-1"); assert.equal(f.document.activeElement, toggle);
        assert.equal(toggle.checked, true); assert.equal(els.personalTimeLayoutStatus.textContent, hint);
        assert.deepEqual(f.active(), [false, false]); assert.deepEqual(f.projectActive(), [false, false]);
        f.resize(1599); assert.equal(els.personalTimeLayoutStatus.textContent, hint);
        toggle.checked = false; toggle.dispatch("change");
        assert.equal(state.personalTimeLayout, "standard");
        assert.equal(els.personalTimeLayoutStatus.textContent, I18n.t("personal.layout.standardHint"));
        toggle.checked = true; toggle.dispatch("change");
        assert.equal(state.personalTimeLayout, "wide"); assert.equal(els.personalTimeLayoutStatus.textContent, hint);
        assert.equal(f.document.activeElement, toggle);
        assert.deepEqual(f.active(), [false, false]); assert.deepEqual(f.projectActive(), [false, false]);
        f.resize(2200);
      }
    }
    state.dashboardView = "time"; f.dashboard.applyPersonalTimeLayout();
    assert.deepEqual(f.active(), [true, true]); assert.deepEqual(f.projectActive(), [false, false]);
    state.dashboardView = "projects"; state.selectedPersonalProjectId = 11; state.personalProjectView.set("11", "hours");
    f.dashboard.applyPersonalTimeLayout();
    assert.deepEqual(f.active(), [false, false]); assert.deepEqual(f.projectActive(), [true, true]);
    assert.equal(state.personalTimeResult, source); assert.equal(state.personalProjectHoursCache.get("11"), cached);
    assert.deepEqual(f.renders, []); assert.deepEqual(f.requests, []); assert.deepEqual(f.reads, [storageKey]);
    assert.equal(f.writes.length, 20);
    assert.ok(f.writes.every(([key, mode]) => key === storageKey && ["standard", "wide"].includes(mode)));
  } finally { I18n.setLanguage("fr"); }
});

test("project Hours status uses its own French and Dutch context with the same retained preference", () => {
  const f = fixture({ saved: "wide" }), { state, els } = f.dashboard;
  state.dashboardView = "projects"; state.selectedPersonalProjectId = 11;
  f.dashboard.initializePersonalTimeLayout(); els.personalTimeLayoutMode.focus();
  try {
    for (const language of ["fr", "nl"]) {
      I18n.setLanguage(language); f.resize(2200); f.dashboard.applyDashboardLanguage();
      const activeText = I18n.t("project.layout.wideActive");
      assert.notEqual(activeText, "project.layout.wideActive", "Project-specific status is registered in each supported language");
      assert.notEqual(activeText, I18n.t("personal.layout.wideActive"));
      assert.equal(els.personalTimeLayoutStatus.textContent, activeText);
      f.resize(1599);
      assert.equal(els.personalTimeLayoutStatus.textContent,
        I18n.t("project.layout.wideHint", { width: I18n.formatNumber(1600) }));
      assert.equal(els.personalTimeLayoutMode.checked, true);
      assert.equal(f.document.activeElement, els.personalTimeLayoutMode);
      state.dashboardView = "time"; f.resize(2200); f.dashboard.applyPersonalTimeLayout();
      assert.equal(els.personalTimeLayoutStatus.textContent, I18n.t("personal.layout.wideActive"));
      state.dashboardView = "projects"; f.dashboard.applyPersonalTimeLayout();
    }
    f.dashboard.setPersonalTimeLayout("standard");
    assert.equal(els.personalTimeLayoutStatus.textContent, I18n.t("personal.layout.standardHint"));
    assert.deepEqual(f.requests, []);
  } finally { I18n.setLanguage("fr"); }
});

test("project selection, Hours or Budget navigation, Back and invalidated scope update layout before and after mounting", () => {
  const f = fixture({ saved: "wide", projectController: true }), { state, els } = f.dashboard;
  const data = populatePersonalProjects(f);
  f.dashboard.initializePersonalTimeLayout(); f.dashboard.renderProjectController();
  assert.equal(els.personalTimeLayoutControl.hidden, false);
  f.dashboard.choosePersonalProject(11);
  assert.equal(state.selectedPersonalProjectId, 11);
  assert.deepEqual(f.projectActive(), [true, true]);
  assert.equal(els.personalTimeLayoutControl.hidden, false);
  assert.equal(f.projectRenders.at(-1).mainWide, "true");
  assert.equal(f.projectRenders.at(-1).hostWide, "true", "Initial chart measurement sees the effective wide flag");
  assert.equal(els.personalProjectsContent.querySelectorAll('[data-project-panel="hours"]').length, 1);
  f.dashboard.setPersonalProjectView("budget");
  assert.equal(els.personalTimeLayoutControl.hidden, false); assert.deepEqual(f.projectActive(), [false, false]);
  assert.equal(f.projectRenders.at(-1).options.panel, "budget"); assert.equal(f.projectRenders.at(-1).hostWide, "false");
  f.dashboard.setPersonalProjectView("hours");
  assert.equal(els.personalTimeLayoutControl.hidden, false); assert.deepEqual(f.projectActive(), [true, true]);
  f.dashboard.clearPersonalProject();
  assert.equal(state.selectedPersonalProjectId, null); assert.equal(els.personalTimeLayoutControl.hidden, false);
  assert.deepEqual(f.projectActive(), [false, false]);
  f.dashboard.choosePersonalProject(11);
  data.timesheets.lines = []; f.dashboard.renderProjectController();
  assert.equal(state.selectedPersonalProjectId, null, "A scope with no included projects cannot leave a stale wide detail selected");
  assert.equal(els.personalTimeLayoutControl.hidden, false); assert.deepEqual(f.projectActive(), [false, false]);
  assert.deepEqual(f.projectLoads.map(row => Array.from(row)), [["hours", 11], ["budget", 11], ["hours", 11], ["hours", 11]]);
  assert.deepEqual(f.writes, []); assert.deepEqual(f.requests, []);
});

test("project layout changes preserve mounted controls, open details, source data and caches without rendering or loading", () => {
  const f = fixture({ saved: "wide", projectController: true }), { state, els } = f.dashboard;
  const data = populatePersonalProjects(f), original = structuredClone(data);
  f.dashboard.initializePersonalTimeLayout(); f.dashboard.choosePersonalProject(11);
  const detail = els.personalProjectsContent.children[0], disclosure = f.document.createElement("details"); disclosure.open = true;
  const focus = f.document.createElement("button"); focus.setAttribute("data-monthly-month", "2026-05");
  disclosure.append(focus); detail.append(disclosure); focus.focus();
  const hours = { result: { fixture: "unchanged hours" } }, finance = { result: { fixture: "unchanged finance" } };
  state.personalProjectHoursCache.set("11", hours); state.personalProjectFinanceCache.set("11", finance);
  state.personalProjectMonthlyMode.set("11", "cumulative");
  state.personalProjectMonthlyEmployee.set("11", "employee:7");
  state.personalProjectPlannedMonthlyEmployee.set("11", "employee:8");
  const ignored = new Set(["employee:9"]); state.personalProjectIgnoredEmployees.set("11", ignored);
  const renderCount = f.projectRenders.length, loadCount = f.projectLoads.length, calls = [...f.renders];
  for (const mode of ["standard", "wide", "standard", "wide"]) {
    f.dashboard.setPersonalTimeLayout(mode); f.resize(1599); f.resize(2200);
    assert.equal(els.personalProjectsContent.children[0], detail); assert.equal(disclosure.open, true);
    assert.equal(f.document.activeElement, focus); assert.equal(state.personalTimeResult, data); assert.deepEqual(data, original);
    assert.equal(state.personalProjectHoursCache.get("11"), hours); assert.equal(state.personalProjectFinanceCache.get("11"), finance);
    assert.equal(state.personalProjectIgnoredEmployees.get("11"), ignored);
    assert.equal(state.personalProjectMonthlyMode.get("11"), "cumulative");
    assert.equal(state.personalProjectMonthlyEmployee.get("11"), "employee:7");
    assert.equal(state.personalProjectPlannedMonthlyEmployee.get("11"), "employee:8");
  }
  assert.equal(f.projectRenders.length, renderCount); assert.equal(f.projectLoads.length, loadCount);
  assert.deepEqual(f.renders, calls); assert.deepEqual(f.requests, []);
});

test("project resize skips legacy rendering only for a meaningfully mounted selected personal Hours panel", () => {
  const f = fixture({ saved: "wide", projectController: true }), { state, els } = f.dashboard;
  populatePersonalProjects(f); f.dashboard.initializePersonalTimeLayout(); f.dashboard.choosePersonalProject(11);
  state.employee = { type: "employee", source: "api", months: [], rows: [], lines: [] };
  const baseline = [...f.renders];
  f.resize(1599); f.dashboard.renderChartsOnly(); f.resize(1600); f.dashboard.renderChartsOnly();
  assert.deepEqual(f.renders, baseline, "Mounted project SVG content retains its host, focus and disclosure state");
  els.personalProjectsContent.replaceChildren(); f.dashboard.renderChartsOnly();
  assert.equal(f.renders.at(-1), "full", "A state-only selection cannot suppress an unmounted legacy view");
  const staleHours = f.document.createElement("section"); staleHours.setAttribute("data-project-panel", "hours");
  els.personalProjectsContent.append(staleHours);
  for (const [view, selected, panel] of [["projects", 11, "budget"], ["projects", null, "hours"],
    ["unit-dico", 11, "hours"], ["programmes", 11, "hours"]]) {
    state.dashboardView = view; state.selectedPersonalProjectId = selected; state.personalProjectView.set("11", panel);
    const before = f.renders.length; f.dashboard.renderChartsOnly();
    assert.equal(f.renders.length, before + 1); assert.equal(f.renders.at(-1), "full");
  }
  assert.deepEqual(f.requests, []);
});
