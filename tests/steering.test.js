const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../steering");
const service = require("../steering-service");
const UI = require("../steering-client");
const I18n = require("../i18n");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { domFixture } = require("./dom-fixture");
const { fixtureRpc, config } = require("./steering-fixture");

async function loadNavigation(metadata, { allowHTML = false } = {}) {
  const root = domFixture(), document = root.ownerDocument, elements = new Map(), requests = [], events = [];
  const element = id => {
    if (!elements.has(id)) { const value = document.createElement("div"); value.value = ""; value.disabled = false;
      value.removeAttribute = name => value.attributes.delete(name);
      if (allowHTML) { let html = ""; Object.defineProperty(value, "innerHTML", { get: () => html, set: next => { html = String(next); } }); }
      elements.set(id, value); }
    return elements.get(id);
  };
  const buttons = ["time", "projects", "unit-dico", "programmes", "unit"].map(view => {
    const button = element(`view-${view}`); button.dataset = { view }; button.setAttribute("data-view", view); return button;
  });
  element("page-title").textContent = "Tableau de bord Odoo"; element("page-subtitle").textContent = "Suivi des heures";
  document.getElementById = element;
  document.querySelector = selector => selector === "header h1" ? element("page-title") : selector === "header .subtitle" ? element("page-subtitle") : null;
  document.querySelectorAll = selector => {
    if (!selector.startsWith("#pilotage-nav [data-view]")) return [];
    const excluded = [...selector.matchAll(/:not\(\[data-view=["']?([^\]"']+)["']?\]\)/g)].map(match => match[1]);
    return buttons.filter(button => !excluded.includes(button.dataset.view));
  };
  const localeListeners = new Map();
  const context = { document, window: { SteeringMetrics: S, DashboardI18n: I18n,
    addEventListener(name, callback) { localeListeners.set(name, callback); },
    dispatchEvent(event) { events.push(event); localeListeners.get(event.type)?.(event); } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    async fetch(url, options) {
      requests.push({ url, options }); assert.equal(url, "/api/odoo/pilotage/metadata", "Independent programme navigation must not fetch legacy steering data");
      return { ok: true, status: 200, json: async () => metadata };
    }
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "steering-client.js"), "utf8");
  const seam = 'post("metadata").then'; assert.equal(source.split(seam).length, 2);
  vm.runInNewContext(source.replace(seam, `globalThis.navigation = { state, setView };\n${seam}`), context, { filename: "steering-client.js" });
  await new Promise(setImmediate);
  return { ...context.navigation, elements, buttons, requests, events, document,
    languageChange: () => localeListeners.get("dashboard:languagechange")?.({ type: "dashboard:languagechange" }) };
}

test("Programmes remains enabled when the legacy steering unit configuration is unavailable", async () => {
  const navigation = await loadNavigation({ ok: true, enabled: false, leader: { available: false } });
  assert.equal(navigation.buttons.find(button => button.dataset.view === "programmes").disabled, false);
  assert.equal(navigation.buttons.find(button => button.dataset.view === "unit").disabled, true,
    "The unconfigured legacy unit view remains gated independently");
  navigation.setView("programmes");
  assert.equal(navigation.state.view, "programmes"); assert.equal(navigation.elements.get("programmes-view").hidden, false);
  for (const id of ["time-view", "personal-projects-view", "unit-dico-view", "pilotage-view"]) assert.equal(navigation.elements.get(id).hidden, true, id);
  assert.equal(navigation.buttons.find(button => button.dataset.view === "programmes").getAttribute("aria-current"), "page");
  assert.equal(navigation.document.title, "Programmes · Tableau de bord Odoo"); assert.equal(navigation.events.at(-1).detail.view, "programmes");
  assert.equal(navigation.requests.length, 1, "Programme photos are handled by their dedicated controller rather than the old portfolio");
});

test("returning from Programmes restores personal hosts and clears its navigation selection", async () => {
  const navigation = await loadNavigation({ ok: true, enabled: false, leader: { available: false } });
  navigation.setView("programmes"); navigation.setView("projects");
  assert.equal(navigation.elements.get("programmes-view").hidden, true); assert.equal(navigation.elements.get("personal-projects-view").hidden, false);
  assert.equal(navigation.elements.get("pilotage-view").hidden, true);
  assert.equal(navigation.buttons.find(button => button.dataset.view === "programmes").getAttribute("aria-current"), null);
  assert.equal(navigation.buttons.find(button => button.dataset.view === "projects").getAttribute("aria-current"), "page");
  assert.equal(navigation.events.at(-1).detail.view, "projects"); assert.equal(navigation.requests.length, 1);
});

test("scoped portfolio preserves actual authority, nulls, leader identity and zero-hour projects", async () => {
  const rpc = fixtureRpc(), result = await service.load(config, rpc, 7);
  assert.equal(result.projects.length, 2);
  const p = result.projects[0];
  assert.equal(p.hours.actual, 120); assert.equal(p.hours.remainingConvention, -20); assert.equal(p.hours.remainingPlan, -40);
  assert.equal(p.isLeader, true); assert.equal(result.projects[1].isLeader, false);
  assert.equal(p.hours.horizonCoversEnd, false);
  assert.equal(result.projects[1].hours.convention, 0);
  assert.equal(result.unitSummary.metrics.actual.value, 120);
  assert.equal(result.programmeSummaries[0].metrics.actual.value, 120);
  const projectRead = rpc.calls.find(call => call.model === "project.project" && call.method === "search_read");
  assert.deepEqual(projectRead.domain, config.unitDomain);
  for (const call of rpc.calls.filter(call => call.method === "search_read" && !["project.project", "budget.line"].includes(call.model))) assert.deepEqual(call.domain, [["project_id", "in", [11, 12]]]);
  assert.ok(!rpc.calls.some(call => call.model === "account.analytic.line" || call.method === "read_group"));
});

test("no collection before confirmed scope; unknown and dotted scope fields fail closed", async () => {
  const rpc = fixtureRpc();
  const disabled = await service.load({}, rpc, 7);
  assert.equal(disabled.enabled, false); assert.equal(rpc.calls.filter(c => c.method !== "fields_get").length, 0);
  assert.equal((await service.metadata({ ...config, unitDomain: [["unknown", "=", 4]] }, rpc)).enabled, false);
  assert.equal((await service.metadata({ ...config, unitDomain: [["x_unit_id.name", "in", ["DiCo"]]] }, rpc)).enabled, true);
  assert.equal((await service.metadata({ ...config, unitDomain: ["|", ["x_unit_id", "=", 4]] }, rpc)).enabled, false);
});

test("detail distinguishes partial timesheets from reconciled Progress and gates WP", async () => {
  const rpc = fixtureRpc(), result = await service.load(config, rpc, 7, 11), p = result.project;
  assert.equal(p.diagnostic.visibleActual, 30); assert.equal(p.diagnostic.visibleCoverage, 25);
  assert.equal(p.diagnostic.progressStatus, "reconciled"); assert.equal(p.people[0].actual, 120);
  assert.equal(p.workPackages.status, "available"); assert.equal(p.workPackages.rows[0].convention, 100);
  const groups = rpc.calls.filter(call => call.method === "read_group");
  assert.equal(groups.length, 2);
  for (const call of groups) {
    assert.equal(call.model, S.PROGRESS_MODEL); assert.deepEqual(call.domain, [["project_id", "in", [11]]]);
    assert.deepEqual(call.kwargs.fields, ["effective_hours:sum", "allocated_hours:sum", "convention_time:sum"]);
    assert.equal(call.kwargs.lazy, false);
    assert.ok(!JSON.stringify(call).includes("cost"));
  }
  const divergent = (await service.load(config, fixtureRpc({ divergent: true }), 7, 11)).project;
  assert.equal(divergent.diagnostic.progressStatus, "not-reconciled");
  assert.ok(divergent.people.every(p => p.actual === null)); assert.equal(divergent.population, null); assert.equal(divergent.workPackages.status, "unavailable");
});

test("permission failure leaves source unknown without erasing other sections", async () => {
  const result = await service.load(config, fixtureRpc({ denied: "planning.slot" }), 7, 11);
  assert.equal(result.project.hours.planned, null); assert.equal(result.project.hours.remainingPlan, null);
  assert.equal(result.project.hours.actual, 120); assert.equal(result.project.population, null);
  assert.ok(!JSON.stringify(result).includes("secret upstream"));
});

test("multiple programme assignments are excluded from programmes and retained in unit", async () => {
  const result = await service.load({ ...config, programmes: [...config.programmes, { id: "second", name: "Deuxième", projectIds: [11, 11] }] }, fixtureRpc(), 7);
  assert.equal(result.projects[0].assignment.status, "multiple");
  assert.equal(result.unitSummary.metrics.actual.value, 120);
  assert.ok(result.programmeSummaries.every(p => p.metrics.actual.value === null));
  assert.throws(() => service.validateProgrammes([{ id: "x", name: "X", projectIds: ["11"] }]));
});

test("dated planning and staffing split calendar duration; missing dates stay unknown", () => {
  const split = S.splitPeriod("2026-01-01 00:00:00", "2026-01-03 00:00:00", 48, Date.parse("2026-01-02T00:00:00Z"));
  assert.equal(split.elapsed, 24); assert.equal(split.future, 24);
  assert.equal(S.splitPeriod(false, false, 48, Date.now()).elapsed, null);
  assert.equal(S.splitPeriod("2026-01-02", "2026-01-01", 48, Date.now()).future, null);
  assert.equal(S.ratio(10, 0), null);
  assert.equal(S.timestamp("2026-02-30"), null);
});

test("budget periods/currencies remain separate; command and consumption never add", () => {
  const parent = { id: 1, budget_template: "annual", date_from: "2026-01-01", date_to: "2026-12-31", budget_line_ids: [2, 3], currency_id: [1, "EUR"], sum_of_budgeted_amount: 100, sum_accounts_60: 1000, sum_accounts_61: 0, sum_accounts_63: 0, sum_accounts_64: 0, sum_accounts_65: 0 };
  const lines = { status: "available", rows: [
    { id: 2, x_plan8_id: [6, "6000 Personnel"], currency_id: [1, "EUR"], budget_amount: 1000, achieved_amount: 200, committed_amount: 500, on_approval: 10, balance: 500 },
    { id: 3, x_plan8_id: [7, "7000 Recettes"], currency_id: [1, "EUR"], budget_amount: 1100, achieved_amount: 100, committed_amount: 0, on_approval: 0, balance: 1000 }
  ] };
  const [budget] = S.buildBudgets([parent], lines, "2026-06-01T00:00:00Z");
  assert.equal(budget.totals.budgeted, 1000); assert.equal(budget.totals.committed, 500); assert.equal(budget.totals.consumed, 200); assert.equal(budget.quality, "reconciled");
  const projects = [{ id: 1, hours: { actual: 10, convention: 20 }, budgets: [budget], qualities: [], warnings: [] }, { id: 2, hours: { actual: 30, convention: 100 }, budgets: [{ ...budget, start: "2027-01-01", end: "2027-12-31" }], qualities: [], warnings: [] }, { id: 3, hours: { actual: null, convention: 1000 }, budgets: [{ ...budget, currencyId: 2, currency: "USD" }], qualities: [], warnings: [] }];
  const summary = S.consolidate(projects);
  assert.equal(summary.budgets.length, 3); assert.equal(summary.metrics.actual.value, 40); assert.equal(summary.metrics.actual.covered, 2);
  assert.equal(summary.metrics.consumption.value, 33.3333); assert.deepEqual(summary.metrics.consumption.projectIds, [1, 2]);
  assert.equal(S.buildBudgets([parent], { ...lines, rows: [lines.rows[0]] }, "2026-01-01T00:00:00Z")[0].totals.budgeted, null);
  const missingControl = S.buildBudgets([{ ...parent, sum_accounts_60: undefined }], lines, "2026-01-01T00:00:00Z")[0];
  assert.equal(missingControl.quality, "not-checkable");
  const duplicates = S.consolidate([{ ...projects[0], budgets: [budget, budget] }]);
  assert.equal(duplicates.budgets[0].totals.budgeted, null); assert.deepEqual(duplicates.budgets[0].ambiguousProjectIds, [1]);
});

test("WP periods, identities and unmapped hours must all pass", async () => {
  const original = (await service.load(config, fixtureRpc(), 7, 11)).project;
  const dataset = { progress: { rows: [{ project_id: [11, "P"], effective_hours: 120, allocated_hours: 80, convention_time: 100 }] }, tasks: { status: "available", rows: [{ id: 40, project_id: [11, "P"], is_work_package: true }] }, wpProgress: { status: "available", rows: [{ project_id: [11, "P"], task_id: [40, "WP"], effective_hours: 120, allocated_hours: 80, convention_time: 100 }] } };
  assert.equal(S.buildWorkPackages(original, dataset, "task_id", { is_work_package: { type: "boolean" } }, true).status, "unavailable");
  dataset.tasks.rows[0].date_start = "2026-01-01"; dataset.tasks.rows[0].date_end = "2026-12-31";
  dataset.wpProgress.rows.push({ project_id: [11, "P"], task_id: false, effective_hours: 1, allocated_hours: 0, convention_time: 0 });
  assert.match(S.buildWorkPackages(original, dataset, "task_id", { is_work_package: { type: "boolean" } }, true).reason, /non affectées/);
});

test("filters include unknown dates, exact leader identity and programme anomalies; render escapes names", async () => {
  const result = await service.load(config, fixtureRpc(), 7);
  assert.deepEqual(UI.filterProjects(result.projects, { leader: true }).map(p => p.id), [11]);
  assert.deepEqual(UI.filterProjects(result.projects, { programme: "__unassigned" }).map(p => p.id), [12]);
  assert.equal(UI.filterProjects(result.projects, { period: "2027" }).length, 1);
  assert.equal(UI.filterProjects([{ ...result.projects[0], start: null, end: null }], { period: "2027" }).length, 1);
  assert.match(UI.projectTable([{ ...result.projects[0], name: '<script>bad</script>' }], []), /&lt;script&gt;/);
  assert.match(UI.cards(result.unitSummary), /data-contributors="11,12"/);
  assert.match(UI.detailBody((await service.load(config, fixtureRpc(), 7, 11)).project, "resources"), /WP 40/);
});

test("steering and backend catalogues preserve FR/NL and source interpolation parity", () => {
  const placeholders = text => [...new Set(Array.from(text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g), match => match[1]))].sort();
  for (const [file, minimum] of [["../i18n-steering-messages", 160], ["../i18n-server-messages", 240]]) {
    const messages = require(file); assert.ok(Object.keys(messages).length >= minimum);
    for (const [key, message] of Object.entries(messages)) {
      assert.equal(typeof message.fr, "string", key); assert.equal(typeof message.nl, "string", key);
      assert.deepEqual(placeholders(message.fr), placeholders(message.nl), key);
      if (message.source) assert.deepEqual(placeholders(message.fr), placeholders(message.source), key);
    }
  }
});

test("visible backend messages translate original English aliases and French parameterized warnings", () => {
  try {
    I18n.setLanguage("fr");
    assert.equal(I18n.message("Odoo rejected your credentials"), "Odoo a refusé vos identifiants.");
    assert.equal(I18n.message('No employee found matching "Alex <Test>".'), "Aucun employé trouvé pour « Alex <Test> ».");
    I18n.setLanguage("nl");
    assert.equal(I18n.message("Odoo rejected your credentials"), "Odoo heeft uw aanmeldgegevens geweigerd.");
    assert.equal(I18n.message("2 projet(s) référencé(s) sont absents des données accessibles : 54252043, 56261849."),
      "2 opgenomen project(en) ontbreken in de toegankelijke gegevens: 54252043, 56261849.");
    assert.match(I18n.message("Certains montants Odoo sont absents ou illisibles ; ils ne sont pas remplacés par zéro."), /niet door nul vervangen/);
    assert.equal(I18n.message("Unknown source fault <private>"), "Unknown source fault <private>", "Unregistered upstream content is not guessed or rewritten");
  } finally { I18n.setLanguage("fr"); }
});

test("steering functions switch locale dynamically across cards, budgets and every detail tab", async () => {
  const result = await service.load(config, fixtureRpc(), 7), p = (await service.load(config, fixtureRpc(), 7, 11)).project;
  const original = structuredClone(p);
  try {
    I18n.setLanguage("nl");
    assert.match(UI.cards(result.unitSummary), /Gecumuleerde realisatie/);
    assert.match(UI.cards(result.unitSummary), /Projecttotaal \/ beschikbare horizon/);
    assert.match(UI.projectTable(result.projects, result.programmes), /Programma \/ verantwoordelijke/);
    assert.match(UI.monetaryTable(p.budgets), /Gebudgetteerd/); assert.match(UI.monetaryTable(p.budgets), /Ter goedkeuring/);
    const summary = UI.detailBody(p, "summary"), resources = UI.detailBody(p, "resources"), budget = UI.detailBody(p, "budgets"), quality = UI.detailBody(p, "quality");
    assert.match(summary, /Mijlpalen/); assert.match(summary, /Impacttrajecten/); assert.match(summary, /Conventie overschreden/);
    assert.match(resources, /Team en rollen/); assert.match(resources, /Werkpakketten/);
    assert.match(resources, /aria-label="Zichtbare maanduren, mogelijk gedeeltelijke dekking"/);
    assert.match(budget, /Rubriek \/ rekening/); assert.match(quality, /Bron geladen op/);
    assert.match(quality, /Odoo past de toegangsrechten/); assert.doesNotMatch(quality, /Source chargée le/);
    assert.equal(UI.format(1234.5), `${new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 1 }).format(1234.5)} h`);
    assert.equal(UI.format(null), "Niet beschikbaar");
    I18n.setLanguage("fr"); assert.match(UI.cards(result.unitSummary), /Réalisé cumulé/); assert.match(UI.detailBody(p, "resources"), /Équipe et rôles/);
    assert.deepEqual(p, original);
  } finally { I18n.setLanguage("fr"); }
});

test("steering translation preserves and escapes source project, programme, person, role and budget labels", async () => {
  const p = (await service.load(config, fixtureRpc(), 7, 11)).project;
  p.name = '<b>Non affecté</b>'; p.owner.name = "Responsable source"; p.stage = "Étape source";
  p.people[0].name = "Convention"; p.people[0].roles = ["Rôle source <unsafe>"];
  p.budgets[0].categories[0].category = "Rubrique source <unsafe>";
  try {
    I18n.setLanguage("nl");
    const table = UI.projectTable([p], [{ id: p.assignment.programmeId, name: "Programme source <unsafe>" }]);
    assert.match(table, /&lt;b&gt;Non affecté&lt;\/b&gt;/); assert.match(table, /Responsable source/);
    assert.match(table, /Étape source/); assert.match(table, /Programme source &lt;unsafe&gt;/);
    const resources = UI.detailBody(p, "resources"), budgets = UI.detailBody(p, "budgets");
    assert.match(resources, /<td>Convention/); assert.match(resources, /Rôle source &lt;unsafe&gt;/);
    assert.match(budgets, /Rubrique source &lt;unsafe&gt;/); assert.doesNotMatch(table + resources + budgets, /<unsafe>|<b>Non affecté/);
  } finally { I18n.setLanguage("fr"); }
});

test("live navigation language changes preserve view and generations without dispatching navigation or fetching", async () => {
  const nav = await loadNavigation({ ok: true, enabled: false, leader: { available: false } });
  nav.setView("unit-dico");
  const generation = nav.state.generation, detailGeneration = nav.state.detailGeneration, events = nav.events.length;
  try {
    I18n.setLanguage("nl"); nav.languageChange();
    assert.equal(nav.document.title, "Eenheid DiCo · Odoo-dashboard");
    assert.equal(nav.elements.get("page-title").textContent, "Eenheid DiCo");
    assert.match(nav.elements.get("page-subtitle").textContent, /kalender en projectweergaven/);
    assert.equal(nav.state.view, "unit-dico"); assert.equal(nav.state.generation, generation); assert.equal(nav.state.detailGeneration, detailGeneration);
    assert.equal(nav.events.length, events); assert.equal(nav.requests.length, 1);
    assert.equal(nav.elements.get("unit-dico-view").hidden, false);
    I18n.setLanguage("fr"); nav.languageChange(); assert.equal(nav.document.title, "Unité DiCo · Tableau de bord Odoo");
  } finally { I18n.setLanguage("fr"); }
});

test("legacy cached language repaint preserves filters, contributor selection, detail tab and source names", async () => {
  const nav = await loadNavigation({ ok: true, enabled: true, leader: { available: true, field: "user_id" } }, { allowHTML: true });
  nav.state.portfolio = await service.load(config, fixtureRpc(), 7);
  nav.state.detail = (await service.load(config, fixtureRpc(), 7, 11)).project;
  nav.state.view = "unit"; nav.state.tab = "resources"; nav.state.contributorIds = [11];
  // Materialize controls before setting selections, matching the initialized page.
  for (const id of ["pilotage-programme", "pilotage-owner", "pilotage-stage", "pilotage-period", "pilotage-leader"])
    if (!nav.elements.has(id)) nav.document.getElementById(id);
  nav.elements.get("pilotage-programme").value = "digital"; nav.elements.get("pilotage-owner").value = "7";
  nav.elements.get("pilotage-stage").value = "En cours"; nav.elements.get("pilotage-period").value = "2026";
  const generation = nav.state.generation, detailGeneration = nav.state.detailGeneration, events = nav.events.length;
  const selectedDetail = nav.state.detail;
  try {
    I18n.setLanguage("nl"); nav.languageChange();
    assert.match(nav.elements.get("pilotage-content").innerHTML, /Metaoverzicht/);
    assert.match(nav.elements.get("pilotage-detail").innerHTML, /role="tablist" aria-label="Projectdetails"/);
    assert.match(nav.elements.get("pilotage-detail").innerHTML, /Team en rollen/);
    assert.equal(nav.elements.get("pilotage-programme").value, "digital"); assert.equal(nav.elements.get("pilotage-owner").value, "7");
    assert.equal(nav.elements.get("pilotage-stage").value, "En cours"); assert.equal(nav.elements.get("pilotage-period").value, "2026");
    assert.equal(nav.state.detail, selectedDetail); assert.equal(nav.state.tab, "resources"); assert.deepEqual(nav.state.contributorIds, [11]);
    assert.equal(nav.state.generation, generation); assert.equal(nav.state.detailGeneration, detailGeneration);
    assert.equal(nav.events.length, events); assert.equal(nav.requests.length, 1);
  } finally { I18n.setLanguage("fr"); }
});
